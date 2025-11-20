import { Request, Response, NextFunction } from 'express';
import supabase from '../config/supabase';
import { createError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import emailService from '../services/email.service';

// Generate JWT token
const generateToken = (userId: string): string => {
  return jwt.sign(
    { userId },
    (process.env.JWT_SECRET || 'secret') as string,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
  );
};

// Generate refresh token
const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { userId },
    (process.env.JWT_REFRESH_SECRET || 'refresh-secret') as string,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' } as jwt.SignOptions
  );
};

// Generate wallet ID
const generateWalletId = (): string => {
  const prefix = 'CW';
  const random = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `${prefix}${random}`;
};

// Generate OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register new user
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, password } = req.body;

    // Validate input
    if (!name || !email || !phone || !password) {
      throw createError('All fields are required', 400);
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      throw createError('Invalid email format', 400);
    }

    // Validate password strength
    if (password.length < 6) {
      throw createError('Password must be at least 6 characters', 400);
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${email},phone.eq.${phone}`)
      .single();

    if (existingUser) {
      throw createError('User already exists with this email or phone', 409);
    }

    // Generate unique wallet ID
    let walletId = generateWalletId();
    let walletExists = true;
    
    while (walletExists) {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_id', walletId)
        .single();
      
      if (!data) walletExists = false;
      else walletId = generateWalletId();
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create new user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        name,
        email,
        phone,
        password_hash: passwordHash,
        wallet_id: walletId,
        balance: 0,
        status: 'pending',
        role: 'user',
        two_factor_enabled: false,
        biometric_enabled: false,
        email_verified: false,
        phone_verified: false,
      })
      .select()
      .single();

    if (userError || !user) {
      logger.error('Failed to create user:', userError);
      throw createError('Failed to create user account', 500);
    }

    logger.info(`User created successfully: ${user.id}, Email: ${email}, WalletID: ${walletId}`);

    // Generate and send OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const { error: otpError } = await supabase
      .from('otps')
      .insert({
        user_id: user.id,
        email,
        phone,
        otp,
        type: 'email',
        purpose: 'registration',
        expires_at: expiresAt.toISOString(),
      });

    if (otpError) {
      logger.error('Failed to create OTP:', otpError);
    }

    logger.info(`OTP created for user ${user.id}: ${otp}`);

    // Send OTP via email
    try {
      await emailService.sendOTP(email, otp, 'registration');
      logger.info(`OTP email sent to ${email}`);
    } catch (emailError) {
      logger.error(`Failed to send OTP email to ${email}:`, emailError);
      // Continue anyway - OTP is logged for development
    }

    // Log OTP for development (will be visible in console)
    console.log('\n=================================');
    console.log(`🔐 REGISTRATION OTP FOR ${email}`);
    console.log(`📧 OTP: ${otp}`);
    console.log(`⏰ Expires in 10 minutes`);
    console.log('=================================\n');

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify OTP sent to your email.',
      data: {
        userId: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        walletId: user.wallet_id,
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);
    next(error);
  }
};

// Verify OTP
export const verifyOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, otp, purpose } = req.body;

    if (!userId || !otp || !purpose) {
      throw createError('User ID, OTP, and purpose are required', 400);
    }

    // Find valid OTP
    const { data: otpRecord, error: otpError } = await supabase
      .from('otps')
      .select('*')
      .eq('user_id', userId)
      .eq('otp', otp)
      .eq('purpose', purpose)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (otpError || !otpRecord) {
      throw createError('Invalid or expired OTP', 400);
    }

    // Mark OTP as used
    await supabase
      .from('otps')
      .update({ used: true })
      .eq('id', otpRecord.id);

    // Get user data
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!user) {
      throw createError('User not found', 404);
    }

    // Update user status based on purpose
    if (purpose === 'registration') {
      await supabase
        .from('users')
        .update({ 
          status: 'active',
          email_verified: true 
        })
        .eq('id', userId);

      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(user.email, user.name, user.wallet_id);
      } catch (emailError) {
        logger.error('Failed to send welcome email:', emailError);
      }

      logger.info(`User ${user.email} verified and activated`);
    } else if (purpose === 'login') {
      // Update last login time
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);

      logger.info(`User ${user.email} logged in successfully`);
    }

    // Generate tokens for all successful OTP verifications
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    return res.json({
      success: true,
      message: purpose === 'registration' 
        ? 'OTP verified successfully. Welcome!' 
        : 'Login successful!',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          walletId: user.wallet_id,
          balance: user.balance,
          role: user.role,
          status: user.status,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error('OTP verification error:', error);
    return next(error);
  }
};

// Login user
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw createError('Email and password are required', 400);
    }

    // Find user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      throw createError('Invalid email or password', 401);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw createError('Invalid email or password', 401);
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw createError('Account is not active. Please verify your email.', 403);
    }

    // Always require OTP for login (enhanced security)
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const { error: otpError } = await supabase
      .from('otps')
      .insert({
        user_id: user.id,
        email: user.email,
        otp,
        type: 'email',
        purpose: 'login',
        expires_at: expiresAt.toISOString(),
      });

    if (otpError) {
      logger.error('Failed to create OTP:', otpError);
    }

    // Send OTP via email
    try {
      await emailService.sendOTP(user.email, otp, 'login');
      logger.info(`Login OTP email sent to ${email}`);
    } catch (emailError) {
      logger.error(`Failed to send login OTP email to ${email}:`, emailError);
      // Continue anyway - OTP is logged for development
    }

    // Log OTP for development (will be visible in console)
    console.log('\n=================================');
    console.log(`🔐 LOGIN OTP FOR ${email}`);
    console.log(`📧 OTP: ${otp}`);
    console.log(`⏰ Expires in 10 minutes`);
    console.log('=================================\n');

    return res.json({
      success: true,
      message: 'OTP sent to your email for verification',
      data: {
        userId: user.id,
        email: user.email,
        requires2FA: true,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    return next(error);
  }
};

// Resend OTP
export const resendOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, purpose } = req.body;

    if (!userId || !purpose) {
      throw createError('User ID and purpose are required', 400);
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw createError('User not found', 404);
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete old OTPs for this user and purpose
    await supabase
      .from('otps')
      .delete()
      .eq('user_id', userId)
      .eq('purpose', purpose);

    // Insert new OTP
    await supabase
      .from('otps')
      .insert({
        user_id: user.id,
        email: user.email,
        phone: user.phone,
        otp,
        type: 'email',
        purpose,
        expires_at: expiresAt.toISOString(),
      });

    // Send OTP
    try {
      await emailService.sendOTP(user.email, otp, purpose);
    } catch (emailError) {
      logger.error('Failed to send OTP:', emailError);
    }

    console.log(`\n🔐 Resent OTP for ${user.email}: ${otp}\n`);

    res.json({
      success: true,
      message: 'OTP has been resent to your email',
    });
  } catch (error) {
    logger.error('Resend OTP error:', error);
    next(error);
  }
};

// Forgot password
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw createError('Email is required', 400);
    }

    // Find user
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    // Don't reveal if user exists or not (security)
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset OTP has been sent.',
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await supabase
      .from('otps')
      .insert({
        user_id: user.id,
        email: user.email,
        otp,
        type: 'email',
        purpose: 'password_reset',
        expires_at: expiresAt.toISOString(),
      });

    // Send OTP
    try {
      await emailService.sendOTP(user.email, otp, 'password_reset');
    } catch (emailError) {
      logger.error('Failed to send password reset OTP:', emailError);
    }

    console.log(`\n🔐 Password Reset OTP for ${email}: ${otp}\n`);

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset OTP has been sent.',
      data: {
        userId: user.id,
      },
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    return next(error);
  }
};

// Reset password
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, otp, newPassword } = req.body;

    if (!userId || !otp || !newPassword) {
      throw createError('User ID, OTP, and new password are required', 400);
    }

    if (newPassword.length < 6) {
      throw createError('Password must be at least 6 characters', 400);
    }

    // Verify OTP
    const { data: otpRecord } = await supabase
      .from('otps')
      .select('*')
      .eq('user_id', userId)
      .eq('otp', otp)
      .eq('purpose', 'password_reset')
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!otpRecord) {
      throw createError('Invalid or expired OTP', 400);
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', userId);

    // Mark OTP as used
    await supabase
      .from('otps')
      .update({ used: true })
      .eq('id', otpRecord.id);

    logger.info(`Password reset for user: ${userId}`);

    res.json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    next(error);
  }
};

// Refresh Token
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw createError('Refresh token is required', 400);
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'refresh-secret'
    ) as { userId: string };

    // Generate new tokens
    const newToken = generateToken(decoded.userId);
    const newRefreshToken = generateRefreshToken(decoded.userId);

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    next(createError('Invalid refresh token', 401));
  }
};

// Logout
export const logout = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // by removing the token from localStorage
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return next(error);
  }
};
