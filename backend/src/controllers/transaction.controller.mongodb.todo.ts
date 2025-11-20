import { Response, NextFunction } from 'express';
import { User, Transaction } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import crypto from 'crypto';
import mongoose from 'mongoose';

// Generate transaction ID
const generateTransactionId = (): string => {
  const prefix = 'TXN';
  const random = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `${prefix}${random}`;
};

// Transfer coins
export const transferCoins = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { recipientWalletId, amount, note } = req.body;

    // Validate input
    if (!recipientWalletId || !amount) {
      throw createError('Recipient wallet ID and amount are required', 400);
    }

    if (amount <= 0) {
      throw createError('Amount must be greater than 0', 400);
    }

    // Find sender
    const sender = await User.findById(req.userId).session(session);
    if (!sender) {
      throw createError('Sender not found', 404);
    }

    // Check if sending to self
    if (sender.walletId === recipientWalletId) {
      throw createError('Cannot transfer to your own wallet', 400);
    }

    // Find recipient
    const recipient = await User.findOne({ walletId: recipientWalletId }).session(session);
    if (!recipient) {
      throw createError('Recipient wallet not found', 404);
    }

    // Check recipient account status
    if (recipient.status !== 'active') {
      throw createError('Recipient account is not active', 400);
    }

    // Calculate fee (1% of amount)
    const fee = amount * 0.01;
    const totalAmount = amount + fee;

    // Check sender balance
    if (sender.balance < totalAmount) {
      throw createError('Insufficient balance', 400);
    }

    // Generate transaction ID
    let transactionId = generateTransactionId();
    while (await Transaction.findOne({ transactionId })) {
      transactionId = generateTransactionId();
    }

    // Update balances
    sender.balance -= totalAmount;
    recipient.balance += amount;

    await sender.save({ session });
    await recipient.save({ session });

    // Create transaction record
    const transaction = await Transaction.create(
      [
        {
          from: sender._id,
          to: recipient._id,
          amount,
          type: 'sent',
          status: 'completed',
          note,
          transactionId,
          fee,
        },
      ],
      { session }
    );

    // Commit transaction
    await session.commitTransaction();

    logger.info(
      `Transaction ${transactionId}: ${sender.walletId} -> ${recipient.walletId}, Amount: ${amount}`
    );

    res.json({
      success: true,
      message: 'Transfer successful',
      data: {
        transaction: transaction[0],
        newBalance: sender.balance,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// Get transaction history
export const getTransactionHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 10, status, type } = req.query;

    const query: any = {
      $or: [{ from: req.userId }, { to: req.userId }],
    };

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get transaction by ID
export const getTransactionById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findById(id);

    if (!transaction) {
      throw createError('Transaction not found', 404);
    }

    // Check if user is authorized to view this transaction
    if (
      transaction.from.toString() !== req.userId &&
      transaction.to.toString() !== req.userId
    ) {
      throw createError('Unauthorized to view this transaction', 403);
    }

    res.json({
      success: true,
      data: { transaction },
    });
  } catch (error) {
    next(error);
  }
};

// Export transactions as CSV
export const exportTransactions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const transactions = await Transaction.find({
      $or: [{ from: req.userId }, { to: req.userId }],
    }).sort({ createdAt: -1 });

    // Generate CSV
    let csv = 'Date,Transaction ID,Type,Amount,Fee,Status,Note\n';

    transactions.forEach((txn) => {
      const date = new Date(txn.createdAt).toLocaleDateString();
      csv += `${date},${txn.transactionId},${txn.type},${txn.amount},${txn.fee},${txn.status},"${txn.note || ''}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};
