<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class RestockHistoryDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_both_inventory_roles_receive_all_restock_statuses_and_delivery_details_without_writes(): void
    {
        $this->createRestockTables();
        $requester = User::factory()->create(['name' => 'Bookkeeper User', 'role' => 'inventory_bookkeeper', 'active' => true]);
        $reviewer = User::factory()->create(['name' => 'Manager User', 'role' => 'manager_admin', 'active' => true]);
        $itemId = DB::table('inventory_items')->insertGetId([
            'item_code' => 'RST-001',
            'name' => 'Pruning Shears',
            'category' => 'Farm Materials',
            'unit' => 'pcs',
            'on_hand' => 2,
            'minimum_stock' => 5,
            'unit_cost' => 180,
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach ([
            ['RR-PENDING', 'Pending'],
            ['RR-APPROVED', 'Approved'],
            ['RR-COMPLETED', 'Completed'],
            ['RR-CANCELLED', 'Cancelled'],
            ['RR-RETURNED', 'Rejected'],
        ] as [$requestNumber, $status]) {
            DB::table('restock_requests')->insert([
                'request_no' => $requestNumber,
                'inventory_item_id' => $itemId,
                'material_name' => 'Pruning Shears',
                'category' => 'Farm Materials',
                'current_quantity' => 2,
                'requested_quantity' => 8,
                'priority' => 'normal',
                'reason' => 'Below minimum stock level',
                'notes' => 'Keep dry',
                'status' => $status,
                'requested_by' => $requester->id,
                'reviewed_by' => in_array($status, ['Approved', 'Completed', 'Cancelled', 'Rejected'], true) ? $reviewer->id : null,
                'reviewed_at' => in_array($status, ['Approved', 'Completed', 'Cancelled', 'Rejected'], true) ? now() : null,
                'review_notes' => in_array($status, ['Cancelled', 'Rejected'], true) ? 'Returned for correction.' : null,
                'created_at' => now()->subMinutes(5),
                'updated_at' => now(),
            ]);
        }

        DB::table('inventory_transactions')->insert([
            'reference_no' => 'DEL-RR-COMPLETED',
            'inventory_item_id' => $itemId,
            'transaction_type' => 'Stock In',
            'quantity' => 12,
            'unit_cost' => 180,
            'beneficiary_name' => null,
            'reason' => 'Delivered restock request RR-COMPLETED; stock increased from 2 to 14. Notes: Shipment checked.',
            'transaction_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($requester, 'web');
        $bookkeeperRows = $this->getJson('/api/app-data?role=inventory_bookkeeper')
            ->assertOk()
            ->json('restockRequests');
        $this->actingAs($reviewer, 'web');
        $managerRows = $this->getJson('/api/app-data?role=manager_admin')
            ->assertOk()
            ->json('restockRequests');

        $this->assertCount(5, $bookkeeperRows);
        $this->assertSame(
            collect($bookkeeperRows)->pluck('request_no')->sort()->values()->all(),
            collect($managerRows)->pluck('request_no')->sort()->values()->all(),
        );

        $completed = collect($bookkeeperRows)->firstWhere('request_no', 'RR-COMPLETED');
        $this->assertSame('Bookkeeper User', $completed['requested_by_name']);
        $this->assertSame('Manager User', $completed['reviewed_by_name']);
        $this->assertSame(12.0, (float) $completed['quantity_received']);
        $this->assertSame('DEL-RR-COMPLETED', $completed['delivery_reference']);
        $this->assertSame('Shipment checked.', $completed['delivery_notes']);
        $this->assertDatabaseHas('inventory_items', ['id' => $itemId, 'on_hand' => 2]);
        $this->assertDatabaseCount('inventory_transactions', 1);
    }

    private function createRestockTables(): void
    {
        if (! Schema::hasTable('inventory_items')) {
            Schema::create('inventory_items', function (Blueprint $table): void {
                $table->id();
                $table->string('item_code')->unique();
                $table->string('name');
                $table->string('category');
                $table->string('unit');
                $table->decimal('on_hand', 12, 2)->default(0);
                $table->decimal('minimum_stock', 12, 2)->default(0);
                $table->decimal('unit_cost', 12, 2)->default(0);
                $table->date('expiry_date')->nullable();
                $table->date('stock_date')->nullable();
                $table->boolean('active')->default(true);
                $table->string('supplier')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('restock_requests')) {
            Schema::create('restock_requests', function (Blueprint $table): void {
                $table->id();
                $table->string('request_no')->unique();
                $table->unsignedBigInteger('inventory_item_id')->nullable();
                $table->string('material_name');
                $table->string('category')->nullable();
                $table->decimal('current_quantity', 12, 2)->default(0);
                $table->decimal('minimum_stock', 12, 2)->default(0);
                $table->decimal('requested_quantity', 12, 2);
                $table->string('priority')->default('normal');
                $table->text('reason');
                $table->text('notes')->nullable();
                $table->string('status')->default('Pending');
                $table->unsignedBigInteger('requested_by')->nullable();
                $table->unsignedBigInteger('reviewed_by')->nullable();
                $table->timestamp('requested_at')->nullable();
                $table->timestamp('reviewed_at')->nullable();
                $table->text('review_notes')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('inventory_transactions')) {
            Schema::create('inventory_transactions', function (Blueprint $table): void {
                $table->id();
                $table->string('reference_no')->unique();
                $table->unsignedBigInteger('inventory_item_id');
                $table->string('transaction_type');
                $table->decimal('quantity', 12, 2);
                $table->decimal('unit_cost', 12, 2)->default(0);
                $table->string('beneficiary_name')->nullable();
                $table->text('reason')->nullable();
                $table->timestamp('transaction_at');
                $table->timestamps();
            });
        }
    }
}
