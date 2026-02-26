// src/dataService.ts
import Papa from 'papaparse';
import { Transaction } from './types';

export const fetchAndParseData = (): Promise<Transaction[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse('/BetterMe Test-Input.csv', {
            download: true, // Download file via link (from public folder)
            header: true,   // Use first row as keys
            dynamicTyping: true, // Automatically converts strings to numbers
            skipEmptyLines: true,
            complete: (results) => {
                // Filter out invalid rows (without coordinates)
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