# Payment Module

## Payment Methods
Cash, GCash, BPI, BDO, Other Banks

## Features
- Record payment
- Upload proof of payment
- Auto-allocation
- Official receipt
- Payment reversal (authorized)

## Validation
- Amount > 0
- Attachment required for online payments
- Duplicate reference detection

## APIs
POST /payments
GET /payments
POST /payments/verify
