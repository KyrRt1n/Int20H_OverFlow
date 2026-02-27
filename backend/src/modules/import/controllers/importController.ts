import { Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { processCsvFile } from '../services/csvParserService';

const UPLOAD_DIR = 'uploads/';
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

const csvFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const allowedMimeTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'text/plain',
    'application/octet-stream', // Windows Chrome sometimes sends this for .csv
  ];

  const ext = path.extname(file.originalname).toLowerCase();

  // Allow if mimetype is in list OR extension is .csv
  // (protection against browsers that misidentify MIME)
  if (allowedMimeTypes.includes(file.mimetype) || ext === '.csv') {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: "${file.mimetype}" (${file.originalname}). Only .csv files are allowed.`));
  }
};

const upload = multer({
  dest: UPLOAD_DIR,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: csvFileFilter,
});

// Wrap upload.single() in a Promise to catch MulterError in try/catch
const uploadSingle = (req: Request, res: Response): Promise<void> => {
  return new Promise((resolve, reject) => {
    upload.single('file')(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

export const importOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    await uploadSingle(req, res);
  } catch (err: any) {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'File too large. Maximum allowed size is 10 MB.' });
      return;
    }
    res.status(400).json({ error: err.message ?? 'File upload error.' });
    return;
  }

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
};
