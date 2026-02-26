import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './modules/orders/db/database';
import orderRoutes from './modules/orders/routes/orderRoutes';
import taxRoutes from './modules/tax/routes/taxRoutes';
import importRoutes from './modules/import/routes/importRoutes';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Mount routes
app.use('/orders', orderRoutes);
app.use('/tax', taxRoutes);
app.use('/import', importRoutes);

// Static files from frontend
const frontendPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Unified Backend' });
});

// SPA Routing: For any other requests, serve the frontend's index.html
app.get(/^(?!\/orders|\/tax|\/import|\/health).*/, (req, res) => {
  res.sendFile(path.resolve(frontendPath, 'index.html'));
});

const startServer = async () => {
  try {
    await connectDB(); // Initialize DB for orders
    app.listen(PORT, () => {
      console.log('\n═══════════════════════════════════════');
      console.log(`🚀 UNIFIED BACKEND RUNNING ON PORT ${PORT}`);
      console.log(`- Orders: http://localhost:${PORT}/orders`);
      console.log(`- Tax:    http://localhost:${PORT}/tax`);
      console.log(`- Import: http://localhost:${PORT}/import`);
      console.log('═══════════════════════════════════════\n');
    });
  } catch (error) {
    console.error('❌ Error starting server:', error);
  }
};

startServer();
