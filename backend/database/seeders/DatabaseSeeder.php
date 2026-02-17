<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Property;
use App\Models\RoomType;
use App\Models\Admin;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // === 1. HOTEL A: KEENAN LUXE SETURAN ===
        $p1 = Property::create([
            'name' => 'Keenan Luxe Seturan',
            'slug' => 'keenan-luxe-seturan',
            'address' => 'Gang Pule Jl. Seturan Raya, Yogyakarta',
            'description' => 'Hunian mewah di pusat keramaian Seturan.',
            'image_url' => 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070', // Ganti link gambar asli jika ada
        ]);

        RoomType::create([
            'property_id' => $p1->id,
            'name' => 'Standard Twin',
            'description' => 'Kamar nyaman dengan 2 kasur single.',
            'base_price' => 250000,
            'capacity' => 2,
            'total_stock' => 5,
            'image_url' => 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=1000',
            'facilities' => ['Wifi', 'AC', 'TV', 'Parking'],
        ]);

        // === 2. HOTEL B: KEENAN LIVING PERUMNAS ===
        $p2 = Property::create([
            'name' => 'Keenan Living Perumnas',
            'slug' => 'keenan-living-perumnas',
            'address' => 'Jl. Waringinsari II No.17, Yogyakarta',
            'description' => 'Suasana tenang di lingkungan perumahan.',
            'image_url' => 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070',
        ]);

        RoomType::create([
            'property_id' => $p2->id,
            'name' => 'Deluxe Room',
            'description' => 'Kamar luas dengan fasilitas lengkap.',
            'base_price' => 350000,
            'capacity' => 2,
            'total_stock' => 3,
            'image_url' => 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=2070',
            'facilities' => ['Wifi', 'AC', 'TV', 'Kitchen', 'Hot Water'],
        ]);

        // === 3. HOTEL C: KEENAN LIVING JAKAL ===
        $p3 = Property::create([
            'name' => 'Keenan Living Jakal',
            'slug' => 'keenan-living-jakal',
            'address' => 'Jl. Kalimantan No.20B, Yogyakarta',
            'description' => 'Akses mudah ke UGM dan kuliner Jakal.',
            'image_url' => 'https://images.unsplash.com/photo-1512918760532-3ed868d826cd?q=80&w=2070',
        ]);

        RoomType::create([
            'property_id' => $p3->id,
            'name' => 'Superior Room',
            'description' => 'Pilihan tepat untuk mahasiswa dan traveler.',
            'base_price' => 200000,
            'capacity' => 2,
            'total_stock' => 8,
            'image_url' => 'https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=2070',
            'facilities' => ['Wifi', 'AC', 'Parking'],
        ]);

        // === 4. ADMIN ===
        Admin::create([
            'full_name' => 'Super Admin',
            'email' => 'admin@keenan.com',
            'password' => bcrypt('password'),
            'role' => 'superadmin',
            'scope' => 'all'
        ]);
    }
}