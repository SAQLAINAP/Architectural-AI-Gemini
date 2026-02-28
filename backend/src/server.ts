import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRoutes from './routes/api.routes.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import { generalLimiter } from './middleware/rate-limiter.js';
import { errorHandler } from './middleware/error-handler.js';
import { logger } from './utils/logger.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Rate limiting
app.use('/api/', generalLimiter);

// Health endpoint (no auth)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth middleware for all other /api/* routes
app.use('/api/', authMiddleware);

// API routes
app.use('/api', apiRoutes);

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info({ port: PORT, frontendUrl: FRONTEND_URL }, 'Backend server started');
});

export default app;
