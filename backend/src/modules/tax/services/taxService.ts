import axios from 'axios';
import { getRatesByLocality, DEFAULT_TAX_RATES } from '../utils/taxRates';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export async function calculateTaxForLocation(lat: number, lon: number, subtotal: number) {
  // Rough bounding box for New York State
  if (lat < 40.4 || lat > 45.1 || lon < -79.8 || lon > -71.8) {
    throw new Error('Coordinates are outside of New York State');
  }

  let city   = '';
  let county = '';

  // Resolve coordinates to city + county via Google Geocoding API
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        latlng:   `${lat},${lon}`,
        key:      GOOGLE_MAPS_API_KEY,
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

      if (localityComponent) city   = localityComponent.long_name;
      if (countyComponent)   county = countyComponent.long_name.replace(/\s*County$/i, '');
    }
  } catch (error) {
    // If geocoding fails, fall back to state-only rate so the order is not blocked
    console.error('Google Geocoding API error:', error);
  }

  const rates = getRatesByLocality(city, county);

  const compositeRate = rates.state + rates.county + rates.city + rates.special;
  const taxAmount     = Math.round(subtotal * compositeRate * 100) / 100;
  const totalAmount   = Math.round((subtotal + taxAmount) * 100) / 100;

  // Build human-readable list of jurisdictions that contributed to the rate
  const jurisdictions: string[] = ['New York State'];
  if (county) jurisdictions.push(`${county} County`);
  if (city && city !== county) jurisdictions.push(city);
  if (rates.special > 0) jurisdictions.push('Metropolitan Commuter Transportation District (MCTD)');

  // Warn in logs when we fell back to the default (unknown location)
  if (rates === DEFAULT_TAX_RATES) {
    console.warn(`Tax lookup: unknown locality — city="${city}", county="${county}". Applying state-only rate.`);
  }

  return {
    composite_tax_rate: Number(compositeRate.toFixed(6)),
    tax_amount:         taxAmount,
    total_amount:       totalAmount,
    breakdown: {
      state_rate:   rates.state,
      county_rate:  rates.county,
      city_rate:    rates.city,
      special_rates: rates.special,
    },
    jurisdictions,
  };
}