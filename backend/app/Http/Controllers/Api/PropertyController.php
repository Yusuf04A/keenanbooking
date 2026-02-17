<?php

// app/Http/Controllers/Api/PropertyController.php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Property;
use Illuminate\Http\Request;

class PropertyController extends Controller
{
    public function index()
    {
        // Ambil semua property beserta kamar-kamarnya
        $properties = Property::with('roomTypes')->get();
        return response()->json($properties);
    }

    public function show($id)
    {
        $property = Property::with('roomTypes')->find($id);
        if (!$property)
            return response()->json(['message' => 'Not Found'], 404);
        return response()->json($property);
    }
}
