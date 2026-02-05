<?php

namespace App\Services;

use App\Models\Accounts\ChartOfAccount;
use App\Models\Accounts\JournalEntry;
use App\Models\Accounts\JournalEntryLine;
use App\Exceptions\JournalEntryValidationException;
use App\Exceptions\UnbalancedJournalEntryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\Model;
use Throwable;

class JournalEntryService
{
    /**
     * The precision for financial calculations (BC Math scale).
     */
    protected int $precision = 2;

    /**
     * Creates a new, balanced, **POSTED** journal entry directly.
     * Use this for system-generated entries that should affect books immediately.
     *
     * @param string $transactionDate The date of the transaction (YYYY-MM-DD).
     * @param string $description Description for the journal entry header.
     * @param string $sourceType Source system context (e.g., 'Manual Entry', 'Sales Invoice').
     * @param array $lines An array of line items: ['account_id', 'debit', 'credit', 'line_description'(opt)].
     * @param Model|null $relatedModel Optional: The polymorphic model this JE relates to.
     * @return JournalEntry The created and posted JournalEntry model.
     * @throws UnbalancedJournalEntryException|JournalEntryValidationException|Throwable
     */
    public function createJournalEntry(
        string $transactionDate,
        string $description,
        string $sourceType,
        array $lines,
        ?Model $relatedModel = null
    ): JournalEntry {
        return $this->persistJournalEntry(
            $transactionDate,
            $description,
            $sourceType,
            $lines,
            'posted', // <-- Status is 'posted'
            $relatedModel
        );
    }

    /**
     * Creates a new, balanced, **DRAFT** journal entry.
     * Use this for entries that require review before affecting the general ledger.
     *
     * @param string $transactionDate
     * @param string $description
     * @param string $sourceType
     * @param array $lines
     * @param Model|null $relatedModel
     * @return JournalEntry The created draft JournalEntry model.
     * @throws UnbalancedJournalEntryException|JournalEntryValidationException|Throwable
     */
    public function createDraftEntry(
        string $transactionDate,
        string $description,
        string $sourceType,
        array $lines,
        ?Model $relatedModel = null
    ): JournalEntry {
        return $this->persistJournalEntry(
            $transactionDate,
            $description,
            $sourceType,
            $lines,
            'draft', // <-- Status is 'draft'
            $relatedModel
        );
    }

    /**
     * Posts a previously created draft journal entry to the general ledger.
     * This changes its status from 'draft' to 'posted'.
     *
     * @param JournalEntry $draftEntry The draft entry to post.
     * @return JournalEntry The updated, posted entry.
     * @throws JournalEntryValidationException If the entry is not a draft or belongs to another company.
     */
    public function postDraftEntry(JournalEntry $draftEntry): JournalEntry
    {
        if ($draftEntry->company_id !== Auth::user()->company_id) {
            throw new JournalEntryValidationException("Unauthorized attempt to post another company's journal entry.");
        }

        if ($draftEntry->status !== 'draft') {
            throw new JournalEntryValidationException("Entry #{$draftEntry->id} is not in 'draft' status and cannot be posted.");
        }

        // Re-validate balancing just to be safe (though it should have balanced on creation)
        if (bccomp((string)$draftEntry->total, (string)$draftEntry->lines->sum('credit'), $this->precision) !== 0) {
             // This indicates data corruption of a draft entry
             Log::critical("Attempted to post an unbalanced draft entry #{$draftEntry->id}.");
             throw new UnbalancedJournalEntryException("Draft entry #{$draftEntry->id} is corrupted and does not balance. Cannot post.");
        }

        $draftEntry->status = 'posted';
        // Optionally update updated_at or add a 'posted_at' timestamp here
        $draftEntry->save();

        Log::info("Draft Journal Entry #{$draftEntry->id} has been posted successfully.", [
            'company_id' => $draftEntry->company_id,
            'user_id' => Auth::id()
        ]);

        return $draftEntry;
    }

    /**
     * Reverses an existing POSTED journal entry.
     * Industry standard approach for correcting errors instead of deleting.
     *
     * @param JournalEntry $originalEntry The entry to reverse.
     * @param string $reversalDate Date the reversal should be posted.
     * @param string $reason Reason for the reversal.
     * @return JournalEntry The new reversing entry.
     * @throws Throwable|JournalEntryValidationException
     */
    public function reverseJournalEntry(JournalEntry $originalEntry, string $reversalDate, string $reason): JournalEntry
    {
        if ($originalEntry->company_id !== Auth::user()->company_id) {
            throw new JournalEntryValidationException("Unauthorized access to reverse this journal entry.");
        }

        if ($originalEntry->status !== 'posted') {
             throw new JournalEntryValidationException("Only 'posted' entries can be reversed.");
        }

        $originalEntry->load('lines');

        $reversalLines = [];
        foreach ($originalEntry->lines as $line) {
            // Swap Debits and Credits precisely
            $reversalLines[] = [
                // Use the original account ID
                'account_id' => $line->chart_of_account_id,
                // Original Credit becomes new Debit
                'debit' => $line->credit,
                // Original Debit becomes new Credit
                'credit' => $line->debit,
                'line_description' => "Reversal: " . ($line->description ?? $originalEntry->description)
            ];
        }

        $newDescription = "[Reversal of JE #{$originalEntry->id}] - $reason";
        $sourceType = "Reversal Entry";

        // Create the new entry linking back to the original as the "model"
        // This marks the new entry as referencing the old one.
        // Reversals are posted immediately.
        $reversingEntry = $this->createJournalEntry(
            $reversalDate,
            $newDescription,
            $sourceType,
            $reversalLines,
            $originalEntry // Link the new entry to the old one polymorphically
        );

        Log::info("Journal Entry #{$originalEntry->id} reversed by newly created entry #{$reversingEntry->id}.");

        return $reversingEntry;
    }


    // ========================================================================
    // PRIVATE HELPER METHODS
    // ========================================================================

    /**
     * Internal helper to validate inputs, prepare data, and persist the journal entry.
     * This avoids code duplication between creating drafts and posted entries.
     */
    private function persistJournalEntry(
        string $transactionDate,
        string $description,
        string $sourceType,
        array $lines,
        string $status, // 'draft' or 'posted'
        ?Model $relatedModel = null
    ): JournalEntry {
        // 1. Basic Input Validation
        if (empty($lines) || count($lines) < 2) {
             throw new JournalEntryValidationException("A journal entry must contain at least two items (e.g., one debit and one credit).");
        }

        $companyId = Auth::user()->company_id;
        $totalDebit = '0.00';
        $totalCredit = '0.00';
        $formattedLines = [];
        // Cache account IDs to ensure they exist and belong to company
        $validAccountIds = ChartOfAccount::where('company_id', $companyId)
            ->whereIn('id', array_column($lines, 'account_id'))
            ->pluck('id')
            ->toArray();

        // 2. Process and Validate Lines
        foreach ($lines as $index => $line) {
            // Validate Account ID existence for this company
            if (!in_array(($line['account_id'] ?? null), $validAccountIds)) {
                throw new JournalEntryValidationException("Line " . ($index + 1) . ": Invalid chart of account ID for this company.");
            }

            // Ensure values are positive numbers. Use strings for BC Math precision.
            $debit = isset($line['debit']) ? number_format((float)$line['debit'], $this->precision, '.', '') : '0.00';
            $credit = isset($line['credit']) ? number_format((float)$line['credit'], $this->precision, '.', '') : '0.00';

            if (bccomp($debit, '0.00', $this->precision) < 0 || bccomp($credit, '0.00', $this->precision) < 0) {
                 throw new JournalEntryValidationException("Line " . ($index + 1) . ": Debits and credits cannot be negative.");
            }

            if ((bccomp($debit, '0.00', $this->precision) === 0 && bccomp($credit, '0.00', $this->precision) === 0)) {
                 throw new JournalEntryValidationException("Line " . ($index + 1) . ": Line must have a debit or credit value.");
            }

            if (bccomp($debit, '0.00', $this->precision) > 0 && bccomp($credit, '0.00', $this->precision) > 0) {
                 throw new JournalEntryValidationException("Line " . ($index + 1) . ": A single line cannot have both a debit and credit value.");
            }

            // Accumulate totals using BC Math for precision
            $totalDebit = bcadd($totalDebit, $debit, $this->precision);
            $totalCredit = bcadd($totalCredit, $credit, $this->precision);

            $formattedLines[] = [
                // Ensure correct column mapping
                'chart_of_account_id' => $line['account_id'],
                'debit' => $debit,
                'credit' => $credit,
                // Use specific line description if present, otherwise fallback to header description
                'description' => $line['line_description'] ?? $description,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // 3. Verify Balancing (Crucial ERP Requirement)
        if (bccomp($totalDebit, $totalCredit, $this->precision) !== 0) {
             Log::warning("Journal Entry failed balancing check.", [
                 'total_debit' => $totalDebit,
                 'total_credit' => $totalCredit,
                 'difference' => bcsub($totalDebit, $totalCredit, $this->precision)
             ]);
             throw new UnbalancedJournalEntryException("Journal entry does not balance. Total Debits: {$totalDebit}, Total Credits: {$totalCredit}");
        }

        // 4. Persist to Database Atomically
        try {
            DB::beginTransaction();

            $entryData = [
                'company_id' => $companyId,
                'transaction_date' => $transactionDate,
                'description' => $description,
                'source' => $sourceType,
                'status' => $status, // Set status based on caller parameter
                'total' => $totalDebit,
                'created_by' => Auth::id(),
            ];

            // Link polymorphic relation if provided
            if ($relatedModel) {
                $entryData['referenceable_id'] = $relatedModel->getKey();
                $entryData['referenceable_type'] = $relatedModel->getMorphClass();
            }

            $journalEntry = JournalEntry::create($entryData);

            // Map the new ID to the lines
            foreach ($formattedLines as &$lineData) {
                $lineData['journal_entry_id'] = $journalEntry->id;
            }
            unset($lineData); // Break reference

            // Bulk insert lines for performance
            JournalEntryLine::insert($formattedLines);

            DB::commit();

            Log::info("Journal Entry #{$journalEntry->id} created with status '{$status}' via {$sourceType}.", [
                'company_id' => $companyId,
                'total' => $totalDebit
            ]);

            return $journalEntry;

        } catch (Throwable $e) {
            DB::rollBack();
            Log::error("Critical error persisting Journal Entry: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'inputs' => func_get_args()
            ]);
            throw $e;
        }
    }
}
