<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class CreditTransactionController extends Controller
{
    public function deduct(int $id): JsonResponse
    {
        abort_unless(DB::table('credit_transactions')->where('id', $id)->exists(), 404, 'Credit transaction not found.');

        return response()->json([
            'message' => 'Credit deductions are posted only when a Manager/Admin approves the corresponding payroll slip.',
        ], 409);
    }
}
