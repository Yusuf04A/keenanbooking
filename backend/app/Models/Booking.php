<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids; // <--- WAJIB IMPORT INI

class Booking extends Model
{
    use HasFactory, HasUuids; // <--- WAJIB PASANG INI

    // Kita pakai guarded agar aman dan fleksibel (seperti diskusi sebelumnya)
    protected $guarded = ['id']; 

    public function property()
    {
        return $this->belongsTo(Property::class);
    }

    public function roomType()
    {
        return $this->belongsTo(RoomType::class);
    }
}