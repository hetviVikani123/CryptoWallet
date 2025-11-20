import { Response, NextFunction } from 'express';
import { User } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/errorHandler';

// Get wallet balance
export const getBalance = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      throw createError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        balance: user.balance,
        walletId: user.walletId,
      },
    });
  } catch (error) {
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
    const user = await User.findById(req.userId);
    if (!user) {
      throw createError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        walletId: user.walletId,
        balance: user.balance,
        name: user.name,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Generate QR code data
export const generateQRCode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      throw createError('User not found', 404);
    }

    // QR code data format
    const qrData = {
      walletId: user.walletId,
      name: user.name,
      type: 'cryptowallet',
    };

    res.json({
      success: true,
      data: {
        qrData: JSON.stringify(qrData),
        walletId: user.walletId,
      },
    });
  } catch (error) {
    next(error);
  }
};
