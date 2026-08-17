# Ajang Loan System — REST API Design

## Conventions

| Aspect | Standard |
|--------|----------|
| Base URL | `/api` |
| Envelope | `{ "success": bool, "data": T, "message": string, "error": { "message": string, "code": string } }` |
| Auth Header | `Authorization: Bearer {token}` |
| Content-Type | `application/json` (multipart/form-data for uploads) |
| Pagination | `?per_page=15` (default), returns `PaginatedResponse<T>` |
| Date Format | `YYYY-MM-DD` for dates, ISO 8601 for datetimes |
| Currency | All amounts in PHP, `decimal(12,2)` |

---

## 1. Authentication

### 1.1 Register

```
POST /api/register
```

**Headers**

| Key | Value |
|-----|-------|
| `Content-Type` | `application/json` |
| `Accept` | `application/json` |

**Request Body**

```json
{
    "name": "Juan Dela Cruz",
    "email": "juan@example.com",
    "password": "password123",
    "password_confirmation": "password123"
}
```

**Validation**

| Field | Rules |
|-------|-------|
| `name` | required, string, max:255 |
| `email` | required, email, unique:users |
| `password` | required, string, min:8, confirmed |

**Response `201 Created`**

```json
{
    "success": true,
    "data": {
        "user": {
            "id": 1,
            "name": "Juan Dela Cruz",
            "email": "juan@example.com",
            "role": null,
            "role_id": null,
            "is_active": true,
            "created_at": "2026-08-04T10:30:00.000000Z",
            "updated_at": "2026-08-04T10:30:00.000000Z"
        },
        "token": "1|abc123def456..."
    },
    "message": "Registration successful"
}
```

**Errors**

| Status | Code | Description |
|--------|------|-------------|
| 422 | VALIDATION_ERROR | Email already taken, password mismatch |

---

### 1.2 Login

```
POST /api/login
```

**Headers**

| Key | Value |
|-----|-------|
| `Content-Type` | `application/json` |
| `Accept` | `application/json` |

**Request Body**

```json
{
    "email": "juan@example.com",
    "password": "password123"
}
```

**Validation**

| Field | Rules |
|-------|-------|
| `email` | required, email |
| `password` | required, string |

**Response `200 OK`**

```json
{
    "success": true,
    "data": {
        "user": {
            "id": 1,
            "name": "Juan Dela Cruz",
            "email": "juan@example.com",
            "role": { "id": 2, "name": "Loan Officer", "slug": "loan_officer" },
            "role_id": 2,
            "is_active": true,
            "created_at": "2026-08-04T10:30:00.000000Z",
            "updated_at": "2026-08-04T10:30:00.000000Z"
        },
        "token": "1|abc123def456..."
    }
}
```

**Errors**

| Status | Code | Description |
|--------|------|-------------|
| 401 | INVALID_CREDENTIALS | Email or password incorrect |

---

### 1.3 Logout

```
POST /api/logout
```

**Headers**

| Key | Value |
|-----|-------|
| `Authorization` | `Bearer {token}` |
| `Accept` | `application/json` |

**Request Body** — none

**Response `200 OK`**

```json
{
    "success": true,
    "data": null,
    "message": "Logged out successfully"
}
```

**Errors**

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHENTICATED | Missing or invalid token |

---

### 1.4 Current User

```
GET /api/user
```

**Headers**

| Key | Value |
|-----|-------|
| `Authorization` | `Bearer {token}` |
| `Accept` | `application/json` |

**Response `200 OK`**

```json
{
    "success": true,
    "data": {
        "id": 1,
        "name": "Juan Dela Cruz",
        "email": "juan@example.com",
        "role": { "id": 2, "name": "Loan Officer", "slug": "loan_officer" },
        "role_id": 2,
        "is_active": true,
        "created_at": "2026-08-04T10:30:00.000000Z",
        "updated_at": "2026-08-04T10:30:00.000000Z"
    }
}
```

---

## 2. Borrowers (Clients)

### 2.1 List Borrowers

```
GET /api/clients
Roles: loan_officer, approver, administrator
```

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | — | Search by name, contact, or work |
| `per_page` | integer | 15 | Records per page |

**Response `200 OK`**

```json
{
    "success": true,
    "data": {
        "data": [
            {
                "id": 1,
                "name": "Maria Santos",
                "address": "123 Rizal St.",
                "work": "Teacher",
                "work_address": "DepEd Office",
                "contact_number": "09171234567",
                "social_media": { "facebook": "maria.santos" },
                "notes": "Regular borrower",
                "photo": "clients/abc123.jpg",
                "photo_url": "https://example.com/storage/clients/abc123.jpg",
                "loans_count": 3,
                "loans_by_status": "active: 1, fully_paid: 2",
                "created_at": "2026-08-01T00:00:00.000000Z",
                "updated_at": "2026-08-04T00:00:00.000000Z",
                "deleted_at": null
            }
        ],
        "links": { "first": "...", "last": "...", "prev": null, "next": "..." },
        "meta": { "current_page": 1, "from": 1, "last_page": 1, "per_page": 15, "to": 1, "total": 1 }
    }
}
```

### 2.2 Create Borrower

```
POST /api/clients
Roles: loan_officer, administrator
```

**Headers**

| Key | Value |
|-----|-------|
| `Content-Type` | `multipart/form-data` |
| `Authorization` | `Bearer {token}` |

**Request Body (multipart/form-data)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Full name |
| `address` | text | no | Residential address |
| `work` | string | no | Employer / occupation |
| `work_address` | text | no | Work address |
| `contact_number` | string | no | Mobile/phone |
| `social_media` | JSON string | no | `{"facebook":"...","messenger":"..."}` |
| `notes` | text | no | General remarks |
| `photo` | file (image) | no | JPEG/PNG, max 2MB |

**Validation**

| Field | Rules |
|-------|-------|
| `name` | required, string, max:255 |
| `address` | nullable, string |
| `work` | nullable, string, max:255 |
| `work_address` | nullable, string |
| `contact_number` | nullable, string, max:20 |
| `social_media` | nullable, json |
| `notes` | nullable, string |
| `photo` | nullable, image, mimes:jpg,jpeg,png, max:2048 |

**Response `201 Created`**

```json
{
    "success": true,
    "data": {
        "id": 2,
        "name": "Pedro Cruz",
        "address": "456 Mabini St.",
        "work": "Driver",
        "work_address": "LTO Main",
        "contact_number": "09189876543",
        "social_media": null,
        "notes": null,
        "photo": "clients/def456.jpg",
        "photo_url": "https://example.com/storage/clients/def456.jpg",
        "created_at": "2026-08-04T11:00:00.000000Z",
        "updated_at": "2026-08-04T11:00:00.000000Z",
        "deleted_at": null
    },
    "message": "Client created successfully"
}
```

**Errors**

| Status | Code | Description |
|--------|------|-------------|
| 422 | VALIDATION_ERROR | Name required, invalid photo format |

### 2.3 Get Borrower

```
GET /api/clients/{client}
Roles: any authenticated
```

**Response `200 OK`** — Client with nested `documents[]` and `loans[]` (ordered by created_at desc).

### 2.4 Update Borrower

```
PUT /api/clients/{client}
Roles: loan_officer, administrator
```

Same form fields as Create. Photo upload replaces previous photo (old file deleted).

**Response `200 OK`**

```json
{
    "success": true,
    "data": {},
    "message": "Client updated successfully"
}
```

### 2.5 Delete Borrower

```
DELETE /api/clients/{client}
Roles: administrator
```

**Constraints**: Cannot delete client with existing loans.

**Errors**

| Status | Code | Description |
|--------|------|-------------|
| 422 | HAS_LOANS | Cannot delete client with existing loans |

### 2.6 List Borrower Documents

```
GET /api/clients/{client}/documents
Roles: any authenticated
```

**Response `200 OK`**

```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "documentable_type": "App\\Models\\Client",
            "documentable_id": 1,
            "type": "govt_id",
            "file_path": "documents/ghi789.jpg",
            "original_name": "umid_card.jpg",
            "ocr_verified": false,
            "ocr_data": null,
            "view_url": "https://example.com/api/documents/1/view",
            "created_at": "2026-08-04T11:30:00.000000Z",
            "updated_at": "2026-08-04T11:30:00.000000Z"
        }
    ]
}
```

### 2.7 Upload Borrower Document

```
POST /api/clients/{client}/documents
Roles: loan_officer, administrator
```

**Request Body (multipart/form-data)**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `type` | string | yes | in:govt_id,payslip,coe,billing,bank,other |
| `file` | file | yes | max 10240 (10MB), mimes:jpg,jpeg,png,pdf |

**Response `201 Created`** — returns created Document.

### 2.8 Delete Document

```
DELETE /api/documents/{document}
Roles: loan_officer, administrator
```

**Response `200 OK`**

```json
{
    "success": true,
    "data": null,
    "message": "Document deleted successfully"
}
```

---

## 3. Loans

### 3.1 Calculate Loan

```
POST /api/loans/calculate
Roles: loan_officer, approver
```

**Request Body**

```json
{
    "amount": 10000,
    "term_months": 3,
    "interest_rate_per_month": 10,
    "client_id": 1,
    "first_payment_due_date": "2026-08-20"
}
```

**Validation**

| Field | Rules |
|-------|-------|
| `amount` | required, numeric, min:1 |
| `term_months` | required, numeric, min:0.5, max:5 |
| `interest_rate_per_month` | nullable, numeric, min:0 (default: 10) |
| `client_id` | nullable, integer, exists:clients,id |
| `first_payment_due_date` | nullable, date |

**Response `200 OK` — without client_id**

```json
{
    "success": true,
    "data": {
        "amount": 10000,
        "term_months": 3,
        "interest_rate_per_month": 10,
        "total_interest": 3000.00,
        "net_proceeds": 7000.00,
        "total_installments": 6,
        "installment_amount": 1666.67,
        "schedule": [
            { "installment_number": 1, "due_date": "2026-08-20", "amount": 1666.67 },
            { "installment_number": 2, "due_date": "2026-09-04", "amount": 1666.67 },
            { "installment_number": 3, "due_date": "2026-09-19", "amount": 1666.67 },
            { "installment_number": 4, "due_date": "2026-10-04", "amount": 1666.67 },
            { "installment_number": 5, "due_date": "2026-10-19", "amount": 1666.67 },
            { "installment_number": 6, "due_date": "2026-11-04", "amount": 1666.65 }
        ]
    }
}
```

**Response `200 OK` — with client_id (reloan calculation)**

```json
{
    "success": true,
    "data": {
        "amount": 20000,
        "term_months": 3,
        "interest_rate_per_month": 10,
        "total_interest": 6000.00,
        "net_proceeds": 14000.00,
        "total_installments": 6,
        "installment_amount": 3333.33,
        "schedule": [],
        "existing_loans": [
            {
                "id": 1,
                "amount": 5000.00,
                "remaining_balance": 2000.00,
                "loan_status": "active",
                "term_months": 2
            }
        ],
        "total_existing_balance": 2000.00,
        "net_proceeds_after_deduction": 12000.00,
        "total_exposure": 22000.00
    }
}
```

---

### 3.2 Create Loan Application

```
POST /api/loans
Roles: loan_officer
```

**Request Body**

```json
{
    "client_id": 1,
    "amount": 10000,
    "term_months": 3,
    "interest_rate_per_month": 10,
    "charges": 0,
    "charges_description": null,
    "old_balance": 0,
    "first_payment_due_date": "2026-08-20",
    "application_status": "draft"
}
```

**Validation**

| Field | Rules |
|-------|-------|
| `client_id` | required, exists:clients,id |
| `amount` | required, numeric, min:1 |
| `term_months` | required, numeric, min:0.5, max:5 |
| `interest_rate_per_month` | nullable, numeric, min:0 |
| `charges` | nullable, numeric, min:0 |
| `charges_description` | nullable, string, max:255 |
| `old_balance` | nullable, numeric, min:0 |
| `first_payment_due_date` | nullable, date |
| `application_status` | sometimes, string, in:draft,submitted (default: submitted) |

**Response `201 Created`**

```json
{
    "success": true,
    "data": {
        "id": 1,
        "client_id": 1,
        "created_by": 2,
        "approved_by": null,
        "term_months": 3,
        "interest_rate_per_month": 10.00,
        "charges": 0.00,
        "charges_description": null,
        "old_balance": 0.00,
        "first_payment_due_date": "2026-08-20",
        "application_status": "draft",
        "loan_status": null,
        "collection_status": null,
        "amount": 10000.00,
        "total_interest": 3000.00,
        "net_proceeds": 7000.00,
        "installment_amount": 1666.67,
        "total_installments": 6,
        "approved_at": null,
        "released_at": null,
        "closed_at": null,
        "remaining_balance": 10000.00,
        "created_at": "2026-08-04T12:00:00.000000Z",
        "updated_at": "2026-08-04T12:00:00.000000Z",
        "deleted_at": null,
        "client": {}
    },
    "message": "Loan application saved as draft"
}
```

---

### 3.3 List Loans

```
GET /api/loans
Roles: any authenticated
```

**Query Parameters**

| Param | Type | Example | Description |
|-------|------|---------|-------------|
| `application_status` | string or array | `submitted` | Filter by application status |
| `loan_status` | string or array | `active,past_due` | Filter by loan status |
| `client_id` | integer | 1 | Filter by borrower |
| `search` | string | `Santos` | Search by client name |
| `per_page` | integer | 15 | Records per page |

**Response `200 OK`** — paginated Loan array, each with nested `client`.

---

### 3.4 Get Loan

```
GET /api/loans/{loan}
Roles: any authenticated
```

**Response `200 OK`** — Loan with nested `client.documents`, `installments.late_fees`, `payments`, `release_sources`, `created_by`, `approved_by`.

---

### 3.5 Submit Application

```
PUT /api/loans/{loan}/submit
Roles: loan_officer
```

**Constraints** — application_status must be `draft`.

**Response `200 OK`**

```json
{
    "success": true,
    "data": {},
    "message": "Application submitted for review"
}
```

**Errors**

| Status | Code | Description |
|--------|------|-------------|
| 422 | INVALID_TRANSITION | Only draft applications can be submitted |

---

### 3.6 Update Review Status

```
PUT /api/loans/{loan}/review-status
Roles: approver
```

**Request Body**

```json
{
    "application_status": "under_review"
}
```

**Validation** — `application_status` must be one of: `under_review`, `pending_documents`, `submitted`.

**Constraints** — current application_status must be `submitted`, `under_review`, or `pending_documents`.

**Response `200 OK`**

```json
{
    "success": true,
    "data": {},
    "message": "Review status updated"
}
```

---

### 3.7 Approve Application

```
PUT /api/loans/{loan}/approve
Roles: approver
```

**Request Body**

```json
{
    "amount": 10000,
    "interest_rate_per_month": 10,
    "term_months": 3
}
```

**Validation**

| Field | Rules |
|-------|-------|
| `amount` | nullable, numeric, min:1 |
| `interest_rate_per_month` | nullable, numeric, min:0 |
| `term_months` | nullable, numeric, min:0.5, max:5 |

If any field is provided, the schedule is recalculated with the new values.

**Constraints**

1. Current application_status must be `submitted`, `under_review`, or `pending_documents`
2. Approver must not be the same user who created the loan (segregation of duties)

**Response `200 OK`**

```json
{
    "success": true,
    "data": {
        "id": 1,
        "application_status": "approved",
        "loan_status": "waiting_for_release",
        "approved_at": "2026-08-04T13:00:00.000000Z",
        "approved_by": 3,
        "total_interest": 3000.00,
        "net_proceeds": 7000.00,
        "installment_amount": 1666.67,
        "total_installments": 6,
        "installments": [
            { "id": 1, "installment_number": 1, "due_date": "2026-08-20", "amount": 1666.67, "paid_amount": 0, "status": "pending", "paid_at": null },
            { "id": 2, "installment_number": 2, "due_date": "2026-09-04", "amount": 1666.67, "paid_amount": 0, "status": "pending", "paid_at": null }
        ]
    },
    "message": "Loan application approved"
}
```

**Errors**

| Status | Code | Description |
|--------|------|-------------|
| 422 | INVALID_TRANSITION | Application cannot be approved in its current status |
| 422 | SELF_APPROVAL | Loan officer cannot approve own application |

---

### 3.8 Reject Application

```
PUT /api/loans/{loan}/reject
Roles: approver
```

**Constraints** — application_status must be `submitted`, `under_review`, or `pending_documents`.

**Response `200 OK`**

```json
{
    "success": true,
    "data": {},
    "message": "Loan application rejected"
}
```

---

### 3.9 Edit Loan (Pre-Release)

```
PUT /api/loans/{loan}
Roles: loan_officer, approver
```

**Constraints** — `loan_status` must be `waiting_for_release`.

**Request Body**

```json
{
    "amount": 12000,
    "term_months": 4,
    "interest_rate_per_month": 10,
    "charges": 500,
    "charges_description": "Processing fee",
    "old_balance": 0,
    "first_payment_due_date": "2026-09-01"
}
```

**Validation** — all financial fields required.

| Field | Rules |
|-------|-------|
| `amount` | required, numeric, min:1 |
| `term_months` | required, numeric, min:0.5, max:5 |
| `interest_rate_per_month` | required, numeric, min:0 |
| `charges` | nullable, numeric, min:0 |
| `charges_description` | nullable, string, max:255 |
| `old_balance` | nullable, numeric, min:0 |
| `first_payment_due_date` | nullable, date |

**Behavior** — deletes existing installments, recalculates, and regenerates schedule.

**Response `200 OK`**

```json
{
    "success": true,
    "data": {},
    "message": "Loan details updated"
}
```

---

### 3.10 Release Loan

```
PUT /api/loans/{loan}/release
Roles: cashier
```

**Constraints**

1. `loan_status` must be `waiting_for_release`
2. Total source amounts must equal `net_proceeds - charges - old_balance`
3. **Reloan auto-close**: if `old_balance > 0`, all existing active/past_due/delinquent loans for this client are auto-closed

**Request Body (multipart/form-data)**

```json
{
    "sources": [
        {
            "release_method": "Cash",
            "amount": 5000.00,
            "notes": "Counter disbursement"
        },
        {
            "release_method": "GCash",
            "amount": 2000.00,
            "notes": null
        }
    ],
    "release_notes": "Full release"
}
```

Optional proof images per source: `sources.0.proof_image` (file, jpg/jpeg/png, max 5120KB).

**Validation**

| Field | Rules |
|-------|-------|
| `sources` | required, array, min:1 |
| `sources.*.release_method` | required, string, exists:payment_types,name,is_active,1,category,release_method |
| `sources.*.amount` | required, numeric, min:0.01 |
| `sources.*.proof_image` | nullable, image, mimes:jpg,jpeg,png, max:5120 |
| `sources.*.notes` | nullable, string |
| `release_notes` | nullable, string |

**Response `200 OK`**

```json
{
    "success": true,
    "data": {
        "id": 1,
        "loan_status": "active",
        "released_at": "2026-08-04T14:00:00.000000Z",
        "release_sources": [
            { "id": 1, "release_method": "Cash", "amount": 5000.00, "proof_image": null, "notes": "Counter disbursement" },
            { "id": 2, "release_method": "GCash", "amount": 2000.00, "proof_image": null, "notes": null }
        ],
        "installments": [
            { "installment_number": 1, "status": "due", "due_date": "2026-07-15" },
            { "installment_number": 2, "status": "pending", "due_date": "2026-08-14" }
        ]
    },
    "message": "Loan released to borrower"
}
```

**Errors**

| Status | Code | Description |
|--------|------|-------------|
| 422 | INVALID_TRANSITION | Loan is not awaiting release |
| 422 | AMOUNT_MISMATCH | Source total != net_proceeds - charges - old_balance |

---

### 3.11 Cancel Application

```
PUT /api/loans/{loan}/cancel
Roles: loan_officer, approver
```

**Constraints** — application_status must be `draft`, `submitted`, or `under_review`.

**Response `200 OK`** — loan with `application_status: "cancelled"`.

---

### 3.12 Past Due Loans

```
GET /api/loans/past-due
Roles: collector, approver, administrator
```

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `per_page` | integer | 15 | Records per page |

**Response `200 OK`**

```json
{
    "success": true,
    "data": {
        "data": [
            {
                "id": 1,
                "client": { "id": 1, "name": "Maria Santos", "contact_number": "09171234567" },
                "amount": 10000.00,
                "loan_status": "past_due",
                "collection_status": "reminder_sent",
                "overdue_installments": [
                    {
                        "id": 3,
                        "installment_number": 3,
                        "due_date": "2026-07-15",
                        "amount": 1666.67,
                        "days_overdue": 20,
                        "late_fees": 500.00,
                        "status": "overdue"
                    }
                ]
            }
        ],
        "meta": { "current_page": 1, "last_page": 1, "total": 1 }
    }
}
```

---

### 3.13 Apply Late Fees

```
POST /api/loans/apply-late-fees
Roles: collector, administrator
```

**Behavior**: For each installment in `due`/`overdue`/`missed` status with `due_date < today`:
- If no late fee exists for the **current calendar month**, creates a PHP 500 `LateFee`
- Sets installment status to `overdue`
- If 60+ days overdue, sets status to `missed`
- Escalates active loans with overdue installments to `past_due`
- Escalates loans with 90+ days overdue to `defaulted`

**Response `200 OK`**

```json
{
    "success": true,
    "data": {
        "late_fees_applied": 5,
        "overdue_installments": 12
    },
    "message": "Late fees applied successfully"
}
```

---

### 3.14 Update Collection Status

```
PUT /api/loans/{loan}/collection-status
Roles: collector
```

**Request Body**

```json
{
    "collection_status": "under_collection"
}
```

**Validation** — `collection_status`: required, string, in: `reminder_sent`, `promise_to_pay`, `under_collection`, `legal_action`, `settled`

---

### 3.15 Upload Release Source Proof

```
POST /api/loans/{loan}/release-sources/{source}/proof
Roles: cashier
```

**Request Body (multipart/form-data)**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `proof_image` | file | yes | image, mimes:jpg,jpeg,png, max:5120 |

**Response `200 OK`** — full loan with updated release sources.

---

### 3.16 Delete Release Source Proof

```
DELETE /api/loans/{loan}/release-sources/{source}/proof
Roles: cashier
```

**Response `200 OK`** — file deleted from disk, `proof_image` set to null.

---

## 4. Payments

### 4.1 List Loan Payments

```
GET /api/loans/{loan}/payments
Roles: any authenticated
```

**Response `200 OK`** — array of Payment objects, ordered by `payment_date` desc.

---

### 4.2 Record Payment

```
POST /api/loans/{loan}/payments
Roles: cashier, borrower (own loans only)
```

**Request Body (multipart/form-data)**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `amount` | number | yes | numeric, min:0.01 |
| `payment_method` | string | yes | exists:payment_types,name,is_active,1,category,payment_method |
| `payment_date` | date | yes | date format YYYY-MM-DD |
| `notes` | string | no | nullable, string |
| `proof_image` | file | no | image, mimes:jpg,jpeg,png,pdf, max:10240 |

**Validation**

| Field | Rules |
|-------|-------|
| `amount` | required, numeric, min:0.01 |
| `payment_method` | required, string, exists:payment_types,name,is_active,1,category,payment_method |
| `payment_date` | required, date |
| `notes` | nullable, string |
| `proof_image` | nullable, image, mimes:jpg,jpeg,png,pdf, max:10240 |

**Auto-Allocation Behavior**:
1. Fetch unpaid installments ordered by installment_number ASC
2. Apply payment sequentially to each installment
3. Full coverage → `status = paid`, `paid_at = now()`; partial → `status = partially_paid`
4. If `remaining_balance <= 0` → `loan_status = fully_paid`, `closed_at = now()`
5. If loan was `past_due` and no installments remain overdue → recover to `active`

**Response `201 Created`**

```json
{
    "success": true,
    "data": {
        "id": 1,
        "loan_id": 1,
        "client_id": 1,
        "amount": 5000.00,
        "payment_method": "GCash",
        "payment_date": "2026-08-04",
        "notes": "First payment",
        "proof_image": "payments/proof123.jpg",
        "created_at": "2026-08-04T15:00:00.000000Z",
        "updated_at": "2026-08-04T15:00:00.000000Z"
    },
    "message": "Payment recorded successfully"
}
```

---

## 5. Payment Types

### 5.1 List Payment Types

```
GET /api/payment-types
Roles: any authenticated
```

**Response `200 OK`** — paginated PaymentType array.

### 5.2 Create Payment Type

```
POST /api/payment-types
Roles: administrator
```

**Request Body**

```json
{
    "name": "Maya",
    "category": "payment_method",
    "is_active": true
}
```

**Validation**

| Field | Rules |
|-------|-------|
| `name` | required, string, max:100 |
| `category` | required, string, in:payment_method,release_method |
| `is_active` | nullable, boolean |

**Response `201 Created`** — created PaymentType.

### 5.3 Get Payment Type

```
GET /api/payment-types/{paymentType}
Roles: any authenticated
```

### 5.4 Update Payment Type

```
PUT /api/payment-types/{paymentType}
Roles: administrator
```

Same validation as Create.

### 5.5 Delete Payment Type

```
DELETE /api/payment-types/{paymentType}
Roles: administrator
```

---

## 6. Dashboard

```
GET /api/dashboard
Roles: any authenticated
```

**Response `200 OK`**

```json
{
    "success": true,
    "data": {
        "summary": {
            "total_clients": 150,
            "active_loans": 85,
            "pending_applications": 12,
            "completed_loans": 340,
            "defaulted_loans": 3,
            "total_collections": 1250000.00,
            "total_expected_repayments": 850000.00,
            "due_installments": 25,
            "overdue_installments": 8,
            "total_late_fees": 12500.00
        },
        "recent_loans": [],
        "upcoming_due": []
    }
}
```

---

## 7. Reloan

Reloan uses the standard loan workflow with additional parameters:

| Step | Endpoint | Key Parameters |
|------|----------|----------------|
| Calculate | `POST /api/loans/calculate` | `client_id` triggers existing balance lookup |
| Create | `POST /api/loans` | `old_balance` set to `total_existing_balance` from calculation |
| Approve | `PUT /api/loans/{loan}/approve` | Standard approval (different approver required) |
| Release | `PUT /api/loans/{loan}/release` | If `old_balance > 0`, auto-closes old loans |

---

## 8. Refund *(Future Phase)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/refunds` | List refund requests (paginated) |
| `POST` | `/api/refunds` | Create refund request |
| `GET` | `/api/refunds/{refund}` | Get refund details |
| `PUT` | `/api/refunds/{refund}/verify` | Verify overpayment amount |
| `PUT` | `/api/refunds/{refund}/approve` | Approve refund |
| `PUT` | `/api/refunds/{refund}/release` | Disburse refund |
| `PUT` | `/api/refunds/{refund}/reject` | Reject refund request |

---

## 9. Reports *(Future Phase)*

| Method | Endpoint | Query Params | Description |
|--------|----------|-------------|-------------|
| `GET` | `/api/reports/loan-ledger` | `from`, `to`, `client_id`, `format` | Loan ledger export |
| `GET` | `/api/reports/daily-collections` | `date`, `format` | Daily collection report |
| `GET` | `/api/reports/delinquency` | `risk_level`, `format` | Aged delinquency report |
| `GET` | `/api/reports/disbursements` | `from`, `to`, `format` | Loan releases report |
| `GET` | `/api/reports/audit-trail` | `entity_type`, `entity_id`, `from`, `to`, `action`, `format` | Export audit logs |

---

## 10. Notifications *(Future Phase)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/notifications` | List notifications (paginated, unread first) |
| `GET` | `/api/notifications/unread-count` | Badge count |
| `PUT` | `/api/notifications/{id}/read` | Mark single notification as read |
| `PUT` | `/api/notifications/read-all` | Mark all as read |

---

## 11. System

### 11.1 Health Check

```
GET /api/health
```

**Response `200 OK`**

```json
{
    "success": true,
    "data": { "status": "ok", "timestamp": "2026-08-04T15:00:00.000000Z" }
}
```

### 11.2 View Document

```
GET /api/documents/{document}/view
```

Returns file binary with appropriate `Content-Type` header. No auth required.

---

## 12. Global Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHENTICATED | Missing, expired, or invalid Bearer token |
| 403 | FORBIDDEN | Authenticated user lacks required role |
| 404 | NOT_FOUND | Resource not found |
| 422 | VALIDATION_ERROR | Request body or query params failed validation |
| 422 | INVALID_TRANSITION | Status transition not allowed |
| 429 | TOO_MANY_REQUESTS | Rate limit exceeded (60/min auth, 120/min API) |
| 500 | SERVER_ERROR | Unhandled exception |

**Sample error response:**

```json
{
    "success": false,
    "data": null,
    "error": {
        "message": "Only draft applications can be submitted.",
        "code": "INVALID_TRANSITION"
    }
}
```

**Validation error response:**

```json
{
    "success": false,
    "data": null,
    "error": {
        "message": "The given data was invalid.",
        "code": "VALIDATION_ERROR",
        "details": {
            "amount": ["The amount field is required."],
            "term_months": ["The term months field must not be greater than 5."]
        }
    }
}
```

---

**Version**: 1.0.0 | **Date**: 2026-08-04
