import { Router } from 'express';
import { importOrders } from '../controllers/importController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Маршрут для импорта CSV (с бонусной авторизацией админа)
router.post('/orders/import', authMiddleware, importOrders);

export default router;// importRoutes.ts