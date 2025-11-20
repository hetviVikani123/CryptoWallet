import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getDashboard,
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
  createSupportTicket,
  getUserSupportTickets,
  getSupportTicketById,
  setTransactionPin,
} from '../controllers/user.controller';

const router = Router();

// Protected routes
router.use(authenticate);

router.get('/dashboard', getDashboard);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.post('/upload-avatar', uploadAvatar);

// Set or update transaction PIN
router.post('/pin', setTransactionPin);

// Support ticket routes
router.post('/support-tickets', createSupportTicket);
router.get('/support-tickets', getUserSupportTickets);
router.get('/support-tickets/:id', getSupportTicketById);

export default router;
