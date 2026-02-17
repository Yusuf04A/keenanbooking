<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Foundation\Auth\User as Authenticatable; // Ubah ini biar bisa login
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens; // Butuh ini buat token login nanti

class Admin extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasUuids;

    protected $fillable = [
        'full_name',
        'email',
        'password',
        'role',
        'scope'
    ];

    protected $hidden = [
        'password',
    ];
}