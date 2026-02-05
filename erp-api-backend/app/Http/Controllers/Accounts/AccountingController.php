<?php

namespace App\Http\Controllers\Accounts;

use App\Http\Controllers\Controller;
use App\Models\Accounts\ArchivedReport;
use App\Models\Accounts\ChartOfAccount;
use App\Services\AccountingReportService;
use App\Services\JournalEntryService;
use Carbon\Carbon;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Throwable;

class AccountingController extends Controller
{
    use AuthorizesRequests;

    /**
     * The accounting report service instance.
     */
    protected AccountingReportService $reportService;

    /**
     * Create a new controller instance.
     * Dependency injection will automatically provide the service.
     */
    public function __construct(AccountingReportService $reportService)
    {
        $this->reportService = $reportService;
    }

    /**
     * Helper method to set up the service context.
     * This ensures the service knows which company we are reporting on.
     */
    protected function setupService(): void
    {
        if (!auth()->check() || !auth()->user()->company) {
            throw new \Exception('User is not authenticated or does not belong to a company.');
        }
        // Set the company context for the service ONCE for this request
        $this->reportService->setCompany(auth()->user()->company);
    }

    /**
     * Helper to archive the generated report data.
     */
    protected function archiveReport(string $reportType, ?Carbon $startDate, Carbon $endDate, array $reportData)
    {
        return ArchivedReport::create([
            'company_id' => auth()->user()->company_id,
            'report_type' => $reportType,
            'start_date' => $startDate?->toDateString(),
            'end_date' => $endDate->toDateString(),
            'report_data' => $reportData,
            'created_by' => auth()->id(),
            'status' => 'Archived',
        ]);
    }

    // ------------------------------------------------------------------------
    // CORE FINANCIAL REPORTS
    // ------------------------------------------------------------------------

    /**
     * Generate a Trial Balance report.
     */
    public function getTrialBalance(Request $request)
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();
            $validated = $request->validate(['end_date' => 'required|date_format:Y-m-d']);
            $endDate = Carbon::parse($validated['end_date'])->endOfDay();

            $reportData = $this->reportService->generateTrialBalance($endDate);
            $this->archiveReport('Trial Balance', null, $endDate, $reportData);

            return response()->json($reportData);
        } catch (Throwable $e) {
            Log::error('Trial Balance generation failed: ' . $e->getMessage() . ' Trace: ' . $e->getTraceAsString());
            return response()->json(['message' => 'An unexpected error occurred while generating the trial balance.'], 500);
        }
    }

    /**
     * Generate a Profit & Loss (Income Statement) report.
     */
    public function getProfitAndLoss(Request $request)
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();
            $validated = $request->validate([
                'start_date' => 'required|date_format:Y-m-d',
                'end_date' => 'required|date_format:Y-m-d|after_or_equal:start_date'
            ]);

            $startDate = Carbon::parse($validated['start_date'])->startOfDay();
            $endDate = Carbon::parse($validated['end_date'])->endOfDay();

            $reportData = $this->reportService->generateProfitAndLoss($startDate, $endDate);
            $this->archiveReport('Profit & Loss', $startDate, $endDate, $reportData);

            return response()->json($reportData);
        } catch (Throwable $e) {
            Log::error('Profit & Loss generation failed: ' . $e->getMessage() . ' Trace: ' . $e->getTraceAsString());
            return response()->json(['message' => 'An unexpected error occurred while generating the Profit & Loss statement.'], 500);
        }
    }

    /**
     * Generate a Balance Sheet report.
     */
    public function getBalanceSheet(Request $request)
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();
            $validated = $request->validate(['end_date' => 'required|date_format:Y-m-d']);
            $endDate = Carbon::parse($validated['end_date'])->endOfDay();

            $reportData = $this->reportService->generateBalanceSheet($endDate);
            $this->archiveReport('Balance Sheet', null, $endDate, $reportData);

            return response()->json($reportData);
        } catch (Throwable $e) {
            Log::error('Balance sheet generation failed: ' . $e->getMessage() . ' Trace: ' . $e->getTraceAsString());
            return response()->json(['message' => 'An unexpected error occurred.'], 500);
        }
    }

    /**
     * Generate the Statement of Cash Flows (Indirect Method).
     */
    public function generateCashFlowStatement(Request $request)
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();
            $validated = $request->validate([
                'start_date' => 'required|date_format:Y-m-d',
                'end_date' => 'required|date_format:Y-m-d|after_or_equal:start_date'
            ]);

            $startDate = Carbon::parse($validated['start_date'])->startOfDay();
            $endDate = Carbon::parse($validated['end_date'])->endOfDay();

            $reportData = $this->reportService->generateCashFlowStatement($startDate, $endDate);
            $this->archiveReport('Cash Flow Statement', $startDate, $endDate, $reportData);

            return response()->json($reportData);
        } catch (Throwable $e) {
            Log::error('Cash Flow Statement generation failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'An unexpected error occurred while generating the Cash Flow Statement.'], 500);
        }
    }

    /**
     * Generate a General Ledger report.
     */
    public function getGeneralLedger(Request $request)
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();
            $validated = $request->validate([
                'account_id' => ['required', 'integer', Rule::exists('chart_of_accounts', 'id')->where('company_id', auth()->user()->company_id)],
                'start_date' => 'required|date_format:Y-m-d',
                'end_date' => 'required|date_format:Y-m-d|after_or_equal:start_date',
            ]);

            $startDate = Carbon::parse($validated['start_date'])->startOfDay();
            $endDate = Carbon::parse($validated['end_date'])->endOfDay();

            $reportData = $this->reportService->generateGeneralLedger($validated['account_id'], $startDate, $endDate);
            // GL is typically not archived as it is a detailed view

            return response()->json($reportData);
        } catch (\InvalidArgumentException $e) {
            Log::warning("General Ledger generation validation error: " . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (Throwable $e) {
            Log::error('General Ledger generation failed: ' . $e->getMessage() . ' Trace: ' . $e->getTraceAsString());
            return response()->json(['message' => 'An unexpected error occurred.'], 500);
        }
    }

    /**
     * Get key financial ratios for the dashboard.
     */
    public function getKeyRatios(Request $request)
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();
            $reportData = $this->reportService->getKeyRatios();
            // Ratios are typically dashboard data, not archived

            return response()->json($reportData);
        } catch (Throwable $e) {
            Log::error('Key Ratio calculation failed: ' . $e->getMessage() . ' Trace: ' . $e->getTraceAsString());
            return response()->json(['message' => 'An unexpected error occurred while calculating key ratios.'], 500);
        }
    }

    /**
     * Generate a Budget vs. Actuals report for a specific period.
     */
    public function getBudgetVsActuals(Request $request)
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();
            $validated = $request->validate([
                'start_date' => 'required|date_format:Y-m-d',
                'end_date' => 'required|date_format:Y-m-d|after_or_equal:start_date'
            ]);

            $startDate = Carbon::parse($validated['start_date'])->startOfDay();
            $endDate = Carbon::parse($validated['end_date'])->endOfDay();

            $reportData = $this->reportService->generateBudgetVsActuals($startDate, $endDate);
            $this->archiveReport('Budget vs Actuals', $startDate, $endDate, $reportData);

            return response()->json($reportData);
        } catch (Throwable $e) {
            Log::error('Budget vs Actuals report failed: ' . $e->getMessage() . ' Trace: ' . $e->getTraceAsString());
            return response()->json(['message' => 'Failed to generate Budget Report.'], 500);
        }
    }

    // =================================================================
    // OPERATIONAL METHODS (Not Core Reporting)
    // =================================================================

    /**
     * Display the company's chart of accounts with current balances.
     */
    public function chartOfAccounts()
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();
            $companyId = auth()->user()->company_id;

            // Efficiently query accounts with their summed balances
            $accounts = ChartOfAccount::where('company_id', $companyId)
                ->withSum(['journalLines' => fn ($q) => null], 'debit')
                ->withSum(['journalLines' => fn ($q) => null], 'credit')
                ->orderBy('account_code')
                ->get()
                ->map(function ($account) {
                    // Calculate Raw Balance (Debit - Credit)
                    $raw_balance = ($account->journal_lines_sum_debit ?? 0) - ($account->journal_lines_sum_credit ?? 0);

                    // Adjust sign for display using the Service's logic (via a public wrapper if needed, or replicating here)
                    // Since 'adjustBalanceSign' is protected in the service, we replicate the simple logic here for the list view.
                    $balance = $raw_balance;
                    if (in_array($account->account_type, ['Liability', 'Equity', 'Revenue', 'Income', 'Other Income', 'Sales'])) {
                        $balance = -$raw_balance;
                    }

                    $account->balance = $balance;

                    // Cleanup temporary attributes
                    unset($account->journal_lines_sum_debit, $account->journal_lines_sum_credit);
                    return $account;
                });

            return response()->json($accounts);
        } catch (Throwable $e) {
            Log::error('Failed to retrieve chart of accounts: ' . $e->getMessage() . ' Trace: ' . $e->getTraceAsString());
            return response()->json(['message' => 'An unexpected error occurred while fetching chart of accounts.'], 500);
        }
    }

    /**
     * Store a Payment Voucher.
     * This is an operational action, not a report, so it uses the JournalEntryService directly.
     */
    public function storePaymentVoucher(Request $request, JournalEntryService $journalEntryService)
    {
        Gate::authorize('manage-financial-data');

        $validated = $request->validate([
            'transaction_date' => 'required|date_format:Y-m-d',
            'payee' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'payment_account_id' => ['required', 'integer', Rule::exists('chart_of_accounts', 'id')->where('company_id', auth()->user()->company_id)],
            'lines' => 'required|array|min:1',
            'lines.*.account_id' => ['required', 'integer', Rule::exists('chart_of_accounts', 'id')->where('company_id', auth()->user()->company_id)],
            'lines.*.amount' => 'required|numeric|min:0.01',
            'lines.*.description' => 'nullable|string|max:255',
        ]);

        $companyId = auth()->user()->company_id;
        $totalAmount = round(collect($validated['lines'])->sum('amount'), 2);

        // Validate that the payment account is indeed a cash asset
        $paymentAccount = ChartOfAccount::where('company_id', $companyId)
            ->where('id', $validated['payment_account_id'])
            ->where('account_subtype', 'asset_cash')
            ->first();

        if (!$paymentAccount) {
            // Fallback check if subtype isn't fully populated yet: simply check it's an Asset
            $fallbackCheck = ChartOfAccount::where('company_id', $companyId)
                ->where('id', $validated['payment_account_id'])
                ->where('account_type', 'Asset')
                ->exists();

            if (!$fallbackCheck) {
                return response()->json(['message' => 'Invalid payment account. Must be a valid Asset account.'], 422);
            }
        }

        DB::beginTransaction();
        try {
            $jeDescription = "Payment Voucher: " . ($validated['description'] ?? "Paid to {$validated['payee']}");
            $jeLines = [];

            // 1. CREDIT the Bank/Cash Account (Money leaving)
            $jeLines[] = [
                'account_id' => $validated['payment_account_id'],
                'debit' => 0,
                'credit' => $totalAmount,
                'line_description' => "Payment to " . $validated['payee']
            ];

            // 2. DEBIT the Expense/Liability Accounts (What was paid for)
            foreach ($validated['lines'] as $line) {
                $jeLines[] = [
                    'account_id' => $line['account_id'],
                    'debit' => round($line['amount'], 2),
                    'credit' => 0,
                    'line_description' => $line['description'] ?? null
                ];
            }

            // Create the entry using the JournalEntryService
            $journalEntry = $journalEntryService->createJournalEntry(
                $validated['transaction_date'],
                $jeDescription,
                'Payment Voucher',
                $jeLines
            );

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Payment voucher created successfully.',
                'data' => $journalEntry->load('lines.account:id,account_name,account_code')
            ], 201);

        } catch (\InvalidArgumentException | \Exception $e) {
            DB::rollBack();
            Log::warning('Payment voucher creation failed validation: ' . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Failed to create payment voucher: ' . $e->getMessage() . ' Trace: ' . $e->getTraceAsString());
            return response()->json(['message' => 'An unexpected error occurred.'], 500);
        }
    }

    // ------------------------------------------------------------------------
    // ARCHIVED REPORT METHODS
    // ------------------------------------------------------------------------

    /**
     * List all archived reports.
     */
    public function listArchivedReports(Request $request)
    {
        Gate::authorize('view-financial-reports');

        $query = ArchivedReport::where('company_id', auth()->user()->company_id)
            ->latest('created_at');

        return response()->json($query->paginate($request->get('per_page', 20)));
    }

    /**
     * Show a single archived report (read-only).
     */
    public function showArchivedReport(ArchivedReport $archivedReport)
    {
        Gate::authorize('view-financial-reports');

        if ($archivedReport->company_id !== auth()->user()->company_id) {
            abort(403);
        }

        return response()->json($archivedReport);
    }
}
