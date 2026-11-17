<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SalesReceiptController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'receipt_no' => ['required', 'string', 'max:255', 'unique:sales_receipts,receipt_no'],
            'beneficiary_id' => ['nullable', 'integer', 'exists:beneficiaries,id'],
            'customer_name' => ['required', 'string', 'max:255'],
            'beneficiary_account_id' => ['nullable', 'string', 'max:255'],
            'cash_payment' => ['required', 'numeric', 'min:0'],
            'transaction_date' => ['required', 'date'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.inventory_item_id' => ['required', 'integer', 'exists:inventory_items,id'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
        ]);

        $receipt = DB::transaction(function () use ($payload) {
            $lines = [];
            $total = 0.0;
            foreach ($payload['items'] as $line) {
                $item = DB::table('inventory_items')->where('id', $line['inventory_item_id'])->lockForUpdate()->first();
                abort_if(! $item, 404, 'Inventory item not found.');
                $quantity = (float) $line['quantity'];
                $available = (float) $item->on_hand;
                abort_if($quantity > $available, 422, "Only {$available} units are available for this item.");
                $price = (float) $line['unit_price'];
                $amount = round($quantity * $price, 2);
                $itemName = $item->item_name ?? $item->name ?? 'Inventory item';
                $category = $item->category ?? null;
                if (Schema::hasColumn('inventory_items', 'category_id') && Schema::hasTable('inventory_categories')) {
                    $category = DB::table('inventory_categories')->where('id', $item->category_id)->value('label') ?? $category;
                }
                $lines[] = compact('item', 'quantity', 'price', 'amount', 'itemName', 'category');
                $total += $amount;
            }

            $total = round($total, 2);
            $cash = round((float) $payload['cash_payment'], 2);
            abort_if($cash > $total, 422, 'Cash payment cannot exceed the transaction total.');
            $credit = round($total - $cash, 2);
            abort_if($credit > 0 && empty($payload['beneficiary_id']), 422, 'Credit payments require a registered beneficiary.');

            $receiptId = DB::table('sales_receipts')->insertGetId([
                'receipt_no' => $payload['receipt_no'],
                'beneficiary_id' => $payload['beneficiary_id'] ?? null,
                'customer_name' => $payload['customer_name'],
                'total_amount' => $total,
                'cash_payment' => $cash,
                'credit_amount' => $credit,
                'remaining_balance' => $credit,
                'created_by' => $payload['user_id'] ?? null,
                'transaction_at' => $payload['transaction_date'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $creditLeft = $credit;
            $creditTransactions = [];
            foreach ($lines as $line) {
                $item = $line['item'];
                $quantity = $line['quantity'];
                $previous = (float) $item->on_hand;
                $updated = $previous - $quantity;
                DB::table('inventory_items')->where('id', $item->id)->update(['on_hand' => $updated, 'updated_at' => now()]);
                DB::table('sales_receipt_items')->insert([
                    'sales_receipt_id' => $receiptId,
                    'inventory_item_id' => $item->id,
                    'item_name' => $line['itemName'],
                    'category' => $line['category'],
                    'quantity' => $quantity,
                    'unit' => $item->unit,
                    'unit_price' => $line['price'],
                    'total_amount' => $line['amount'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $lineRef = $payload['receipt_no'].'-'.$item->id;
                $creditForLine = min($creditLeft, $line['amount']);
                $creditLeft = round($creditLeft - $creditForLine, 2);
                $cashForLine = round($line['amount'] - $creditForLine, 2);
                $reason = "POS receipt {$payload['receipt_no']}; Cash Payment: {$cashForLine}; Credit Amount: {$creditForLine}";
                if (Schema::hasTable('stock_transactions')) {
                    $values = [
                        'reference_no' => $lineRef,
                        'item_id' => $item->id,
                        'txn_type' => 'Sale',
                        'quantity' => $quantity,
                        'unit_cost' => $line['price'],
                        'supplier_name' => null,
                        'reason' => $reason,
                        'recorded_by' => $payload['user_id'] ?? null,
                        'txn_at' => $payload['transaction_date'],
                    ];
                    if (Schema::hasColumn('stock_transactions', 'beneficiary_id')) $values['beneficiary_id'] = $payload['beneficiary_id'] ?? null;
                    if (Schema::hasColumn('stock_transactions', 'beneficiary_name')) $values['beneficiary_name'] = $payload['customer_name'];
                    if (Schema::hasColumn('stock_transactions', 'receipt_no')) $values['receipt_no'] = $payload['receipt_no'];
                    DB::table('stock_transactions')->insert($values);
                } elseif (Schema::hasTable('inventory_transactions')) {
                    $values = [
                        'reference_no' => $lineRef,
                        'inventory_item_id' => $item->id,
                        'transaction_type' => 'Sale',
                        'quantity' => $quantity,
                        'unit_cost' => $line['price'],
                        'beneficiary_name' => $payload['customer_name'],
                        'reason' => $reason,
                        'transaction_at' => $payload['transaction_date'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                    if (Schema::hasColumn('inventory_transactions', 'created_by')) $values['created_by'] = $payload['user_id'] ?? null;
                    if (Schema::hasColumn('inventory_transactions', 'beneficiary_id')) $values['beneficiary_id'] = $payload['beneficiary_id'] ?? null;
                    if (Schema::hasColumn('inventory_transactions', 'receipt_no')) $values['receipt_no'] = $payload['receipt_no'];
                    if (Schema::hasColumn('inventory_transactions', 'previous_balance')) $values['previous_balance'] = $previous;
                    if (Schema::hasColumn('inventory_transactions', 'updated_balance')) $values['updated_balance'] = $updated;
                    DB::table('inventory_transactions')->insert($values);
                }

                if ($creditForLine > 0 && $line['price'] > 0 && Schema::hasTable('credit_transactions')) {
                    $creditQuantity = round($creditForLine / $line['price'], 2);
                    $creditId = DB::table('credit_transactions')->insertGetId([
                        'credit_no' => 'CR-'.$payload['receipt_no'].'-'.$item->id,
                        'release_reference_no' => $lineRef,
                        'receipt_no' => $payload['receipt_no'],
                        'inventory_item_id' => $item->id,
                        'beneficiary_name' => $payload['customer_name'],
                        'beneficiary_account_id' => $payload['beneficiary_account_id'] ?? (string) $payload['beneficiary_id'],
                        'material_name' => $line['itemName'],
                        'quantity' => $creditQuantity,
                        'unit' => $item->unit,
                        'unit_cost' => $line['price'],
                        'amount' => $creditForLine,
                        'remaining_balance' => $creditForLine,
                        'status' => 'Pending',
                        'credit_date' => $payload['transaction_date'],
                        'notes' => "Credit portion of receipt {$payload['receipt_no']}",
                        'created_by' => $payload['user_id'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $creditTransactions[] = DB::table('credit_transactions')->where('id', $creditId)->first();
                }
            }

            $savedReceipt = DB::table('sales_receipts')->where('id', $receiptId)->first();
            $savedReceipt->items = DB::table('sales_receipt_items')->where('sales_receipt_id', $receiptId)->orderBy('id')->get();
            $savedReceipt->credit_transactions = $creditTransactions;
            return $savedReceipt;
        });
        return response()->json($receipt, 201);
    }
}
