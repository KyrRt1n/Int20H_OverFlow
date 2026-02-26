import { Router } from 'express';
import { getOrders, createOrder } from '../controllers/orderController';
import { ordersAuthMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Bind URLs to controllers
router.get('/', getOrders);
router.post('/', createOrder);

export default router;