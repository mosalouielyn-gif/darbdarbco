<?php

use App\Http\Controllers\Api\AppDataController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\HarvestRecordController;
use App\Http\Controllers\Api\ProductionBoxRecordController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::get('/app-data', AppDataController::class);
Route::get('/harvest-records', [HarvestRecordController::class, 'index']);
Route::post('/harvest-records', [HarvestRecordController::class, 'store']);
Route::put('/harvest-records/{id}', [HarvestRecordController::class, 'update']);
Route::delete('/harvest-records/{id}', [HarvestRecordController::class, 'destroy']);
Route::get('/production-box-records', [ProductionBoxRecordController::class, 'index']);
Route::post('/production-box-records', [ProductionBoxRecordController::class, 'store']);
Route::put('/production-box-records/{id}', [ProductionBoxRecordController::class, 'update']);
Route::delete('/production-box-records/{id}', [ProductionBoxRecordController::class, 'destroy']);
