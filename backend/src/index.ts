import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import leadsRoutes from './routes/leads.routes.js';
import projectsRoutes from './routes/projects.routes.js';
import estimatesRoutes from './routes/estimates.routes.js';
import pricingRoutes from './routes/pricing.routes.js';
import vendorsRoutes from './routes/vendors.routes.js';
import crewsRoutes from './routes/crews.routes.js';
import purchasingRoutes from './routes/purchasing.routes.js';
import documentsRoutes from './routes/documents.routes.js';
import paymentsRoutes from './routes/payments.routes.js';
import invoicesRoutes from './routes/invoices.routes.js';
import contractsRoutes from './routes/contracts.routes.js';
import projectManagementRoutes from './routes/project-management.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import leadSourcesRoutes from './routes/lead-sources.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Static file serving for uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/estimates', estimatesRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/vendors', vendorsRoutes);
app.use('/api/crews', crewsRoutes);
app.use('/api/purchasing', purchasingRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/contracts', contractsRoutes);
app.use('/api/projects', projectManagementRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/lead-sources', leadSourcesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║                                                   ║
  ║   D'Fine Kitchen & Bath Remodeling CRM API        ║
  ║   Running on http://localhost:${PORT}               ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝
  `);
});

export default app;
