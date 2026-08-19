<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChargeController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\HealthCheckController;
use App\Http\Controllers\Api\LoanController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PaymentTypeController;
use App\Http\Controllers\Api\RefundController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthCheckController::class);

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::get('/documents/{document}/view', [DocumentController::class, 'view']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    Route::middleware('role:administrator')->group(function (): void {
        Route::apiResource('users', UserController::class);
    });

    Route::get('/dashboard', [DashboardController::class, 'index']);

    Route::apiResource('clients', ClientController::class);
    Route::post('/clients/{client}/restore', [ClientController::class, 'restore']);
    Route::delete('/clients/{client}/force', [ClientController::class, 'forceDelete']);

    Route::get('/clients/{client}/documents', [DocumentController::class, 'index']);
    Route::post('/clients/{client}/documents', [DocumentController::class, 'store']);
    Route::delete('/documents/{document}', [DocumentController::class, 'destroy']);

    Route::middleware('role:administrator')->group(function (): void {
        Route::get('/settings', [SettingsController::class, 'index']);
        Route::put('/settings', [SettingsController::class, 'update']);
    });

    Route::post('/loans/calculate', [LoanController::class, 'calculate']);
    Route::get('/loans/past-due', [LoanController::class, 'pastDue']);
    Route::post('/loans/{loan}/past-due/undo', [LoanController::class, 'undoPastDue'])
        ->middleware('role:administrator,approver');
    Route::post('/loans/{loan}/past-due/process', [LoanController::class, 'processPastDueLoan'])
        ->middleware('role:administrator,approver');
    Route::post('/loans/{loan}/installments/{installment}/late-fee', [LoanController::class, 'updateInstallmentLateFee'])
        ->middleware('role:administrator,approver');

    Route::get('/loans', [LoanController::class, 'index']);
    Route::post('/loans', [LoanController::class, 'store']);
    Route::get('/loans/{loan}', [LoanController::class, 'show']);
    Route::put('/loans/{loan}/submit', [LoanController::class, 'submit']);
    Route::put('/loans/{loan}/approve', [LoanController::class, 'approve']);
    Route::put('/loans/{loan}/reject', [LoanController::class, 'reject']);
    Route::put('/loans/{loan}/release', [LoanController::class, 'release']);
    Route::put('/loans/{loan}/cancel', [LoanController::class, 'cancel']);
    Route::put('/loans/{loan}/void', [LoanController::class, 'void']);
    Route::put('/loans/{loan}', [LoanController::class, 'update']);
    Route::put('/loans/{loan}/review-status', [LoanController::class, 'updateReviewStatus']);
    Route::put('/loans/{loan}/collection-status', [LoanController::class, 'updateCollectionStatus']);
    Route::get('/loans/{loan}/outstanding', [LoanController::class, 'outstanding']);
    Route::get('/loans/{loan}/overpayment', [RefundController::class, 'overpayment']);

    Route::get('/loans/{loan}/charges', [ChargeController::class, 'index']);
    Route::post('/loans/{loan}/charges', [ChargeController::class, 'store'])
        ->middleware('role:administrator,approver');

    Route::get('/charges/{charge}', [ChargeController::class, 'show']);
    Route::get('/charges/{charge}/audit', [ChargeController::class, 'audit']);
    Route::post('/charges/{charge}/waiver', [ChargeController::class, 'requestWaiver']);
    Route::post('/charges/{charge}/waiver/approve', [ChargeController::class, 'approveWaiver'])
        ->middleware('role:administrator,approver');
    Route::post('/charges/{charge}/waiver/reject', [ChargeController::class, 'rejectWaiver'])
        ->middleware('role:administrator,approver');
    Route::post('/charges/{charge}/reverse', [ChargeController::class, 'reverse'])
        ->middleware('role:administrator,approver');

    Route::post('/loans/{loan}/release-sources/{source}', [LoanController::class, 'updateReleaseSource']);

    Route::post('/loans/{loan}/release-sources/{source}/proof', [LoanController::class, 'updateReleaseSourceProof']);
    Route::delete('/loans/{loan}/release-sources/{source}/proof', [LoanController::class, 'destroyReleaseSourceProof']);

    Route::get('/loans/{loan}/payments', [PaymentController::class, 'index']);
    Route::post('/loans/{loan}/payments', [PaymentController::class, 'store']);
    Route::post('/loans/{loan}/payments/{payment}', [PaymentController::class, 'update']);
    Route::post('/loans/{loan}/payments/{payment}/reverse', [PaymentController::class, 'reverse'])
        ->middleware('role:administrator,approver,cashier');
    Route::delete('/loans/{loan}/payments/{payment}', [PaymentController::class, 'destroy']);

    Route::apiResource('payment-types', PaymentTypeController::class);

    Route::get('/refunds', [RefundController::class, 'index']);
    Route::post('/loans/{loan}/refunds', [RefundController::class, 'store']);
    Route::get('/refunds/{refund}', [RefundController::class, 'show']);
    Route::post('/refunds/{refund}/verify', [RefundController::class, 'verify'])
        ->middleware('role:administrator,approver');
    Route::post('/refunds/{refund}/approve', [RefundController::class, 'approve'])
        ->middleware('role:administrator,approver');
    Route::post('/refunds/{refund}/release', [RefundController::class, 'release'])
        ->middleware('role:administrator,approver,cashier');
    Route::post('/refunds/{refund}/complete', [RefundController::class, 'complete'])
        ->middleware('role:administrator,approver');
    Route::post('/refunds/{refund}/reject', [RefundController::class, 'reject'])
        ->middleware('role:administrator,approver');
});
