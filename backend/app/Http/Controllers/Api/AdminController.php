<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Property;
use App\Models\RoomType;
use App\Models\Admin;
use Illuminate\Support\Str;
use App\Models\BookingPlatform;
use Illuminate\Support\Facades\Storage;

class AdminController extends Controller
{
    // ================= PROPERTY (HOTEL) =================
    public function storeProperty(Request $request)
    {
        $data = $request->validate([
            'name' => 'required',
            'address' => 'required',
            'description' => 'nullable',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:3072',
            'images.*' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:3072'
        ]);

        $data['slug'] = Str::slug($data['name']);
        $data['image_url'] = 'https://images.unsplash.com/photo-1566073771259-6a8506099945';

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('properties', 'public');
            $data['image_url'] = asset('storage/' . $path);
        }

        $galleryUrls = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $imgFile) {
                $path = $imgFile->store('properties/gallery', 'public');
                $galleryUrls[] = asset('storage/' . $path);
            }
        }
        
        // Paksa ke JSON string agar tidak error "Array to string conversion"
        $data['gallery_images'] = !empty($galleryUrls) ? json_encode($galleryUrls) : null;

        $prop = Property::create($data);
        return response()->json($prop);
    }

    public function updateProperty(Request $request, $id)
    {
        $prop = Property::findOrFail($id);

        $data = $request->validate([
            'name' => 'required',
            'address' => 'required',
            'description' => 'nullable',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:3072',
            'images.*' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:3072',
            'remove_gallery_index' => 'nullable|integer'
        ]);

        $data['slug'] = Str::slug($data['name']);

        if ($request->hasFile('image')) {
            if ($prop->image_url && str_contains($prop->image_url, 'storage/properties/')) {
                $oldPath = str_replace(asset('storage/'), '', $prop->image_url);
                Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('image')->store('properties', 'public');
            $data['image_url'] = asset('storage/' . $path);
        }

        // Handle gallery yang sudah ada (pastikan jadi array dulu)
        $currentGallery = is_string($prop->gallery_images) ? json_decode($prop->gallery_images, true) : ($prop->gallery_images ?? []);
        
        if ($request->has('remove_gallery_index')) {
            $idx = (int)$request->remove_gallery_index;
            if (isset($currentGallery[$idx])) {
                $urlToDelete = $currentGallery[$idx];
                if (str_contains($urlToDelete, 'storage/properties/')) {
                    $oldPath = str_replace(asset('storage/'), '', $urlToDelete);
                    Storage::disk('public')->delete($oldPath);
                }
                array_splice($currentGallery, $idx, 1);
            }
        }

        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $imgFile) {
                $path = $imgFile->store('properties/gallery', 'public');
                $currentGallery[] = asset('storage/' . $path);
            }
        }
        
        // Simpan kembali sebagai JSON String
        $data['gallery_images'] = !empty($currentGallery) ? json_encode($currentGallery) : null;

        $prop->update($data);
        return response()->json($prop);
    }

    public function destroyProperty($id)
    {
        $prop = Property::findOrFail($id);
        if ($prop->image_url && str_contains($prop->image_url, 'storage/properties/')) {
            $oldPath = str_replace(asset('storage/'), '', $prop->image_url);
            Storage::disk('public')->delete($oldPath);
        }
        
        $gallery = is_string($prop->gallery_images) ? json_decode($prop->gallery_images, true) : $prop->gallery_images;
        if (!empty($gallery)) {
            foreach ($gallery as $galleryUrl) {
                if (str_contains($galleryUrl, 'storage/properties/')) {
                    $oldPath = str_replace(asset('storage/'), '', $galleryUrl);
                    Storage::disk('public')->delete($oldPath);
                }
            }
        }
        $prop->delete();
        return response()->json(['message' => 'Deleted']);
    }

    // ================= ROOMS (KAMAR) =================
    public function storeRoom(Request $request)
    {
        $request->validate([
            'property_id' => 'required',
            'name' => 'required',
            'rental_category' => 'required|string',
            'capacity' => 'required|numeric',
            'total_stock' => 'required|numeric',
        ]);

        $room = new RoomType();
        $room->property_id = $request->property_id;
        $room->name = $request->name;
        $room->rental_category = $request->rental_category;
        
        // Otomatisasi enum lama agar db tidak error
        $room->room_category = $request->rental_category === 'bulanan' ? 'monthly' : 'daily';
        
        // Simpan harga, default ke 0 jika kosong
        $room->price_daily = $request->price_daily ?: 0;
        $room->price_weekly = $request->price_weekly ?: 0;
        $room->price_monthly = $request->price_monthly ?: 0;
        
        $room->capacity = $request->capacity;
        $room->total_stock = $request->total_stock;

        // INI KUNCI SOLUSINYA: Gunakan json_encode untuk mengubah Array ke String!
        $room->facilities = $request->facilities ? json_encode($request->facilities) : json_encode([]);

        if ($request->filled('room_numbers')) {
            // Frontend mengirim string JSON, kita pastikan formatnya benar
            $decoded = json_decode($request->room_numbers, true);
            $room->room_numbers = json_encode($decoded ?: []);
        } else {
            $room->room_numbers = json_encode([]);
        }

        // Upload gambar kamar
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('rooms', 'public');
            $room->image_url = asset('storage/' . $path);
        } else {
            $room->image_url = 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304';
        }

        $room->save();
        return response()->json($room);
    }

    public function updateRoom(Request $request, $id)
    {
        $room = RoomType::findOrFail($id);

        $request->validate([
            'property_id' => 'required',
            'name' => 'required',
            'rental_category' => 'required|string',
            'capacity' => 'required|numeric',
            'total_stock' => 'required|numeric',
        ]);

        $room->property_id = $request->property_id;
        $room->name = $request->name;
        $room->rental_category = $request->rental_category;
        $room->room_category = $request->rental_category === 'bulanan' ? 'monthly' : 'daily';
        
        $room->price_daily = $request->price_daily ?: 0;
        $room->price_weekly = $request->price_weekly ?: 0;
        $room->price_monthly = $request->price_monthly ?: 0;
        
        $room->capacity = $request->capacity;
        $room->total_stock = $request->total_stock;
        
        // PAKSA JADI STRING JSON
        $room->facilities = $request->facilities ? json_encode($request->facilities) : json_encode([]);

        if ($request->filled('room_numbers')) {
            $decoded = json_decode($request->room_numbers, true);
            $room->room_numbers = json_encode($decoded ?: []);
        } else {
            $room->room_numbers = json_encode([]);
        }

        if ($request->hasFile('image')) {
            if ($room->image_url && str_contains($room->image_url, 'storage/rooms/')) {
                $oldPath = str_replace(asset('storage/'), '', $room->image_url);
                Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('image')->store('rooms', 'public');
            $room->image_url = asset('storage/' . $path);
        }

        $room->save();
        return response()->json($room);
    }

    public function destroyRoom($id)
    {
        $room = RoomType::findOrFail($id);
        if ($room->image_url && str_contains($room->image_url, 'storage/rooms/')) {
            $oldPath = str_replace(asset('storage/'), '', $room->image_url);
            Storage::disk('public')->delete($oldPath);
        }
        $room->delete();
        return response()->json(['message' => 'Deleted']);
    }

    // ================= STAFF (ADMINS) =================
    public function indexStaff()
    {
        return response()->json(Admin::where('role', '!=', 'superadmin')->get());
    }

    public function storeStaff(Request $request)
    {
        $data = $request->validate([
            'full_name' => 'required',
            'email' => 'required|email|unique:admins',
            'password' => 'required',
            'scope' => 'required'
        ]);

        $data['password'] = bcrypt($data['password']);
        $data['role'] = 'admin';

        $admin = Admin::create($data);
        return response()->json($admin);
    }

    public function updateStaff(Request $request, $id)
    {
        $admin = Admin::findOrFail($id);
        $updateData = $request->except(['password']);

        if ($request->filled('password')) {
            $updateData['password'] = bcrypt($request->password);
        }

        $admin->update($updateData);
        return response()->json($admin);
    }

    public function destroyStaff($id)
    {
        Admin::destroy($id);
        return response()->json(['message' => 'Deleted']);
    }

    // ================= DASHBOARD STATS =================
    public function getStats()
    {
        $totalRevenue = \App\Models\Booking::where('status', 'paid')->sum('total_price');
        $totalBookings = \App\Models\Booking::count();

        return response()->json([
            'totalRevenue' => $totalRevenue,
            'totalBookings' => $totalBookings
        ]);
    }

    public function indexPlatforms()
    {
        return response()->json(BookingPlatform::all());
    }

    public function storePlatform(Request $request)
    {
        $data = $request->validate(['name' => 'required']);
        $data['slug'] = \Illuminate\Support\Str::slug($data['name']);
        return response()->json(BookingPlatform::create($data));
    }

    public function destroyPlatform($id)
    {
        BookingPlatform::destroy($id);
        return response()->json(['message' => 'Deleted']);
    }
}