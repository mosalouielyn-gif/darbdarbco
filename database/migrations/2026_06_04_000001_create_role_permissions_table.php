<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('role_permissions')) {
            Schema::create('role_permissions', function (Blueprint $table) {
                $table->id();
                $table->string('role');
                $table->string('permission');
                $table->boolean('allowed')->default(true);
                $table->timestamps();

                $table->unique(['role', 'permission']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('role_permissions');
    }
};
