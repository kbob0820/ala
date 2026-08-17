<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loans', function (Blueprint $table) {
            $table->string('release_method')->nullable()->after('released_at');
            $table->string('release_proof_image')->nullable()->after('release_method');
            $table->text('release_notes')->nullable()->after('release_proof_image');
        });
    }

    public function down(): void
    {
        Schema::table('loans', function (Blueprint $table) {
            $table->dropColumn(['release_method', 'release_proof_image', 'release_notes']);
        });
    }
};
