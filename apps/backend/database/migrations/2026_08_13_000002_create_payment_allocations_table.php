<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->constrained('payments')->cascadeOnDelete();
            $table->foreignId('loan_id')->constrained('loans')->cascadeOnDelete();
            $table->foreignId('charge_id')->nullable()->constrained('loan_charges')->nullOnDelete();
            $table->foreignId('installment_id')->nullable()->constrained('loan_installments')->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('allocation_type', 30);
            $table->string('status', 30)->default('applied');
            $table->timestamps();

            $table->index(['payment_id', 'allocation_type']);
            $table->index(['loan_id', 'allocation_type']);
            $table->index(['charge_id']);
            $table->index(['installment_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_allocations');
    }
};
