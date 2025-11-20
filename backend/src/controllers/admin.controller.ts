import { Response, NextFunction } from 'express';
import supabase from '../config/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';

// Get admin dashboard statistics
export const getDashboard = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get total users (excluding admins)
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'user');

    // Get active users
    const { count: activeUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'user')
      .eq('status', 'active');

    // Get total transactions
    const { count: totalTransactions } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    // Get completed transactions for volume calculation
    const { data: completedTransactions } = await supabase
      .from('transactions')
      .select('amount')
      .eq('status', 'completed');

    // Calculate total volume
    const totalVolume = completedTransactions?.reduce(
      (sum, txn) => sum + (txn.amount || 0),
      0
    ) || 0;

    // Get recent transactions with user details
    const { data: recentTransactions } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        type,
        status,
        description,
        created_at,
        sender:from_user_id(name, email, wallet_id),
        receiver:to_user_id(name, email, wallet_id)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get weekly transaction counts (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: weeklyTransactions } = await supabase
      .from('transactions')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString());

    // Group by day
    const transactionsByDay = weeklyTransactions?.reduce((acc: any, txn) => {
      const date = new Date(txn.created_at);
      const day = date.toLocaleDateString('en-US', { weekday: 'short' });
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const transactionData = weekDays.map(day => ({
      day,
      transactions: transactionsByDay?.[day] || 0,
    }));

    // Get monthly revenue (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: monthlyTransactions } = await supabase
      .from('transactions')
      .select('amount, created_at')
      .eq('status', 'completed')
      .gte('created_at', sixMonthsAgo.toISOString());

    // Group by month
    const revenueByMonth = monthlyTransactions?.reduce((acc: any, txn) => {
      const date = new Date(txn.created_at);
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      acc[month] = (acc[month] || 0) + (txn.amount || 0);
      return acc;
    }, {});

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      last6Months.push(months[monthIndex]);
    }

    const revenueData = last6Months.map(month => ({
      month,
      revenue: revenueByMonth?.[month] || 0,
    }));

    // Get recent users with status
    const { data: recentUsers } = await supabase
      .from('users')
      .select('id, name, email, balance, status, created_at, wallet_id')
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(10);

    // Format recent users data
    const formattedUsers = recentUsers?.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance || 0,
      status: user.status,
      joinedDate: user.created_at,
    }));

    logger.info('Admin dashboard data fetched successfully');

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers: totalUsers || 0,
          activeUsers: activeUsers || 0,
          totalTransactions: totalTransactions || 0,
          totalVolume: totalVolume,
        },
        charts: {
          transactionData,
          revenueData,
        },
        recentTransactions,
        recentUsers: formattedUsers,
      },
    });
  } catch (error) {
    logger.error('Error fetching admin dashboard:', error);
    next(error);
  }
};

// Get all users with pagination and filters
export const getAllUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;

    let query = supabase
      .from('users')
      .select('id, name, email, phone, wallet_id, balance, status, created_at, last_login', { count: 'exact' })
      .eq('role', 'user');

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status as string);
    }

    // Search by name, email, or wallet_id
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,wallet_id.ilike.%${search}%`);
    }

    // Calculate pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data: users, error, count } = await query;

    if (error) {
      logger.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }

    logger.info(`Fetched ${users?.length || 0} users (page ${page})`);

    res.json({
      success: true,
      data: {
        users: users || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          pages: Math.ceil((count || 0) / limitNum),
        },
      },
    });
  } catch (error) {
    logger.error('Error in getAllUsers:', error);
    next(error);
  }
};

// Get user by ID
export const getUserById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get user's transaction count
    const { count: transactionCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .or(`from_user_id.eq.${id},to_user_id.eq.${id}`);

    logger.info(`Fetched user details: ${user.email}`);

    return res.json({
      success: true,
      data: {
        user,
        transactionCount: transactionCount || 0,
      },
    });
  } catch (error) {
    logger.error('Error in getUserById:', error);
    return next(error);
  }
};

// Update user status
export const updateUserStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: active, suspended, or pending',
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    logger.info(`User ${user.email} status changed to ${status} by admin`);

    return res.json({
      success: true,
      message: 'User status updated successfully',
      data: { user },
    });
  } catch (error) {
    logger.error('Error in updateUserStatus:', error);
    return next(error);
  }
};

// Delete user
export const deleteUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', id)
      .single();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Delete user (this will cascade delete related records if configured)
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }

    logger.info(`User ${user.email} deleted by admin`);

    return res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('Error in deleteUser:', error);
    return next(error);
  }
};

// Get all transactions
export const getAllTransactions = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        *,
        sender:from_user_id(id, name, email, wallet_id),
        recipient:to_user_id(id, name, email, wallet_id)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching transactions:', error);
      throw new Error('Failed to fetch transactions');
    }

    return res.json({
      success: true,
      data: transactions || [],
    });
  } catch (error) {
    logger.error('Error in getAllTransactions:', error);
    return next(error);
  }
};

// Get all deposits
export const getAllDeposits = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // For now, return empty array since deposit requests aren't in the schema yet
    return res.json({
      success: true,
      data: [],
      message: 'Deposit management coming soon',
    });
  } catch (error) {
    logger.error('Error in getAllDeposits:', error);
    return next(error);
  }
};

// Approve deposit
export const approveDeposit = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // const { id } = _req.params; // TODO: Implement deposit approval
    
    return res.json({
      success: true,
      message: 'Deposit approval feature coming soon',
    });
  } catch (error) {
    logger.error('Error in approveDeposit:', error);
    return next(error);
  }
};

// Reject deposit
export const rejectDeposit = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // const { id } = _req.params; // TODO: Implement deposit rejection
    
    return res.json({
      success: true,
      message: 'Deposit rejection feature coming soon',
    });
  } catch (error) {
    logger.error('Error in rejectDeposit:', error);
    return next(error);
  }
};

// Get all withdrawals
export const getAllWithdrawals = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // For now, return empty array since withdrawal requests aren't in the schema yet
    return res.json({
      success: true,
      data: [],
      message: 'Withdrawal management coming soon',
    });
  } catch (error) {
    logger.error('Error in getAllWithdrawals:', error);
    return next(error);
  }
};

// Approve withdrawal
export const approveWithdrawal = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // const { id } = _req.params; // TODO: Implement withdrawal approval
    
    return res.json({
      success: true,
      message: 'Withdrawal approval feature coming soon',
    });
  } catch (error) {
    logger.error('Error in approveWithdrawal:', error);
    return next(error);
  }
};

// Reject withdrawal
export const rejectWithdrawal = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // const { id } = _req.params; // TODO: Implement withdrawal rejection
    
    return res.json({
      success: true,
      message: 'Withdrawal rejection feature coming soon',
    });
  } catch (error) {
    logger.error('Error in rejectWithdrawal:', error);
    return next(error);
  }
};

// Get all support tickets
export const getAllSupportTickets = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { data: tickets, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching support tickets:', error);
      throw new Error('Failed to fetch support tickets');
    }

    return res.json({
      success: true,
      data: tickets || [],
    });
  } catch (error) {
    logger.error('Error in getAllSupportTickets:', error);
    return next(error);
  }
};

// Update ticket status
export const updateTicketStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { error } = await supabase
      .from('support_tickets')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      logger.error('Error updating ticket status:', error);
      throw new Error('Failed to update ticket status');
    }

    return res.json({
      success: true,
      message: 'Ticket status updated successfully',
    });
  } catch (error) {
    logger.error('Error in updateTicketStatus:', error);
    return next(error);
  }
};

// Send email to user
export const sendEmailToUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, subject, message } = req.body;

    // Validate input
    if (!userId || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'User ID, subject, and message are required',
      });
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Send email using email service
    const emailService = (await import('../services/email.service')).default;
    const sent = await emailService.sendEmail({
      to: user.email,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Crypto Wallet</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Admin Message</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="margin: 0 0 20px 0;">Hello ${user.name},</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              This is an official message from the Crypto Wallet administration team.
            </p>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Crypto Wallet. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (!sent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send email',
      });
    }

    logger.info(`Admin sent email to user ${user.email}: ${subject}`);

    return res.json({
      success: true,
      message: 'Email sent successfully',
    });
  } catch (error) {
    logger.error('Error in sendEmailToUser:', error);
    return next(error);
  }
};
