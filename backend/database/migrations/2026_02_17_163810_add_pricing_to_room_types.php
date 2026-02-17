<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('room_types', function (Blueprint $table) {
            // 1. Rename dulu
            $table->renameColumn('base_price', 'price_daily');

            // 2. Tambah kolom baru SETELAH 'price_daily' (bukan base_price lagi)
            $table->decimal('price_weekly', 10, 2)->nullable()->after('price_daily'); // <--- UBAH INI
            $table->decimal('price_monthly', 10, 2)->nullable()->after('price_weekly');
        });
    }
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('room_types', function (Blueprint $table) {
            //
        });
    }
};
