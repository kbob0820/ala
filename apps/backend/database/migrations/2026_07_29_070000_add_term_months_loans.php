<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loans', function (Blueprint $table) {
            $table->integer('term_months')->nullable()->after('loan_product_id');
        });

        $this->dropLoanProductForeignIfExists();

        Schema::table('loans', function (Blueprint $table) {
            $table->foreignId('loan_product_id')->nullable()->change();
            $table->foreign('loan_product_id')->references('id')->on('loan_products')->nullOnDelete();
        });
    }

    public function down(): void
    {
        $this->dropLoanProductForeignIfExists();

        Schema::table('loans', function (Blueprint $table) {
            $table->dropColumn('term_months');
        });

        Schema::table('loans', function (Blueprint $table) {
            $table->foreignId('loan_product_id')->nullable(false)->change();
            $table->foreign('loan_product_id')->references('id')->on('loan_products')->cascadeOnDelete();
        });
    }

    private function dropLoanProductForeignIfExists(): void
    {
        $hasForeign = collect(Schema::getForeignKeys('loans'))
            ->contains(fn (array $fk) => in_array('loan_product_id', $fk['columns'] ?? [], true));

        if ($hasForeign) {
            Schema::table('loans', fn (Blueprint $table) => $table->dropForeign(['loan_product_id']));
        }
    }
};
