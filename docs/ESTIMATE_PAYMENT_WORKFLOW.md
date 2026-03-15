# Estimate Finalization & Payment Workflow System

## Table of Contents
1. [System Overview](#system-overview)
2. [Data Models](#data-models)
3. [Complete Workflow](#complete-workflow)
4. [API Endpoints](#api-endpoints)
5. [Frontend Components](#frontend-components)
6. [Data Flow Diagrams](#data-flow-diagrams)

---

## System Overview

This system handles the complete lifecycle from estimate creation to payment collection:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Create    │────▶│  Finalize   │────▶│   Client    │────▶│   Payment   │
│  Estimate   │     │  & Send     │     │  Approval   │     │  Tracking   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Key Features
- **PDF Generation**: Client-side PDF generation using React-PDF
- **Token-based Approval**: Clients can approve without logging in
- **Automatic Payment Schedule**: 30/30/30/10 milestone split on approval
- **Invoice Management**: Auto-generate from schedule or create manually
- **Payment Tracking**: Record payments, track status, send reminders

---

## Data Models

### Estimate Model
```prisma
model Estimate {
  id                String           @id @default(uuid())
  projectId         String
  name              String?
  version           Int              @default(1)
  status            EstimateStatus   @default(draft)

  // Financials
  subtotalCost      Decimal          @db.Decimal(12, 2)
  subtotalSelling   Decimal          @db.Decimal(12, 2)
  marginPercentage  Decimal          @db.Decimal(5, 2)
  total             Decimal          @db.Decimal(12, 2)

  // Approval Fields
  approvalToken     String?          @unique    // UUID for public access
  approvedAt        DateTime?                   // When client approved
  approvedBy        String?                     // Client name/signature
  rejectedAt        DateTime?                   // When client rejected
  rejectionReason   String?                     // Why rejected

  // Relations
  project           Project          @relation(...)
  sections          EstimateSection[]
}
```

### PaymentSchedule Model
```prisma
model PaymentSchedule {
  id          String        @id @default(uuid())
  projectId   String
  estimateId  String?
  milestone   String        // contract_signing, project_start, midpoint, completion
  percentage  Decimal       @db.Decimal(5, 2)
  amountDue   Decimal       @db.Decimal(12, 2)
  status      PaymentStatus @default(pending)
  dueDate     DateTime?
  paidAt      DateTime?
  paidAmount  Decimal?      @db.Decimal(12, 2)

  // Relations
  project     Project       @relation(...)
  estimate    Estimate?     @relation(...)
  invoices    Invoice[]
}
```

### Invoice Model
```prisma
model Invoice {
  id            String        @id @default(uuid())
  invoiceNumber String        @unique    // Auto-generated: INV-YYYYMMDD-XXX
  projectId     String
  scheduleId    String?                  // Links to payment milestone
  amount        Decimal       @db.Decimal(12, 2)
  status        InvoiceStatus @default(draft)
  dueDate       DateTime?
  paidAt        DateTime?
  sentAt        DateTime?
  pdfUrl        String?
  notes         String?

  // Relations
  project       Project          @relation(...)
  schedule      PaymentSchedule? @relation(...)
}
```

### Status Enums
```typescript
// Estimate Status Flow
EstimateStatus: draft → sent → viewed → approved | rejected | expired

// Payment Status Flow
PaymentStatus: pending → invoiced → completed | overdue

// Invoice Status Flow
InvoiceStatus: draft → sent → paid | overdue | cancelled
```

---

## Complete Workflow

### Phase 1: Estimate Creation & Finalization

```
┌──────────────────────────────────────────────────────────────────┐
│                     ESTIMATE BUILDER PAGE                         │
│  /admin/estimates/:id or /designer/estimates/:id                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Designer builds estimate with sections & line items          │
│  2. System calculates costs, margins, totals                     │
│  3. Designer clicks "Finalize & Send"                            │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              FINALIZE MODAL                                  │ │
│  │  ┌─────────────────────────────────────────────────────────┐│ │
│  │  │ ☑ Send email notification to client                    ││ │
│  │  │   Email: client@example.com                             ││ │
│  │  └─────────────────────────────────────────────────────────┘│ │
│  │  [Cancel]                            [Finalize & Send]      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Backend Process (POST /api/estimates/:id/finalize)**:
```
1. Validate estimate has items and valid total
2. Generate unique approval token (UUID)
3. Update estimate status to 'sent'
4. Create payment schedule (30/30/30/10 split)
5. Send email to client with approval link
6. Return approval URL
```

**Data Flow**:
```
Frontend                         Backend                          Database
   │                                │                                │
   │ POST /estimates/:id/finalize   │                                │
   │ { sendEmail: true }            │                                │
   │───────────────────────────────▶│                                │
   │                                │  1. Find estimate with project │
   │                                │────────────────────────────────▶│
   │                                │◀────────────────────────────────│
   │                                │                                │
   │                                │  2. Generate approval token    │
   │                                │  3. Update estimate status     │
   │                                │────────────────────────────────▶│
   │                                │                                │
   │                                │  4. Create payment schedules   │
   │                                │  (30%, 30%, 30%, 10%)          │
   │                                │────────────────────────────────▶│
   │                                │                                │
   │                                │  5. Send email (if enabled)    │
   │                                │─────▶ Email Service            │
   │                                │                                │
   │ { approvalUrl, estimate }      │                                │
   │◀───────────────────────────────│                                │
```

### Phase 2: Client Approval

```
┌──────────────────────────────────────────────────────────────────┐
│                   ESTIMATE APPROVAL PAGE                          │
│  /estimate/approve/:token (PUBLIC - NO AUTH REQUIRED)            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  ReModel Sync                                               │ │
│  │                                                              │ │
│  │  Estimate for: Kitchen Renovation                           │ │
│  │  Prepared for: John Smith                                   │ │
│  │  Date: January 14, 2026                                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  SECTIONS & LINE ITEMS                                      │ │
│  │  ├─ Demolition                              $2,500.00       │ │
│  │  ├─ Cabinets                               $15,000.00       │ │
│  │  ├─ Countertops                             $8,000.00       │ │
│  │  └─ Labor                                  $12,000.00       │ │
│  │                                                              │ │
│  │  ─────────────────────────────────────────────────────────  │ │
│  │  TOTAL                                     $37,500.00       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  PAYMENT SCHEDULE                                           │ │
│  │  ├─ Deposit (30%)                          $11,250.00       │ │
│  │  ├─ Project Start (30%)                    $11,250.00       │ │
│  │  ├─ Midpoint (30%)                         $11,250.00       │ │
│  │  └─ Completion (10%)                        $3,750.00       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  [Download PDF]        [Reject]              [Approve Estimate]   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Approval Flow**:
```
Client clicks link in email
         │
         ▼
┌─────────────────────┐
│ GET /approval/:token│
│ Fetch estimate data │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Display estimate    │
│ with all details    │
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    ▼           ▼
┌───────┐   ┌───────┐
│Approve│   │Reject │
└───┬───┘   └───┬───┘
    │           │
    ▼           ▼
┌─────────┐ ┌─────────────────┐
│POST     │ │POST             │
│/approve │ │/reject          │
│{name}   │ │{reason}         │
└────┬────┘ └────────┬────────┘
     │               │
     ▼               ▼
┌─────────────┐  ┌─────────────┐
│Update status│  │Update status│
│to 'approved'│  │to 'rejected'│
│Set approvedAt│ │Set reason   │
└─────────────┘  └─────────────┘
```

**Data Flow - Approval**:
```
Frontend                         Backend                          Database
   │                                │                                │
   │ POST /approval/:token/approve  │                                │
   │ { approvedBy: "John Smith" }   │                                │
   │───────────────────────────────▶│                                │
   │                                │  1. Find by approval token    │
   │                                │────────────────────────────────▶│
   │                                │◀────────────────────────────────│
   │                                │                                │
   │                                │  2. Update estimate            │
   │                                │     status = 'approved'        │
   │                                │     approvedAt = now()         │
   │                                │     approvedBy = "John Smith"  │
   │                                │────────────────────────────────▶│
   │                                │                                │
   │                                │  3. Update project status      │
   │                                │     to 'approved'              │
   │                                │────────────────────────────────▶│
   │                                │                                │
   │ { success: true, estimate }    │                                │
   │◀───────────────────────────────│                                │
```

### Phase 3: Payment Tracking

```
┌──────────────────────────────────────────────────────────────────┐
│                   PROJECT PAYMENTS TAB                            │
│  /admin/projects/:id → Payments Tab                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Total Value │  │    Paid     │  │  Remaining  │              │
│  │  $37,500    │  │  $22,500    │  │   $15,000   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                   │
│  PAYMENT SCHEDULE                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ ✓ Deposit (30%)         $11,250    COMPLETED                │ │
│  │   Due: Jan 15, 2026                                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ ✓ Project Start (30%)   $11,250    COMPLETED                │ │
│  │   Due: Jan 20, 2026                                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ ◷ Midpoint (30%)        $11,250    INVOICED                 │ │
│  │   Due: Feb 15, 2026     [Record Payment]                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ ◷ Completion (10%)       $3,750    PENDING                  │ │
│  │   Due: Mar 1, 2026      [Create Invoice] [Record Payment]   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  INVOICES                                                         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ INV-20260114-001  $11,250  PAID     Jan 15  ─               │ │
│  │ INV-20260120-002  $11,250  PAID     Jan 20  ─               │ │
│  │ INV-20260210-003  $11,250  SENT     Feb 15  [Mark Paid]     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Payment Recording Flow**:
```
┌─────────────────────────────────────────────────────────────────┐
│                    RECORD PAYMENT MODAL                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Milestone: Midpoint (30%)                                       │
│                                                                  │
│  Amount: [$11,250.00        ]                                    │
│                                                                  │
│  Payment Method: [Select method...    ▼]                         │
│                  ├─ Check                                        │
│                  ├─ Credit Card                                  │
│                  ├─ Bank Transfer                                │
│                  ├─ Cash                                         │
│                  └─ Other                                        │
│                                                                  │
│  [Cancel]                              [Record Payment]          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Data Flow - Record Payment**:
```
Frontend                         Backend                          Database
   │                                │                                │
   │ POST /api/payments             │                                │
   │ {                              │                                │
   │   scheduleId: "xxx",           │                                │
   │   projectId: "yyy",            │                                │
   │   amount: 11250,               │                                │
   │   paymentMethod: "check"       │                                │
   │ }                              │                                │
   │───────────────────────────────▶│                                │
   │                                │  1. Find payment schedule     │
   │                                │────────────────────────────────▶│
   │                                │◀────────────────────────────────│
   │                                │                                │
   │                                │  2. Update schedule            │
   │                                │     status = 'completed'       │
   │                                │     paidAt = now()             │
   │                                │     paidAmount = 11250         │
   │                                │────────────────────────────────▶│
   │                                │                                │
   │                                │  3. Create payment record      │
   │                                │────────────────────────────────▶│
   │                                │                                │
   │                                │  4. Update any linked invoice  │
   │                                │     status = 'paid'            │
   │                                │────────────────────────────────▶│
   │                                │                                │
   │ { success: true, payment }     │                                │
   │◀───────────────────────────────│                                │
```

### Phase 4: Invoice Management

**Invoice Creation from Schedule**:
```
POST /api/invoices/from-schedule/:scheduleId

1. Find payment schedule
2. Generate invoice number (INV-YYYYMMDD-XXX)
3. Create invoice with schedule amount
4. Link invoice to schedule
5. Update schedule status to 'invoiced'
6. Return invoice
```

**Invoice Status Flow**:
```
                    ┌───────────────┐
                    │    DRAFT      │
                    │  (created)    │
                    └───────┬───────┘
                            │
                    POST /invoices/:id/send
                            │
                            ▼
                    ┌───────────────┐
                    │     SENT      │
                    │ (email sent)  │
                    └───────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
      ┌───────────┐  ┌───────────┐  ┌───────────┐
      │   PAID    │  │  OVERDUE  │  │ CANCELLED │
      │           │  │ (past due)│  │           │
      └───────────┘  └─────┬─────┘  └───────────┘
                           │
                           ▼
                    ┌───────────┐
                    │   PAID    │
                    └───────────┘
```

---

## API Endpoints

### Estimates API

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/estimates/:id/finalize` | Finalize estimate & create payment schedule | Required |
| GET | `/api/estimates/approval/:token` | Get estimate by approval token | Public |
| POST | `/api/estimates/approval/:token/approve` | Approve estimate | Public |
| POST | `/api/estimates/approval/:token/reject` | Reject estimate | Public |

### Payments API

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/payments/schedule/:projectId` | Get payment schedule for project | Required |
| POST | `/api/payments/schedule/:projectId` | Create payment schedule | Required |
| PATCH | `/api/payments/schedule/:scheduleId` | Update schedule item | Required |
| POST | `/api/payments` | Record a payment | Required |
| GET | `/api/payments/project/:projectId` | Get all payments for project | Required |

### Invoices API

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/invoices` | List all invoices | Required |
| GET | `/api/invoices/project/:projectId` | List invoices for project | Required |
| GET | `/api/invoices/:id` | Get invoice details | Required |
| POST | `/api/invoices/from-schedule/:scheduleId` | Create invoice from schedule | Required |
| POST | `/api/invoices` | Create manual invoice | Required |
| POST | `/api/invoices/:id/send` | Send invoice to client | Required |
| POST | `/api/invoices/:id/mark-paid` | Mark invoice as paid | Required |
| DELETE | `/api/invoices/:id` | Delete invoice | Required |

---

## Frontend Components

### File Structure
```
frontend/src/
├── components/
│   └── pdf/
│       ├── EstimatePDFTemplate.tsx    # PDF template for estimates
│       └── InvoicePDFTemplate.tsx     # PDF template for invoices
│
├── features/
│   ├── estimates/
│   │   ├── EstimateBuilderPage.tsx    # Build & finalize estimates
│   │   └── EstimateApprovalPage.tsx   # Public approval page
│   │
│   └── projects/
│       ├── ProjectDetailPage.tsx       # Project with payments tab
│       └── ProjectPaymentsTab.tsx      # Payment schedule & invoices
│
└── lib/
    └── api.ts                          # API client functions
```

### Component Interactions

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EstimateBuilderPage                          │
│  - Build sections & line items                                      │
│  - Calculate totals                                                 │
│  - Finalize button → Opens modal                                    │
│  - Calls: estimatesApi.finalize()                                   │
│  - Shows: approval link after finalization                          │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ Finalize
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       EstimateApprovalPage                          │
│  - Public page (no auth)                                            │
│  - Fetches estimate by token                                        │
│  - Shows estimate details & payment schedule preview                │
│  - Approve/Reject buttons                                           │
│  - Calls: estimatesApi.getByApprovalToken()                         │
│  - Calls: estimatesApi.approveByToken()                             │
│  - Calls: estimatesApi.rejectByToken()                              │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ Approve
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       ProjectPaymentsTab                            │
│  - Shows payment schedule with status                               │
│  - Summary cards (total, paid, remaining)                           │
│  - Create invoice from schedule                                     │
│  - Record payment modal                                             │
│  - Invoice list with actions                                        │
│  - Calls: paymentsApi.getSchedule()                                 │
│  - Calls: invoicesApi.listForProject()                              │
│  - Calls: invoicesApi.createFromSchedule()                          │
│  - Calls: paymentsApi.recordPayment()                               │
│  - Calls: invoicesApi.send()                                        │
│  - Calls: invoicesApi.markPaid()                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### Complete System Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DESIGNER                                        │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                    1. Create & Build Estimate
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ESTIMATE                                           │
│  status: draft → sent                                                        │
│  approvalToken: generated                                                    │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                    2. Email sent with approval link
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT                                          │
│  Receives email → Clicks link → Views estimate → Approves/Rejects           │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                    3. On Approval
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PAYMENT SCHEDULE                                      │
│  ┌──────────────────┬────────────┬────────────┬──────────────────┐          │
│  │ contract_signing │ project_   │  midpoint  │   completion     │          │
│  │      30%         │ start 30%  │    30%     │      10%         │          │
│  │    PENDING       │  PENDING   │  PENDING   │    PENDING       │          │
│  └──────────────────┴────────────┴────────────┴──────────────────┘          │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                    4. Create Invoices
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            INVOICES                                          │
│  INV-20260114-001 → DRAFT → SENT → PAID                                     │
│  INV-20260120-002 → DRAFT → SENT → PAID                                     │
│  INV-20260210-003 → DRAFT → SENT → (waiting)                                │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                    5. Record Payments
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PAYMENTS                                          │
│  Payment 1: $11,250 - Check - Jan 15                                        │
│  Payment 2: $11,250 - Credit Card - Jan 20                                  │
│  (waiting for more...)                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Database Relationships

```
┌─────────────┐       ┌─────────────┐       ┌─────────────────┐
│   Project   │◀──────│  Estimate   │       │ PaymentSchedule │
│             │       │             │       │                 │
│ id          │       │ id          │◀──────│ estimateId      │
│ name        │       │ projectId   │       │ projectId       │──────▶ Project
│ status      │       │ status      │       │ milestone       │
│             │       │ approvalToken│      │ percentage      │
│             │       │ approvedAt  │       │ amountDue       │
│             │       │ total       │       │ status          │
└─────────────┘       └─────────────┘       └────────┬────────┘
                                                     │
                                                     │ 1:N
                                                     ▼
                                            ┌─────────────────┐
                                            │    Invoice      │
                                            │                 │
                                            │ invoiceNumber   │
                                            │ scheduleId      │
                                            │ projectId       │──────▶ Project
                                            │ amount          │
                                            │ status          │
                                            │ dueDate         │
                                            │ paidAt          │
                                            └─────────────────┘
```

---

## Payment Schedule Details

### Milestone Breakdown (30/30/30/10)

| Milestone | Percentage | When Due | Purpose |
|-----------|------------|----------|---------|
| `contract_signing` | 30% | On approval | Deposit to secure contract |
| `project_start` | 30% | Project start date | Materials & initial labor |
| `midpoint` | 30% | 50% completion | Ongoing work |
| `completion` | 10% | Final walkthrough | Ensures satisfaction |

### Status Transitions

```
PENDING ──────────────────────────────▶ INVOICED
   │                                        │
   │ (if past due date)                     │ (if past due date)
   ▼                                        ▼
OVERDUE ◀──────────────────────────────────┘
   │
   │ (payment recorded)
   ▼
COMPLETED
```

---

## Security Considerations

1. **Approval Tokens**
   - UUID v4 format (cryptographically random)
   - Single-use implicit (status changes on use)
   - No authentication required (link-based access)

2. **API Authorization**
   - All payment/invoice endpoints require authentication
   - Only admin and designer roles can manage payments
   - Clients can only view their own invoices

3. **Data Validation**
   - Payment amounts validated against schedule
   - Invoice numbers auto-generated (no duplicates)
   - Status transitions enforced

---

## Email Notifications

| Event | Recipient | Content |
|-------|-----------|---------|
| Estimate Finalized | Client | Approval link, estimate summary |
| Estimate Approved | Designer | Notification of approval |
| Estimate Rejected | Designer | Rejection reason |
| Invoice Sent | Client | Invoice PDF, payment instructions |
| Payment Received | Client | Payment confirmation |
| Payment Overdue | Client | Reminder with payment link |

---

## Future Enhancements

1. **Online Payments**: Stripe/Square integration
2. **Automatic Reminders**: Scheduled overdue notifications
3. **Partial Payments**: Accept payments less than full amount
4. **Payment Plans**: Custom milestone configurations
5. **Client Portal**: Self-service payment history
6. **PDF Storage**: S3/cloud storage for generated PDFs
7. **Audit Trail**: Complete payment history logging
