// В src/routes/taxRoutes.ts
import { Router } from 'express';
import { getTaxes, createTax } from '../controllers/taxController';

const router = Router();

router.get('/', getTaxes);
router.post('/', createTax);

export default router;