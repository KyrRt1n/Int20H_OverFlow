import express from 'express';
import cors from 'cors';
import orderRoutes from './routes/orderRoutes';
import { connectDB } from './db/database';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS and JSON parser configuration
app.use(cors());
app.use(express.json());

// Route mounting (all paths in orderRoutes will start with /orders)
app.use('/orders', orderRoutes);

// Start server with DB connection initialization
const startServer = async () => {
  try {
    await connectDB(); // Initialize DB before start
    app.listen(PORT, () => {
      console.log(`🚀 Server started on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error during server start:', error);
  }
};

startServer();