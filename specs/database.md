# Ajang Loan System — Database Design

---

## 1. Entity Relationship Diagram

```
┌──────────────────────┐          ┌──────────────────────┐
│        roles         │          │        users         │
│──────────────────────│          │──────────────────────│
│ id              PK   │◄─────────│ role_id          FK  │
│ name                 │          │ id               PK  │
│ slug           UQ    │          │ name                 │
│ description          │          │ email            UQ  │
│ created_at           │          │ email_verified_at    │
│ updated_at           │          │ password             │
└──────────────────────┘          │ is_active            │
                                  │ remember_token       │
                                  │ created_at           │
                                  │ updated_at           │
                                  └──────┬───────────────┘
                                         │
                          ┌──────────────┼──────────────┐
                          │ created_by   │              │ approved_by
                          ▼              │              ▼
              ┌──────────────────────┐   │   ┌──────────────────────┐
              │        loans         │   │   │  personal_access_    │
              │──────────────────────│   │   │      tokens          │
              │ id              PK   │   │   └──────────────────────┘
              │ client_id       FK ──┼───┼───────────────┐
              │ created_by      FK   │   │               │
              │ approved_by     FK   │   │               │
              │ term_months          │   │               │
              │ interest_rate_per_mo │   │               │
              │ charges              │   │               ▼
              │ charges_description  │   │   ┌──────────────────────┐
              │ old_balance          │   │   │       clients        │
              │ first_payment_due_dt │   │   │──────────────────────│
              │ application_status   │   │   │ id              PK   │
              │ loan_status          │   │   │ name                 │
              │ collection_status    │   │   │ address              │
              │ amount               │   │   │ work                 │
              │ total_interest       │   │   │ work_address         │
              │ net_proceeds         │   │   │ contact_number       │
              │ installment_amount   │   │   │ social_media   JSON  │
              │ total_installments   │   │   │ notes                │
              │ approved_at          │   │   │ photo                │
              │ released_at          │   │   │ created_at           │
              │ closed_at            │   │   │ updated_at           │
              │ created_at           │   │   │ deleted_at     soft  │
              │ updated_at           │   │   └──────────┬───────────┘
              │ deleted_at     soft  │   │              │
              └──┬────────┬──────────┘   │              │ (polymorphic)
                 │        │              │              ▼
                 │        │              │  ┌──────────────────────┐
    ┌────────────┘        └────┐         │  │      documents       │
    ▼                          ▼         │  │──────────────────────│
┌──────────────────┐  ┌─────────────────┐│  │ id              PK   │
│loan_installments │  │    payments     ││  │ documentable_type    │
│──────────────────│  │─────────────────││  │ documentable_id      │
│ id           PK  │  │ id         PK   ││  │ type                 │
│ loan_id      FK  │  │ loan_id    FK   ││  │ file_path            │
│ installment_num  │  │ client_id  FK ──┼──┘ original_name        │
│ due_date         │  │ amount          │   │ ocr_verified         │
│ amount           │  │ payment_method  │   │ ocr_data       JSON  │
│ paid_amount      │  │ payment_date    │   │ created_at           │
│ status           │  │ notes           │   │ updated_at           │
│ paid_at          │  │ proof_image     │   └──────────────────────┘
│ created_at       │  │ created_at      │
│ updated_at       │  │ updated_at      │   ┌──────────────────────┐
└──────┬───────────┘  └─────────────────┘   │    payment_types     │
       │                                    │──────────────────────│
       ▼                                    │ id              PK   │
┌──────────────────┐                        │ name                 │
│    late_fees     │                        │ category             │
│──────────────────│                        │ is_active            │
│ id           PK  │                        │ created_at           │
│ loan_installment │                        │ updated_at           │
│   _id        FK  │                        └──────────────────────┘
│ amount           │
│ applied_at       │   ┌──────────────────────┐
│ created_at       │   │ loan_release_sources │
│ updated_at       │   │──────────────────────│
└──────────────────┘   │ id              PK   │
                       │ loan_id         FK   │
                       │ release_method       │
                       │ amount               │
                       │ proof_image          │
                       │ notes                │
                       │ created_at           │
                       │ updated_at           │
                       └──────────────────────┘

┌──────────────────────┐
│      audit_logs      │
│──────────────────────│
│ id              PK   │
│ user_id         FK   │──► users
│ action               │
│ entity_type          │
│ entity_id            │
│ old_state      JSON  │
│ new_state      JSON  │
│ ip_address           │
│ user_agent           │
│ created_at           │
└──────────────────────┘
```

---

## 2. Naming Convention

| Element | Convention | Example |
|---------|-----------|---------|
| Tables | `snake_case`, plural | `loan_installments` |
| Primary Keys | `id` (unsigned big integer, auto-increment) | `id` |
| Foreign Keys | `{referenced_table_singular}_id` | `client_id`, `loan_installment_id` |
| Indexes | `idx_{table}_{column(s)}` | `idx_loans_client_status` |
| Unique Constraints | `uq_{table}_{column}` | `uq_users_email` |
| Foreign Key Constraints | `fk_{table}_{referenced_table}` | `fk_loans_clients` |
| JSON Columns | `snake_case` | `social_media`, `ocr_data` |
| Date/Timestamp Columns | `_at` suffix for timestamps, `_date` for dates | `approved_at`, `due_date` |
| Boolean Columns | `is_` or `has_` prefix | `is_active`, `ocr_verified` |
| Money/Decimal | `decimal(12,2)` for all currency | `amount`, `net_proceeds` |
| Status Columns | `varchar` string enums, not MySQL ENUM | `'pending'`, `'active'` |

---

## 3. Tables — Consolidated Final Schema

### 3.1 `roles`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `BIGINT UNSIGNED` | `PK`, `AUTO_INCREMENT` | Primary key |
| `name` | `VARCHAR(50)` | `NOT NULL` | Display name (e.g. "Loan Officer") |
| `slug` | `VARCHAR(50)` | `NOT NULL`, `UNIQUE` | Machine name (e.g. "loan_officer") |
| `description` | `VARCHAR(255)` | `NULLABLE` | Role purpose |
| `created_at` | `TIMESTAMP` | `NULLABLE` | |
| `updated_at` | `TIMESTAMP` | `NULLABLE` | |

```sql
CREATE TABLE `roles` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `slug` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255) DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_roles_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Seed data**:

| id | name | slug | description |
|----|------|------|-------------|
| 1 | Administrator | `administrator` | Full system access and configuration |
| 2 | Loan Officer | `loan_officer` | Borrower management and loan origination |
| 3 | Approver | `approver` | Application review and approval |
| 4 | Cashier | `cashier` | Loan release and payment processing |
| 5 | Collector | `collector` | Delinquency follow-up and collections |
| 6 | Auditor | `auditor` | Read-only access to transactions and logs |
| 7 | Borrower | `borrower` | View own loans and make payments |

---

### 3.2 `users`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `BIGINT UNSIGNED` | `PK`, `AUTO_INCREMENT` | Primary key |
| `role_id` | `BIGINT UNSIGNED` | `FK → roles.id`, `NULLABLE` | User role assignment |
| `name` | `VARCHAR(255)` | `NOT NULL` | Full name |
| `email` | `VARCHAR(255)` | `NOT NULL`, `UNIQUE` | Email address |
| `email_verified_at` | `TIMESTAMP` | `NULLABLE` | Email verification timestamp |
| `password` | `VARCHAR(255)` | `NOT NULL` | Bcrypt hashed password |
| `is_active` | `TINYINT(1)` | `NOT NULL`, `DEFAULT 1` | Soft disable without deleting |
| `remember_token` | `VARCHAR(100)` | `NULLABLE` | "Remember me" token |
| `created_at` | `TIMESTAMP` | `NULLABLE` | |
| `updated_at` | `TIMESTAMP` | `NULLABLE` | |

```sql
CREATE TABLE `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `role_id` BIGINT UNSIGNED DEFAULT NULL,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `email_verified_at` TIMESTAMP NULL DEFAULT NULL,
    `password` VARCHAR(255) NOT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `remember_token` VARCHAR(100) DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_users_email` (`email`),
    INDEX `idx_users_role_id` (`role_id`),
    CONSTRAINT `fk_users_roles` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 3.3 `clients`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `BIGINT UNSIGNED` | `PK`, `AUTO_INCREMENT` | Primary key |
| `name` | `VARCHAR(255)` | `NOT NULL` | Full name |
| `address` | `TEXT` | `NULLABLE` | Residential address |
| `work` | `VARCHAR(255)` | `NULLABLE` | Employer / occupation |
| `work_address` | `TEXT` | `NULLABLE` | Work address |
| `contact_number` | `VARCHAR(20)` | `NULLABLE` | Mobile/phone |
| `social_media` | `JSON` | `NULLABLE` | `{"facebook":"...", "messenger":"..."}` |
| `notes` | `TEXT` | `NULLABLE` | General remarks |
| `photo` | `VARCHAR(255)` | `NULLABLE` | Photo file path |
| `created_at` | `TIMESTAMP` | `NULLABLE` | |
| `updated_at` | `TIMESTAMP` | `NULLABLE` | |
| `deleted_at` | `TIMESTAMP` | `NULLABLE` | Soft delete |

```sql
CREATE TABLE `clients` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `address` TEXT DEFAULT NULL,
    `work` VARCHAR(255) DEFAULT NULL,
    `work_address` TEXT DEFAULT NULL,
    `contact_number` VARCHAR(20) DEFAULT NULL,
    `social_media` JSON DEFAULT NULL,
    `notes` TEXT DEFAULT NULL,
    `photo` VARCHAR(255) DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_clients_name` (`name`),
    INDEX `idx_clients_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 3.4 `loans`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `BIGINT UNSIGNED` | `PK`, `AUTO_INCREMENT` | Primary key |
| `client_id` | `BIGINT UNSIGNED` | `FK → clients.id`, `NOT NULL` | Borrower |
| `created_by` | `BIGINT UNSIGNED` | `FK → users.id`, `NULLABLE` | Loan Officer who created |
| `approved_by` | `BIGINT UNSIGNED` | `FK → users.id`, `NULLABLE` | Approver who approved |
| `term_months` | `DECIMAL(3,1)` | `NULLABLE` | Loan duration in months (0.5–5.0, half-month steps) |
| `interest_rate_per_month` | `DECIMAL(5,2)` | `NOT NULL`, `DEFAULT 10.00` | Interest rate (% per month) |
| `charges` | `DECIMAL(12,2)` | `NOT NULL`, `DEFAULT 0.00` | Additional fees |
| `charges_description` | `VARCHAR(255)` | `NULLABLE` | Reason for charges |
| `old_balance` | `DECIMAL(12,2)` | `NOT NULL`, `DEFAULT 0.00` | Prior loan balance (reloan) |
| `first_payment_due_date` | `DATE` | `NULLABLE` | When first installment is due |
| `application_status` | `VARCHAR(50)` | `NOT NULL`, `DEFAULT 'draft'` | draft, submitted, under_review, pending_documents, approved, rejected, cancelled |
| `loan_status` | `VARCHAR(50)` | `NULLABLE` | waiting_for_release, released, active, past_due, delinquent, restructured, fully_paid, closed, defaulted |
| `collection_status` | `VARCHAR(50)` | `NULLABLE` | reminder_sent, promise_to_pay, under_collection, legal_action, settled |
| `amount` | `DECIMAL(12,2)` | `NOT NULL` | Gross loan amount |
| `total_interest` | `DECIMAL(12,2)` | `NOT NULL` | Computed: amount × rate% × term |
| `net_proceeds` | `DECIMAL(12,2)` | `NOT NULL` | Computed: amount - total_interest |
| `installment_amount` | `DECIMAL(12,2)` | `NOT NULL` | Per-installment amount |
| `total_installments` | `INT` | `NOT NULL`, `DEFAULT 0` | term_months × 2 |
| `approved_at` | `TIMESTAMP` | `NULLABLE` | When application was approved |
| `released_at` | `TIMESTAMP` | `NULLABLE` | When funds were disbursed |
| `closed_at` | `TIMESTAMP` | `NULLABLE` | When loan was fully paid |
| `created_at` | `TIMESTAMP` | `NULLABLE` | |
| `updated_at` | `TIMESTAMP` | `NULLABLE` | |
| `deleted_at` | `TIMESTAMP` | `NULLABLE` | Soft delete |

```sql
CREATE TABLE `loans` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `created_by` BIGINT UNSIGNED DEFAULT NULL,
    `approved_by` BIGINT UNSIGNED DEFAULT NULL,
    `term_months` DECIMAL(3,1) DEFAULT NULL,
    `interest_rate_per_month` DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    `charges` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `charges_description` VARCHAR(255) DEFAULT NULL,
    `old_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `first_payment_due_date` DATE DEFAULT NULL,
    `application_status` VARCHAR(50) NOT NULL DEFAULT 'draft',
    `loan_status` VARCHAR(50) DEFAULT NULL,
    `collection_status` VARCHAR(50) DEFAULT NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `total_interest` DECIMAL(12,2) NOT NULL,
    `net_proceeds` DECIMAL(12,2) NOT NULL,
    `installment_amount` DECIMAL(12,2) NOT NULL,
    `total_installments` INT NOT NULL DEFAULT 0,
    `approved_at` TIMESTAMP NULL DEFAULT NULL,
    `released_at` TIMESTAMP NULL DEFAULT NULL,
    `closed_at` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_loans_client_id` (`client_id`),
    INDEX `idx_loans_client_status` (`client_id`, `loan_status`),
    INDEX `idx_loans_application_status` (`application_status`),
    INDEX `idx_loans_loan_status` (`loan_status`),
    INDEX `idx_loans_collection_status` (`collection_status`),
    INDEX `idx_loans_created_by` (`created_by`),
    INDEX `idx_loans_approved_by` (`approved_by`),
    INDEX `idx_loans_created_at` (`created_at`),
    INDEX `idx_loans_deleted_at` (`deleted_at`),
    CONSTRAINT `fk_loans_clients` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_loans_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_loans_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 3.5 `loan_installments`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `BIGINT UNSIGNED` | `PK`, `AUTO_INCREMENT` | Primary key |
| `loan_id` | `BIGINT UNSIGNED` | `FK → loans.id`, `NOT NULL` | Parent loan |
| `installment_number` | `INT` | `NOT NULL` | Sequential (1, 2, 3...) |
| `due_date` | `DATE` | `NOT NULL` | When payment is due |
| `amount` | `DECIMAL(12,2)` | `NOT NULL` | Amount due this installment |
| `paid_amount` | `DECIMAL(12,2)` | `NOT NULL`, `DEFAULT 0.00` | Amount paid so far |
| `status` | `VARCHAR(20)` | `NOT NULL`, `DEFAULT 'pending'` | pending, due, paid, partially_paid, overdue, missed |
| `paid_at` | `TIMESTAMP` | `NULLABLE` | When fully paid |
| `created_at` | `TIMESTAMP` | `NULLABLE` | |
| `updated_at` | `TIMESTAMP` | `NULLABLE` | |

```sql
CREATE TABLE `loan_installments` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `loan_id` BIGINT UNSIGNED NOT NULL,
    `installment_number` INT NOT NULL,
    `due_date` DATE NOT NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `paid_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `paid_at` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_installments_loan` (`loan_id`, `installment_number`),
    INDEX `idx_installments_due_status` (`due_date`, `status`),
    INDEX `idx_installments_status` (`status`),
    CONSTRAINT `fk_installments_loans` FOREIGN KEY (`loan_id`) REFERENCES `loans` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 3.6 `late_fees`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `BIGINT UNSIGNED` | `PK`, `AUTO_INCREMENT` | Primary key |
| `loan_installment_id` | `BIGINT UNSIGNED` | `FK → loan_installments.id`, `NOT NULL` | Overdue installment |
| `amount` | `DECIMAL(12,2)` | `NOT NULL` | PHP 500.00 |
| `applied_at` | `DATE` | `NOT NULL` | Date fee was applied |
| `created_at` | `TIMESTAMP` | `NULLABLE` | |
| `updated_at` | `TIMESTAMP` | `NULLABLE` | |

```sql
CREATE TABLE `late_fees` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `loan_installment_id` BIGINT UNSIGNED NOT NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `applied_at` DATE NOT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_late_fees_installment` (`loan_installment_id`),
    INDEX `idx_late_fees_applied_at` (`applied_at`),
    CONSTRAINT `fk_late_fees_installments` FOREIGN KEY (`loan_installment_id`) REFERENCES `loan_installments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 3.7 `payments`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `BIGINT UNSIGNED` | `PK`, `AUTO_INCREMENT` | Primary key |
| `loan_id` | `BIGINT UNSIGNED` | `FK → loans.id`, `NOT NULL` | Parent loan |
| `client_id` | `BIGINT UNSIGNED` | `FK → clients.id`, `NOT NULL` | Borrower |
| `amount` | `DECIMAL(12,2)` | `NOT NULL` | Payment amount |
| `payment_method` | `VARCHAR(50)` | `NOT NULL`, `DEFAULT 'cash'` | cash, GCash, BPI, BDO, etc. |
| `payment_date` | `DATE` | `NOT NULL` | Date of payment |
| `notes` | `TEXT` | `NULLABLE` | Remarks |
| `proof_image` | `VARCHAR(255)` | `NULLABLE` | Screenshot file path |
| `created_at` | `TIMESTAMP` | `NULLABLE` | |
| `updated_at` | `TIMESTAMP` | `NULLABLE` | |

```sql
CREATE TABLE `payments` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `loan_id` BIGINT UNSIGNED NOT NULL,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `payment_method` VARCHAR(50) NOT NULL DEFAULT 'cash',
    `payment_date` DATE NOT NULL,
    `notes` TEXT DEFAULT NULL,
    `proof_image` VARCHAR(255) DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_payments_loan` (`loan_id`, `payment_date`),
    INDEX `idx_payments_client` (`client_id`),
    INDEX `idx_payments_date` (`payment_date`),
    INDEX `idx_payments_method` (`payment_method`),
    CONSTRAINT `fk_payments_loans` FOREIGN KEY (`loan_id`) REFERENCES `loans` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_payments_clients` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 3.8 `loan_release_sources`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `BIGINT UNSIGNED` | `PK`, `AUTO_INCREMENT` | Primary key |
| `loan_id` | `BIGINT UNSIGNED` | `FK → loans.id`, `NOT NULL` | Parent loan |
| `release_method` | `VARCHAR(50)` | `NOT NULL` | Cash, GCash, Bank Transfer |
| `amount` | `DECIMAL(12,2)` | `NOT NULL` | Amount disbursed via this source |
| `proof_image` | `VARCHAR(255)` | `NULLABLE` | Disbursement proof |
| `notes` | `TEXT` | `NULLABLE` | Remarks |
| `created_at` | `TIMESTAMP` | `NULLABLE` | |
| `updated_at` | `TIMESTAMP` | `NULLABLE` | |

```sql
CREATE TABLE `loan_release_sources` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `loan_id` BIGINT UNSIGNED NOT NULL,
    `release_method` VARCHAR(50) NOT NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `proof_image` VARCHAR(255) DEFAULT NULL,
    `notes` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_release_sources_loan` (`loan_id`),
    CONSTRAINT `fk_release_sources_loans` FOREIGN KEY (`loan_id`) REFERENCES `loans` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 3.9 `documents`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `BIGINT UNSIGNED` | `PK`, `AUTO_INCREMENT` | Primary key |
| `documentable_type` | `VARCHAR(255)` | `NOT NULL` | Polymorphic parent type |
| `documentable_id` | `BIGINT UNSIGNED` | `NOT NULL` | Polymorphic parent ID |
| `type` | `VARCHAR(50)` | `NOT NULL` | govt_id, payslip, coe, billing, bank, other, payment_proof |
| `file_path` | `VARCHAR(255)` | `NOT NULL` | Storage path |
| `original_name` | `VARCHAR(255)` | `NOT NULL` | Original filename |
| `ocr_verified` | `TINYINT(1)` | `NOT NULL`, `DEFAULT 0` | OCR flag |
| `ocr_data` | `JSON` | `NULLABLE` | Extracted OCR data |
| `created_at` | `TIMESTAMP` | `NULLABLE` | |
| `updated_at` | `TIMESTAMP` | `NULLABLE` | |

```sql
CREATE TABLE `documents` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `documentable_type` VARCHAR(255) NOT NULL,
    `documentable_id` BIGINT UNSIGNED NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `file_path` VARCHAR(255) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `ocr_verified` TINYINT(1) NOT NULL DEFAULT 0,
    `ocr_data` JSON DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_documents_poly` (`documentable_type`, `documentable_id`),
    INDEX `idx_documents_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 3.10 `payment_types`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `BIGINT UNSIGNED` | `PK`, `AUTO_INCREMENT` | Primary key |
| `name` | `VARCHAR(100)` | `NOT NULL` | e.g. "Cash", "GCash", "BPI" |
| `category` | `VARCHAR(50)` | `NOT NULL` | `payment_method` or `release_method` |
| `is_active` | `TINYINT(1)` | `NOT NULL`, `DEFAULT 1` | Soft toggle |
| `created_at` | `TIMESTAMP` | `NULLABLE` | |
| `updated_at` | `TIMESTAMP` | `NULLABLE` | |

```sql
CREATE TABLE `payment_types` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_payment_types_name_category` (`name`, `category`),
    INDEX `idx_payment_types_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Seed data**:

| name | category | is_active |
|------|----------|-----------|
| Cash | `payment_method` | 1 |
| GCash | `payment_method` | 1 |
| BPI | `payment_method` | 1 |
| BDO | `payment_method` | 1 |
| Other Banks | `payment_method` | 1 |
| Cash | `release_method` | 1 |
| GCash | `release_method` | 1 |
| Bank Transfer | `release_method` | 1 |

---

### 3.11 `audit_logs`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `BIGINT UNSIGNED` | `PK`, `AUTO_INCREMENT` | Primary key |
| `user_id` | `BIGINT UNSIGNED` | `FK → users.id`, `NULLABLE` | Actor (NULL for system) |
| `action` | `VARCHAR(50)` | `NOT NULL` | created, updated, deleted, approved, released, cancelled, rejected |
| `entity_type` | `VARCHAR(100)` | `NOT NULL` | Model class or table name |
| `entity_id` | `BIGINT UNSIGNED` | `NOT NULL` | Record ID |
| `old_state` | `JSON` | `NULLABLE` | State before change |
| `new_state` | `JSON` | `NULLABLE` | State after change |
| `ip_address` | `VARCHAR(45)` | `NULLABLE` | Client IP (IPv4 or IPv6) |
| `user_agent` | `TEXT` | `NULLABLE` | Client user agent |
| `created_at` | `TIMESTAMP` | `NOT NULL` | When the action occurred |

```sql
CREATE TABLE `audit_logs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED DEFAULT NULL,
    `action` VARCHAR(50) NOT NULL,
    `entity_type` VARCHAR(100) NOT NULL,
    `entity_id` BIGINT UNSIGNED NOT NULL,
    `old_state` JSON DEFAULT NULL,
    `new_state` JSON DEFAULT NULL,
    `ip_address` VARCHAR(45) DEFAULT NULL,
    `user_agent` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_audit_logs_user` (`user_id`),
    INDEX `idx_audit_logs_entity` (`entity_type`, `entity_id`),
    INDEX `idx_audit_logs_action` (`action`),
    INDEX `idx_audit_logs_created_at` (`created_at`),
    CONSTRAINT `fk_audit_logs_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 3.12 System Tables (Laravel Default)

**`personal_access_tokens`** — Sanctum API tokens:

| Column | Type | Constraints |
|--------|------|------------|
| `id` | `BIGINT UNSIGNED` | `PK`, `AUTO_INCREMENT` |
| `tokenable_type` | `VARCHAR(255)` | `NOT NULL` |
| `tokenable_id` | `BIGINT UNSIGNED` | `NOT NULL` |
| `name` | `VARCHAR(255)` | `NOT NULL` |
| `token` | `VARCHAR(64)` | `NOT NULL`, `UNIQUE` |
| `abilities` | `TEXT` | `NULLABLE` |
| `last_used_at` | `TIMESTAMP` | `NULLABLE` |
| `expires_at` | `TIMESTAMP` | `NULLABLE` |
| `created_at` | `TIMESTAMP` | `NULLABLE` |
| `updated_at` | `TIMESTAMP` | `NULLABLE` |

Indexes: `idx_pat_tokenable` (`tokenable_type`, `tokenable_id`), `idx_pat_expires` (`expires_at`)

Additional system tables managed by Laravel: `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`, `sessions`, `password_reset_tokens`, `loan_products` (legacy, not in active use).

---

## 4. Relationships Summary

| Parent | Child | Cardinality | FK Column | ON DELETE | ON UPDATE |
|--------|-------|------------|-----------|-----------|-----------|
| `roles` | `users` | 1:M | `users.role_id` | `SET NULL` | `CASCADE` |
| `users` | `loans` | 1:M | `loans.created_by` | `SET NULL` | `CASCADE` |
| `users` | `loans` | 1:M | `loans.approved_by` | `SET NULL` | `CASCADE` |
| `users` | `audit_logs` | 1:M | `audit_logs.user_id` | `SET NULL` | `CASCADE` |
| `clients` | `loans` | 1:M | `loans.client_id` | `CASCADE` | `CASCADE` |
| `clients` | `payments` | 1:M | `payments.client_id` | `CASCADE` | `CASCADE` |
| `clients` | `documents` | polymorphic 1:M | `documents.documentable_*` | — | — |
| `loans` | `loan_installments` | 1:M | `loan_installments.loan_id` | `CASCADE` | `CASCADE` |
| `loans` | `payments` | 1:M | `payments.loan_id` | `CASCADE` | `CASCADE` |
| `loans` | `loan_release_sources` | 1:M | `loan_release_sources.loan_id` | `CASCADE` | `CASCADE` |
| `loans` | `documents` | polymorphic 1:M | `documents.documentable_*` | — | — |
| `loan_installments` | `late_fees` | 1:M | `late_fees.loan_installment_id` | `CASCADE` | `CASCADE` |

---

## 5. DDL Execution Order

```
1.  roles
2.  users
3.  personal_access_tokens
4.  clients
5.  loans
6.  loan_installments
7.  late_fees
8.  payments
9.  loan_release_sources
10. payment_types
11. documents
12. audit_logs
13. cache / cache_locks / jobs / job_batches / failed_jobs / sessions / password_reset_tokens / loan_products
```

---

## 6. Indexes — Complete List

| Table | Index Name | Columns | Type | Purpose |
|-------|-----------|---------|------|---------|
| `roles` | `PRIMARY` | `id` | PK | Row identity |
| `roles` | `uq_roles_slug` | `slug` | UNIQUE | Fast role lookup by slug |
| `users` | `PRIMARY` | `id` | PK | Row identity |
| `users` | `uq_users_email` | `email` | UNIQUE | Login + uniqueness |
| `users` | `idx_users_role_id` | `role_id` | INDEX | Role-based queries |
| `clients` | `PRIMARY` | `id` | PK | Row identity |
| `clients` | `idx_clients_name` | `name` | INDEX | Search by name |
| `clients` | `idx_clients_deleted_at` | `deleted_at` | INDEX | Soft delete filtering |
| `loans` | `PRIMARY` | `id` | PK | Row identity |
| `loans` | `idx_loans_client_id` | `client_id` | INDEX | Client's loans |
| `loans` | `idx_loans_client_status` | `client_id, loan_status` | COMPOSITE | Active loans per client (reloan calc) |
| `loans` | `idx_loans_application_status` | `application_status` | INDEX | Filter applications |
| `loans` | `idx_loans_loan_status` | `loan_status` | INDEX | Filter active/past_due/etc |
| `loans` | `idx_loans_collection_status` | `collection_status` | INDEX | Collector views |
| `loans` | `idx_loans_created_by` | `created_by` | INDEX | Loans by officer |
| `loans` | `idx_loans_approved_by` | `approved_by` | INDEX | Approvals by approver |
| `loans` | `idx_loans_created_at` | `created_at` | INDEX | Recent loans ordering |
| `loans` | `idx_loans_deleted_at` | `deleted_at` | INDEX | Soft delete filtering |
| `loan_installments` | `PRIMARY` | `id` | PK | Row identity |
| `loan_installments` | `idx_installments_loan` | `loan_id, installment_number` | COMPOSITE | Loan's installments in order |
| `loan_installments` | `idx_installments_due_status` | `due_date, status` | COMPOSITE | Find overdue/pending installments |
| `loan_installments` | `idx_installments_status` | `status` | INDEX | Filter by payment status |
| `late_fees` | `PRIMARY` | `id` | PK | Row identity |
| `late_fees` | `idx_late_fees_installment` | `loan_installment_id` | INDEX | Find fees per installment |
| `late_fees` | `idx_late_fees_applied_at` | `applied_at` | INDEX | Monthly recurrence check |
| `payments` | `PRIMARY` | `id` | PK | Row identity |
| `payments` | `idx_payments_loan` | `loan_id, payment_date` | COMPOSITE | Loan's payment history |
| `payments` | `idx_payments_client` | `client_id` | INDEX | Borrower's payment history |
| `payments` | `idx_payments_date` | `payment_date` | INDEX | Daily collection reports |
| `payments` | `idx_payments_method` | `payment_method` | INDEX | Filter by channel |
| `loan_release_sources` | `PRIMARY` | `id` | PK | Row identity |
| `loan_release_sources` | `idx_release_sources_loan` | `loan_id` | INDEX | Loan's release sources |
| `documents` | `PRIMARY` | `id` | PK | Row identity |
| `documents` | `idx_documents_poly` | `documentable_type, documentable_id` | COMPOSITE | Polymorphic lookup |
| `documents` | `idx_documents_type` | `type` | INDEX | Filter by document type |
| `payment_types` | `PRIMARY` | `id` | PK | Row identity |
| `payment_types` | `uq_payment_types_name_category` | `name, category` | UNIQUE | Prevent duplicates |
| `payment_types` | `idx_payment_types_category` | `category` | INDEX | Filter by category |
| `audit_logs` | `PRIMARY` | `id` | PK | Row identity |
| `audit_logs` | `idx_audit_logs_user` | `user_id` | INDEX | Actor queries |
| `audit_logs` | `idx_audit_logs_entity` | `entity_type, entity_id` | COMPOSITE | Per-entity audit trail |
| `audit_logs` | `idx_audit_logs_action` | `action` | INDEX | Filter by action type |
| `audit_logs` | `idx_audit_logs_created_at` | `created_at` | INDEX | Time-range queries |

**Total**: 40 indexes across 12 tables.

---

## 7. Constraints

### 7.1 CHECK Constraints (MySQL 8.0.16+)

```sql
-- Loan amount must be positive
ALTER TABLE `loans`
    ADD CONSTRAINT `chk_loans_amount_positive` CHECK (`amount` > 0);

-- Term must be 0.5-5 months
ALTER TABLE `loans`
    ADD CONSTRAINT `chk_loans_term_months_range` CHECK (`term_months` IS NULL OR `term_months` BETWEEN 0.5 AND 5);

-- Interest rate must be non-negative
ALTER TABLE `loans`
    ADD CONSTRAINT `chk_loans_interest_rate` CHECK (`interest_rate_per_month` >= 0);

-- Payment amount must be positive
ALTER TABLE `payments`
    ADD CONSTRAINT `chk_payments_amount_positive` CHECK (`amount` > 0);

-- Installment amount must be positive
ALTER TABLE `loan_installments`
    ADD CONSTRAINT `chk_installments_amount_positive` CHECK (`amount` > 0);

-- Late fee amount must be positive
ALTER TABLE `late_fees`
    ADD CONSTRAINT `chk_late_fees_amount_positive` CHECK (`amount` > 0);

-- Release source amount must be positive
ALTER TABLE `loan_release_sources`
    ADD CONSTRAINT `chk_release_source_amount` CHECK (`amount` > 0);

-- Payment types category must be valid
ALTER TABLE `payment_types`
    ADD CONSTRAINT `chk_payment_types_category` CHECK (`category` IN ('payment_method', 'release_method'));
```

### 7.2 Application Status Constraint (Application-Level)

Application statuses are enforced at the application layer (Enum classes) rather than via MySQL CHECK because the list may evolve:

```
draft | submitted | under_review | pending_documents | approved | rejected | cancelled
```

### 7.3 NOT NULL Constraints

All monetary columns (`amount`, `total_interest`, `net_proceeds`, `installment_amount`, `paid_amount`, `charges`, `old_balance`) are `NOT NULL` with `DEFAULT 0.00` where applicable.

---

## 8. Triggers

### 8.1 Audit Trigger — `loans`

Automatically logs state changes on the `loans` table to `audit_logs`.

```sql
DELIMITER $$

CREATE TRIGGER `trg_loans_after_update`
AFTER UPDATE ON `loans`
FOR EACH ROW
BEGIN
    DECLARE changed INT DEFAULT 0;

    IF NOT (NEW.application_status <=> OLD.application_status
        AND NEW.loan_status <=> OLD.loan_status
        AND NEW.collection_status <=> OLD.collection_status
        AND NEW.amount <=> OLD.amount
        AND NEW.net_proceeds <=> OLD.net_proceeds) THEN
        SET changed = 1;
    END IF;

    IF changed = 1 THEN
        INSERT INTO `audit_logs` (
            `user_id`, `action`, `entity_type`, `entity_id`,
            `old_state`, `new_state`, `created_at`
        ) VALUES (
            @audit_user_id,
            'updated',
            'App\\Models\\Loan',
            NEW.id,
            JSON_OBJECT(
                'application_status', OLD.application_status,
                'loan_status', OLD.loan_status,
                'collection_status', OLD.collection_status,
                'amount', OLD.amount,
                'net_proceeds', OLD.net_proceeds
            ),
            JSON_OBJECT(
                'application_status', NEW.application_status,
                'loan_status', NEW.loan_status,
                'collection_status', NEW.collection_status,
                'amount', NEW.amount,
                'net_proceeds', NEW.net_proceeds
            ),
            NOW()
        );
    END IF;
END$$

DELIMITER ;
```

**Usage pattern**: The application sets `@audit_user_id` before making changes:

```php
DB::statement('SET @audit_user_id = ?', [auth()->id()]);
$loan->update([...]);
```

### 8.2 Audit Trigger — `payments`

```sql
DELIMITER $$

CREATE TRIGGER `trg_payments_after_insert`
AFTER INSERT ON `payments`
FOR EACH ROW
BEGIN
    INSERT INTO `audit_logs` (
        `user_id`, `action`, `entity_type`, `entity_id`,
        `new_state`, `created_at`
    ) VALUES (
        @audit_user_id,
        'created',
        'App\\Models\\Payment',
        NEW.id,
        JSON_OBJECT(
            'loan_id', NEW.loan_id,
            'client_id', NEW.client_id,
            'amount', NEW.amount,
            'payment_method', NEW.payment_method,
            'payment_date', NEW.payment_date
        ),
        NOW()
    );
END$$

DELIMITER ;
```

### 8.3 Audit Trigger — `loan_installments`

```sql
DELIMITER $$

CREATE TRIGGER `trg_installments_after_update`
AFTER UPDATE ON `loan_installments`
FOR EACH ROW
BEGIN
    IF NEW.status <=> OLD.status AND NEW.paid_amount <=> OLD.paid_amount THEN
        -- No significant change; skip
    ELSE
        INSERT INTO `audit_logs` (
            `user_id`, `action`, `entity_type`, `entity_id`,
            `old_state`, `new_state`, `created_at`
        ) VALUES (
            @audit_user_id,
            'updated',
            'App\\Models\\LoanInstallment',
            NEW.id,
            JSON_OBJECT('status', OLD.status, 'paid_amount', OLD.paid_amount),
            JSON_OBJECT('status', NEW.status, 'paid_amount', NEW.paid_amount),
            NOW()
        );
    END IF;
END$$

DELIMITER ;
```

---

## 9. Views

### 9.1 `vw_loan_balances`

Active loan balances for the dashboard and reloan calculations.

```sql
CREATE OR REPLACE VIEW `vw_loan_balances` AS
SELECT
    l.id AS loan_id,
    l.client_id,
    c.name AS client_name,
    l.amount AS gross_amount,
    l.total_interest,
    l.net_proceeds,
    l.loan_status,
    l.application_status,
    l.term_months,
    l.released_at,
    COALESCE(SUM(p.amount), 0) AS total_paid,
    l.amount - COALESCE(SUM(p.amount), 0) AS remaining_balance,
    l.total_installments,
    COUNT(i.id) AS installments_total,
    SUM(CASE WHEN i.status = 'paid' THEN 1 ELSE 0 END) AS installments_paid,
    SUM(CASE WHEN i.status IN ('due', 'overdue', 'missed') THEN 1 ELSE 0 END) AS installments_overdue,
    COALESCE(SUM(lf.amount), 0) AS total_late_fees,
    DATEDIFF(CURDATE(), MIN(CASE WHEN i.status IN ('due', 'overdue', 'missed') THEN i.due_date END)) AS max_days_overdue
FROM loans l
JOIN clients c ON c.id = l.client_id
LEFT JOIN payments p ON p.loan_id = l.id
LEFT JOIN loan_installments i ON i.loan_id = l.id
LEFT JOIN late_fees lf ON lf.loan_installment_id = i.id
WHERE l.deleted_at IS NULL
  AND c.deleted_at IS NULL
GROUP BY l.id, l.client_id, c.name, l.amount, l.total_interest, l.net_proceeds,
         l.loan_status, l.application_status, l.term_months, l.released_at,
         l.total_installments;
```

### 9.2 `vw_daily_collections`

Daily payment aggregates for reports and dashboard.

```sql
CREATE OR REPLACE VIEW `vw_daily_collections` AS
SELECT
    p.payment_date,
    p.payment_method,
    COUNT(*) AS transaction_count,
    SUM(p.amount) AS total_amount,
    MIN(p.amount) AS min_amount,
    MAX(p.amount) AS max_amount,
    AVG(p.amount) AS avg_amount
FROM payments p
GROUP BY p.payment_date, p.payment_method
ORDER BY p.payment_date DESC;
```

### 9.3 `vw_overdue_summary`

Overdue accounts for the collector dashboard.

```sql
CREATE OR REPLACE VIEW `vw_overdue_summary` AS
SELECT
    l.id AS loan_id,
    l.client_id,
    c.name AS client_name,
    c.contact_number,
    l.amount,
    l.loan_status,
    l.collection_status,
    l.released_at,
    COUNT(i.id) AS overdue_installments_count,
    SUM(i.amount - i.paid_amount) AS overdue_principal,
    COALESCE(SUM(lf.amount), 0) AS accumulated_late_fees,
    MIN(i.due_date) AS earliest_due_date,
    MAX(DATEDIFF(CURDATE(), i.due_date)) AS max_days_overdue,
    CASE
        WHEN MAX(DATEDIFF(CURDATE(), i.due_date)) >= 90 THEN 'CRITICAL'
        WHEN MAX(DATEDIFF(CURDATE(), i.due_date)) >= 60 THEN 'HIGH'
        WHEN MAX(DATEDIFF(CURDATE(), i.due_date)) >= 30 THEN 'MEDIUM'
        ELSE 'LOW'
    END AS risk_level
FROM loans l
JOIN clients c ON c.id = l.client_id
JOIN loan_installments i ON i.loan_id = l.id
LEFT JOIN late_fees lf ON lf.loan_installment_id = i.id
WHERE i.status IN ('due', 'overdue', 'missed')
  AND i.due_date < CURDATE()
  AND l.loan_status IN ('active', 'past_due', 'delinquent')
  AND l.deleted_at IS NULL
  AND c.deleted_at IS NULL
GROUP BY l.id, l.client_id, c.name, c.contact_number, l.amount,
         l.loan_status, l.collection_status, l.released_at
ORDER BY max_days_overdue DESC;
```

### 9.4 `vw_portfolio_summary`

Single-row summary for the dashboard KPI card.

```sql
CREATE OR REPLACE VIEW `vw_portfolio_summary` AS
SELECT
    (SELECT COUNT(*) FROM clients WHERE deleted_at IS NULL) AS total_clients,
    (SELECT COUNT(*) FROM loans WHERE loan_status IN ('active', 'past_due') AND deleted_at IS NULL) AS active_loans,
    (SELECT COUNT(*) FROM loans WHERE application_status IN ('submitted', 'under_review', 'pending_documents') AND deleted_at IS NULL) AS pending_applications,
    (SELECT COUNT(*) FROM loans WHERE loan_status = 'fully_paid' AND deleted_at IS NULL) AS completed_loans,
    (SELECT COUNT(*) FROM loans WHERE loan_status = 'defaulted' AND deleted_at IS NULL) AS defaulted_loans,
    (SELECT COALESCE(SUM(amount), 0) FROM payments) AS total_collections,
    (SELECT COALESCE(SUM(amount), 0) FROM loans WHERE loan_status IN ('active', 'past_due', 'delinquent') AND deleted_at IS NULL) AS total_exposure,
    (SELECT COALESCE(SUM(amount), 0) FROM late_fees) AS total_late_fees;
```

---

## 10. Stored Procedures

### 10.1 `sp_apply_late_fees`

Applies PHP 500 late fees to overdue installments that haven't received a fee this calendar month. Also escalates installment and loan statuses.

```sql
DELIMITER $$

CREATE PROCEDURE `sp_apply_late_fees`()
BEGIN
    DECLARE v_applied_count INT DEFAULT 0;
    DECLARE v_done INT DEFAULT 0;
    DECLARE v_installment_id BIGINT UNSIGNED;
    DECLARE v_loan_id BIGINT UNSIGNED;
    DECLARE v_days_overdue INT;

    DECLARE cur CURSOR FOR
        SELECT i.id, i.loan_id, DATEDIFF(CURDATE(), i.due_date)
        FROM loan_installments i
        WHERE i.status IN ('due', 'overdue', 'missed')
          AND i.due_date < CURDATE()
          AND NOT EXISTS (
              SELECT 1 FROM late_fees lf
              WHERE lf.loan_installment_id = i.id
                AND YEAR(lf.applied_at) = YEAR(CURDATE())
                AND MONTH(lf.applied_at) = MONTH(CURDATE())
          );

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

    OPEN cur;

    read_loop: LOOP
        FETCH cur INTO v_installment_id, v_loan_id, v_days_overdue;
        IF v_done THEN
            LEAVE read_loop;
        END IF;

        INSERT INTO late_fees (loan_installment_id, amount, applied_at, created_at, updated_at)
        VALUES (v_installment_id, 500.00, CURDATE(), NOW(), NOW());

        UPDATE loan_installments
        SET status = CASE
                WHEN v_days_overdue >= 60 THEN 'missed'
                ELSE 'overdue'
            END,
            updated_at = NOW()
        WHERE id = v_installment_id;

        SET v_applied_count = v_applied_count + 1;
    END LOOP;

    CLOSE cur;

    UPDATE loans l
    SET l.loan_status = 'past_due',
        l.updated_at = NOW()
    WHERE l.loan_status = 'active'
      AND l.deleted_at IS NULL
      AND EXISTS (
          SELECT 1 FROM loan_installments i
          WHERE i.loan_id = l.id
            AND i.status IN ('due', 'overdue', 'missed')
            AND i.due_date < CURDATE()
      );

    UPDATE loans l
    SET l.loan_status = 'defaulted',
        l.updated_at = NOW()
    WHERE l.loan_status IN ('past_due', 'delinquent')
      AND l.deleted_at IS NULL
      AND EXISTS (
          SELECT 1 FROM loan_installments i
          WHERE i.loan_id = l.id
            AND i.status IN ('due', 'overdue', 'missed')
            AND i.due_date < CURDATE()
            AND DATEDIFF(CURDATE(), i.due_date) >= 90
      );

    SELECT v_applied_count AS late_fees_applied;
END$$

DELIMITER ;
```

### 10.2 `sp_calculate_loan`

Computes interest, net proceeds, and installment schedule for a loan. Used by both the calculator endpoint and the loan creation process.

```sql
DELIMITER $$

CREATE PROCEDURE `sp_calculate_loan`(
    IN p_amount DECIMAL(12,2),
    IN p_term_months INT,
    IN p_interest_rate DECIMAL(5,2),
    IN p_first_due_date DATE,
    IN p_client_id BIGINT UNSIGNED
)
BEGIN
    DECLARE v_total_interest DECIMAL(12,2);
    DECLARE v_net_proceeds DECIMAL(12,2);
    DECLARE v_total_installments INT;
    DECLARE v_installment_amount DECIMAL(12,2);
    DECLARE v_total_existing_balance DECIMAL(12,2) DEFAULT 0.00;

    SET v_total_interest = ROUND(p_amount * (p_interest_rate / 100) * p_term_months, 2);
    SET v_net_proceeds = ROUND(p_amount - v_total_interest, 2);
    SET v_total_installments = p_term_months * 2;
    SET v_installment_amount = ROUND(p_amount / v_total_installments, 2);

    IF p_client_id IS NOT NULL THEN
        SELECT COALESCE(SUM(remaining_balance), 0)
        INTO v_total_existing_balance
        FROM vw_loan_balances
        WHERE client_id = p_client_id
          AND loan_status IN ('active', 'past_due', 'delinquent');
    END IF;

    SELECT
        p_amount AS amount,
        p_term_months AS term_months,
        p_interest_rate AS interest_rate_per_month,
        v_total_interest AS total_interest,
        v_net_proceeds AS net_proceeds,
        v_total_installments AS total_installments,
        v_installment_amount AS installment_amount,
        v_total_existing_balance AS total_existing_balance,
        GREATEST(v_net_proceeds - v_total_existing_balance, 0) AS net_proceeds_after_deduction,
        p_amount + v_total_existing_balance AS total_exposure;
END$$

DELIMITER ;
```

### 10.3 `sp_auto_close_reloan`

Called during loan release to close existing active loans when processing a reloan.

```sql
DELIMITER $$

CREATE PROCEDURE `sp_auto_close_reloan`(
    IN p_client_id BIGINT UNSIGNED,
    IN p_new_loan_id BIGINT UNSIGNED
)
BEGIN
    DECLARE v_closed_count INT DEFAULT 0;

    UPDATE loans
    SET loan_status = 'fully_paid',
        closed_at = NOW(),
        updated_at = NOW()
    WHERE client_id = p_client_id
      AND id != p_new_loan_id
      AND loan_status IN ('active', 'past_due', 'delinquent')
      AND deleted_at IS NULL;

    SET v_closed_count = ROW_COUNT();

    SELECT v_closed_count AS loans_closed;
END$$

DELIMITER ;
```

---

## 11. Migration Plan

### New migrations to add (Phase 0)

| # | Migration | DDL |
|---|-----------|-----|
| 24 | `2026_08_04_000001_create_roles_table.php` | CREATE TABLE `roles` |
| 25 | `2026_08_04_000002_add_role_id_to_users.php` | ALTER TABLE `users` ADD `role_id`, ADD `is_active` |
| 26 | `2026_08_04_000003_create_audit_logs_table.php` | CREATE TABLE `audit_logs` |
| 27 | `2026_08_04_000004_add_created_by_to_loans.php` | ALTER TABLE `loans` ADD `created_by`, ADD `approved_by` |
| 28 | `2026_08_04_000005_add_proof_to_payments.php` | ALTER TABLE `payments` ADD `proof_image` |
| 29 | `2026_08_04_000006_add_check_constraints.php` | ALTER TABLE loans/payments/installments ADD CHECK |
| 30 | `2026_08_04_000007_create_views.php` | CREATE VIEW (4 views) |
| 31 | `2026_08_04_000008_create_procedures.php` | CREATE PROCEDURE (3 procedures) |
| 32 | `2026_08_04_000009_create_triggers.php` | CREATE TRIGGER (3 triggers) |

---

## 12. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Statuses as VARCHAR, not ENUM | ENUM alterations require `ALTER TABLE`; VARCHAR allows app-level evolution |
| `decimal(12,2)` for all money | Covers up to PHP 9,999,999,999.99 with 2 decimal precision; no float rounding errors |
| Soft deletes on `clients` and `loans` only | Payment/installment records are immutable evidence; clients/loans may be deactivated |
| `ON DELETE CASCADE` for financial children | Payments and installments have no meaning without their parent loan |
| `ON DELETE SET NULL` for user references | If a user is deleted, historical records (created_by, approved_by) should persist with NULL |
| JSON columns for `old_state`/`new_state` in audit_logs | Flexible schema avoids column-per-field complexity; queryable via `JSON_EXTRACT()` |
| Triggers for audit logging | Ensures audit trail cannot be bypassed from any code path or direct DB access |
| Views for reporting | Encapsulates complex joins; used by dashboard and reports without duplicating query logic |
| Stored procedures for business operations | Centralizes late fee logic, loan calculation, and reloan closure in one authoritative location |

---

**Version**: 1.0.0 | **Date**: 2026-08-04
