import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getBalance,
  getWalletDetails,
  generateQRCode,
} from '../controllers/wallet.controller';

const router = Router();

// Protected routes
router.use(authenticate);

router.get('/balance', getBalance);
router.get('/details', getWalletDetails);
router.post('/generate-qr', generateQRCode);

export default router;
