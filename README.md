# Drone Tax Admin by Overflow Team

A full-stack admin dashboard for managing drone delivery orders with automatic sales tax calculation across New York State jurisdictions.

Built for the Int20H hackathon challenge: given a delivery coordinate anywhere in NYS, determine the correct **composite sales tax** (state + county + city + MCTD special) and apply it to each order.

---

## The Problem

Our drone delivery service (Instant Wellness Kits) operates across all of New York State. Every order has a GPS delivery coordinate and a subtotal — but the app was charging customers the kit price only, with **no sales tax**. NYS tax authorities noticed.

The composite sales tax rate in NY varies by jurisdiction: state (4%) + county (0–4.75%) + city (0–4.5%) + MCTD surcharge (0.375% in metro area). The same delivery crossing a county line can mean a rate difference of over 1.5%.

This service retroactively calculates and stores the correct tax for every existing order, and applies it in real-time to all new ones.

---

## Solution Overview

Rather than calling the Google Maps Geocoding API per order (which would mean 11 000+ API calls with rate limits and cost), tax jurisdiction is resolved **entirely offline** using bounding-box lookups:

- A county-level bbox table covers all 62 NY counties
- A city-level bbox table covers NYC boroughs and Westchester cities with non-standard rates
- The smallest matching bounding box wins (resolves overlaps)
- Tax rates are sourced from **NYS Publication 718** (effective March 1, 2025)

This approach processes 11 000 rows in under 3 seconds with zero external API dependencies.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 20, Express 5, TypeScript |
| Database | SQLite (via `sqlite` + `sqlite3`) |
| Frontend | React 19, Vite, TypeScript |
| File upload | Multer |
| Maps | Leaflet + React-Leaflet |
| Deploy | Heroku (Procfile included) |

---

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── index.ts                        # Express app entry point
│   │   └── modules/
│   │       ├── orders/
│   │       │   ├── controllers/            # GET /orders, POST /orders
│   │       │   ├── db/database.ts          # SQLite setup + auto-seed
│   │       │   └── routes/
│   │       ├── tax/
│   │       │   ├── services/taxService.ts  # Bbox lookup + tax calculation
│   │       │   ├── utils/taxRates.ts       # NYS Publication 718 rate table
│   │       │   └── routes/
│   │       ├── import/
│   │       │   ├── controllers/            # POST /orders/import
│   │       │   ├── services/csvParserService.ts
│   │       │   └── routes/
│   │       └── auth/
│   │           └── routes/authRoutes.ts    # POST /auth/login
│   ├── data/
│   │   └── orders.csv                      # Seed data (place CSV here)
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   ├── App.tsx                             # Main dashboard
│   └── components/ImportCsvModal.tsx
├── package.json                            # Root scripts (setup, start, deploy)
└── Procfile                                # Heroku entry point
```

---

## Getting Started

### Prerequisites

- Node.js v20 or higher
- npm v9+

### 1. Clone & Install

```bash
git clone <repo-url>
cd Int20H_OverFlow-master
npm run setup
```

`npm run setup` installs all dependencies for both backend and frontend, then builds the React app.

### 2. Configure Environment

Create a `.env` file in the `backend/` directory:

```env
PORT=3000
ADMIN_LOGIN=admin
ADMIN_PASSWORD=admin123
ADMIN_TOKEN=secret-token-123
```

> **Note:** All three auth variables are required. If any is missing, the `/auth/login` endpoint returns 500.

### 3. Seed Data (Optional)

Place the provided CSV file at `backend/data/orders.csv`. On first launch with an empty database, the server will automatically import all orders and calculate taxes for each one.

```
backend/
└── data/
    └── orders.csv   ← put the file here
```

Expected CSV format:
```csv
latitude,longitude,subtotal,timestamp
40.7128,-74.0060,149.99,2026-01-15T10:30:00Z
42.8864,-78.8784,89.00,2026-01-16T14:00:00Z
```

### 4. Start

```bash
npm start
```

The application will be available at **http://localhost:3000**

---

## Running in Development Mode

Run backend and frontend separately with hot reload:

```bash
# Terminal 1 — backend (ts-node, auto-restart)
npm run dev:backend

# Terminal 2 — frontend (Vite HMR)
npm run dev:frontend
```

Frontend dev server: **http://localhost:5173**

> In dev mode, the Vite proxy forwards `/orders`, `/tax`, `/auth` to `http://localhost:3000`. No manual URL changes needed.

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/login` | No | Returns a Bearer token |

**Request body:**
```json
{ "login": "admin", "password": "admin123" }
```
**Response:**
```json
{ "token": "Bearer secret-token-123" }
```

---

### Orders

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/orders` | No | List orders with pagination and filters |
| `POST` | `/orders` | No | Create a single order manually |
| `POST` | `/orders/import` | No | Bulk import orders from a CSV file |

#### `GET /orders` — Query Parameters

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10, max: 200) |
| `from` | ISO date | Filter by timestamp >= value |
| `to` | ISO date | Filter by timestamp <= value |
| `subtotal_min` | number | Filter by subtotal >= value |
| `subtotal_max` | number | Filter by subtotal <= value |
| `status` | string | Filter by status (`new`, `delivered`, `pending`) |
| `sort_by` | string | Column to sort by (`id`, `date`, `subtotal`, `tax_rate`, `tax_amt`, `total`) |
| `sort_dir` | string | Sort direction (`asc` / `desc`) |

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "latitude": 40.7128,
      "longitude": -74.0060,
      "subtotal": 149.99,
      "composite_tax_rate": 0.08875,
      "tax_amount": 13.31,
      "total_amount": 163.30,
      "breakdown": {
        "state_rate": 0.04,
        "county_rate": 0.0,
        "city_rate": 0.045,
        "special_rates": 0.00375
      },
      "jurisdictions": ["New York State", "New York", "Metropolitan Commuter Transportation District (MCTD)"],
      "timestamp": "2026-01-15T10:30:00.000Z",
      "status": "new"
    }
  ],
  "pagination": { "total": 11222, "page": 1, "limit": 10, "totalPages": 1123 },
  "summary": { "total_orders": 11222, "total_tax": 94832.10, "total_revenue": 1148204.50 }
}
```

#### `POST /orders` — Create Order Manually

**Request body:**
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "subtotal": 149.99,
  "timestamp": "2026-02-27T12:00:00Z"
}
```
`timestamp` is optional — defaults to current time.

#### `POST /orders/import` — CSV Import

Upload a `.csv` file as `multipart/form-data` with the field name `file`.

```bash
curl -X POST -F "file=@orders.csv" http://localhost:3000/orders/import
```

**Response:**
```json
{
  "message": "Import complete.",
  "processed": 11198,
  "failed": 24,
  "errors": [
    { "row": 47, "reason": "Coordinates are outside of New York State" }
  ]
}
```

---

### Tax

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/tax/calculate-tax` | No | Calculate tax for given coordinates |

**Request body:**
```json
{ "lat": 40.9312, "lon": -73.8988, "subtotal": 100 }
```

**Response:**
```json
{
  "composite_tax_rate": 0.08875,
  "tax_amount": 8.88,
  "total_amount": 108.88,
  "breakdown": {
    "state_rate": 0.04,
    "county_rate": 0.045,
    "city_rate": 0.0,
    "special_rates": 0.00375
  },
  "jurisdictions": ["New York State", "Yonkers", "Metropolitan Commuter Transportation District (MCTD)"]
}
```

---

## Tax Rate Logic

Tax rates are sourced from **NYS Publication 718** (effective March 1, 2025).

| Component | Description |
|---|---|
| **State** | 4% flat, applies statewide |
| **County** | 0% – 4.75%, varies by county |
| **City** | 4.5% in NYC boroughs only |
| **MCTD Special** | 0.375% in NYC + 7 surrounding counties |

**MCTD counties:** Dutchess, Nassau, Orange, Putnam, Rockland, Suffolk, Westchester.

**NYC boroughs** (8.875% total): Manhattan, Brooklyn, Bronx, Queens, Staten Island — identified by city-level bounding boxes that take priority over county lookup.

**Jurisdiction resolution order:**
1. Check city-level bbox (NYC boroughs + Westchester cities with distinct rates)
2. Fall back to county-level bbox
3. Fall back to state-only rate (4%) if coordinates match no known county

---

## Known Limitations

### Bounding Box Boundary Precision
The NY State boundary check uses a rectangular bounding box (`lat 40.4–45.1, lon -79.8–-71.5`). This slightly overlaps parts of New Jersey, Pennsylvania, Connecticut, Vermont, and a sliver of Ontario. Coordinates from those areas will incorrectly pass NY validation.

**Production fix:** Replace with `@turf/boolean-point-in-polygon` against the official NYS GeoJSON boundary.

### City Coverage
City-level bbox lookup covers only cities with tax rates that differ from their surrounding county: NYC boroughs and select Westchester cities (Yonkers, Mount Vernon, New Rochelle, White Plains). All other cities default to county rates, which is correct per Publication 718.

### CSV Import Atomicity
Rows that fail individual DB insert are logged as errors but the transaction continues — partial imports are possible. This is acceptable for the current use case; adjust if strict atomicity is required.

---

## Deploying to Heroku

```bash
heroku create your-app-name
heroku config:set ADMIN_LOGIN=admin ADMIN_PASSWORD=yourpassword ADMIN_TOKEN=yourtoken
git push heroku main
```

The `Procfile` and `heroku-postbuild` script in `package.json` handle the build automatically.

> SQLite on Heroku resets on every dyno restart (ephemeral filesystem). For persistent storage, migrate to PostgreSQL with the `pg` package.

---

## Assumptions

- Tax rates reflect NYS Publication 718 as of March 1, 2025. Rates change periodically; a production system should pull from the NYS Tax API.
- Deliveries are assumed to be within New York State. Orders with coordinates outside the NY bounding box are rejected with a 400 error.
- `subtotal` in the CSV represents the pre-tax wellness kit price. Tax is never included in the input.
- `timestamp` in the CSV is treated as the order creation time. If absent, the import time is used.
