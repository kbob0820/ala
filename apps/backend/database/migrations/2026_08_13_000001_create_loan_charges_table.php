<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loan_charges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loan_id')->constrained('loans')->cascadeOnDelete();
            $table->foreignId('loan_installment_id')->nullable()->constrained('loan_installments')->nullOnDelete();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->string('charge_type', 30);
            $table->string('description')->nullable();
            $table->decimal('original_amount', 12, 2);
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->decimal('waived_amount', 12, 2)->default(0);
            $table->decimal('balance', 12, 2);
            $table->decimal('requested_waive_amount', 12, 2)->nullable();
            $table->date('assessment_date');
            $table->date('due_date')->nullable();
            $table->string('status', 30);
            $table->string('reference', 100)->unique();
            $table->text('reason')->nullable();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('reversed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reversed_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['loan_id', 'charge_type', 'status']);
            $table->index(['client_id', 'status']);
            $table->index('loan_installment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loan_charges');
    }
};
