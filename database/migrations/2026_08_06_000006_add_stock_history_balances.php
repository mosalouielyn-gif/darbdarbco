<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['stock_transactions', 'inventory_transactions'] as $tableName) {
            if (! Schema::hasTable($tableName)) continue;
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (! Schema::hasColumn($tableName, 'supplier_name')) $table->string('supplier_name')->nullable();
                if (! Schema::hasColumn($tableName, 'previous_balance')) $table->decimal('previous_balance', 12, 2)->nullable();
                if (! Schema::hasColumn($tableName, 'updated_balance')) $table->decimal('updated_balance', 12, 2)->nullable();
            });
        }
    }

    public function down(): void
    {
        // Keep stock history fields because existing records may already use them.
    }
};
