import { Router } from 'express';
import { calculateTax } from '../controllers/taxController';

const router = Router();

router.post('/calculate-tax', calculateTax);

export default router; // This line was exactly what it was missing!