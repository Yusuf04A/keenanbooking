<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class RoomType extends Model
{
    use HasFactory, HasUuids;

    // Daftarkan semua kolom agar diizinkan masuk ke database
    protected $fillable = [
        'property_id',
        'name',
        'rental_category', // Harian / Bulanan
        'room_category',   // monthly / daily (menyesuaikan format lama)
        'price_daily',
        'price_weekly',
        'price_monthly',
        'capacity',
        'total_stock',
        'room_numbers',    // Kolom array nomor fisik kamar
        'image_url',
        'facilities',
    ];

    // INI KUNCINYA: Memberitahu Laravel untuk mengkonversi Array menjadi JSON secara otomatis
    protected $casts = [
        'facilities' => 'array',
        'room_numbers' => 'array', 
    ];

    public function property()
    {
        return $this->belongsTo(Property::class);
    }
}