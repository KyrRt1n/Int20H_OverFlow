// src/dataService.ts
import Papa from 'papaparse';
import { Transaction } from './types';

export const fetchAndParseData = (): Promise<Transaction[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse('/BetterMe Test-Input.csv', {
            download: true, // Завантажуємо файл за посиланням (з папки public)
            header: true,   // Використовуємо перший рядок як ключі
            dynamicTyping: true, // Автоматично перетворює рядки в числа
            skipEmptyLines: true,
            complete: (results) => {
                // Відфільтруємо невалідні рядки (без координат)
                const validData = (results.data as Transaction[]).filter(
                    (item) => item.latitude && item.longitude
                );
                resolve(validData);
            },
            error: (error) => {
                reject(error);
            },
        });
    });
};