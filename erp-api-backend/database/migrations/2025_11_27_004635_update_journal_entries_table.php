<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('journal_entries', function (Blueprint $table) {
            // 1. Status Column
            if (!Schema::hasColumn('journal_entries', 'status')) {
                $table->string('status', 20)->default('posted')->after('description')->index();
            }

            // 2. Source Column (The one causing the error)
            if (!Schema::hasColumn('journal_entries', 'source')) {
                // Ensure 'status' exists before trying to place 'source' after it.
                // If 'status' doesn't exist (unlikely given the block above, but safe), fallback to 'description'.
                $after = Schema::hasColumn('journal_entries', 'status') ? 'status' : 'description';
                $table->string('source')->nullable()->after($after)->index();
            }

            // 3. Total Column
            if (!Schema::hasColumn('journal_entries', 'total')) {
                // Determine placement based on what exists
                $after = 'description';
                if (Schema::hasColumn('journal_entries', 'source')) $after = 'source';
                elseif (Schema::hasColumn('journal_entries', 'status')) $after = 'status';

                $table->decimal('total', 20, 4)->default(0)->after($after);
            }

            // 4. Created By Column & Foreign Key
            if (!Schema::hasColumn('journal_entries', 'created_by')) {
                 // Determine placement
                 $after = 'description';
                 if (Schema::hasColumn('journal_entries', 'total')) $after = 'total';
                 elseif (Schema::hasColumn('journal_entries', 'source')) $after = 'source';

                $table->unsignedBigInteger('created_by')->nullable()->after($after);

                // Add Foreign Key constraint only if we just added the column.
                // We also ensure the 'users' table exists to avoid errors.
                if (Schema::hasTable('users')) {
                    $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('journal_entries', function (Blueprint $table) {
            // 1. Drop Foreign Key safely
            if (Schema::hasColumn('journal_entries', 'created_by')) {
                // We wrap this in a try-catch because checking if a specific constraint exists
                // is difficult across different DB drivers in Laravel.
                try {
                    // Assumes standard Laravel constraint naming convention
                    $table->dropForeign(['created_by']);
                } catch (\Exception $e) {
                    // Catch error if FK doesn't exist, proceed to drop columns
                }
            }

            // 2. Build list of columns that actually exist to drop
            $columnsToDrop = [];
            if (Schema::hasColumn('journal_entries', 'created_by')) $columnsToDrop[] = 'created_by';
            if (Schema::hasColumn('journal_entries', 'total')) $columnsToDrop[] = 'total';
            if (Schema::hasColumn('journal_entries', 'source')) $columnsToDrop[] = 'source';
            if (Schema::hasColumn('journal_entries', 'status')) $columnsToDrop[] = 'status';

            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
