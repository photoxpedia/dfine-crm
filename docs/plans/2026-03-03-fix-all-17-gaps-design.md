# Design: Fix All 17 Missing/Broken Features

## Critical (#1-5)

### 1. Contract Signatures Not Saved
- Estimate approval endpoint receives signature base64 but ignores it
- Create Document (type: contract) + Signature record on approval
- Add signatureData field to Estimate schema
- Models already exist, just need wiring

### 2. Auto Invoice Generation
- After payment schedule creation (estimate finalization), auto-create invoice for first milestone
- When milestone paid, auto-create invoice for next milestone
- invoice.service.ts already has createInvoiceFromSchedule()

### 3. Dashboard Stats Hardcoded
- Add GET /api/dashboard/stats returning real counts
- Replace hardcoded values in AdminDashboard.tsx

### 4. Stripe Subscription Billing
- Add POST /api/organization/subscribe (create Stripe checkout for subscription)
- Add webhook handlers for customer.subscription.* events
- Wire upgrade buttons in SettingsPage
- Use STRIPE_STARTER/PRO/ENTERPRISE_PRICE_ID env vars

### 5. Email Verification on Signup
- Add isEmailVerified + emailVerificationToken fields to User
- Send verification email on register
- Add GET /api/auth/verify-email endpoint
- Show banner for unverified users

## High Priority (#6-10)

### 6. Change Orders Update Payments
- On change order approval, create new PaymentSchedule entry
- Auto-create invoice for change order amount

### 7. Org Switcher
- GET /api/organization/my-orgs
- POST /api/organization/switch/:orgId
- Dropdown in layout headers

### 8. Client Re-login
- Allow password setting on client invite accept
- Enable password login for client role
- Add password reset flow

### 9. Payment-to-Project-Complete
- After payment completion, check if all schedules done
- Auto-update project status + send notification

### 10. Notification Auto-Triggers
- Add createNotification calls in: lead assignment, estimate sent/approved/rejected, payment received, change order changes, project status changes

## Nice to Have (#11-17)

### 11. Financial Reports - GET /api/reports/financial
### 12. PO PDF - Client-side with @react-pdf/renderer
### 13. Export CSV/PDF - CSV for data, PDF for reports
### 14. Audit Trail - ActivityLog for super admin actions
### 15. Invite Resend - New token, extend expiry
### 16. Crew Scheduling - Overlap detection
### 17. S3 File Uploads - aws-sdk with local fallback
