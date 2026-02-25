import express from 'express';
import cors from 'cors';
import orderRoutes from './routes/orderRoutes';
import { connectDB } from './db/database';

const app = express();
const PORT = process.env.PORT || 3000;

// Настройка CORS и парсера JSON
app.use(cors());
app.use(express.json());

// Подключение роутов (все пути в orderRoutes будут начинаться с /orders)
app.use('/orders', orderRoutes);

// Запуск сервера с предварительным подключением к БД
const startServer = async () => {
  try {
    await connectDB(); // Инициализируем БД перед запуском
    app.listen(PORT, () => {
      console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Ошибка при запуске сервера:', error);
  }
};

startServer();