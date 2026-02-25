import { Router } from 'express';
import { calculateTax } from '../controllers/taxController';

const router = Router();

router.post('/calculate-tax', calculateTax);

export default router; // Вот этой строчки ему как раз не хватало!