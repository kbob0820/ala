# Ajang Loan System — Implementation Plan

## Phase 0 — Foundation: Architecture Compliance

### Current State vs. Target State

| Layer | Required by Constitution | Current State | Gap |
|-------|-------------------------|---------------|-----|
| Controllers | Thin, no business logic | Contains business logic in LoanController, PaymentController | **Partial** — refactor needed |
| Form Requests | One per endpoint | 6 exist; missing for approve, release, reject, cancel, calculate | **Missing 6+** |
| Services | All business rules, stateless | Only `LoanCalculatorService` exists | **Missing**: LoanService, PaymentService, LateFeeService, ReloanService, ClientService, DashboardService, AuditService |
| Repositories | DB access abstraction | **Does not exist at all** | **Missing all** |
| Models | Relationships, casts, scopes only | Current models have business logic (isOverdue, totalLateFees) | **Partial** — minor refactor |
| RBAC | 7 roles with permissions | No roles table, no permissions, no middleware | **Missing entirely** |
| Audit Trail | All state-changing operations logged | No audit_logs table, no service | **Missing entirely** |
| Swagger | API documentation | None | **Missing entirely** |
| Docker | Containerized dev environment | None | **Missing entirely** |

---

## 1. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                               │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │  React 19 (Web)  │  │ Flutter (iOS)│  │  Flutter (Android)   │ │
│  │  Bootstrap 5.3   │  │              │  │                      │ │
│  └────────┬────────┘  └──────┬───────┘  └──────────┬───────────┘ │
│           │                  │                       │            │
│           └──────────────────┼───────────────────────┘            │
│                              │ HTTPS                              │
│                              ▼                                    │
└──────────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────┼────────────────────────────────────┐
│                      GATEWAY LAYER                                │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Nginx (reverse proxy, TLS termination, static file serving) │ │
│  └──────────────────────────┬───────────────────────────────────┘ │
└──────────────────────────────┼────────────────────────────────────┘
                               │
┌──────────────────────────────┼────────────────────────────────────┐
│                   APPLICATION LAYER (Laravel 12)                  │
│                              │                                    │
│  ┌───────────────────────────▼──────────────────────────────┐    │
│  │                   HTTP LAYER                              │    │
│  │  ┌────────────┐  ┌───────────────┐  ┌─────────────────┐  │    │
│  │  │  Routes    │──│  Middleware    │──│  Controllers    │  │    │
│  │  │  (api.php) │  │  auth:sanctum  │  │  (thin, no BL)  │  │    │
│  │  │            │  │  role:{role}   │  │                 │  │    │
│  │  └────────────┘  └───────────────┘  └────────┬────────┘  │    │
│  │  ┌───────────────────────────────────────────┐│          │    │
│  │  │  Form Requests (validation + auth)        ││          │    │
│  │  └───────────────────────────────────────────┘│          │    │
│  └───────────────────────────────────────────────┼──────────┘    │
│                                                   │               │
│  ┌────────────────────────────────────────────────▼───────────┐  │
│  │                   SERVICE LAYER                             │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐ │  │
│  │  │ LoanService  │ │PaymentService│ │LateFeeService      │ │  │
│  │  └──────┬───────┘ └──────┬───────┘ └────────┬───────────┘ │  │
│  │  ┌──────┴───────┐ ┌──────┴───────┐ ┌────────┴───────────┐ │  │
│  │  │ReloanService │ │ClientService │ │DashboardService    │ │  │
│  │  └──────┬───────┘ └──────┬───────┘ └────────┬───────────┘ │  │
│  │  ┌──────┴───────┐ ┌──────┴───────┐ ┌────────┴───────────┐ │  │
│  │  │AuditService  │ │NotifyService │ │LoanCalculatorSvc   │ │  │
│  │  └──────────────┘ └──────────────┘ └────────────────────┘ │  │
│  └───────────────────────────────────────────┬───────────────┘  │
│                                               │                  │
│  ┌────────────────────────────────────────────▼──────────────┐  │
│  │              REPOSITORY LAYER                              │  │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐  │  │
│  │  │LoanRepo   │ │ClientRepo │ │PaymentRepo│ │LateFeeRepo│  │  │
│  │  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘  │  │
│  │  ┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐  │  │
│  │  │InstallRepo│ │DocRepo    │ │PTypeRepo  │ │AuditRepo  │  │  │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘  │  │
│  └───────────────────────────────────────────┬───────────────┘  │
│                                               │                  │
│  ┌────────────────────────────────────────────▼──────────────┐  │
│  │              MODEL / ORM LAYER                             │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────────────┐  │  │
│  │  │ User   │ │ Client │ │ Loan   │ │ LoanInstallment    │  │  │
│  │  │ (RBAC) │ │        │ │        │ │ LateFee            │  │  │
│  │  └────────┘ └────────┘ └────────┘ │ Payment            │  │  │
│  │  ┌────────┐ ┌────────────────────┐ │ LoanReleaseSource  │  │  │
│  │  │AuditLog│ │ Document (poly)    │ │ PaymentType        │  │  │
│  │  └────────┘ └────────────────────┘ └────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────┼────────────────────────────────────┐
│                      DATA LAYER                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐    │
│  │  MySQL 8 │  │  Redis 7 │  │  Storage │  │  Scheduler    │    │
│  │ (primary)│  │(cache/Q) │  │  (S3/pub)│  │ (late fees)   │    │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

### Dependency Direction (Clean Architecture)

```
Controllers ──> Form Requests ──> Services ──> Repositories ──> Models
     │                │               │              │             │
     │                │               │              │             ▼
     │                │               │              │        Database
     │                │               │              │
     ▼                ▼               ▼              ▼
  Response         Validation      Business      Data Access
  Formatting       & Auth          Logic         Abstraction
```

**Strict rule**: No layer may reference a layer above it. Controllers never query Models directly. Services never use `request()` helper. Repositories never format HTTP responses.

---

## 2. Folder Structure

```
apps/backend/
├── app/
│   ├── Console/
│   │   └── Commands/
│   │       └── ApplyLateFees.php              # Scheduled command (NEW)
│   ├── Enums/
│   │   ├── ApplicationStatus.php              # (NEW)
│   │   ├── LoanStatus.php                     # (NEW)
│   │   ├── InstallmentStatus.php              # (NEW)
│   │   ├── CollectionStatus.php               # (NEW)
│   │   └── UserRole.php                       # (NEW)
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Controller.php
│   │   │   └── Api/
│   │   │       ├── AuthController.php         # (EXISTING - refactor)
│   │   │       ├── ClientController.php       # (EXISTING - refactor)
│   │   │       ├── DashboardController.php    # (EXISTING - refactor)
│   │   │       ├── DocumentController.php     # (EXISTING)
│   │   │       ├── HealthCheckController.php  # (EXISTING)
│   │   │       ├── LoanController.php         # (EXISTING - major refactor)
│   │   │       ├── PaymentController.php      # (EXISTING - refactor)
│   │   │       └── PaymentTypeController.php  # (EXISTING - refactor)
│   │   ├── Middleware/
│   │   │   ├── RoleMiddleware.php             # (NEW)
│   │   │   └── AuditLogMiddleware.php         # (NEW)
│   │   └── Requests/
│   │       ├── Auth/
│   │       │   ├── LoginRequest.php           # (EXISTING)
│   │       │   └── RegisterRequest.php        # (EXISTING)
│   │       ├── Client/
│   │       │   ├── StoreClientRequest.php     # (EXISTING)
│   │       │   └── UpdateClientRequest.php    # (EXISTING)
│   │       ├── Loan/
│   │       │   ├── CalculateLoanRequest.php   # (NEW)
│   │       │   ├── StoreLoanRequest.php       # (EXISTING - update)
│   │       │   ├── ApproveLoanRequest.php     # (NEW)
│   │       │   ├── ReleaseLoanRequest.php     # (NEW)
│   │       │   ├── RejectLoanRequest.php      # (NEW)
│   │       │   └── UpdateLoanRequest.php      # (NEW)
│   │       └── Payment/
│   │           └── StorePaymentRequest.php    # (EXISTING - update for proof)
│   ├── Models/
│   │   ├── User.php                           # (EXISTING - add role rel)
│   │   ├── Role.php                           # (NEW)
│   │   ├── Client.php                         # (EXISTING)
│   │   ├── Document.php                       # (EXISTING)
│   │   ├── Loan.php                           # (EXISTING - add created_by)
│   │   ├── LoanInstallment.php                # (EXISTING - move isOverdue to service)
│   │   ├── LateFee.php                        # (EXISTING)
│   │   ├── Payment.php                        # (EXISTING - add proof field)
│   │   ├── PaymentType.php                    # (EXISTING)
│   │   ├── LoanReleaseSource.php              # (EXISTING)
│   │   └── AuditLog.php                       # (NEW)
│   ├── Providers/
│   │   ├── AppServiceProvider.php             # (EXISTING - register new bindings)
│   │   ├── RepositoryServiceProvider.php      # (NEW - repo interface bindings)
│   │   └── SwaggerServiceProvider.php         # (NEW)
│   ├── Repositories/                          # (NEW - entire layer)
│   │   ├── Contracts/
│   │   │   ├── LoanRepositoryInterface.php
│   │   │   ├── ClientRepositoryInterface.php
│   │   │   ├── PaymentRepositoryInterface.php
│   │   │   ├── InstallmentRepositoryInterface.php
│   │   │   ├── LateFeeRepositoryInterface.php
│   │   │   ├── DocumentRepositoryInterface.php
│   │   │   ├── PaymentTypeRepositoryInterface.php
│   │   │   ├── AuditLogRepositoryInterface.php
│   │   │   └── UserRepositoryInterface.php
│   │   └── Eloquent/
│   │       ├── LoanRepository.php
│   │       ├── ClientRepository.php
│   │       ├── PaymentRepository.php
│   │       ├── InstallmentRepository.php
│   │       ├── LateFeeRepository.php
│   │       ├── DocumentRepository.php
│   │       ├── PaymentTypeRepository.php
│   │       ├── AuditLogRepository.php
│   │       └── UserRepository.php
│   └── Services/                              # (EXPAND - 5 new services)
│       ├── BaseService.php                    # (NEW - shared audit/notify helpers)
│       ├── LoanCalculatorService.php          # (EXISTING - update for defaulted trigger)
│       ├── LoanService.php                    # (NEW - orchestration)
│       ├── PaymentService.php                 # (NEW - allocation logic)
│       ├── LateFeeService.php                 # (NEW - recurring monthly logic)
│       ├── ReloanService.php                  # (NEW - auto-close old loans)
│       ├── ClientService.php                  # (NEW)
│       ├── DashboardService.php               # (NEW)
│       ├── AuditService.php                   # (NEW - logging)
│       └── NotificationService.php            # (NEW - event dispatching)
├── config/
│   └── l5-swagger.php                         # (NEW)
├── database/
│   └── migrations/
│       ├── 2026_08_04_000001_create_roles_table.php        # (NEW)
│       ├── 2026_08_04_000002_add_role_id_to_users.php      # (NEW)
│       ├── 2026_08_04_000003_create_audit_logs_table.php   # (NEW)
│       ├── 2026_08_04_000004_add_created_by_to_loans.php   # (NEW)
│       └── 2026_08_04_000005_add_proof_to_payments.php     # (NEW)
└── routes/
    └── api.php                               # (EXISTING - add role middleware)

apps/frontend/
└── src/
    ├── components/
    │   ├── Layout.tsx                         # (EXISTING)
    │   ├── ProtectedRoute.tsx                 # (EXISTING - add role check)
    │   └── ProofUpload.tsx                    # (NEW)
    ├── hooks/
    │   ├── useAuth.tsx                        # (EXISTING - add role/perms)
    │   └── usePermissions.ts                  # (NEW)
    ├── pages/
    │   └── (14 pages, all EXISTING)
    ├── services/
    │   ├── api.ts                             # (EXISTING)
    │   └── (8 services, all EXISTING)
    └── types/
        └── index.ts                           # (EXISTING - update)
```

---

## 3. Database

### 3.1 Entity Relationship Diagram

```
┌──────────┐       ┌──────────────────┐
│   roles  │       │       users      │
│──────────│       │──────────────────│
│ id (PK)  │◄──────│ role_id (FK)     │
│ name     │       │ id (PK)          │
│ slug     │       │ name             │
└──────────┘       │ email            │
                   │ password         │
                   └────────┬─────────┘
                            │ created_by
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                            loans                                │
│─────────────────────────────────────────────────────────────────│
│ id (PK)           │ application_status │ net_proceeds           │
│ client_id (FK)    │ loan_status        │ installment_amount     │
│ created_by (FK) ──► users              │ total_installments     │
│ approved_by (FK) ─► users              │ approved_at            │
│ term_months       │ interest_rate      │ released_at            │
│ amount            │ total_interest     │ closed_at              │
│ charges           │ charges_desc       │ old_balance            │
│ first_due_date    │ collection_status  │ deleted_at (soft)      │
└──┬──────────┬─────────┬────────────────────────────────────────┘
   │          │         │
   │          │         └──────────────────────────┐
   │          │                                    │
   ▼          ▼                                    ▼
┌──────────────────┐  ┌──────────────────────┐  ┌─────────────────────┐
│loan_installments │  │      payments        │  │loan_release_sources │
│──────────────────│  │──────────────────────│  │─────────────────────│
│ id (PK)          │  │ id (PK)              │  │ id (PK)             │
│ loan_id (FK) ────►  │ loan_id (FK) ────────►  │ loan_id (FK) ───────►
│ installment_num  │  │ client_id (FK)       │  │ release_method      │
│ due_date         │  │ amount               │  │ amount              │
│ amount           │  │ payment_method       │  │ proof_image         │
│ paid_amount      │  │ payment_date         │  │ notes               │
│ status           │  │ notes                │  └─────────────────────┘
│ paid_at          │  │ proof_image (NEW)    │
└──────┬───────────┘  └──────────────────────┘
       │
       ▼
┌──────────────┐      ┌────────────────┐
│  late_fees   │      │   documents    │
│──────────────│      │────────────────│
│ id (PK)      │      │ id (PK)        │
│ installment  │      │ documentable   │
│   _id (FK) ──►      │   _type (poly) │
│ amount       │      │ documentable   │
│ applied_at   │      │   _id (poly)   │
└──────────────┘      │ type           │
                      │ file_path      │
                      │ original_name  │
                      └────────────────┘

┌────────────────┐      ┌──────────────────────┐
│ payment_types  │      │     audit_logs       │ (NEW)
│────────────────│      │──────────────────────│
│ id (PK)        │      │ id (PK)              │
│ name           │      │ user_id (FK)         │
│ category       │      │ action               │
│ is_active      │      │ entity_type          │
└────────────────┘      │ entity_id            │
                        │ old_state (JSON)     │
                        │ new_state (JSON)     │
                        │ ip_address           │
                        │ created_at           │
                        └──────────────────────┘
```

### 3.2 New Migrations (Phase 0)

**Migration 24**: `2026_08_04_000001_create_roles_table.php`

```sql
-- roles: id, name, slug (unique), description, created_at, updated_at
-- Seed: administrator, loan_officer, approver, cashier, collector, auditor, borrower
```

**Migration 25**: `2026_08_04_000002_add_role_id_to_users.php`

```sql
-- users: +role_id (FK → roles, nullable), +is_active (boolean, default true)
```

**Migration 26**: `2026_08_04_000003_create_audit_logs_table.php`

```sql
-- audit_logs: id, user_id (FK nullable), action, entity_type, entity_id,
--             old_state (JSON nullable), new_state (JSON nullable),
--             ip_address, user_agent, created_at
-- Index on (entity_type, entity_id), (user_id), (action), (created_at)
```

**Migration 27**: `2026_08_04_000004_add_created_by_to_loans.php`

```sql
-- loans: +created_by (FK → users, nullable)
-- loans: +approved_by (FK → users, nullable)
```

**Migration 28**: `2026_08_04_000005_add_proof_to_payments.php`

```sql
-- payments: +proof_image (string, nullable)
```

### 3.3 Key Indexes to Add

```sql
CREATE INDEX idx_loans_client_status ON loans(client_id, loan_status);
CREATE INDEX idx_loans_application_status ON loans(application_status);
CREATE INDEX idx_installments_due_status ON loan_installments(due_date, status);
CREATE INDEX idx_installments_loan ON loan_installments(loan_id, installment_number);
CREATE INDEX idx_payments_loan ON payments(loan_id, payment_date);
CREATE INDEX idx_late_fees_date ON late_fees(applied_at);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at);
```

---

## 4. API Design (Swagger/OpenAPI 3.0)

### 4.1 Endpoint Groups

```
TAG: Authentication
  POST   /api/register                    RegisterRequest
  POST   /api/login                       LoginRequest
  POST   /api/logout                      (auth)

TAG: Users
  GET    /api/user                        (auth)

TAG: Dashboard
  GET    /api/dashboard                   (auth)

TAG: Clients
  GET    /api/clients                     (auth, role:loan_officer|approver|admin)
  POST   /api/clients                     (auth, role:loan_officer|admin)
  GET    /api/clients/{client}            (auth)
  PUT    /api/clients/{client}            (auth, role:loan_officer|admin)
  DELETE /api/clients/{client}            (auth, role:admin)
  GET    /api/clients/{client}/documents  (auth)
  POST   /api/clients/{client}/documents  (auth, role:loan_officer|admin)

TAG: Loans
  POST   /api/loans/calculate             (auth, role:loan_officer|approver)
  GET    /api/loans                       (auth)
  POST   /api/loans                       (auth, role:loan_officer)
  GET    /api/loans/{loan}                (auth)
  PUT    /api/loans/{loan}                (auth, role:loan_officer|approver)
  PUT    /api/loans/{loan}/submit         (auth, role:loan_officer)
  PUT    /api/loans/{loan}/approve        (auth, role:approver)
  PUT    /api/loans/{loan}/reject         (auth, role:approver)
  PUT    /api/loans/{loan}/release        (auth, role:cashier)
  PUT    /api/loans/{loan}/cancel         (auth, role:loan_officer|approver)
  PUT    /api/loans/{loan}/review-status  (auth, role:approver)
  PUT    /api/loans/{loan}/collection-status (auth, role:collector)

TAG: Past Due
  GET    /api/loans/past-due              (auth, role:collector|approver|admin)
  POST   /api/loans/apply-late-fees       (auth, role:collector|admin)

TAG: Payments
  GET    /api/loans/{loan}/payments       (auth)
  POST   /api/loans/{loan}/payments       (auth, role:cashier|borrower)

TAG: Release Sources
  POST   /api/loans/{loan}/release-sources/{source}/proof    (auth, role:cashier)
  DELETE /api/loans/{loan}/release-sources/{source}/proof    (auth, role:cashier)

TAG: Payment Types
  GET    /api/payment-types               (auth)
  POST   /api/payment-types               (auth, role:admin)
  GET    /api/payment-types/{type}        (auth)
  PUT    /api/payment-types/{type}        (auth, role:admin)
  DELETE /api/payment-types/{type}        (auth, role:admin)

TAG: System
  GET    /api/health                      (public)
  GET    /api/documents/{document}/view   (public)
```

### 4.2 Swagger Setup

Install `darkaonline/l5-swagger` package. Annotate every controller method with OpenAPI attributes. Generate docs at `/api/documentation`.

### 4.3 Key API Schema Diffs (from current state)

```yaml
LoanCreateRequest:
  + first_payment_due_date: date (optional)

LoanApproveRequest:  # NEW - replaces inline validation
  amount: number (optional, min:1)
  interest_rate_per_month: number (optional, min:0)
  term_months: numeric (optional, min:0.5, max:5)

StorePaymentRequest:
  + proof_image: file (optional, image, max:10MB)

LoanResponse:
  + created_by: User
  + approved_by: User
  + audit_logs: AuditLog[]

UserResponse:
  + role: Role
  + permissions: string[]
```

---

## 5. Sequence Diagrams

### 5.1 Loan Application → Approval → Release (Happy Path)

```
LoanOfficer          Approver           Cashier            System
    │                   │                  │                  │
    │ POST /loans/calc  │                  │                  │
    │──────────────────────────────────────────────────────>│
    │<─ {calc result} ──────────────────────────────────────│
    │                   │                  │                  │
    │ POST /loans       │                  │                  │
    │ (status=draft)    │                  │                  │
    │──────────────────────────────────────────────────────>│
    │<─ {loan created} ─────────────────────────────────────│
    │                   │                  │                  │
    │ PUT /loans/1/submit                 │                  │
    │──────────────────────────────────────────────────────>│
    │<─ {status=submitted} ─────────────────────────────────│
    │                   │                  │                  │
    │                   │ PUT /loans/1/    │                  │
    │                   │   review-status  │                  │
    │                   │─────────────────────────────────>│
    │                   │<─ {under_review} ─────────────────│
    │                   │                  │                  │
    │                   │ PUT /loans/1/    │                  │
    │                   │   approve        │                  │
    │                   │ {amount, rate}   │                  │
    │                   │─────────────────────────────────>│
    │                   │                  │  [generate       │
    │                   │                  │   installments]  │
    │                   │<─ {approved,     │                  │
    │                   │   waiting_for_   │                  │
    │                   │   release} ────────────────────────│
    │                   │                  │                  │
    │                   │                  │ PUT /loans/1/    │
    │                   │                  │   release        │
    │                   │                  │ {sources:[...]}  │
    │                   │                  │──────────────>│
    │                   │                  │  [validate       │
    │                   │                  │   amounts]       │
    │                   │                  │  [create release │
    │                   │                  │   sources]       │
    │                   │                  │  [set due        │
    │                   │                  │   installments]  │
    │                   │                  │  [auto-close     │
    │                   │                  │   old loans if   │
    │                   │                  │   reloan]        │
    │                   │                  │<─ {active}  ────│
```

### 5.2 Payment Allocation + Status Recovery

```
Cashier                       System
  │                              │
  │ POST /loans/1/payments       │
  │ {amount: 5000, method:GCash} │
  │─────────────────────────────>│
  │                              │ [create Payment record]
  │                              │ [fetch unpaid installments
  │                              │  ordered by number ASC]
  │                              │
  │                              │ Installment #1 (P2000):
  │                              │   5000 >= 2000 → paid
  │                              │   remaining: 3000
  │                              │
  │                              │ Installment #2 (P2000):
  │                              │   3000 >= 2000 → paid
  │                              │   remaining: 1000
  │                              │
  │                              │ Installment #3 (P2000):
  │                              │   1000 < 2000 → partially_paid
  │                              │   paid_amount: 1000
  │                              │   remaining: 0
  │                              │
  │                              │ [check remaining_balance > 0]
  │                              │ [check: any installments
  │                              │  still overdue?]
  │                              │   → NO overdue remaining
  │                              │   → loan_status: past_due → active
  │                              │     (recovery)
  │                              │
  │<─ {payment recorded, loan    │
  │    now active} ──────────────│
```

### 5.3 Late Fee Application (Scheduled Daily)

```
Scheduler (daily @ midnight)              System
        │                                     │
        │ POST /loans/apply-late-fees         │
        │────────────────────────────────────>│
        │                                     │ [fetch installments where
        │                                     │  status IN (due, overdue, missed)
        │                                     │  AND due_date < today]
        │                                     │
        │                                     │ For each overdue installment:
        │                                     │   [check if fee already applied
        │                                     │    this calendar month]
        │                                     │   → NO: create LateFee(P500)
        │                                     │     set status = overdue
        │                                     │   → YES: skip
        │                                     │
        │                                     │   [if 60+ days overdue]
        │                                     │     set status = missed
        │                                     │
        │                                     │ [for each active loan with
        │                                     │  overdue installments]
        │                                     │   set loan_status = past_due
        │                                     │
        │                                     │ [for each past_due loan with
        │                                     │  90+ days overdue installments]
        │                                     │   set loan_status = defaulted
        │                                     │
        │<─ {applied: 5, overdue: 12} ───────│
```

### 5.4 Reloan Auto-Close

```
Cashier                              System
  │                                     │
  │ PUT /loans/2/release                │
  │ (this is a reloan; old_balance > 0) │
  │────────────────────────────────────>│
  │                                     │ [validate release amounts]
  │                                     │ [create release sources]
  │                                     │ [set new loan status = active]
  │                                     │
  │                                     │ [DETECT reloan: old_balance > 0]
  │                                     │
  │                                     │ [fetch all existing loans for
  │                                     │  client where loan_status IN
  │                                     │  (active, past_due, delinquent)]
  │                                     │
  │                                     │ Old Loan #1 (active, P5000):
  │                                     │   → loan_status = fully_paid
  │                                     │   → closed_at = now()
  │                                     │   → audit log entry
  │                                     │
  │                                     │ Old Loan #2 (past_due, P3000):
  │                                     │   → loan_status = fully_paid
  │                                     │   → closed_at = now()
  │                                     │   → audit log entry
  │                                     │
  │<─ {new loan active, old loans      │
  │    auto-closed} ────────────────────│
```

---

## 6. Deployment

### 6.1 Environment Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     PRODUCTION                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │ Ubuntu   │  │ Ubuntu   │  │ Ubuntu   │                │
│  │ Nginx    │  │ PHP-FPM  │  │ MySQL 8  │                │
│  │ (TLS)    │  │ Laravel  │  │ Redis 7  │                │
│  │          │  │ Horizon  │  │          │                │
│  └──────────┘  └──────────┘  └──────────┘                │
│  Static assets served via Nginx or CDN                    │
│  Supervisor manages queue workers & scheduler             │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                     STAGING                                │
│  Identical to production, smaller instance                 │
│  Deploy from `main` branch automatically                  │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                     LOCAL (Docker/Sail)                    │
│  docker-compose.yml:                                       │
│    - laravel.test (PHP 8.4, Laravel 12, Composer)         │
│    - mysql (MySQL 8.0, port 3306)                          │
│    - redis (Redis 7, port 6379)                            │
│    - mailpit (SMTP testing, port 8025)                     │
└────────────────────────────────────────────────────────────┘
```

### 6.2 Docker Compose (to be created at repo root)

```yaml
services:
  laravel.test:
    build: ./apps/backend
    ports: ["80:80"]
    volumes: ["./apps/backend:/var/www/html"]
    depends_on: [mysql, redis]
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: secret
      MYSQL_DATABASE: ala
    ports: ["3306:3306"]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

### 6.3 CI/CD Pipeline (GitHub Actions)

```
Push to feature branch → Run tests/lint/phpstan
                           ↓ (pass)
Create PR to main      → Run full test suite + coverage check
                           ↓ (pass + review)
Merge to main          → Deploy to staging
                           ↓ (UAT)
Tag release (v1.x.x)    → Deploy to production
```

### 6.4 Scheduler (Laravel Task Scheduling)

```php
// app/Console/Kernel.php
$schedule->command('loans:apply-late-fees')->dailyAt('00:01');
$schedule->command('loans:send-payment-reminders')->dailyAt('08:00');
$schedule->command('loans:escalate-due-installments')->dailyAt('00:01');
```

---

## 7. Security

### 7.1 Authentication Flow

```
Client                    Server
  │                         │
  │ POST /api/login         │
  │ {email, password}       │
  │────────────────────────>│
  │                         │ [Hash::check]
  │                         │ [createToken('auth-token')]
  │<── {user, token} ──────│
  │                         │
  │ (all subsequent)        │
  │ Authorization: Bearer   │
  │ {token}                 │
  │────────────────────────>│
  │                         │ [Sanctum validates token]
  │                         │ [RoleMiddleware checks role]
  │<── {response} ──────────│
```

### 7.2 RBAC Implementation

```
users ──M:1──> roles
                 │
                 └── permissions (string array or Spatie/laravel-permission)

Middleware: RoleMiddleware
  - Checks auth()->user()->hasRole($requiredRoles)
  - Applied per route group via route middleware alias

Route example:
  Route::middleware(['auth:sanctum', 'role:approver'])->group(...)
```

### 7.3 Security Hardening Checklist

| # | Measure | Implementation |
|---|---------|---------------|
| S-01 | HTTPS only | Enforced via Nginx `ssl_protocols TLSv1.2 TLSv1.3` |
| S-02 | Password hashing | Bcrypt via `Hash::make()`, default rounds |
| S-03 | Rate limiting | 60/min auth, 120/min API via `ThrottleRequests` |
| S-04 | CORS | Whitelist only registered origins in `config/cors.php` |
| S-05 | Input validation | All inputs through `FormRequest::rules()` |
| S-06 | SQL injection | Eloquent ORM + parameterized queries (default) |
| S-07 | XSS | JSON API — no HTML rendering; React auto-escapes |
| S-08 | CSRF | Sanctum SPA auth for web; API tokens for mobile |
| S-09 | File upload | MIME validation, max 10MB, stored outside web root |
| S-10 | Secrets | `.env` in `.gitignore`; production uses vault |
| S-11 | Token expiry | Sanctum tokens with `expires_at` |
| S-12 | Audit masking | Sensitive fields masked (GCash ref → `****1234`) |

### 7.4 Role-Permission Matrix

| Action | Admin | Loan Officer | Approver | Cashier | Collector | Auditor | Borrower |
|--------|-------|-------------|----------|---------|-----------|---------|----------|
| Manage users | ✓ | — | — | — | — | — | — |
| Manage payment types | ✓ | — | — | — | — | — | — |
| CRUD clients | ✓ | ✓ | — | — | — | — | — |
| Create loan | ✓ | ✓ | — | — | — | — | — |
| Submit loan | ✓ | ✓ | — | — | — | — | — |
| Review status | ✓ | — | ✓ | — | — | — | — |
| Approve loan | ✓ | — | ✓ | — | — | — | — |
| Reject loan | ✓ | — | ✓ | — | — | — | — |
| Release loan | ✓ | — | — | ✓ | — | — | — |
| Record payment | ✓ | — | — | ✓ | — | — | ✓ (own) |
| Apply late fees | ✓ | — | — | — | ✓ | — | — |
| Update collection | ✓ | — | — | — | ✓ | — | — |
| View dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (own) |
| View audit logs | ✓ | — | — | — | — | ✓ | — |
| View own loans | — | — | — | — | — | — | ✓ |

---

## 8. Performance

### 8.1 Optimization Strategy

| Area | Technique | Target |
|------|-----------|--------|
| Database | Indexes on FK columns, `application_status`, `loan_status`, `due_date`, `client_id` | <50ms queries |
| API | Eager loading (`with()`) to avoid N+1; pagination (15 per page) | <2s p95 |
| Cache | Redis for dashboard KPIs (TTL 5 min), payment types (TTL 1 hour) | <200ms cached |
| Queue | Horizon workers for notifications, document processing | Async offload |
| Files | Store on S3-compatible storage; CDN for static assets | — |
| Frontend | React code splitting (lazy routes), Bootstrap tree-shaking | <2s FCP |
| DB Monitoring | Laravel Telescope (staging only) | — |
| API | Response compression (gzip/brotli via Nginx) | <50% payload |

---

## 9. Testing Strategy

### 9.1 Test Pyramid

```
           ┌──────────┐
           │   E2E    │  5%  — Selenium/Playwright for critical user journeys
           │          │
          ┌┴──────────┴┐
          │ Integration │  15% — API workflows: loan→approve→release→pay→close
          │             │
         ┌┴─────────────┴┐
         │   Feature      │  30% — Each API endpoint: auth, validation, status transitions
         │                │
        ┌┴────────────────┴┐
        │     Unit          │  50% — Services: calculations, allocation, late fees, business rules
        │                   │
        └───────────────────┘
```

### 9.2 Test Coverage Requirements

| Module | Unit Tests | Feature Tests | Integration Tests |
|--------|-----------|---------------|-------------------|
| AuthService | Token creation, password check | Register, Login, Logout, role check | — |
| LoanCalculatorService | Interest calc, schedule gen, rounding, reloan deduction | Calculate API endpoint, edge cases | — |
| LoanService | Status transitions, validation | Create, Submit, Approve, Reject, Release, Cancel | Full loan lifecycle |
| PaymentService | Allocation algorithm, partial payments, overpayment | Record payment, proof upload | Loan + payment loop |
| LateFeeService | Monthly recurrence, 60-day escalation, 90-day default | Apply late fees API, status changes | Payment + late fee interaction |
| ReloanService | Balance deduction, auto-close | Reloan calculation API, release with auto-close | Multiple loans + reloan |
| ClientService | CRUD, photo, documents | Client CRUD endpoints, document upload | — |
| DashboardService | KPI aggregation | Dashboard API | — |
| AuditService | Logging format, IP capture | Verify logs created on state changes | Cross-module audit consistency |
| RoleMiddleware | Role check, forbidden | RBAC enforcement on all endpoints | — |

### 9.3 Financial Test Matrix (Mandatory)

| Test Case | Input | Expected |
|-----------|-------|----------|
| Standard loan | P10,000, 3mo, 10% | Interest = P3,000, Net = P7,000, 6 installments of P1,666.67 (last = P1,666.65) |
| Max term loan | P5,000, 5mo, 10% | Interest = P2,500, Net = P2,500, 10 installments |
| Reloan deduction | New P20,000 + existing P5,000 balance | total_existing_balance = P5,000, net_after_deduction = P13,000 |
| Zero net proceeds | New P5,000 + existing P5,000 balance | net_proceeds_after_deduction = 0 |
| Late fee recurring | Month 1: overdue, Month 2: still overdue | 2 LateFee records of P500 each |
| Payment allocation | P4,500 on loan with 3 × P2,000 installments | #1 paid, #2 paid, #3 partially_paid (P500) |
| Status recovery | Past_due loan, all overdue paid | loan_status → active |
| Default trigger | Installment 95 days overdue | loan_status → defaulted |
| Segregation | User 1 creates, User 1 tries to approve | 422 INVALID_TRANSITION |

### 9.4 Test Commands

```bash
# Backend
cd apps/backend
php artisan test                          # All Pest tests
php artisan test --coverage --min=80      # Coverage check
./vendor/bin/phpstan analyse              # Static analysis
./vendor/bin/pint --test                  # Code style

# Frontend
cd apps/frontend
npm test                                  # Vitest
npm run lint                              # ESLint
npm run typecheck                         # TypeScript
```

---

## 10. Implementation Phases

| Phase | Name | Scope | Est. Duration |
|-------|------|-------|---------------|
| **0** | Foundation | RBAC (roles, permissions, middleware), Audit Trail (model, service, migration), Repositories (all 9), Swagger setup, Docker Compose, Enums | 3-4 days |
| **1** | Backend Refactor | Move business logic from controllers to services (LoanService, PaymentService, LateFeeService, ReloanService), Add missing Form Requests, Add `created_by`/`approved_by` to loans, Payment proof field | 3-4 days |
| **2** | Business Rule Changes | Recurring late fees, Status recovery (past_due→active), 90-day default trigger, Reloan auto-close, Approval segregation, Approver edit rights, Payment proof upload | 3-4 days |
| **3** | Notifications & Scheduler | NotificationService, Email/SMS templates, Scheduled commands (late fees, reminders), Event dispatching | 2-3 days |
| **4** | Frontend Updates | Role-based UI (ProtectedRoute role check), Proof upload component, Approver edit form, Late fee display, Status recovery indicators | 3-4 days |
| **5** | Testing | Write all unit/feature/integration tests per test matrix, Achieve 80%+ coverage | 3-4 days |
| **6** | Flutter Mobile | Mobile app scaffold, Auth screens, Loan list/detail, Payment recording, Offline queue | TBD |
| **7** | Deployment | Production server setup, CI/CD pipeline, Monitoring (Telescope/Horizon), Backup strategy | 2-3 days |

---

## Summary of Key Decisions

| Decision | Rationale |
|----------|-----------|
| Repository pattern as Eloquent implementations under `Repositories/Eloquent/` | Constitution requires Clean Architecture; interfaces enable test mocking |
| Enum classes for all statuses | Type safety, IDE autocomplete, prevents magic strings |
| `BaseService` with audit/notify helpers | DRY — every service can log and notify without code duplication |
| `created_by` + `approved_by` on Loan model | Required for segregation (FR-APPROVAL-07) and audit trail |
| Swagger via `l5-swagger` package | Industry standard for Laravel; attributes-based annotation |
| Late fee recurrence via calendar month check | Check `late_fees.applied_at` for current month/year before creating new fee |
| Auto-close on reloan via `LoanService::handleReloanClosure()` | Encapsulated in a single service method called during release |
| Dashboard KPIs cached in Redis (5 min TTL) | Dashboard is read-heavy; cache avoids heavy aggregate queries |
| Audit logs via Eloquent model with JSON columns | Queryable, indexable, simpler than event sourcing at this scale |

---

**Version**: 1.0.0 | **Date**: 2026-08-04
