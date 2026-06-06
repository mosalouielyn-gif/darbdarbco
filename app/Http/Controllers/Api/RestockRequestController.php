<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class RestockRequestController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $payload = $this->validatedPayload($request);
        $requestNo = 'RR-'.now()->format('YmdHis');

        $id = DB::table('restock_requests')->insertGetId($this->values($payload, $requestNo, true));
        $record = $this->findRequest($id);

        $this->recordAudit($payload['user_id'] ?? null, $payload['user_name'] ?? null, 'Created', "Created restock request {$requestNo}");

        return response()->json($record, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $current = DB::table('restock_requests')->where('id', $id)->first();
        abort_if(! $current, 404, 'Restock request not found.');
        abort_if(($current->status ?? '') !== 'Pending', 422, 'Only pending restock requests can be edited.');

        $payload = $this->validatedPayload($request);
        DB::table('restock_requests')->where('id', $id)->update($this->values($payload, $current->request_no ?? null, false));

        $record = $this->findRequest($id);
        $this->recordAudit($payload['user_id'] ?? null, $payload['user_name'] ?? null, 'Updated', "Updated restock request {$record->request_no}");

        return response()->json($record);
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        $payload = $request->validate([
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
        ]);
        $payload['review_notes'] = 'Cancelled by requester.';

        return response()->json($this->setStatus($id, 'Cancelled', $payload, 'Cancelled'));
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $payload = $request->validate([
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
            'review_notes' => ['nullable', 'string'],
        ]);

        return response()->json($this->setStatus($id, 'Approved', $payload, 'Approved'));
    }

    public function return(Request $request, int $id): JsonResponse
    {
        $payload = $request->validate([
            'reason' => ['required', 'string'],
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
        ]);

        $payload['review_notes'] = $payload['reason'];

        return response()->json($this->setStatus($id, 'Rejected', $payload, 'Returned'));
    }

    private function validatedPayload(Request $request): array
    {
        $payload = $request->validate([
            'item_id' => ['nullable', 'integer'],
            'material_name' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'current_quantity' => ['nullable', 'numeric', 'min:0'],
            'minimum_stock' => ['nullable', 'numeric', 'min:0'],
            'requested_quantity' => ['required', 'numeric', 'min:0.01'],
            'priority' => ['nullable', 'string', 'max:50'],
            'reason' => ['required', 'string'],
            'notes' => ['nullable', 'string'],
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
        ]);

        abort_if(empty($payload['item_id']) && empty($payload['material_name']), 422, 'Please select an inventory item.');

        return $payload;
    }

    private function values(array $payload, ?string $requestNo, bool $creating): array
    {
        $values = [
            'status' => 'Pending',
        ];

        if (Schema::hasColumn('restock_requests', 'updated_at')) $values['updated_at'] = now();
        if ($requestNo && Schema::hasColumn('restock_requests', 'request_no')) $values['request_no'] = $requestNo;
        if (Schema::hasColumn('restock_requests', 'item_id')) $values['item_id'] = $payload['item_id'] ?? null;
        if (Schema::hasColumn('restock_requests', 'material_name')) $values['material_name'] = $payload['material_name'] ?? null;
        if (Schema::hasColumn('restock_requests', 'category')) $values['category'] = $payload['category'] ?? null;
        if (Schema::hasColumn('restock_requests', 'current_quantity')) $values['current_quantity'] = $payload['current_quantity'] ?? 0;
        if (Schema::hasColumn('restock_requests', 'minimum_stock')) $values['minimum_stock'] = $payload['minimum_stock'] ?? 0;
        if (Schema::hasColumn('restock_requests', 'requested_quantity')) $values['requested_quantity'] = $payload['requested_quantity'];
        if (Schema::hasColumn('restock_requests', 'quantity')) $values['quantity'] = $payload['requested_quantity'];
        if (Schema::hasColumn('restock_requests', 'priority')) $values['priority'] = strtolower($payload['priority'] ?? 'normal');
        if (Schema::hasColumn('restock_requests', 'reason')) $values['reason'] = $payload['reason'];
        if (Schema::hasColumn('restock_requests', 'notes')) $values['notes'] = $payload['notes'] ?? null;

        if ($creating) {
            if (Schema::hasColumn('restock_requests', 'requested_by')) $values['requested_by'] = $this->resolveUserId($payload['user_id'] ?? null, $payload['user_name'] ?? null);
            if (Schema::hasColumn('restock_requests', 'requested_at')) $values['requested_at'] = now();
            if (Schema::hasColumn('restock_requests', 'created_at')) $values['created_at'] = now();
        }

        return $values;
    }

    private function setStatus(int $id, string $status, array $payload, string $action): object
    {
        return DB::transaction(function () use ($id, $status, $payload, $action) {
            $current = DB::table('restock_requests')->where('id', $id)->lockForUpdate()->first();
            abort_if(! $current, 404, 'Restock request not found.');
            abort_if(($current->status ?? '') !== 'Pending', 422, 'Only pending restock requests can be updated.');

            $approvedStockBalance = $status === 'Approved'
                ? $this->applyApprovedRestock($current, $payload)
                : null;

            $values = ['status' => $status];
            if (Schema::hasColumn('restock_requests', 'updated_at')) $values['updated_at'] = now();
            if (Schema::hasColumn('restock_requests', 'reviewed_by')) $values['reviewed_by'] = $this->resolveUserId($payload['user_id'] ?? null, $payload['user_name'] ?? null);
            if (Schema::hasColumn('restock_requests', 'reviewed_at')) $values['reviewed_at'] = now();
            if (Schema::hasColumn('restock_requests', 'review_notes')) $values['review_notes'] = $payload['review_notes'] ?? null;
            if ($approvedStockBalance !== null && Schema::hasColumn('restock_requests', 'current_quantity')) {
                $values['current_quantity'] = $approvedStockBalance;
            }

            DB::table('restock_requests')->where('id', $id)->update($values);
            $record = $this->findRequest($id);
            $this->recordAudit($payload['user_id'] ?? null, $payload['user_name'] ?? null, $action, "{$action} restock request {$record->request_no}");

            return $record;
        });
    }

    private function applyApprovedRestock(object $request, array $payload): float
    {
        if (! Schema::hasTable('inventory_items')) {
            return (float) ($request->current_quantity ?? 0);
        }

        $itemId = $this->restockItemId($request);
        abort_if(! $itemId, 422, 'Approved restock request is not linked to an inventory item.');

        $item = DB::table('inventory_items')->where('id', $itemId)->lockForUpdate()->first();
        abort_if(! $item, 404, 'Linked inventory item was not found.');

        $quantity = (float) ($request->requested_quantity ?? $request->quantity ?? 0);
        abort_if($quantity <= 0, 422, 'Requested quantity must be greater than zero.');

        $previousBalance = (float) ($item->on_hand ?? 0);
        $updatedBalance = $previousBalance + $quantity;
        $values = ['on_hand' => $updatedBalance];

        if (Schema::hasColumn('inventory_items', 'stock_date')) {
            $values['stock_date'] = now()->toDateString();
        }
        if (Schema::hasColumn('inventory_items', 'updated_at')) {
            $values['updated_at'] = now();
        }

        DB::table('inventory_items')->where('id', $itemId)->update($values);
        $this->recordRestockStockIn($itemId, $request, $item, $payload, $quantity, $previousBalance, $updatedBalance);

        return $updatedBalance;
    }

    private function restockItemId(object $request): ?int
    {
        foreach (['item_id', 'inventory_item_id'] as $column) {
            if (isset($request->{$column}) && $request->{$column}) {
                return (int) $request->{$column};
            }
        }

        $material = trim((string) ($request->material_name ?? ''));
        if ($material === '') {
            return null;
        }

        $nameColumn = Schema::hasColumn('inventory_items', 'item_name') ? 'item_name' : 'name';

        return DB::table('inventory_items')
            ->where($nameColumn, $material)
            ->value('id');
    }

    private function recordRestockStockIn(int $itemId, object $request, object $item, array $payload, float $quantity, float $previousBalance, float $updatedBalance): void
    {
        $userId = $this->resolveUserId($payload['user_id'] ?? null, $payload['user_name'] ?? null);
        $reference = 'RST-'.($request->request_no ?? $request->id);
        $reason = "Approved restock request {$request->request_no}; stock increased from {$previousBalance} to {$updatedBalance}.";

        if (Schema::hasTable('stock_transactions')) {
            $values = [
                'reference_no' => $reference,
                'item_id' => $itemId,
                'txn_type' => 'Stock In',
                'quantity' => $quantity,
                'unit_cost' => $item->unit_cost ?? 0,
                'supplier_name' => $item->supplier ?? null,
                'reason' => $reason,
                'recorded_by' => $userId,
                'txn_at' => now(),
            ];

            DB::table('stock_transactions')->insert($values);
            return;
        }

        if (! Schema::hasTable('inventory_transactions')) {
            return;
        }

        $values = [
            'reference_no' => $reference,
            'inventory_item_id' => $itemId,
            'transaction_type' => 'Stock In',
            'quantity' => $quantity,
            'unit_cost' => $item->unit_cost ?? 0,
            'reason' => $reason,
            'transaction_at' => now(),
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

    private function findRequest(int $id): object
    {
        $query = DB::table('restock_requests');

        if (Schema::hasColumn('restock_requests', 'item_id') && Schema::hasTable('inventory_items')) {
            $itemName = Schema::hasColumn('inventory_items', 'item_name') ? 'item_name' : 'name';
            $categoryName = Schema::hasTable('inventory_categories') && Schema::hasColumn('inventory_categories', 'label')
                ? 'inventory_categories.label'
                : 'null';

            $query
                ->leftJoin('inventory_items', 'inventory_items.id', '=', 'restock_requests.item_id')
                ->when(Schema::hasTable('inventory_categories') && Schema::hasColumn('inventory_items', 'category_id'), function ($query) {
                    $query->leftJoin('inventory_categories', 'inventory_categories.id', '=', 'inventory_items.category_id');
                })
                ->selectRaw("restock_requests.*, inventory_items.$itemName as material_name, inventory_items.on_hand as current_quantity, $categoryName as category");
        }

        return $query->where('restock_requests.id', $id)->first();
    }

    private function recordAudit(?int $userId, ?string $userName, string $action, string $description): void
    {
        if (! Schema::hasTable('audit_logs')) return;

        $userId = $this->resolveUserId($userId, $userName);
        $values = ['module' => 'Inventory', 'action' => $action];

        if (Schema::hasColumn('audit_logs', 'id')) {
            $maxId = (int) DB::table('audit_logs')->max('id');
            $values['id'] = $maxId + 1;
        }

        if (Schema::hasColumn('audit_logs', 'user_id')) $values['user_id'] = $userId;
        if (Schema::hasColumn('audit_logs', 'user_name')) $values['user_name'] = $userName;
        if (Schema::hasColumn('audit_logs', 'details')) $values['details'] = $description;
        if (Schema::hasColumn('audit_logs', 'description')) $values['description'] = $description;
        if (Schema::hasColumn('audit_logs', 'status')) $values['status'] = 'Completed';
        if (Schema::hasColumn('audit_logs', 'created_at')) $values['created_at'] = now();
        if (Schema::hasColumn('audit_logs', 'updated_at')) $values['updated_at'] = now();
        if (Schema::hasColumn('audit_logs', 'logged_at')) $values['logged_at'] = now();

        try {
            DB::table('audit_logs')->insert($values);
        } catch (\Throwable) {
            // Audit logging should never block restock request saves.
        }
    }

    private function resolveUserId(?int $userId, ?string $userName): ?int
    {
        if (! Schema::hasTable('users')) {
            return null;
        }

        if ($userId && DB::table('users')->where('id', $userId)->exists()) {
            return $userId;
        }

        if ($userName) {
            $nameColumn = Schema::hasColumn('users', 'full_name') ? 'full_name' : (Schema::hasColumn('users', 'name') ? 'name' : null);
            if ($nameColumn) {
                $matched = DB::table('users')->where($nameColumn, $userName)->value('id');
                if ($matched) return (int) $matched;
            }
        }

        return DB::table('users')->value('id');
    }
}
