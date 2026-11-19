<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class RestockRequestCancellationTest extends TestCase
{
    use RefreshDatabase;

    public function test_cancel_marks_pending_request_cancelled_without_deleting_it(): void
    {
        if (! Schema::hasTable('restock_requests')) {
            Schema::create('restock_requests', function (Blueprint $table): void {
                $table->id();
                $table->string('request_no')->unique();
                $table->string('material_name');
                $table->string('category')->nullable();
                $table->decimal('current_quantity', 12, 2)->default(0);
                $table->decimal('requested_quantity', 12, 2);
                $table->string('priority')->default('normal');
                $table->text('reason');
                $table->string('status')->default('Pending');
                $table->unsignedBigInteger('reviewed_by')->nullable();
                $table->timestamp('reviewed_at')->nullable();
                $table->text('review_notes')->nullable();
                $table->timestamps();
            });
        }

        $requestId = DB::table('restock_requests')->insertGetId([
            'request_no' => 'RR-TEST-0001',
            'material_name' => 'Pruning Shears',
            'category' => 'Farm Materials',
            'current_quantity' => 2,
            'requested_quantity' => 8,
            'priority' => 'normal',
            'reason' => 'Below minimum stock level',
            'status' => 'Pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $bookkeeper = User::factory()->create(['role' => 'inventory_bookkeeper', 'active' => true]);
        $this->actingAs($bookkeeper, 'web');

        $this->putJson("/api/restock-requests/{$requestId}/cancel", [
            'user_name' => 'Test Bookkeeper',
        ])
            ->assertOk()
            ->assertJsonPath('id', $requestId)
            ->assertJsonPath('status', 'Cancelled')
            ->assertJsonPath('review_notes', 'Cancelled by requester.');

        $this->assertDatabaseCount('restock_requests', 1);
        $this->assertDatabaseHas('restock_requests', [
            'id' => $requestId,
            'status' => 'Cancelled',
            'review_notes' => 'Cancelled by requester.',
        ]);
    }
}
