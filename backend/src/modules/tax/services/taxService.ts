import axios from 'axios';
import { getRatesByLocality, DEFAULT_TAX_RATES } from '../utils/taxRates';

// ---------------------------------------------------------------------------
// US Census Bureau TIGERweb — replaces Google Geocoding API
//
// Why Census API:
//   - Completely free, no API key required
//   - Supports batch geocoding (up to 1 000 rows per request)
//   - Returns official FIPS codes → deterministic county lookup
//   - No rate-limits for bulk imports
//
// Single-point endpoint (used for manual order creation):
//   GET https://geocoding.geo.census.gov/geocoder/geographies/coordinates
//
// Batch endpoint (used for CSV import):
//   POST https://geocoding.geo.census.gov/geocoder/geographies/coordinatesfile
// ---------------------------------------------------------------------------

const CENSUS_BASE = 'https://geocoding.geo.census.gov/geocoder/geographies';

// NYC max-rate fallback — applied when Census lookup fails.
// 8.875% is safer than the 4% state-only default (avoids tax under-collection).
const NYC_MAX_RATES = { state: 0.04, county: 0, city: 0.045, special: 0.00375 };

function isInsideNY(lat: number, lon: number): boolean {
  return lat >= 40.4 && lat <= 45.1 && lon >= -79.8 && lon <= -71.5;
}



// FIPS county code → lowercase county name (NY State FIPS = 36)
const NY_FIPS_TO_COUNTY: Record<string, string> = {
  '001': 'albany',      '003': 'allegany',    '005': 'bronx',       '007': 'broome',
  '009': 'cattaraugus', '011': 'cayuga',       '013': 'chautauqua',  '015': 'chemung',
  '017': 'chenango',    '019': 'clinton',      '021': 'columbia',    '023': 'cortland',
  '025': 'delaware',    '027': 'dutchess',     '029': 'erie',        '031': 'essex',
  '033': 'franklin',    '035': 'fulton',       '037': 'genesee',     '039': 'greene',
  '041': 'hamilton',    '043': 'herkimer',     '045': 'jefferson',   '047': 'kings',
  '049': 'lewis',       '051': 'livingston',   '053': 'madison',     '055': 'monroe',
  '057': 'montgomery',  '059': 'nassau',       '061': 'new york',    '063': 'niagara',
  '065': 'oneida',      '067': 'onondaga',     '069': 'ontario',     '071': 'orange',
  '073': 'orleans',     '075': 'oswego',       '077': 'otsego',      '079': 'putnam',
  '081': 'queens',      '083': 'rensselaer',   '085': 'richmond',    '087': 'rockland',
  '089': 'st. lawrence','091': 'saratoga',     '093': 'schenectady', '095': 'schoharie',
  '097': 'schuyler',    '099': 'seneca',       '101': 'steuben',     '103': 'suffolk',
  '105': 'sullivan',    '107': 'tioga',        '109': 'tompkins',    '111': 'ulster',
  '113': 'warren',      '115': 'washington',   '117': 'wayne',       '119': 'westchester',
  '121': 'wyoming',     '123': 'yates',
};

// ---------------------------------------------------------------------------
// Single-point lookup — used by POST /orders (manual creation)
// ---------------------------------------------------------------------------
export async function calculateTaxForLocation(lat: number, lon: number, subtotal: number) {
  if (!isInsideNY(lat, lon)) {
    throw new Error('Coordinates are outside of New York State');
  }

  let county = '';
  let geocodingFailed = false;

  try {
    const resp = await axios.get(`${CENSUS_BASE}/coordinates`, {
      params: {
        x: lon,
        y: lat,
        benchmark: 'Public_AR_Current',
        vintage: 'Current_Current',
        layers: 'Counties',
        format: 'json',
      },
      timeout: 10_000,
    });

    const counties: any[] =
      resp.data?.result?.geographies?.Counties ??
      resp.data?.result?.geographies?.['Counties'] ?? [];

    if (counties.length > 0) {
      county = NY_FIPS_TO_COUNTY[counties[0].COUNTY] ?? '';
    } else {
      geocodingFailed = true;
    }
  } catch (err) {
    geocodingFailed = true;
    console.error('Census geocoding error (single):', err);
  }

  if (geocodingFailed) {
    console.warn(`Census failed for (${lat}, ${lon}). Applying NYC max rate 8.875%.`);
    return buildResult(subtotal, NYC_MAX_RATES, ['New York State', 'NYC max fallback (Census unavailable)'], true);
  }

  const rates = getRatesByLocality('', county);
  const jurisdictions = ['New York State'];
  if (county) jurisdictions.push(`${toTitleCase(county)} County`);
  if (rates.special > 0) jurisdictions.push('Metropolitan Commuter Transportation District (MCTD)');

  return buildResult(subtotal, rates, jurisdictions, rates === DEFAULT_TAX_RATES);
}

// ---------------------------------------------------------------------------
// Batch lookup — used by POST /orders/import (CSV import)
//
// Processes items in chunks of BATCH_SIZE, sends each chunk to Census API.
// Falls back per-item if the whole batch request fails.
// ---------------------------------------------------------------------------
const BATCH_SIZE = 1000; // Census API limit per request
const BATCH_CONCURRENCY = 3; // parallel requests

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

  // Validate NY bounds upfront — no API call needed for out-of-bounds
  const validItems: BatchTaxInput[] = [];
  for (const item of items) {
    if (!isInsideNY(item.lat, item.lon)) {
      results.set(item.index, { ok: false, error: 'Coordinates are outside of New York State' });
    } else {
      validItems.push(item);
    }
  }

  if (validItems.length === 0) return results;

  // Split into chunks of BATCH_SIZE
  const chunks: BatchTaxInput[][] = [];
  for (let i = 0; i < validItems.length; i += BATCH_SIZE) {
    chunks.push(validItems.slice(i, i + BATCH_SIZE));
  }

  // Process chunks with limited concurrency
  for (let i = 0; i < chunks.length; i += BATCH_CONCURRENCY) {
    const window = chunks.slice(i, i + BATCH_CONCURRENCY);
    await Promise.all(window.map(chunk => processChunk(chunk, results)));
  }

  return results;
}

async function processChunk(
  chunk: BatchTaxInput[],
  results: Map<number, BatchTaxResult>
): Promise<void> {
  // Census batch coordinate file format (no header):
  //   Unique_ID,Longitude,Latitude
  const csvLines = chunk.map(i => `${i.index},${i.lon},${i.lat}`).join('\n');

  let idToCounty = new Map<number, string>();
  let batchFailed = false;

  try {
    // Dynamic import of form-data (CommonJS compat)
    const FormData = require('form-data');
    const form = new FormData();
    form.append('benchmark', 'Public_AR_Current');
    form.append('vintage', 'Current_Current');
    form.append('layers', 'Counties');
    form.append('format', 'json');
    form.append('addressFile', Buffer.from(csvLines), {
      filename: 'coords.csv',
      contentType: 'text/csv',
    });

    const resp = await axios.post(`${CENSUS_BASE}/coordinatesfile`, form, {
      headers: form.getHeaders(),
      timeout: 120_000,
      maxContentLength: 50 * 1024 * 1024,
    });

    // Census batch response shape:
    // { result: { addressMatches: [ { id, geographies: { Counties: [...] } }, ... ] } }
    const matches: any[] = resp.data?.result?.addressMatches ?? [];
    for (const match of matches) {
      const id = parseInt(String(match.id ?? '0'), 10);
      const counties: any[] = match.geographies?.Counties ?? [];
      if (counties.length > 0) {
        idToCounty.set(id, NY_FIPS_TO_COUNTY[counties[0].COUNTY] ?? '');
      }
    }
  } catch (err) {
    console.error(`Census batch failed for chunk (indices ${chunk[0].index}–${chunk[chunk.length - 1].index}):`, err);
    batchFailed = true;
  }

  for (const item of chunk) {
    if (batchFailed) {
      // Fallback entire chunk
      results.set(item.index, buildBatchResult(item.subtotal, NYC_MAX_RATES, ['NYC max fallback (batch failed)'], true));
      continue;
    }

    if (idToCounty.has(item.index)) {
      const county = idToCounty.get(item.index)!;
      const rates = getRatesByLocality('', county);
      const jurisdictions = ['New York State'];
      if (county) jurisdictions.push(`${toTitleCase(county)} County`);
      if (rates.special > 0) jurisdictions.push('Metropolitan Commuter Transportation District (MCTD)');
      results.set(item.index, buildBatchResult(item.subtotal, rates, jurisdictions, rates === DEFAULT_TAX_RATES));
    } else {
      console.warn(`Census: no county for index=${item.index} (${item.lat}, ${item.lon}). Fallback.`);
      results.set(item.index, buildBatchResult(item.subtotal, NYC_MAX_RATES, ['NYC max fallback (no match)'], true));
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildResult(
  subtotal: number,
  rates: { state: number; county: number; city: number; special: number },
  jurisdictions: string[],
  fallback_rate_used: boolean
) {
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
    fallback_rate_used,
  };
}

function buildBatchResult(
  subtotal: number,
  rates: { state: number; county: number; city: number; special: number },
  jurisdictions: string[],
  fallback_rate_used: boolean
): BatchTaxResult {
  return { ok: true, ...buildResult(subtotal, rates, jurisdictions, fallback_rate_used) };
}

function toTitleCase(s: string): string {
  return s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1));
}