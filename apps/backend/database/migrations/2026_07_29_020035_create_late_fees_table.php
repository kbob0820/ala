<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('late_fees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loan_installment_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->date('applied_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('late_fees');
    }
};
