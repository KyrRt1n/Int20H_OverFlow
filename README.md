# Int20H OverFlow - Unified Order Management System

A full-stack application for managing orders, calculating location-based taxes (New York State), and importing data from CSV files.

## Project Structure

- **`/backend`**: Unified Node.js (Express + TypeScript) service.
  - **Orders Module**: Manages order storage and retrieval using SQLite.
  - **Tax Module**: Calculates taxes based on Google Maps Geocoding API and New York State tax rates.
  - **Import Module**: Handles CSV file uploads and processes them into the system.
- **`/frontend`**: React + TypeScript + Vite application for the user interface.

## Prerequisites

- **Node.js**: v18 or higher recommended.
- **Google Maps API Key**: Required for the Tax service to resolve coordinates to cities.
- **Admin Token**: Used for authorized CSV imports.

## Setup & Installation

1. **Clone the repository.**
2. **Install Backend Dependencies:**
   ```bash
   cd backend
   npm install
   ```
3. **Configure Environment Variables:**
   Create a `.env` file in the `backend` folder:
   ```env
   PORT=3000
   GOOGLE_MAPS_API_KEY=your_google_maps_key
   ADMIN_TOKEN=secret-token-123
   ```
4. **Install Frontend Dependencies:**
   ```bash
   cd ../frontend
   npm install
   ```

## Running the Application

### Start the Backend
```bash
cd backend
npm start
```
The server will be available at `http://localhost:3000`.

### Start the Frontend
```bash
cd frontend
npm run dev
```
The application will be available at `http://localhost:5173` (or the port specified by Vite).

## API Documentation

| Endpoint | Method | Description | Auth |
| :--- | :--- | :--- | :--- |
| `/health` | `GET` | Service status check | No |
| `/orders` | `GET` | List orders (paginated) | No |
| `/orders` | `POST` | Create a new order manually | No |
| `/tax/calculate-tax` | `POST` | Calculate tax for given lat/lon/subtotal | No |
| `/import/orders/import` | `POST` | Import orders via CSV file | Yes (Bearer) |

## Testing

### Automated Test Script (Windows)
A PowerShell script is available in the `backend` folder to test the core functionality:
```powershell
cd backend
powershell -ExecutionPolicy Bypass -File test_all.ps1
```

### Manual Testing with cURL

#### 1. Calculate Tax
```bash
curl -X POST -H "Content-Type: application/json" -d "{\"lat\": 40.7128, \"lon\": -74.006, \"subtotal\": 100}" http://localhost:3000/tax/calculate-tax
```

#### 2. Import CSV
First, create a `test_orders.csv` with:
```csv
latitude,longitude,subtotal,timestamp
40.7128,-74.0060,100,2026-02-26T01:00:00Z
```
Then run:
```bash
curl -X POST -H "Authorization: Bearer secret-token-123" -F "file=@test_orders.csv" http://localhost:3000/import/orders/import
```

#### 3. List Orders
```bash
curl http://localhost:3000/orders
```

## Technologies Used

- **Backend**: Node.js, Express, TypeScript, SQLite, Multer (file uploads), Axios.
- **Frontend**: React, Vite, TypeScript.