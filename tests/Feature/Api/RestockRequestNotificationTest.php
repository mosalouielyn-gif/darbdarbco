<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Notifications\RestockRequestDecision;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class RestockRequestNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_approval_creates_one_persistent_notification_for_the_request_owner_without_changing_stock(): void
    {
        $bookkeeper = User::factory()->create(['role' => 'inventory_bookkeeper', 'active' => true]);
        $manager = User::factory()->create(['role' => 'manager_admin', 'active' => true]);
        $itemId = DB::table('inventory_items')->insertGetId([
            'item_code' => 'NOTIFY-001',
            'name' => 'Agricultural Insecticide',
            'category' => 'Chemicals',
            'unit' => 'liter',
            'on_hand' => 107,
            'minimum_stock' => 8,
            'unit_cost' => 550,
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $requestId = $this->createPendingRequest($bookkeeper, $itemId, 'RR-NOTIFY-APPROVE');

        $this->actingAs($manager, 'web')->putJson("/api/restock-requests/{$requestId}/approve", [
            'user_id' => $bookkeeper->id,
            'user_name' => 'Forged owner',
        ])->assertOk()->assertJsonPath('status', 'Approved');

        $this->assertDatabaseCount('notifications', 1);
        $notification = $bookkeeper->notifications()->firstOrFail();
        $this->assertSame(RestockRequestDecision::class, $notification->type);
        $this->assertSame($requestId, $notification->data['restock_request_id']);
        $this->assertSame('RR-NOTIFY-APPROVE', $notification->data['request_id']);
        $this->assertSame('Agricultural Insecticide', $notification->data['material_name']);
        $this->assertEquals(100.0, $notification->data['requested_quantity']);
        $this->assertSame('Approved', $notification->data['status']);
        $this->assertNotEmpty($notification->data['decided_at']);
        $this->assertDatabaseHas('inventory_items', ['id' => $itemId, 'on_hand' => 107]);

        $this->putJson("/api/restock-requests/{$requestId}/approve")->assertUnprocessable();
        $this->assertDatabaseCount('notifications', 1);
    }

    public function test_return_creates_one_notification_with_rejected_status_for_the_request_owner(): void
    {
        $bookkeeper = User::factory()->create(['role' => 'inventory_bookkeeper', 'active' => true]);
        $manager = User::factory()->create(['role' => 'manager_admin', 'active' => true]);
        $requestId = $this->createPendingRequest($bookkeeper, null, 'RR-NOTIFY-RETURN');

        $this->actingAs($manager, 'web')->putJson("/api/restock-requests/{$requestId}/return", [
            'reason' => 'Please correct the quantity.',
        ])->assertOk()->assertJsonPath('status', 'Rejected');

        $this->assertDatabaseCount('notifications', 1);
        $notification = $bookkeeper->notifications()->firstOrFail();
        $this->assertSame('Rejected', $notification->data['status']);
        $this->assertSame('Please correct the quantity.', $notification->data['review_notes']);
        $this->assertSame($requestId, $notification->data['restock_request_id']);

        $this->putJson("/api/restock-requests/{$requestId}/return", ['reason' => 'Repeat attempt.'])->assertUnprocessable();
        $this->assertDatabaseCount('notifications', 1);
    }

    public function test_notifications_are_only_visible_and_markable_by_the_original_bookkeeper(): void
    {
        $bookkeeper = User::factory()->create(['role' => 'inventory_bookkeeper', 'active' => true]);
        $otherBookkeeper = User::factory()->create(['role' => 'inventory_bookkeeper', 'active' => true]);
        $manager = User::factory()->create(['role' => 'manager_admin', 'active' => true]);
        $requestId = $this->createPendingRequest($bookkeeper, null, 'RR-NOTIFY-OWNER');

        $this->actingAs($manager, 'web')->putJson("/api/restock-requests/{$requestId}/approve")->assertOk();
        $notification = $bookkeeper->notifications()->firstOrFail();

        $this->actingAs($otherBookkeeper, 'web')->getJson('/api/restock-request-notifications')
            ->assertOk()
            ->assertJsonPath('notifications', []);
        $this->patchJson("/api/restock-request-notifications/{$notification->id}/read")->assertNotFound();
        $this->assertNull($bookkeeper->notifications()->firstOrFail()->read_at);

        $this->actingAs($bookkeeper, 'web')->getJson('/api/restock-request-notifications')
            ->assertOk()
            ->assertJsonPath('unread_count', 1)
            ->assertJsonPath('notifications.0.data.request_id', 'RR-NOTIFY-OWNER')
            ->assertJsonPath('notifications.0.data.restock_request_id', $requestId);
    }

    public function test_bookkeeper_can_mark_notification_read_and_it_remains_available_afterward(): void
    {
        $bookkeeper = User::factory()->create(['role' => 'inventory_bookkeeper', 'active' => true]);
        $manager = User::factory()->create(['role' => 'manager_admin', 'active' => true]);
        $requestId = $this->createPendingRequest($bookkeeper, null, 'RR-NOTIFY-READ');

        $this->actingAs($manager, 'web')->putJson("/api/restock-requests/{$requestId}/approve")->assertOk();
        $notification = $bookkeeper->notifications()->firstOrFail();

        $this->actingAs($bookkeeper, 'web')->getJson('/api/restock-request-notifications')
            ->assertOk()
            ->assertJsonPath('unread_count', 1);
        $this->patchJson("/api/restock-request-notifications/{$notification->id}/read")->assertNoContent();

        $this->getJson('/api/restock-request-notifications')
            ->assertOk()
            ->assertJsonPath('unread_count', 0)
            ->assertJsonPath('notifications.0.data.request_id', 'RR-NOTIFY-READ');
        $this->assertNotNull($bookkeeper->notifications()->firstOrFail()->read_at);
        $this->assertDatabaseCount('notifications', 1);
    }

    public function test_notification_endpoints_require_an_active_inventory_bookkeeper_session(): void
    {
        $this->getJson('/api/restock-request-notifications')->assertUnauthorized();

        $manager = User::factory()->create(['role' => 'manager_admin', 'active' => true]);
        $this->actingAs($manager, 'web')->getJson('/api/restock-request-notifications')->assertForbidden();

        $inactiveBookkeeper = User::factory()->create(['role' => 'inventory_bookkeeper', 'active' => false]);
        $this->actingAs($inactiveBookkeeper, 'web')->getJson('/api/restock-request-notifications')->assertForbidden();
    }

    public function test_cancelling_a_request_does_not_create_a_manager_decision_notification(): void
    {
        $bookkeeper = User::factory()->create(['role' => 'inventory_bookkeeper', 'active' => true]);
        $requestId = $this->createPendingRequest($bookkeeper, null, 'RR-NOTIFY-CANCEL');

        $this->actingAs($bookkeeper, 'web')->putJson("/api/restock-requests/{$requestId}/cancel")->assertOk();

        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_failed_notification_insert_rolls_back_the_restock_decision(): void
    {
        $bookkeeper = User::factory()->create(['role' => 'inventory_bookkeeper', 'active' => true]);
        $manager = User::factory()->create(['role' => 'manager_admin', 'active' => true]);
        $requestId = $this->createPendingRequest($bookkeeper, null, 'RR-NOTIFY-ROLLBACK');
        DB::unprepared("CREATE TRIGGER reject_restock_notification BEFORE INSERT ON notifications BEGIN SELECT RAISE(ABORT, 'test notification failure'); END");

        $this->actingAs($manager, 'web')->putJson("/api/restock-requests/{$requestId}/approve")->assertInternalServerError();

        $this->assertDatabaseHas('restock_requests', ['id' => $requestId, 'status' => 'Pending']);
        $this->assertDatabaseCount('notifications', 0);
    }

    private function createPendingRequest(User $bookkeeper, ?int $itemId, string $requestNo): int
    {
        $values = [
            'request_no' => $requestNo,
            'material_name' => 'Agricultural Insecticide',
            'category' => 'Chemicals',
            'current_quantity' => 0,
            'requested_quantity' => 100,
            'priority' => 'normal',
            'reason' => 'Low stock',
            'status' => 'Pending',
            'requested_by' => $bookkeeper->id,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        if (Schema::hasColumn('restock_requests', 'item_id')) {
            $values['item_id'] = $itemId;
        } elseif (Schema::hasColumn('restock_requests', 'inventory_item_id')) {
            $values['inventory_item_id'] = $itemId;
        }

        return (int) DB::table('restock_requests')->insertGetId($values);
    }
}
