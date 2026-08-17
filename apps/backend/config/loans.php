<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Loan Defaults
    |--------------------------------------------------------------------------
    |
    | Default values for loan-level settings. These are configurable so they
    | can be adjusted without code changes via environment variables.
    |
    */

    'late_fee_amount' => (float) env('LATE_FEE_AMOUNT', 500),

    'late_fee_grace_days' => (int) env('LATE_FEE_GRACE_DAYS', 0),

    'interest_rate_per_month' => (float) env('INTEREST_RATE_PER_MONTH', 10),

];
