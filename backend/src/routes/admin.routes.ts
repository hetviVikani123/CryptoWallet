import { Router } from 'express';
import { authenticate, isAdmin } from '../middleware/auth.middleware';
import {
  getDashboard,
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  getAllTransactions,
  getAllDeposits,
  approveDeposit,
  rejectDeposit,
  getAllWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  getAllSupportTickets,
  updateTicketStatus,
  sendEmailToUser,
} from '../controllers/admin.controller';

const router = Router();

// Admin login handled by unified auth.routes.ts

// Protected admin routes
router.use(authenticate, isAdmin);

// Dashboard endpoint
router.get('/dashboard', getDashboard);

// User management endpoints
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteUser);
router.post('/send-email', sendEmailToUser);

// Transactions
router.get('/transactions', getAllTransactions);

// Deposits
router.get('/deposits', getAllDeposits);
router.post('/deposits/:id/approve', approveDeposit);
router.post('/deposits/:id/reject', rejectDeposit);

// Withdrawals
router.get('/withdrawals', getAllWithdrawals);
router.post('/withdrawals/:id/approve', approveWithdrawal);
router.post('/withdrawals/:id/reject', rejectWithdrawal);

// Support
router.get('/support', getAllSupportTickets);
router.put('/support/:id/status', updateTicketStatus);

// TODO: Migrate remaining endpoints
// router.get('/analytics', getAnalytics);
// router.post('/broadcast-email', broadcastEmail);
// router.put('/coin-rate', updateCoinRate);

export default router;
