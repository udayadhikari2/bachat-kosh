# Account Finance Management System (Hamro Bachat)

A multi-tenant, role-based finance management system for mutual funds (Kosh), built with Next.js, Mongoose, and NextAuth.

## User Decisions Summary

> [!IMPORTANT]
>
> - **Authentication**: Email/Password only using NextAuth.js. No public signup allowed.
> - **Database**: Mongoose (MongoDB) for all models.
> - **Routing**: Unified `/dashboard` route. UI elements gated by role/type.
> - **Calendar**: Integration of Nepali Calendar for deposit deadlines.
> - **Notifications**: Dual-channel (In-app Bell + Email).
> - **Reports**: Monthly Excel export.
> - **User Management**: Strictly hierarchical. Developer adds Orgs/Users; Admin adds Users.

## Proposed Changes

### 1. Database & Models (Mongoose)

#### [NEW] [Organization.ts](file:///Users/arm/Desktop/root/hamro-bachat/lib/models/Organization.ts)

- `name`: String
- `bankDetails`: { accountNo, accountName, bankName }
- `config`: { monthlyDepositAmount, lateFee, interestRate, penaltyRate, deadlineDay }
- `isActive`: Boolean

#### [NEW] [User.ts](file:///Users/arm/Desktop/root/hamro-bachat/lib/models/User.ts)

- `email`, `password` (hashed), `name`
- `role`: 'DEVELOPER' | 'ADMIN' | 'USER'
- `organizationId`: ObjectId
- `accountNumber`: String (Assigned by Developer)
- `isActive`: Boolean

#### [NEW] [Deposit.ts](file:///Users/arm/Desktop/root/hamro-bachat/lib/models/Deposit.ts)

- `userId`, `organizationId`
- `amount`, `status` (PENDING, APPROVED, REJECTED)
- `month`: String (e.g., "2080-05")
- `proof`: String (Base64 Image)
- `fineApplied`: Number
- `verifiedBy`: ObjectId (Admin)

#### [NEW] [Loan.ts](file:///Users/arm/Desktop/root/hamro-bachat/lib/models/Loan.ts)

- `userId`, `amount`, `status`
- `activatedAt`, `dueDate`
- `interestEarned`, `penaltyEarned`
- `payments`: [{ date, amount, type }]

---

### 2. Authentication & Authorization

#### [NEW] [auth.ts](file:///Users/arm/Desktop/root/hamro-bachat/auth.ts)

- `CredentialsProvider` for Email/Password.
- Custom `authorize` logic checking manual user creation status.
- Session includes `user.role` and `user.organizationId`.

#### [NEW] [middleware.ts](file:///Users/arm/Desktop/root/hamro-bachat/middleware.ts)

- Guard for `/dashboard`. Redirect to `/login` if unauthenticated.

---

### 3. Service Layer (Business Logic)

#### [NEW] [nepali-date.ts](file:///Users/arm/Desktop/root/hamro-bachat/lib/utils/nepali-date.ts)

- Wrapper for Nepali date conversion and month-end detection.

#### [NEW] [finance-engine.ts](file:///Users/arm/Desktop/root/hamro-bachat/lib/services/finance-engine.ts)

- Interest calculation method (12% daily).
- Penalty calculation (20% after 180 days).
- Automation hooks for month-end reconciliation.

---

### 4. UI Components (Dashboard Layout)

#### [NEW] [DashboardContainer.tsx](file:///Users/arm/Desktop/root/hamro-bachat/app/dashboard/page.tsx)

- Server component to fetch role.
- Conditional rendering: `<DeveloperView />`, `<AdminView />`, or `<UserView />`.

#### [NEW] [EmailService.ts](file:///Users/arm/Desktop/root/hamro-bachat/lib/services/EmailService.ts)

- Template-based emails for deposit approvals and loan updates.

---

## Open Questions

1.  **First User**: Since registration is closed, how would you like to create the first Developer account? (I can provide a temporary seed script `npm run seed`).
2.  **Email Provider**: Do you have an SMTP server or service like SendGrid/Resend to use for notifications?

## Verification Plan

### Automated Tests

- Mongoose validation tests for unique emails and mandatory organization IDs.
- Logic tests for Nepali date month-end boundaries and interest math accuracy.

### Manual Verification

- Log in as Developer -> Create Organization -> Create Admin.
- Log in as Admin -> Create User.
- Log in as User -> Submit Deposit screenshot -> Admin Verify.
