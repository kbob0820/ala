<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $hasForeign = collect(Schema::getForeignKeys('loans'))
            ->contains(fn (array $fk) => in_array('loan_product_id', $fk['columns'] ?? [], true));

        if ($hasForeign) {
            Schema::table('loans', function (Blueprint $table) {
                $table->dropForeign(['loan_product_id']);
            });
        }

        if (Schema::hasColumn('loans', 'loan_product_id')) {
            Schema::table('loans', function (Blueprint $table) {
                $table->dropColumn('loan_product_id');
            });
        }
    }

    public function down(): void
    {
        Schema::table('loans', function (Blueprint $table) {
            $table->foreignId('loan_product_id')->nullable()->constrained('loan_products')->nullOnDelete();
        });
    }
};
