<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\LoginController;
use Illuminate\Http\Request;
use App\Models\SubscriptionPlan;

// Welcome page

Route::get('/', function () {
    return view('welcome');
});

Route::get('/plans', function () {
    return SubscriptionPlan::all();
});

// Sanctum requires this endpoint for the Vue frontend to get a CSRF token
Route::get('/sanctum/csrf-cookie', function (Request $request) {
    return response('CSRF cookie set successfully');
});

// Authentication routes (must be in web.php for session/cookie usage)
Route::post('/login', [LoginController::class, 'login'])->name('login');
Route::post('/logout', [LoginController::class, 'logout'])->name('logout');
