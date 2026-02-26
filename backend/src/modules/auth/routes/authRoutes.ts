import { Router, Request, Response } from 'express';

const router = Router();

router.post('/login', (req: Request, res: Response): void => {
  const { login, password } = req.body;

  const ADMIN_LOGIN = process.env.ADMIN_LOGIN;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

  if (!ADMIN_LOGIN || !ADMIN_PASSWORD || !ADMIN_TOKEN) {
    res.status(500).json({ error: 'Auth not configured on server' });
    return;
  }

  if (login === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
    res.json({ token: `Bearer ${ADMIN_TOKEN}` });
  } else {
    res.status(401).json({ error: 'Invalid login or password' });
  }
});

export default router;