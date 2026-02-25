export const DEFAULT_TAX_RATES = { state: 0.04, county: 0.0, city: 0.0, special: 0.0 };

export const TAX_RATES: Record<string, { state: number; county: number; city: number; special?: number }> = {
  // NYC - 8.875% total
  'new york': { state: 0.04, county: 0.004375, city: 0.004375, special: 0.00375 },
  'manhattan': { state: 0.04, county: 0.004375, city: 0.004375, special: 0.00375 },
  'brooklyn': { state: 0.04, county: 0.004375, city: 0.004375, special: 0.00375 },
  'bronx': { state: 0.04, county: 0.004375, city: 0.004375, special: 0.00375 },
  'queens': { state: 0.04, county: 0.004375, city: 0.004375, special: 0.00375 },
  'staten island': { state: 0.04, county: 0.004375, city: 0.004375, special: 0.00375 },
  // Other jurisdictions
  'yonkers': { state: 0.04, county: 0.03, city: 0.0, special: 0.0 },
  'hempstead': { state: 0.04, county: 0.0375, city: 0.0, special: 0.0 },
  'smithtown': { state: 0.04, county: 0.0, city: 0.0, special: 0.0 },
};

export function getTaxRatesByCity(city: string) {
  const normalizedCity = city.toLowerCase().trim();
  return TAX_RATES[normalizedCity] || DEFAULT_TAX_RATES;
}// Ставки по юрисдикціях (state, county, city)