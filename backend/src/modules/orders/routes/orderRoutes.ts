import { Router } from 'express';
import { getOrders, createOrder } from '../controllers/orderController';
import { ordersAuthMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Bind URLs to controllers
router.get('/', ordersAuthMiddleware, getOrders);
router.post('/', ordersAuthMiddleware, createOrder);

export default router;