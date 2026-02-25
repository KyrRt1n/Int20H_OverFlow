import fs from 'fs';
import csv from 'csv-parser';
import axios from 'axios';

export const processCsvFile = (filePath: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    const promises: Promise<void>[] = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Оборачиваем логику в асинхронную функцию для каждой строки
        const processRow = async () => {
          try {
            const lat = parseFloat(row.latitude);
            const lon = parseFloat(row.longitude);
            const subtotal = parseFloat(row.subtotal);
            const timestamp = row.timestamp;

            // 1. Стучимся в ТВОЙ сервис налогов (backend2-tax на порту 3002)
            // Замени URL, если у тебя другой порт или путь
            const taxResponse = await axios.post('http://localhost:3002/calculate-tax', {
              latitude: lat,
              longitude: lon,
              subtotal: subtotal
            });

            const taxData = taxResponse.data;

            // 2. Формируем итоговый объект заказа
            const orderData = {
              latitude: lat,
              longitude: lon,
              subtotal: subtotal,
              timestamp: timestamp,
              ...taxData // Добавляем рассчитанные налоги
            };

            // 3. Отправляем готовый заказ в сервис Друга 1 (backend1-orders на порту 3001)
            // Замени URL, если у него другой порт или путь
            await axios.post('http://localhost:3001/orders', orderData);

            // Добавляем в массив успешных результатов
            results.push(orderData);
          } catch (error) {
            // Если одна строка сломалась (например, кривые координаты), мы просто логируем это,
            // чтобы парсинг всего файла не упал из-за одной ошибки.
            console.error('Ошибка при обработке строки CSV:', error);
          }
        };

        // Запускаем обработку строки и пушим промис в массив
        promises.push(processRow());
      })
      .on('end', async () => {
        try {
          await Promise.all(promises); // Ждем, пока все HTTP-запросы завершатся

          // Удаляем временный файл после обработки
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }

          resolve(results);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};