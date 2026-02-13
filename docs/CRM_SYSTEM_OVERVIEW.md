# D'Fine Kitchen & Bath CRM - Complete System Documentation

## Table of Contents
1. [System Architecture](#system-architecture)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Lead Management System](#lead-management-system)
4. [Project Management System](#project-management-system)
5. [Complete Business Workflow](#complete-business-workflow)
6. [Data Models & Relationships](#data-models--relationships)
7. [API Reference](#api-reference)
8. [Frontend Structure](#frontend-structure)

---

## System Architecture

### Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│  React 18 + TypeScript + Vite                                   │
│  ├─ React Router (routing)                                      │
│  ├─ React Query (server state)                                  │
│  ├─ Zustand (auth state)                                        │
│  ├─ React Hook Form + Zod (forms/validation)                    │
│  ├─ Tailwind CSS (styling)                                      │
│  └─ React-PDF (PDF generation)                                  │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ HTTP/REST
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND                                   │
│  Node.js + Express + TypeScript                                 │
│  ├─ Prisma ORM (database)                                       │
│  ├─ JWT (authentication)                                        │
│  ├─ Zod (validation)                                            │
│  └─ Nodemailer (email)                                          │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE                                   │
│  PostgreSQL                                                      │
│  └─ Managed via Prisma migrations                               │
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
rm-crm/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Database models
│   └── src/
│       ├── routes/                # API endpoints
│       ├── services/              # Business logic
│       ├── middleware/            # Auth, validation
│       └── index.ts               # Express app
│
├── frontend/
│   └── src/
│       ├── components/            # Shared components
│       │   ├── layout/            # App layouts
│       │   └── pdf/               # PDF templates
│       ├── features/              # Feature modules
│       │   ├── auth/              # Login, verification
│       │   ├── leads/             # Lead management
│       │   ├── projects/          # Project management
│       │   ├── estimates/         # Estimate builder
│       │   ├── admin/             # Admin pages
│       │   └── dashboard/         # Dashboards
│       ├── lib/                   # Utilities, API client
│       ├── store/                 # Zustand stores
│       └── types/                 # TypeScript types
│
└── docs/                          # Documentation
```

---

## User Roles & Permissions

### Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                          ADMIN                                   │
│  Full system access - all data, all operations                  │
│  ├─ Manage users                                                │
│  ├─ Configure pricing catalog                                   │
│  ├─ View all leads, projects, estimates                         │
│  ├─ Access all reports and analytics                            │
│  └─ System settings                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DESIGNER                                 │
│  Sales & project management for assigned work                   │
│  ├─ Create and manage own leads                                 │
│  ├─ Convert leads to projects                                   │
│  ├─ Build and send estimates                                    │
│  ├─ Manage project lifecycle                                    │
│  ├─ Create invoices, record payments                            │
│  └─ Cannot see other designers' data                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT                                  │
│  View-only access to their projects                             │
│  ├─ View assigned projects                                      │
│  ├─ Approve/reject estimates (via link or portal)               │
│  ├─ View payment schedule                                       │
│  ├─ Download invoices                                           │
│  └─ Cannot modify any data                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Access Control Matrix

| Resource | Admin | Designer | Client |
|----------|-------|----------|--------|
| All Leads | Read/Write | Own Only | None |
| All Projects | Read/Write | Own Only | Assigned Only (Read) |
| Estimates | Read/Write | Own Projects | View & Approve |
| Pricing Catalog | Read/Write | Read Only | None |
| Users | Read/Write | None | None |
| Invoices | Read/Write | Own Projects | Own Projects (Read) |
| Payments | Read/Write | Own Projects | Own Projects (Read) |
| Vendors/Crews | Read/Write | Read Only | None |

---

## Lead Management System

### What is a Lead?

A **Lead** represents a potential customer who has expressed interest in remodeling services. Leads are the starting point of the sales pipeline before they become active projects.

### Lead Data Model

```typescript
interface Lead {
  id: string;              // UUID
  designerId: string;      // Assigned sales designer

  // Contact Information
  firstName: string;       // Required
  lastName: string;        // Required
  email?: string;
  phone?: string;

  // Location
  address?: string;
  city?: string;
  state?: string;
  zip?: string;

  // Lead Details
  source?: string;         // How they found us (referral, web, etc.)
  projectType: ProjectType; // bathroom | kitchen | general
  status: LeadStatus;      // Pipeline stage
  notes?: string;          // Internal notes

  // Timestamps
  createdAt: string;
  updatedAt: string;
}
```

### Lead Status Pipeline

```
┌─────────┐    ┌───────────┐    ┌───────────┐    ┌──────────┐    ┌─────┐
│   NEW   │───▶│ CONTACTED │───▶│ QUALIFIED │───▶│ PROPOSAL │───▶│ WON │
└─────────┘    └───────────┘    └───────────┘    └──────────┘    └─────┘
     │              │                │                │              │
     │              │                │                │              │
     └──────────────┴────────────────┴────────────────┘              │
                              │                                      │
                              ▼                                      ▼
                         ┌────────┐                          ┌────────────┐
                         │  LOST  │                          │  PROJECT   │
                         └────────┘                          │  CREATED   │
                                                             └────────────┘
```

| Status | Description | Next Actions |
|--------|-------------|--------------|
| **NEW** | Fresh lead, not yet contacted | Make initial contact |
| **CONTACTED** | Initial outreach made | Schedule consultation |
| **QUALIFIED** | Confirmed interest & budget | Prepare proposal |
| **PROPOSAL** | Estimate sent to client | Follow up for decision |
| **WON** | Client accepted, converting to project | Convert to Project |
| **LOST** | Opportunity lost | Archive, note reason |

### Lead Capture Sources

Leads can be captured from various sources (tracked in `source` field):
- Website contact form
- Phone inquiry
- Referral from past client
- Home show / trade event
- Social media
- Door-to-door canvassing
- Partner referral

### Lead Management Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         LEADS LIST PAGE                                  │
│  /admin/leads or /designer/leads                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [+ New Lead]     [Search...          ]  [Status ▼] [Project Type ▼]    │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Name           Contact          Address         Type    Status     │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │ John Smith     john@email.com   123 Main St     Kitchen [NEW    ▼] │ │
│  │                (410) 555-1234   Baltimore, MD           [Actions ▼]│ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │ Jane Doe       jane@email.com   456 Oak Ave     Bath    [PROPOSAL] │ │
│  │                (410) 555-5678   Ellicott City           [Actions ▼]│ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  [< Prev]  Page 1 of 5  [Next >]                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Lead Form (Create/Edit)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         LEAD FORM PAGE                                   │
│  /admin/leads/new or /admin/leads/:id                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  CONTACT INFORMATION                                                     │
│  ┌─────────────────────┐  ┌─────────────────────┐                       │
│  │ First Name *        │  │ Last Name *         │                       │
│  │ [John              ]│  │ [Smith             ]│                       │
│  └─────────────────────┘  └─────────────────────┘                       │
│  ┌─────────────────────┐  ┌─────────────────────┐                       │
│  │ Email               │  │ Phone               │                       │
│  │ [john@email.com    ]│  │ [(410) 555-1234    ]│                       │
│  └─────────────────────┘  └─────────────────────┘                       │
│                                                                          │
│  ADDRESS                                                                 │
│  ┌─────────────────────────────────────────────┐                        │
│  │ Street Address                              │                        │
│  │ [123 Main Street                           ]│                        │
│  └─────────────────────────────────────────────┘                        │
│  ┌───────────────┐ ┌────────┐ ┌─────────┐                               │
│  │ City          │ │ State  │ │ ZIP     │                               │
│  │ [Baltimore   ]│ │ [MD   ]│ │ [21201 ]│                               │
│  └───────────────┘ └────────┘ └─────────┘                               │
│                                                                          │
│  PROJECT DETAILS                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐                       │
│  │ Project Type        │  │ Lead Source         │                       │
│  │ [Kitchen        ▼] │  │ [Website           ]│                       │
│  └─────────────────────┘  └─────────────────────┘                       │
│  ┌─────────────────────────────────────────────┐                        │
│  │ Notes                                       │                        │
│  │ [Interested in full kitchen remodel...     ]│                        │
│  └─────────────────────────────────────────────┘                        │
│                                                                          │
│  [Cancel]  [Delete]  [Convert to Project]  [Save Lead]                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Lead Conversion Process

When a lead is ready to become an active project:

```
Designer clicks "Convert to Project"
              │
              ▼
┌─────────────────────────────────┐
│     Confirmation Dialog         │
│  "Convert this lead to a new    │
│   project? The lead will be     │
│   marked as 'Won'."             │
│                                 │
│  [Cancel]    [Convert]          │
└─────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│   Backend Transaction           │
│   1. Create Project record      │
│      - Copy contact info        │
│      - Copy address             │
│      - Link to lead (leadId)    │
│   2. Update Lead status = 'won' │
└─────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│   Navigate to New Project       │
│   /projects/:newProjectId       │
└─────────────────────────────────┘
```

**Data copied during conversion:**
- First/Last name → Project name: "{First} {Last} - {ProjectType}"
- Address, City, State, ZIP
- Project Type
- Notes
- Designer assignment

---

## Project Management System

### What is a Project?

A **Project** represents an active remodeling job. It tracks the entire lifecycle from initial planning through completion and payment.

### Project Data Model

```typescript
interface Project {
  id: string;
  leadId?: string;           // Original lead (if converted)
  designerId: string;        // Assigned designer
  clientId?: string;         // Client user account
  projectManagerId?: string; // Optional PM

  // Basic Info
  name: string;
  description?: string;
  projectType: ProjectType;
  status: ProjectStatus;

  // Location
  address?: string;
  city?: string;
  state?: string;
  zip?: string;

  // Schedule
  startDate?: Date;
  endDate?: Date;

  // Financials
  expectedLaborCost?: number;
  actualLaborCost?: number;

  notes?: string;
  createdAt: string;
  updatedAt: string;

  // Related Data
  lead?: Lead;
  designer?: User;
  client?: User;
  estimates?: Estimate[];
  documents?: Document[];
  paymentSchedules?: PaymentSchedule[];
  invoices?: Invoice[];
  crewAssignments?: CrewAssignment[];
  laborLogs?: LaborLog[];
}
```

### Project Status Lifecycle

```
┌─────────┐
│  DRAFT  │  Initial creation, planning phase
└────┬────┘
     │
     ▼
┌──────────────────┐
│ PENDING_APPROVAL │  Estimate sent, awaiting client
└────────┬─────────┘
         │
         ▼
┌──────────┐
│ APPROVED │  Client approved estimate
└────┬─────┘
     │
     ▼
┌─────────────┐     ┌─────────┐
│ IN_PROGRESS │◀───▶│ ON_HOLD │  Can pause/resume
└──────┬──────┘     └─────────┘
       │
       ▼
┌───────────┐
│ COMPLETED │  Work finished, final payment
└───────────┘

At any point:
┌───────────┐
│ CANCELLED │  Project terminated
└───────────┘
```

| Status | Description | Typical Duration |
|--------|-------------|------------------|
| **DRAFT** | Planning, creating estimates | 1-2 weeks |
| **PENDING_APPROVAL** | Waiting for client decision | 1-7 days |
| **APPROVED** | Ready to schedule | 1-3 days |
| **IN_PROGRESS** | Active construction | 2-12 weeks |
| **ON_HOLD** | Temporarily paused | Variable |
| **COMPLETED** | Work finished | Final state |
| **CANCELLED** | Project cancelled | Final state |

### Project Detail Page

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [← Back]                                                               │
│                                                                          │
│  Kitchen Renovation - John Smith                    [Status: IN_PROGRESS▼]
│  john@email.com                                     [⋮ More Actions]    │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │ 📍 Address      │  │ 📅 Schedule     │  │ 💵 Estimate     │         │
│  │ 123 Main St     │  │ Jan 15 - Mar 1  │  │ $37,500.00      │         │
│  │ Baltimore, MD   │  │ 2026            │  │                 │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [Estimates]        [Documents]        [Payments]                       │
│  ───────────                                                            │
│                                                                          │
│  ESTIMATES                                          [+ New Estimate]    │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ ✓ Estimate v2         $37,500.00    APPROVED    Jan 10  [⋮]       │ │
│  │   Created Jan 8, 2026                                              │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │ ◷ Estimate v1         $35,000.00    REJECTED    Jan 5   [⋮]       │ │
│  │   Created Jan 3, 2026                                              │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Project Components

A project encompasses multiple sub-systems:

```
                              PROJECT
                                 │
        ┌────────────┬──────────┼──────────┬────────────┐
        │            │          │          │            │
        ▼            ▼          ▼          ▼            ▼
   ┌─────────┐  ┌─────────┐ ┌───────┐ ┌─────────┐ ┌─────────┐
   │ESTIMATES│  │DOCUMENTS│ │PAYMENTS│ │  CREWS  │ │MATERIALS│
   └────┬────┘  └────┬────┘ └───┬───┘ └────┬────┘ └────┬────┘
        │            │          │          │            │
        ▼            ▼          ▼          ▼            ▼
   Sections &    Contracts   Payment    Crew       Purchase
   Line Items    Scopes      Schedule   Assign-    Orders
   Pricing       Change      Invoices   ments      Material
   Approval      Orders      Payments   Labor      Items
                 PDFs                   Logs
```

---

## Complete Business Workflow

### End-to-End Process

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PHASE 1: LEAD CAPTURE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Customer Interest                                                       │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────────────────────┐                                        │
│  │     Create Lead             │                                        │
│  │  • Contact information      │                                        │
│  │  • Project type             │                                        │
│  │  • Source tracking          │                                        │
│  │  • Assign to designer       │                                        │
│  └─────────────────────────────┘                                        │
│       │                                                                  │
│       ▼                                                                  │
│  Lead Status: NEW                                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       PHASE 2: QUALIFICATION                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Designer makes contact                                                  │
│       │                                                                  │
│       ▼                                                                  │
│  Lead Status: CONTACTED                                                  │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────────────────────┐                                        │
│  │   Qualify the Lead          │                                        │
│  │  • Confirm budget           │                                        │
│  │  • Understand scope         │                                        │
│  │  • Schedule consultation    │                                        │
│  │  • Site visit if needed     │                                        │
│  └─────────────────────────────┘                                        │
│       │                                                                  │
│       ▼                                                                  │
│  Lead Status: QUALIFIED                                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      PHASE 3: PROPOSAL                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────┐                                        │
│  │   Convert Lead to Project   │                                        │
│  │  • Creates project record   │                                        │
│  │  • Copies lead data         │                                        │
│  │  • Links lead → project     │                                        │
│  │  • Lead status = WON        │                                        │
│  └─────────────────────────────┘                                        │
│       │                                                                  │
│       ▼                                                                  │
│  Project Status: DRAFT                                                   │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────────────────────┐                                        │
│  │   Build Estimate            │                                        │
│  │  • Add sections             │                                        │
│  │  • Add line items           │                                        │
│  │  • Calculate pricing        │                                        │
│  │  • Apply margin             │                                        │
│  └─────────────────────────────┘                                        │
│       │                                                                  │
│       ▼                                                                  │
│  Estimate Status: DRAFT                                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      PHASE 4: APPROVAL                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────┐                                        │
│  │   Finalize & Send Estimate  │                                        │
│  │  • Generate approval token  │                                        │
│  │  • Create payment schedule  │                                        │
│  │  • Send email to client     │                                        │
│  └─────────────────────────────┘                                        │
│       │                                                                  │
│       ▼                                                                  │
│  Estimate Status: SENT                                                   │
│  Project Status: PENDING_APPROVAL                                        │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────────────────────┐                                        │
│  │   Client Reviews Estimate   │                                        │
│  │  • Views via approval link  │                                        │
│  │  • Reviews line items       │                                        │
│  │  • Sees payment schedule    │                                        │
│  └─────────────────────────────┘                                        │
│       │                                                                  │
│       ├─────────────────────┐                                           │
│       ▼                     ▼                                           │
│  ┌─────────┐           ┌─────────┐                                      │
│  │ APPROVE │           │ REJECT  │                                      │
│  └────┬────┘           └────┬────┘                                      │
│       │                     │                                           │
│       ▼                     ▼                                           │
│  Estimate: APPROVED    Estimate: REJECTED                               │
│  Project: APPROVED     (Revise estimate)                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      PHASE 5: EXECUTION                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────┐                                        │
│  │   Collect Deposit           │                                        │
│  │  • Create invoice (30%)     │                                        │
│  │  • Send to client           │                                        │
│  │  • Record payment           │                                        │
│  └─────────────────────────────┘                                        │
│       │                                                                  │
│       ▼                                                                  │
│  Project Status: IN_PROGRESS                                             │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────────────────────┐                                        │
│  │   Project Execution         │                                        │
│  │  • Assign crews             │                                        │
│  │  • Order materials          │                                        │
│  │  • Track labor              │                                        │
│  │  • Milestone payments       │                                        │
│  │    - Project Start (30%)    │                                        │
│  │    - Midpoint (30%)         │                                        │
│  └─────────────────────────────┘                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      PHASE 6: COMPLETION                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────┐                                        │
│  │   Final Walkthrough         │                                        │
│  │  • Client inspection        │                                        │
│  │  • Punch list items         │                                        │
│  │  • Final approval           │                                        │
│  └─────────────────────────────┘                                        │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────────────────────┐                                        │
│  │   Final Payment             │                                        │
│  │  • Completion invoice (10%) │                                        │
│  │  • Record final payment     │                                        │
│  └─────────────────────────────┘                                        │
│       │                                                                  │
│       ▼                                                                  │
│  Project Status: COMPLETED                                               │
│  All Payments: COMPLETED                                                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                      │
└────────────────────────────────────────────────────────────────────────────┘

                    LEAD
                      │
                      │ convert()
                      ▼
    ┌─────────────────────────────────────────┐
    │               PROJECT                    │
    │  ┌─────────────────────────────────┐    │
    │  │           ESTIMATE              │    │
    │  │  ┌───────────────────────────┐  │    │
    │  │  │        SECTIONS           │  │    │
    │  │  │  ┌─────────────────────┐  │  │    │
    │  │  │  │    LINE ITEMS       │  │  │    │
    │  │  │  │  • Name             │  │  │    │
    │  │  │  │  • Quantity         │  │  │    │
    │  │  │  │  • Unit Price       │  │  │    │
    │  │  │  │  • Total            │  │  │    │
    │  │  │  └─────────────────────┘  │  │    │
    │  │  └───────────────────────────┘  │    │
    │  │                                 │    │
    │  │  Subtotal + Margin = TOTAL      │    │
    │  └─────────────────────────────────┘    │
    │                   │                      │
    │                   │ finalize()           │
    │                   ▼                      │
    │  ┌─────────────────────────────────┐    │
    │  │       PAYMENT SCHEDULE          │    │
    │  │  ├─ Contract Signing (30%)      │    │
    │  │  ├─ Project Start (30%)         │    │
    │  │  ├─ Midpoint (30%)              │    │
    │  │  └─ Completion (10%)            │    │
    │  └─────────────────────────────────┘    │
    │                   │                      │
    │                   │ createInvoice()      │
    │                   ▼                      │
    │  ┌─────────────────────────────────┐    │
    │  │          INVOICES               │    │
    │  │  INV-20260114-001  $11,250      │    │
    │  │  INV-20260120-002  $11,250      │    │
    │  │  INV-20260215-003  $11,250      │    │
    │  │  INV-20260301-004   $3,750      │    │
    │  └─────────────────────────────────┘    │
    │                   │                      │
    │                   │ recordPayment()      │
    │                   ▼                      │
    │  ┌─────────────────────────────────┐    │
    │  │          PAYMENTS               │    │
    │  │  Payment records with method,   │    │
    │  │  amount, date, reference        │    │
    │  └─────────────────────────────────┘    │
    │                                          │
    └─────────────────────────────────────────┘
```

---

## Data Models & Relationships

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐
│    USER     │       │    LEAD     │
│─────────────│       │─────────────│
│ id          │◀──────│ designerId  │
│ email       │       │ firstName   │
│ role        │       │ lastName    │
│ name        │       │ status      │
└──────┬──────┘       │ projectType │
       │              └──────┬──────┘
       │                     │
       │              leadId │ (optional)
       │                     │
       │              ┌──────▼──────┐
       │              │   PROJECT   │
       │              │─────────────│
       └─────────────▶│ designerId  │
                      │ clientId    │
                      │ name        │
                      │ status      │
                      └──────┬──────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
    ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
    │  ESTIMATE   │   │  PAYMENT    │   │  INVOICE    │
    │─────────────│   │  SCHEDULE   │   │─────────────│
    │ projectId   │   │─────────────│   │ projectId   │
    │ version     │   │ projectId   │   │ scheduleId  │
    │ status      │   │ estimateId  │   │ amount      │
    │ total       │   │ milestone   │   │ status      │
    │ approvalToken│  │ amountDue   │   └─────────────┘
    └──────┬──────┘   │ status      │
           │          └─────────────┘
    ┌──────▼──────┐
    │  SECTION    │
    │─────────────│
    │ estimateId  │
    │ name        │
    │ subtotal    │
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │ LINE_ITEM   │
    │─────────────│
    │ sectionId   │
    │ name        │
    │ quantity    │
    │ unitPrice   │
    │ total       │
    └─────────────┘
```

### Key Relationships

| Parent | Child | Relationship | Description |
|--------|-------|--------------|-------------|
| User | Lead | 1:N | Designer owns many leads |
| User | Project | 1:N | Designer manages many projects |
| Lead | Project | 1:N | Lead can have multiple projects |
| Project | Estimate | 1:N | Project has estimate versions |
| Estimate | Section | 1:N | Estimate has line item sections |
| Section | LineItem | 1:N | Section contains line items |
| Project | PaymentSchedule | 1:N | Project has payment milestones |
| PaymentSchedule | Invoice | 1:N | Schedule item has invoices |
| Project | Invoice | 1:N | Project has many invoices |

---

## API Reference

### Lead Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leads` | List leads (filtered, paginated) |
| GET | `/api/leads/:id` | Get lead details |
| POST | `/api/leads` | Create new lead |
| PUT | `/api/leads/:id` | Update lead |
| PATCH | `/api/leads/:id/status` | Update lead status |
| POST | `/api/leads/:id/convert` | Convert lead to project |
| DELETE | `/api/leads/:id` | Delete lead |

### Project Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List projects (filtered, paginated) |
| GET | `/api/projects/:id` | Get project with all related data |
| POST | `/api/projects` | Create new project |
| PUT | `/api/projects/:id` | Update project |
| PATCH | `/api/projects/:id/status` | Update project status |
| GET | `/api/projects/:id/timeline` | Get activity log |
| DELETE | `/api/projects/:id` | Delete draft project |

### Estimate Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/estimates/project/:projectId` | List estimates for project |
| GET | `/api/estimates/:id` | Get estimate with sections/items |
| POST | `/api/estimates/project/:projectId` | Create new estimate |
| POST | `/api/estimates/:id/sections` | Add section |
| POST | `/api/estimates/:id/items` | Add line item |
| PUT | `/api/estimates/:id/items/:itemId` | Update line item |
| POST | `/api/estimates/:id/finalize` | Finalize and send |
| GET | `/api/estimates/approval/:token` | Public: Get by token |
| POST | `/api/estimates/approval/:token/approve` | Public: Approve |
| POST | `/api/estimates/approval/:token/reject` | Public: Reject |

### Payment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments/schedule/:projectId` | Get payment schedule |
| POST | `/api/payments` | Record payment |
| GET | `/api/payments/project/:projectId` | Get payments for project |

### Invoice Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | List all invoices |
| GET | `/api/invoices/project/:projectId` | List for project |
| POST | `/api/invoices/from-schedule/:scheduleId` | Create from schedule |
| POST | `/api/invoices/:id/send` | Send to client |
| POST | `/api/invoices/:id/mark-paid` | Mark as paid |

---

## Frontend Structure

### Route Map

```
/login                          → LoginPage
/auth/verify                    → VerifyPage (magic link)
/client/invite                  → ClientInvitePage
/estimate/approve/:token        → EstimateApprovalPage (public)

/admin                          → AdminLayout
  /admin                        → AdminDashboard
  /admin/users                  → UsersPage
  /admin/leads                  → LeadsListPage
  /admin/leads/new              → LeadFormPage
  /admin/leads/:id              → LeadFormPage (edit)
  /admin/projects               → ProjectsListPage
  /admin/projects/new           → ProjectFormPage
  /admin/projects/:id           → ProjectDetailPage
  /admin/projects/:id/edit      → ProjectFormPage (edit)
  /admin/estimates              → EstimatesListPage
  /admin/estimates/:id          → EstimateBuilderPage
  /admin/documents              → DocumentsPage
  /admin/pricing                → PricingConfigPage
  /admin/purchasing             → PurchasingPage
  /admin/vendors                → VendorsPage
  /admin/crews                  → CrewsPage
  /admin/settings               → SettingsPage

/designer                       → DesignerLayout
  /designer                     → DesignerDashboard
  /designer/leads               → LeadsListPage
  /designer/leads/new           → LeadFormPage
  /designer/leads/:id           → LeadFormPage (edit)
  /designer/projects            → ProjectsListPage
  /designer/projects/:id        → ProjectDetailPage
  /designer/estimates/:id       → EstimateBuilderPage
  /designer/documents           → DocumentsPage
  /designer/purchasing          → PurchasingPage

/client                         → ClientLayout
  /client                       → ClientDashboard
  /client/documents             → DocumentsPage
  /client/payments              → PaymentsPage
  /client/messages              → MessagesPage (placeholder)
```

### State Management

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND STATE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   ZUSTAND STORE                          │    │
│  │  authStore:                                              │    │
│  │    • user: User | null                                   │    │
│  │    • token: string | null                                │    │
│  │    • isAuthenticated: boolean                            │    │
│  │    • isLoading: boolean                                  │    │
│  │    • login(), logout(), setUser()                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   REACT QUERY                            │    │
│  │  Server State (cached, auto-refetched):                  │    │
│  │    • ['leads'] - Lead list                               │    │
│  │    • ['lead', id] - Single lead                          │    │
│  │    • ['projects'] - Project list                         │    │
│  │    • ['project', id] - Single project                    │    │
│  │    • ['project-estimates', id] - Project estimates       │    │
│  │    • ['estimate', id] - Single estimate                  │    │
│  │    • ['payment-schedule', id] - Payment schedule         │    │
│  │    • ['project-invoices', id] - Project invoices         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   LOCAL STATE                            │    │
│  │  Component-level useState:                               │    │
│  │    • Form inputs                                         │    │
│  │    • Modal visibility                                    │    │
│  │    • Active tabs                                         │    │
│  │    • Filter selections                                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Summary

This CRM system provides a complete business workflow for a remodeling company:

1. **Lead Capture** - Collect and track potential customers
2. **Lead Qualification** - Move leads through sales pipeline
3. **Lead Conversion** - Transform qualified leads into projects
4. **Estimate Building** - Create detailed pricing proposals
5. **Client Approval** - Get client sign-off on estimates
6. **Payment Management** - Track milestone payments and invoices
7. **Project Execution** - Manage the work from start to finish

The system enforces proper business rules, role-based access control, and maintains a complete audit trail of all activities.
