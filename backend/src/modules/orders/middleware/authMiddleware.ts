import { Request, Response, NextFunction } from 'express';

// 🔒 IMPROVED: Use separate token for orders, validate .env is set
const ORDERS_API_TOKEN = process.env.ORDERS_API_TOKEN;

// Throw error if token not configured - fail loud, not silent
if (!ORDERS_API_TOKEN) {
  console.warn(
    '⚠️  WARNING: ORDERS_API_TOKEN not set in .env. Orders endpoints will be UNPROTECTED!'
  );
}

export const ordersAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  // Validate token format and value
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix

  if (!ORDERS_API_TOKEN || token !== ORDERS_API_TOKEN) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
    return;
  }

  next();
};