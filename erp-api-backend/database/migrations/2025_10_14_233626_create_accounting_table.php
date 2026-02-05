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
        // 1. Chart of Accounts: Create this new table as it doesn't exist.
        Schema::create('chart_of_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->string('account_code');
            $table->string('account_name');
            $table->enum('account_type', ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['company_id', 'account_code']);
            $table->unique(['company_id', 'account_name']);
        });

        // 2. Journal Entries: Alter the existing table to match the new professional structure.
        Schema::table('journal_entries', function (Blueprint $table) {
            // Rename old columns to the new standard
            $table->renameColumn('date', 'transaction_date');
            $table->renameColumn('memo', 'description');

            // Add the new, required columns
            // 💡 FIX: Removed the line that tried to re-add 'company_id' as it already exists.
            $table->morphs('referenceable'); // This will add referenceable_id and referenceable_type

            // Drop the old, now-redundant columns
            $table->dropUnique(['reference']); // First, drop the unique constraint
            $table->dropColumn('reference');
            $table->dropConstrainedForeignId('user_id');
        });

        // 3. Journal Entry Lines: Create this new table as it doesn't exist.
        Schema::create('journal_entry_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('journal_entry_id')->constrained()->onDelete('cascade');
            $table->foreignId('chart_of_account_id')->constrained();
            $table->decimal('debit', 15, 2)->default(0);
            $table->decimal('credit', 15, 2)->default(0);
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop the fully new tables first
        Schema::dropIfExists('journal_entry_lines');
        Schema::dropIfExists('chart_of_accounts');

        // Revert the changes to the journal_entries table to its original state
        Schema::table('journal_entries', function (Blueprint $table) {
            // Rename columns back to original
            $table->renameColumn('transaction_date', 'date');
            $table->renameColumn('description', 'memo');

            // Drop the columns we added in this migration's 'up' method
            $table->dropMorphs('referenceable');
            // 💡 FIX: 'company_id' is no longer dropped as it wasn't added by this migration.

            // Re-add the old columns
            $table->string('reference')->unique();
            $table->foreignId('user_id')->constrained();
        });
    }
};

