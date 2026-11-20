<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('restock_requests', function (Blueprint $table) {
            $table->decimal('current_quantity_at_request', 12, 2)->nullable();
            $table->decimal('minimum_stock_at_request', 12, 2)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('restock_requests', function (Blueprint $table) {
            $table->dropColumn(['current_quantity_at_request', 'minimum_stock_at_request']);
        });
    }
};
