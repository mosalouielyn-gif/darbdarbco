<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (! Schema::hasColumn('users', 'username')) {
                    $table->string('username')->nullable()->unique()->after('email');
                }
                if (! Schema::hasColumn('users', 'role') && ! Schema::hasColumn('users', 'role_id')) {
                    $table->string('role')->default('production_clerk')->after('password');
                }
                if (! Schema::hasColumn('users', 'active') && ! Schema::hasColumn('users', 'is_active')) {
                    $table->boolean('active')->default(true);
                }
                if (! Schema::hasColumn('users', 'last_login_at')) {
                    $table->timestamp('last_login_at')->nullable();
                }
            });
        }

        if (! Schema::hasTable('beneficiaries')) {
            Schema::create('beneficiaries', function (Blueprint $table) {
            $table->id();
            $table->string('beneficiary_code')->unique();
            $table->string('name');
            $table->string('contact_number')->nullable();
            $table->string('address')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            });
        }

        if (! Schema::hasTable('harvest_records')) {
            Schema::create('harvest_records', function (Blueprint $table) {
            $table->id();
            $table->date('harvest_date');
            $table->foreignId('beneficiary_id')->nullable()->constrained()->nullOnDelete();
            $table->string('beneficiary_name');
            $table->string('harvester_name');
            $table->unsignedInteger('buligs_11_weeks')->default(0);
            $table->unsignedInteger('buligs_12_weeks')->default(0);
            $table->unsignedInteger('buligs_13_weeks')->default(0);
            $table->unsignedInteger('buligs_14_weeks')->default(0);
            $table->unsignedInteger('total_buligs')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['harvest_date', 'beneficiary_id']);
            });
        }

        if (! Schema::hasTable('production_box_records')) {
            Schema::create('production_box_records', function (Blueprint $table) {
            $table->id();
            $table->string('record_no')->nullable()->unique();
            $table->date('production_date');
            $table->foreignId('beneficiary_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('class_a_big_hands')->default(0);
            $table->unsignedInteger('class_a_small_hands')->default(0);
            $table->unsignedInteger('class_a_cps')->default(0);
            $table->unsignedInteger('class_b_big_hands')->default(0);
            $table->unsignedInteger('class_b_small_hands')->default(0);
            $table->unsignedInteger('class_b_cps')->default(0);
            $table->unsignedInteger('special_product')->default(0);
            $table->unsignedInteger('defects_11_weeks')->default(0);
            $table->unsignedInteger('defects_12_weeks')->default(0);
            $table->unsignedInteger('defects_13_weeks')->default(0);
            $table->unsignedInteger('defects_14_weeks')->default(0);
            $table->unsignedInteger('rejects_11_weeks')->default(0);
            $table->unsignedInteger('rejects_12_weeks')->default(0);
            $table->unsignedInteger('rejects_13_weeks')->default(0);
            $table->unsignedInteger('rejects_14_weeks')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['production_date', 'beneficiary_id']);
            });
        }

        if (! Schema::hasTable('inventory_items')) {
            Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->string('item_code')->unique();
            $table->string('name');
            $table->string('category');
            $table->string('unit', 50);
            $table->decimal('on_hand', 12, 2)->default(0);
            $table->decimal('minimum_stock', 12, 2)->default(0);
            $table->decimal('unit_cost', 12, 2)->default(0);
            $table->date('stock_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['category', 'active']);
            });
        }

        if (! Schema::hasTable('inventory_transactions')) {
            Schema::create('inventory_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('reference_no')->unique();
            $table->foreignId('inventory_item_id')->constrained()->cascadeOnDelete();
            $table->string('transaction_type');
            $table->decimal('quantity', 12, 2);
            $table->decimal('unit_cost', 12, 2)->default(0);
            $table->string('beneficiary_name')->nullable();
            $table->text('reason')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('transaction_at');
            $table->timestamps();

            $table->index(['transaction_type', 'transaction_at']);
            });
        }

        if (! Schema::hasTable('restock_requests')) {
            Schema::create('restock_requests', function (Blueprint $table) {
            $table->id();
            $table->string('request_no')->unique();
            $table->foreignId('inventory_item_id')->nullable()->constrained()->nullOnDelete();
            $table->string('material_name');
            $table->string('category')->nullable();
            $table->decimal('current_quantity', 12, 2)->default(0);
            $table->decimal('requested_quantity', 12, 2);
            $table->string('priority')->default('normal');
            $table->text('reason');
            $table->text('notes')->nullable();
            $table->string('status')->default('Pending');
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_notes')->nullable();
            $table->timestamps();
            });
        } else {
            Schema::table('restock_requests', function (Blueprint $table) {
                if (! Schema::hasColumn('restock_requests', 'priority')) {
                    $table->string('priority')->default('normal');
                }
                if (! Schema::hasColumn('restock_requests', 'reason')) {
                    $table->text('reason')->nullable();
                }
                if (! Schema::hasColumn('restock_requests', 'review_notes')) {
                    $table->text('review_notes')->nullable();
                }
            });
        }

        if (! Schema::hasTable('payroll_slips')) {
            Schema::create('payroll_slips', function (Blueprint $table) {
            $table->id();
            $table->string('slip_no')->unique();
            $table->foreignId('beneficiary_id')->nullable()->constrained()->nullOnDelete();
            $table->string('beneficiary_name');
            $table->string('payroll_period');
            $table->date('harvest_date')->nullable();
            $table->foreignId('production_box_record_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('class_a_boxes')->default(0);
            $table->unsignedInteger('class_b_boxes')->default(0);
            $table->unsignedInteger('special_product_boxes')->default(0);
            $table->decimal('gross_income', 12, 2)->default(0);
            $table->decimal('total_deductions', 12, 2)->default(0);
            $table->decimal('net_income', 12, 2)->default(0);
            $table->string('validation_status')->default('Draft');
            $table->string('approval_status')->default('Pending Approval');
            $table->foreignId('prepared_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('validated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('validated_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->index(['payroll_period', 'validation_status', 'approval_status']);
            });
        } else {
            Schema::table('payroll_slips', function (Blueprint $table) {
                if (! Schema::hasColumn('payroll_slips', 'validation_status')) {
                    $table->string('validation_status')->default('Draft');
                }
                if (! Schema::hasColumn('payroll_slips', 'approval_status')) {
                    $table->string('approval_status')->default('Pending Approval');
                }
                if (! Schema::hasColumn('payroll_slips', 'prepared_by')) {
                    $table->foreignId('prepared_by')->nullable()->constrained('users')->nullOnDelete();
                }
                if (! Schema::hasColumn('payroll_slips', 'validated_by')) {
                    $table->foreignId('validated_by')->nullable()->constrained('users')->nullOnDelete();
                }
                if (! Schema::hasColumn('payroll_slips', 'approved_by')) {
                    $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
                }
                if (! Schema::hasColumn('payroll_slips', 'submitted_at')) {
                    $table->timestamp('submitted_at')->nullable();
                }
                if (! Schema::hasColumn('payroll_slips', 'validated_at')) {
                    $table->timestamp('validated_at')->nullable();
                }
                if (! Schema::hasColumn('payroll_slips', 'approved_at')) {
                    $table->timestamp('approved_at')->nullable();
                }
            });
        }

        if (! Schema::hasTable('payroll_deductions')) {
            Schema::create('payroll_deductions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_slip_id')->constrained()->cascadeOnDelete();
            $table->string('deduction_type');
            $table->string('reference_no')->nullable();
            $table->text('description')->nullable();
            $table->decimal('amount', 12, 2);
            $table->timestamps();
            });
        }

        if (! Schema::hasTable('approval_actions')) {
            Schema::create('approval_actions', function (Blueprint $table) {
            $table->id();
            $table->string('module');
            $table->string('subject_type');
            $table->unsignedBigInteger('subject_id');
            $table->string('action');
            $table->string('status');
            $table->text('reason')->nullable();
            $table->foreignId('acted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('acted_at');
            $table->timestamps();

            $table->index(['subject_type', 'subject_id']);
            });
        }

        if (! Schema::hasTable('audit_logs')) {
            Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('user_name')->nullable();
            $table->string('module');
            $table->string('action');
            $table->text('description');
            $table->string('status')->default('Completed');
            $table->timestamp('logged_at');
            $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('approval_actions');
        Schema::dropIfExists('payroll_deductions');
        Schema::dropIfExists('payroll_slips');
        Schema::dropIfExists('restock_requests');
        Schema::dropIfExists('inventory_transactions');
        Schema::dropIfExists('inventory_items');
        Schema::dropIfExists('production_box_records');
        Schema::dropIfExists('harvest_records');
        Schema::dropIfExists('beneficiaries');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['username', 'role', 'active', 'last_login_at']);
        });
    }
};
