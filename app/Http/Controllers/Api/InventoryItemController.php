<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class InventoryItemController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $payload = $this->validatedPayload($request);

        $item = DB::transaction(function () use ($payload) {
            $id = DB::table('inventory_items')->insertGetId($this->itemValues($payload));

            if (($payload['on_hand'] ?? 0) > 0 && (Schema::hasTable('inventory_transactions') || Schema::hasTable('stock_transactions'))) {
                $this->recordTransaction($id, $payload, 0, $payload['on_hand']);
            }

            $saved = $this->findItem($id);
            $this->recordAudit(
                $payload['user_id'] ?? null,
                $payload['user_name'] ?? null,
                'Created',
                "Created inventory item {$saved->name}",
            );

            return $saved;
        });

        return response()->json($item, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $payload = $this->validatedPayload($request, $id);

        DB::table('inventory_items')->where('id', $id)->update($this->itemValues($payload, false));

        $item = $this->findItem($id);
        $this->recordAudit(
            $payload['user_id'] ?? null,
            $payload['user_name'] ?? null,
            'Updated',
            "Updated inventory item {$item->name}",
        );

        return response()->json($item);
    }

    public function status(Request $request, int $id): JsonResponse
    {
        $payload = $request->validate([
            'active' => ['required', 'boolean'],
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
            'remarks' => ['nullable', 'string'],
        ]);

        DB::table('inventory_items')->where('id', $id)->update([
            $this->activeColumn() => $payload['active'],
            'updated_at' => now(),
        ]);

        $item = $this->findItem($id);
        $action = $payload['active'] ? 'Activated' : 'Deactivated';
        $this->recordAudit(
            $payload['user_id'] ?? null,
            $payload['user_name'] ?? null,
            $action,
            $payload['remarks'] ?? "{$action} inventory item {$item->name}",
        );

        return response()->json($item);
    }

    public function stockIn(Request $request, int $id): JsonResponse
    {
        $payload = $request->validate([
            'quantity' => ['required', 'numeric', 'min:0.01'],
            'unit_cost' => ['required', 'numeric', 'min:0'],
            'supplier' => ['required', 'string', 'max:255'],
            'reference_no' => ['required', 'string', 'max:255'],
            'stock_date' => ['required', 'date'],
            'expiry_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'document_name' => ['nullable', 'string', 'max:255'],
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
        ]);

        $item = DB::transaction(function () use ($id, $payload) {
            $current = DB::table('inventory_items')->where('id', $id)->lockForUpdate()->first();
            abort_if(! $current, 404, 'Inventory item not found.');

            $previousBalance = (float) $current->on_hand;
            $updatedBalance = $previousBalance + (float) $payload['quantity'];

            $values = [
                'on_hand' => $updatedBalance,
                'unit_cost' => $payload['unit_cost'],
                'stock_date' => $payload['stock_date'],
                'expiry_date' => $payload['expiry_date'] ?? $current->expiry_date,
                'updated_at' => now(),
            ];

            if (Schema::hasColumn('inventory_items', 'supplier')) {
                $values['supplier'] = $payload['supplier'];
            }

            DB::table('inventory_items')->where('id', $id)->update($values);

            $this->recordStockInTransaction($id, $payload, $previousBalance, $updatedBalance);

            $saved = $this->findItem($id);
            $this->recordAudit(
                $payload['user_id'] ?? null,
                $payload['user_name'] ?? null,
                'Updated',
                "Recorded stock-in {$payload['quantity']} {$saved->unit} for {$saved->name}",
            );

            return $saved;
        });

        return response()->json($item);
    }

    public function release(Request $request, int $id): JsonResponse
    {
        $payload = $request->validate([
            'quantity' => ['required', 'numeric', 'min:0.01'],
            'unit_cost' => ['required', 'numeric', 'min:0'],
            'reference_no' => ['required', 'string', 'max:255'],
            'stock_date' => ['required', 'date'],
            'release_type' => ['required', 'string', 'max:50'],
            'beneficiary' => ['nullable', 'string', 'max:255'],
            'purpose' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'expected_return_date' => ['nullable', 'date'],
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
        ]);

        $item = DB::transaction(function () use ($id, $payload) {
            $current = DB::table('inventory_items')->where('id', $id)->lockForUpdate()->first();
            abort_if(! $current, 404, 'Inventory item not found.');

            $previousBalance = (float) $current->on_hand;
            $quantity = (float) $payload['quantity'];
            abort_if($quantity > $previousBalance, 422, "Only {$previousBalance} {$current->unit} available for this item.");

            $updatedBalance = $previousBalance - $quantity;

            DB::table('inventory_items')->where('id', $id)->update([
                'on_hand' => $updatedBalance,
                'unit_cost' => $payload['unit_cost'],
                'stock_date' => $payload['stock_date'],
                'updated_at' => now(),
            ]);

            $borrowed = null;
            $credit = null;

            $this->recordReleaseTransaction($id, $payload, $previousBalance, $updatedBalance);
            if (($payload['release_type'] ?? '') === 'borrowed') {
                $borrowed = $this->recordBorrowedMaterial($id, $current, $payload);
            }
            if (($payload['release_type'] ?? '') === 'credit') {
                $credit = $this->recordCreditTransaction($id, $current, $payload);
            }

            $saved = $this->findItem($id);
            $this->recordAudit(
                $payload['user_id'] ?? null,
                $payload['user_name'] ?? null,
                'Updated',
                "Released {$payload['quantity']} {$saved->unit} from {$saved->name}",
            );

            if ($borrowed || $credit) {
                return [
                    'item' => $saved,
                    'borrowed' => $borrowed,
                    'credit' => $credit,
                ];
            }

            return $saved;
        });

        return response()->json($item);
    }

    public function adjust(Request $request, int $id): JsonResponse
    {
        $payload = $request->validate([
            'corrected_quantity' => ['required', 'numeric', 'min:0'],
            'reference_no' => ['required', 'string', 'max:255'],
            'stock_date' => ['required', 'date'],
            'reason' => ['required', 'string'],
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
        ]);

        $item = DB::transaction(function () use ($id, $payload) {
            $current = DB::table('inventory_items')->where('id', $id)->lockForUpdate()->first();
            abort_if(! $current, 404, 'Inventory item not found.');

            $previousBalance = (float) $current->on_hand;
            $correctedQuantity = (float) $payload['corrected_quantity'];
            abort_if($previousBalance === $correctedQuantity, 422, 'Corrected quantity must differ from the system quantity.');

            DB::table('inventory_items')->where('id', $id)->update([
                'on_hand' => $correctedQuantity,
                'stock_date' => $payload['stock_date'],
                'updated_at' => now(),
            ]);

            $this->recordAdjustmentTransaction($id, $current, $payload, $previousBalance, $correctedQuantity);

            $saved = $this->findItem($id);
            $this->recordAudit(
                $payload['user_id'] ?? null,
                $payload['user_name'] ?? null,
                'Updated',
                "Adjusted {$saved->name} from {$previousBalance} to {$correctedQuantity} {$saved->unit}",
            );

            return $saved;
        });

        return response()->json($item);
    }

    private function validatedPayload(Request $request, ?int $ignoreId = null): array
    {
        $codeColumn = $this->codeColumn();

        return $request->validate([
            'item_code' => [
                'required',
                'string',
                'max:255',
                Rule::unique('inventory_items', $codeColumn)->ignore($ignoreId),
            ],
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:255'],
            'unit' => ['required', 'string', 'max:50'],
            'on_hand' => ['required', 'numeric', 'min:0'],
            'minimum_stock' => ['nullable', 'numeric', 'min:0'],
            'unit_cost' => ['required', 'numeric', 'min:0'],
            'stock_date' => ['required', 'date'],
            'expiry_date' => ['nullable', 'date'],
            'supplier' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
        ]);
    }

    private function itemValues(array $payload, bool $creating = true): array
    {
        $values = [
            $this->codeColumn() => $payload['item_code'],
            $this->nameColumn() => $payload['name'],
            'unit' => $payload['unit'],
            'on_hand' => $payload['on_hand'],
            'unit_cost' => $payload['unit_cost'],
            'stock_date' => $payload['stock_date'],
            'expiry_date' => $payload['expiry_date'] ?? null,
            'updated_at' => now(),
        ];

        if (Schema::hasColumn('inventory_items', 'category_id')) {
            $values['category_id'] = $this->categoryId($payload['category']);
        } elseif (Schema::hasColumn('inventory_items', 'category')) {
            $values['category'] = $payload['category'];
        }

        if (Schema::hasColumn('inventory_items', 'minimum_stock')) {
            $values['minimum_stock'] = $payload['minimum_stock'] ?? 0;
        }

        if (Schema::hasColumn('inventory_items', 'supplier')) {
            $values['supplier'] = $payload['supplier'] ?? null;
        }

        if ($creating) {
            $values[$this->activeColumn()] = true;
            $values['created_at'] = now();
        }

        return $values;
    }

    private function recordTransaction(int $itemId, array $payload, float $previousBalance, float $updatedBalance): void
    {
        $userId = $this->resolveUserId($payload['user_id'] ?? null, $payload['user_name'] ?? null);
        if (Schema::hasTable('stock_transactions')) {
            $values = [
                'reference_no' => 'RC-'.now()->format('YmdHis').'-'.$itemId,
                'item_id' => $itemId,
                'txn_type' => 'Stock In',
                'quantity' => $payload['on_hand'],
                'unit_cost' => $payload['unit_cost'],
                'supplier_name' => $payload['supplier'] ?? null,
                'reason' => $payload['notes'] ?? 'Received materials into inventory',
                'recorded_by' => $userId,
                'txn_at' => $payload['stock_date'],
            ];

            DB::table('stock_transactions')->insert($values);
            return;
        }

        $values = [
            'reference_no' => $payload['reference_no'] ?? 'RC-'.now()->format('YmdHis').'-'.$itemId,
            'inventory_item_id' => $itemId,
            'transaction_type' => 'Stock In',
            'quantity' => $payload['on_hand'],
            'unit_cost' => $payload['unit_cost'],
            'reason' => $payload['notes'] ?? 'Received materials into inventory',
            'transaction_at' => $payload['stock_date'],
            'created_at' => now(),
            'updated_at' => now(),
        ];

        if (Schema::hasColumn('inventory_transactions', 'created_by')) {
            $values['created_by'] = $userId;
        }

        if (Schema::hasColumn('inventory_transactions', 'previous_balance')) {
            $values['previous_balance'] = $previousBalance;
        }

        if (Schema::hasColumn('inventory_transactions', 'updated_balance')) {
            $values['updated_balance'] = $updatedBalance;
        }

        DB::table('inventory_transactions')->insert($values);
    }

    private function recordStockInTransaction(int $itemId, array $payload, float $previousBalance, float $updatedBalance): void
    {
        $userId = $this->resolveUserId($payload['user_id'] ?? null, $payload['user_name'] ?? null);
        $notes = trim($payload['notes'] ?? '');
        if (! empty($payload['document_name'])) {
            $notes = trim($notes.' Supporting document: '.$payload['document_name'].'.');
        }

        $transactionPayload = [
            'on_hand' => $payload['quantity'],
            'unit_cost' => $payload['unit_cost'],
            'supplier' => $payload['supplier'],
            'notes' => $notes !== '' ? $notes : 'Received materials into inventory',
            'user_id' => $userId,
            'user_name' => $payload['user_name'] ?? null,
            'stock_date' => $payload['stock_date'],
        ];

        if (Schema::hasTable('stock_transactions')) {
            $values = [
                'reference_no' => $payload['reference_no'],
                'item_id' => $itemId,
                'txn_type' => 'Stock In',
                'quantity' => $payload['quantity'],
                'unit_cost' => $payload['unit_cost'],
                'supplier_name' => $payload['supplier'],
                'reason' => $transactionPayload['notes'],
                'recorded_by' => $userId,
                'txn_at' => $payload['stock_date'],
            ];

            DB::table('stock_transactions')->insert($values);
            return;
        }

        $transactionPayload['reference_no'] = $payload['reference_no'];
        $this->recordTransaction($itemId, $transactionPayload, $previousBalance, $updatedBalance);
    }

    private function recordReleaseTransaction(int $itemId, array $payload, float $previousBalance, float $updatedBalance): void
    {
        $userId = $this->resolveUserId($payload['user_id'] ?? null, $payload['user_name'] ?? null);
        $type = match ($payload['release_type']) {
            'credit' => 'Credit Issued',
            'borrowed' => 'Borrowed Material',
            'internal' => 'Internal Use',
            'adjustment' => 'Adjustment',
            default => 'Direct Release',
        };
        $reason = trim($payload['purpose'] ?? '');
        if ($reason === '') {
            $recipient = trim($payload['beneficiary'] ?? '');
            $reason = $recipient !== '' ? "Released to {$recipient}" : 'Released materials from inventory';
        }
        if (! empty($payload['notes'])) {
            $reason .= ' Notes: '.$payload['notes'];
        }

        if (Schema::hasTable('stock_transactions')) {
            DB::table('stock_transactions')->insert([
                'reference_no' => $payload['reference_no'],
                'item_id' => $itemId,
                'txn_type' => $type,
                'quantity' => $payload['quantity'],
                'unit_cost' => $payload['unit_cost'],
                'supplier_name' => null,
                'reason' => $reason,
                'recorded_by' => $userId,
                'txn_at' => $payload['stock_date'],
            ]);
            return;
        }

        if (! Schema::hasTable('inventory_transactions')) {
            return;
        }

        $values = [
            'reference_no' => $payload['reference_no'],
            'inventory_item_id' => $itemId,
            'transaction_type' => $type,
            'quantity' => $payload['quantity'],
            'unit_cost' => $payload['unit_cost'],
            'beneficiary_name' => $payload['beneficiary'] ?? null,
            'reason' => $reason,
            'transaction_at' => $payload['stock_date'],
            'created_at' => now(),
            'updated_at' => now(),
        ];

        if (Schema::hasColumn('inventory_transactions', 'created_by')) {
            $values['created_by'] = $userId;
        }

        if (Schema::hasColumn('inventory_transactions', 'previous_balance')) {
            $values['previous_balance'] = $previousBalance;
        }

        if (Schema::hasColumn('inventory_transactions', 'updated_balance')) {
            $values['updated_balance'] = $updatedBalance;
        }

        DB::table('inventory_transactions')->insert($values);
    }

    private function recordBorrowedMaterial(int $itemId, object $item, array $payload): ?object
    {
        if (! Schema::hasTable('borrowed_materials')) {
            return null;
        }

        $id = DB::table('borrowed_materials')->insertGetId([
            'borrow_no' => $payload['reference_no'],
            'inventory_item_id' => $itemId,
            'borrower' => $payload['beneficiary'] ?? 'Unknown borrower',
            'qty_borrowed' => $payload['quantity'],
            'qty_returned' => 0,
            'unit' => $item->unit,
            'date_borrowed' => $payload['stock_date'],
            'expected_return_date' => $payload['expected_return_date'] ?? $payload['stock_date'],
            'status' => 'Borrowed',
            'release_reference_no' => $payload['reference_no'],
            'notes' => $payload['notes'] ?? null,
            'created_by' => $this->resolveUserId($payload['user_id'] ?? null, $payload['user_name'] ?? null),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return DB::table('borrowed_materials')
            ->leftJoin('inventory_items', 'inventory_items.id', '=', 'borrowed_materials.inventory_item_id')
            ->selectRaw('borrowed_materials.*, inventory_items.material_id as material_code, inventory_items.item_name as material_name')
            ->where('borrowed_materials.id', $id)
            ->first();
    }

    private function recordCreditTransaction(int $itemId, object $item, array $payload): ?object
    {
        if (! Schema::hasTable('credit_transactions')) {
            return null;
        }

        $amount = (float) $payload['quantity'] * (float) $payload['unit_cost'];
        $materialName = $item->item_name ?? $item->name ?? 'Inventory item';
        $creditNo = 'CR-'.str_replace('-', '', $payload['stock_date']).'-'.$itemId.'-'.now()->format('His');
        $beneficiaryName = $payload['beneficiary'] ?? 'Unknown beneficiary';

        $id = DB::table('credit_transactions')->insertGetId([
            'credit_no' => $creditNo,
            'release_reference_no' => $payload['reference_no'],
            'inventory_item_id' => $itemId,
            'beneficiary_name' => $beneficiaryName,
            'beneficiary_account_id' => $this->beneficiaryAccountId($beneficiaryName),
            'material_name' => $materialName,
            'quantity' => $payload['quantity'],
            'unit' => $item->unit,
            'unit_cost' => $payload['unit_cost'],
            'amount' => $amount,
            'remaining_balance' => $amount,
            'status' => 'Pending',
            'credit_date' => $payload['stock_date'],
            'notes' => $payload['notes'] ?? null,
            'created_by' => $this->resolveUserId($payload['user_id'] ?? null, $payload['user_name'] ?? null),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return DB::table('credit_transactions')->where('id', $id)->first();
    }

    private function beneficiaryAccountId(string $name): string
    {
        $normalized = strtoupper(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $name), '-'));
        return $normalized !== '' ? "BEN-{$normalized}" : '';
    }

    private function recordAdjustmentTransaction(int $itemId, object $item, array $payload, float $previousBalance, float $correctedQuantity): void
    {
        $userId = $this->resolveUserId($payload['user_id'] ?? null, $payload['user_name'] ?? null);
        $difference = $correctedQuantity - $previousBalance;
        $direction = $difference > 0 ? 'Increase' : 'Decrease';
        $reason = "{$direction} adjustment. System quantity: {$previousBalance} {$item->unit}. Corrected quantity: {$correctedQuantity} {$item->unit}. Reason: {$payload['reason']}";

        if (Schema::hasTable('stock_transactions')) {
            DB::table('stock_transactions')->insert([
                'reference_no' => $payload['reference_no'],
                'item_id' => $itemId,
                'txn_type' => 'Adjustment',
                'quantity' => abs($difference),
                'unit_cost' => $item->unit_cost ?? 0,
                'supplier_name' => null,
                'reason' => $reason,
                'recorded_by' => $userId,
                'txn_at' => $payload['stock_date'],
            ]);
            return;
        }

        if (! Schema::hasTable('inventory_transactions')) {
            return;
        }

        DB::table('inventory_transactions')->insert([
            'reference_no' => $payload['reference_no'],
            'inventory_item_id' => $itemId,
            'transaction_type' => 'Adjustment',
            'quantity' => abs($difference),
            'unit_cost' => $item->unit_cost ?? 0,
            'reason' => $reason,
            'transaction_at' => $payload['stock_date'],
            'created_by' => $userId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function findItem(int $id): object
    {
        $query = DB::table('inventory_items');

        $select = [
            'inventory_items.id',
            DB::raw($this->codeColumn().' as code'),
            DB::raw($this->nameColumn().' as name'),
            'inventory_items.unit',
            'inventory_items.on_hand',
            'inventory_items.unit_cost',
            'inventory_items.stock_date',
            'inventory_items.expiry_date',
            DB::raw($this->activeColumn().' as active'),
            'inventory_items.created_at',
            'inventory_items.updated_at',
        ];

        if (Schema::hasColumn('inventory_items', 'category_id') && Schema::hasTable('inventory_categories')) {
            $query->leftJoin('inventory_categories', 'inventory_categories.id', '=', 'inventory_items.category_id');
            $select[] = DB::raw('inventory_categories.label as category');
        } elseif (Schema::hasColumn('inventory_items', 'category')) {
            $select[] = 'inventory_items.category';
        } else {
            $select[] = DB::raw("'' as category");
        }

        if (Schema::hasColumn('inventory_items', 'minimum_stock')) {
            $select[] = 'inventory_items.minimum_stock';
        }

        if (Schema::hasColumn('inventory_items', 'supplier')) {
            $select[] = 'inventory_items.supplier';
        }

        return $query->select($select)->where('inventory_items.id', $id)->first();
    }

    private function codeColumn(): string
    {
        return Schema::hasColumn('inventory_items', 'material_id') ? 'material_id' : 'item_code';
    }

    private function nameColumn(): string
    {
        return Schema::hasColumn('inventory_items', 'item_name') ? 'item_name' : 'name';
    }

    private function activeColumn(): string
    {
        return Schema::hasColumn('inventory_items', 'is_active') ? 'is_active' : 'active';
    }

    private function categoryId(string $category): ?int
    {
        if (! Schema::hasTable('inventory_categories')) {
            return null;
        }

        $normalized = strtolower(trim($category));
        $aliases = [
            'fertilizers and soil inputs' => 'FERT',
            'fertilizers & soil inputs' => 'FERT',
            'chemicals and crop protection materials' => 'CHEM',
            'chemicals & crop protection' => 'CHEM',
            'farm materials' => 'FARM',
            'packaging materials' => 'PACK',
            'other supplies' => 'SUPP',
            'general supplies' => 'SUPP',
        ];

        $code = $aliases[$normalized] ?? null;

        $query = DB::table('inventory_categories');
        if ($code) {
            $id = (clone $query)->where('code', $code)->value('id');
            if ($id) {
                return $id;
            }
        }

        $id = $query
            ->whereRaw('lower(label) = ?', [$normalized])
            ->orWhereRaw('lower(code) = ?', [$normalized])
            ->value('id');

        if ($id) {
            return (int) $id;
        }

        $values = [];
        if (Schema::hasColumn('inventory_categories', 'code')) {
            $values['code'] = $code ?? strtoupper(substr(preg_replace('/[^A-Za-z0-9]+/', '', $category), 0, 8)) ?: 'GEN';
        }
        if (Schema::hasColumn('inventory_categories', 'label')) {
            $values['label'] = $category;
        } elseif (Schema::hasColumn('inventory_categories', 'name')) {
            $values['name'] = $category;
        }
        if (Schema::hasColumn('inventory_categories', 'created_at')) {
            $values['created_at'] = now();
        }
        if (Schema::hasColumn('inventory_categories', 'updated_at')) {
            $values['updated_at'] = now();
        }

        if (empty($values)) {
            return null;
        }

        return (int) DB::table('inventory_categories')->insertGetId($values);
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

    private function recordAudit(?int $userId, ?string $userName, string $action, string $description): void
    {
        if (! Schema::hasTable('audit_logs')) {
            return;
        }

        $userId ??= DB::table('users')->value('id');

        $values = [
            'module' => 'Inventory',
            'action' => $action,
        ];

        if (Schema::hasColumn('audit_logs', 'user_id')) {
            $values['user_id'] = $userId;
        }

        if (Schema::hasColumn('audit_logs', 'user_name')) {
            $values['user_name'] = $userName;
        }

        if (Schema::hasColumn('audit_logs', 'description')) {
            $values['description'] = $description;
        }

        if (Schema::hasColumn('audit_logs', 'details')) {
            $values['details'] = $description;
        }

        if (Schema::hasColumn('audit_logs', 'status')) {
            $values['status'] = 'Completed';
        }

        if (Schema::hasColumn('audit_logs', 'logged_at')) {
            $values['logged_at'] = now();
        }

        if (Schema::hasColumn('audit_logs', 'created_at')) {
            $values['created_at'] = now();
        }

        if (Schema::hasColumn('audit_logs', 'updated_at')) {
            $values['updated_at'] = now();
        }

        DB::table('audit_logs')->insert($values);
    }
}
