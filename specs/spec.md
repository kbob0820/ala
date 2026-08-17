# Ajang Loan System — Functional Specification

## 1. Executive Summary

The Ajang Loan System is a cross-platform loan management application serving lenders across Web (Responsive), Android, and iOS. It manages the complete loan lifecycle from borrower onboarding and loan origination through payment processing, collections, reloans, and refunds. The system enforces strict business rules — 10% default interest, 5-month maximum term, twice-monthly payment schedules, PHP 500 monthly late charges, and proof-of-payment requirements — while maintaining a full audit trail for every financial event.

---

## 2. Business Objectives

| ID | Objective |
|----|-----------|
| OBJ-01 | Digitize the end-to-end loan lifecycle — application, approval, release, repayment, and closure |
| OBJ-02 | Enforce business rules at the server layer so no client can bypass calculations or limits |
| OBJ-03 | Provide role-based access so each user sees only what their role permits |
| OBJ-04 | Support multiple payment channels (Cash, GCash, BPI, BDO, Other Banks) with proof-of-payment upload |
| OBJ-05 | Enable reloans by deducting existing loan balances from net proceeds automatically |
| OBJ-06 | Generate twice-monthly amortization schedules aligned to user-defined first-payment due dates |
| OBJ-07 | Apply late fees automatically and escalate delinquency statuses |
| OBJ-08 | Provide a real-time dashboard with KPIs: active loans, collections, overdue accounts, pending applications |
| OBJ-09 | Maintain an immutable audit trail of every state-changing operation |

---

## 3. Actors

### 3.1 Administrator (Super Admin)

System configuration, user account management, role assignments, payment type and release method administration. Unrestricted access to all data and audit logs.

### 3.2 Loan Officer

Registers and manages borrower (client) profiles. Creates loan applications with gross amount, term, and interest rate. Calculates net proceeds and generates amortization schedules. Submits applications for review. Views borrower loan history.

### 3.3 Approver

Reviews submitted loan applications. Moves applications through review states. Approves or rejects applications. Recalculates schedules on approval.

### 3.4 Cashier

Records loan releases with multiple disbursement methods. Uploads release proof images. Records borrower payments with method attribution. Payment auto-allocation to installments.

### 3.5 Collector

Views overdue and delinquent accounts. Updates collection statuses. Applies late fees. Tracks field collection follow-ups.

### 3.6 Borrower

Views own loan details, payment schedules, and balances. Views payment history. Uploads proof-of-payment screenshots.

---

## 4. User Stories

| ID | Actor | Story |
|----|-------|-------|
| US-01 | Administrator | As an admin, I want to configure payment types and release methods so the system reflects available channels |
| US-02 | Administrator | As an admin, I want to manage user accounts and assign roles so access is properly controlled |
| US-03 | Loan Officer | As a loan officer, I want to register borrowers with KYC details and documents so they can apply for loans |
| US-04 | Loan Officer | As a loan officer, I want to calculate loan terms including net proceeds and amortization so I can present accurate figures |
| US-05 | Loan Officer | As a loan officer, I want to create loan applications and submit them for review so the approval workflow can begin |
| US-06 | Approver | As an approver, I want to review submitted applications, request documents, and approve or reject them so only qualified loans proceed |
| US-07 | Cashier | As a cashier, I want to record loan releases with multiple disbursement methods and proof so the loan becomes active |
| US-08 | Cashier | As a cashier, I want to record borrower payments with method attribution so payments are tracked accurately |
| US-09 | Cashier | As a cashier, I want payments auto-allocated to the oldest unpaid installments so the ledger stays current |
| US-10 | Loan Officer | As a loan officer, I want to apply for a reloan where the existing loan balance is deducted from new net proceeds |
| US-11 | Collector | As a collector, I want to view all past-due accounts and apply late fees so delinquency is tracked |
| US-12 | Collector | As a collector, I want to update collection statuses as I follow up with borrowers |
| US-13 | Approver | As an approver, I want to process refund requests for overpayments so borrowers receive excess funds back |
| US-14 | Administrator | As an admin, I want to view the dashboard with KPIs so I can monitor the loan portfolio |
| US-15 | Borrower | As a borrower, I want to view my loan details, payment schedule, and remaining balance so I know when to pay |
| US-16 | Administrator | As an admin, I want every financial transaction logged in an audit trail so I can trace any discrepancy |

---

## 5. Functional Requirements

### 5.1 Authentication & Authorization

| ID | Requirement |
|----|-------------|
| FR-AUTH-01 | User registration with name, email, password |
| FR-AUTH-02 | Login returns Sanctum API token (plainTextToken) |
| FR-AUTH-03 | Token-based logout (revokes current token) |
| FR-AUTH-04 | Authenticated user profile endpoint (`GET /api/user`) |
| FR-AUTH-05 | All protected endpoints require `auth:sanctum` middleware |
| FR-AUTH-06 | Rate limiting: 60 requests/minute for auth endpoints |
| FR-AUTH-07 | Seven roles with permission-based access: Administrator, Loan Officer, Approver, Cashier, Collector, Auditor, Borrower |

### 5.2 Borrower Management (Clients)

| ID | Requirement |
|----|-------------|
| FR-CLIENT-01 | Full CRUD: list (paginated), create, read, update, soft-delete |
| FR-CLIENT-02 | Fields: name, address, work, work_address, contact_number, social_media (JSON), notes, photo |
| FR-CLIENT-03 | Photo upload stored on public disk; URL accessor for retrieval |
| FR-CLIENT-04 | Polymorphic document attachments (govt_id, payslip, COE, billing, bank_statement, other) |
| FR-CLIENT-05 | Document upload preserves original filename |
| FR-CLIENT-06 | Loan status aggregation: counts grouped by application_status and loan_status |
| FR-CLIENT-07 | Search clients by name |

### 5.3 Loan Origination

| ID | Requirement |
|----|-------------|
| FR-LOAN-01 | `POST /api/loans/calculate` — computes interest, net proceeds, installment amount, and amortization schedule without persisting |
| FR-LOAN-02 | Interest formula: `total_interest = amount × (rate / 100) × term_months` |
| FR-LOAN-03 | Net proceeds formula: `net_proceeds = amount - total_interest` |
| FR-LOAN-04 | Installments: `total_installments = term_months × 2` (twice monthly) |
| FR-LOAN-05 | Installment amount: `amount / total_installments` with rounding adjustment on last installment |
| FR-LOAN-06 | Schedule generation: 15-day intervals from user-defined first payment due date, or 15th/end-of-month when auto-computed |
| FR-LOAN-07 | Reloan calculation: if client_id provided, fetches active/past_due/delinquent loans, computes total_existing_balance, net_proceeds_after_deduction, and total_exposure |
| FR-LOAN-08 | `POST /api/loans` — creates a loan application (draft or submitted) |
| FR-LOAN-09 | Fields on loan: client_id, term_months, interest_rate_per_month, charges, charges_description, old_balance, first_payment_due_date, amount, total_interest, net_proceeds, installment_amount, total_installments, application_status |
| FR-LOAN-10 | `GET /api/loans` — list all loans with pagination, filterable by application_status, loan_status, client_id, and client name search |
| FR-LOAN-11 | `GET /api/loans/{id}` — show loan with client, documents, installments (with late fees), payments, and release sources |

### 5.4 Loan Approval Workflow

| ID | Requirement |
|----|-------------|
| FR-APPROVAL-01 | `PUT /api/loans/{id}/submit` — transitions application_status from `draft` to `submitted` |
| FR-APPROVAL-02 | `PUT /api/loans/{id}/review-status` — transitions between `submitted`, `under_review`, `pending_documents` |
| FR-APPROVAL-03 | `PUT /api/loans/{id}/approve` — generates installment schedule records, sets application_status to `approved`, loan_status to `waiting_for_release`, records approved_at timestamp. Approver may optionally modify amount, interest_rate_per_month, or term_months before final approval. |
| FR-APPROVAL-04 | `PUT /api/loans/{id}/reject` — sets application_status to `rejected` |
| FR-APPROVAL-05 | `PUT /api/loans/{id}/cancel` — cancels applications in draft/submitted/under_review only |
| FR-APPROVAL-06 | `PUT /api/loans/{id}` — edit loan details only in `waiting_for_release` status; recalculates and regenerates schedule |
| FR-APPROVAL-07 | Segregation of duties: the user who creates a loan application (Loan Officer) cannot approve the same application; a different user with Approver role is required |

### 5.5 Loan Release

| ID | Requirement |
|----|-------------|
| FR-RELEASE-01 | `PUT /api/loans/{id}/release` — transitions from `waiting_for_release` to `active`, records released_at |
| FR-RELEASE-02 | Release requires one or more sources with release_method, amount, optional proof_image, optional notes |
| FR-RELEASE-03 | Release methods validated against active payment_types where category = `release_method` |
| FR-RELEASE-04 | Total of all release source amounts must equal `net_proceeds - charges - old_balance` (within 0.01 tolerance) |
| FR-RELEASE-05 | Release proof images stored under `releases/{loan_id}/` on public disk |
| FR-RELEASE-06 | Installments with due_date <= today are set to `due` status on release |
| FR-RELEASE-07 | Release sources can have their proof image added or removed independently after release |

### 5.6 Payments

| ID | Requirement |
|----|-------------|
| FR-PAYMENT-01 | `POST /api/loans/{id}/payments` — records payment with amount, payment_method, payment_date, notes |
| FR-PAYMENT-02 | Payment methods: Cash, GCash, BPI, BDO, Other Banks (free-text string field) |
| FR-PAYMENT-03 | Proof-of-payment screenshot is optional for all payment methods (PNG/JPG/PDF, max 10MB); stored as document attachment on the payment |
| FR-PAYMENT-04 | Auto-allocation: payment amount applied sequentially to oldest unpaid installments |
| FR-PAYMENT-05 | Installment status set to `paid` when paid_amount reaches full amount; `partially_paid` when partially covered |
| FR-PAYMENT-06 | Loan status transitions to `fully_paid` and closed_at set when remaining_balance reaches 0 |
| FR-PAYMENT-07 | `GET /api/loans/{id}/payments` — list all payments for a loan ordered by payment_date descending |

### 5.7 Late Fees & Delinquency

| ID | Requirement |
|----|-------------|
| FR-LATE-01 | `POST /api/loans/apply-late-fees` — scheduled/manual trigger to apply late fees |
| FR-LATE-02 | PHP 500 late fee per overdue installment, recurring monthly while the installment remains unpaid |
| FR-LATE-03 | Installment statuses: `pending` → `due` (on release if due_date passed) → `overdue` (on late fee application) → `missed` (60+ days overdue) |
| FR-LATE-04 | Loans with overdue installments: `active` → `past_due` |
| FR-LATE-05 | Loans with 90+ days overdue installments: escalate to `defaulted` |
| FR-LATE-06 | Loan status recovery: `past_due` → `active` when payment catches up so no installments remain overdue |
| FR-LATE-07 | `GET /api/loans/past-due` — paginated list of past-due loans with overdue installment details, days overdue, and accumulated late fees |
| FR-LATE-08 | Collection status tracking: `reminder_sent` → `promise_to_pay` → `under_collection` → `legal_action` → `settled` |
| FR-LATE-09 | `PUT /api/loans/{id}/collection-status` — update collection_status independently |

### 5.8 Dashboard

| ID | Requirement |
|----|-------------|
| FR-DASH-01 | `GET /api/dashboard` — summary KPIs: total clients, active loans, pending applications, completed loans, defaulted loans, total collections, expected repayments, due/overdue installments, total late fees |
| FR-DASH-02 | Recent loans: last 5 loans with client details |
| FR-DASH-03 | Upcoming due installments: next 10 pending/due installments with loan and client info |

### 5.9 Payment Types

| ID | Requirement |
|----|-------------|
| FR-PTYPE-01 | `GET /api/payment-types` — list all with pagination |
| FR-PTYPE-02 | `POST /api/payment-types` — create with name, category (`payment_method` or `release_method`), is_active |
| FR-PTYPE-03 | `GET /api/payment-types/{id}` — read single type |
| FR-PTYPE-04 | `PUT /api/payment-types/{id}` — update type |
| FR-PTYPE-05 | `DELETE /api/payment-types/{id}` — delete type |
| FR-PTYPE-06 | Unique constraint on (name, category) |

### 5.10 Reloan

| ID | Requirement |
|----|-------------|
| FR-RELOAN-01 | During loan calculation, if client_id is provided, system fetches all active/past_due/delinquent loans |
| FR-RELOAN-02 | Existing loan remaining balances summed as `total_existing_balance` |
| FR-RELOAN-03 | `net_proceeds_after_deduction = max(0, net_proceeds - total_existing_balance)` |
| FR-RELOAN-04 | `total_exposure = new_loan_amount + total_existing_balance` |
| FR-RELOAN-05 | On reloan release, all existing active/past_due/delinquent loans for the borrower are automatically marked `fully_paid` with `closed_at` set to the release timestamp |

### 5.11 Refund *(Future Phase)*

Refund processing is deferred to a future release. Overpayments are tracked but handled manually.

| ID | Requirement |
|----|-------------|
| FR-REFUND-01 | Overpayment detection when total payments exceed loan amount + late fees (tracked for reference) |
| FR-REFUND-02 | Refund workflow (future): Request → Verification → Approval → Release → Completed |
| FR-REFUND-03 | Refund reason and approver audit trail required (future) |

---

## 6. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | API response time < 2 seconds for all endpoints (p95) |
| NFR-02 | Security | All endpoints use HTTPS in staging and production |
| NFR-03 | Security | Passwords hashed with Bcrypt via Laravel Hash facade |
| NFR-04 | Security | CSRF protection via Sanctum SPA authentication for web |
| NFR-05 | Security | All input validated through Form Request classes |
| NFR-06 | Auditability | All state-changing financial operations logged with actor, action, entity, old/new state, timestamp, IP |
| NFR-07 | Auditability | Financial records use soft deletes; no record ever permanently removed |
| NFR-08 | Data Integrity | All monetary values stored as `decimal(12,2)`; never float |
| NFR-09 | Availability | System supports offline queuing on mobile apps with sync-on-connect |
| NFR-10 | Testing | Minimum 80% code coverage for business logic; exhaustive edge-case tests for financial calculations |
| NFR-11 | Cross-Platform | Responsive Web (React 19 + Bootstrap 5.3), Android (Flutter), iOS (Flutter) |
| NFR-12 | Code Quality | PHPStan level 6, PSR-12 via Pint, ESLint flat config, TypeScript strict mode |
| NFR-13 | API | Consistent JSON response envelope: `{ success: bool, data: T, error: string|null }` |
| NFR-14 | Error Codes | Standard HTTP codes: 200, 201, 400, 401, 403, 404, 422, 500 |

---

## 7. Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-01 | User can register, login, and receive a valid Sanctum API token |
| AC-02 | Authenticated endpoints reject requests without valid tokens (401) |
| AC-03 | Borrower can be created with all fields; documents can be attached |
| AC-04 | Loan calculator returns correct interest (amount × rate% × term), net proceeds, and 2-installments/month schedule |
| AC-05 | Net proceeds include reloan deduction when client has existing active loans |
| AC-06 | Loan application transitions through: draft → submitted → (under_review) → approved → waiting_for_release |
| AC-07 | Approved loans have installment records with correct amounts and due dates |
| AC-08 | Rejected applications cannot be released or edited |
| AC-09 | Loan release validates total source amounts equal net proceeds minus charges minus old balance |
| AC-10 | Released loan becomes active; past-due installments set to `due` status |
| AC-11 | Payment allocated to oldest unpaid installment first; status updates to `paid` or `partially_paid` |
| AC-12 | Fully paid loan transitions to `fully_paid` with `closed_at` timestamp |
| AC-13 | Late fee of PHP 500 applied to each overdue installment for each month it remains unpaid |
| AC-14 | 60+ days overdue installments escalate to `missed` status; 90+ days triggers `defaulted` on the loan |
| AC-15 | Past-due endpoint returns loans with overdue installment details, days late, and late fee totals |
| AC-16 | Dashboard shows accurate real-time KPI counts and totals |
| AC-17 | Payment types CRUD enforces unique name + category |
| AC-18 | Loan status recovers from `past_due` to `active` when payment brings all installments current |
| AC-19 | Loan Officer cannot approve their own loan application (segregation of duties) |
| AC-20 | Approver can modify loan amount, rate, or term during approval; schedule regenerates accordingly |
| AC-21 | Reloan release automatically closes all existing active loans for the borrower |
| AC-22 | Late fee applied on a per-month basis: a second PHP 500 is added if the installment remains unpaid into the next calendar month |

---

## 8. Business Rules

| # | Rule |
|---|------|
| BR-01 | **Default interest rate**: 10% per month unless configured otherwise |
| BR-02 | **Maximum loan term**: 5 months |
| BR-03 | **Payment frequency**: Twice per month (15-day intervals) |
| BR-04 | **Net Proceeds**: `Gross Loan - Total Interest` (interest deducted up-front) |
| BR-05 | **Actual Release**: `Net Proceeds - Charges - Old Balance` from prior loans |
| BR-06 | **Reloan deduction**: Outstanding principal, unpaid interest, charges, and fees of existing active loans deducted from new net proceeds |
| BR-07 | **Late charge**: PHP 500 per overdue month per installment, recurring every month the installment remains unpaid |
| BR-08 | **Accepted payments**: Cash, GCash, BPI, BDO, and other supported banks |
| BR-09 | **Online payments**: Proof-of-payment screenshot is optional; can be uploaded for any payment method |
| BR-10 | **Excess collections**: Create refundable credit after approval |
| BR-11 | **Audit logging**: All financial transactions must be audit-logged with full state change details |
| BR-12 | **Interest computed server-side**: Never overridable by client |

---

## 9. Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| EC-01 | Zero-amount loan calculation | Validation rejects amount < 1 |
| EC-02 | Term exceeds 5 months | Validation rejects term > 5 on create; calculator supports half-month steps (0.5–5.0 months = 1–10 installments) |
| EC-03 | Client has multiple active loans | Calculator sums all remaining balances; net_proceeds_after_deduction may be 0 |
| EC-04 | Existing balance exceeds new net proceeds | net_proceeds_after_deduction = 0; borrower receives nothing; existing loans still active |
| EC-05 | Release source amounts do not match net | Error AMOUNT_MISMATCH returned (422); no partial release |
| EC-06 | Payment exactly covers installment | Installment status = `paid`, paid_at set, remaining payment advances to next installment |
| EC-07 | Payment exceeds total remaining | All installments paid; loan → `fully_paid`; excess amount becomes refundable overpayment |
| EC-08 | Installment due date before today on release | Installment set to `due` status immediately |
| EC-09 | Multiple late fees on same installment | New late fee of PHP 500 applied each month the installment remains unpaid; no cap |
| EC-10 | 60+ days overdue | Installment status escalates to `missed` |
| EC-11 | Application status transitions from invalid state | Error INVALID_TRANSITION (422) returned |
| EC-12 | Edit loan after release | Blocked; only `waiting_for_release` loans can be edited |
| EC-13 | Rounding adjustment on schedule | Last installment adjusted so sum of installments exactly equals principal |
| EC-14 | Proof image upload for release deleted and re-uploaded | Old image deleted from disk; new image stored |
| EC-15 | Payment catches up all overdue installments | Loan status recovers: `past_due` → `active` |
| EC-16 | Installment 90+ days overdue | On late fee application, loan escalates to `defaulted` |
| EC-17 | Loan Officer attempts to approve own application | Error returned (422); segregation of duties enforced |
| EC-18 | Approver modifies amount/rate/term during approval | Schedule regenerated with new values before approval commits |
| EC-19 | Reloan released with old_balance > 0 | All existing active/past_due/delinquent loans auto-closed (fully_paid, closed_at = now) |
| EC-20 | Late fee applied monthly to same installment | New PHP 500 fee created each calendar month the installment remains unpaid |

---

## 10. Workflows

### 10.1 Loan Application Statuses

```
┌───────┐    submit    ┌───────────┐  review-status   ┌──────────────┐  review-status   ┌───────────────────┐
│ Draft │ ──────────>  │ Submitted │ ───────────────>  │ Under Review │ ───────────────>  │ Pending Documents │
└───┬───┘              └─────┬─────┘  <───────────────  └──────┬───────┘  <───────────────  └────────┬──────────┘
    │                        │                                  │                                │
    │                        ├──────── approve ────────────────>│                                │
    │                        │                                  │                                │
    │                        ├──────── reject ─────────────────>│──────────  ... ────────────────>│
    │                        │                                  │                                │
    │ cancel                 │ cancel                           │ cancel                         │ cancel
    ▼                        ▼                                  ▼                                ▼
┌───────────┐          ┌──────────┐                         ┌──────────┐
│ Cancelled │          │ Rejected │                         │ Approved │
└───────────┘          └──────────┘                         └────┬─────┘
                                                                │
                                                        loan_status set to
                                                        waiting_for_release
```

#### Application Status Values

| Status | Description |
|--------|-------------|
| `draft` | Application being prepared, not yet submitted |
| `submitted` | Submitted for review |
| `under_review` | Under active review by approver |
| `pending_documents` | Awaiting additional documents from borrower |
| `approved` | Application approved; loan_status set to `waiting_for_release` |
| `rejected` | Application denied |
| `cancelled` | Application withdrawn |

### 10.2 Loan Lifecycle Statuses

```
                                          ┌──────────────┐
                                          │  fully_paid  │
                                          └──────┬───────┘
                                                 │ closed_at set
                                                 ▼
                                          ┌──────────────┐
                                          │    closed    │
                                          └──────────────┘
                                                 ▲
                                                 │
waiting_for_release ── release() ──> active ─────┤
       ▲                               │  │       │
       │                               │  │       │
  approve()                     payments  │  payments
       │                          catch    │  exceed
       │                           up      │  total
       │                               │  │
┌──────┴──────┐                        ▼  ▼
│  approved   │              ┌──────────────┐
└─────────────┘              │  past_due    │
                             └──┬───┬───┬───┘
                                │   │   │
               90+ days overdue │   │   │ payments catch up
                                │   │   └──────────────┐
                                ▼   │                  │
                       ┌──────────┐ │                  ▼
                       │defaulted │ │            ┌──────────┐
                       └──────────┘ │            │  active  │
                                    │            └──────────┘
                           severity │
                                    ▼
                             ┌────────────┐
                             │ delinquent │
                             └─────┬──────┘
                                   │
                          payments │
                          catch up │
                                   ▼
                             ┌──────────┐
                             │  active  │
                             └──────────┘
```

#### Loan Status Values

| Status | Description |
|--------|-------------|
| `waiting_for_release` | Approved but funds not yet disbursed |
| `released` | Funds disbursed but not yet active (transitional) |
| `active` | Loan is active and in repayment; all installments current |
| `past_due` | One or more installments are overdue; recovers to `active` when all installments brought current |
| `delinquent` | Severely overdue; collections active |
| `restructured` | Loan terms have been restructured |
| `fully_paid` | Full loan amount paid; closed_at is set |
| `closed` | Terminal state; synonymous with fully_paid for all practical purposes |
| `defaulted` | 90+ days overdue on installments; triggered automatically by late fee application |

### 10.3 Installment Statuses

| Status | Description |
|--------|-------------|
| `pending` | Not yet due |
| `due` | Due date has passed but within grace period |
| `paid` | Fully paid |
| `partially_paid` | Partial payment received |
| `overdue` | Past due and late fee applied |
| `missed` | 60+ days overdue |

### 10.4 Collection Statuses

| Status | Description |
|--------|-------------|
| `reminder_sent` | Payment reminder sent to borrower |
| `promise_to_pay` | Borrower has committed to a payment date |
| `under_collection` | Active collection efforts underway |
| `legal_action` | Legal proceedings initiated |
| `settled` | Collection matter resolved |

### 10.5 Payment Flow

```
Borrower/Cashier records payment
          │
          ▼
┌─────────────────────────┐
│ Payment record created   │
│ amount, method, date    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Auto-allocation begins   │
│ Fetch unpaid installments│
│ ordered by number ASC    │
└───────────┬─────────────┘
            │
            ▼
    ┌───────────────┐     YES     ┌───────────────────┐
    │ Remaining > 0? │ ────────>   │ Allocate to next   │
    └───────┬───────┘              │ unpaid installment │
            │ NO                   └─────────┬─────────┘
            ▼                                │
    ┌───────────────┐                        ▼
    │ Allocation     │              ┌───────────────────┐
    │ complete       │              │ Partial or full?   │
    └───────┬───────┘              └───┬───────────┬───┘
            │                          │           │
            ▼                     FULL │           │ PARTIAL
┌───────────────────────┐              │           │
│ Check remaining balance│             ▼           ▼
└───────────┬───────────┘    ┌──────────┐  ┌──────────────┐
     = 0    │     > 0        │ status = │  │ status =     │
            │                │ paid     │  │ partially_   │
            ▼                │ paid_at  │  │ paid         │
   ┌────────────────┐       │ = now    │  └──────────────┘
   │ loan_status =  │       └────┬─────┘
   │ fully_paid     │            │
   │ closed_at=now  │            ▼
   └────────────────┘   ┌───────────────────────┐
                         │ Check overdue status   │
                         │ Any installment still  │
                         │ overdue?               │
                         └───────┬───────┬───────┘
                             YES │       │ NO
                                 ▼       ▼
                          ┌──────────┐ ┌──────────┐
                          │ no change│ │loan_status│
                          │ (stays   │ │ = active │
                          │ past_due)│ │(recovery)│
                          └──────────┘ └──────────┘
```

### 10.6 Reloan Flow

```
Loan Officer initiates new loan for existing borrower
          │
          ▼
┌─────────────────────────────────────┐
│ POST /api/loans/calculate            │
│ Provide: amount, term, rate,         │
│          client_id (required for     │
│          reloan calculation)         │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ System fetches all active/past_due/  │
│ delinquent loans for this client     │
│ Computes total_existing_balance      │
│ Computes net_proceeds_after_deduction│
│ Computes total_exposure              │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ Response includes:                   │
│ - Standard loan calculation          │
│ - existing_loans[] (each with        │
│   id, amount, remaining_balance,     │
│   loan_status)                       │
│ - total_existing_balance             │
│ - net_proceeds_after_deduction       │
│   = max(0, net_proceeds - total      │
│     existing_balance)                │
│ - total_exposure                     │
│   = new_amount + total_existing      │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ Loan Officer reviews and submits     │
│ New loan created with:               │
│ - charges / charges_description      │
│   for any additional fees            │
│ - old_balance = total_existing       │
│   balance (for reference)            │
│ - first_payment_due_date aligned     │
│   to payroll cut-off                 │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ On release:                          │
│ Actual release amount =              │
│ net_proceeds - charges - old_balance │
│                                      │
│ Existing active/past_due/delinquent  │
│ loans are auto-closed:               │
│ - loan_status = fully_paid           │
│ - closed_at = now()                  │
│                                      │
│ Borrower's total exposure is now     │
│ the new loan only                    │
└─────────────────────────────────────┘
```

### 10.7 Refund Flow *(Future Phase)*

```
Overpayment detected (total payments > loan amount + charges)
          │
          ▼
┌───────────────────────┐
│ Request refund         │
│ Reason documented      │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ Verification           │
│ - Verify overpayment   │
│   amount               │
│ - Confirm no remaining │
│   obligations          │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ Approval               │
│ Approver reviews and   │
│ authorizes refund      │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ Release                │
│ Funds disbursed via    │
│ selected method        │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ Completed              │
│ Audit trail recorded   │
│ Refund reason +        │
│ approver documented    │
└───────────────────────┘
```

### 10.8 Notification Flow

```
Event Triggers                        Channels
──────────────────────────────────────────────────
Loan Approved         ───────────>   In-App + Email

Payment Due           ───────────>   In-App + Email
(3 days before)                      + SMS (optional)

Payment Posted        ───────────>   In-App + Email

Overdue               ───────────>   In-App + Email
(1 day after due)                    + SMS (optional)

Refund Approved       ───────────>   In-App + Email

Reloan Approved       ───────────>   In-App + Email
```

### 10.9 Audit Trail

```
Every state-changing operation logged:

┌──────────────┬──────────────────────────────────────┐
│ Field         │ Description                          │
├──────────────┼──────────────────────────────────────┤
│ actor         │ User who performed the action        │
│ action        │ create / update / delete / approve   │
│               │ release / cancel / reject            │
│ entity        │ Model type + ID of affected record   │
│ old_state     │ JSON snapshot before change          │
│ new_state     │ JSON snapshot after change           │
│ timestamp     │ When the action occurred             │
│ ip_address    │ Client IP address                    │
└──────────────┴──────────────────────────────────────┘

Operations captured:
- Loan creation, submission, approval, rejection, cancellation
- Loan release (including all release sources)
- Reloan release with automatic closure of old loans
- Payment recording and auto-allocation
- Late fee application (monthly recurring)
- Loan status transitions (active, past_due, delinquent, defaulted, fully_paid)
- Status recovery (past_due → active on payment catch-up)
- Collection status changes
- Refund requests, approvals, and releases (future phase)
- Borrower profile changes
- Document uploads and deletions
```

---

## 11. Data Model Summary

### 11.1 Core Tables

| Table | Key Columns |
|-------|------------|
| `users` | id, name, email, password, email_verified_at, role |
| `clients` | id, name, address, work, work_address, contact_number, social_media (JSON), notes, photo, softDeletes |
| `loans` | id, client_id, term_months, interest_rate_per_month, charges, charges_description, old_balance, first_payment_due_date, application_status, loan_status, collection_status, amount, total_interest, net_proceeds, installment_amount, total_installments, approved_at, released_at, closed_at, softDeletes |
| `loan_installments` | id, loan_id, installment_number, due_date, amount, paid_amount, status, paid_at |
| `late_fees` | id, loan_installment_id, amount, applied_at |
| `payments` | id, loan_id, client_id, amount, payment_method, payment_date, notes |
| `loan_release_sources` | id, loan_id, release_method, amount, proof_image, notes |
| `documents` | id, documentable_type (polymorphic), documentable_id, type, file_path, original_name |
| `payment_types` | id, name, category, is_active |
| `personal_access_tokens` | id, tokenable_type, tokenable_id, name, token, abilities, last_used_at, expires_at |

### 11.2 Monetary Precision

All financial columns use `decimal(12,2)` — 12 total digits, 2 decimal places. Float is never used for currency values.

### 11.3 Soft Deletes

The following tables use Laravel's `SoftDeletes` trait (records are never permanently removed):
- `clients`
- `loans`

---

## 12. API Endpoint Reference

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/register` | User registration |
| `POST` | `/api/login` | User login |
| `GET` | `/api/documents/{document}/view` | View document file |

### Authenticated Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/logout` | Logout (revoke token) |
| `GET` | `/api/user` | Current user profile |
| `GET` | `/api/dashboard` | Dashboard KPIs |
| `GET` | `/api/clients` | List clients (paginated) |
| `POST` | `/api/clients` | Create client |
| `GET` | `/api/clients/{client}` | Show client |
| `PUT` | `/api/clients/{client}` | Update client |
| `DELETE` | `/api/clients/{client}` | Soft-delete client |
| `GET` | `/api/clients/{client}/documents` | List client documents |
| `POST` | `/api/clients/{client}/documents` | Upload client document |
| `DELETE` | `/api/documents/{document}` | Delete document |
| `POST` | `/api/loans/calculate` | Calculate loan terms |
| `GET` | `/api/loans` | List loans (filterable) |
| `POST` | `/api/loans` | Create loan application |
| `GET` | `/api/loans/{loan}` | Show loan details |
| `PUT` | `/api/loans/{loan}` | Update loan (waiting_for_release only) |
| `PUT` | `/api/loans/{loan}/submit` | Submit application |
| `PUT` | `/api/loans/{loan}/approve` | Approve application |
| `PUT` | `/api/loans/{loan}/reject` | Reject application |
| `PUT` | `/api/loans/{loan}/release` | Release loan |
| `PUT` | `/api/loans/{loan}/cancel` | Cancel application |
| `PUT` | `/api/loans/{loan}/review-status` | Update review status |
| `PUT` | `/api/loans/{loan}/collection-status` | Update collection status |
| `GET` | `/api/loans/past-due` | List past-due loans |
| `POST` | `/api/loans/apply-late-fees` | Apply late fees to overdue installments |
| `POST` | `/api/loans/{loan}/release-sources/{source}/proof` | Upload release source proof |
| `DELETE` | `/api/loans/{loan}/release-sources/{source}/proof` | Remove release source proof |
| `GET` | `/api/loans/{loan}/payments` | List loan payments |
| `POST` | `/api/loans/{loan}/payments` | Record loan payment |
| `GET` | `/api/payment-types` | List payment types |
| `POST` | `/api/payment-types` | Create payment type |
| `GET` | `/api/payment-types/{type}` | Show payment type |
| `PUT` | `/api/payment-types/{type}` | Update payment type |
| `DELETE` | `/api/payment-types/{type}` | Delete payment type |

---

**Version**: 1.0.0 | **Date**: 2026-08-04
