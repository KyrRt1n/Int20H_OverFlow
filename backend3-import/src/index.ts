import express from 'express';
import importRoutes from './routes/importRoutes';

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

// Подключаем роуты импорта
app.use('/', importRoutes);

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});// Запуск Express сервера