import { Router } from 'express';
import { getOrders, createOrder } from '../controllers/orderController';

const router = Router();

// Связываем URL-адреса с контроллерами
router.get('/', getOrders);
router.post('/', createOrder);

export default router;