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

    protected AccountingReportService $reportService;

    public function __construct(AccountingReportService $reportService)
    {
        $this->reportService = $reportService;
    }

    /*
    |--------------------------------------------------------------------------
    | Shared Helpers
    |--------------------------------------------------------------------------
    */

    protected function setupService(): void
    {
        if (!auth()->check() || !auth()->user()->company) {
            throw new \Exception('User is not authenticated or does not belong to a company.');
        }

        $this->reportService->setCompany(auth()->user()->company);
    }

    protected function archiveReport(
        string $reportType,
        ?Carbon $startDate,
        Carbon $endDate,
        array $reportData
    ): ArchivedReport {
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

    private function dashboardPeriod(Request $request): array
    {
        $validated = $request->validate([
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date' => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
            'months' => 'nullable|integer|min:1|max:36',
        ]);

        $endDate = isset($validated['end_date'])
            ? Carbon::parse($validated['end_date'])->endOfDay()
            : now()->endOfDay();

        $startDate = isset($validated['start_date'])
            ? Carbon::parse($validated['start_date'])->startOfDay()
            : $endDate->copy()->startOfMonth();

        return [$startDate, $endDate, $validated];
    }

    /*
    |--------------------------------------------------------------------------
    | Core Financial Reports
    |--------------------------------------------------------------------------
    */

    public function getTrialBalance(Request $request)
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();

            $validated = $request->validate([
                'end_date' => 'required|date_format:Y-m-d',
            ]);

            $endDate = Carbon::parse($validated['end_date'])->endOfDay();

            $reportData = $this->reportService->generateTrialBalance($endDate);

            $this->archiveReport('Trial Balance', null, $endDate, $reportData);

            return response()->json($reportData);
        } catch (Throwable $e) {
            Log::error('Trial Balance generation failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'An unexpected error occurred while generating the trial balance.',
            ], 500);
        }
    }

    public function getProfitAndLoss(Request $request)
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();

            $validated = $request->validate([
                'start_date' => 'required|date_format:Y-m-d',
                'end_date' => 'required|date_format:Y-m-d|after_or_equal:start_date',
            ]);

            $startDate = Carbon::parse($validated['start_date'])->startOfDay();
            $endDate = Carbon::parse($validated['end_date'])->endOfDay();

            $reportData = $this->reportService->generateProfitAndLoss($startDate, $endDate);

            $this->archiveReport('Profit & Loss', $startDate, $endDate, $reportData);

            return response()->json($reportData);
        } catch (Throwable $e) {
            Log::error('Profit & Loss generation failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'An unexpected error occurred while generating the Profit & Loss statement.',
            ], 500);
        }
    }

    public function getBalanceSheet(Request $request)
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();

            $validated = $request->validate([
                'end_date' => 'required|date_format:Y-m-d',
            ]);

            $endDate = Carbon::parse($validated['end_date'])->endOfDay();

            $reportData = $this->reportService->generateBalanceSheet($endDate);

            $this->archiveReport('Balance Sheet', null, $endDate, $reportData);

            return response()->json($reportData);
        } catch (Throwable $e) {
            Log::error('Balance sheet generation failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'An unexpected error occurred while generating the balance sheet.',
            ], 500);
        }
    }

    public function generateCashFlowStatement(Request $request)
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();

            $validated = $request->validate([
                'start_date' => 'required|date_format:Y-m-d',
                'end_date' => 'required|date_format:Y-m-d|after_or_equal:start_date',
            ]);

            $startDate = Carbon::parse($validated['start_date'])->startOfDay();
            $endDate = Carbon::parse($validated['end_date'])->endOfDay();

            $reportData = $this->reportService->generateCashFlowStatement($startDate, $endDate);

            $this->archiveReport('Cash Flow Statement', $startDate, $endDate, $reportData);

            return response()->json($reportData);
        } catch (Throwable $e) {
            Log::error('Cash Flow Statement generation failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'An unexpected error occurred while generating the Cash Flow Statement.',
            ], 500);
        }
    }

    public function getGeneralLedger(Request $request)
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();

            $validated = $request->validate([
                'account_id' => [
                    'required',
                    'integer',
                    Rule::exists('chart_of_accounts', 'id')
                        ->where('company_id', auth()->user()->company_id),
                ],
                'start_date' => 'required|date_format:Y-m-d',
                'end_date' => 'required|date_format:Y-m-d|after_or_equal:start_date',
            ]);

            $startDate = Carbon::parse($validated['start_date'])->startOfDay();
            $endDate = Carbon::parse($validated['end_date'])->endOfDay();

            $reportData = $this->reportService->generateGeneralLedger(
                $validated['account_id'],
                $startDate,
                $endDate
            );

            return response()->json($reportData);
        } catch (\InvalidArgumentException $e) {
            Log::warning('General Ledger validation error: ' . $e->getMessage());

            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        } catch (Throwable $e) {
            Log::error('General Ledger generation failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'An unexpected error occurred while generating the general ledger.',
            ], 500);
        }
    }

    public function getBudgetVsActuals(Request $request)
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();

            $validated = $request->validate([
                'start_date' => 'required|date_format:Y-m-d',
                'end_date' => 'required|date_format:Y-m-d|after_or_equal:start_date',
            ]);

            $startDate = Carbon::parse($validated['start_date'])->startOfDay();
            $endDate = Carbon::parse($validated['end_date'])->endOfDay();

            $reportData = $this->reportService->generateBudgetVsActuals($startDate, $endDate);

            $this->archiveReport('Budget vs Actuals', $startDate, $endDate, $reportData);

            return response()->json($reportData);
        } catch (Throwable $e) {
            Log::error('Budget vs Actuals report failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to generate Budget Report.',
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Finance Dashboard Endpoints
    |--------------------------------------------------------------------------
    */

    public function getDashboardSummary(Request $request)
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();

            [$startDate, $endDate] = $this->dashboardPeriod($request);

            return response()->json(
                $this->reportService->getDashboardSummary($startDate, $endDate)
            );
        } catch (Throwable $e) {
            Log::error('Accounting dashboard summary failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to load accounting dashboard summary.',
            ], 500);
        }
    }

    public function getFinancialTrends(Request $request)
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();

            $validated = $request->validate([
                'months' => 'nullable|integer|min:1|max:36',
            ]);

            $months = (int) ($validated['months'] ?? 6);

            $trends = $this->reportService->getFinancialTrends($months);

            return response()->json(
                method_exists($trends, 'values') ? $trends->values() : $trends
            );
        } catch (Throwable $e) {
            Log::error('Financial trends failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to load financial trends.',
            ], 500);
        }
    }

    public function getKeyRatios(Request $request)
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();

            return response()->json(
                $this->reportService->getKeyRatios()
            );
        } catch (Throwable $e) {
            Log::error('Key Ratio calculation failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'An unexpected error occurred while calculating key ratios.',
            ], 500);
        }
    }

    public function getAlerts(Request $request)
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();

            return response()->json(
                $this->reportService->getAlerts()
            );
        } catch (Throwable $e) {
            Log::error('Accounting alerts failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to load accounting alerts.',
            ], 500);
        }
    }

    public function getDashboardAlerts(Request $request)
    {
        return $this->getAlerts($request);
    }

    public function getAccountsReceivableAging(Request $request)
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();

            return response()->json(
                $this->reportService->generateAccountsReceivableAging()
            );
        } catch (Throwable $e) {
            Log::error('A/R aging report failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to load A/R aging report.',
            ], 500);
        }
    }

    public function getAccountsPayableAging(Request $request)
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();

            return response()->json(
                $this->reportService->generateAccountsPayableAging()
            );
        } catch (Throwable $e) {
            Log::error('A/P aging report failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to load A/P aging report.',
            ], 500);
        }
    }

    public function getCashflowSummary(Request $request)
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();

            [$startDate, $endDate] = $this->dashboardPeriod($request);

            return response()->json(
                $this->reportService->getCashflowSummary($startDate, $endDate)
            );
        } catch (Throwable $e) {
            Log::error('Cashflow summary failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to load cashflow summary.',
            ], 500);
        }
    }

    public function getBudgetSummary(Request $request)
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();

            [$startDate, $endDate] = $this->dashboardPeriod($request);

            return response()->json(
                $this->reportService->getBudgetSummary($startDate, $endDate)
            );
        } catch (Throwable $e) {
            Log::error('Budget summary failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to load budget summary.',
            ], 500);
        }
    }

    public function getTaxSummary(Request $request)
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();

            $validated = $request->validate([
                'end_date' => 'nullable|date_format:Y-m-d',
            ]);

            $endDate = isset($validated['end_date'])
                ? Carbon::parse($validated['end_date'])->endOfDay()
                : now()->endOfMonth();

            return response()->json(
                $this->reportService->getTaxSummary($endDate)
            );
        } catch (Throwable $e) {
            Log::error('Tax summary failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to load tax summary.',
            ], 500);
        }
    }

    public function getPeriodStatus(Request $request)
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();

            $validated = $request->validate([
                'date' => 'nullable|date_format:Y-m-d',
            ]);

            $date = isset($validated['date'])
                ? Carbon::parse($validated['date'])
                : now();

            return response()->json(
                $this->reportService->getPeriodStatus($date)
            );
        } catch (Throwable $e) {
            Log::error('Period status failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to load accounting period status.',
            ], 500);
        }
    }

    public function getFinanceDashboardBundle(Request $request)
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();

            [$startDate, $endDate] = $this->dashboardPeriod($request);

            return response()->json([
                'status' => 'success',
                'data' => $this->reportService->getFinanceDashboardBundle($startDate, $endDate),
            ]);
        } catch (Throwable $e) {
            Log::error('Finance dashboard bundle failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to load finance dashboard bundle.',
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Operational Methods
    |--------------------------------------------------------------------------
    */

    public function chartOfAccounts()
    {
        Gate::authorize('view-financial-reports');

        try {
            $this->setupService();

            $companyId = auth()->user()->company_id;

            $accounts = ChartOfAccount::where('company_id', $companyId)
                ->withSum(['journalLines' => fn ($q) => null], 'debit')
                ->withSum(['journalLines' => fn ($q) => null], 'credit')
                ->orderBy('account_code')
                ->get()
                ->map(function ($account) {
                    $rawBalance = ($account->journal_lines_sum_debit ?? 0)
                        - ($account->journal_lines_sum_credit ?? 0);

                    $balance = $rawBalance;

                    if (in_array($account->account_type, [
                        'Liability',
                        'Equity',
                        'Revenue',
                        'Income',
                        'Other Income',
                        'Sales',
                    ], true)) {
                        $balance = -$rawBalance;
                    }

                    $account->balance = round($balance, 2);

                    unset($account->journal_lines_sum_debit, $account->journal_lines_sum_credit);

                    return $account;
                });

            return response()->json($accounts);
        } catch (Throwable $e) {
            Log::error('Failed to retrieve chart of accounts: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'An unexpected error occurred while fetching chart of accounts.',
            ], 500);
        }
    }

    public function storePaymentVoucher(Request $request, JournalEntryService $journalEntryService)
    {
        Gate::authorize('manage-financial-data');

        $validated = $request->validate([
            'transaction_date' => 'required|date_format:Y-m-d',
            'payee' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'payment_account_id' => [
                'required',
                'integer',
                Rule::exists('chart_of_accounts', 'id')
                    ->where('company_id', auth()->user()->company_id),
            ],
            'lines' => 'required|array|min:1',
            'lines.*.account_id' => [
                'required',
                'integer',
                Rule::exists('chart_of_accounts', 'id')
                    ->where('company_id', auth()->user()->company_id),
            ],
            'lines.*.amount' => 'required|numeric|min:0.01',
            'lines.*.description' => 'nullable|string|max:255',
        ]);

        $companyId = auth()->user()->company_id;
        $totalAmount = round(collect($validated['lines'])->sum('amount'), 2);

        $paymentAccountExists = ChartOfAccount::where('company_id', $companyId)
            ->where('id', $validated['payment_account_id'])
            ->where(function ($query) {
                $query->where('account_subtype', 'asset_cash')
                    ->orWhere('account_type', 'Asset');
            })
            ->exists();

        if (!$paymentAccountExists) {
            return response()->json([
                'message' => 'Invalid payment account. Must be a valid Asset account.',
            ], 422);
        }

        DB::beginTransaction();

        try {
            $jeDescription = 'Payment Voucher: '
                . ($validated['description'] ?? "Paid to {$validated['payee']}");

            $jeLines = [];

            $jeLines[] = [
                'account_id' => $validated['payment_account_id'],
                'debit' => 0,
                'credit' => $totalAmount,
                'line_description' => 'Payment to ' . $validated['payee'],
            ];

            foreach ($validated['lines'] as $line) {
                $jeLines[] = [
                    'account_id' => $line['account_id'],
                    'debit' => round($line['amount'], 2),
                    'credit' => 0,
                    'line_description' => $line['description'] ?? null,
                ];
            }

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
                'data' => $journalEntry->load('lines.account:id,account_name,account_code'),
            ], 201);
        } catch (\InvalidArgumentException $e) {
            DB::rollBack();

            Log::warning('Payment voucher validation failed: ' . $e->getMessage());

            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        } catch (Throwable $e) {
            DB::rollBack();

            Log::error('Failed to create payment voucher: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'An unexpected error occurred.',
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Archived Reports
    |--------------------------------------------------------------------------
    */

    public function listArchivedReports(Request $request)
    {
        Gate::authorize('view-financial-reports');

        $query = ArchivedReport::where('company_id', auth()->user()->company_id)
            ->latest('created_at');

        return response()->json(
            $query->paginate((int) $request->get('per_page', 20))
        );
    }

    public function showArchivedReport(ArchivedReport $archivedReport)
    {
        Gate::authorize('view-financial-reports');

        if ($archivedReport->company_id !== auth()->user()->company_id) {
            abort(403);
        }

        return response()->json($archivedReport);
    }
}
