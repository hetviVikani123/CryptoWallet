import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  transferCoins,
  getTransactionHistory,
  getTransactionById,
  exportTransactions,
  requestDeposit,
  requestWithdrawal,
} from '../controllers/transaction.controller';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Protected routes
router.use(authenticate);

router.post('/transfer', rateLimiter, transferCoins);
router.post('/deposit', rateLimiter, requestDeposit);
router.post('/withdraw', rateLimiter, requestWithdrawal);
router.get('/history', getTransactionHistory);
router.get('/export', exportTransactions);
router.get('/:id', getTransactionById);

export default router;
