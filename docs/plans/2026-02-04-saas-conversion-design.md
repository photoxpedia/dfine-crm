# SaaS Conversion Design

**Date:** 2026-02-04
**Status:** Approved
**Scope:** Full SaaS readiness - tenant isolation, Stripe billing, AWS deployment

---

## 1. Architecture Overview

### Infrastructure

```
┌─────────────────────────────────────────────────────────────┐
│                         AWS                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    EC2 Instance                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │   Nginx     │  │  Backend    │  │ PostgreSQL  │  │   │
│  │  │  (reverse   │→ │  (Node.js)  │→ │  Database   │  │   │
│  │  │   proxy)    │  │  Port 3000  │  │  Port 5432  │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  │         │                                            │   │
│  │  ┌─────────────┐                                    │   │
│  │  │  Frontend   │  (Static files served by Nginx)    │   │
│  │  │  (React)    │                                    │   │
│  │  └─────────────┘                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                 │
│  ┌─────────────┐    ┌─────────────┐                        │
│  │     S3      │    │ CloudFront  │                        │
│  │  (uploads)  │ ←→ │   (CDN)     │                        │
│  └─────────────┘    └─────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### Docker Compose Services

- `nginx` - SSL termination, reverse proxy, static file serving
- `backend` - Node.js API (Express)
- `postgres` - Database with volume persistence

### External Services

- **Stripe** - Subscription billing, usage metering
- **SendGrid** - Transactional emails (magic links, notifications)
- **S3/CloudFront** - Document and file storage

---

## 2. Multi-Tenancy & Security

### Tenant Isolation Strategy

Every API request is scoped to the user's organization via 3 layers:

#### Layer 1: JWT Token Enhancement

Token payload includes:
- `userId`
- `email`
- `organizationId`
- `organizationRole`

When user has multiple orgs, token includes `activeOrganizationId`.

#### Layer 2: Tenant Middleware

Runs on every authenticated route:

```
Request → Authenticate → Extract Org → Inject org filter → Route Handler
```

- Extracts `organizationId` from JWT
- Validates user still belongs to org
- Attaches `req.organizationId` for all queries
- Rejects requests if org mismatch

#### Layer 3: Database Query Enforcement

- All queries for tenant data include `WHERE organizationId = ?`
- Prisma middleware as safety net - auto-injects org filter
- Prevents accidental cross-tenant data access

### Routes Requiring Org Filter

- `/api/leads/*`
- `/api/projects/*`
- `/api/estimates/*`
- `/api/pricing/*`
- `/api/vendors/*`
- `/api/crews/*`
- `/api/payments/*`
- `/api/documents/*`
- `/api/users/*` (scope to org members only)

### Security Hardening

- JWT secret from environment variable (not hardcoded)
- HTTP-only, secure, SameSite cookies
- Rate limiting per organization
- Audit logging for sensitive actions

---

## 3. Stripe Billing Integration

### Subscription Flow

```
Sign Up → Create Org → 14-day Trial → Choose Plan → Stripe Checkout → Active
```

### Implementation

#### Organization Creation
- Creates Stripe Customer automatically
- Starts 14-day trial (no card required)
- Default to Starter plan limits during trial

#### Stripe Webhook Events

Endpoint: `/api/webhooks/stripe`

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Activate subscription |
| `invoice.paid` | Update billing period |
| `invoice.payment_failed` | Mark `past_due`, notify admin |
| `customer.subscription.updated` | Sync plan changes |
| `customer.subscription.deleted` | Mark `canceled` |

#### Usage Tracking

- **Seats**: Count `OrganizationMember` where role is admin/designer
- **Projects**: Count projects where `status != 'completed'`
- Report to Stripe monthly via Usage Records API

#### Plan Enforcement Middleware

- Check limits before creating projects/inviting users
- Return `402 Payment Required` if over limit
- Grace period: 7 days after limit exceeded before blocking

### Pricing Structure

| Plan | Base Price | Seats Included | Projects Included | Seat Overage | Project Overage |
|------|-----------|----------------|-------------------|--------------|-----------------|
| Starter | $49/mo | 1 designer | 5 active | +$25/seat | +$10/project |
| Professional | $99/mo | 3 designers | 15 active | +$20/seat | +$8/project |
| Enterprise | $249/mo | 10 designers | Unlimited | +$15/seat | - |

All plans include: unlimited clients, estimates, payments, documents.

### Billing Portal

- Use Stripe Customer Portal for plan changes, payment methods, invoices
- Link from Admin → Settings → Billing

---

## 4. Deployment & CI/CD

### GitHub Actions Pipeline

```
Push to main → Build → Test → Build Docker Images → Push to ECR → Deploy to EC2
```

### Workflow Steps

1. **Build & Test** (on every push)
   - Install dependencies
   - Run TypeScript compilation
   - Run linting
   - Run tests

2. **Docker Build** (on push to `main`)
   - Build backend image
   - Build frontend (static files)
   - Push images to AWS ECR

3. **Deploy** (automatic after build)
   - SSH into EC2 via GitHub Secrets
   - Pull latest images from ECR
   - Run `docker-compose up -d`
   - Run database migrations
   - Health check verification

### EC2 Setup

- Ubuntu 22.04 LTS
- Docker + Docker Compose installed
- Nginx for SSL (Let's Encrypt/Certbot)
- Security group: 80, 443, 22 (restricted IP)

### Environment Management

- `.env.example` - template in repo (no secrets)
- Actual secrets in GitHub Secrets → injected at deploy
- Variables: Database credentials, JWT secret, Stripe keys, AWS keys

### Rollback Strategy

- Keep last 3 Docker image versions tagged
- Rollback = deploy previous tag
- Database migrations are forward-only (no destructive changes)

---

## 5. Files to Create

```
/
├── docker-compose.yml
├── docker-compose.prod.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── nginx/
│   └── nginx.conf
├── .github/
│   └── workflows/
│       └── deploy.yml
├── scripts/
│   ├── deploy.sh
│   └── setup-ec2.sh
└── .env.example (updated)
```

---

## 6. Files to Modify

```
backend/
├── src/
│   ├── middleware/
│   │   ├── auth.ts              # Add org to JWT, tenant middleware
│   │   └── planLimits.ts        # NEW: enforce plan limits
│   ├── routes/
│   │   ├── organizations.routes.ts  # NEW: org management
│   │   ├── billing.routes.ts        # NEW: Stripe integration
│   │   ├── webhooks.routes.ts       # NEW: Stripe webhooks
│   │   └── [all existing routes]    # Add org filtering
│   ├── services/
│   │   ├── billing.service.ts       # NEW: Stripe logic
│   │   ├── s3.service.ts            # NEW: file uploads
│   │   └── organization.service.ts  # NEW: org management
│   └── index.ts                 # Register new routes
├── prisma/
│   └── schema.prisma            # Add PlanFeatures, minor updates
└── .env.example                 # Add new env vars
```

---

## 7. Implementation Phases

### Phase 1: Security (Critical - Do First)

1. Fix hardcoded JWT secret
2. Add organizationId to JWT
3. Create tenant isolation middleware
4. Update all routes with org filtering
5. Add Prisma middleware safety net

### Phase 2: Billing

1. Stripe integration setup
2. Organization → Stripe Customer sync
3. Subscription management endpoints
4. Webhook handling
5. Usage tracking
6. Plan limit enforcement middleware

### Phase 3: Deployment

1. Docker configuration (Dockerfile, docker-compose)
2. GitHub repository setup
3. GitHub Actions CI/CD workflow
4. S3 file storage integration
5. EC2 instance setup
6. Nginx + SSL configuration
7. Production deployment

---

## 8. Environment Variables

### New Variables Required

```env
# JWT (move from hardcoded)
JWT_SECRET=<secure-random-string>

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AWS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=dfine-crm-uploads
AWS_CLOUDFRONT_URL=https://d123.cloudfront.net

# Database (production)
DATABASE_URL=postgresql://user:pass@localhost:5432/dfine_crm

# App URLs (production)
APP_URL=https://app.yourdomain.com
API_URL=https://api.yourdomain.com
```

---

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AWS Architecture | EC2 + Docker Compose | Simple, predictable cost, full control |
| Database | PostgreSQL on EC2 | Cost-effective for start, can migrate to RDS later |
| Billing Model | Usage-based combination | Flexible, captures value at scale |
| File Storage | S3 + CloudFront | Durable, scalable, standard practice |
| CI/CD | GitHub Actions | Integrated with repo, free tier sufficient |
