import express from 'express';
import importRoutes from './routes/importRoutes';

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

// Import routes mounting
app.use('/', importRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});// Express server start