import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { rateLimit } from 'express-rate-limit';
import invoiceRoutes from './routes/invoices.js';
import webhookRoutes from './routes/webhooks.js';

const app = express();

const createLimiter = (limit) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many requests' },
  });

const apiLimiter = createLimiter(300);
const sensitiveLimiter = createLimiter(10);

app.use(helmet());

app.get('/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'unavailable' });
});

app.use('/api/webhooks', webhookRoutes);
app.use(express.json({ limit: '10kb' }));

app.use('/api', apiLimiter);
app.post('/api/invoices/:id/checkout', sensitiveLimiter);
app.post('/api/invoices/:id/receipt/resend', sensitiveLimiter);
app.use('/api/invoices', invoiceRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: 'Internal server error' });
});

export default app;
