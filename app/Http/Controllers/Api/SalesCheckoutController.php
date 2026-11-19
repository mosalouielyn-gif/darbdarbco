<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SalesCheckoutController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $beneficiaryActiveColumn = Schema::hasColumn('beneficiaries', 'is_active') ? 'is_active' : 'active';
        $payload = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.inventory_item_id' => ['required', 'integer', 'distinct', Rule::exists('inventory_items', 'id')],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'customer_type' => ['required', Rule::in(['registered', 'walk-in'])],
            'customer_name' => ['nullable', 'string', 'max:255', 'required_if:customer_type,walk-in'],
            'beneficiary_id' => [
                'nullable',
                'integer',
                Rule::requiredIf(fn (): bool => $request->input('customer_type') === 'registered'),
                Rule::exists('beneficiaries', 'id')->where($beneficiaryActiveColumn, 1),
            ],
            'payment_method' => ['required', Rule::in(['Cash', 'Beneficiary Credit'])],
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
        ]);

        if ($payload['customer_type'] === 'walk-in' && $payload['payment_method'] !== 'Cash') {
            throw ValidationException::withMessages([
                'payment_method' => ['Beneficiary Credit is only available for registered beneficiaries.'],
            ]);
        }

        if (! Schema::hasTable('sales_receipts') || ! Schema::hasTable('sales_receipt_items')) {
            return response()->json(['message' => 'Sales receipt storage is not available. Contact an administrator.'], 500);
        }

        if (! Schema::hasTable('stock_transactions')) {
            return response()->json(['message' => 'Inventory transaction storage is not available. Contact an administrator.'], 500);
        }

        if ($payload['payment_method'] === 'Beneficiary Credit' && ! Schema::hasTable('credit_transactions')) {
            return response()->json(['message' => 'Beneficiary credit storage is not available. Contact an administrator.'], 500);
        }

        $receipt = DB::transaction(function () use ($payload, $beneficiaryActiveColumn): array {
            $userId = $this->resolveUserId($payload['user_id'] ?? null, $payload['user_name'] ?? null);
            $beneficiary = null;

            if ($payload['customer_type'] === 'registered') {
                $beneficiaryNameColumn = Schema::hasColumn('beneficiaries', 'full_name') ? 'full_name' : 'name';
                $beneficiaryCodeColumn = Schema::hasColumn('beneficiaries', 'code') ? 'code' : 'beneficiary_code';
                $beneficiary = DB::table('beneficiaries')
                    ->where('id', $payload['beneficiary_id'])
                    ->where($beneficiaryActiveColumn, 1)
                    ->lockForUpdate()
                    ->first();

                if (! $beneficiary) {
                    throw ValidationException::withMessages([
                        'beneficiary_id' => ['Select an active registered beneficiary.'],
                    ]);
                }

                $beneficiary->canonical_name = $beneficiary->{$beneficiaryNameColumn};
                $beneficiary->canonical_code = $beneficiary->{$beneficiaryCodeColumn};
            }

            $itemIds = collect($payload['items'])->pluck('inventory_item_id')->map(fn ($id): int => (int) $id)->sort()->values();
            $itemsById = $this->inventoryItemsQuery()
                ->whereIn('inventory_items.id', $itemIds)
                ->orderBy('inventory_items.id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($itemsById->isNotEmpty() && Schema::hasColumn('inventory_items', 'category_id') && Schema::hasTable('inventory_categories')) {
                $categories = DB::table('inventory_categories')
                    ->whereIn('id', $itemsById->pluck('category_id')->filter()->unique())
                    ->pluck('label', 'id');

                foreach ($itemsById as $item) {
                    $item->category = $categories[$item->category_id] ?? '';
                }
            }

            if ($itemsById->count() !== $itemIds->count()) {
                throw ValidationException::withMessages([
                    'items' => ['One or more selected inventory items are no longer available.'],
                ]);
            }

            $checkoutItems = [];
            $totalAmount = 0.0;

            foreach ($payload['items'] as $line) {
                $item = $itemsById->get((int) $line['inventory_item_id']);
                $quantity = (float) $line['quantity'];
                $available = (float) $item->on_hand;

                if (! (bool) $item->is_active) {
                    throw ValidationException::withMessages([
                        'items' => ["{$item->item_name} is no longer active."],
                    ]);
                }

                if ($quantity > $available) {
                    throw ValidationException::withMessages([
                        'items' => ["Only {$available} {$item->unit} available for {$item->item_name}."],
                    ]);
                }

                $unitPrice = (float) $item->unit_cost;
                $subtotal = round($quantity * $unitPrice, 2);
                $totalAmount += $subtotal;
                $checkoutItems[] = [
                    'id' => (int) $item->id,
                    'item' => $item,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'subtotal' => $subtotal,
                    'updated_balance' => $available - $quantity,
                ];
            }

            $now = now();
            $receiptNo = 'POS-'.$now->format('Ymd-His').'-'.Str::upper(Str::random(8));
            $isCredit = $payload['payment_method'] === 'Beneficiary Credit';
            $customerName = $beneficiary->canonical_name ?? trim($payload['customer_name'] ?? '');

            $receiptId = DB::table('sales_receipts')->insertGetId([
                'receipt_no' => $receiptNo,
                'beneficiary_id' => $beneficiary->id ?? null,
                'customer_name' => $customerName,
                'total_amount' => round($totalAmount, 2),
                'cash_payment' => $isCredit ? 0 : round($totalAmount, 2),
                'credit_amount' => $isCredit ? round($totalAmount, 2) : 0,
                'remaining_balance' => $isCredit ? round($totalAmount, 2) : 0,
                'created_by' => $userId,
                'transaction_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $savedItems = [];
            $creditRows = [];

            foreach ($checkoutItems as $line) {
                $item = $line['item'];
                $lineReference = $receiptNo.'-'.str_pad((string) $line['id'], 4, '0', STR_PAD_LEFT);
                $receiptItemId = DB::table('sales_receipt_items')->insertGetId([
                    'sales_receipt_id' => $receiptId,
                    'inventory_item_id' => $line['id'],
                    'item_name' => $item->item_name,
                    'category' => $item->category,
                    'quantity' => $line['quantity'],
                    'unit' => $item->unit,
                    'unit_price' => $line['unit_price'],
                    'total_amount' => $line['subtotal'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                DB::table('inventory_items')->where('id', $line['id'])->update([
                    'on_hand' => $line['updated_balance'],
                    'updated_at' => $now,
                ]);

                $reason = "POS sale to {$customerName}. Payment Method: {$payload['payment_method']}; Receipt {$receiptNo}.";
                DB::table('stock_transactions')->insert([
                    'reference_no' => $lineReference,
                    'item_id' => $line['id'],
                    'txn_type' => $isCredit ? 'Credit Issued' : 'Direct Release',
                    'quantity' => $line['quantity'],
                    'unit_cost' => $line['unit_price'],
                    'supplier_name' => null,
                    'beneficiary_id' => $beneficiary->id ?? null,
                    'beneficiary_name' => $customerName,
                    'receipt_no' => $receiptNo,
                    'reason' => $reason,
                    'recorded_by' => $userId,
                    'txn_at' => $now,
                ]);

                if ($isCredit) {
                    $creditId = DB::table('credit_transactions')->insertGetId([
                        'credit_no' => 'CR-'.$receiptNo.'-'.$line['id'],
                        'release_reference_no' => $lineReference,
                        'inventory_item_id' => $line['id'],
                        'beneficiary_name' => $customerName,
                        'beneficiary_account_id' => $beneficiary->canonical_code,
                        'material_name' => $item->item_name,
                        'quantity' => $line['quantity'],
                        'unit' => $item->unit,
                        'unit_cost' => $line['unit_price'],
                        'amount' => $line['subtotal'],
                        'remaining_balance' => $line['subtotal'],
                        'status' => 'Pending',
                        'credit_date' => $now->toDateString(),
                        'notes' => "POS checkout receipt {$receiptNo}.",
                        'created_by' => $userId,
                        'receipt_no' => $receiptNo,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                    $creditRows[] = DB::table('credit_transactions')->where('id', $creditId)->first();
                }

                $savedItems[] = [
                    'id' => $receiptItemId,
                    'inventory_item_id' => $line['id'],
                    'item_name' => $item->item_name,
                    'category' => $item->category,
                    'quantity' => $line['quantity'],
                    'unit' => $item->unit,
                    'unit_price' => $line['unit_price'],
                    'total_amount' => $line['subtotal'],
                    'updated_balance' => $line['updated_balance'],
                ];
            }

            return [
                'id' => $receiptId,
                'receipt_no' => $receiptNo,
                'beneficiary_id' => $beneficiary->id ?? null,
                'beneficiary_code' => $beneficiary->canonical_code ?? null,
                'customer_name' => $customerName,
                'payment_method' => $payload['payment_method'],
                'total_amount' => round($totalAmount, 2),
                'cash_payment' => $isCredit ? 0 : round($totalAmount, 2),
                'credit_amount' => $isCredit ? round($totalAmount, 2) : 0,
                'remaining_balance' => $isCredit ? round($totalAmount, 2) : 0,
                'created_by' => $userId,
                'processed_by' => $payload['user_name'] ?? 'Inventory Bookkeeper',
                'transaction_at' => $now->toDateTimeString(),
                'items' => $savedItems,
                'credit_transactions' => $creditRows,
            ];
        });

        return response()->json(['receipt' => $receipt], 201);
    }

    private function inventoryItemsQuery(): Builder
    {
        $nameColumn = Schema::hasColumn('inventory_items', 'item_name') ? 'item_name' : 'name';
        $activeColumn = Schema::hasColumn('inventory_items', 'is_active') ? 'is_active' : 'active';
        $query = DB::table('inventory_items');

        if (Schema::hasColumn('inventory_items', 'category_id') && Schema::hasTable('inventory_categories')) {
            $categorySelect = 'inventory_items.category_id';
        } elseif (Schema::hasColumn('inventory_items', 'category')) {
            $categorySelect = 'inventory_items.category';
        } else {
            $categorySelect = DB::raw("'' as category");
        }

        $columns = [
            'inventory_items.id',
            'inventory_items.unit',
            'inventory_items.on_hand',
            'inventory_items.unit_cost',
            DB::raw("inventory_items.{$nameColumn} as item_name"),
            DB::raw("inventory_items.{$activeColumn} as is_active"),
            $categorySelect,
        ];

        return $query->select($columns);
    }

    private function resolveUserId(?int $userId, ?string $userName): ?int
    {
        if (! Schema::hasTable('users')) {
            return null;
        }

        if ($userId && DB::table('users')->where('id', $userId)->exists()) {
            return $userId;
        }

        $nameColumn = Schema::hasColumn('users', 'full_name') ? 'full_name' : 'name';
        if ($userName && Schema::hasColumn('users', $nameColumn)) {
            $matchedId = DB::table('users')->where($nameColumn, $userName)->value('id');
            if ($matchedId) {
                return (int) $matchedId;
            }
        }

        return null;
    }
}
