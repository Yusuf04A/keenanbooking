<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PublicController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\AdminController; // Pastikan ini di-import

/* |-------------------------------------------------------------------------- | API Routes |-------------------------------------------------------------------------- */

// =================================================================
// 1. PUBLIC ROUTES (Bisa diakses tanpa login)
// =================================================================

// Data Hotel & Kamar
Route::get('/availability/check', [PublicController::class , 'checkAvailability']);

Route::get('/properties', [PublicController::class , 'getProperties']);
Route::get('/properties/{id}', [PublicController::class , 'getPropertyDetail']);

// Auth & Payment
Route::post('/login', [AuthController::class , 'login']);
Route::post('/midtrans/create-transaction', [BookingController::class , 'createTransaction']);
Route::post('/bookings/update-status', [BookingController::class , 'updateStatus']);

// Download invoice PDF (publik — browser perlu bisa akses langsung tanpa Bearer token)
Route::get('/bookings/{id}/invoice-pdf', [BookingController::class , 'downloadInvoice']);



// =================================================================
// 2. PROTECTED ROUTES (Hanya bisa diakses Admin/Staff yang Login)
// =================================================================
Route::middleware('auth:sanctum')->group(function () {

    // --- AUTHENTICATION ---
    Route::post('/logout', [AuthController::class , 'logout']);
    Route::get('/user', function (Request $request) {
            return $request->user();
        }
        );

        // --- DASHBOARD DATA ---
        Route::get('/admin/bookings', [BookingController::class , 'index']);
        Route::get('/admin/rooms', [PublicController::class , 'getAllRooms']); // Untuk Dropdown
        Route::get('/admin/stats', [AdminController::class , 'getStats']);

        // --- CRUD PROPERTY (HOTEL) ---
        Route::post('/admin/properties', [AdminController::class , 'storeProperty']);
        Route::put('/admin/properties/{id}', [AdminController::class , 'updateProperty']);
        Route::delete('/admin/properties/{id}', [AdminController::class , 'destroyProperty']);

        // --- CRUD ROOMS (KAMAR) ---
        Route::post('/admin/rooms', [AdminController::class , 'storeRoom']);
        Route::put('/admin/rooms/{id}', [AdminController::class , 'updateRoom']);
        Route::delete('/admin/rooms/{id}', [AdminController::class , 'destroyRoom']);

        // --- CRUD STAFF (ADMIN) ---
        Route::get('/admin/staff', [AdminController::class , 'indexStaff']);
        Route::post('/admin/staff', [AdminController::class , 'storeStaff']);
        Route::put('/admin/staff/{id}', [AdminController::class , 'updateStaff']);
        Route::delete('/admin/staff/{id}', [AdminController::class , 'destroyStaff']);

        // --- MANUAL BOOKING ACTION ---
        Route::put('/admin/bookings/{id}/status', [BookingController::class , 'updateManualStatus']);

        // --- CRUD BOOKING PLATFORMS (BARU! Agoda, Traveloka, dll) ---
        Route::get('/admin/platforms', [AdminController::class , 'indexPlatforms']);
        Route::post('/admin/platforms', [AdminController::class , 'storePlatform']);
        Route::delete('/admin/platforms/{id}', [AdminController::class , 'destroyPlatform']);
    });