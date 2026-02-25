import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import taxRoutes from './routes/taxRoutes';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.use('/api', taxRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Tax Service', port: PORT });
});

app.listen(PORT, () => {
  console.log('\n═══════════════════════════════════════');
  console.log(`💰 TAX SERVICE RUNNING ON PORT ${PORT}`);
  console.log('═══════════════════════════════════════\n');
});