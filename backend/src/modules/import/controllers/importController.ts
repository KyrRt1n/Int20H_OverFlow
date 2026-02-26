import { Request, Response } from 'express';
import multer from 'multer';
import * as fs from 'fs';
import { processCsvFile } from '../services/csvParserService';

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
        res.status(400).json({ error: 'No CSV file uploaded.' });
        return;
      }

      const result = await processCsvFile(req.file.path);

      res.status(200).json({
        message:   'Import complete.',
        processed: result.processed,
        failed:    result.failed,
        // Only include errors array if something actually failed — keeps response clean on success
        ...(result.failed > 0 && { errors: result.errors }),
      });
    } catch (error) {
      console.error('Import failed:', error);
      res.status(500).json({ error: 'Internal server error during CSV import.' });
    }
  }
];