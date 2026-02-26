import { Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import * as fs from 'fs';
import { processCsvFile } from '../services/csvParserService';

const UPLOAD_DIR = 'uploads/';
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

// 1. Фильтр по типу файла
const csvFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const allowedMimeTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only CSV files are allowed.`));
  }
};

// 2. Ограничение размера — 10 МБ
const upload = multer({
  dest: UPLOAD_DIR,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: csvFileFilter,
});

export const importOrders = [
  upload.single('file'),
  // 3. Обработка ошибок multer (размер / тип)
  (err: any, req: Request, res: Response, next: Function) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'File too large. Maximum allowed size is 10 MB.' });
      return;
    }
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    next();
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No CSV file uploaded.' });
        return;
      }

      const result = await processCsvFile(req.file.path);

      res.status(200).json({
        message:   'Import complete.',
        processed: result.processed,
        failed:    result.failed,
        ...(result.failed > 0 && { errors: result.errors }),
      });
    } catch (error) {
      console.error('Import failed:', error);
      res.status(500).json({ error: 'Internal server error during CSV import.' });
    }
  }
];