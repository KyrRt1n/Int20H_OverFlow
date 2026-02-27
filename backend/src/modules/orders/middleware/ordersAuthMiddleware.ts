import { Request, Response, NextFunction } from 'express';

// Separate token for Orders endpoints — do not mix with ADMIN_TOKEN (import)
const ORDERS_API_TOKEN = process.env.ORDERS_API_TOKEN;

if (!ORDERS_API_TOKEN) {
  console.warn('⚠️  WARNING: ORDERS_API_TOKEN not set in .env. Orders endpoints will be UNPROTECTED!');
}

export const ordersAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  if (!ORDERS_API_TOKEN || token !== ORDERS_API_TOKEN) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
    return;
  }

  next();
};
