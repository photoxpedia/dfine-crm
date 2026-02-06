# Lead Status Workflow Enhancement Design

**Date:** 2026-02-06
**Status:** Approved

---

## Overview

Comprehensive redesign of the Lead management system to support a structured status workflow with history tracking, photo uploads, designer assignment, and follow-up reminders.

---

## 1. Lead Statuses & Sub-statuses

| Status | Sub-statuses | Description |
|--------|--------------|-------------|
| New | - | Just added, no action yet |
| Contacted | - | Initial contact made |
| Pre-Estimate | In Progress, Complete | On-site visit for photos & measurements |
| Estimated | In Progress, Complete | Estimate being created |
| Converted | In Progress, Complete | Became a project |
| On-Hold | - | Paused, requires reason + optional follow-up date |
| Future Client | - | Not ready now, requires reason + optional follow-up date |
| Dropped | - | Lost/archived, filterable from main list |

### Status Change Rules
- Any status change requires a note (even if brief)
- All changes logged with timestamp and user who made the change
- On-Hold and Future Client require: reason code + optional follow-up date
- Pre-Estimate, Estimated, Converted track sub-status (In Progress → Complete)

---

## 2. Lead Assignment & Visibility

### For Admins
- See all leads across all designers
- Can assign/reassign any lead to any designer via dropdown
- When assigning, designer receives notification (in-app + email)
- Can filter leads by designer, status, date range, source

### For Designers
- See only:
  - Leads they created (auto-assigned to them)
  - Leads assigned to them by admin
- Cannot see other designers' leads at all
- No "assignment" language in their UI - just "My Leads"
- Can add new leads (auto-assigned to self)

### Assignment Flow
1. Admin creates or receives new lead
2. Admin opens lead → selects designer from dropdown
3. Designer gets notification: "New lead: John Smith - Kitchen Remodel"
4. Lead appears in designer's list immediately

---

## 3. Timeline & History Tracking

Vertical timeline on Lead Detail Page showing all activity in chronological order (newest at top). Each entry shows: timestamp, user who made the change, action type, details.

### Events Tracked

| Event Type | What's Recorded |
|------------|-----------------|
| Status Change | Old status → New status, required note, user |
| Sub-status Change | e.g., Pre-Estimate: In Progress → Complete |
| Note Added | Note content, user who added it |
| Photo Uploaded | Photo thumbnail, tag (before/measurement), user |
| Lead Assigned | "Assigned to [Designer Name]" by admin |
| Lead Created | "Lead created by [User]" |
| Follow-up Set | "Follow-up scheduled for [date]" with reason |
| Lead Reactivated | If dropped lead is reopened |

### Timeline Entry Example
```
Feb 6, 2026 • 2:34 PM • Jane Designer
Status changed: Pre-Estimate (In Progress → Complete)
"Measurements done. Kitchen 12x14, island 4x6. Client wants quartz countertops."
[3 photos attached]
```

---

## 4. Pre-Estimate Workflow & Photo Uploads

### When status changes to Pre-Estimate
- Sub-status automatically set to "In Progress"
- Lead detail page shows expanded Pre-Estimate section

### Pre-Estimate Section Contains

1. **Photo Upload Area**
   - "Take Photo" button → opens camera directly
   - "Upload from Gallery" button → file picker
   - "Bulk Upload" → select multiple photos at once
   - Each photo auto-tagged as "Before Photo"
   - Photos upload instantly, show in timeline
   - Thumbnail grid view of all uploaded photos

2. **Measurements & Notes**
   - Large free-form text area
   - Placeholder: "Enter room dimensions, measurements, material notes..."
   - Auto-saves as draft, explicit save button

3. **Mark Complete Button**
   - Changes sub-status to "Complete"
   - Requires confirmation note
   - Timeline shows "Pre-Estimate Complete - Ready for Estimate"

### Photo Storage
- Stored in lead's document folder: `/uploads/leads/{leadId}/before-photos/`
- When lead converts to project, photos copy to project documents
- Photos accessible from timeline and dedicated "Photos" section

---

## 5. On-Hold, Future Client & Follow-ups

### When status changes to On-Hold or Future Client

Modal appears with:

1. **Reason Code (required)** - Dropdown with options:
   - Budget constraints
   - Timing not right
   - Waiting on permits
   - Comparing quotes
   - Personal circumstances
   - Other (allows custom text)

2. **Follow-up Date (optional but encouraged)**
   - Date picker
   - Quick buttons: "1 week", "1 month", "3 months", "6 months"

3. **Note (required)**
   - Brief explanation for context

### Follow-up Reminders
- Day before follow-up: notification + email to assigned designer
- Day of follow-up: lead highlighted in their list
- Dashboard widget: "Upcoming Follow-ups" shows next 7 days

### Dashboard Widget
```
Upcoming Follow-ups
-------------------
Tomorrow
  • John Smith - Kitchen (Budget constraints)

Feb 10
  • Mary Johnson - Bathroom (Timing not right)
```

---

## 6. Notifications System

### Notification Triggers

| Event | In-App | Email | Dashboard |
|-------|--------|-------|-----------|
| Lead assigned to you | Yes | Yes | - |
| Follow-up due tomorrow | Yes | Yes | Widget |
| Follow-up due today | Yes | - | Highlighted |
| New lead added (for admin) | Yes | - | - |

### In-App Notifications
- Bell icon in header with unread count badge
- Dropdown shows recent notifications
- Click notification → goes directly to lead
- "Mark all read" option

### Email Notifications
- Simple, clean emails with:
  - Lead name and type
  - Action needed
  - Direct link to lead in CRM
- Sent from: configurable address

### Dashboard Widget (Designer's Dashboard)
- "My Follow-ups" section showing upcoming 7 days
- "New Leads" count if any unviewed
- Quick stats: leads by status breakdown

---

## 7. Lead Sources (Admin Configurable)

### Default Sources (pre-loaded)
- Phone Call
- Walk-in
- Website
- Referral
- Social Media
- Home Show/Event
- Other

### Admin Settings Page
- Settings → Lead Sources
- Add new source (name only)
- Edit existing source name
- Disable source (hides from dropdown but keeps data integrity)
- Reorder sources (drag & drop)

### In Lead Form
- Source dropdown shows active sources in configured order
- Required field when creating lead

---

## 8. Database Schema Changes

### Modified: Lead Table

New fields:
```prisma
subStatus        SubStatus?       // null, in_progress, complete
followUpDate     DateTime?
followUpReason   FollowUpReason?  // budget, timing, permits, comparing, personal, other
followUpReasonOther String?       // custom text when reason is "other"
```

### New Enum: LeadStatus (replacing existing)

```prisma
enum LeadStatus {
  new
  contacted
  pre_estimate
  estimated
  converted
  on_hold
  future_client
  dropped
}
```

### New Enum: SubStatus

```prisma
enum SubStatus {
  in_progress
  complete
}
```

### New Enum: FollowUpReason

```prisma
enum FollowUpReason {
  budget
  timing
  permits
  comparing
  personal
  other
}
```

### New Table: LeadHistory

```prisma
model LeadHistory {
  id          String      @id @default(uuid())
  leadId      String
  lead        Lead        @relation(fields: [leadId], references: [id], onDelete: Cascade)
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  eventType   LeadEventType
  oldValue    String?     // JSON for status changes
  newValue    String?     // JSON for status changes
  note        String?
  metadata    Json?       // extra data as needed
  createdAt   DateTime    @default(now())

  @@index([leadId])
  @@index([createdAt])
}

enum LeadEventType {
  created
  status_change
  substatus_change
  note_added
  photo_uploaded
  assigned
  followup_set
  reactivated
}
```

### New Table: LeadPhoto

```prisma
model LeadPhoto {
  id          String      @id @default(uuid())
  leadId      String
  lead        Lead        @relation(fields: [leadId], references: [id], onDelete: Cascade)
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  filePath    String
  fileName    String
  fileSize    Int
  mimeType    String
  tag         PhotoTag    @default(before_photo)
  historyId   String?     // links to timeline entry
  createdAt   DateTime    @default(now())

  @@index([leadId])
}

enum PhotoTag {
  before_photo
  measurement
  other
}
```

### New Table: LeadSource

```prisma
model LeadSource {
  id              String    @id @default(uuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  name            String
  sortOrder       Int       @default(0)
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([organizationId, name])
  @@index([organizationId])
}
```

### New Table: Notification

```prisma
model Notification {
  id          String      @id @default(uuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  type        NotificationType
  title       String
  message     String
  entityType  String?     // "lead", "project", etc.
  entityId    String?     // ID of related entity
  isRead      Boolean     @default(false)
  createdAt   DateTime    @default(now())

  @@index([userId, isRead])
  @@index([createdAt])
}

enum NotificationType {
  lead_assigned
  followup_reminder
  lead_new
}
```

---

## 9. API Endpoints

### Lead Endpoints (modified/new)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/leads` | List leads (filtered by role) |
| GET | `/leads/:id` | Get lead with full history |
| POST | `/leads` | Create lead (auto-assign if designer) |
| PUT | `/leads/:id` | Update lead |
| PATCH | `/leads/:id/status` | Change status (with note, triggers history) |
| PATCH | `/leads/:id/assign` | Assign to designer (admin only) |
| POST | `/leads/:id/notes` | Add note to timeline |
| POST | `/leads/:id/photos` | Upload photos |
| GET | `/leads/:id/photos` | Get lead photos |
| DELETE | `/leads/:id/photos/:photoId` | Delete photo |
| GET | `/leads/:id/history` | Get timeline entries |

### Lead Source Endpoints (new)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/lead-sources` | List sources for org |
| POST | `/lead-sources` | Create source (admin) |
| PUT | `/lead-sources/:id` | Update source (admin) |
| PATCH | `/lead-sources/reorder` | Reorder sources (admin) |

### Notification Endpoints (new)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | Get user's notifications |
| PATCH | `/notifications/:id/read` | Mark as read |
| PATCH | `/notifications/read-all` | Mark all as read |
| GET | `/notifications/unread-count` | Get unread count |

### Dashboard Endpoints (new/modified)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/followups` | Get upcoming follow-ups (7 days) |
| GET | `/dashboard/lead-stats` | Get leads by status breakdown |

---

## 10. Frontend Components

### New/Modified Pages

1. **LeadDetailPage** (major update)
   - Timeline section
   - Pre-Estimate section with photo upload
   - Status change modal
   - Assignment dropdown (admin only)

2. **LeadFormPage** (update)
   - Source dropdown from configurable sources
   - Remove "assignment" language for designers

3. **LeadsListPage** (update)
   - Filter by designer (admin only)
   - Show assignment column (admin only)
   - Highlight follow-up due today

4. **DashboardPage** (update)
   - Follow-ups widget
   - Lead stats widget

5. **SettingsPage - Lead Sources** (new)
   - CRUD for lead sources
   - Drag-drop reorder

### New Components

- `LeadTimeline` - vertical timeline display
- `StatusChangeModal` - status change with note
- `OnHoldModal` - reason + follow-up date picker
- `PhotoUploader` - camera/gallery/bulk upload
- `PhotoGrid` - thumbnail display
- `NotificationBell` - header notification dropdown
- `FollowUpWidget` - dashboard widget
- `DesignerAssignDropdown` - admin lead assignment

---

## 11. File Storage Structure

```
/uploads/
  /leads/
    /{leadId}/
      /before-photos/
        photo-{timestamp}-{random}.jpg
      /measurements/
        photo-{timestamp}-{random}.jpg
```

When lead converts to project, photos are copied to:
```
/uploads/
  /projects/
    /{projectId}/
      /before-photos/
        (copied from lead)
```

---

## 12. Migration Notes

### Data Migration
1. Existing leads will have `status` mapped to new enum values
2. `qualified` → `contacted`
3. `proposal` → `estimated`
4. `won` → `converted`
5. `lost` → `dropped`
6. All existing leads get a history entry: "Migrated from legacy system"

### Default Lead Sources
Seed default sources for each organization on migration.

---

## Summary

This design provides:
- Clear status progression with sub-statuses
- Full history/timeline tracking
- Role-based lead visibility (designers see only their leads)
- Admin assignment capability with notifications
- Photo upload for pre-estimate workflow
- Follow-up system with reminders
- Configurable lead sources
- Complete notification system with dashboard integration
