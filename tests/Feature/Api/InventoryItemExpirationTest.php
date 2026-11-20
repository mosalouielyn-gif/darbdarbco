<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class InventoryItemExpirationTest extends TestCase
{
    use RefreshDatabase;

    public function test_stock_in_rejects_an_expiration_date_for_a_non_expiring_item(): void
    {
        $bookkeeper = User::factory()->create([
            'role' => 'inventory_bookkeeper',
            'active' => true,
        ]);
        $itemId = $this->createInventoryItem(null);

        $this->actingAs($bookkeeper, 'web')
            ->postJson("/api/inventory-items/{$itemId}/stock-in", $this->stockInPayload([
                'expiry_date' => '2027-01-15',
            ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('expiry_date')
            ->assertJsonPath('errors.expiry_date.0', 'This inventory item has no expiration date; an expiration date cannot be submitted for Stock-In.');

        $this->assertDatabaseHas('inventory_items', [
            'id' => $itemId,
            'on_hand' => 10,
            'expiry_date' => null,
        ]);
        $this->assertDatabaseCount('inventory_transactions', 0);
    }

    public function test_stock_in_without_an_expiration_date_remains_available_for_a_non_expiring_item(): void
    {
        $bookkeeper = User::factory()->create([
            'role' => 'inventory_bookkeeper',
            'active' => true,
        ]);
        $itemId = $this->createInventoryItem(null);

        $this->actingAs($bookkeeper, 'web')
            ->postJson("/api/inventory-items/{$itemId}/stock-in", $this->stockInPayload())
            ->assertOk()
            ->assertJsonPath('expiry_date', null);

        $this->assertDatabaseHas('inventory_items', [
            'id' => $itemId,
            'on_hand' => 12,
            'expiry_date' => null,
        ]);
    }

    public function test_stock_in_preserves_existing_expiration_validation_for_expiring_items(): void
    {
        $bookkeeper = User::factory()->create([
            'role' => 'inventory_bookkeeper',
            'active' => true,
        ]);
        $itemId = $this->createInventoryItem('2026-12-31');

        $this->actingAs($bookkeeper, 'web')
            ->postJson("/api/inventory-items/{$itemId}/stock-in", $this->stockInPayload([
                'expiry_date' => '2027-01-15',
            ]))
            ->assertOk()
            ->assertJsonPath('expiry_date', '2027-01-15');

        $this->assertDatabaseHas('inventory_items', [
            'id' => $itemId,
            'on_hand' => 12,
            'expiry_date' => '2027-01-15',
        ]);
        $this->assertDatabaseCount('inventory_transactions', 1);
    }

    public function test_stock_in_keeps_date_validation_for_expiring_items(): void
    {
        $bookkeeper = User::factory()->create([
            'role' => 'inventory_bookkeeper',
            'active' => true,
        ]);
        $itemId = $this->createInventoryItem('2026-12-31');

        $this->actingAs($bookkeeper, 'web')
            ->postJson("/api/inventory-items/{$itemId}/stock-in", $this->stockInPayload([
                'expiry_date' => 'not-a-date',
            ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('expiry_date');

        $this->assertDatabaseHas('inventory_items', [
            'id' => $itemId,
            'on_hand' => 10,
            'expiry_date' => '2026-12-31',
        ]);
    }

    private function createInventoryItem(?string $expiryDate): int
    {
        return (int) DB::table('inventory_items')->insertGetId([
            'item_code' => 'EXP-'.uniqid(),
            'name' => 'Test Inventory Item',
            'category' => 'Test Materials',
            'unit' => 'pcs',
            'on_hand' => 10,
            'minimum_stock' => 2,
            'unit_cost' => 5,
            'stock_date' => '2026-11-21',
            'expiry_date' => $expiryDate,
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function stockInPayload(array $overrides = []): array
    {
        return array_merge([
            'quantity' => 2,
            'unit_cost' => 5,
            'supplier' => 'Test Supplier',
            'reference_no' => 'STIN-EXP-001',
            'stock_date' => '2026-11-21',
            'notes' => 'Regression test',
        ], $overrides);
    }
}
