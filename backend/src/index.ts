import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth';
import patientsRoutes from './routes/patients';
import appointmentsRoutes from './routes/appointments';
import prescriptionsRoutes from './routes/prescriptions';
import medicinesRoutes from './routes/medicines';
import availabilityRoutes from './routes/availability';
import usersRoutes from './routes/users';
import visitsRoutes from './routes/visits';
import aiRoutes from './routes/ai';
import { apiLoggerMiddleware, printRoutes } from './utils/logger'; // Import logger utilities

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(apiLoggerMiddleware); // Log all API traffic

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/prescriptions', prescriptionsRoutes);
app.use('/api/medicines', medicinesRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/visits', visitsRoutes);
app.use('/api/ai', aiRoutes);

console.log('✅ All routes loaded');

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});


app.listen(PORT, () => {
  console.log(`\n🚀 DocAssist API running on http://localhost:${PORT}\n`);
  printRoutes(app); // This will print all active routes so you can verify paths
});

export default app;
