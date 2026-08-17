<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loans', function (Blueprint $table) {
            $table->decimal('charges', 12, 2)->default(0)->after('interest_rate_per_month');
            $table->string('charges_description')->nullable()->after('charges');
            $table->decimal('old_balance', 12, 2)->default(0)->after('charges_description');
        });
    }

    public function down(): void
    {
        Schema::table('loans', function (Blueprint $table) {
            $table->dropColumn(['charges', 'charges_description', 'old_balance']);
        });
    }
};
