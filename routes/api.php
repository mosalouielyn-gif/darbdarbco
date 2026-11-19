<?php

use App\Http\Controllers\Api\AppDataController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BeneficiaryController;
use App\Http\Controllers\Api\BorrowedMaterialController;
use App\Http\Controllers\Api\CreditTransactionController;
use App\Http\Controllers\Api\DatabaseMaintenanceController;
use App\Http\Controllers\Api\HarvestRecordController;
use App\Http\Controllers\Api\InventoryItemController;
use App\Http\Controllers\Api\PayrollSlipController;
use App\Http\Controllers\Api\ProductionBoxRecordController;
use App\Http\Controllers\Api\RestockRequestController;
use App\Http\Controllers\Api\RolePermissionController;
use App\Http\Controllers\Api\SalesCheckoutController;
use App\Http\Controllers\Api\UserAccountController;
use App\Http\Middleware\EnsureUserHasRole;
use Illuminate\Support\Facades\Route;

Route::middleware('web')->group(function (): void {
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/session', [AuthController::class, 'session'])->middleware('auth');
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/payroll-slips/{id}/manager-approve', [PayrollSlipController::class, 'approveByManager'])
        ->middleware(['auth', EnsureUserHasRole::class.':manager_admin']);
});

Route::middleware(['web', 'auth'])->group(function (): void {
    Route::middleware(EnsureUserHasRole::class.':production_clerk,inventory_bookkeeper,payroll_personnel,finance_officer,manager_admin')->group(function (): void {
        Route::get('/app-data', AppDataController::class);
        Route::get('/harvest-records', [HarvestRecordController::class, 'index']);
        Route::get('/production-box-records', [ProductionBoxRecordController::class, 'index']);
    });

    Route::middleware(EnsureUserHasRole::class.':production_clerk')->group(function (): void {
        Route::post('/harvest-records', [HarvestRecordController::class, 'store']);
        Route::put('/harvest-records/{id}', [HarvestRecordController::class, 'update']);
        Route::delete('/harvest-records/{id}', [HarvestRecordController::class, 'destroy']);
        Route::post('/production-box-records', [ProductionBoxRecordController::class, 'store']);
        Route::put('/production-box-records/{id}', [ProductionBoxRecordController::class, 'update']);
        Route::delete('/production-box-records/{id}', [ProductionBoxRecordController::class, 'destroy']);
    });

    Route::middleware(EnsureUserHasRole::class.':inventory_bookkeeper')->group(function (): void {
        Route::post('/inventory-items', [InventoryItemController::class, 'store']);
        Route::put('/inventory-items/{id}', [InventoryItemController::class, 'update']);
        Route::put('/inventory-items/{id}/status', [InventoryItemController::class, 'status']);
        Route::post('/inventory-items/{id}/stock-in', [InventoryItemController::class, 'stockIn']);
        Route::post('/inventory-items/{id}/release', [InventoryItemController::class, 'release']);
        Route::post('/inventory-items/{id}/adjust', [InventoryItemController::class, 'adjust']);
        Route::post('/sales/checkouts', [SalesCheckoutController::class, 'store']);
        Route::post('/borrowed-materials/{id}/return', [BorrowedMaterialController::class, 'returnMaterial']);
        Route::post('/restock-requests', [RestockRequestController::class, 'store']);
        Route::put('/restock-requests/{id}', [RestockRequestController::class, 'update']);
        Route::put('/restock-requests/{id}/cancel', [RestockRequestController::class, 'cancel']);
        Route::put('/restock-requests/{id}/confirm-delivery', [RestockRequestController::class, 'confirmDelivery']);
    });

    Route::middleware(EnsureUserHasRole::class.':payroll_personnel')->group(function (): void {
        Route::get('/payroll-slips/statistics', [PayrollSlipController::class, 'statistics']);
        Route::post('/payroll-slips', [PayrollSlipController::class, 'store']);
        Route::put('/payroll-slips/{id}', [PayrollSlipController::class, 'update']);
        Route::put('/payroll-slips/{id}/submit', [PayrollSlipController::class, 'submit']);
        Route::delete('/payroll-slips/{id}', [PayrollSlipController::class, 'destroy']);
    });

    Route::middleware(EnsureUserHasRole::class.':finance_officer')->group(function (): void {
        Route::put('/payroll-slips/{id}/validate', [PayrollSlipController::class, 'validateSlip']);
        Route::put('/payroll-slips/{id}/return', [PayrollSlipController::class, 'returnForCorrection']);
    });

    Route::middleware(EnsureUserHasRole::class.':manager_admin')->group(function (): void {
        Route::post('/admin/verify-password', [AuthController::class, 'verifyAdminPassword']);
        Route::get('/database-maintenance/tables', [DatabaseMaintenanceController::class, 'index']);
        Route::delete('/database-maintenance/tables', [DatabaseMaintenanceController::class, 'destroyAll']);
        Route::delete('/database-maintenance/tables/{table}', [DatabaseMaintenanceController::class, 'destroy']);
        Route::post('/users', [UserAccountController::class, 'store']);
        Route::put('/users/{id}', [UserAccountController::class, 'update']);
        Route::put('/users/{id}/status', [UserAccountController::class, 'status']);
        Route::post('/beneficiaries', [BeneficiaryController::class, 'store']);
        Route::put('/beneficiaries/{id}', [BeneficiaryController::class, 'update']);
        Route::put('/beneficiaries/{id}/status', [BeneficiaryController::class, 'status']);
        Route::post('/credit-transactions/{id}/deduct', [CreditTransactionController::class, 'deduct']);
        Route::put('/payroll-slips/{id}/manager-return', [PayrollSlipController::class, 'returnByManager']);
        Route::put('/restock-requests/{id}/approve', [RestockRequestController::class, 'approve']);
        Route::put('/restock-requests/{id}/return', [RestockRequestController::class, 'return']);
        Route::get('/role-permissions', [RolePermissionController::class, 'index']);
        Route::put('/role-permissions', [RolePermissionController::class, 'update']);
    });
});
