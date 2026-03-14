import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
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
import organizationRoutes from './routes/organization.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import superAdminRoutes from './routes/super-admin.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Raw body for Stripe webhook (must be before express.json())
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

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
app.use('/api/organization', organizationRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/super-admin', superAdminRoutes);

// Serve frontend static files if the dist directory exists
const frontendPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendPath)) {
  console.log(`Serving frontend from: ${frontendPath}`);
  app.use(express.static(frontendPath));

  // SPA catch-all: any non-API route serves index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  console.log(`Frontend dist not found at: ${frontendPath}`);
}

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

const HOST = '0.0.0.0';
app.listen(Number(PORT), HOST, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║                                                   ║
  ║   D'Fine Kitchen & Bath Remodeling CRM API        ║
  ║   Running on http://${HOST}:${PORT}                  ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝
  `);
});

export default app;
