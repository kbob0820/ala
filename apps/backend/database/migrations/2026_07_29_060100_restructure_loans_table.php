<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loans', function (Blueprint $table) {
            $table->dropColumn('status');
        });

        Schema::table('loans', function (Blueprint $table) {
            $table->string('application_status')->default('draft')->after('loan_product_id');
            $table->string('loan_status')->nullable()->after('application_status');
            $table->string('collection_status')->nullable()->after('loan_status');
            $table->integer('total_installments')->default(0)->after('installment_amount');
            $table->timestamp('released_at')->nullable()->after('approved_at');
            $table->timestamp('closed_at')->nullable()->after('released_at');
        });
    }

    public function down(): void
    {
        Schema::table('loans', function (Blueprint $table) {
            $table->dropColumn(['application_status', 'loan_status', 'collection_status', 'total_installments', 'released_at', 'closed_at']);
            $table->string('status')->default('pending')->after('loan_product_id');
        });
    }
};
