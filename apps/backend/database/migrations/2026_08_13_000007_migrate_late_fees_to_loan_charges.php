<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $lateFees = DB::table('late_fees')
            ->join('loan_installments', 'loan_installments.id', '=', 'late_fees.loan_installment_id')
            ->join('loans', 'loans.id', '=', 'loan_installments.loan_id')
            ->select(
                'late_fees.id as late_fee_id',
                'late_fees.loan_installment_id',
                'late_fees.amount',
                'late_fees.applied_at',
                'late_fees.created_at',
                'late_fees.updated_at',
                'loan_installments.loan_id',
                'loans.client_id',
            )
            ->orderBy('late_fees.id')
            ->get();

        $sequenceByInstallment = [];

        foreach ($lateFees as $fee) {
            $sequenceByInstallment[$fee->loan_installment_id] = ($sequenceByInstallment[$fee->loan_installment_id] ?? 0) + 1;

            $sequence = $sequenceByInstallment[$fee->loan_installment_id];
            $reference = $sequence === 1
                ? "LF-{$fee->loan_installment_id}"
                : "LF-{$fee->loan_installment_id}-{$sequence}";

            DB::table('loan_charges')->insert([
                'loan_id' => $fee->loan_id,
                'loan_installment_id' => $fee->loan_installment_id,
                'client_id' => $fee->client_id,
                'charge_type' => 'LATE_FEE',
                'description' => 'Late fee',
                'original_amount' => $fee->amount,
                'paid_amount' => 0,
                'waived_amount' => 0,
                'balance' => $fee->amount,
                'assessment_date' => $fee->applied_at,
                'due_date' => null,
                'status' => 'ASSESSED',
                'reference' => $reference,
                'created_at' => $fee->created_at ?? now(),
                'updated_at' => $fee->updated_at ?? now(),
            ]);
        }

        Schema::dropIfExists('late_fees');
    }

    public function down(): void
    {
        Schema::create('late_fees', function ($table) {
            $table->id();
            $table->foreignId('loan_installment_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->date('applied_at');
            $table->timestamps();
        });
    }
};
