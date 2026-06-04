<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('borrowed_materials')) {
            return;
        }

        Schema::create('borrowed_materials', function (Blueprint $table) {
            $table->id();
            $table->string('borrow_no')->unique();
            $table->foreignId('inventory_item_id')->constrained('inventory_items')->cascadeOnDelete();
            $table->string('borrower');
            $table->decimal('qty_borrowed', 12, 2);
            $table->decimal('qty_returned', 12, 2)->default(0);
            $table->string('unit', 50);
            $table->date('date_borrowed');
            $table->date('expected_return_date');
            $table->date('actual_return_date')->nullable();
            $table->string('status')->default('Borrowed');
            $table->string('release_reference_no')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('borrowed_materials');
    }
};
