<?php

namespace App\Http\Controllers\Accounts;

use App\Http\Controllers\Controller;
use App\Models\Accounts\BankStatementLine;
use App\Models\Accounts\JournalEntryLine;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use League\Csv\Reader;
use League\Csv\Statement;
use Throwable;
use Illuminate\Database\Eloquent\ModelNotFoundException; // 💡 Import this

class BankStatementController extends Controller
{
    /**
     * Upload and process a bank statement CSV.
     */
    public function uploadStatement(Request $request)
    {
        Gate::authorize('manage-financial-data');

        $validated = $request->validate([
            'file' => 'required|file|mimes:csv,txt',
            // 💡 FIX: Require the account_id
            'account_id' => 'required|integer|exists:chart_of_accounts,id',
        ]);

        $file = $request->file('file');
        $companyId = auth()->user()->company_id;
        $userId = auth()->id();

        Log::info("Starting bank statement upload for company {$companyId} by user {$userId}.");

        DB::beginTransaction();
        try {
            $csv = Reader::createFromPath($file->getPathname(), 'r');
            $csv->setHeaderOffset(0);

            // 💡 IMPORTANT: You MUST update these keys to match your bank's CSV headers
            $headerMap = [
                'date' => 'Date',
                'description' => 'Description',
                'debit' => 'Debit',
                'credit' => 'Credit',
            ];

            $records = Statement::create()->process($csv);
            $linesToInsert = [];
            $now = now();

            foreach ($records as $record) {
                if (empty($record[$headerMap['description']])) continue;

                $linesToInsert[] = [
                    'company_id' => $companyId,
                    'chart_of_account_id' => $validated['account_id'], // 💡 FIX: Save the account ID
                    'transaction_date' => $record[$headerMap['date']],
                    'description' => $record[$headerMap['description']],
                    'debit' => $this->cleanCurrency($record[$headerMap['debit']]),
                    'credit' => $this->cleanCurrency($record[$headerMap['credit']]),
                    'is_matched' => false,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            if (empty($linesToInsert)) {
                return response()->json(['message' => 'No valid transaction lines found in the file.'], 422);
            }

            BankStatementLine::insert($linesToInsert);
            DB::commit();

            Log::info("Successfully imported " . count($linesToInsert) . " bank statement lines for company {$companyId}.");
            return response()->json([
                'status' => 'success',
                'message' => 'Successfully imported ' . count($linesToInsert) . ' transaction lines.',
                'imported_count' => count($linesToInsert)
            ], 201);

        } catch (Throwable $e) {
            DB::rollBack();
            Log::error("Bank statement import failed: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);

            if (str_contains($e->getMessage(), 'Undefined array key')) {
                return response()->json(['message' => 'Import failed. Please ensure CSV headers match: Date, Description, Debit, Credit.'], 422);
            }

            return response()->json(['message' => 'An error occurred during import.'], 500);
        }
    }

    /**
     * Get all unmatched bank statement lines FOR A SPECIFIC ACCOUNT.
     */
    public function index(Request $request)
    {
        Gate::authorize('manage-financial-data');

        // 💡 FIX: Validate the account_id from the query string
        $validated = $request->validate([
            'account_id' => 'required|integer|exists:chart_of_accounts,id'
        ]);

        $lines = BankStatementLine::where('company_id', auth()->user()->company_id)
            ->where('chart_of_account_id', $validated['account_id']) // 💡 FIX: Filter by account
            ->where('is_matched', false)
            ->orderBy('transaction_date')
            ->get();

        return response()->json($lines);
    }

    /**
     * Get unreconciled ledger entries correctly using relationship
     */
    public function getUnreconciledLedgerLines(Request $request)
    {
        Gate::authorize('manage-financial-data');

        $validated = $request->validate([
            'account_id' => 'required|integer|exists:chart_of_accounts,id'
        ]);

        $companyId = auth()->user()->company_id;

        // 💡 FIX: Query company_id via the parent relationship
        $lines = JournalEntryLine::where('chart_of_account_id', $validated['account_id'])
            ->where('is_reconciled', false)
            ->whereHas('journalEntry', function ($query) use ($companyId) {
                $query->where('company_id', $companyId);
            })
            ->with('journalEntry:id,transaction_date,description')
            ->get();
        // 💡 END FIX

        return response()->json($lines);
    }

    /**
     * Match bank lines to ledger lines.
     */
    public function reconcileTransactions(Request $request)
    {
        Gate::authorize('manage-financial-data');

        $validated = $request->validate([
            'bank_line_ids' => 'required|array|min:1',
            'bank_line_ids.*' => 'required|integer|exists:bank_statement_lines,id',
            'ledger_line_ids' => 'required|array|min:1',
            'ledger_line_ids.*' => 'required|integer|exists:journal_entry_lines,id',
        ]);

        $userId = auth()->id();
        $now = now();

        DB::beginTransaction();
        try {
            $bankLines = BankStatementLine::whereIn('id', $validated['bank_line_ids'])->get();
            $bankTotal = $bankLines->sum('credit') - $bankLines->sum('debit');

            $ledgerLines = JournalEntryLine::whereIn('id', $validated['ledger_line_ids'])->get();
            $ledgerTotal = $ledgerLines->sum('debit') - $ledgerLines->sum('credit');

            if (abs($bankTotal - $ledgerTotal) > 0.05) { // Increased tolerance slightly
                return response()->json(['message' => "Totals do not match. Bank: {$bankTotal} | Ledger: {$ledgerTotal}"], 422);
            }

            BankStatementLine::whereIn('id', $validated['bank_line_ids'])
                ->update([
                    'is_matched' => true,
                    'matched_by' => $userId,
                    'matched_at' => $now,
                    'journal_entry_line_id' => $validated['ledger_line_ids'][0]
                ]);

            JournalEntryLine::whereIn('id', $validated['ledger_line_ids'])
                ->update([
                    'is_reconciled' => true,
                    'reconciled_at' => $now
                ]);

            DB::commit();
            return response()->json(['status' => 'success', 'message' => 'Transactions successfully reconciled.']);

        } catch (Throwable $e) {
            DB::rollBack();
            Log::error("Reconciliation failed: " . $e->getMessage());
            return response()->json(['message' => 'An unexpected error occurred.'], 500);
        }
    }

    /**
     * Helper function to clean currency strings
     */
    private function cleanCurrency($value): float
    {
        if (empty($value)) return 0.00;
        $cleaned = preg_replace('/[^\d\.-]/', '', $value);
        return (float) $cleaned;
    }
}
