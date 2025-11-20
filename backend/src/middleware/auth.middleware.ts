import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import supabase from '../config/supabase';
import { createError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: any;
  userId?: string;
}

// Verify JWT token
export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw createError('Authentication required', 401);
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      (process.env.JWT_SECRET || 'secret') as string
    ) as { userId: string };

    // Find user in Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      throw createError('User not found', 404);
    }

    // Check if account is active
    if (user.status !== 'active') {
      throw createError('Account is not active', 403);
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(createError('Invalid token', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(createError('Token expired', 401));
    } else {
      next(error);
    }
  }
};

// Check if user is admin
export const isAdmin = (req: AuthRequest, _res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(createError('Authentication required', 401));
  }

  if (req.user.role !== 'admin') {
    return next(createError('Admin access required', 403));
  }

  next();
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(
        token,
        (process.env.JWT_SECRET || 'secret') as string
      ) as { userId: string };

      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', decoded.userId)
        .single();

      if (user && user.status === 'active') {
        req.user = user;
        req.userId = user.id;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};
