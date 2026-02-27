import { Router } from 'express';
import { getOrders, createOrder } from '../controllers/orderController';
import { ordersAuthMiddleware } from '../middleware/ordersAuthMiddleware';

const router = Router();

router.get('/', ordersAuthMiddleware, getOrders);
router.post('/', ordersAuthMiddleware, createOrder);

export default router;
