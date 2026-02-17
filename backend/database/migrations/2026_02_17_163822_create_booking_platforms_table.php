<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('booking_platforms', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Contoh: Traveloka
            $table->string('slug'); // traveloka
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('booking_platforms');
    }
};
