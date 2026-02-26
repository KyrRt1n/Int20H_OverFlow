import { Router } from 'express';
import { importOrders } from '../controllers/importController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// CSV import route (with bonus admin authorization)
router.post('/orders/import', authMiddleware, importOrders);

export default router;// importRoutes.ts