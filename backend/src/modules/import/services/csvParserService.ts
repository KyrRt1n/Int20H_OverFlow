import * as fs from 'fs';
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

            // 1. Call Tax service internally
            const { calculateTaxForLocation } = await import('../../tax/services/taxService');
            const taxData = await calculateTaxForLocation(lat, lon, subtotal);

            // 2. Form final order object
            const orderData = {
              latitude: lat,
              longitude: lon,
              subtotal: subtotal,
              timestamp: timestamp,
              ...taxData // Add calculated taxes
            };

            // 3. Save order via internal DB call
            const { connectDB } = await import('../../orders/db/database');
            const db = await connectDB();
            await db.run(
              'INSERT INTO orders (latitude, longitude, subtotal, timestamp, tax_amount, total_amount) VALUES (?, ?, ?, ?, ?, ?)',
              [orderData.latitude, orderData.longitude, orderData.subtotal, orderData.timestamp, orderData.tax_amount, orderData.total_amount]
            );

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