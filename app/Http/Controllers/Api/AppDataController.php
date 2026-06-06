<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AppDataController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $role = (string) $request->query('role', '');
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
                $payload['borrowedMaterials'] = $this->borrowedMaterials();
                $payload['creditTransactions'] = $this->creditTransactions();
                $payload['restockRequests'] = $this->restockRequests();
                break;

            case 'payroll_personnel':
                $payload['beneficiaries'] = $this->beneficiaries();
                $payload['productionRecords'] = $this->productionRecords();
                $payload['creditTransactions'] = $this->creditTransactions();
                $payload['payrollSlips'] = $this->payrollSlips();
                break;

            case 'finance_officer':
                $payload['payrollSlips'] = $this->payrollSlips();
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
                ->selectRaw("'production_records' as source_table, production_records.id, production_records.record_no, production_records.beneficiary_id, production_records.harvest_date, production_records.packing_date, beneficiaries.full_name as beneficiary_name, production_records.harvester_name, production_records.buligs_11w, production_records.buligs_12w, production_records.buligs_13w, production_records.buligs_14w, production_records.buligs_total, production_records.class_a_big_hands, production_records.class_a_small_hands, production_records.class_a_cps, production_records.class_b_big_hands, production_records.class_b_small_hands, production_records.class_b_cps, production_records.special_total, production_records.defects_11w, production_records.defects_12w, production_records.defects_13w, production_records.defects_14w, production_records.rejects_11w, production_records.rejects_12w, production_records.rejects_13w, production_records.rejects_14w")
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
            ->selectRaw("'production_box_records' as source_table, id, record_no, beneficiary_id, beneficiary_name, production_date as harvest_date, production_date as packing_date, class_a_big_hands, class_a_small_hands, class_a_cps, class_b_big_hands, class_b_small_hands, class_b_cps, special_product as special_total, defects_11_weeks, defects_12_weeks, defects_13_weeks, defects_14_weeks, rejects_11_weeks, rejects_12_weeks, rejects_13_weeks, rejects_14_weeks")
            ->orderByDesc('production_date')
            ->limit(100)
            ->get()
            ->all();
    }

    private function beneficiaryContactColumn(): ?string
    {
        foreach (['contact_number', 'contact_no', 'contact', 'phone', 'mobile_number'] as $column) {
            if (Schema::hasColumn('beneficiaries', $column)) {
                return $column;
            }
        }

        return null;
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
            $categorySelect = Schema::hasTable('inventory_categories') && Schema::hasColumn('inventory_items', 'category_id')
                ? 'inventory_categories.label'
                : 'null';

            return DB::table('stock_transactions')
                ->leftJoin('inventory_items', 'inventory_items.id', '=', 'stock_transactions.item_id')
                ->leftJoin('beneficiaries', 'beneficiaries.id', '=', 'stock_transactions.beneficiary_id')
                ->when(Schema::hasTable('inventory_categories') && Schema::hasColumn('inventory_items', 'category_id'), function ($query) {
                    $query->leftJoin('inventory_categories', 'inventory_categories.id', '=', 'inventory_items.category_id');
                })
                ->selectRaw("stock_transactions.id, stock_transactions.reference_no, stock_transactions.txn_type as type, inventory_items.item_name as material, stock_transactions.quantity, stock_transactions.unit_cost, inventory_items.unit, stock_transactions.reason, beneficiaries.full_name as beneficiary_name, $categorySelect as category, stock_transactions.txn_at")
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

    private function restockRequests(): array
    {
        if (! Schema::hasTable('restock_requests')) {
            return [];
        }

        $userName = Schema::hasColumn('users', 'full_name') ? 'requested_user.full_name' : 'requested_user.name';
        $itemName = Schema::hasColumn('inventory_items', 'item_name') ? 'item_name' : 'name';
        $categoryName = Schema::hasTable('inventory_categories') && Schema::hasColumn('inventory_categories', 'label')
            ? 'inventory_categories.label'
            : 'null';

        $query = DB::table('restock_requests')
            ->leftJoin('users as requested_user', 'requested_user.id', '=', 'restock_requests.requested_by');

        if (Schema::hasColumn('restock_requests', 'item_id') && Schema::hasTable('inventory_items')) {
            $query
                ->leftJoin('inventory_items', 'inventory_items.id', '=', 'restock_requests.item_id')
                ->when(Schema::hasTable('inventory_categories') && Schema::hasColumn('inventory_items', 'category_id'), function ($query) {
                    $query->leftJoin('inventory_categories', 'inventory_categories.id', '=', 'inventory_items.category_id');
                })
                ->selectRaw("restock_requests.*, inventory_items.$itemName as material_name, inventory_items.on_hand as current_quantity, $categoryName as category, $userName as requested_by_name");
        } else {
            $query->selectRaw("restock_requests.*, $userName as requested_by_name");
        }

        return $query
            ->orderByDesc(Schema::hasColumn('restock_requests', 'requested_at') ? 'requested_at' : 'created_at')
            ->limit(100)
            ->get()
            ->all();
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

    private function creditTransactions(): array
    {
        if (! Schema::hasTable('credit_transactions')) {
            return [];
        }

        $credits = DB::table('credit_transactions')
            ->orderByDesc('credit_date')
            ->orderByDesc('id')
            ->limit(200)
            ->get()
            ->all();

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

    private function payrollSlips(): array
    {
        if (! Schema::hasTable('payroll_slips')) {
            return [];
        }

        $beneficiaryName = Schema::hasColumn('beneficiaries', 'full_name') ? 'beneficiaries.full_name' : 'beneficiaries.name';
        $userNameColumn = Schema::hasColumn('users', 'full_name') ? 'full_name' : 'name';
        $preparedName = "prepared_user.$userNameColumn";
        $validatedName = "validated_user.$userNameColumn";
        $approvedName = "approved_user.$userNameColumn";

        return DB::table('payroll_slips')
            ->leftJoin('beneficiaries', 'beneficiaries.id', '=', 'payroll_slips.beneficiary_id')
            ->leftJoin('users as prepared_user', 'prepared_user.id', '=', 'payroll_slips.prepared_by')
            ->leftJoin('users as validated_user', 'validated_user.id', '=', 'payroll_slips.validated_by')
            ->leftJoin('users as approved_user', 'approved_user.id', '=', 'payroll_slips.approved_by')
            ->selectRaw("payroll_slips.*, $beneficiaryName as beneficiary_name, $preparedName as prepared_by_name, $validatedName as validated_by_name, $approvedName as approved_by_name")
            ->orderByDesc('payroll_slips.id')
            ->limit(100)
            ->get()
            ->all();
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
