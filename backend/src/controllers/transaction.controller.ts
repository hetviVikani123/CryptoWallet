import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import supabase from '../config/supabase';
import crypto from 'crypto';
import emailService from '../services/email.service';

// Generate transaction ID
const generateTransactionId = (): string => {
  const prefix = 'TXN';
  const timestamp = Date.now().toString().slice(-8);
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// Transfer coins between users
export const transferCoins = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;
    const { recipientWalletId, amount, note, pin } = req.body;

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    if (!recipientWalletId || !amount) {
      throw createError('Recipient wallet ID and amount are required', 400);
    }

    const transferAmount = parseFloat(amount);
    if (transferAmount <= 0) {
      throw createError('Amount must be greater than 0', 400);
    }

    // Get sender details
    const { data: sender, error: senderError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (senderError || !sender) {
      logger.error('Sender fetch error:', senderError);
      throw createError('Sender not found', 404);
    }

    // Ensure balance is a number
    const senderBalance = parseFloat(sender.balance) || 0;

    // Check if sender has sufficient balance
    if (senderBalance < transferAmount) {
      throw createError(`Insufficient balance. Available: ${senderBalance}, Required: ${transferAmount}`, 400);
    }

    // Get recipient by wallet ID
    const { data: recipient, error: recipientError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_id', recipientWalletId)
      .single();

    if (recipientError || !recipient) {
      logger.error('Recipient fetch error:', recipientError);
      throw createError('Recipient wallet not found', 404);
    }

    // Ensure recipient balance is a number
    const recipientBalance = parseFloat(recipient.balance) || 0;

    // Check if trying to send to self
    if (sender.id === recipient.id) {
      throw createError('Cannot transfer to yourself', 400);
    }

    // Check recipient account status
    if (recipient.status !== 'active') {
      throw createError('Recipient account is not active', 400);
    }

    // Verify PIN: require that sender has set a transaction PIN and that the
    // provided PIN matches the stored hash. This mirrors Google Pay behavior
    // where a persistent PIN is set during setup and required for transfers.
    if (!pin) {
      throw createError('Transaction PIN is required', 400);
    }

    const senderPinHash = sender.transaction_pin_hash;
    if (!senderPinHash) {
      throw createError('Transaction PIN not set. Please set your PIN in profile.', 403);
    }

    // Lazy require bcrypt to avoid top-level unused import warnings in other modules
    const bcrypt = require('bcryptjs');
    const isPinValid = await bcrypt.compare(pin, senderPinHash);
    if (!isPinValid) {
      throw createError('Invalid transaction PIN', 401);
    }

    // Create transaction ID
    const transactionId = generateTransactionId();

    logger.info(`Starting transfer: ${sender.email} -> ${recipient.email}, Amount: ${transferAmount}`);
    logger.info(`Sender balance before: ${senderBalance}, Recipient balance before: ${recipientBalance}`);

    // Calculate new balances
    const newSenderBalance = senderBalance - transferAmount;
    const newRecipientBalance = recipientBalance + transferAmount;

    // Start transaction: Deduct from sender
    const { error: senderUpdateError } = await supabase
      .from('users')
      .update({ balance: newSenderBalance })
      .eq('id', sender.id);

    if (senderUpdateError) {
      logger.error('Sender balance update error:', senderUpdateError);
      throw createError('Failed to deduct amount from sender', 500);
    }

    logger.info(`Sender balance updated to: ${newSenderBalance}`);

    // Add to recipient
    const { error: recipientUpdateError } = await supabase
      .from('users')
      .update({ balance: newRecipientBalance })
      .eq('id', recipient.id);

    if (recipientUpdateError) {
      logger.error('Recipient balance update error:', recipientUpdateError);
      // Rollback sender balance
      await supabase
        .from('users')
        .update({ balance: senderBalance })
        .eq('id', sender.id);
      logger.info('Rolled back sender balance');
      throw createError('Failed to add amount to recipient', 500);
    }

    logger.info(`Recipient balance updated to: ${newRecipientBalance}`);

    // Create transaction record
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        transaction_id: transactionId,
        from_user_id: sender.id,
        to_user_id: recipient.id,
        amount: transferAmount,
        type: 'transfer',
        status: 'completed',
        description: note || `Transfer to ${recipient.name}`,
        note: note || ''
      })
      .select()
      .single();

    if (txError) {
      logger.error('Failed to create transaction record:', txError);
      // Don't throw error, transaction already completed
    } else {
      logger.info(`Transaction record created: ${transactionId}`);
    }

    logger.info(`Transfer completed successfully: ${sender.email} -> ${recipient.email}, Amount: ${transferAmount}`);

    // Send email notifications to both sender and recipient
    try {
      // Email to sender
      await emailService.sendTransactionEmail(
        sender.email,
        sender.name,
        'sent',
        transferAmount,
        transactionId,
        recipient.name,
        recipient.wallet_id,
        'completed'
      );

      // Email to recipient
      await emailService.sendTransactionEmail(
        recipient.email,
        recipient.name,
        'received',
        transferAmount,
        transactionId,
        sender.name,
        sender.wallet_id,
        'completed'
      );

      logger.info(`Transaction emails sent to both parties`);
    } catch (emailError) {
      logger.error('Failed to send transaction emails:', emailError);
      // Don't throw error, transaction is already complete
    }

    res.json({
      success: true,
      message: 'Transfer successful',
      data: {
        transactionId,
        transaction,
        newBalance: newSenderBalance,
        recipient: {
          name: recipient.name,
          walletId: recipient.wallet_id
        }
      }
    });
  } catch (error) {
    logger.error('Transfer error:', error);
    next(error);
  }
};

// Get transaction history
export const getTransactionHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10, type, status } = req.query;

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build query
    let query = supabase
      .from('transactions')
      .select(`
        *,
        from_user:users!transactions_from_user_id_fkey(id, name, wallet_id),
        to_user:users!transactions_to_user_id_fkey(id, name, wallet_id)
      `, { count: 'exact' })
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);

    if (type) {
      query = query.eq('type', type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: transactions, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      throw createError('Failed to fetch transactions', 500);
    }

    const formattedTransactions = (transactions || []).map((tx: any) => ({
      id: tx.id,
      transactionId: tx.transaction_id,
      amount: tx.amount,
      type: tx.from_user_id === userId ? 'sent' : 'received',
      status: tx.status,
      sender: {
        name: tx.from_user?.name || 'Unknown',
        walletId: tx.from_user?.wallet_id || 'N/A'
      },
      receiver: {
        name: tx.to_user?.name || 'Unknown',
        walletId: tx.to_user?.wallet_id || 'N/A'
      },
      description: tx.description || tx.note || '',
      note: tx.note || '',
      createdAt: tx.created_at
    }));

    res.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          pages: Math.ceil((count || 0) / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error('Get transaction history error:', error);
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
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    const { data: transaction, error } = await supabase
      .from('transactions')
      .select(`
        *,
        from_user:users!transactions_from_user_id_fkey(id, name, email, wallet_id),
        to_user:users!transactions_to_user_id_fkey(id, name, email, wallet_id)
      `)
      .eq('id', id)
      .single();

    if (error || !transaction) {
      throw createError('Transaction not found', 404);
    }

    // Check if user is part of this transaction
    if (transaction.from_user_id !== userId && transaction.to_user_id !== userId) {
      throw createError('Unauthorized to view this transaction', 403);
    }

    res.json({
      success: true,
      data: {
        id: transaction.id,
        transactionId: transaction.transaction_id,
        amount: transaction.amount,
        type: transaction.from_user_id === userId ? 'sent' : 'received',
        status: transaction.status,
        sender: transaction.from_user,
        receiver: transaction.to_user,
        description: transaction.description,
        note: transaction.note,
        createdAt: transaction.created_at
      }
    });
  } catch (error) {
    logger.error('Get transaction by ID error:', error);
    next(error);
  }
};

// Request withdrawal
export const requestWithdrawal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;
    const { amount, bankAccount, ifscCode, accountHolderName } = req.body;

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    if (!amount || !bankAccount || !ifscCode || !accountHolderName) {
      throw createError('All withdrawal details are required', 400);
    }

    const withdrawalAmount = parseFloat(amount);
    if (withdrawalAmount <= 0) {
      throw createError('Amount must be greater than 0', 400);
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw createError('User not found', 404);
    }

    // Check if user has sufficient balance
    if (user.balance < withdrawalAmount) {
      throw createError('Insufficient balance', 400);
    }

    // Create transaction ID
    const transactionId = generateTransactionId();

    // Create withdrawal transaction record
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        transaction_id: transactionId,
        from_user_id: user.id,
        to_user_id: null,
        amount: withdrawalAmount,
        type: 'withdrawal',
        status: 'pending',
        description: `Withdrawal request to ${bankAccount}`,
        note: JSON.stringify({ bankAccount, ifscCode, accountHolderName })
      })
      .select()
      .single();

    if (txError) {
      throw createError('Failed to create withdrawal request', 500);
    }

    logger.info(`Withdrawal request created: ${user.email}, Amount: ${withdrawalAmount}`);

    // Send email notification
    try {
      await emailService.sendTransactionEmail(
        user.email,
        user.name,
        'withdrawal',
        withdrawalAmount,
        transactionId,
        undefined,
        undefined,
        'pending'
      );
    } catch (emailError) {
      logger.error('Failed to send withdrawal email:', emailError);
    }

    res.json({
      success: true,
      message: 'Withdrawal request submitted successfully. Pending admin approval.',
      data: {
        transactionId,
        transaction,
        status: 'pending'
      }
    });
  } catch (error) {
    logger.error('Withdrawal request error:', error);
    next(error);
  }
};

// Request deposit
export const requestDeposit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;
    const { amount, paymentMethod, transactionReference } = req.body;

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    if (!amount || !paymentMethod) {
      throw createError('Amount and payment method are required', 400);
    }

    const depositAmount = parseFloat(amount);
    if (depositAmount <= 0) {
      throw createError('Amount must be greater than 0', 400);
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw createError('User not found', 404);
    }

    // Create transaction ID
    const transactionId = generateTransactionId();

    // Create deposit transaction record
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        transaction_id: transactionId,
        from_user_id: null,
        to_user_id: user.id,
        amount: depositAmount,
        type: 'deposit',
        status: 'pending',
        description: `Deposit request via ${paymentMethod}`,
        note: JSON.stringify({ paymentMethod, transactionReference: transactionReference || '' })
      })
      .select()
      .single();

    if (txError) {
      throw createError('Failed to create deposit request', 500);
    }

    logger.info(`Deposit request created: ${user.email}, Amount: ${depositAmount}`);

    // Send email notification
    try {
      await emailService.sendTransactionEmail(
        user.email,
        user.name,
        'deposit',
        depositAmount,
        transactionId,
        undefined,
        undefined,
        'pending'
      );
    } catch (emailError) {
      logger.error('Failed to send deposit email:', emailError);
    }

    res.json({
      success: true,
      message: 'Deposit request submitted successfully. Pending admin approval.',
      data: {
        transactionId,
        transaction,
        status: 'pending'
      }
    });
  } catch (error) {
    logger.error('Deposit request error:', error);
    next(error);
  }
};

// Export transactions (CSV/PDF)
export const exportTransactions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        *,
        from_user:users!transactions_from_user_id_fkey(name, wallet_id),
        to_user:users!transactions_to_user_id_fkey(name, wallet_id)
      `)
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      throw createError('Failed to fetch transactions', 500);
    }

    res.json({
      success: true,
      data: transactions,
      message: 'Transactions exported successfully'
    });
  } catch (error) {
    logger.error('Export transactions error:', error);
    next(error);
  }
};
