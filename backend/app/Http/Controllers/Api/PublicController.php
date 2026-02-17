<?php

namespace App\Http\Controllers\Api; // <--- Namespace harus Api

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\RoomType;
use Illuminate\Http\Request;

class PublicController extends Controller
{
    public function getProperties()
    {
        $properties = Property::with('roomTypes')->get();
        return response()->json($properties);
    }

    public function getPropertyDetail($id)
    {
        $property = Property::with('roomTypes')->find($id);
        
        if (!$property) {
            return response()->json(['message' => 'Property not found'], 404);
        }

        return response()->json($property);
    }
    
    public function getAllRooms() {
        $rooms = RoomType::with('property')->get();
        return response()->json($rooms);
    }
}