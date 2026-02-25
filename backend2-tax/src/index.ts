// Пример для src/index.ts
import express from 'express';
import cors from 'cors';
import taxRoutes from './routes/taxRoutes';
import { initDb } from './db/database';

const app = express();

app.use(cors());
app.use(express.json());

// Подключаем роуты
app.use('/api/taxes', taxRoutes);

// Запуск
const start = async () => {
  await initDb(); // Сначала БД
  app.listen(3000, () => console.log('Server running on port 3000'));
};

start();