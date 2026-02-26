import { Router } from 'express';
import { getOrders, createOrder } from '../controllers/orderController';

const router = Router();

// Bind URLs to controllers
router.get('/', getOrders);
router.post('/', createOrder);

export default router;