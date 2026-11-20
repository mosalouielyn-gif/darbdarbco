<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class RestockRequestStockSnapshotTest extends TestCase
{
    use RefreshDatabase;

    public function test_creation_saves_database_stock_snapshots_and_returns_them_to_both_inventory_roles(): void
    {
        $this->createLiveShapeRestockTable();
        $bookkeeper = User::factory()->create(['role' => 'inventory_bookkeeper', 'active' => true]);
        $manager = User::factory()->create(['role' => 'manager_admin', 'active' => true]);
        $itemId = DB::table('inventory_items')->insertGetId([
            'item_code' => 'RST-SNAPSHOT-001',
            'name' => 'Rubber Safety Boots',
            'category' => 'Other Supplies',
            'unit' => 'pairs',
            'on_hand' => 4,
            'minimum_stock' => 10,
            'unit_cost' => 0,
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $created = $this->actingAs($bookkeeper, 'web')->postJson('/api/restock-requests', [
            'item_id' => $itemId,
            'material_name' => 'Rubber Safety Boots',
            'requested_quantity' => 500,
            'current_quantity' => 999,
            'minimum_stock' => 888,
            'current_quantity_at_request' => 777,
            'minimum_stock_at_request' => 666,
            'reason' => 'Low stock',
        ])->assertCreated();

        $requestId = $created->json('id');
        $this->assertDatabaseHas('restock_requests', [
            'id' => $requestId,
            'item_id' => $itemId,
            'quantity' => 500,
            'status' => 'Pending',
            'current_quantity_at_request' => 4,
            'minimum_stock_at_request' => 10,
        ]);
        $this->assertSame(4.0, (float) $created->json('current_quantity_at_request'));
        $this->assertSame(10.0, (float) $created->json('minimum_stock_at_request'));

        DB::table('inventory_items')->where('id', $itemId)->update(['on_hand' => 2, 'minimum_stock' => 3]);

        $bookkeeperRows = $this->getJson('/api/app-data?role=inventory_bookkeeper')->assertOk()->json('restockRequests');
        $managerRows = $this->actingAs($manager, 'web')->getJson('/api/app-data?role=manager_admin')->assertOk()->json('restockRequests');
        $bookkeeperRequest = collect($bookkeeperRows)->firstWhere('id', $requestId);
        $managerRequest = collect($managerRows)->firstWhere('id', $requestId);

        $this->assertSame(4.0, (float) $bookkeeperRequest['current_quantity_at_request']);
        $this->assertSame(10.0, (float) $bookkeeperRequest['minimum_stock_at_request']);
        $this->assertSame(4.0, (float) $managerRequest['current_quantity_at_request']);
        $this->assertSame(10.0, (float) $managerRequest['minimum_stock_at_request']);
        $this->assertDatabaseHas('inventory_items', ['id' => $itemId, 'on_hand' => 2, 'minimum_stock' => 3]);
    }

    public function test_existing_requests_without_snapshots_remain_null_in_the_api(): void
    {
        $this->createLiveShapeRestockTable();
        $bookkeeper = User::factory()->create(['role' => 'inventory_bookkeeper', 'active' => true]);
        $itemId = DB::table('inventory_items')->insertGetId([
            'item_code' => 'RST-SNAPSHOT-002',
            'name' => 'Pruning Shears',
            'category' => 'Farm Materials',
            'unit' => 'kg',
            'on_hand' => 107,
            'minimum_stock' => 8,
            'unit_cost' => 0,
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $requestId = DB::table('restock_requests')->insertGetId([
            'request_no' => 'RR-LEGACY-SNAPSHOT-NULL',
            'item_id' => $itemId,
            'quantity' => 10,
            'requested_by' => $bookkeeper->id,
            'status' => 'Approved',
            'requested_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $request = $this->actingAs($bookkeeper, 'web')->getJson('/api/app-data?role=inventory_bookkeeper')
            ->assertOk()
            ->json('restockRequests.0');

        $this->assertSame($requestId, $request['id']);
        $this->assertNull($request['current_quantity_at_request']);
        $this->assertNull($request['minimum_stock_at_request']);
        $this->assertSame('Approved', $request['status']);
    }

    private function createLiveShapeRestockTable(): void
    {
        Schema::dropIfExists('restock_requests');
        Schema::create('restock_requests', function (Blueprint $table): void {
            $table->id();
            $table->string('request_no')->unique();
            $table->unsignedBigInteger('item_id')->nullable();
            $table->decimal('quantity', 12, 2);
            $table->unsignedBigInteger('requested_by')->nullable();
            $table->string('status')->default('Pending');
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->timestamp('requested_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->string('priority')->default('normal');
            $table->text('reason')->nullable();
            $table->text('notes')->nullable();
            $table->text('review_notes')->nullable();
            $table->decimal('current_quantity_at_request', 12, 2)->nullable();
            $table->decimal('minimum_stock_at_request', 12, 2)->nullable();
            $table->timestamps();
        });
    }
}
