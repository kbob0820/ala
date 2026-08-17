<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_settlements', function (Blueprint $table) {
            $table->decimal('principal_amount', 12, 2)->default(0)->after('settlement_amount');
            $table->decimal('charge_amount', 12, 2)->default(0)->after('principal_amount');
        });

        // Backfill: charge portion = unpaid charges waived as "Settled by reloan";
        // principal portion = the remainder of the settlement.
        foreach (DB::table('loan_settlements')->get() as $settlement) {
            $chargeAmount = (float) DB::table('loan_charges')
                ->where('loan_id', $settlement->old_loan_id)
                ->where('reason', 'Settled by reloan')
                ->sum('waived_amount');

            DB::table('loan_settlements')
                ->where('id', $settlement->id)
                ->update([
                    'charge_amount' => $chargeAmount,
                    'principal_amount' => max((float) $settlement->settlement_amount - $chargeAmount, 0.0),
                ]);
        }

        // Close legacy 'overdue'/'missed' installments on loans already settled by reloan.
        $settledLoanIds = DB::table('loans')
            ->where('loan_status', 'settled_by_reloan')
            ->pluck('id');

        DB::table('loan_installments')
            ->whereIn('loan_id', $settledLoanIds)
            ->whereNotIn('status', ['paid', 'cancelled', 'waived'])
            ->update([
                'status' => 'paid',
                'paid_amount' => DB::raw('amount'),
                'paid_at' => now(),
            ]);
    }

    public function down(): void
    {
        Schema::table('loan_settlements', function (Blueprint $table) {
            $table->dropColumn(['principal_amount', 'charge_amount']);
        });
    }
};
