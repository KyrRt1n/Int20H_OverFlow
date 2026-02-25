import { Request, Response } from 'express';
import multer from 'multer';
import * as fs from 'fs';
import { processCsvFile } from '../services/csvParserService';

// Настраиваем multer для сохранения файла во временную папку uploads/
const UPLOAD_DIR = 'uploads/';
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

const upload = multer({ dest: UPLOAD_DIR });

export const importOrders = [
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'CSV файл не загружен.' });
        return;
      }

      const filePath = req.file.path;
      const results = await processCsvFile(filePath);

      res.status(200).json({
        message: 'Файл успешно обработан',
        processedCount: results.length
      });
    } catch (error) {
      console.error('Ошибка импорта:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера при обработке CSV.' });
    }
  }
];// Логіка POST /orders/import