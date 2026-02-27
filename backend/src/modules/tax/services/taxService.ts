import { getRatesByLocality, DEFAULT_TAX_RATES, TaxRates } from '../utils/taxRates';

// ---------------------------------------------------------------------------
// Local county lookup via bounding boxes — no external API needed.
// Each county bbox = [minLon, minLat, maxLon, maxLat].
// Overlapping boxes resolved by picking the smallest matching area.
// ---------------------------------------------------------------------------

const NY_COUNTY_BBOX: Record<string, [number, number, number, number]> = {
  'albany':       [-74.27, 42.27, -73.68, 42.83],
  'allegany':     [-78.31, 41.99, -77.72, 42.52],
  'bronx':        [-73.93, 40.79, -73.76, 40.92],
  'broome':       [-76.13, 41.99, -75.42, 42.41],
  'cattaraugus':  [-79.06, 41.99, -78.31, 42.52],
  'cayuga':       [-76.74, 42.54, -76.24, 43.34],
  'chautauqua':   [-79.76, 41.99, -79.06, 42.56],
  'chemung':      [-77.00, 42.00, -76.53, 42.29],
  'chenango':     [-75.89, 42.19, -75.27, 42.74],
  'clinton':      [-74.02, 44.37, -73.34, 45.01],
  'columbia':     [-73.93, 41.99, -73.35, 42.47],
  'cortland':     [-76.27, 42.41, -75.85, 42.76],
  'delaware':     [-75.42, 41.85, -74.44, 42.52],
  'dutchess':     [-73.98, 41.47, -73.49, 42.08],
  'erie':         [-79.06, 42.49, -78.46, 43.08],
  'essex':        [-74.27, 43.76, -73.31, 44.38],
  'franklin':     [-74.73, 44.37, -74.02, 45.01],
  'fulton':       [-74.76, 42.83, -74.12, 43.19],
  'genesee':      [-78.47, 42.86, -77.90, 43.13],
  'greene':       [-74.53, 42.08, -73.79, 42.47],
  'hamilton':     [-74.73, 43.19, -73.97, 43.76],
  'herkimer':     [-75.27, 42.83, -74.73, 43.63],
  'jefferson':    [-76.38, 43.63, -75.48, 44.37],
  'kings':        [-74.04, 40.55, -73.83, 40.74],
  'lewis':        [-75.87, 43.19, -75.27, 43.97],
  'livingston':   [-77.90, 42.47, -77.50, 42.99],
  'madison':      [-75.99, 42.72, -75.27, 43.14],
  'monroe':       [-77.99, 43.00, -77.37, 43.37],
  'montgomery':   [-74.76, 42.72, -74.12, 43.01],
  'nassau':       [-73.77, 40.54, -73.42, 40.91],
  'new york':     [-74.02, 40.70, -73.91, 40.88],
  'niagara':      [-79.07, 43.08, -78.47, 43.38],
  'oneida':       [-75.88, 42.83, -75.06, 43.63],
  'onondaga':     [-76.41, 42.77, -75.88, 43.29],
  'ontario':      [-77.50, 42.70, -76.74, 43.13],
  'orange':       [-74.76, 41.21, -73.98, 41.70],
  'orleans':      [-78.47, 43.08, -77.99, 43.38],
  'oswego':       [-76.60, 43.19, -75.87, 43.72],
  'otsego':       [-75.27, 42.27, -74.44, 42.88],
  'putnam':       [-73.98, 41.37, -73.49, 41.63],
  'queens':       [-73.96, 40.54, -73.70, 40.80],
  'rensselaer':   [-73.68, 42.27, -73.25, 42.95],
  'richmond':     [-74.26, 40.47, -74.04, 40.65],
  'rockland':     [-74.25, 41.03, -73.89, 41.37],
  'st. lawrence': [-75.87, 44.03, -74.44, 45.01],
  'saratoga':     [-74.12, 42.83, -73.47, 43.45],
  'schenectady':  [-74.12, 42.68, -73.69, 42.98],
  'schoharie':    [-74.76, 42.27, -74.12, 42.72],
  'schuyler':     [-77.00, 42.27, -76.53, 42.57],
  'seneca':       [-76.99, 42.54, -76.69, 42.97],
  'steuben':      [-77.73, 41.99, -76.99, 42.67],
  'suffolk':      [-73.34, 40.59, -71.85, 41.30],
  'sullivan':     [-75.13, 41.42, -74.44, 41.99],
  'tioga':        [-76.53, 41.99, -76.00, 42.29],
  'tompkins':     [-76.70, 42.28, -76.24, 42.63],
  'ulster':       [-74.76, 41.63, -73.97, 42.19],
  'warren':       [-74.12, 43.45, -73.47, 43.87],
  'washington':   [-73.47, 43.28, -73.24, 43.84],
  'wayne':        [-77.37, 43.00, -76.70, 43.37],
  'westchester':  [-73.98, 40.91, -73.49, 41.37],
  'wyoming':      [-78.47, 42.52, -77.90, 42.86],
  'yates':        [-77.37, 42.47, -76.99, 42.76],
};

const COUNTY_AREAS: Record<string, number> = Object.fromEntries(
  Object.entries(NY_COUNTY_BBOX).map(([name, [minLon, minLat, maxLon, maxLat]]) => [
    name, (maxLon - minLon) * (maxLat - minLat),
  ])
);

function getCountyByCoords(lat: number, lon: number): string {
  let bestCounty = '';
  let bestArea = Infinity;
  for (const [county, [minLon, minLat, maxLon, maxLat]] of Object.entries(NY_COUNTY_BBOX)) {
    if (lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat) {
      const area = COUNTY_AREAS[county];
      if (area < bestArea) {
        bestArea = area;
        bestCounty = county;
      }
    }
  }
  return bestCounty;
}

// NOTE: Known Limitation (BUG-07) — bbox check intentionally includes small areas
// of adjacent states (PA, NJ, CT, VT) and a sliver of Canada.
// Coordinates from those regions will pass NY validation.
// Acceptable for MVP; for production replace with a proper NY state polygon,
// e.g. via @turf/boolean-point-in-polygon with an official NYS GeoJSON boundary.
function isInsideNY(lat: number, lon: number): boolean {
  return lat >= 40.4 && lat <= 45.1 && lon >= -79.8 && lon <= -71.5;
}

function buildTaxResult(subtotal: number, rates: TaxRates, jurisdictions: string[]) {
  const compositeRate = rates.state + rates.county + rates.city + rates.special;
  const taxAmount     = Math.round(subtotal * compositeRate * 100) / 100;
  const totalAmount   = Math.round((subtotal + taxAmount) * 100) / 100;
  return {
    composite_tax_rate: Number(compositeRate.toFixed(6)),
    tax_amount:         taxAmount,
    total_amount:       totalAmount,
    breakdown: {
      state_rate:    rates.state,
      county_rate:   rates.county,
      city_rate:     rates.city,
      special_rates: rates.special,
    },
    jurisdictions,
  };
}

function resolveRatesAndJurisdictions(county: string) {
  const rates = getRatesByLocality('', county);
  const jurisdictions = ['New York State'];
  if (county) jurisdictions.push(`${toTitleCase(county)} County`);
  if (rates.special > 0) jurisdictions.push('Metropolitan Commuter Transportation District (MCTD)');
  return { rates, jurisdictions };
}

// ---------------------------------------------------------------------------
// Single-point lookup — used by POST /orders (manual creation)
// ---------------------------------------------------------------------------
export async function calculateTaxForLocation(lat: number, lon: number, subtotal: number) {
  if (!isInsideNY(lat, lon)) {
    throw new Error('Coordinates are outside of New York State');
  }
  const county = getCountyByCoords(lat, lon);
  const { rates, jurisdictions } = resolveRatesAndJurisdictions(county);
  return buildTaxResult(subtotal, rates, jurisdictions);
}

// ---------------------------------------------------------------------------
// Batch lookup — used by POST /orders/import (CSV import)
// Fully local — no external API, processes 11k rows in milliseconds.
// ---------------------------------------------------------------------------
export interface BatchTaxInput {
  index: number;
  lat: number;
  lon: number;
  subtotal: number;
}

export type BatchTaxResult =
  | {
  ok: true;
  composite_tax_rate: number;
  tax_amount: number;
  total_amount: number;
  breakdown: { state_rate: number; county_rate: number; city_rate: number; special_rates: number };
  jurisdictions: string[];
  fallback_rate_used: boolean;
}
  | { ok: false; error: string };

export async function calculateTaxBatch(
  items: BatchTaxInput[]
): Promise<Map<number, BatchTaxResult>> {
  const results = new Map<number, BatchTaxResult>();

  for (const item of items) {
    if (!isInsideNY(item.lat, item.lon)) {
      results.set(item.index, { ok: false, error: 'Coordinates are outside of New York State' });
      continue;
    }
    const county = getCountyByCoords(item.lat, item.lon);
    const { rates, jurisdictions } = resolveRatesAndJurisdictions(county);
    const fallback = rates === DEFAULT_TAX_RATES;

    results.set(item.index, {
      ok: true,
      fallback_rate_used: fallback,
      ...buildTaxResult(item.subtotal, rates, jurisdictions),
    });
  }

  return results;
}

function toTitleCase(s: string): string {
  return s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1));
}