import { Request, Response, NextFunction } from 'express';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
  console.warn('⚠️  WARNING: ADMIN_TOKEN not set in .env. Import endpoint will be UNPROTECTED!');
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
    return;
  }

  next();
};