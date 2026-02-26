import axios from 'axios';
import { getRatesByLocality, DEFAULT_TAX_RATES } from '../utils/taxRates';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// NYC max-rate fallback used when geocoding fails — safer than state-only 4%
const NYC_MAX_RATES = { state: 0.04, county: 0, city: 0.045, special: 0.00375 }; // 8.875%

export async function calculateTaxForLocation(lat: number, lon: number, subtotal: number) {
  // Fix #1: Corrected NY bounding box
  //   - Eastern boundary: lon > -71.5 (was -71.8, excluded eastern Long Island tip)
  //   - NJ exclusion: lon > -74.0 && lat < 40.95 stops NJ north pocket being "valid"
  const outsideNY =
    lat < 40.4 || lat > 45.1 ||
    lon < -79.8 || lon > -71.5 ||
    (lat < 40.95 && lon < -73.7 && lon > -74.0); // NJ pocket exclusion

  if (outsideNY) {
    throw new Error('Coordinates are outside of New York State');
  }

  let city = '';
  let county = '';
  let geocodingFailed = false;

  // Resolve coordinates to city + county via Google Geocoding API
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

      const localityComponent = components.find((c: any) =>
        c.types.includes('locality') || c.types.includes('sublocality')
      );
      const countyComponent = components.find((c: any) =>
        c.types.includes('administrative_area_level_2')
      );

      if (localityComponent) city = localityComponent.long_name;
      if (countyComponent) county = countyComponent.long_name.replace(/\s*County$/i, '');
    } else {
      geocodingFailed = true;
      console.error(`Google Geocoding API returned status: ${response.data.status}`);
    }
  } catch (error) {
    geocodingFailed = true;
    console.error('Google Geocoding API error:', error);
  }

  // Fix #2: On geocoding failure — apply NYC max rate (8.875%) as safe fallback
  // instead of DEFAULT_TAX_RATES (4%) which would cause tax under-collection.
  if (geocodingFailed) {
    console.warn(`Tax lookup: geocoding failed for (${lat}, ${lon}). Applying NYC max rate 8.875% as safe fallback.`);
    const compositeRate = NYC_MAX_RATES.state + NYC_MAX_RATES.county + NYC_MAX_RATES.city + NYC_MAX_RATES.special;
    const taxAmount = Math.round(subtotal * compositeRate * 100) / 100;
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;
    return {
      composite_tax_rate: Number(compositeRate.toFixed(6)),
      tax_amount: taxAmount,
      total_amount: totalAmount,
      breakdown: {
        state_rate: NYC_MAX_RATES.state,
        county_rate: NYC_MAX_RATES.county,
        city_rate: NYC_MAX_RATES.city,
        special_rates: NYC_MAX_RATES.special,
      },
      jurisdictions: ['New York State', 'New York City (max fallback)', 'Metropolitan Commuter Transportation District (MCTD)'],
      fallback_rate_used: true,
    };
  }

  const rates = getRatesByLocality(city, county);

  const compositeRate = rates.state + rates.county + rates.city + rates.special;
  const taxAmount = Math.round(subtotal * compositeRate * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

  const jurisdictions: string[] = ['New York State'];
  if (county) jurisdictions.push(`${county} County`);
  if (city && city !== county) jurisdictions.push(city);
  if (rates.special > 0) jurisdictions.push('Metropolitan Commuter Transportation District (MCTD)');

  if (rates === DEFAULT_TAX_RATES) {
    console.warn(`Tax lookup: unknown locality — city="${city}", county="${county}". Applying state-only rate.`);
  }

  return {
    composite_tax_rate: Number(compositeRate.toFixed(6)),
    tax_amount: taxAmount,
    total_amount: totalAmount,
    breakdown: {
      state_rate: rates.state,
      county_rate: rates.county,
      city_rate: rates.city,
      special_rates: rates.special,
    },
    jurisdictions,
    fallback_rate_used: rates === DEFAULT_TAX_RATES,
  }
}