<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CreditTransactionController extends Controller
{
    public function deduct(Request $request, int $id): JsonResponse
    {
        $payload = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payroll_batch' => ['required', 'string', 'max:255'],
            'deduction_date' => ['nullable', 'date'],
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
        ]);

        $credit = DB::transaction(function () use ($id, $payload) {
            $credit = DB::table('credit_transactions')->where('id', $id)->lockForUpdate()->first();
            abort_if(! $credit, 404, 'Credit transaction not found.');

            $amount = (float) $payload['amount'];
            $remaining = (float) $credit->remaining_balance;
            abort_if($amount > $remaining, 422, 'Deduction cannot exceed the remaining balance.');

            $newRemaining = max(0, $remaining - $amount);
            $status = $newRemaining <= 0 ? 'Fully Deducted' : 'Partially Deducted';

            DB::table('credit_deductions')->insert([
                'credit_transaction_id' => $id,
                'payroll_batch' => $payload['payroll_batch'],
                'amount' => $amount,
                'deduction_date' => $payload['deduction_date'] ?? now()->toDateString(),
                'recorded_by_name' => $payload['user_name'] ?? null,
                'recorded_by' => $payload['user_id'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('credit_transactions')->where('id', $id)->update([
                'remaining_balance' => $newRemaining,
                'status' => $status,
                'updated_at' => now(),
            ]);

            $this->recordAudit(
                $payload['user_id'] ?? null,
                $payload['user_name'] ?? null,
                "Recorded payroll deduction {$amount} for credit {$credit->credit_no}",
            );

            return $this->findCredit($id);
        });

        return response()->json($credit);
    }

    private function findCredit(int $id): object
    {
        $credit = DB::table('credit_transactions')->where('id', $id)->first();
        $credit->deductions = DB::table('credit_deductions')
            ->where('credit_transaction_id', $id)
            ->orderBy('id')
            ->get()
            ->all();

        return $credit;
    }

    private function recordAudit(?int $userId, ?string $userName, string $description): void
    {
        if (! Schema::hasTable('audit_logs')) {
            return;
        }

        $userId ??= DB::table('users')->value('id');
        $values = ['module' => 'Inventory', 'action' => 'Updated'];

        if (Schema::hasColumn('audit_logs', 'user_id')) $values['user_id'] = $userId;
        if (Schema::hasColumn('audit_logs', 'user_name')) $values['user_name'] = $userName;
        if (Schema::hasColumn('audit_logs', 'details')) $values['details'] = $description;
        if (Schema::hasColumn('audit_logs', 'description')) $values['description'] = $description;
        if (Schema::hasColumn('audit_logs', 'status')) $values['status'] = 'Completed';
        if (Schema::hasColumn('audit_logs', 'created_at')) $values['created_at'] = now();
        if (Schema::hasColumn('audit_logs', 'updated_at')) $values['updated_at'] = now();
        if (Schema::hasColumn('audit_logs', 'logged_at')) $values['logged_at'] = now();

        DB::table('audit_logs')->insert($values);
    }
}
