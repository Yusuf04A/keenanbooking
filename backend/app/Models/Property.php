<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids; // <--- PENTING

class Property extends Model
{
    use HasFactory, HasUuids; // <--- PENTING

    protected $fillable = ['name', 'slug', 'address', 'description', 'image_url', 'gallery_images'];

    protected $casts = [
        'gallery_images' => 'array',
    ];

    public function roomTypes()
    {
        return $this->hasMany(RoomType::class);
    }
}