import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import supabase from '../config/supabase';

// Get user balance
export const getBalance = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('balance, wallet_id')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw createError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        balance: user.balance,
        walletId: user.wallet_id
      }
    });
  } catch (error) {
    logger.error('Get balance error:', error);
    next(error);
  }
};

// Get wallet details
export const getWalletDetails = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, wallet_id, balance, status, created_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw createError('User not found', 404);
    }

    // Get transaction statistics
    const { data: sentTransactions } = await supabase
      .from('transactions')
      .select('amount')
      .eq('from_user_id', userId)
      .eq('status', 'completed');

    const totalSent = sentTransactions?.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0) || 0;

    const { data: receivedTransactions } = await supabase
      .from('transactions')
      .select('amount')
      .eq('to_user_id', userId)
      .eq('status', 'completed');

    const totalReceived = receivedTransactions?.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0) || 0;

    const { count: totalTransactions } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .eq('status', 'completed');

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          walletId: user.wallet_id,
          balance: user.balance,
          status: user.status,
          createdAt: user.created_at
        },
        statistics: {
          totalSent,
          totalReceived,
          totalTransactions: totalTransactions || 0
        }
      }
    });
  } catch (error) {
    logger.error('Get wallet details error:', error);
    next(error);
  }
};

// Get wallet transactions
export const getTransactions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;
    const { limit = 10 } = req.query;

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    const limitNum = parseInt(limit as string);

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        *,
        from_user:users!transactions_from_user_id_fkey(id, name, wallet_id),
        to_user:users!transactions_to_user_id_fkey(id, name, wallet_id)
      `)
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(limitNum);

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
      createdAt: tx.created_at
    }));

    res.json({
      success: true,
      data: {
        transactions: formattedTransactions
      }
    });
  } catch (error) {
    logger.error('Get wallet transactions error:', error);
    next(error);
  }
};

// Generate QR code for wallet
export const generateQRCode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('wallet_id, name')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw createError('User not found', 404);
    }

    // Return wallet ID as QR code data
    res.json({
      success: true,
      data: {
        qrData: user.wallet_id,
        walletId: user.wallet_id,
        name: user.name
      }
    });
  } catch (error) {
    logger.error('Generate QR code error:', error);
    next(error);
  }
};
