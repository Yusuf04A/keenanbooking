<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class RoomType extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'property_id',
        'name',
        'description',
        'base_price',
        'capacity',
        'total_stock',
        'image_url',
        'facilities'
    ];

    protected $casts = [
        'facilities' => 'array', // Biar JSON otomatis jadi Array
        'base_price' => 'integer',
    ];

    public function property()
    {
        return $this->belongsTo(Property::class);
    }
}