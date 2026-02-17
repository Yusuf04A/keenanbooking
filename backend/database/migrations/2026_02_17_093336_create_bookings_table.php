<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('property_id')->constrained('properties');
            $table->foreignUuid('room_type_id')->constrained('room_types');
            $table->string('booking_code')->unique();
            $table->date('check_in_date');
            $table->date('check_out_date');
            $table->decimal('total_price', 15, 2);

            // Data Tamu
            $table->string('customer_name');
            $table->string('customer_email');
            $table->string('customer_phone');
            $table->text('customer_notes')->nullable();

            // Status & Payment
            $table->string('status')->default('pending'); // paid, confirmed, dll
            $table->string('payment_method')->nullable();
            $table->string('booking_source')->default('website');

            // Midtrans stuffs
            $table->string('snap_token')->nullable();
            $table->string('invoice_url')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
