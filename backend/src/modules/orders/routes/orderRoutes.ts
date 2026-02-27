import { Router } from 'express';
import { getOrders, createOrder } from '../controllers/orderController';

const router = Router();

// GET /orders and POST /orders do not require authorization per task spec
router.get('/', getOrders);
router.post('/', createOrder);

export default router;
