<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class RestockRequestMaterialNameTest extends TestCase
{
    use RefreshDatabase;

    public function test_created_request_keeps_its_inventory_reference_and_returns_the_linked_material_name(): void
    {
        Schema::drop('restock_requests');
        Schema::create('restock_requests', function (Blueprint $table): void {
            $table->id();
            $table->string('request_no')->unique();
            $table->unsignedBigInteger('item_id')->nullable();
            $table->decimal('quantity', 12, 2);
            $table->string('status')->default('Pending');
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();
        });

        $bookkeeper = User::factory()->create([
            'role' => 'inventory_bookkeeper',
            'active' => true,
        ]);
        $itemId = DB::table('inventory_items')->insertGetId([
            'item_code' => 'CHEM-TEST-001',
            'name' => 'Agricultural Insecticide',
            'category' => 'Chemicals and Crop Protection Materials',
            'unit' => 'liter',
            'on_hand' => 0,
            'minimum_stock' => 5,
            'unit_cost' => 450,
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($bookkeeper, 'web')->postJson('/api/restock-requests', [
            'item_id' => $itemId,
            'material_name' => 'Agricultural Insecticide',
            'category' => 'Chemicals and Crop Protection Materials',
            'requested_quantity' => 100,
            'reason' => 'Low stock',
        ])
            ->assertCreated()
            ->assertJsonPath('item_id', $itemId)
            ->assertJsonPath('material_name', 'Agricultural Insecticide');

        $this->assertDatabaseCount('restock_requests', 1);
        $this->assertDatabaseHas('restock_requests', [
            'item_id' => $itemId,
            'quantity' => 100,
            'status' => 'Pending',
        ]);

        $requests = $this->getJson('/api/app-data?role=inventory_bookkeeper')
            ->assertOk()
            ->json('restockRequests');
        $savedRequest = collect($requests)->firstWhere('item_id', $itemId);

        $this->assertSame('Agricultural Insecticide', $savedRequest['inventory_item_name']);
        $this->assertArrayNotHasKey('material_name', $savedRequest);
    }
}
