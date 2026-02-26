import { Router } from 'express';
import { importOrders } from '../controllers/importController';

const router = Router();

// CSV import route — no auth required per task spec.
// POST /orders/import
router.post('/import', importOrders);

export default router;