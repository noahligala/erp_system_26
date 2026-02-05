<?php

namespace App\Http\Controllers\Accounts;

use App\Http\Controllers\Controller;
use App\Models\Accounts\JournalEntry;
use App\Services\JournalEntryService;

use App\Exceptions\JournalEntryValidationException;
use App\Exceptions\UnbalancedJournalEntryException;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Throwable;

class JournalEntryController extends Controller
{
    protected JournalEntryService $journalEntryService;

    public function __construct(JournalEntryService $journalEntryService)
    {
        $this->journalEntryService = $journalEntryService;
    }

    /**
     * Display all journal entries for the authenticated company.
     * NOTE: We keep the list lightweight (no lines) for performance.
     * Use show() to fetch a full entry with lines+accounts.
     */
    public function index(Request $request)
    {
        Gate::authorize('view-financial-reports');

        try {
            $query = JournalEntry::query()
                ->where('company_id', auth()->user()->company_id);

            // Optional filter for source (e.g., Manual Entry)
            if ($request->filled('source')) {
                $query->where('source', $request->source);
            }

            // Pagination for scalability
            $entries = $query
                ->orderByDesc('transaction_date')
                ->paginate($request->integer('per_page', 20));

            // ✅ Consistent response envelope with show()
            return response()->json([
                'status' => 'success',
                'data' => $entries, // paginator object (data, links, meta, etc.)
            ]);

        } catch (Throwable $e) {
            Log::error("Failed to fetch journal entries: {$e->getMessage()}", [
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Unable to fetch journal entries.',
            ], 500);
        }
    }

    /**
     * Store a new MANUAL journal entry.
     * Uses the Service to ensure balancing and consistency.
     */
    public function store(Request $request)
    {
        Gate::authorize('manage-financial-data');

        $validated = $request->validate([
            'transaction_date' => 'required|date',
            'description' => 'required|string|max:255',
            'lines' => 'required|array|min:2',

            // Must exist in chart_of_accounts and belong to the authenticated company
            'lines.*.account_id' => [
                'required',
                Rule::exists('chart_of_accounts', 'id')->where(
                    fn ($q) => $q->where('company_id', auth()->user()->company_id)
                )
            ],

            'lines.*.debit' => 'nullable|numeric|min:0',
            'lines.*.credit' => 'nullable|numeric|min:0',
            'lines.*.description' => 'nullable|string|max:255', // optional line-level description
        ]);

        try {
            $headerDescription = $validated['description'];

            // ✅ Format lines to match the Service expectation:
            // ['account_id', 'debit', 'credit', 'line_description']
            $formattedLines = collect($validated['lines'])
                ->map(function ($line) use ($headerDescription) {
                    return [
                        'account_id' => $line['account_id'],
                        'debit' => $line['debit'] ?? 0,
                        'credit' => $line['credit'] ?? 0,
                        'line_description' => $line['description'] ?? $headerDescription,
                    ];
                })
                ->toArray();

            // ✅ Delegate creation to the Service (handles balancing + transaction)
            $entry = $this->journalEntryService->createJournalEntry(
                $validated['transaction_date'],
                $validated['description'],
                'Manual Entry',
                $formattedLines,
                null
            );

            // Load relationships for the response
            $entry->load('lines.account:id,account_name,account_code');

            return response()->json([
                'status' => 'success',
                'message' => 'Journal entry created successfully.',
                'data' => $entry,
            ], 201);

        } catch (JournalEntryValidationException|UnbalancedJournalEntryException $e) {
            Log::warning("Manual journal entry failed validation: {$e->getMessage()}");

            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);

        } catch (Throwable $e) {
            Log::error("Journal entry creation failed: {$e->getMessage()}", [
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to create journal entry. An unexpected error occurred.',
            ], 500);
        }
    }

    /**
     * Display a single journal entry (full payload with lines + account).
     */
    public function show($id)
    {
        Gate::authorize('view-financial-reports');

        try {
            $entry = JournalEntry::with('lines.account:id,account_name,account_code')
                ->where('company_id', auth()->user()->company_id)
                ->findOrFail($id);

            return response()->json([
                'status' => 'success',
                'data' => $entry,
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Entry not found.',
            ], 404);
        }
    }

    /**
     * Delete a manual journal entry.
     * Prevent deleting system-generated entries to maintain audit integrity.
     */
    public function destroy($id)
    {
        Gate::authorize('manage-financial-data');

        try {
            $entry = JournalEntry::where('company_id', auth()->user()->company_id)
                ->findOrFail($id);

            // Only allow deleting "Manual Entry" sources that are not linked to another object.
            if (!empty($entry->referenceable_type) || $entry->source !== 'Manual Entry') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Cannot delete system-generated entries directly. Please reverse or delete the source document (e.g., the Invoice or Payment).'
                ], 403);
            }

            DB::beginTransaction();

            // Even if you have ON DELETE CASCADE, explicit deletion is fine.
            $entry->lines()->delete();
            $entry->delete();

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Manual journal entry deleted successfully.',
            ]);

        } catch (Throwable $e) {
            DB::rollBack();

            Log::error("Journal entry deletion failed: {$e->getMessage()}", [
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to delete journal entry.',
            ], 500);
        }
    }
}
