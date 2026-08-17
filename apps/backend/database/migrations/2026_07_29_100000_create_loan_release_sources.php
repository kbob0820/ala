<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loans', function (Blueprint $table) {
            $table->dropColumn(['release_method', 'release_proof_image', 'release_notes']);
        });

        Schema::create('loan_release_sources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loan_id')->constrained()->cascadeOnDelete();
            $table->string('release_method');
            $table->decimal('amount', 12, 2);
            $table->string('proof_image')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loan_release_sources');

        Schema::table('loans', function (Blueprint $table) {
            $table->string('release_method')->nullable();
            $table->string('release_proof_image')->nullable();
            $table->text('release_notes')->nullable();
        });
    }
};
