# D'Fine Kitchen & Bath Remodeling CRM
## Comprehensive System Documentation

---

**Version:** 1.0.0
**Last Updated:** January 2026
**Document Type:** Technical & Business Documentation

---

# Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Database Schema & Relationships](#4-database-schema--relationships)
5. [User Roles & Permissions](#5-user-roles--permissions)
6. [Core Workflows](#6-core-workflows)
7. [API Reference](#7-api-reference)
8. [Authentication System](#8-authentication-system)
9. [Business Logic & Calculations](#9-business-logic--calculations)
10. [Feature Modules](#10-feature-modules)
11. [Configuration & Environment](#11-configuration--environment)
12. [Deployment Guide](#12-deployment-guide)

---

# 1. System Overview

## 1.1 Purpose

D'Fine Kitchen & Bath Remodeling CRM is a specialized Customer Relationship Management system designed specifically for bathroom and kitchen remodeling businesses. It provides end-to-end project management from initial lead capture through project completion and final payment.

## 1.2 Key Business Objectives

- **Lead Management**: Track and nurture potential customers through the sales pipeline
- **Accurate Estimating**: Generate professional estimates with margin control
- **Project Transparency**: Provide clients with real-time project visibility
- **Financial Control**: Manage payments, purchasing, and labor costs
- **Document Management**: Handle contracts, approvals, and e-signatures

## 1.3 System Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                    D'Fine CRM System                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Admin     │  │  Designer   │  │   Client    │             │
│  │   Portal    │  │   Portal    │  │   Portal    │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                      │
│                   ┌──────▼──────┐                               │
│                   │   Backend   │                               │
│                   │     API     │                               │
│                   └──────┬──────┘                               │
│                          │                                      │
│         ┌────────────────┼────────────────┐                     │
│         │                │                │                     │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐             │
│  │  PostgreSQL │  │   Square    │  │    SMTP     │             │
│  │  Database   │  │  Payments   │  │    Email    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

# 2. Architecture

## 2.1 System Architecture

The system follows a **3-tier architecture**:

### Presentation Layer (Frontend)
- React 18 with TypeScript
- Role-based layouts (Admin, Designer, Client)
- Responsive design with Tailwind CSS
- State management with Zustand + React Query

### Application Layer (Backend)
- Node.js with Express.js
- TypeScript for type safety
- RESTful API design
- JWT-based authentication

### Data Layer
- PostgreSQL database
- Prisma ORM for data access
- Structured migrations and seeding

## 2.2 Directory Structure

```
rm-crm/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema (669 lines)
│   │   └── seed.ts                # Initial data seeding
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts        # Prisma client singleton
│   │   │   └── email.ts           # SMTP configuration
│   │   ├── middleware/
│   │   │   ├── auth.ts            # JWT authentication
│   │   │   └── errorHandler.ts    # Global error handling
│   │   ├── routes/                # API route handlers
│   │   │   ├── auth.routes.ts
│   │   │   ├── leads.routes.ts
│   │   │   ├── projects.routes.ts
│   │   │   ├── estimates.routes.ts
│   │   │   ├── pricing.routes.ts
│   │   │   ├── vendors.routes.ts
│   │   │   ├── crews.routes.ts
│   │   │   ├── purchasing.routes.ts
│   │   │   ├── documents.routes.ts
│   │   │   ├── payments.routes.ts
│   │   │   └── users.routes.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts    # Authentication logic
│   │   │   └── estimates.service.ts
│   │   └── index.ts               # Application entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/            # Role-specific layouts
│   │   │   ├── shared/            # Shared components
│   │   │   └── ui/                # UI primitives
│   │   ├── features/              # Feature modules
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── leads/
│   │   │   ├── projects/
│   │   │   ├── estimates/
│   │   │   ├── admin/
│   │   │   ├── documents/
│   │   │   ├── payments/
│   │   │   └── purchasing/
│   │   ├── lib/
│   │   │   ├── api.ts             # Axios client
│   │   │   └── utils.ts           # Utility functions
│   │   ├── store/
│   │   │   └── authStore.ts       # Authentication state
│   │   ├── types/                 # TypeScript definitions
│   │   ├── App.tsx                # Main routing
│   │   └── main.tsx               # React entry point
│   └── package.json
│
├── package.json                    # Root monorepo config
└── README.md
```

---

# 3. Technology Stack

## 3.1 Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | JavaScript runtime |
| Express.js | 4.18 | Web framework |
| TypeScript | 5.3 | Type safety |
| Prisma | 5.7 | ORM & database toolkit |
| PostgreSQL | 14+ | Relational database |
| JWT | 9.0 | Authentication tokens |
| bcrypt | 6.0 | Password hashing |
| Nodemailer | 6.9 | Email sending |
| Square SDK | 35.0 | Payment processing |
| Zod | 3.22 | Schema validation |

## 3.2 Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18 | UI library |
| TypeScript | 5.3 | Type safety |
| Vite | 5 | Build tool |
| React Router | 6 | Client-side routing |
| Zustand | - | State management |
| React Query | - | Server state management |
| Tailwind CSS | 3 | Styling |
| React Hook Form | - | Form handling |
| Axios | - | HTTP client |
| Recharts | - | Data visualization |
| signature_pad | - | E-signature capture |

---

# 4. Database Schema & Relationships

## 4.1 Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │       │    Lead     │       │   Project   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id          │◄──────│ designerId  │       │ id          │
│ email       │       │ firstName   │──────►│ leadId      │
│ name        │       │ lastName    │       │ designerId  │◄──┐
│ role        │       │ status      │       │ clientId    │◄──┤
│ passwordHash│       │ projectType │       │ status      │   │
└──────┬──────┘       └─────────────┘       └──────┬──────┘   │
       │                                           │          │
       │              ┌─────────────┐              │          │
       │              │  Estimate   │◄─────────────┘          │
       │              ├─────────────┤                         │
       │              │ projectId   │                         │
       │              │ version     │                         │
       │              │ status      │                         │
       │              │ margin%     │                         │
       │              └──────┬──────┘                         │
       │                     │                                │
       │              ┌──────▼──────┐                         │
       │              │  Estimate   │                         │
       │              │  Section    │                         │
       │              ├─────────────┤                         │
       │              │ estimateId  │                         │
       │              │ categoryId  │◄───┐                    │
       │              └──────┬──────┘    │                    │
       │                     │           │                    │
       │              ┌──────▼──────┐    │    ┌─────────────┐ │
       │              │  Estimate   │    │    │  Pricing    │ │
       │              │  LineItem   │    └────│  Category   │ │
       │              ├─────────────┤         ├─────────────┤ │
       │              │ sectionId   │         │ projectType │ │
       │              │ pricingItemId│◄───────│ name        │ │
       │              │ quantity    │    ┌────│             │ │
       │              └─────────────┘    │    └─────────────┘ │
       │                                 │                    │
       │              ┌─────────────┐    │                    │
       │              │  Pricing    │◄───┘                    │
       │              │    Item     │                         │
       │              ├─────────────┤                         │
       │              │ categoryId  │                         │
       │              │ contractor$ │                         │
       │              │ selling$    │                         │
       │              └─────────────┘                         │
       │                                                      │
       │              ┌─────────────┐       ┌─────────────┐   │
       │              │  Document   │       │  Payment    │   │
       │              ├─────────────┤       ├─────────────┤   │
       └──────────────│ createdById │       │ projectId   │───┘
                      │ projectId   │       │ squareId    │
                      │ status      │       │ amount      │
                      └──────┬──────┘       └─────────────┘
                             │
                      ┌──────▼──────┐
                      │  Signature  │
                      ├─────────────┤
                      │ documentId  │
                      │ userId      │
                      │ signedAt    │
                      └─────────────┘
```

## 4.2 Core Entities

### 4.2.1 User
Central authentication entity managing all system users.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| email | String | Unique login identifier |
| name | String | Display name |
| role | Enum | admin, designer, client |
| passwordHash | String? | Optional password (clients may not have) |
| isActive | Boolean | Account status |

**Relationships:**
- One-to-Many: Leads (as designer)
- One-to-Many: Projects (as designer, client, or PM)
- One-to-Many: Documents (as creator)
- One-to-Many: Signatures
- One-to-Many: MagicLinks
- One-to-Many: Notifications

### 4.2.2 Lead
Represents a potential customer before project conversion.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| designerId | UUID | Assigned designer |
| firstName, lastName | String | Contact name |
| email, phone | String? | Contact info |
| address, city, state, zip | String? | Location |
| source | String? | Lead source (referral, website, etc.) |
| status | Enum | new, contacted, qualified, proposal, won, lost |
| projectType | Enum | bathroom, kitchen, general |

**Relationships:**
- Many-to-One: User (designer)
- One-to-Many: Projects

### 4.2.3 Project
Core entity representing a remodeling project.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| leadId | UUID? | Source lead |
| designerId | UUID | Assigned designer |
| clientId | UUID? | Associated client |
| name | String | Project name |
| status | Enum | draft, pending_approval, approved, in_progress, on_hold, completed, cancelled |
| projectType | Enum | bathroom, kitchen, general |
| startDate, endDate | DateTime? | Project timeline |
| expectedLaborCost | Decimal? | Budget estimate |
| actualLaborCost | Decimal? | Actual spend |

**Relationships:**
- Many-to-One: Lead, User (designer, client, PM)
- One-to-Many: Estimates, Documents, MaterialItems, PurchaseOrders
- One-to-Many: CrewAssignments, LaborLogs, PaymentSchedules, Payments

### 4.2.4 Estimate
Cost proposal with version control.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| projectId | UUID | Parent project |
| version | Int | Version number (1, 2, 3...) |
| status | Enum | draft, sent, viewed, approved, rejected, expired |
| marginPercentage | Decimal | Target margin (default 40%) |
| subtotalContractor | Decimal | Total contractor cost |
| subtotalSelling | Decimal | Total selling price |
| total | Decimal | Final amount |

**Relationships:**
- Many-to-One: Project
- One-to-Many: EstimateSections, Documents

### 4.2.5 EstimateSection
Groups line items by category.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| estimateId | UUID | Parent estimate |
| categoryId | UUID? | Pricing category reference |
| name | String | Section name |
| sortOrder | Int | Display order |
| subtotalContractor | Decimal | Section contractor total |
| subtotalSelling | Decimal | Section selling total |

**Relationships:**
- Many-to-One: Estimate, PricingCategory
- One-to-Many: EstimateLineItems

### 4.2.6 EstimateLineItem
Individual billable items.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| sectionId | UUID | Parent section |
| pricingItemId | UUID? | Reference to standard pricing |
| name | String | Item description |
| unitOfMeasure | Enum | EA, LF, SF, SQ, PC |
| quantity | Decimal | Amount |
| contractorCost | Decimal | Unit contractor cost |
| sellingPrice | Decimal | Unit selling price |
| totalContractor | Decimal | quantity × contractorCost |
| totalSelling | Decimal | quantity × sellingPrice |
| isCustom | Boolean | Custom vs. standard item |

### 4.2.7 PricingCategory & PricingItem
Pre-configured pricing library.

**PricingCategory:**
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | String | Category name |
| projectType | Enum | bathroom, kitchen, general |
| sortOrder | Int | Display order |
| isActive | Boolean | Availability status |

**PricingItem:**
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| categoryId | UUID | Parent category |
| name | String | Item name |
| unitOfMeasure | Enum | EA, LF, SF, SQ, PC |
| contractorCost | Decimal | Your cost |
| sellingPrice | Decimal | Client price |
| isActive | Boolean | Availability status |

### 4.2.8 Document & Signature
Document management with e-signatures.

**Document:**
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| projectId | UUID | Parent project |
| estimateId | UUID? | Associated estimate |
| createdById | UUID | Creator user |
| type | Enum | estimate, material_list, scope_of_work, contract, change_order |
| status | Enum | draft, pending_signature, signed, expired |
| content | JSON? | Document data |

**Signature:**
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| documentId | UUID | Parent document |
| userId | UUID | Signer |
| signatureData | String | Base64 signature image |
| ipAddress | String? | Client IP |
| userAgent | String? | Browser info |
| signedAt | DateTime | Timestamp |

### 4.2.9 Vendor & MaterialItem
Material and supplier tracking.

**Vendor:**
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | String | Company name |
| contactName | String? | Contact person |
| email, phone | String? | Contact info |
| address, city, state, zip | String? | Location |
| website | String? | Vendor URL |

**MaterialItem:**
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| projectId | UUID | Parent project |
| estimateLineItemId | UUID? | Source line item |
| vendorId | UUID? | Supplier |
| name | String | Item description |
| quantity | Decimal | Amount needed |
| estimatedCost | Decimal? | Expected cost |
| actualCost | Decimal? | Actual cost |
| purchaseStatus | Enum | pending, ordered, shipped, delivered, installed, cancelled |

### 4.2.10 PurchaseOrder & PurchaseOrderItem
Procurement tracking.

**PurchaseOrder:**
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| poNumber | String | Unique PO number |
| projectId | UUID | Parent project |
| vendorId | UUID | Supplier |
| createdById | UUID | Creator |
| status | Enum | draft, sent, confirmed, partial, received, cancelled |
| subtotal, tax, shipping, total | Decimal | Amounts |

**PurchaseOrderItem:**
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| purchaseOrderId | UUID | Parent PO |
| materialItemId | UUID | Material reference |
| quantityOrdered | Decimal | Amount ordered |
| quantityReceived | Decimal | Amount received |
| unitCost, totalCost | Decimal | Costs |
| expectedDeliveryDate | DateTime? | ETA |
| actualDeliveryDate | DateTime? | Actual delivery |

### 4.2.11 Crew & LaborLog
Labor management.

**Crew:**
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | String | Crew/team name |
| leadMemberName | String? | Crew leader |
| phone, email | String? | Contact info |
| specialty | String? | Trade specialty |
| hourlyRate | Decimal? | Rate per hour |
| dailyRate | Decimal? | Rate per day |

**CrewAssignment:**
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| projectId | UUID | Assigned project |
| crewId | UUID | Assigned crew |
| role | String? | Assignment role |
| startDate, endDate | DateTime? | Assignment period |

**LaborLog:**
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| projectId | UUID | Work project |
| crewId | UUID | Working crew |
| date | DateTime | Work date |
| hoursWorked | Decimal | Hours logged |
| description | String? | Work description |
| cost | Decimal | Labor cost |

### 4.2.12 PaymentSchedule & Payment
Financial tracking with Square integration.

**PaymentSchedule:**
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| projectId | UUID | Parent project |
| milestone | Enum | contract_signing (30%), project_start (30%), midpoint (30%), completion (10%) |
| percentage | Decimal | Milestone percentage |
| amountDue | Decimal | Amount due |
| dueDate | DateTime? | Due date |
| status | Enum | pending, invoiced, processing, completed, failed, refunded, overdue |

**Payment:**
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| scheduleId | UUID? | Payment schedule reference |
| projectId | UUID | Parent project |
| amount | Decimal | Payment amount |
| paymentMethod | String? | Payment type |
| squarePaymentId | String? | Square transaction ID |
| squareOrderId | String? | Square order ID |
| status | Enum | Payment status |
| receiptUrl | String? | Receipt link |
| paidAt | DateTime? | Payment timestamp |

---

# 5. User Roles & Permissions

## 5.1 Role Definitions

### Admin
Full system access with configuration capabilities.

**Permissions:**
- User management (create, edit, deactivate)
- Pricing configuration (categories, items)
- Vendor management
- Crew management
- View all projects and estimates
- System settings
- All purchasing operations

**UI Theme:** Blue

### Designer
Sales and project execution role.

**Permissions:**
- Lead management (create, edit, convert)
- Project management (create, edit, status)
- Estimate creation and management
- Document generation
- Client invitations
- View assigned projects only
- Create purchase orders

**UI Theme:** Violet

### Client
Limited portal access for project visibility.

**Permissions:**
- View assigned project
- View and approve/sign documents
- View payment schedule
- Make payments via Square
- View project timeline

**UI Theme:** Emerald

## 5.2 Permission Matrix

| Feature | Admin | Designer | Client |
|---------|:-----:|:--------:|:------:|
| View Dashboard | Own | Own | Project |
| Manage Users | Full | - | - |
| Manage Leads | All | Own | - |
| Manage Projects | All | Own | View |
| Create Estimates | All | Own | - |
| Approve Estimates | - | - | Own |
| Sign Documents | - | - | Own |
| Configure Pricing | Full | - | - |
| Manage Vendors | Full | - | - |
| Manage Crews | Full | - | - |
| Create POs | Full | Own | - |
| View Payments | All | Own | Own |
| Make Payments | - | - | Own |
| System Settings | Full | - | - |

---

# 6. Core Workflows

## 6.1 Lead-to-Project Conversion

```
┌─────────┐    ┌───────────┐    ┌───────────┐    ┌──────────┐    ┌─────────┐
│   NEW   │───►│ CONTACTED │───►│ QUALIFIED │───►│ PROPOSAL │───►│   WON   │
└─────────┘    └───────────┘    └───────────┘    └──────────┘    └────┬────┘
                                                       │              │
                                                       ▼              ▼
                                                  ┌─────────┐    ┌─────────┐
                                                  │  LOST   │    │ PROJECT │
                                                  └─────────┘    │ CREATED │
                                                                 └─────────┘
```

**Process:**
1. Lead enters system (web form, manual entry)
2. Designer contacts lead → status: CONTACTED
3. Designer qualifies lead → status: QUALIFIED
4. Designer creates estimate → status: PROPOSAL
5. If estimate approved → status: WON → Create Project
6. If rejected → status: LOST

## 6.2 Estimate Workflow

```
┌─────────┐    ┌─────────┐    ┌─────────┐
│  DRAFT  │───►│   SENT  │───►│ VIEWED  │
└─────────┘    └─────────┘    └─────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              ┌──────────┐  ┌──────────┐  ┌──────────┐
              │ APPROVED │  │ REJECTED │  │ EXPIRED  │
              └──────────┘  └──────────┘  └──────────┘
```

**Process:**
1. Designer creates estimate (DRAFT)
2. Designer sends to client (SENT)
3. Client views estimate (VIEWED)
4. Client approves with signature (APPROVED) OR
5. Client rejects with feedback (REJECTED) OR
6. Estimate validity expires (EXPIRED)

## 6.3 Project Lifecycle

```
┌─────────┐    ┌─────────────────┐    ┌──────────┐
│  DRAFT  │───►│ PENDING_APPROVAL│───►│ APPROVED │
└─────────┘    └─────────────────┘    └────┬─────┘
                                           │
                                           ▼
                                     ┌──────────────┐
                              ┌──────│ IN_PROGRESS  │──────┐
                              │      └──────────────┘      │
                              ▼                            ▼
                        ┌──────────┐              ┌───────────┐
                        │ ON_HOLD  │              │ COMPLETED │
                        └──────────┘              └───────────┘
                              │
                              ▼
                        ┌───────────┐
                        │ CANCELLED │
                        └───────────┘
```

**Project Statuses:**
- **DRAFT**: Initial creation, incomplete
- **PENDING_APPROVAL**: Awaiting client approval
- **APPROVED**: Client approved, ready to start
- **IN_PROGRESS**: Active work
- **ON_HOLD**: Temporarily paused
- **COMPLETED**: Successfully finished
- **CANCELLED**: Terminated

## 6.4 Payment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Payment Schedule                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   CONTRACT_SIGNING ──► PROJECT_START ──► MIDPOINT ──► COMPLETION
│        30%                 30%            30%          10%   │
│                                                              │
└─────────────────────────────────────────────────────────────┘

For each milestone:
┌─────────┐    ┌──────────┐    ┌────────────┐    ┌───────────┐
│ PENDING │───►│ INVOICED │───►│ PROCESSING │───►│ COMPLETED │
└─────────┘    └──────────┘    └────────────┘    └───────────┘
                                      │
                                      ▼
                               ┌──────────┐
                               │  FAILED  │
                               └──────────┘
```

**Process:**
1. Payment schedule created when estimate approved
2. Invoice sent to client (INVOICED)
3. Client initiates payment (PROCESSING)
4. Square processes payment (COMPLETED/FAILED)
5. If failed, retry or mark overdue (OVERDUE)

## 6.5 Purchasing Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│            Material Item → Purchase Order Flow                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │  Material   │───►│  Purchase   │───►│  Receive &  │          │
│  │   Items     │    │   Order     │    │   Install   │          │
│  └─────────────┘    └─────────────┘    └─────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Material Item Status:
PENDING → ORDERED → SHIPPED → DELIVERED → INSTALLED

Purchase Order Status:
DRAFT → SENT → CONFIRMED → PARTIAL → RECEIVED
```

---

# 7. API Reference

## 7.1 Base URL & Format

**Base URL:** `http://localhost:3000/api`

**Request Format:**
- Content-Type: `application/json`
- Authorization: `Bearer {jwt_token}`

**Response Format:**
```json
{
  "data": { ... },     // Success response
  "error": "message"   // Error response
}
```

## 7.2 Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/magic-link` | Request magic link email |
| GET | `/auth/verify?token={token}` | Verify magic link |
| POST | `/auth/login` | Password login |
| POST | `/auth/client-invite` | Create client invitation |
| GET | `/auth/client-invite/verify?token={token}` | Accept client invitation |
| POST | `/auth/set-password` | Set user password |
| POST | `/auth/change-password` | Change password |
| GET | `/auth/me` | Get current user |
| POST | `/auth/logout` | Logout |

## 7.3 Lead Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/leads` | List leads (paginated) |
| POST | `/leads` | Create lead |
| GET | `/leads/:id` | Get lead details |
| PUT | `/leads/:id` | Update lead |
| PATCH | `/leads/:id/status` | Update lead status |
| POST | `/leads/:id/convert` | Convert lead to project |
| DELETE | `/leads/:id` | Delete lead |

## 7.4 Project Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List projects |
| POST | `/projects` | Create project |
| GET | `/projects/:id` | Get project details |
| PUT | `/projects/:id` | Update project |
| PATCH | `/projects/:id/status` | Update project status |
| GET | `/projects/:id/timeline` | Get project timeline |
| DELETE | `/projects/:id` | Delete project |

## 7.5 Estimate Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/estimates/project/:projectId` | List project estimates |
| GET | `/estimates/:id` | Get full estimate |
| POST | `/estimates/project/:projectId` | Create estimate |
| DELETE | `/estimates/:id` | Delete estimate |
| POST | `/estimates/:id/sections` | Add section |
| PUT | `/estimates/:id/sections/:sectionId` | Update section |
| DELETE | `/estimates/:id/sections/:sectionId` | Delete section |
| POST | `/estimates/:id/items` | Add line item |
| PUT | `/estimates/:id/items/:itemId` | Update line item |
| DELETE | `/estimates/:id/items/:itemId` | Delete line item |
| POST | `/estimates/:id/calculate` | Recalculate totals |
| POST | `/estimates/:id/apply-margin` | Apply margin percentage |
| PATCH | `/estimates/:id/status` | Update status |
| POST | `/estimates/:id/duplicate` | Duplicate estimate |

## 7.6 Pricing Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/pricing/categories` | List categories |
| GET | `/pricing/categories/:id` | Get category with items |
| POST | `/pricing/categories` | Create category |
| PUT | `/pricing/categories/:id` | Update category |
| DELETE | `/pricing/categories/:id` | Delete category |
| GET | `/pricing/items` | List all items |
| GET | `/pricing/items/:id` | Get item |
| POST | `/pricing/items` | Create item |
| PUT | `/pricing/items/:id` | Update item |
| DELETE | `/pricing/items/:id` | Delete item |

## 7.7 Vendor Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/vendors` | List vendors |
| POST | `/vendors` | Create vendor |
| GET | `/vendors/:id` | Get vendor |
| PUT | `/vendors/:id` | Update vendor |
| DELETE | `/vendors/:id` | Delete vendor |

## 7.8 Purchasing Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/purchasing` | List purchase orders |
| POST | `/purchasing` | Create PO |
| GET | `/purchasing/:id` | Get PO details |
| PUT | `/purchasing/:id` | Update PO |
| PATCH | `/purchasing/:id/status` | Update PO status |
| POST | `/purchasing/:id/items` | Add PO item |
| PUT | `/purchasing/:id/items/:itemId` | Update PO item |
| DELETE | `/purchasing/:id/items/:itemId` | Remove PO item |

## 7.9 Crew Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/crews` | List crews |
| POST | `/crews` | Create crew |
| GET | `/crews/:id` | Get crew details |
| PUT | `/crews/:id` | Update crew |
| DELETE | `/crews/:id` | Delete crew |
| POST | `/projects/:projectId/crew-assignment` | Assign crew |

## 7.10 Document Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/documents/project/:projectId` | List project documents |
| POST | `/documents` | Create document |
| GET | `/documents/:id` | Get document |
| DELETE | `/documents/:id` | Delete document |

## 7.11 Payment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/payments/project/:projectId` | List project payments |
| POST | `/payments/schedules` | Create payment schedule |
| GET | `/payments/:id` | Get payment details |
| POST | `/payments` | Process payment (Square) |

## 7.12 User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List users |
| POST | `/users` | Create user |
| GET | `/users/:id` | Get user |
| PUT | `/users/:id` | Update user |
| DELETE | `/users/:id` | Delete user |

---

# 8. Authentication System

## 8.1 Magic Link Authentication

**Flow:**
```
1. User enters email
2. System generates UUID token
3. Token stored in database with 15-min expiry
4. Email sent with magic link
5. User clicks link
6. System validates token
7. JWT generated and returned
8. Token marked as used
```

**Security Features:**
- Single-use tokens
- 15-minute expiration
- Token invalidation on use
- No password required

## 8.2 Password Authentication

**Flow:**
```
1. User enters email + password
2. System retrieves user by email
3. bcrypt compares password hash
4. If valid, JWT generated
5. Token returned to client
```

**Security Features:**
- bcrypt hashing (10 salt rounds)
- Minimum 8 character passwords
- Hash-only storage (no plain text)

## 8.3 Client Invitation

**Flow:**
```
1. Designer creates invite for project
2. System generates invite token (7-day expiry)
3. Email sent to client with invite link
4. Client clicks link
5. System validates token
6. Client account created if needed
7. Client linked to project
8. JWT generated for client access
```

## 8.4 JWT Structure

**Token Payload:**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "name": "User Name",
  "role": "admin|designer|client",
  "iat": 1234567890,
  "exp": 1235172690
}
```

**Token Settings:**
- Algorithm: HS256
- Expiry: 7 days (configurable)
- Storage: HTTP-only cookie + localStorage

---

# 9. Business Logic & Calculations

## 9.1 Margin Calculation

The system uses a **selling price based margin** calculation:

**Formula:**
```
Selling Price = Contractor Cost / (1 - Margin%)

Example:
- Contractor Cost: $100
- Desired Margin: 40%
- Selling Price = $100 / (1 - 0.40) = $100 / 0.60 = $166.67

Verification:
- Gross Profit = $166.67 - $100 = $66.67
- Margin % = $66.67 / $166.67 = 40% ✓
```

## 9.2 Default Margin Presets

| Preset | Margin % | Multiplier |
|--------|----------|------------|
| Standard | 40% | 1.667x |
| Premium | 65% | 2.857x |
| High-End | 70% | 3.333x |

## 9.3 Estimate Calculations

**Line Item Totals:**
```
totalContractor = quantity × contractorCost
totalSelling = quantity × sellingPrice
```

**Section Totals:**
```
subtotalContractor = Σ(lineItem.totalContractor)
subtotalSelling = Σ(lineItem.totalSelling)
```

**Estimate Totals:**
```
subtotalContractor = Σ(section.subtotalContractor)
subtotalSelling = Σ(section.subtotalSelling)
total = subtotalSelling
```

## 9.4 Payment Schedule Calculation

**Default Schedule:**
```
Total Project Value = Estimate Total

Milestone Amounts:
- Contract Signing: 30% × Total
- Project Start: 30% × Total
- Midpoint: 30% × Total
- Completion: 10% × Total
```

**Example for $50,000 project:**
```
- Contract Signing: $15,000
- Project Start: $15,000
- Midpoint: $15,000
- Completion: $5,000
```

## 9.5 Labor Cost Tracking

**Expected Labor Cost:** Set from estimate labor line items

**Actual Labor Cost:** Calculated from labor logs
```
actualLaborCost = Σ(laborLog.cost)
laborLog.cost = hoursWorked × crew.hourlyRate
```

**Variance:**
```
laborVariance = actualLaborCost - expectedLaborCost
```

---

# 10. Feature Modules

## 10.1 Dashboard

**Admin Dashboard:**
- Total leads, projects, estimates
- Revenue metrics
- Recent activity
- Quick actions

**Designer Dashboard:**
- Assigned leads count
- Active projects
- Pending estimates
- Upcoming deadlines

**Client Dashboard:**
- Project status
- Document actions needed
- Payment status
- Timeline view

## 10.2 Lead Management

**Features:**
- Lead creation with contact info
- Status pipeline tracking
- Project type assignment
- Designer assignment
- Source tracking (referral, website, etc.)
- Notes and follow-up
- Lead-to-project conversion

## 10.3 Project Management

**Features:**
- Full project details
- Status tracking
- Timeline with dates
- Client assignment
- Document association
- Payment schedule
- Labor tracking
- Material tracking

## 10.4 Estimate Builder

**Features:**
- Hierarchical structure (Estimate → Sections → Items)
- Pre-built pricing library
- Custom line items
- Quantity-based calculations
- Automatic margin application
- Version control
- Duplicate estimates
- Status workflow

## 10.5 Pricing Configuration

**Features:**
- Category management by project type
- Item management with costs
- Unit of measure settings
- Active/inactive toggles
- Sort order control

## 10.6 Vendor Management

**Features:**
- Vendor profiles
- Contact information
- Address tracking
- Website links
- Notes

## 10.7 Crew Management

**Features:**
- Crew profiles
- Rate management (hourly/daily)
- Specialty tracking
- Project assignments
- Labor logging

## 10.8 Purchasing

**Features:**
- Material tracking
- Purchase order creation
- PO status tracking
- Delivery tracking
- Cost tracking (estimated vs. actual)

## 10.9 Document Management

**Features:**
- Document types (estimate, contract, etc.)
- Status tracking
- E-signature capture
- IP and user agent logging
- Version control

## 10.10 Payment Processing

**Features:**
- Payment schedule creation
- Square integration
- Multiple payment methods
- Receipt generation
- Status tracking

## 10.11 Client Portal

**Features:**
- Project overview
- Document viewing
- E-signature
- Payment portal
- Timeline visibility

---

# 11. Configuration & Environment

## 11.1 Environment Variables

**Database:**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dfine_crm"
```

**Authentication:**
```env
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
MAGIC_LINK_EXPIRES_IN="15m"
```

**Application:**
```env
APP_URL="http://localhost:5173"
API_URL="http://localhost:3000"
NODE_ENV="development"
PORT=3000
```

**Email (SendGrid):**
```env
SENDGRID_API_KEY="your-sendgrid-api-key"
EMAIL_FROM="noreply@dfinekb.com"
EMAIL_FROM_NAME="D'Fine Kitchen & Bath Remodeling"
```

**Payments (Square):**
```env
SQUARE_ACCESS_TOKEN="your-square-access-token"
SQUARE_ENVIRONMENT="sandbox"  # or "production"
SQUARE_LOCATION_ID="your-location-id"
SQUARE_WEBHOOK_SIGNATURE_KEY="your-webhook-key"
```

## 11.2 Vite Configuration

**API Proxy:**
```typescript
// frontend/vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

## 11.3 Tailwind Configuration

**Custom Colors:**
```javascript
// frontend/tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        admin: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        designer: {
          50: '#f5f3ff',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
        client: {
          50: '#ecfdf5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
      },
    },
  },
};
```

---

# 12. Deployment Guide

## 12.1 Development Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd rm-crm

# 2. Install dependencies
npm run install:all

# 3. Configure environment
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

## 12.2 Production Build

```bash
# Build both frontend and backend
npm run build

# Start production server
npm start
```

## 12.3 Database Management

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (dev)
npm run db:push

# Run migrations (production)
npm run db:migrate

# Seed with sample data
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

## 12.4 Default Test Users

| Email | Password | Role |
|-------|----------|------|
| admin@dfinekb.com | password123 | Admin |
| designer@dfinekb.com | password123 | Designer |

---

# Appendix A: Pre-loaded Pricing Categories

## Bathroom Pricing (10 Categories, 100+ Items)

1. **Basic Bathroom Labor**
   - Powder Room Labor (Small/Large)
   - 5×8 Bathroom with Tub
   - Master Bath Shower Only
   - Large Master Bathroom

2. **Carpentry / General Construction**
   - Drywall replacement
   - Wall demolition
   - Subfloor repair
   - Door installation
   - Framing work

3. **HVAC**
   - Duct work
   - Vent relocation

4. **Additional Plumbing Work**
   - Fixture relocation
   - New rough-in
   - Fixture installation

5. **Electrical Work**
   - Light installation
   - Outlet relocation
   - Heated floors

6. **Cabinets**
   - Vanity cabinets
   - Cabinet hardware

7. **Tiles**
   - Floor tiles
   - Shower tiles
   - Deco tiles
   - Bullnose/trim

8. **Fixtures**
   - Tubs (standard, soaking, whirlpool)
   - Toilets
   - Faucets
   - Shower heads
   - Exhaust fans
   - Lighting

9. **Counter Top**
   - Granite vanity program
   - Quartz options
   - Edge details

10. **Misc Items**
    - Shower doors
    - Custom doors
    - Windows
    - Permits

---

# Appendix B: API Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| AUTH001 | 401 | Invalid or expired token |
| AUTH002 | 401 | User not found or inactive |
| AUTH003 | 403 | Insufficient permissions |
| AUTH004 | 400 | Invalid magic link |
| AUTH005 | 400 | Magic link expired |
| LEAD001 | 404 | Lead not found |
| PROJ001 | 404 | Project not found |
| EST001 | 404 | Estimate not found |
| PAY001 | 400 | Payment processing failed |
| VAL001 | 400 | Validation error |

---

# Appendix C: Glossary

| Term | Definition |
|------|------------|
| **Contractor Cost** | The actual cost to the business for materials/labor |
| **Selling Price** | The price charged to the customer |
| **Margin** | The percentage of profit relative to selling price |
| **Magic Link** | Passwordless login via email link |
| **PO** | Purchase Order |
| **Lead** | A potential customer not yet converted to a project |
| **Project** | An active or completed remodeling job |
| **Estimate** | A formal cost proposal for a project |
| **Designer** | Sales/project manager role |

---

**Document End**

*D'Fine Kitchen & Bath Remodeling CRM - Version 1.0.0*
