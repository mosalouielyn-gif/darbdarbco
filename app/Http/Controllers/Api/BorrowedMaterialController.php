<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class BorrowedMaterialController extends Controller
{
    public function returnMaterial(Request $request, string $id): JsonResponse
    {
        $payload = $request->validate([
            'quantity' => ['required', 'numeric', 'min:0.01'],
            'return_date' => ['required', 'date'],
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
        ]);

        $result = DB::transaction(function () use ($id, $payload) {
            $borrowed = DB::table('borrowed_materials')
                ->when(is_numeric($id), fn ($query) => $query->where('id', $id), fn ($query) => $query->where('borrow_no', $id))
                ->lockForUpdate()
                ->first();
            abort_if(! $borrowed, 404, 'Borrowed material record not found.');

            $remaining = (float) $borrowed->qty_borrowed - (float) $borrowed->qty_returned;
            $quantity = (float) $payload['quantity'];
            abort_if($quantity > $remaining, 422, "Only {$remaining} {$borrowed->unit} is still borrowed.");

            $item = DB::table('inventory_items')->where('id', $borrowed->inventory_item_id)->lockForUpdate()->first();
            abort_if(! $item, 404, 'Inventory item not found.');

            $previousBalance = (float) $item->on_hand;
            $updatedBalance = $previousBalance + $quantity;
            $qtyReturned = (float) $borrowed->qty_returned + $quantity;
            $status = $qtyReturned >= (float) $borrowed->qty_borrowed ? 'Returned' : 'Partially Returned';

            DB::table('inventory_items')->where('id', $item->id)->update([
                'on_hand' => $updatedBalance,
                'stock_date' => $payload['return_date'],
                'updated_at' => now(),
            ]);

            DB::table('borrowed_materials')->where('id', $borrowed->id)->update([
                'qty_returned' => $qtyReturned,
                'actual_return_date' => $status === 'Returned' ? $payload['return_date'] : $borrowed->actual_return_date,
                'status' => $status,
                'updated_at' => now(),
            ]);

            $this->recordReturnTransaction($borrowed, $item, $payload, $quantity);
            $this->recordAudit(
                $payload['user_id'] ?? null,
                $payload['user_name'] ?? null,
                "Returned {$quantity} {$borrowed->unit} borrowed material {$borrowed->borrow_no}",
            );

            return [
                'borrowed' => $this->findBorrowed((int) $borrowed->id),
                'item' => $this->findItem((int) $item->id),
                'previous_balance' => $previousBalance,
                'updated_balance' => $updatedBalance,
            ];
        });

        return response()->json($result);
    }

    private function recordReturnTransaction(object $borrowed, object $item, array $payload, float $quantity): void
    {
        $userId = $this->resolveUserId($payload['user_id'] ?? null, $payload['user_name'] ?? null);
        $name = $item->item_name ?? $item->name ?? 'inventory item';
        $reason = "Returned by {$borrowed->borrower}. Borrow record: {$borrowed->borrow_no}.";

        if (Schema::hasTable('stock_transactions')) {
            DB::table('stock_transactions')->insert([
                'reference_no' => 'RET-'.now()->format('YmdHis').'-'.$borrowed->id,
                'item_id' => $item->id,
                'txn_type' => 'Returned Material',
                'quantity' => $quantity,
                'unit_cost' => $item->unit_cost ?? 0,
                'supplier_name' => null,
                'reason' => $reason,
                'recorded_by' => $userId,
                'txn_at' => $payload['return_date'],
            ]);
        }

        if (Schema::hasTable('inventory_transactions')) {
            DB::table('inventory_transactions')->insert([
                'reference_no' => 'RET-'.now()->format('YmdHis').'-'.$borrowed->id,
                'inventory_item_id' => $item->id,
                'transaction_type' => 'Returned Material',
                'quantity' => $quantity,
                'unit_cost' => $item->unit_cost ?? 0,
                'beneficiary_name' => $borrowed->borrower,
                'reason' => $reason,
                'transaction_at' => $payload['return_date'],
                'created_by' => $userId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    private function findBorrowed(int $id): ?object
    {
        return DB::table('borrowed_materials')
            ->leftJoin('inventory_items', 'inventory_items.id', '=', 'borrowed_materials.inventory_item_id')
            ->selectRaw('borrowed_materials.*, inventory_items.material_id as material_code, inventory_items.item_name as material_name')
            ->where('borrowed_materials.id', $id)
            ->first();
    }

    private function findItem(int $id): ?object
    {
        return DB::table('inventory_items')
            ->leftJoin('inventory_categories', 'inventory_categories.id', '=', 'inventory_items.category_id')
            ->selectRaw('inventory_items.id, inventory_items.material_id as code, inventory_items.item_name as name, inventory_categories.label as category, inventory_items.unit, inventory_items.on_hand, inventory_items.unit_cost, inventory_items.supplier, inventory_items.expiry_date, inventory_items.stock_date, inventory_items.is_active as active, inventory_items.created_at, inventory_items.updated_at')
            ->where('inventory_items.id', $id)
            ->first();
    }

    private function recordAudit(?int $userId, ?string $userName, string $description): void
    {
        if (! Schema::hasTable('audit_logs')) {
            return;
        }

        $userId = $this->resolveUserId($userId, $userName);
        $values = [
            'module' => 'Inventory',
            'action' => 'Updated',
        ];

        if (Schema::hasColumn('audit_logs', 'user_id')) {
            $values['user_id'] = $userId;
        }
        if (Schema::hasColumn('audit_logs', 'user_name')) {
            $values['user_name'] = $userName;
        }
        if (Schema::hasColumn('audit_logs', 'details')) {
            $values['details'] = $description;
        }
        if (Schema::hasColumn('audit_logs', 'description')) {
            $values['description'] = $description;
        }
        if (Schema::hasColumn('audit_logs', 'status')) {
            $values['status'] = 'Completed';
        }
        if (Schema::hasColumn('audit_logs', 'created_at')) {
            $values['created_at'] = now();
        }
        if (Schema::hasColumn('audit_logs', 'updated_at')) {
            $values['updated_at'] = now();
        }
        if (Schema::hasColumn('audit_logs', 'logged_at')) {
            $values['logged_at'] = now();
        }

        DB::table('audit_logs')->insert($values);
    }

    private function resolveUserId(?int $userId, ?string $userName): ?int
    {
        if ($userId) {
            return $userId;
        }

        if (! Schema::hasTable('users')) {
            return null;
        }

        if ($userName) {
            $nameColumn = Schema::hasColumn('users', 'full_name') ? 'full_name' : (Schema::hasColumn('users', 'name') ? 'name' : null);
            if ($nameColumn) {
                $matched = DB::table('users')->where($nameColumn, $userName)->value('id');
                if ($matched) {
                    return (int) $matched;
                }
            }
        }

        return DB::table('users')->value('id');
    }
}
