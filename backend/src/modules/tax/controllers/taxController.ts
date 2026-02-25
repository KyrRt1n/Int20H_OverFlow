import { Request, Response } from 'express';
import { calculateTaxForLocation } from '../services/taxService';

export const calculateTax = async (req: Request, res: Response) => {
  try {
    const { lat, lon, subtotal } = req.body;

    if (typeof lat !== 'number' || typeof lon !== 'number' || typeof subtotal !== 'number') {
      return res.status(400).json({ error: 'lat, lon, and subtotal must be numbers' });
    }

    const result = await calculateTaxForLocation(lat, lon, subtotal);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};