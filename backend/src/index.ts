import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { prisma } from './lib/prisma';
import { readUpload, nameFromUrl } from './lib/storage';

import authRoutes from './routes/auth';
import patientsRoutes from './routes/patients';
import appointmentsRoutes from './routes/appointments';
import invoiceRoutes from './routes/invoices';
import clinicRoutes from './routes/clinic';
import reportsRoutes from './routes/reports';
import prescriptionsRoutes from './routes/prescriptions';
import medicinesRoutes from './routes/medicines';
import availabilityRoutes from './routes/availability';
import usersRoutes from './routes/users';
import visitsRoutes from './routes/visits';
import aiRoutes from './routes/ai';
import templatesRoutes from './routes/templates';
import suggestionsRoutes from './routes/suggestions';
import { apiLoggerMiddleware, printRoutes } from './utils/logger';

const app = express();
const PORT = config.port;

// Cloud Run sits behind Google's load balancer.
app.set('trust proxy', true);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Clinic logos and doctor signatures (Cloud Storage in production, ./uploads locally).
// File names are long random strings, so the URLs are not guessable.
app.get('/uploads/:name', async (req, res, next) => {
  try {
    if (!nameFromUrl(req.params.name)) return res.status(404).end();
    const file = await readUpload(req.params.name);
    if (!file) return res.status(404).end();
    res.set('Content-Type', file.contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(file.data);
  } catch (err) {
    next(err);
  }
});

// The mobile app is not a browser, so CORS only matters for web clients.
// Set CORS_ORIGINS to restrict; empty allows all (previous behaviour).
app.use(cors(config.corsOrigins.length ? { origin: config.corsOrigins } : undefined));
app.use(express.json({ limit: '1mb' }));
app.use(apiLoggerMiddleware); 

// Liveness: the process is up. Readiness: the database answers too.
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'ok' });
  } catch {
    res.status(503).json({ status: 'error', database: 'unreachable' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/clinic', clinicRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/prescriptions', prescriptionsRoutes);
app.use('/api/medicines', medicinesRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/visits', visitsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/suggestions', suggestionsRoutes);

console.log('✅ All routes loaded');

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large (max 2 MB)' });
  }
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Adding '0.0.0.0' tells the container to accept external traffic from Cloud Run
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`DocAssist API running on port ${PORT}`);
  if (!config.isProduction) printRoutes(app);
});

// Cloud Run sends SIGTERM before stopping an instance: finish in-flight
// requests and close database connections cleanly.
process.on('SIGTERM', () => {
  server.close(() => {
    prisma.$disconnect().finally(() => process.exit(0));
  });
});

export default app;