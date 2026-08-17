<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loans', function (Blueprint $table) {
            $table->renameColumn('old_balance', 'old_balance_settlement');
        });

        Schema::table('loans', function (Blueprint $table) {
            $table->foreignId('parent_loan_id')->nullable()->after('client_id')->constrained('loans')->nullOnDelete();
            $table->string('loan_type')->default('regular')->after('parent_loan_id');
            $table->string('loan_number')->nullable()->unique()->after('loan_type');
            $table->decimal('total_deductions', 12, 2)->default(0)->after('net_proceeds');
        });

        Schema::table('loans', function (Blueprint $table) {
            $table->dropColumn('reloan_closed_ids');
        });
    }

    public function down(): void
    {
        Schema::table('loans', function (Blueprint $table) {
            $table->json('reloan_closed_ids')->nullable()->after('closed_at');
        });

        Schema::table('loans', function (Blueprint $table) {
            $table->dropForeign(['parent_loan_id']);
            $table->dropColumn(['parent_loan_id', 'loan_type', 'loan_number', 'total_deductions']);
        });

        Schema::table('loans', function (Blueprint $table) {
            $table->renameColumn('old_balance_settlement', 'old_balance');
        });
    }
};
