# Loan Module

## Purpose
Manage loan applications through release and completion.

## Features
- New application
- Loan calculator
- Approval workflow
- Release processing
- Payment schedule generation
- Loan ledger
- Status tracking

## Loan Status
Draft, Pending, Approved, Released, Active, Completed, Cancelled, Rejected, Defaulted

## Validation
- Active borrower
- Max term: 5 months
- Interest configurable (default 10%/month)
- Generate twice-monthly amortization

## Core Fields
Borrower, Gross Loan, Deductions, Net Proceeds, Interest, Term, Release Date, Due Date.

## APIs
GET /loans
POST /loans
PUT /loans/{id}
POST /loans/{id}/approve
POST /loans/{id}/release
