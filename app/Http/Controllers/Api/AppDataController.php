<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AppDataController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'beneficiaries' => $this->beneficiaries(),
            'productionRecords' => $this->productionRecords(),
            'dailyBoxes' => $this->dailyBoxes(),
            'inventoryItems' => $this->inventoryItems(),
            'stockTransactions' => $this->stockTransactions(),
            'restockRequests' => $this->restockRequests(),
            'payrollSlips' => $this->payrollSlips(),
            'auditLogs' => $this->auditLogs(),
            'users' => $this->users(),
        ]);
    }

    private function beneficiaries(): array
    {
        if (! Schema::hasTable('beneficiaries')) {
            return [];
        }

        $nameColumn = Schema::hasColumn('beneficiaries', 'full_name') ? 'full_name' : 'name';
        $codeColumn = Schema::hasColumn('beneficiaries', 'code') ? 'code' : 'beneficiary_code';

        return DB::table('beneficiaries')
            ->select(['id', DB::raw("$codeColumn as code"), DB::raw("$nameColumn as name")])
            ->orderBy($nameColumn)
            ->limit(200)
            ->get()
            ->all();
    }

    private function productionRecords(): array
    {
        if (Schema::hasTable('production_records')) {
            return DB::table('production_records')
                ->leftJoin('beneficiaries', 'beneficiaries.id', '=', 'production_records.beneficiary_id')
                ->selectRaw('production_records.id, production_records.record_no, production_records.harvest_date, production_records.packing_date, beneficiaries.full_name as beneficiary_name, production_records.harvester_name, production_records.buligs_11w, production_records.buligs_12w, production_records.buligs_13w, production_records.buligs_14w, production_records.buligs_total, production_records.class_a_big_hands, production_records.class_a_small_hands, production_records.class_a_cps, production_records.class_b_big_hands, production_records.class_b_small_hands, production_records.class_b_cps, production_records.special_total, production_records.defects_11w, production_records.defects_12w, production_records.defects_13w, production_records.defects_14w, production_records.rejects_11w, production_records.rejects_12w, production_records.rejects_13w, production_records.rejects_14w')
                ->orderByDesc('production_records.packing_date')
                ->limit(100)
                ->get()
                ->all();
        }

        if (! Schema::hasTable('production_box_records')) {
            return [];
        }

        return DB::table('production_box_records')
            ->orderByDesc('production_date')
            ->limit(100)
            ->get()
            ->all();
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
            return DB::table('inventory_items')
                ->leftJoin('inventory_categories', 'inventory_categories.id', '=', 'inventory_items.category_id')
                ->selectRaw('inventory_items.id, inventory_items.material_id as code, inventory_items.item_name as name, inventory_categories.label as category, inventory_items.unit, inventory_items.on_hand, inventory_items.unit_cost, inventory_items.expiry_date, inventory_items.stock_date, inventory_items.is_active as active')
                ->orderBy('inventory_items.item_name')
                ->limit(200)
                ->get()
                ->all();
        }

        return DB::table('inventory_items')
            ->selectRaw('id, item_code as code, name, category, unit, on_hand, unit_cost, expiry_date, stock_date, active')
            ->orderBy('name')
            ->limit(200)
            ->get()
            ->all();
    }

    private function stockTransactions(): array
    {
        if (Schema::hasTable('stock_transactions')) {
            return DB::table('stock_transactions')
                ->leftJoin('inventory_items', 'inventory_items.id', '=', 'stock_transactions.item_id')
                ->leftJoin('beneficiaries', 'beneficiaries.id', '=', 'stock_transactions.beneficiary_id')
                ->selectRaw('stock_transactions.id, stock_transactions.reference_no, stock_transactions.txn_type as type, inventory_items.item_name as material, stock_transactions.quantity, inventory_items.unit, stock_transactions.reason, beneficiaries.full_name as beneficiary_name, stock_transactions.txn_at')
                ->orderByDesc('stock_transactions.txn_at')
                ->limit(150)
                ->get()
                ->all();
        }

        if (! Schema::hasTable('inventory_transactions')) {
            return [];
        }

        return DB::table('inventory_transactions')
            ->orderByDesc('transaction_at')
            ->limit(150)
            ->get()
            ->all();
    }

    private function restockRequests(): array
    {
        if (! Schema::hasTable('restock_requests')) {
            return [];
        }

        if (Schema::hasColumn('restock_requests', 'item_id')) {
            return DB::table('restock_requests')
                ->leftJoin('inventory_items', 'inventory_items.id', '=', 'restock_requests.item_id')
                ->selectRaw('restock_requests.id, restock_requests.request_no, inventory_items.item_name as material_name, restock_requests.quantity as requested_quantity, restock_requests.status, restock_requests.notes, restock_requests.requested_at')
                ->orderByDesc('restock_requests.requested_at')
                ->limit(100)
                ->get()
                ->all();
        }

        return DB::table('restock_requests')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->all();
    }

    private function payrollSlips(): array
    {
        if (! Schema::hasTable('payroll_slips')) {
            return [];
        }

        $beneficiaryName = Schema::hasColumn('beneficiaries', 'full_name') ? 'beneficiaries.full_name' : 'beneficiaries.name';

        return DB::table('payroll_slips')
            ->leftJoin('beneficiaries', 'beneficiaries.id', '=', 'payroll_slips.beneficiary_id')
            ->selectRaw("payroll_slips.*, $beneficiaryName as beneficiary_name")
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

            return DB::table('audit_logs')
                ->leftJoin('users', 'users.id', '=', 'audit_logs.user_id')
                ->selectRaw("audit_logs.id, audit_logs.module, audit_logs.action, audit_logs.details, audit_logs.created_at, $userName as user_name")
                ->orderByDesc('audit_logs.created_at')
                ->limit(100)
                ->get()
                ->all();
        }

        return DB::table('audit_logs')
            ->selectRaw('id, module, action, description as details, logged_at as created_at, user_name')
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
            return DB::table('users')
                ->leftJoin('roles', 'roles.id', '=', 'users.role_id')
                ->selectRaw('users.id, users.full_name as name, users.username, users.email, roles.code as role, users.is_active as active, users.last_login_at')
                ->orderBy('users.full_name')
                ->limit(100)
                ->get()
                ->all();
        }

        return DB::table('users')
            ->selectRaw('id, name, username, email, role, active, last_login_at')
            ->orderBy('name')
            ->limit(100)
            ->get()
            ->all();
    }
}
