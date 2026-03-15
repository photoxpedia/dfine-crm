# ReModel Sync

AI-first CRM for Remodeling Companies with:
- Lead management
- Custom pricing engine (bathroom/kitchen pricing)
- Estimate builder with margin calculations
- Project management
- Client portal with payment tracking
- Document generation (PDF)
- E-signature capture

## Tech Stack

- **Backend**: Node.js (Express) + TypeScript + Prisma ORM
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Database**: PostgreSQL
- **Payments**: Square
- **Authentication**: Magic Link (passwordless)

## User Roles

| Role | Access | Theme |
|------|--------|-------|
| Admin | Full access - dashboard, users, pricing config, purchasing, vendors | Blue |
| Designer | Leads, projects, estimates, documents, purchasing status | Violet |
| Client | Project view, documents, payments, approvals | Emerald |

## Quick Install

```bash
# 1. Clone the repository
git clone <repository-url>
cd rm-crm

# 2. Install all dependencies
npm run install:all

# 3. Setup environment
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

# 4. Setup database
cd backend
npm run db:generate
npm run db:push
npm run db:seed
cd ..

# 5. Start development servers
npm run dev
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Step-by-Step Setup

#### 1. Clone and install dependencies

```bash
cd rm-crm

# Option A: Install everything at once (from root)
npm run install:all

# Option B: Install separately
cd backend && npm install
cd ../frontend && npm install
```

#### 2. Configure environment

Create `backend/.env` file:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/remodel_sync"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Magic Link
MAGIC_LINK_SECRET="your-magic-link-secret-change-this"
MAGIC_LINK_EXPIRES_IN="15m"

# URLs
APP_URL="http://localhost:5173"
API_URL="http://localhost:3000"

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="ReModel Sync <noreply@remodelsync.com>"

# Square Payments (optional)
SQUARE_ACCESS_TOKEN=""
SQUARE_LOCATION_ID=""
SQUARE_ENVIRONMENT="sandbox"
```

#### 3. Setup database

```bash
cd backend

# Create PostgreSQL database
createdb remodel_sync

# Generate Prisma client
npm run db:generate

# Push schema to database (development)
npm run db:push

# Or run migrations (production)
npm run db:migrate

# Seed with sample data
npm run db:seed
```

#### 4. Run development servers

```bash
# From root directory - runs both servers
npm run dev

# Or run separately:
# Terminal 1 - Backend (port 3000)
cd backend && npm run dev

# Terminal 2 - Frontend (port 5173)
cd frontend && npm run dev
```

#### 5. Access the app

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/api/health
- **Prisma Studio**: Run `npm run db:studio` in backend

### Default Users (after seeding)

| Email | Role | Description |
|-------|------|-------------|
| admin@remodelsync.com | Admin | Full system access |
| designer@remodelsync.com | Designer | Lead & project management |

**Login**: Use Magic Link - in development, the link is logged to the console.

## Project Structure

```
rm-crm/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.ts          # Seed data
│   └── src/
│       ├── config/          # Database, email config
│       ├── middleware/      # Auth, error handling
│       ├── routes/          # API routes
│       ├── services/        # Business logic
│       └── index.ts         # Entry point
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── layout/      # Admin, Designer, Client layouts
│       │   └── ui/          # Reusable components
│       ├── features/
│       │   ├── auth/        # Login, verify pages
│       │   ├── dashboard/   # Role-specific dashboards
│       │   ├── leads/       # Lead management
│       │   ├── projects/    # Project management
│       │   ├── estimates/   # Estimate builder
│       │   └── ...
│       ├── lib/             # API client, utilities
│       └── store/           # Zustand stores
│
└── README.md
```

## Key Features

### Pricing Engine
- Pre-configured bathroom and kitchen pricing categories
- Contractor cost vs selling price
- Margin calculations (60%, 65%, 70% default options)
- Admin can add/edit pricing items
- Designers can add custom line items per estimate

### Payment Schedule
- 30% - Contract signing (before purchasing)
- 30% - Project start
- 30% - Midpoint
- 10% - Completion

### Client Portal
- Invite-only access via unique link
- View project status and documents
- Approve estimates with e-signature
- Make payments via Square

## API Endpoints

See backend routes for full API documentation:
- `/api/auth/*` - Authentication
- `/api/leads/*` - Lead management
- `/api/projects/*` - Project management
- `/api/estimates/*` - Estimates
- `/api/pricing/*` - Pricing configuration
- `/api/documents/*` - Document generation
- `/api/payments/*` - Payment processing

## Development Notes

- Run `npm run db:studio` in backend to open Prisma Studio
- Frontend proxies API requests to backend in development
- Tailwind CSS with custom color themes per role
