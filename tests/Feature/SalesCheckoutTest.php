<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SalesCheckoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_credit_checkout_saves_all_items_under_one_receipt_and_updates_inventory_and_credit(): void
    {
        $this->createSalesTables();
        $userId = $this->createUser();
        $beneficiaryId = $this->createBeneficiary();
        $firstItemId = $this->createInventoryItem('Chemical', 'Chemicals', 10, 450);
        $secondItemId = $this->createInventoryItem('Pruner', 'Farm Materials', 5, 180);

        $response = $this->postJson('/api/sales/checkouts', [
            'items' => [
                ['inventory_item_id' => $firstItemId, 'quantity' => 2],
                ['inventory_item_id' => $secondItemId, 'quantity' => 1],
            ],
            'customer_type' => 'registered',
            'beneficiary_id' => $beneficiaryId,
            'payment_method' => 'Beneficiary Credit',
            'user_id' => $userId,
            'user_name' => 'Inventory Bookkeeper',
        ]);

        $response->assertCreated()
            ->assertJsonPath('receipt.customer_name', 'Rowena C. Mendoza')
            ->assertJsonPath('receipt.beneficiary_code', 'BEN-003')
            ->assertJsonPath('receipt.payment_method', 'Beneficiary Credit')
            ->assertJsonPath('receipt.total_amount', 1080)
            ->assertJsonCount(2, 'receipt.items')
            ->assertJsonCount(2, 'receipt.credit_transactions');

        $receiptNo = $response->json('receipt.receipt_no');
        $this->assertDatabaseCount('sales_receipts', 1);
        $this->assertDatabaseCount('sales_receipt_items', 2);
        $this->assertDatabaseCount('stock_transactions', 2);
        $this->assertDatabaseCount('credit_transactions', 2);
        $this->assertDatabaseHas('sales_receipts', [
            'receipt_no' => $receiptNo,
            'beneficiary_id' => $beneficiaryId,
            'total_amount' => 1080,
            'credit_amount' => 1080,
            'remaining_balance' => 1080,
        ]);
        $this->assertDatabaseHas('inventory_items', ['id' => $firstItemId, 'on_hand' => 8]);
        $this->assertDatabaseHas('inventory_items', ['id' => $secondItemId, 'on_hand' => 4]);
        $this->assertDatabaseHas('credit_transactions', [
            'receipt_no' => $receiptNo,
            'beneficiary_account_id' => 'BEN-003',
            'amount' => 900,
        ]);
        $this->assertDatabaseHas('credit_transactions', ['receipt_no' => $receiptNo, 'amount' => 180]);

        $this->getJson('/api/app-data?role=inventory_bookkeeper')
            ->assertOk()
            ->assertJsonCount(1, 'salesReceipts')
            ->assertJsonPath('salesReceipts.0.receipt_no', $receiptNo)
            ->assertJsonCount(2, 'salesReceipts.0.items');
    }

    public function test_checkout_rolls_back_every_item_when_any_inventory_line_is_short(): void
    {
        $this->createSalesTables();
        $userId = $this->createUser();
        $beneficiaryId = $this->createBeneficiary();
        $firstItemId = $this->createInventoryItem('Chemical', 'Chemicals', 10, 450);
        $secondItemId = $this->createInventoryItem('Pruner', 'Farm Materials', 1, 180);

        $this->postJson('/api/sales/checkouts', [
            'items' => [
                ['inventory_item_id' => $firstItemId, 'quantity' => 2],
                ['inventory_item_id' => $secondItemId, 'quantity' => 2],
            ],
            'customer_type' => 'registered',
            'beneficiary_id' => $beneficiaryId,
            'payment_method' => 'Beneficiary Credit',
            'user_id' => $userId,
            'user_name' => 'Inventory Bookkeeper',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.items.0', 'Only 1 pcs available for Pruner.');

        $this->assertDatabaseCount('sales_receipts', 0);
        $this->assertDatabaseCount('sales_receipt_items', 0);
        $this->assertDatabaseCount('stock_transactions', 0);
        $this->assertDatabaseCount('credit_transactions', 0);
        $this->assertDatabaseHas('inventory_items', ['id' => $firstItemId, 'on_hand' => 10]);
        $this->assertDatabaseHas('inventory_items', ['id' => $secondItemId, 'on_hand' => 1]);
    }

    public function test_registered_checkout_requires_a_valid_beneficiary_id(): void
    {
        $this->createSalesTables();
        $userId = $this->createUser();
        $itemId = $this->createInventoryItem('Chemical', 'Chemicals', 10, 450);

        $this->postJson('/api/sales/checkouts', [
            'items' => [['inventory_item_id' => $itemId, 'quantity' => 1]],
            'customer_type' => 'registered',
            'payment_method' => 'Cash',
            'user_id' => $userId,
            'user_name' => 'Inventory Bookkeeper',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.beneficiary_id.0', 'The beneficiary id field is required.');

        $this->assertDatabaseCount('sales_receipts', 0);
        $this->assertDatabaseHas('inventory_items', ['id' => $itemId, 'on_hand' => 10]);
    }

    public function test_each_cash_checkout_gets_its_own_receipt_number(): void
    {
        $this->createSalesTables();
        $userId = $this->createUser();
        $itemId = $this->createInventoryItem('Chemical', 'Chemicals', 10, 450);
        $checkout = [
            'items' => [['inventory_item_id' => $itemId, 'quantity' => 1]],
            'customer_type' => 'walk-in',
            'customer_name' => 'Walk-in Customer',
            'payment_method' => 'Cash',
            'user_id' => $userId,
            'user_name' => 'Inventory Bookkeeper',
        ];

        $firstResponse = $this->postJson('/api/sales/checkouts', $checkout)->assertCreated();
        $secondResponse = $this->postJson('/api/sales/checkouts', $checkout)->assertCreated();

        $this->assertNotSame($firstResponse->json('receipt.receipt_no'), $secondResponse->json('receipt.receipt_no'));
        $this->assertDatabaseCount('sales_receipts', 2);
        $this->assertDatabaseCount('sales_receipt_items', 2);
        $this->assertDatabaseCount('stock_transactions', 2);
        $this->assertDatabaseCount('credit_transactions', 0);
        $this->assertDatabaseHas('sales_receipts', [
            'receipt_no' => $firstResponse->json('receipt.receipt_no'),
            'cash_payment' => 450,
            'credit_amount' => 0,
        ]);
        $this->assertDatabaseHas('sales_receipts', [
            'receipt_no' => $secondResponse->json('receipt.receipt_no'),
            'cash_payment' => 450,
            'credit_amount' => 0,
        ]);
    }

    public function test_pos_credit_issued_before_approval_is_included_in_the_payroll_balance_check(): void
    {
        $this->createSalesTables();
        $bookkeeperId = $this->createUser();
        $beneficiaryId = $this->createBeneficiary();
        $itemId = $this->createInventoryItem('Chemical', 'Chemicals', 10, 450);
        $payrollSlipId = DB::table('payroll_slips')->insertGetId([
            'slip_no' => 'BP-POS-CREDIT-STALE',
            'beneficiary_id' => $beneficiaryId,
            'beneficiary_name' => 'Rowena C. Mendoza',
            'beneficiary_code' => 'BEN-003',
            'payroll_period' => 'November 16-30, 2026',
            'credit_deduction' => 0,
            'material_deduction' => 0,
            'total_deductions' => 0,
            'gross_amount' => 100,
            'net_amount' => 100,
            'validation_status' => 'Validated',
            'approval_status' => 'Pending Manager Approval',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->postJson('/api/sales/checkouts', [
            'items' => [['inventory_item_id' => $itemId, 'quantity' => 1]],
            'customer_type' => 'registered',
            'beneficiary_id' => $beneficiaryId,
            'payment_method' => 'Beneficiary Credit',
            'user_id' => $bookkeeperId,
            'user_name' => 'Inventory Bookkeeper',
        ])->assertCreated();

        $manager = User::factory()->create([
            'role' => 'manager_admin',
            'active' => true,
        ]);
        $this->actingAs($manager, 'web');

        $this->putJson("/api/payroll-slips/{$payrollSlipId}/manager-approve", [])->assertUnprocessable();

        $this->assertDatabaseHas('payroll_slips', [
            'id' => $payrollSlipId,
            'approval_status' => 'Pending Manager Approval',
            'credit_deduction' => '0.00',
            'net_amount' => '100.00',
        ]);
        $this->assertDatabaseHas('credit_transactions', [
            'beneficiary_account_id' => 'BEN-003',
            'remaining_balance' => '450.00',
        ]);
        $this->assertDatabaseCount('credit_deductions', 0);
        $this->assertDatabaseHas('inventory_items', ['id' => $itemId, 'on_hand' => '9.00']);
    }

    private function createSalesTables(): void
    {
        Schema::create('stock_transactions', function (Blueprint $table): void {
            $table->id();
            $table->string('reference_no')->unique();
            $table->string('txn_type');
            $table->foreignId('item_id')->constrained('inventory_items');
            $table->decimal('quantity', 12, 2);
            $table->decimal('unit_cost', 12, 2)->default(0);
            $table->string('supplier_name')->nullable();
            $table->foreignId('beneficiary_id')->nullable()->constrained('beneficiaries');
            $table->string('beneficiary_name')->nullable();
            $table->string('receipt_no')->nullable();
            $table->text('reason')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users');
            $table->timestamp('txn_at');
        });

        Schema::table('credit_transactions', function (Blueprint $table): void {
            $table->string('receipt_no')->nullable();
        });

        Schema::create('sales_receipts', function (Blueprint $table): void {
            $table->id();
            $table->string('receipt_no')->unique();
            $table->foreignId('beneficiary_id')->nullable()->constrained('beneficiaries');
            $table->string('customer_name');
            $table->decimal('total_amount', 12, 2);
            $table->decimal('cash_payment', 12, 2)->default(0);
            $table->decimal('credit_amount', 12, 2)->default(0);
            $table->decimal('remaining_balance', 12, 2)->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamp('transaction_at');
            $table->timestamps();
        });

        Schema::create('sales_receipt_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('sales_receipt_id')->constrained('sales_receipts');
            $table->foreignId('inventory_item_id')->nullable()->constrained('inventory_items');
            $table->string('item_name');
            $table->string('category')->nullable();
            $table->decimal('quantity', 12, 2);
            $table->string('unit', 50);
            $table->decimal('unit_price', 12, 2);
            $table->decimal('total_amount', 12, 2);
            $table->timestamps();
        });
    }

    private function createUser(): int
    {
        $id = (int) DB::table('users')->insertGetId([
            'name' => 'Inventory Bookkeeper',
            'email' => 'bookkeeper@example.test',
            'password' => 'password',
            'role' => 'inventory_bookkeeper',
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs(User::query()->findOrFail($id), 'web');

        return $id;
    }

    private function createBeneficiary(): int
    {
        return (int) DB::table('beneficiaries')->insertGetId([
            'beneficiary_code' => 'BEN-003',
            'name' => 'Rowena C. Mendoza',
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createInventoryItem(string $name, string $category, float $quantity, float $unitCost): int
    {
        return (int) DB::table('inventory_items')->insertGetId([
            'item_code' => strtoupper(str_replace(' ', '-', $name)),
            'name' => $name,
            'category' => $category,
            'unit' => 'pcs',
            'on_hand' => $quantity,
            'unit_cost' => $unitCost,
            'stock_date' => now()->toDateString(),
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
