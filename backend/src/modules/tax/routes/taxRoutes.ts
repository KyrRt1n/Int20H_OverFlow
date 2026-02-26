// Source: NYS Publication 718 (effective March 1, 2025)
// https://www.tax.ny.gov/pdf/publications/sales/pub718.pdf
//
// Structure: state (4% fixed statewide) + county + city + special (MCTD 0.375%)
// MCTD (Metropolitan Commuter Transportation District) surcharge of 0.375% applies to:
//   NYC boroughs + Dutchess, Nassau, Orange, Putnam, Rockland, Suffolk, Westchester counties.

export interface TaxRates {
  state:   number;
  county:  number;
  city:    number;
  special: number;
}

// Fallback: state-only rate (4%). Applied when coordinates resolve to an unknown locality.
// This is intentionally conservative — it will never overcharge a customer.
export const DEFAULT_TAX_RATES: TaxRates = { state: 0.04, county: 0.0, city: 0.0, special: 0.0 };

// ---------------------------------------------------------------------------
// County-level rates
// Keyed by lowercase county name as returned by Google Geocoding API
// (administrative_area_level_2, stripped of " County").
// ---------------------------------------------------------------------------
export const COUNTY_RATES: Record<string, TaxRates> = {
  'albany':       { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'allegany':     { state: 0.04, county: 0.045,   city: 0,     special: 0 },       // 8.5%
  'broome':       { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'cattaraugus':  { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'cayuga':       { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'chautauqua':   { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'chemung':      { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'chenango':     { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'clinton':      { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'columbia':     { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'cortland':     { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'delaware':     { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'dutchess':     { state: 0.04, county: 0.0375,  city: 0,     special: 0.00375 }, // 8.125% + MCTD
  'erie':         { state: 0.04, county: 0.0475,  city: 0,     special: 0 },       // 8.75%
  'essex':        { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'franklin':     { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'fulton':       { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'genesee':      { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'greene':       { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'hamilton':     { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'herkimer':     { state: 0.04, county: 0.0425,  city: 0,     special: 0 },       // 8.25%
  'jefferson':    { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'lewis':        { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'livingston':   { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'madison':      { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'monroe':       { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'montgomery':   { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'nassau':       { state: 0.04, county: 0.04875, city: 0,     special: 0.00375 }, // 8.625% + MCTD
  'niagara':      { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'oneida':       { state: 0.04, county: 0.0475,  city: 0,     special: 0 },       // 8.75%
  'onondaga':     { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'ontario':      { state: 0.04, county: 0.035,   city: 0,     special: 0 },       // 7.5%
  'orange':       { state: 0.04, county: 0.0375,  city: 0,     special: 0.00375 }, // 8.125% + MCTD
  'orleans':      { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'oswego':       { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'otsego':       { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'putnam':       { state: 0.04, county: 0.035,   city: 0,     special: 0.00375 }, // 8.375% + MCTD
  'rensselaer':   { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'rockland':     { state: 0.04, county: 0.035,   city: 0,     special: 0.00375 }, // 8.375% + MCTD
  'st. lawrence': { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'saratoga':     { state: 0.04, county: 0.03,    city: 0,     special: 0 },       // 7%
  'schenectady':  { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'schoharie':    { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'schuyler':     { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'seneca':       { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'steuben':      { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'suffolk':      { state: 0.04, county: 0.0475,  city: 0,     special: 0.00375 }, // 8.75% + MCTD
  'sullivan':     { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'tioga':        { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'tompkins':     { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'ulster':       { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'warren':       { state: 0.04, county: 0.03,    city: 0,     special: 0 },       // 7%
  'washington':   { state: 0.04, county: 0.03,    city: 0,     special: 0 },       // 7%
  'wayne':        { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'westchester':  { state: 0.04, county: 0.035,   city: 0,     special: 0.00375 }, // 8.375% + MCTD
  'wyoming':      { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%
  'yates':        { state: 0.04, county: 0.04,    city: 0,     special: 0 },       // 8%

  // NYC — all five boroughs share the same rate (8.875%)
  // NYC imposes 4.5% city tax + 0.375% MCTD; no separate county portion.
  // Fix #3: Google Geocoding returns full names like "Richmond County", "Kings County"
  // The .replace(/\s*County$/i, '') in taxService strips " County" → keys below must cover both forms.
  'bronx':           { state: 0.04, county: 0, city: 0.045, special: 0.00375 }, // The Bronx
  'kings':           { state: 0.04, county: 0, city: 0.045, special: 0.00375 }, // Brooklyn
  'new york':        { state: 0.04, county: 0, city: 0.045, special: 0.00375 }, // Manhattan
  'new york city':   { state: 0.04, county: 0, city: 0.045, special: 0.00375 }, // generic NYC
  'queens':          { state: 0.04, county: 0, city: 0.045, special: 0.00375 },
  'richmond':        { state: 0.04, county: 0, city: 0.045, special: 0.00375 }, // Staten Island
};

// ---------------------------------------------------------------------------
// City-level overrides — applied when geocoding resolves to a specific city
// that has a rate different from the surrounding county.
// Keyed by lowercase city name (locality from Google Geocoding API).
// ---------------------------------------------------------------------------
export const CITY_OVERRIDES: Record<string, TaxRates> = {
  // NYC borough locality names
  'new york':     { state: 0.04, county: 0,      city: 0.045, special: 0.00375 }, // Manhattan
  'brooklyn':     { state: 0.04, county: 0,      city: 0.045, special: 0.00375 },
  'bronx':        { state: 0.04, county: 0,      city: 0.045, special: 0.00375 },
  'queens':       { state: 0.04, county: 0,      city: 0.045, special: 0.00375 },
  'staten island':{ state: 0.04, county: 0,      city: 0.045, special: 0.00375 },

  // Yonkers: 8.875% (Westchester county base + city surcharge + MCTD)
  'yonkers':      { state: 0.04, county: 0.045,  city: 0,     special: 0.00375 },

  // Other Westchester cities — same as county rate (8.375%)
  'mount vernon': { state: 0.04, county: 0.035,  city: 0,     special: 0.00375 },
  'new rochelle': { state: 0.04, county: 0.035,  city: 0,     special: 0.00375 },
  'white plains': { state: 0.04, county: 0.035,  city: 0,     special: 0.00375 },

  // Oneida county cities — 8.75%
  'rome':         { state: 0.04, county: 0.0475, city: 0,     special: 0 },
  'utica':        { state: 0.04, county: 0.0475, city: 0,     special: 0 },

  // Saratoga county — 7%
  'saratoga springs': { state: 0.04, county: 0.03, city: 0,   special: 0 },

  // Warren county — 7%
  'glens falls':  { state: 0.04, county: 0.03,  city: 0,     special: 0 },

  // Tompkins county — 8%
  'ithaca':       { state: 0.04, county: 0.04,  city: 0,     special: 0 },

  // St. Lawrence county — 8%
  'ogdensburg':   { state: 0.04, county: 0.04,  city: 0,     special: 0 },

  // Madison county — 8%
  'oneida':       { state: 0.04, county: 0.04,  city: 0,     special: 0 },

  // Cayuga county — 8%
  'auburn':       { state: 0.04, county: 0.04,  city: 0,     special: 0 },

  // Fulton county — 8%
  'gloversville': { state: 0.04, county: 0.04,  city: 0,     special: 0 },
  'johnstown':    { state: 0.04, county: 0.04,  city: 0,     special: 0 },

  // Cattaraugus county — 8%
  'olean':        { state: 0.04, county: 0.04,  city: 0,     special: 0 },
  'salamanca':    { state: 0.04, county: 0.04,  city: 0,     special: 0 },

  // Chenango county — 8%
  'norwich':      { state: 0.04, county: 0.04,  city: 0,     special: 0 },

  // Oswego county — 8%
  'oswego':       { state: 0.04, county: 0.04,  city: 0,     special: 0 },
};

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const normalize = (s: string) => s.toLowerCase().trim();

// Returns rates for a locality, with city taking priority over county.
// Falls back to state-only default if neither is found.
export function getRatesByLocality(city: string, county: string): TaxRates {
  return (
    CITY_OVERRIDES[normalize(city)] ??
    COUNTY_RATES[normalize(county)] ??
    DEFAULT_TAX_RATES
  );
}