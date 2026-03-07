import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path'; // 👈 ADDED THIS

dotenv.config();

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
import templatesRoutes from './routes/templates'; // 👈 ADDED THIS
import { apiLoggerMiddleware, printRoutes } from './utils/logger'; 

const app = express();
const PORT = process.env.PORT || 3000;
import path from 'path';
import fs from 'fs';

// ... (after const app = express();)

const uploadsPath = path.join(process.cwd(), 'uploads');

// 1. Log the startup path
console.log('-------------------------------------------');
console.log(`📂 STARTUP CHECK: Looking for uploads at: ${uploadsPath}`);
console.log(`📁 Does folder exist? ${fs.existsSync(uploadsPath) ? 'YES ✅' : 'NO ❌'}`);
if (fs.existsSync(uploadsPath)) {
  console.log(`📄 Files found: ${fs.readdirSync(uploadsPath).slice(0, 5).join(', ')}...`);
}
console.log('-------------------------------------------');

// 2. Add a specialized logger for the /uploads route
app.use('/uploads', (req, res, next) => {
  const fullPath = path.join(uploadsPath, req.path);
  console.log(`\n🔍 [STATIC FILE REQUEST]`);
  console.log(`   URL: ${req.originalUrl}`);
  console.log(`   Attempting to read: ${fullPath}`);
  console.log(`   File exists on disk? ${fs.existsSync(fullPath) ? 'YES ✅' : 'NO ❌'}`);
  next();
});

// 3. Serve the files
app.use('/uploads', express.static(uploadsPath));

app.use(cors());
app.use(express.json());
app.use(apiLoggerMiddleware); 

// 👈 ADDED THIS: Serve the 'uploads' directory statically so the app can see the images
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

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
app.use('/api/invoices', invoiceRoutes);
app.use('/api/clinic', clinicRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/prescriptions', prescriptionsRoutes);
app.use('/api/medicines', medicinesRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/visits', visitsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/templates', templatesRoutes); // 👈 ADDED THIS

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
  printRoutes(app); 
});

export default app;