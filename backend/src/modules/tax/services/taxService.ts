import axios from 'axios';
import { getTaxRatesByCity } from '../utils/taxRates';

// Беремо ключ із .env
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export async function calculateTaxForLocation(lat: number, lon: number, subtotal: number) {
  // 1. Валідація координат (Нью-Йорк штат)
  if (lat < 40 || lat > 45 || lon < -80 || lon > -71) {
    throw new Error('Coordinates are outside of New York State');
  }

  let city = 'unknown';

  // 2. Стукаємо в Google API за адресою
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        latlng: `${lat},${lon}`,
        key: GOOGLE_MAPS_API_KEY,
        language: 'en',
      },
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const components = response.data.results[0].address_components;
      // Шукаємо місто (locality)
      const cityComponent = components.find((c: any) => c.types.includes('locality'));
      if (cityComponent) {
        city = cityComponent.long_name;
      }
    }
  } catch (error) {
    console.error('Google API Error:', error);
    // Якщо API впало, беремо дефолтні ставки, щоб не блокувати замовлення
  }

  // 3. Дістаємо ставки для знайденого міста
  const rates = getTaxRatesByCity(city);

  // 4. Математика: рахуємо composite tax rate та суми
  const compositeRate = rates.state + rates.county + rates.city + (rates.special || 0);

  // Правильне округлення до центів
  const taxAmount = Math.round(subtotal * compositeRate * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

  // 5. Повертаємо об'єкт у потрібному форматі
  return {
    composite_tax_rate: Number(compositeRate.toFixed(6)),
    tax_amount: taxAmount,
    total_amount: totalAmount,
    breakdown: {
      state_rate: rates.state,
      county_rate: rates.county,
      city_rate: rates.city,
      special_rates: rates.special || 0,
    }
  };
}