<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AppDataController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $role = (string) $request->attributes->get('authenticated_role', '');
        $requestedRole = (string) $request->query('role', '');

        abort_if($role === '', 403, 'The authenticated role could not be verified.');
        abort_if($requestedRole !== '' && $requestedRole !== $role, 403, 'Requested application data is outside your assigned role.');

        $payload = $this->emptyPayload();

        switch ($role) {
            case 'production_clerk':
                $payload['beneficiaries'] = $this->beneficiaries();
                $payload['harvesters'] = $this->harvesters();
                $payload['harvestRecords'] = $this->harvestRecords();
                $payload['productionRecords'] = $this->productionRecords();
                break;

            case 'inventory_bookkeeper':
                $payload['beneficiaries'] = $this->beneficiaries();
                $payload['harvestRecords'] = $this->harvestRecords();
                $payload['productionRecords'] = $this->productionRecords();
                $payload['inventoryItems'] = $this->inventoryItems();
                $payload['stockTransactions'] = $this->stockTransactions();
                $payload['salesReceipts'] = $this->salesReceipts();
                $payload['borrowedMaterials'] = $this->borrowedMaterials();
                $payload['creditTransactions'] = $this->creditTransactions();
                $payload['restockRequests'] = $this->restockRequests();
                break;

            case 'payroll_personnel':
                $payload['beneficiaries'] = $this->beneficiaries();
                $payload['productionRecords'] = $this->productionRecords();
                $payload['creditTransactions'] = $this->creditTransactions(forPayroll: true);
                $payload['payrollSlips'] = $this->payrollSlips();
                break;

            case 'finance_officer':
                $payload['payrollSlips'] = $this->payrollSlips(includeDrafts: false);
                $payload['auditLogs'] = $this->auditLogs();
                break;

            case 'manager_admin':
                $payload['beneficiaries'] = $this->beneficiaries();
                $payload['harvesters'] = $this->harvesters();
                $payload['inventoryItems'] = $this->inventoryItems();
                $payload['productionRecords'] = $this->productionRecords();
                $payload['restockRequests'] = $this->restockRequests();
                $payload['payrollSlips'] = $this->payrollSlips();
                $payload['auditLogs'] = $this->auditLogs();
                $payload['users'] = $this->users();
                $payload['rolePermissions'] = $this->rolePermissions();
                break;

            default:
                $payload = [
                    'beneficiaries' => $this->beneficiaries(),
                    'harvestRecords' => $this->harvestRecords(),
                    'productionRecords' => $this->productionRecords(),
                    'dailyBoxes' => $this->dailyBoxes(),
                    'inventoryItems' => $this->inventoryItems(),
                    'stockTransactions' => $this->stockTransactions(),
                    'borrowedMaterials' => $this->borrowedMaterials(),
                    'creditTransactions' => $this->creditTransactions(),
                    'restockRequests' => $this->restockRequests(),
                    'payrollSlips' => $this->payrollSlips(),
                    'auditLogs' => $this->auditLogs(),
                    'users' => $this->users(),
                    'harvesters' => $this->harvesters(),
                    'rolePermissions' => $this->rolePermissions(),
                ];
                break;
        }

        return response()->json($payload);
    }

    private function emptyPayload(): array
    {
        return [
            'beneficiaries' => [],
            'harvestRecords' => [],
            'productionRecords' => [],
            'dailyBoxes' => [],
            'inventoryItems' => [],
            'stockTransactions' => [],
            'salesReceipts' => [],
            'borrowedMaterials' => [],
            'creditTransactions' => [],
            'restockRequests' => [],
            'payrollSlips' => [],
            'auditLogs' => [],
            'users' => [],
            'harvesters' => [],
            'rolePermissions' => [],
        ];
    }

    private function harvestRecords(): array
    {
        if (! Schema::hasTable('harvest_records')) {
            return [];
        }

        return DB::table('harvest_records')
            ->select([
                'id',
                'harvest_date',
                'beneficiary_id',
                'beneficiary_name',
                'harvester_name',
                'buligs_11_weeks',
                'buligs_12_weeks',
                'buligs_13_weeks',
                'buligs_14_weeks',
                'total_buligs',
                'created_by',
                'created_at',
                'updated_at',
            ])
            ->orderByDesc('harvest_date')
            ->orderByDesc('id')
            ->limit(200)
            ->get()
            ->all();
    }

    private function beneficiaries(): array
    {
        if (! Schema::hasTable('beneficiaries')) {
            return [];
        }

        $nameColumn = Schema::hasColumn('beneficiaries', 'full_name') ? 'full_name' : 'name';
        $codeColumn = Schema::hasColumn('beneficiaries', 'code') ? 'code' : 'beneficiary_code';
        $columns = [
            'id',
            DB::raw("$codeColumn as code"),
            DB::raw("$nameColumn as name"),
        ];

        if (Schema::hasColumn('beneficiaries', 'created_at')) {
            $columns[] = 'created_at';
        } else {
            $columns[] = DB::raw('null as created_at');
        }

        if (Schema::hasColumn('beneficiaries', 'updated_at')) {
            $columns[] = 'updated_at';
        } else {
            $columns[] = DB::raw('null as updated_at');
        }

        if (Schema::hasColumn('beneficiaries', 'is_active')) {
            $columns[] = DB::raw('is_active as active');
        } elseif (Schema::hasColumn('beneficiaries', 'active')) {
            $columns[] = 'active';
        } else {
            $columns[] = DB::raw('1 as active');
        }

        $contactColumn = $this->beneficiaryContactColumn();
        if ($contactColumn) {
            $columns[] = DB::raw("$contactColumn as contact_number");
        }
        if (Schema::hasColumn('beneficiaries', 'address')) {
            $columns[] = 'address';
        }

        return DB::table('beneficiaries')
            ->select($columns)
            ->orderBy($nameColumn)
            ->limit(200)
            ->get()
            ->all();
    }

    private function productionRecords(): array
    {
        if (Schema::hasTable('production_records')) {
            $records = DB::table('production_records')
                ->leftJoin('beneficiaries', 'beneficiaries.id', '=', 'production_records.beneficiary_id')
                ->selectRaw("'production_records' as source_table, production_records.id, production_records.record_no, production_records.beneficiary_id, production_records.harvest_date, production_records.packing_date, beneficiaries.full_name as beneficiary_name, production_records.harvester_name, production_records.buligs_11w, production_records.buligs_12w, production_records.buligs_13w, production_records.buligs_14w, production_records.buligs_total, production_records.class_a_big_hands, production_records.class_a_small_hands, production_records.class_a_cps, production_records.class_b_big_hands, production_records.class_b_small_hands, production_records.class_b_cps, production_records.special_total")
                ->orderByDesc('production_records.packing_date')
                ->limit(100)
                ->get()
                ->all();

            if (count($records) > 0) {
                return $records;
            }
        }

        if (! Schema::hasTable('production_box_records')) {
            return [];
        }

        return DB::table('production_box_records')
            ->selectRaw("'production_box_records' as source_table, id, record_no, beneficiary_id, beneficiary_name, production_date as harvest_date, production_date as packing_date, class_a_big_hands, class_a_small_hands, class_a_cps, class_b_big_hands, class_b_small_hands, class_b_cps, special_product as special_total")
            ->orderByDesc('production_date')
            ->limit(100)
            ->get()
            ->all();
    }

    private function beneficiaryContactColumn(): ?string
    {
        if (! Schema::hasTable('beneficiaries')) {
            return null;
        }

        foreach (['contact_number', 'contact_no', 'contact', 'phone', 'mobile_number'] as $column) {
            if (Schema::hasColumn('beneficiaries', $column)) {
                return $column;
            }
        }

        return null;
    }

    private function beneficiaryContactSelect(): string
    {
        $column = $this->beneficiaryContactColumn();

        return $column ? "beneficiaries.$column" : 'null';
    }

    private function dailyBoxes(): array
    {
        if (! Schema::hasTable('daily_boxes')) {
            return [];
        }

        return DB::table('daily_boxes')
            ->orderByDesc('packing_date')
            ->limit(60)
            ->get()
            ->all();
    }

    private function inventoryItems(): array
    {
        if (! Schema::hasTable('inventory_items')) {
            return [];
        }

        if (Schema::hasColumn('inventory_items', 'item_name')) {
            $minimumStockSelect = Schema::hasColumn('inventory_items', 'minimum_stock')
                ? 'inventory_items.minimum_stock'
                : '0 as minimum_stock';

            return DB::table('inventory_items')
                ->leftJoin('inventory_categories', 'inventory_categories.id', '=', 'inventory_items.category_id')
                ->selectRaw("inventory_items.id, inventory_items.material_id as code, inventory_items.item_name as name, inventory_categories.label as category, inventory_items.unit, inventory_items.on_hand, $minimumStockSelect, inventory_items.unit_cost, inventory_items.supplier, inventory_items.expiry_date, inventory_items.stock_date, inventory_items.is_active as active, inventory_items.created_at, inventory_items.updated_at")
                ->orderBy('inventory_items.item_name')
                ->limit(200)
                ->get()
                ->all();
        }

        $columns = [
            'id',
            DB::raw('item_code as code'),
            'name',
            'category',
            'unit',
            'on_hand',
            'unit_cost',
            'expiry_date',
            'stock_date',
            'active',
            'created_at',
            'updated_at',
        ];

        if (Schema::hasColumn('inventory_items', 'minimum_stock')) {
            $columns[] = 'minimum_stock';
        }

        if (Schema::hasColumn('inventory_items', 'supplier')) {
            $columns[] = 'supplier';
        }

        return DB::table('inventory_items')
            ->select($columns)
            ->orderBy('name')
            ->limit(200)
            ->get()
            ->all();
    }

    private function stockTransactions(): array
    {
        if (Schema::hasTable('stock_transactions')) {
            $itemNameColumn = Schema::hasColumn('inventory_items', 'item_name') ? 'item_name' : 'name';
            $beneficiaryNameColumn = Schema::hasColumn('beneficiaries', 'full_name') ? 'full_name' : 'name';
            $categorySelect = 'null';
            $receiptNumberSelect = Schema::hasColumn('stock_transactions', 'receipt_no')
                ? 'stock_transactions.receipt_no'
                : 'null';

            if (Schema::hasTable('inventory_categories') && Schema::hasColumn('inventory_items', 'category_id')) {
                $categorySelect = 'inventory_categories.label';
            } elseif (Schema::hasColumn('inventory_items', 'category')) {
                $categorySelect = 'inventory_items.category';
            }

            $beneficiarySelect = Schema::hasColumn('stock_transactions', 'beneficiary_name')
                ? "coalesce(stock_transactions.beneficiary_name, beneficiaries.{$beneficiaryNameColumn})"
                : "beneficiaries.{$beneficiaryNameColumn}";

            return DB::table('stock_transactions')
                ->leftJoin('inventory_items', 'inventory_items.id', '=', 'stock_transactions.item_id')
                ->leftJoin('beneficiaries', 'beneficiaries.id', '=', 'stock_transactions.beneficiary_id')
                ->when(Schema::hasTable('inventory_categories') && Schema::hasColumn('inventory_items', 'category_id'), function ($query) {
                    $query->leftJoin('inventory_categories', 'inventory_categories.id', '=', 'inventory_items.category_id');
                })
                ->selectRaw("stock_transactions.id, stock_transactions.reference_no, $receiptNumberSelect as receipt_no, stock_transactions.txn_type as type, inventory_items.$itemNameColumn as material, stock_transactions.quantity, stock_transactions.unit_cost, inventory_items.unit, stock_transactions.reason, $beneficiarySelect as beneficiary_name, $categorySelect as category, stock_transactions.txn_at")
                ->orderByDesc('stock_transactions.txn_at')
                ->limit(150)
                ->get()
                ->all();
        }

        if (! Schema::hasTable('inventory_transactions')) {
            return [];
        }

        return DB::table('inventory_transactions')
            ->leftJoin('inventory_items', 'inventory_items.id', '=', 'inventory_transactions.inventory_item_id')
            ->selectRaw('inventory_transactions.id, inventory_transactions.reference_no, inventory_transactions.transaction_type as type, inventory_transactions.quantity, inventory_transactions.unit_cost, inventory_transactions.beneficiary_name, inventory_transactions.reason, inventory_transactions.transaction_at, inventory_items.name as material, inventory_items.category, inventory_items.unit')
            ->orderByDesc('inventory_transactions.transaction_at')
            ->limit(150)
            ->get()
            ->all();
    }

    private function salesReceipts(): array
    {
        if (! Schema::hasTable('sales_receipts') || ! Schema::hasTable('sales_receipt_items')) {
            return [];
        }

        $userName = Schema::hasColumn('users', 'full_name') ? 'users.full_name' : 'users.name';
        $beneficiaryCode = Schema::hasColumn('beneficiaries', 'code') ? 'beneficiaries.code' : 'beneficiaries.beneficiary_code';
        $receipts = DB::table('sales_receipts')
            ->leftJoin('users', 'users.id', '=', 'sales_receipts.created_by')
            ->leftJoin('beneficiaries', 'beneficiaries.id', '=', 'sales_receipts.beneficiary_id')
            ->selectRaw("sales_receipts.*, $userName as processed_by, $beneficiaryCode as beneficiary_code")
            ->orderByDesc('sales_receipts.transaction_at')
            ->orderByDesc('sales_receipts.id')
            ->limit(150)
            ->get();

        if ($receipts->isEmpty()) {
            return [];
        }

        $items = DB::table('sales_receipt_items')
            ->whereIn('sales_receipt_id', $receipts->pluck('id'))
            ->orderBy('id')
            ->get()
            ->groupBy('sales_receipt_id');

        foreach ($receipts as $receipt) {
            $receipt->payment_method = (float) $receipt->credit_amount > 0 ? 'Beneficiary Credit' : 'Cash';
            $receipt->items = ($items[$receipt->id] ?? collect())->values()->all();
        }

        return $receipts->all();
    }

    private function restockRequests(): array
    {
        if (! Schema::hasTable('restock_requests')) {
            return [];
        }

        $query = DB::table('restock_requests')->select('restock_requests.*');

        if (Schema::hasTable('users')) {
            $userNameColumn = Schema::hasColumn('users', 'full_name') ? 'full_name' : 'name';

            if (Schema::hasColumn('restock_requests', 'requested_by')) {
                $query
                    ->leftJoin('users as requested_user', 'requested_user.id', '=', 'restock_requests.requested_by')
                    ->addSelect(DB::raw("requested_user.$userNameColumn as requested_by_name"));
            }

            if (Schema::hasColumn('restock_requests', 'reviewed_by')) {
                $query
                    ->leftJoin('users as reviewed_user', 'reviewed_user.id', '=', 'restock_requests.reviewed_by')
                    ->addSelect(DB::raw("reviewed_user.$userNameColumn as reviewed_by_name"));
            }
        }

        if (Schema::hasTable('inventory_items')) {
            $itemForeignKey = Schema::hasColumn('restock_requests', 'item_id')
                ? 'item_id'
                : (Schema::hasColumn('restock_requests', 'inventory_item_id') ? 'inventory_item_id' : null);
            $itemNameColumn = Schema::hasColumn('inventory_items', 'item_name')
                ? 'item_name'
                : (Schema::hasColumn('inventory_items', 'name') ? 'name' : null);

            if ($itemForeignKey) {
                $query->leftJoin('inventory_items as restock_item', 'restock_item.id', '=', "restock_requests.$itemForeignKey");

                if ($itemNameColumn) {
                    $query->addSelect(DB::raw("restock_item.$itemNameColumn as inventory_item_name"));
                }

                if (Schema::hasColumn('inventory_items', 'on_hand')) {
                    $query->addSelect(DB::raw('restock_item.on_hand as inventory_current_quantity'));
                }

                if (Schema::hasTable('inventory_categories') && Schema::hasColumn('inventory_items', 'category_id') && Schema::hasColumn('inventory_categories', 'label')) {
                    $query
                        ->leftJoin('inventory_categories as restock_category', 'restock_category.id', '=', 'restock_item.category_id')
                        ->addSelect(DB::raw('restock_category.label as inventory_category'));
                }
            }
        }

        $orderColumn = Schema::hasColumn('restock_requests', 'requested_at')
            ? 'requested_at'
            : (Schema::hasColumn('restock_requests', 'created_at') ? 'created_at' : 'id');

        return $this->attachRestockDeliveryDetails($query->orderByDesc("restock_requests.$orderColumn")->get()->all());
    }

    private function attachRestockDeliveryDetails(array $requests): array
    {
        $requestNumbers = [];
        foreach ($requests as $request) {
            $request->quantity_received = $request->quantity_received ?? null;
            $request->delivery_reference = $request->delivery_reference ?? null;
            $request->delivery_notes = $request->delivery_notes ?? null;
            $request->delivery_at = $request->delivery_at ?? null;

            if (($request->status ?? null) === 'Completed') {
                $requestNumber = (string) ($request->request_no ?? $request->id ?? '');
                if ($requestNumber !== '') {
                    $requestNumbers[] = $requestNumber;
                }
            }
        }

        $requestNumbers = array_values(array_unique($requestNumbers));
        if ($requestNumbers === []) {
            return $requests;
        }

        $table = Schema::hasTable('stock_transactions') ? 'stock_transactions' : (Schema::hasTable('inventory_transactions') ? 'inventory_transactions' : null);
        if (! $table || ! Schema::hasColumn($table, 'reason') || ! Schema::hasColumn($table, 'reference_no') || ! Schema::hasColumn($table, 'quantity')) {
            return $requests;
        }

        $typeColumn = Schema::hasColumn($table, 'txn_type') ? 'txn_type' : (Schema::hasColumn($table, 'transaction_type') ? 'transaction_type' : null);
        $dateColumn = Schema::hasColumn($table, 'txn_at') ? 'txn_at' : (Schema::hasColumn($table, 'transaction_at') ? 'transaction_at' : null);
        $transactionsQuery = DB::table($table)
            ->select(['reference_no', 'quantity', 'reason'])
            ->when($dateColumn, fn ($query) => $query->addSelect($dateColumn.' as delivery_at'))
            ->where(function ($query) use ($requestNumbers) {
                foreach ($requestNumbers as $requestNumber) {
                    $query->orWhere('reason', 'like', "Delivered restock request {$requestNumber};%");
                }
            });

        if ($typeColumn) {
            $transactionsQuery->where($typeColumn, 'Stock In');
        }

        $transactionsByRequest = [];
        foreach ($transactionsQuery->get() as $transaction) {
            foreach ($requestNumbers as $requestNumber) {
                $prefix = "Delivered restock request {$requestNumber};";
                if (str_starts_with((string) $transaction->reason, $prefix)) {
                    $transactionsByRequest[$requestNumber] = $transaction;
                    break;
                }
            }
        }

        foreach ($requests as $request) {
            $requestNumber = (string) ($request->request_no ?? $request->id ?? '');
            $transaction = $transactionsByRequest[$requestNumber] ?? null;
            if (! $transaction) {
                continue;
            }

            $request->quantity_received ??= $transaction->quantity;
            $request->delivery_reference = $request->delivery_reference ?: $transaction->reference_no;
            $request->delivery_at ??= $transaction->delivery_at ?? null;

            $reasonText = (string) ($transaction->reason ?? '');
            $notesMarker = ' Notes: ';
            $notesPosition = strpos($reasonText, $notesMarker);
            if (! $request->delivery_notes && $notesPosition !== false) {
                $request->delivery_notes = substr($reasonText, $notesPosition + strlen($notesMarker));
            }
        }

        return $requests;
    }

    private function borrowedMaterials(): array
    {
        if (! Schema::hasTable('borrowed_materials')) {
            return [];
        }

        $nameColumn = Schema::hasColumn('inventory_items', 'item_name') ? 'item_name' : 'name';
        $codeColumn = Schema::hasColumn('inventory_items', 'material_id') ? 'material_id' : 'item_code';

        return DB::table('borrowed_materials')
            ->leftJoin('inventory_items', 'inventory_items.id', '=', 'borrowed_materials.inventory_item_id')
            ->selectRaw("borrowed_materials.*, inventory_items.$codeColumn as material_code, inventory_items.$nameColumn as material_name")
            ->orderByDesc('borrowed_materials.created_at')
            ->limit(150)
            ->get()
            ->all();
    }

    private function creditTransactions(bool $forPayroll = false): array
    {
        if (! Schema::hasTable('credit_transactions')) {
            return [];
        }

        $query = DB::table('credit_transactions')
            ->orderByDesc('credit_date')
            ->orderByDesc('id');

        if ($forPayroll && Schema::hasTable('credit_deductions')) {
            $query->where(function (Builder $query): void {
                $query->where('remaining_balance', '>', 0)
                    ->orWhereExists(function (Builder $deductions): void {
                        $deductions->selectRaw('1')
                            ->from('credit_deductions')
                            ->whereColumn('credit_deductions.credit_transaction_id', 'credit_transactions.id');
                    });
            });
        } else {
            $query->limit(200);
        }

        $credits = $query->get()->all();

        if (! Schema::hasTable('credit_deductions')) {
            return $credits;
        }

        $deductions = DB::table('credit_deductions')
            ->whereIn('credit_transaction_id', collect($credits)->pluck('id')->all())
            ->orderBy('id')
            ->get()
            ->groupBy('credit_transaction_id');

        foreach ($credits as $credit) {
            $credit->deductions = ($deductions[$credit->id] ?? collect())->values()->all();
        }

        return $credits;
    }

    private function payrollSlips(bool $includeDrafts = true): array
    {
        if (! Schema::hasTable('payroll_slips')) {
            return [];
        }

        $joinedBeneficiaryName = Schema::hasColumn('beneficiaries', 'full_name') ? 'beneficiaries.full_name' : 'beneficiaries.name';
        $beneficiaryName = Schema::hasColumn('payroll_slips', 'beneficiary_name')
            ? "COALESCE(NULLIF(payroll_slips.beneficiary_name, ''), $joinedBeneficiaryName)"
            : $joinedBeneficiaryName;
        $userNameColumn = Schema::hasColumn('users', 'full_name') ? 'full_name' : 'name';
        $preparedName = "prepared_user.$userNameColumn";
        $validatedName = "validated_user.$userNameColumn";
        $approvedName = "approved_user.$userNameColumn";
        $returnedName = 'null';
        $beneficiaryCode = Schema::hasColumn('payroll_slips', 'beneficiary_code')
            ? 'payroll_slips.beneficiary_code'
            : (Schema::hasColumn('beneficiaries', 'code') ? 'beneficiaries.code' : 'beneficiaries.beneficiary_code');
        $beneficiaryContact = Schema::hasColumn('payroll_slips', 'beneficiary_contact_number')
            ? 'payroll_slips.beneficiary_contact_number'
            : $this->beneficiaryContactSelect();
        $beneficiaryAddress = Schema::hasColumn('payroll_slips', 'beneficiary_address')
            ? 'payroll_slips.beneficiary_address'
            : (Schema::hasColumn('beneficiaries', 'address') ? 'beneficiaries.address' : 'null');

        $query = DB::table('payroll_slips')
            ->leftJoin('beneficiaries', 'beneficiaries.id', '=', 'payroll_slips.beneficiary_id')
            ->leftJoin('users as prepared_user', 'prepared_user.id', '=', 'payroll_slips.prepared_by')
            ->leftJoin('users as validated_user', 'validated_user.id', '=', 'payroll_slips.validated_by')
            ->leftJoin('users as approved_user', 'approved_user.id', '=', 'payroll_slips.approved_by');

        if (! $includeDrafts) {
            $query->where('payroll_slips.validation_status', '<>', 'Draft');
        }

        if (Schema::hasColumn('payroll_slips', 'returned_by')) {
            $query->leftJoin('users as returned_user', 'returned_user.id', '=', 'payroll_slips.returned_by');
            $returnedName = "returned_user.$userNameColumn";
        }

        $slips = $query
            ->selectRaw("payroll_slips.*, $beneficiaryName as beneficiary_name, $beneficiaryCode as beneficiary_code, $beneficiaryContact as beneficiary_contact_number, $beneficiaryAddress as beneficiary_address, $preparedName as prepared_by_name, $validatedName as validated_by_name, $approvedName as approved_by_name, $returnedName as returned_by_name")
            ->orderByDesc('payroll_slips.id')
            ->limit(100)
            ->get()
            ->all();

        foreach ($slips as $slip) {
            $sources = Schema::hasTable('payroll_slip_production_sources')
                ? DB::table('payroll_slip_production_sources')
                    ->where('payroll_slip_id', $slip->id)
                    ->orderBy('source_table')
                    ->orderBy('source_record_id')
                    ->get(['source_table', 'source_record_id'])
                    ->map(static fn (object $source): array => [
                        'source_table' => (string) $source->source_table,
                        'id' => (int) $source->source_record_id,
                    ])
                    ->all()
                : [];

            if ($sources === []) {
                if (! empty($slip->production_record_id)) {
                    $sources[] = ['source_table' => 'production_records', 'id' => (int) $slip->production_record_id];
                } elseif (! empty($slip->production_box_record_id)) {
                    $sources[] = ['source_table' => 'production_box_records', 'id' => (int) $slip->production_box_record_id];
                }
            }

            $slip->production_sources = $sources;
            $slip->production_reconciliation = $this->payrollProductionReconciliation($slip, $sources);
        }

        if (! Schema::hasTable('payroll_deductions')) {
            return $slips;
        }

        $deductions = DB::table('payroll_deductions')
            ->whereIn('payroll_slip_id', collect($slips)->pluck('id')->all())
            ->orderBy('id')
            ->get()
            ->groupBy('payroll_slip_id');

        foreach ($slips as $slip) {
            $slip->deductions = ($deductions[$slip->id] ?? collect())->values()->all();
        }

        return $slips;
    }

    /**
     * @param array<int, array{source_table: string, id: int}> $sources
     * @return array{status: string, message: string, source_quantities: array{class_a_boxes: int, class_b_boxes: int, special_boxes: int}, source_records: array<int, array<string, mixed>>, financial: array<string, mixed>, errors: array<int, string>}
     */
    private function payrollProductionReconciliation(object $slip, array $sources): array
    {
        $quantities = ['class_a_boxes' => 0, 'class_b_boxes' => 0, 'special_boxes' => 0];
        $sourceRecords = [];
        $errors = [];
        $seen = [];
        $period = $this->payrollProductionPeriodRange((string) ($slip->payroll_period ?? ''));

        if ($sources === []) {
            $errors[] = 'No traceable production source references are recorded for this payroll slip.';
        }
        if ($period === null) {
            $errors[] = 'The payroll period is not valid for source verification.';
        }

        foreach ($sources as $source) {
            $table = $source['source_table'];
            $sourceId = $source['id'];
            $key = $table.':'.$sourceId;
            if (isset($seen[$key])) {
                $errors[] = 'A production source reference is duplicated.';
                continue;
            }
            $seen[$key] = true;

            if (! in_array($table, ['production_records', 'production_box_records'], true)
                || ! Schema::hasTable($table)
                || ! Schema::hasColumn($table, 'beneficiary_id')) {
                $errors[] = 'A referenced production source table is unavailable.';
                continue;
            }

            $record = DB::table($table)->where('id', $sourceId)->first();
            if (! $record) {
                $errors[] = "Production source {$table} #{$sourceId} is missing.";
                continue;
            }

            $productionDate = $table === 'production_records'
                ? ($record->harvest_date ?? $record->packing_date ?? null)
                : ($record->production_date ?? null);
            $productionDate = $productionDate === null ? '' : substr((string) $productionDate, 0, 10);
            $classA = $this->payrollProductionQuantity($table, $record, ['class_a_big_hands', 'class_a_big'])
                + $this->payrollProductionQuantity($table, $record, ['class_a_small_hands', 'class_a_small'])
                + $this->payrollProductionQuantity($table, $record, ['class_a_cps', 'class_a_cp']);
            $classB = $this->payrollProductionQuantity($table, $record, ['class_b_big_hands', 'class_b_big'])
                + $this->payrollProductionQuantity($table, $record, ['class_b_small_hands', 'class_b_small'])
                + $this->payrollProductionQuantity($table, $record, ['class_b_cps', 'class_b_cp']);
            $special = $this->payrollProductionQuantity($table, $record, ['special_total', 'special_product']);
            $recordErrors = [];

            if ((int) $record->beneficiary_id !== (int) $slip->beneficiary_id) {
                $recordErrors[] = 'Beneficiary ID does not match the payroll slip.';
            }
            if ($period === null || $productionDate === '' || $productionDate < $period['start'] || $productionDate > $period['end']) {
                $recordErrors[] = 'Production date is outside the payroll period or unavailable.';
            }

            $quantities['class_a_boxes'] += $classA;
            $quantities['class_b_boxes'] += $classB;
            $quantities['special_boxes'] += $special;
            $sourceRecords[] = [
                'source_table' => $table,
                'id' => $sourceId,
                'record_no' => $record->record_no ?? null,
                'beneficiary_id' => (int) $record->beneficiary_id,
                'production_date' => $productionDate ?: null,
                'class_a_boxes' => $classA,
                'class_b_boxes' => $classB,
                'special_boxes' => $special,
                'matched' => $recordErrors === [],
                'errors' => $recordErrors,
            ];
            array_push($errors, ...$recordErrors);
        }

        if ($period !== null && $this->payrollProductionSourceKeys($slip->beneficiary_id, $period) !== $this->payrollSourceKeys($sources)) {
            $errors[] = 'The payroll slip is missing one or more production source references for this beneficiary and period.';
        }

        $savedSpecial = $slip->special_boxes ?? $slip->special_product_boxes ?? 0;
        if ($quantities['class_a_boxes'] !== (int) ($slip->class_a_boxes ?? 0)
            || $quantities['class_b_boxes'] !== (int) ($slip->class_b_boxes ?? 0)
            || $quantities['special_boxes'] !== (int) $savedSpecial) {
            $errors[] = 'Production source quantities do not match the payroll slip quantities.';
        }

        $financialErrors = [];
        $grossCents = ($quantities['class_a_boxes'] * $this->payrollMoneyToCents($slip->class_a_price ?? 0))
            + ($quantities['class_b_boxes'] * $this->payrollMoneyToCents($slip->class_b_price ?? 0))
            + ($quantities['special_boxes'] * $this->payrollMoneyToCents($slip->special_price ?? 0));
        if ($grossCents !== $this->payrollMoneyToCents($slip->gross_amount ?? $slip->gross_income ?? 0)) {
            $financialErrors[] = 'Source quantities and saved classification rates do not match saved gross income.';
        }

        $creditTransactions = [];
        $creditCents = 0;
        $beneficiaryCodeColumn = Schema::hasColumn('beneficiaries', 'code') ? 'code' : 'beneficiary_code';
        $beneficiaryCode = DB::table('beneficiaries')
            ->where('id', $slip->beneficiary_id)
            ->value($beneficiaryCodeColumn);
        if (is_string($beneficiaryCode) && trim($beneficiaryCode) !== '' && Schema::hasTable('credit_transactions')) {
            $creditTransactions = DB::table('credit_transactions')
                ->where('beneficiary_account_id', trim($beneficiaryCode))
                ->where('remaining_balance', '>', 0)
                ->orderBy('id')
                ->get(['id', 'credit_no', 'credit_date', 'material_name', 'quantity', 'unit', 'unit_cost', 'remaining_balance', 'status'])
                ->map(static fn (object $credit): array => [
                    'id' => (int) $credit->id,
                    'credit_no' => (string) ($credit->credit_no ?? $credit->id),
                    'credit_date' => $credit->credit_date,
                    'material_name' => (string) ($credit->material_name ?? 'Material credit'),
                    'quantity' => (float) ($credit->quantity ?? 0),
                    'unit' => (string) ($credit->unit ?? ''),
                    'unit_cost' => (float) ($credit->unit_cost ?? 0),
                    'remaining_balance' => (float) ($credit->remaining_balance ?? 0),
                    'status' => (string) ($credit->status ?? 'Pending'),
                ])
                ->all();
            $creditCents = array_sum(array_map(fn (array $credit): int => $this->payrollMoneyToCents($credit['remaining_balance']), $creditTransactions));
        }

        $savedCreditCents = $this->payrollMoneyToCents($slip->credit_deduction ?? $slip->material_deduction ?? 0);
        if ($creditCents !== $savedCreditCents
            || (Schema::hasColumn('payroll_slips', 'material_deduction') && $creditCents !== $this->payrollMoneyToCents($slip->material_deduction ?? 0))) {
            $financialErrors[] = 'The full outstanding material credit balance does not match the saved payroll deduction.';
        }

        $otherDeductionsCents = $this->payrollMoneyToCents($slip->other_deductions ?? 0);
        if (Schema::hasTable('payroll_deductions')) {
            $deductionItems = DB::table('payroll_deductions')->where('payroll_slip_id', $slip->id)->get(['amount']);
            if ($deductionItems->isNotEmpty()) {
                $itemTotalCents = $deductionItems->sum(fn (object $item): int => $this->payrollMoneyToCents($item->amount));
                if ($itemTotalCents !== $otherDeductionsCents) {
                    $financialErrors[] = 'Itemized other deductions do not match the saved other deduction total.';
                }
                $otherDeductionsCents = $itemTotalCents;
            }
        }

        $totalDeductionsCents = $creditCents
            + $this->payrollMoneyToCents($slip->previous_balance ?? 0)
            + $this->payrollMoneyToCents($slip->labor_cost ?? 0)
            + $otherDeductionsCents;
        $netCents = $grossCents - $totalDeductionsCents;
        if ($totalDeductionsCents !== $this->payrollMoneyToCents($slip->total_deductions ?? 0)) {
            $financialErrors[] = 'Saved total deductions do not match the deduction breakdown.';
        }
        if ($netCents !== $this->payrollMoneyToCents($slip->net_amount ?? $slip->net_income ?? 0)) {
            $financialErrors[] = 'Saved net income does not equal independently calculated gross income less deductions.';
        }
        array_push($errors, ...$financialErrors);

        return [
            'status' => $errors === [] ? 'matched' : 'mismatch',
            'message' => $errors === [] ? 'Production sources match the payroll beneficiary, period, and quantities.' : implode(' ', array_unique($errors)),
            'source_quantities' => $quantities,
            'source_records' => $sourceRecords,
            'financial' => [
                'status' => $financialErrors === [] ? 'matched' : 'mismatch',
                'message' => $financialErrors === [] ? 'Financial amounts reconcile with current source and credit records.' : implode(' ', array_unique($financialErrors)),
                'calculated_gross_amount' => $this->payrollCentsToMoney($grossCents),
                'outstanding_credit_balance' => $this->payrollCentsToMoney($creditCents),
                'calculated_total_deductions' => $this->payrollCentsToMoney($totalDeductionsCents),
                'calculated_net_amount' => $this->payrollCentsToMoney($netCents),
                'credit_transactions' => $creditTransactions,
                'errors' => $financialErrors,
            ],
            'errors' => array_values(array_unique($errors)),
        ];
    }

    private function payrollMoneyToCents(mixed $amount): int
    {
        return (int) round((float) ($amount ?? 0) * 100);
    }

    private function payrollCentsToMoney(int $cents): string
    {
        return number_format($cents / 100, 2, '.', '');
    }

    /** @param array<int, string> $candidateColumns */
    private function payrollProductionQuantity(string $table, object $record, array $candidateColumns): int
    {
        foreach ($candidateColumns as $column) {
            if (Schema::hasColumn($table, $column)) {
                return max(0, (int) ($record->{$column} ?? 0));
            }
        }

        return 0;
    }

    /** @return array{start: string, end: string}|null */
    private function payrollProductionPeriodRange(string $period): ?array
    {
        if (! preg_match('/^([A-Za-z]+)\s+(\d{1,2})-(\d{1,2}),\s*(\d{4})$/', trim($period), $matches)) {
            return null;
        }

        $month = date_parse("{$matches[1]} 1 {$matches[4]}");
        $year = (int) $matches[4];
        $monthNumber = (int) ($month['month'] ?? 0);
        $startDay = (int) $matches[2];
        $endDay = (int) $matches[3];
        if (($month['error_count'] ?? 0) > 0
            || $monthNumber < 1 || $monthNumber > 12
            || ! checkdate($monthNumber, $startDay, $year)
            || ! checkdate($monthNumber, $endDay, $year)
            || $startDay > $endDay) {
            return null;
        }

        return [
            'start' => sprintf('%04d-%02d-%02d', $year, $monthNumber, $startDay),
            'end' => sprintf('%04d-%02d-%02d', $year, $monthNumber, $endDay),
        ];
    }

    /** @param array{start: string, end: string} $period
     *  @return array<int, string>
     */
    private function payrollProductionSourceKeys(int|string|null $beneficiaryId, array $period): array
    {
        $keys = [];
        foreach (['production_records', 'production_box_records'] as $table) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'beneficiary_id')) {
                continue;
            }

            $query = DB::table($table)->where('beneficiary_id', $beneficiaryId);
            if ($table === 'production_box_records' && Schema::hasColumn($table, 'production_date')) {
                $query->whereBetween('production_date', [$period['start'], $period['end']]);
            } else {
                $hasHarvestDate = Schema::hasColumn($table, 'harvest_date');
                $hasPackingDate = Schema::hasColumn($table, 'packing_date');
                if ($hasHarvestDate && $hasPackingDate) {
                    $query->where(function ($dateQuery) use ($period): void {
                        $dateQuery->whereBetween('harvest_date', [$period['start'], $period['end']])
                            ->orWhere(function ($packingQuery) use ($period): void {
                                $packingQuery->whereNull('harvest_date')
                                    ->whereBetween('packing_date', [$period['start'], $period['end']]);
                            });
                    });
                } elseif ($hasHarvestDate) {
                    $query->whereBetween('harvest_date', [$period['start'], $period['end']]);
                } elseif ($hasPackingDate) {
                    $query->whereBetween('packing_date', [$period['start'], $period['end']]);
                } else {
                    continue;
                }
            }

            foreach ($query->get(['id']) as $record) {
                $keys[] = $table.':'.(int) $record->id;
            }
        }

        sort($keys);

        return $keys;
    }

    /** @param array<int, array{source_table: string, id: int}> $sources
     *  @return array<int, string>
     */
    private function payrollSourceKeys(array $sources): array
    {
        $keys = array_map(static fn (array $source): string => $source['source_table'].':'.$source['id'], $sources);
        sort($keys);

        return $keys;
    }

    private function auditLogs(): array
    {
        if (! Schema::hasTable('audit_logs')) {
            return [];
        }

        if (Schema::hasColumn('audit_logs', 'details')) {
            $userName = Schema::hasColumn('users', 'full_name') ? 'users.full_name' : 'users.name';
            $roleSelect = Schema::hasTable('roles') && Schema::hasColumn('users', 'role_id')
                ? 'roles.code'
                : (Schema::hasColumn('users', 'role') ? 'users.role' : "''");

            return DB::table('audit_logs')
                ->leftJoin('users', 'users.id', '=', 'audit_logs.user_id')
                ->when(Schema::hasTable('roles') && Schema::hasColumn('users', 'role_id'), function ($query) {
                    $query->leftJoin('roles', 'roles.id', '=', 'users.role_id');
                })
                ->selectRaw("audit_logs.id, audit_logs.module, audit_logs.action, audit_logs.details, audit_logs.created_at, $userName as user_name, $roleSelect as role")
                ->orderByDesc('audit_logs.created_at')
                ->limit(100)
                ->get()
                ->all();
        }

        return DB::table('audit_logs')
            ->selectRaw("id, module, action, description as details, logged_at as created_at, user_name, '' as role")
            ->orderByDesc('logged_at')
            ->limit(100)
            ->get()
            ->all();
    }

    private function users(): array
    {
        if (! Schema::hasTable('users')) {
            return [];
        }

        if (Schema::hasColumn('users', 'full_name')) {
            $columns = [
                'users.id',
                DB::raw('users.full_name as name'),
                'users.username',
                'users.email',
                DB::raw('roles.code as role'),
                DB::raw('users.is_active as active'),
                'users.last_login_at',
                'users.created_at',
                'users.updated_at',
            ];

            if (Schema::hasColumn('users', 'contact_information')) {
                $columns[] = 'users.contact_information';
            }

            if (Schema::hasColumn('users', 'remarks')) {
                $columns[] = 'users.remarks';
            }

            return DB::table('users')
                ->leftJoin('roles', 'roles.id', '=', 'users.role_id')
                ->select($columns)
                ->orderBy('users.full_name')
                ->limit(100)
                ->get()
                ->all();
        }

        $columns = [
            'id',
            'name',
            'username',
            'email',
            'role',
            'active',
            'last_login_at',
            'created_at',
            'updated_at',
        ];

        if (Schema::hasColumn('users', 'contact_information')) {
            $columns[] = 'contact_information';
        }

        if (Schema::hasColumn('users', 'remarks')) {
            $columns[] = 'remarks';
        }

        return DB::table('users')
            ->select($columns)
            ->orderBy('name')
            ->limit(100)
            ->get()
            ->all();
    }

    private function harvesters(): array
    {
        $harvesters = collect();

        if (Schema::hasTable('users')) {
            $nameColumn = Schema::hasColumn('users', 'full_name') ? 'full_name' : (Schema::hasColumn('users', 'name') ? 'name' : null);
            $activeColumn = Schema::hasColumn('users', 'is_active') ? 'is_active' : (Schema::hasColumn('users', 'active') ? 'active' : null);

            if ($nameColumn && Schema::hasColumn('users', 'role')) {
                $query = DB::table('users')
                    ->selectRaw("id, $nameColumn as name, email, role")
                    ->where('role', 'harvester');

                if ($activeColumn) {
                    $query->where($activeColumn, true);
                }

                $harvesters = $harvesters->merge($query->orderBy($nameColumn)->get());
            } elseif ($nameColumn && Schema::hasColumn('users', 'role_id') && Schema::hasTable('roles')) {
                $query = DB::table('users')
                    ->leftJoin('roles', 'roles.id', '=', 'users.role_id')
                    ->selectRaw("users.id, users.$nameColumn as name, users.email, roles.code as role")
                    ->where('roles.code', 'harvester');

                if ($activeColumn) {
                    $query->where("users.$activeColumn", true);
                }

                $harvesters = $harvesters->merge($query->orderBy("users.$nameColumn")->get());
            }
        }

        if (Schema::hasTable('harvest_records') && Schema::hasColumn('harvest_records', 'harvester_name')) {
            $existingNames = DB::table('harvest_records')
                ->select('harvester_name')
                ->whereNotNull('harvester_name')
                ->distinct()
                ->orderBy('harvester_name')
                ->limit(200)
                ->get()
                ->map(fn ($row) => (object) [
                    'id' => null,
                    'name' => $row->harvester_name,
                    'email' => null,
                    'role' => 'harvester',
                ]);

            $harvesters = $harvesters->merge($existingNames);
        }

        return $harvesters
            ->filter(fn ($row) => trim((string) ($row->name ?? '')) !== '')
            ->unique(fn ($row) => strtolower(trim((string) $row->name)))
            ->values()
            ->all();
    }

    private function rolePermissions(): array
    {
        if (! Schema::hasTable('role_permissions')) {
            return [];
        }

        return DB::table('role_permissions')
            ->orderBy('role')
            ->orderBy('permission')
            ->get()
            ->all();
    }
}
