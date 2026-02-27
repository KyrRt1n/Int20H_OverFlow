import { Request, Response } from 'express';
import { calculateTaxForLocation } from '../services/taxService';

export const calculateTax = async (req: Request, res: Response) => {
  try {
    const { lat, lon, subtotal } = req.body;

    // Use parseFloat + isNaN — consistent with orderController.
    // Accepts both numbers and strings ("40.7" → 40.7), rejects null/undefined/garbage.
    const latN     = parseFloat(lat);
    const lonN     = parseFloat(lon);
    const subtotalN = parseFloat(subtotal);

    if (isNaN(latN) || isNaN(lonN) || isNaN(subtotalN)) {
      res.status(400).json({ error: 'lat, lon, and subtotal must be valid numbers.' });
      return;
    }

    const result = await calculateTaxForLocation(latN, lonN, subtotalN);
    res.json(result);
  } catch (error: any) {
    // Coordinates outside NYS — client error, return 400 instead of 500
    if (error.message?.includes('outside of New York State')) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: error.message });
  }
};
