import { Router } from 'express';
import { getPublicStats } from '../controllers/public.controller';

const router = Router();

// Public endpoint - no authentication required
router.get('/stats', getPublicStats);

export default router;
