import { Router } from 'express';
import { getOrders, createOrder } from '../controllers/orderController';

const router = Router();

// GET /orders и POST /orders не требуют авторизации по ТЗ
router.get('/', getOrders);
router.post('/', createOrder);

export default router;
