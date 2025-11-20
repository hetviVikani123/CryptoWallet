import { Response, NextFunction } from 'express';
import supabase from '../config/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import bcrypt from 'bcryptjs';

// Get user dashboard data
export const getDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      logger.error('User fetch error:', userError);
      throw createError('User not found', 404);
    }

    logger.info(`Dashboard request for user: ${user.email}, Balance: ${user.balance}, Wallet: ${user.wallet_id}`);

    // Get total sent
    const { data: sentData } = await supabase
      .from('transactions')
      .select('amount')
      .eq('from_user_id', userId)
      .eq('status', 'completed');

    const totalSent = sentData?.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0) || 0;

    // Get total received
    const { data: receivedData } = await supabase
      .from('transactions')
      .select('amount')
      .eq('to_user_id', userId)
      .eq('status', 'completed');

    const totalReceived = receivedData?.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0) || 0;

    // Get total transactions count
    const { count: totalTransactions } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .eq('status', 'completed');

    // Get recent transactions with user details
    const { data: recentTransactions } = await supabase
      .from('transactions')
      .select(`
        *,
        from_user:users!transactions_from_user_id_fkey(id, name, wallet_id),
        to_user:users!transactions_to_user_id_fkey(id, name, wallet_id)
      `)
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(10);

    const formattedTransactions = (recentTransactions || []).map((tx: any) => ({
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

    // Set cache-control headers to prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.json({
      success: true,
      data: {
        balance: user.balance,
        walletId: user.wallet_id,
        name: user.name,
        email: user.email,
        statistics: {
          totalSent,
          totalReceived,
          totalTransactions: totalTransactions || 0,
        },
        recentTransactions: formattedTransactions,
      },
    });
  } catch (error) {
    logger.error('Dashboard error:', error);
    next(error);
  }
};

// Get user profile
export const getProfile = async (
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
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw createError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          walletId: user.wallet_id,
          balance: user.balance,
          profilePicture: user.profile_picture,
          role: user.role,
          status: user.status,
          twoFactorEnabled: user.two_factor_enabled,
          biometricEnabled: user.biometric_enabled,
          emailVerified: user.email_verified,
          phoneVerified: user.phone_verified,
          createdAt: user.created_at,
        },
      },
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    next(error);
  }
};

// Update user profile
export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;
    const { name, phone } = req.body;

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Supabase update error:', error);
      throw createError(`Failed to update profile: ${error.message}`, 500);
    }

    logger.info(`Profile updated for user: ${userId}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    next(error);
  }
};

// Change password
export const changePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    if (!currentPassword || !newPassword) {
      throw createError('Current password and new password are required', 400);
    }

    if (newPassword.length < 6) {
      throw createError('New password must be at least 6 characters', 400);
    }

    // Get user with password
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw createError('User not found', 404);
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      throw createError('Current password is incorrect', 401);
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', userId);

    logger.info(`Password changed for user: ${userId}`);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error('Change password error:', error);
    next(error);
  }
};

// Upload avatar (placeholder - implement with Supabase Storage)
export const uploadAvatar = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    // TODO: Implement Supabase Storage upload
    res.json({
      success: true,
      message: 'Avatar upload feature coming soon',
    });
  } catch (error) {
    logger.error('Upload avatar error:', error);
    next(error);
  }
};

// Create support ticket
export const createSupportTicket = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;
    const { subject, category, message } = req.body;

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    if (!subject || !message) {
      throw createError('Subject and message are required', 400);
    }

    // Generate unique ticket ID
    const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Determine priority based on category
    let priority = 'medium';
    if (category === 'Account Security' || category === 'Transaction Issue') {
      priority = 'high';
    } else if (category === 'Technical Support') {
      priority = 'medium';
    } else {
      priority = 'low';
    }

    // Insert ticket
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        ticket_id: ticketId,
        user_id: userId,
        subject,
        description: message,
        status: 'open',
        priority,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating support ticket:', error);
      throw createError('Failed to create support ticket', 500);
    }

    logger.info(`Support ticket created: ${ticketId} by user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: ticket,
    });
  } catch (error) {
    logger.error('Create support ticket error:', error);
    next(error);
  }
};

// Get user's support tickets
export const getUserSupportTickets = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    const { data: tickets, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching user support tickets:', error);
      throw createError('Failed to fetch support tickets', 500);
    }

    res.json({
      success: true,
      data: tickets || [],
    });
  } catch (error) {
    logger.error('Get user support tickets error:', error);
    next(error);
  }
};

// Set or update transaction PIN
export const setTransactionPin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;
    const { pin, currentPin, password } = req.body;

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    if (!pin || typeof pin !== 'string' || pin.length !== 4 || !/^[0-9]{4}$/.test(pin)) {
      throw createError('PIN must be a 4-digit string', 400);
    }

    // Fetch user with password and existing pin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw createError('User not found', 404);
    }

    const existingPinHash = user.transaction_pin_hash;

    // If PIN already exists, require currentPin to change
    if (existingPinHash) {
      if (!currentPin) {
        throw createError('Current PIN is required to change PIN', 400);
      }

      const isCurrentValid = await bcrypt.compare(currentPin, existingPinHash);
      if (!isCurrentValid) {
        throw createError('Current PIN is incorrect', 401);
      }
    } else {
      // If no existing PIN, require password for first-time setup
      if (!password) {
        throw createError('Password is required to set PIN for the first time', 400);
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw createError('Invalid password', 401);
      }
    }

    // Hash and store new PIN
    const pinHash = await bcrypt.hash(pin, 10);

    const { error: updateError } = await supabase
      .from('users')
      .update({ transaction_pin_hash: pinHash })
      .eq('id', userId);

    if (updateError) {
      logger.error('Failed to update transaction PIN:', updateError);
      throw createError('Failed to set transaction PIN', 500);
    }

    res.json({ success: true, message: 'Transaction PIN set successfully' });
  } catch (error) {
    logger.error('Set PIN error:', error);
    next(error);
  }
};

// Get single support ticket
export const getSupportTicketById = async (
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

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !ticket) {
      throw createError('Ticket not found', 404);
    }

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    logger.error('Get support ticket error:', error);
    next(error);
  }
};
