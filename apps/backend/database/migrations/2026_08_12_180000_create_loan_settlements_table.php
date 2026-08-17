<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loan_settlements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reloan_loan_id')->constrained('loans')->cascadeOnDelete();
            $table->foreignId('old_loan_id')->constrained('loans')->cascadeOnDelete();
            $table->decimal('settlement_amount', 12, 2);
            $table->date('settlement_date');
            $table->string('status')->default('completed');
            $table->foreignId('payment_id')->nullable()->constrained('payments')->nullOnDelete();
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['reloan_loan_id', 'old_loan_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loan_settlements');
    }
};
