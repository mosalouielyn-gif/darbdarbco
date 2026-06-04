<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'contact_information')) {
                $table->string('contact_information')->nullable()->after('last_login_at');
            }

            if (! Schema::hasColumn('users', 'remarks')) {
                $table->text('remarks')->nullable()->after('contact_information');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'remarks')) {
                $table->dropColumn('remarks');
            }

            if (Schema::hasColumn('users', 'contact_information')) {
                $table->dropColumn('contact_information');
            }
        });
    }
};
