# Account Finance Management System (Hamro Bachat)

A multi-tenant, role-based finance management system for mutual funds (Kosh), built with Next.js, Mongoose, and NextAuth.

## User Decisions Summary

> [!IMPORTANT]
>
> - **Authentication**: Email/Password only using NextAuth.js. No public signup allowed.
> - **Database**: Mongoose (MongoDB) for all models.
> - **Routing**: Unified `/dashboard` route. UI elements gated by role/type.
> - **Calendar**: Integration of Nepali Calendar for deposit deadlines.
> - **Notifications**: Dual-channel (In-app Bell + Email), with role-based and multi-individual targeting.
> - **Reports**: Multi-format exports (CSV, XLSX, PDF) for treasury and member activities.
> - **User Management**: Strictly hierarchical. Developer adds Orgs/Users; Admin adds Users. CRUD, search, filtering, and status management (Active/Disabled) enabled.
> - **Bank QR**: Organizations can upload a bank QR code for payments.
> - **Exports**: Data can be exported in CSV, XLSX, and PDF formats.
> - **Developer Safeguards**: Protected global account that cannot be deleted or disabled. Restricted UI creation of developer roles.
> - **Advanced Roles**: Users can be designated as **Loan Approvers** or **Secondary Admins** regardless of their base role.
> - **Selection-First Policy**: To protect system performance, User and Notification directories remain empty until an explicit filter (Organization, Role, or Status) is selected.
> - **Global Pagination**: Advanced pagination (Page Size, Indexing, Next/Prev) is implemented across Organizations, Users, and Notification modules.
> - **Admin Notifications**: Admins can broadcast messages to their own organization members and System Developers. Global targeting across other organizations is restricted.
> - **Restricted Admin Privacy**: Admins cannot send notifications to themselves or other primary administrators. They can only target **Secondary Admins** and members of their own organization.
> - **Treasury Centralization**: Deposits are managed through a centralized Admin console with bulk verification, correction tools, and automated member alerting.

## Proposed Changes

### 1. Database & Models (Mongoose)

#### [MODIFY] [User.ts](file:///d:/Projects/bachat/hamro-bachat/lib/models/User.ts)

- `email`, `password` (hashed), `name`
- `role`: 'DEVELOPER' | 'ADMIN' | 'USER'
- `organizationId`: ObjectId
- `accountNumber`: String (Assigned by Developer)
- `committeeRole`: 'Adhyaksha' | 'Upadhyaksha' | 'Sachib' | 'Sadasya'
- `isLoanApprover`: Boolean (Designated loan verify rank)
- `isSecondaryAdmin`: Boolean (Designated management assistance)
- `isActive`: Boolean

#### [NEW] [Notification.ts](file:///d:/Projects/bachat/hamro-bachat/lib/models/Notification.ts)

- `senderId`: ObjectId (User)
- `recipientId`: ObjectId (User - Optional)
- `targetRole`: 'ADMIN' | 'USER' | 'ALL'
- `title`, `message`: String
- `isRead`: Boolean
- `type`: 'INFO' | 'WARNING' | 'SUCCESS'

---

### 2. Admin & User Experience

#### [MODIFY] [AdminView.tsx](file:///d:/Projects/bachat/hamro-bachat/components/dashboard/AdminView.tsx)
- **Financial Oversight Terminal**: Replaced the member registry with a compact status bar showing real-time ledger metrics.
- **Verification Queues**: Dedicated pending stacks for Deposits and Loans to streamline administrative workflows.

#### [MODIFY] [UsersPage](file:///d:/Projects/bachat/hamro-bachat/app/dashboard/users/page.tsx)
- **Status Indicators**: Pulsing status lights for better visibility of active/disabled nodes.
- **Access Rank**: Combined view showing role + sub-designations (e.g., ADMIN • Sec. Admin).
- **Notification Deep-Linking**: New "Send Broadcast" action that pre-selects a user in the Notification Center.

---

### 3. Treasury & Deposit Management

#### [MODIFY] [DepositsPage](file:///d:/Projects/bachat/hamro-bachat/app/dashboard/deposits/page.tsx)
- **Hierarchical Controls**: 
    - Admins: Can verify, reject, and correct any organization transmission.
    - Members: Can only view their own history and submit new proofs.
- **Bulk Pipeline**: Processing engine for multi-item approval/rejection.
- **Advanced Audit**: 
    - Date range filtering (From - To).
    - Identity-based search.
    - Export engine (CSV, XLSX Ledger, PDF Report).
- **Automated Feedback**: Real-time notifications dispatched to members upon verification decisions.

---

## Verification Plan

### Manual Verification

- Verify empty-state loading for Users and Notifications center.
- Verify sub-role assignment in the Add User form.
- Verify status lights and Access Rank display in the Directory.
- Test deep-linking from User Directory -> Notification Center.
- Confirm Admin Dashboard is clean of member creation buttons.
- Confirm Admin only sees their own organization members in the Notification Center.
- Confirm Primary Admins are hidden from an Admin's view in the recipient list.
- **Treasury Test**: Perform a bulk approval and verify the "Net Assets" stat updates correctly.
- **Export Test**: Download a PDF report and verify the Emerald green header and grid styling.
