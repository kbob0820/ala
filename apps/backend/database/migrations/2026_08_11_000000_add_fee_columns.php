<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_types', function (Blueprint $table) {
            $table->decimal('fee', 10, 2)->nullable()->default(null)->after('is_active');
        });

        Schema::table('loan_release_sources', function (Blueprint $table) {
            $table->decimal('fee', 10, 2)->nullable()->default(0)->after('amount');
        });
    }

    public function down(): void
    {
        Schema::table('payment_types', function (Blueprint $table) {
            $table->dropColumn('fee');
        });

        Schema::table('loan_release_sources', function (Blueprint $table) {
            $table->dropColumn('fee');
        });
    }
};
