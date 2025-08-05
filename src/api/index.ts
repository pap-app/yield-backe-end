import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import userRoutes from './routes/user-routes';
import telegramRoutes from './routes/telegram-routes';
import StrategyRoutes from './routes/strategy-routes';
import vaultRoutes from './routes/vault-routes';
import './controller/telegramBot';
import cors from 'cors';
import cron from 'node-cron';
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 4000;
app.use(express.json());
// ✅ Enable CORS for all routes
app.use(cors());

/*app.use(
  cors({
    origin: [
      'http://localhost:3001',
      'https://app.mygoat.fun',
      'http://localhost:3000',
      'https://goat-app-dashboard.vercel.app',
    ],
    //credentials: true, // 👈 this part
  }),
);*/

app.get('/', (req: Request, res: Response) => {
  res.status(200).send('GOAT');
});

app.use('/api/v1/users', userRoutes);
app.use('/api/v1/telegram', telegramRoutes);
app.use('/api/v1/strategy', StrategyRoutes);
app.use('/api/v1/vault', vaultRoutes);

// Schedule the cron job to run every 15 minutes
cron.schedule('*/15 * * * *', () => {
  console.log('I invoked at', Date.now());
  // cronOnchainUpdates();
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
