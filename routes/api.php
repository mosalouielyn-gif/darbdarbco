<?php

use App\Http\Controllers\Api\AppDataController;
use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::get('/app-data', AppDataController::class);
