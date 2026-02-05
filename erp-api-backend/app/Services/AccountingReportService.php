<?php

namespace App\Services;

use App\Models\Accounts\Budget;
use App\Models\Accounts\ChartOfAccount;
use App\Models\Accounts\JournalEntryLine;
use App\Models\Accounts\Payslip;
use App\Models\Company;
use App\Models\Inventory\SalesOrder;
use App\Models\PurchaseOrder;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;
use RuntimeException;

class AccountingReportService
{
    /**
     * The company context for the report.
     */
    protected Company $company;

    /**
     * Set the company context for the report service.
     *
     * @param Company $company
     * @return self
     */
    public function setCompany(Company $company): self
    {
        $this->company = $company;
        return $this;
    }

    /**
     * Get the company ID, throwing an exception if not set.
     *
     * @return int
     * @throws RuntimeException
     */
    protected function getCompanyId(): int
    {
        if (!isset($this->company)) {
            throw new RuntimeException("Company context not set for AccountingReportService.");
        }
        return $this->company->id;
    }

    // =================================================================
    // 1. CORE FINANCIAL REPORTS (TB, P&L, BS, CF)
    // =================================================================

    /**
     * Generate a Trial Balance report.
     *
     * @param Carbon|null $asOfDate
     * @return array
     */
    public function generateTrialBalance(?Carbon $asOfDate = null): array
    {
        $asOfDate = ($asOfDate ?? now())->endOfDay();
        $companyId = $this->getCompanyId();

        // 1. Get all relevant accounts first
        $accounts = ChartOfAccount::where('company_id', $companyId)
            ->orderBy('account_code')
            ->get(['id', 'account_code', 'account_name', 'account_type']);

        if ($accounts->isEmpty()) {
            return [
                'company_name' => $this->company->name,
                'as_of_date' => $asOfDate->toFormattedDateString(),
                'debits' => [], 'credits' => [],
                'total_debits' => 0, 'total_credits' => 0,
                'status' => 'Balanced', 'difference' => 0
            ];
        }

        $accountIds = $accounts->pluck('id')->all();

        // 2. Query summed debits/credits directly from journal lines
        $balances = DB::table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->whereIn('journal_entry_lines.chart_of_account_id', $accountIds)
            ->where('journal_entries.transaction_date', '<=', $asOfDate)
            ->select(
                'journal_entry_lines.chart_of_account_id',
                DB::raw('SUM(journal_entry_lines.debit) as total_debit'),
                DB::raw('SUM(journal_entry_lines.credit) as total_credit')
            )
            ->groupBy('journal_entry_lines.chart_of_account_id')
            ->get()
            ->keyBy('chart_of_account_id');

        // 3. Map balances and format
        $debits = [];
        $credits = [];
        $totalDebits = 0;
        $totalCredits = 0;

        foreach ($accounts as $account) {
            $accountBalanceData = $balances->get($account->id);
            $account_total_debit = $accountBalanceData->total_debit ?? 0;
            $account_total_credit = $accountBalanceData->total_credit ?? 0;

            // Calculate raw balance (Assets/Expenses are Debit-natural, others Credit-natural)
            // However, for Trial Balance presentation, we split into Debit Column and Credit Column based on net result.
            $netBalance = $account_total_debit - $account_total_credit;

            if (abs($netBalance) < 0.01) continue; // Skip zero balance accounts

            $accountData = [
                'account_code' => $account->account_code,
                'account_name' => $account->account_name,
            ];

            if ($netBalance > 0) {
                // Debit Balance
                $accountData['balance'] = round($netBalance, 2);
                $debits[] = $accountData;
                $totalDebits += $netBalance;
            } else {
                // Credit Balance (absolute value for display)
                $accountData['balance'] = round(abs($netBalance), 2);
                $credits[] = $accountData;
                $totalCredits += abs($netBalance);
            }
        }

        // Use a small epsilon for floating-point comparison safety
        $isBalanced = abs($totalDebits - $totalCredits) < 0.01;

        return [
            'company_name' => $this->company->name,
            'as_of_date' => $asOfDate->toFormattedDateString(),
            'debits' => $debits,
            'credits' => $credits,
            'total_debits' => round($totalDebits, 2),
            'total_credits' => round($totalCredits, 2),
            'status' => $isBalanced ? 'Balanced' : 'Unbalanced',
            'difference' => $isBalanced ? 0 : round($totalDebits - $totalCredits, 2),
        ];
    }

    /**
     * Generate a Profit and Loss (Income Statement) report.
     *
     * @param Carbon $startDate
     * @param Carbon $endDate
     * @return array
     */
    public function generateProfitAndLoss(Carbon $startDate, Carbon $endDate): array
    {
        $startDate = $startDate->startOfDay();
        $endDate = $endDate->endOfDay();

        // 1. Fetch Revenue Accounts Balances
        $revenues = $this->getAccountBalances(['Revenue'], $endDate, $startDate);

        // 2. Fetch Expense Accounts Balances
        $expenses = $this->getAccountBalances(['Expense'], $endDate, $startDate);

        // 3. Calculate Totals
        $totalRevenue = $revenues->sum('balance');
        $totalExpenses = $expenses->sum('balance');
        $netIncome = $totalRevenue - $totalExpenses;

        return [
            'company_name' => $this->company->name,
            'period' => $startDate->toFormattedDateString() . ' - ' . $endDate->toFormattedDateString(),
            'revenues' => $revenues,
            'total_revenue' => round($totalRevenue, 2),
            'expenses' => $expenses,
            'total_expenses' => round($totalExpenses, 2),
            'net_income' => round($netIncome, 2),
        ];
    }

    /**
     * Generate a Balance Sheet report.
     *
     * @param Carbon|null $asOfDate
     * @return array
     */
    public function generateBalanceSheet(?Carbon $asOfDate = null): array
    {
        $asOfDate = ($asOfDate ?? now())->endOfDay();

        // Get Cumulative Balances
        $assets = $this->getAccountBalances(['Asset'], $asOfDate);
        $liabilities = $this->getAccountBalances(['Liability'], $asOfDate);
        $equity = $this->getAccountBalances(['Equity'], $asOfDate);

        // Calculate Net Income YTD (Assumes fiscal year starts Jan 1st)
        $startOfYear = $asOfDate->copy()->startOfYear();
        $netIncomeYtd = $this->calculateNetIncome($startOfYear, $asOfDate);

        // Add Net Income to Equity section as "Current Year Earnings"
        $equity->push([
            'account_code' => 'NI-YTD',
            'account_name' => 'Net Income (YTD)',
            'account_subtype' => 'equity_retained_earnings',
            'balance' => round($netIncomeYtd, 2)
        ]);

        $totalAssets = round($assets->sum('balance'), 2);
        $totalLiabilities = round($liabilities->sum('balance'), 2);
        $totalEquity = round($equity->sum('balance'), 2);
        $totalLiabilitiesAndEquity = round($totalLiabilities + $totalEquity, 2);

        // Determine if balanced
        $isBalanced = abs($totalAssets - $totalLiabilitiesAndEquity) < 0.01;

        return [
            'company_name' => $this->company->name,
            'as_of_date' => $asOfDate->toFormattedDateString(),
            'assets' => ['accounts' => $assets->groupBy('account_subtype'), 'total' => $totalAssets],
            'liabilities' => ['accounts' => $liabilities->groupBy('account_subtype'), 'total' => $totalLiabilities],
            'equity' => ['accounts' => $equity->groupBy('account_subtype'), 'total' => $totalEquity],
            'total_liabilities_and_equity' => $totalLiabilitiesAndEquity,
            'check_balance' => $isBalanced ? 'Balanced' : 'Unbalanced',
        ];
    }

    /**
     * Generate the Statement of Cash Flows (Indirect Method).
     *
     * @param Carbon $startDate
     * @param Carbon $endDate
     * @return array
     */
    public function generateCashFlowStatement(Carbon $startDate, Carbon $endDate): array
    {
        $startDate = $startDate->startOfDay();
        $endDate = $endDate->endOfDay();

        // 1. Start with Net Income
        $netIncome = $this->calculateNetIncome($startDate, $endDate);

        // 2. Get snapshots of Balance Sheet accounts at start and end
        $bsAccountsStart = $this->getAllAccountBalancesCumulative($startDate->copy()->subDay());
        $bsAccountsEnd = $this->getAllAccountBalancesCumulative($endDate);

        // 3. Operating Activities (Adjust Net Income for non-cash items and working capital changes)
        $changes = $this->calculateOperatingChanges($bsAccountsStart, $bsAccountsEnd);
        $cashFlowFromOperations = $netIncome + $changes['operating_net_adjustment'];

        // 4. Investing Activities (Fixed Assets, Investments)
        $investingActivities = $this->calculateInvestingChanges($bsAccountsStart, $bsAccountsEnd);
        $cashFlowFromInvesting = $investingActivities['investing_net'];

        // 5. Financing Activities (Debt, Equity, Dividends)
        $financingActivities = $this->calculateFinancingChanges($bsAccountsStart, $bsAccountsEnd);
        $cashFlowFromFinancing = $financingActivities['financing_net'];

        // 6. Summary
        $netChangeInCash = $cashFlowFromOperations + $cashFlowFromInvesting + $cashFlowFromFinancing;
        $endingCashBalance = $this->getCashBalance($bsAccountsEnd);
        $beginningCashBalance = $endingCashBalance - $netChangeInCash;

        return [
            'company_name' => $this->company->name,
            'report_period' => $startDate->toFormattedDateString() . ' to ' . $endDate->toFormattedDateString(),
            'net_income' => round($netIncome, 2),
            'operating' => [
                'details' => $changes['operating_details'],
                'total' => round($cashFlowFromOperations, 2),
            ],
            'investing' => [
                'details' => $investingActivities['details'],
                'total' => round($cashFlowFromInvesting, 2),
            ],
            'financing' => [
                'details' => $financingActivities['details'],
                'total' => round($cashFlowFromFinancing, 2),
            ],
            'net_change_in_cash' => round($netChangeInCash, 2),
            'beginning_cash_balance' => round($beginningCashBalance, 2),
            'ending_cash_balance' => round($endingCashBalance, 2),
        ];
    }

    // =================================================================
    // 2. ANALYTICAL REPORTS (Budget, Ratios)
    // =================================================================

    /**
     * Generate a Budget vs. Actuals report for a specific period.
     *
     * @param Carbon $startDate
     * @param Carbon $endDate
     * @return array
     */
    public function generateBudgetVsActuals(Carbon $startDate, Carbon $endDate): array
    {
        $startDate = $startDate->startOfDay();
        $endDate = $endDate->endOfDay();
        $companyId = $this->getCompanyId();

        // 1. Get Actuals
        $revenueActuals = $this->getAccountBalances(['Revenue'], $endDate, $startDate);
        $expenseActuals = $this->getAccountBalances(['Expense'], $endDate, $startDate);
        $allActuals = $revenueActuals->merge($expenseActuals);

        // 2. Get Budgets
        $budgets = Budget::where('company_id', $companyId)
            ->whereBetween('period', [$startDate->format('Y-m-01'), $endDate->format('Y-m-t')])
            ->get()
            ->groupBy('chart_of_account_id')
            ->map(function ($group) {
                return $group->sum('amount');
            });

        // 3. Get Accounts Map
        $plSubtypes = ['revenue_sales', 'revenue_other', 'expense_cogs', 'expense_operating', 'expense_other'];
        $coaMap = ChartOfAccount::where('company_id', $companyId)
            ->where(function($q) use ($plSubtypes) {
                $q->whereIn('account_type', ['Revenue', 'Expense', 'Cost of Goods Sold', 'Income', 'Other Income', 'Other Expense'])
                    ->orWhereIn('account_subtype', $plSubtypes);
            })
            ->get()
            ->keyBy('id');

        $reportLines = [];

        foreach ($coaMap as $accountId => $account) {
            // Find Actual
            $actualData = $allActuals->first(function ($item) use ($account) {
                return isset($item['account_code']) && $item['account_code'] === $account->account_code;
            });

            $actualAmount = $actualData ? $actualData['balance'] : 0.00;
            $budgetAmount = $budgets->get($accountId) ?? 0.00;

            if ($actualAmount == 0 && $budgetAmount == 0) continue;

            $variance = $actualAmount - $budgetAmount;
            $percent = 0;
            if ($budgetAmount != 0) {
                $percent = ($variance / $budgetAmount) * 100;
            } elseif ($actualAmount != 0) {
                $percent = 100;
            }

            $reportLines[] = [
                'account_id' => $accountId,
                'account_code' => $account->account_code,
                'account_name' => $account->account_name,
                'type' => $account->account_type,
                'subtype' => $account->account_subtype,
                'group_type' => in_array($account->account_type, ['Revenue', 'Income', 'Other Income', 'Sales']) ? 'Revenue' : 'Expense',
                'actual' => round($actualAmount, 2),
                'budget' => round($budgetAmount, 2),
                'variance' => round($variance, 2),
                'variance_percent' => round($percent, 1),
            ];
        }

        $grouped = collect($reportLines)->groupBy('group_type');

        return [
            'company_name' => $this->company->name,
            'report_period' => $startDate->toFormattedDateString() . ' to ' . $endDate->toFormattedDateString(),
            'revenue' => $grouped->get('Revenue', collect())->values(),
            'expenses' => $grouped->get('Expense', collect())->values(),
            'totals' => [
                'revenue_actual' => collect($grouped->get('Revenue', []))->sum('actual'),
                'revenue_budget' => collect($grouped->get('Revenue', []))->sum('budget'),
                'expense_actual' => collect($grouped->get('Expense', []))->sum('actual'),
                'expense_budget' => collect($grouped->get('Expense', []))->sum('budget'),
            ]
        ];
    }

    /**
     * Get key financial ratios.
     *
     * @return array
     */
    public function getKeyRatios(): array
    {
        $endDate = Carbon::today()->endOfDay();
        $companyId = $this->getCompanyId();

        // Define subtypes for Ratios
        $currentAssetSubtypes = ['asset_cash', 'asset_receivable', 'asset_inventory', 'asset_prepaid', 'asset_current_other'];
        $inventorySubtypes = ['asset_inventory'];
        $currentLiabilitySubtypes = ['liability_payable', 'liability_unearned_revenue', 'liability_tax_payable', 'liability_current_other', 'liability_credit_card'];

        $totalCurrentAssets = $this->getSummedBalanceForSubtypes($currentAssetSubtypes, null, $endDate);
        $totalInventory = $this->getSummedBalanceForSubtypes($inventorySubtypes, null, $endDate);
        $totalCurrentLiabilities = $this->getSummedBalanceForSubtypes($currentLiabilitySubtypes, null, $endDate);

        $startOfYear = $endDate->copy()->startOfYear();
        $totalRevenueYtd = $this->getSummedBalanceForType(['Revenue'], $startOfYear, $endDate);
        $totalExpensesYtd = $this->getSummedBalanceForType(['Expense'], $startOfYear, $endDate);
        $netIncomeYtd = $totalRevenueYtd - $totalExpensesYtd;

        $currentRatio = ($totalCurrentLiabilities != 0) ? ($totalCurrentAssets / $totalCurrentLiabilities) : 0;
        $quickRatio = ($totalCurrentLiabilities != 0) ? (($totalCurrentAssets - $totalInventory) / $totalCurrentLiabilities) : 0;
        $netProfitMarginYtd = ($totalRevenueYtd != 0) ? ($netIncomeYtd / $totalRevenueYtd) : 0;

        return [
            'company_name' => $this->company->name,
            'as_of_date' => $endDate->toFormattedDateString(),
            'current_ratio' => (float) round($currentRatio, 2),
            'quick_ratio' => (float) round($quickRatio, 2),
            'net_profit_margin_ytd' => (float) round($netProfitMarginYtd * 100, 2),
            'ytd_net_income' => (float) round($netIncomeYtd, 2),
            'ytd_revenue' => (float) round($totalRevenueYtd, 2),
        ];
    }

    // =================================================================
    // 3. OPERATIONAL & LISTING REPORTS (GL, Aging, Payroll)
    // =================================================================

    /**
     * Generate a General Ledger report.
     *
     * @param int $accountId
     * @param Carbon $startDate
     * @param Carbon $endDate
     * @return array
     */
    public function generateGeneralLedger(int $accountId, Carbon $startDate, Carbon $endDate): array
    {
        $account = ChartOfAccount::where('company_id', $this->getCompanyId())->findOrFail($accountId);

        // Opening Balance
        $openingBalanceData = JournalEntryLine::where('chart_of_account_id', $accountId)
            ->whereHas('journalEntry', fn($q) => $q->where('transaction_date', '<', $startDate->startOfDay()))
            ->selectRaw('SUM(debit) as total_debit, SUM(credit) as total_credit')
            ->first();

        $openingBalance = ($openingBalanceData->total_debit ?? 0) - ($openingBalanceData->total_credit ?? 0);
        $isCreditAccount = in_array($account->account_type, ['Liability', 'Equity', 'Revenue']);
        if ($isCreditAccount) {
            $openingBalance = -$openingBalance;
        }

        // Transactions
        $lines = JournalEntryLine::where('chart_of_account_id', $accountId)
            ->whereHas('journalEntry', fn($q) => $q->whereBetween('transaction_date', [$startDate->startOfDay(), $endDate->endOfDay()]))
            ->with('journalEntry')
            ->orderBy('journal_entry_id')
            ->get();

        $runningBalance = $openingBalance;
        $transactions = $lines->map(function($line) use (&$runningBalance, $isCreditAccount) {
            $transactionAmount = $line->debit - $line->credit;
            if ($isCreditAccount) {
                $transactionAmount = -$transactionAmount;
            }
            $runningBalance += $transactionAmount;

            return [
                'date' => $line->journalEntry->transaction_date->toFormattedDateString(),
                'journal_entry_id' => $line->journalEntry->id,
                'description' => $line->journalEntry->description,
                'debit' => round($line->debit, 2),
                'credit' => round($line->credit, 2),
                'balance' => round($runningBalance, 2),
            ];
        });

        return [
            'company_name' => $this->company->name,
            'account_name' => $account->account_name,
            'account_code' => $account->account_code,
            'period' => $startDate->toFormattedDateString() . ' - ' . $endDate->toFormattedDateString(),
            'opening_balance' => round($openingBalance, 2),
            'transactions' => $transactions,
            'closing_balance' => round($runningBalance, 2),
        ];
    }

    /**
     * Generate Accounts Receivable Aging Report.
     * Context-aware labels for industry type.
     *
     * @param array $customBuckets
     * @return array
     */
    public function generateAccountsReceivableAging(array $customBuckets = []): array
    {
        $buckets = empty($customBuckets) ? [
            'current' => [0, 30],
            '31-60' => [31, 60],
            '61-90' => [61, 90],
            '90+' => [91, null]
        ] : $customBuckets;

        $customerLabel = match(strtolower($this->company->industry ?? 'generic')) {
            'school', 'education' => 'Student/Parent',
            'hospital', 'healthcare' => 'Patient',
            'lawfirm', 'legal' => 'Client',
            default => 'Customer',
        };

        $unpaidStatuses = ['PENDING', 'PARTIAL', 'APPROVED'];

        $selects = [
            'customer_id',
            DB::raw('SUM(total_amount - amount_paid) as total_due'),
        ];

        foreach ($buckets as $name => [$min, $max]) {
            $condition = "DATEDIFF(NOW(), order_date) >= {$min}";
            if ($max !== null) {
                $condition .= " AND DATEDIFF(NOW(), order_date) <= {$max}";
            }
            $selects[] = DB::raw("SUM(CASE WHEN {$condition} THEN (total_amount - amount_paid) ELSE 0 END) as '{$name}'");
        }

        $agingReport = SalesOrder::where('company_id', $this->getCompanyId())
            ->whereIn('status', $unpaidStatuses)
            ->whereRaw('ROUND(total_amount - amount_paid, 2) > 0')
            ->with('customer:id,name')
            ->select($selects)
            ->groupBy('customer_id')
            ->get();

        $totals = ['total_due' => round($agingReport->sum('total_due'), 2)];
        foreach (array_keys($buckets) as $bucketName) {
            $totals[$bucketName] = round($agingReport->sum($bucketName), 2);
        }

        return [
            'company_name' => $this->company->name,
            'report_date' => now()->toFormattedDateString(),
            'customer_label' => $customerLabel,
            'bucket_definitions' => $buckets,
            'totals' => $totals,
            'details' => $agingReport->map(function($row) use ($customerLabel) {
                $data = $row->toArray();
                $data[$customerLabel . '_name'] = $row->customer->name;
                unset($data['customer']);
                return array_map(fn($val) => is_numeric($val) ? round($val, 2) : $val, $data);
            }),
        ];
    }

    /**
     * Generate Accounts Payable Aging Report.
     *
     * @param array $customBuckets
     * @return array
     */
    public function generateAccountsPayableAging(array $customBuckets = []): array
    {
        $buckets = empty($customBuckets) ? [
            'current' => [0, 30],
            '31-60' => [31, 60],
            '61-90' => [61, 90],
            '90+' => [91, null]
        ] : $customBuckets;

        $unpaidStatuses = ['PENDING', 'PARTIAL', 'APPROVED', 'RECEIVED'];

        $selects = [
            'supplier_id',
            DB::raw('SUM(total_amount - amount_paid) as total_due'),
        ];

        foreach ($buckets as $name => [$min, $max]) {
            $condition = "DATEDIFF(NOW(), order_date) >= {$min}";
            if ($max !== null) {
                $condition .= " AND DATEDIFF(NOW(), order_date) <= {$max}";
            }
            $selects[] = DB::raw("SUM(CASE WHEN {$condition} THEN (total_amount - amount_paid) ELSE 0 END) as '{$name}'");
        }

        $agingReport = PurchaseOrder::where('company_id', $this->getCompanyId())
            ->whereIn('status', $unpaidStatuses)
            ->whereRaw('ROUND(total_amount - amount_paid, 2) > 0')
            ->with('supplier:id,name')
            ->select($selects)
            ->groupBy('supplier_id')
            ->get();

        $totals = ['total_due' => round($agingReport->sum('total_due'), 2)];
        foreach (array_keys($buckets) as $bucketName) {
            $totals[$bucketName] = round($agingReport->sum($bucketName), 2);
        }

        return [
            'company_name' => $this->company->name,
            'report_date' => now()->toFormattedDateString(),
            'bucket_definitions' => $buckets,
            'totals' => $totals,
            'details' => $agingReport->map(function($row) {
                $data = $row->toArray();
                $data['supplier_name'] = $row->supplier->name;
                unset($data['supplier']);
                return array_map(fn($val) => is_numeric($val) ? round($val, 2) : $val, $data);
            }),
        ];
    }

    /**
     * Generate Bank Payment List (Payroll).
     *
     * @param Carbon $endDate
     * @param array $options
     * @return array
     */
    public function generateBankPaymentList(Carbon $endDate, array $options = []): array
    {
        $query = Payslip::where('company_id', $this->getCompanyId())
            ->where('pay_period_end', $endDate->toDateString())
            ->with('user.employeeProfile');

        if (isset($options['department_id'])) {
            $query->whereHas('user.employeeProfile', fn($q) => $q->where('department_id', $options['department_id']));
        }

        $payslips = $query->get();

        if ($payslips->isEmpty()) {
            return [
                'company_name' => $this->company->name,
                'pay_period' => $endDate->format('F Y'),
                'total_net_payable' => 0,
                'payment_list' => [],
            ];
        }

        $paymentList = $payslips->map(function ($payslip) {
            $profile = $payslip->user->employeeProfile;
            return [
                'employee_id' => $payslip->user->id,
                'employee_name' => $payslip->user->name,
                'bank_name' => $profile->bank_name ?? 'N/A',
                'bank_account_number' => $profile->bank_account_number ?? 'N/A',
                'bank_branch' => $profile->bank_branch ?? null,
                'net_pay' => round($payslip->net_pay, 2),
            ];
        });

        return [
            'company_name' => $this->company->name,
            'pay_period' => $endDate->format('F Y'),
            'total_net_payable' => round($payslips->sum('net_pay'), 2),
            'payment_list' => $paymentList->toArray(),
        ];
    }

    /**
     * Generate Statutory Deductions Report.
     * Context-aware labels for different company types.
     *
     * @param Carbon $endDate
     * @return array
     */
    public function generateStatutoryReport(Carbon $endDate): array
    {
        $payslips = Payslip::where('company_id', $this->getCompanyId())
            ->where('pay_period_end', $endDate->toDateString())
            ->with('user.employeeProfile')
            ->get();

        $labels = match(strtolower($this->company->industry ?? 'generic')) {
            'school', 'education' => [
                'paye' => 'PAYE (Teachers/Staff)',
                'nssf' => 'NSSF Contribution',
                'nhif' => 'NHIF Contribution',
            ],
            'hospital', 'healthcare' => [
                'paye' => 'PAYE (Medical Staff)',
                'nssf' => 'NSSF Contribution',
                'nhif' => 'NHIF Contribution',
            ],
            default => [
                'paye' => 'PAYE (Tax)',
                'nssf' => 'NSSF',
                'nhif' => 'NHIF',
            ],
        };

        if ($payslips->isEmpty()) {
             return [
                'company_name' => $this->company->name,
                'pay_period' => $endDate->format('F Y'),
                'labels' => $labels,
                'totals' => ['paye' => 0, 'nssf' => 0, 'nhif' => 0, 'housing_levy' => 0],
                'details' => [],
            ];
        }

        $reportLines = [];
        $totals = ['paye' => 0, 'nssf' => 0, 'nhif' => 0, 'housing_levy' => 0];

        foreach ($payslips as $payslip) {
            $profile = $payslip->user->employeeProfile;
            $nssf = $payslip->deductions['nssf'] ?? 0;
            $nhif = $payslip->deductions['nhif'] ?? 0;
            $housingLevy = $payslip->deductions['housing_levy'] ?? 0;

            $reportLines[] = [
                'employee_id' => $payslip->user->id,
                'employee_name' => $payslip->user->name,
                'kra_pin' => $profile->kra_pin ?? 'N/A',
                'nssf_number' => $profile->nssf_number ?? 'N/A',
                'nhif_number' => $profile->nhif_number ?? 'N/A',
                'paye' => round($payslip->tax_paid, 2),
                'nssf' => round($nssf, 2),
                'nhif' => round($nhif, 2),
                'housing_levy' => round($housingLevy, 2),
            ];

            $totals['paye'] += $payslip->tax_paid;
            $totals['nssf'] += $nssf;
            $totals['nhif'] += $nhif;
            $totals['housing_levy'] += $housingLevy;
        }

        $totals = array_map(fn($val) => round($val, 2), $totals);

        return [
            'company_name' => $this->company->name,
            'pay_period' => $endDate->format('F Y'),
            'labels' => $labels,
            'totals' => $totals,
            'details' => $reportLines,
        ];
    }

    // =================================================================
    // PRIVATE HELPER METHODS
    // =================================================================

   /**
    * Fetches balances for accounts filtered by type and date range.
    */
   private function getAccountBalances(array $types, $endDate, $startDate = null): Collection
    {
        $companyId = $this->getCompanyId();
        $endDate = $endDate->copy()->endOfDay();
        $startDate = $startDate ? $startDate->copy()->startOfDay() : null;

        // Consolidate common P&L types
        $consolidatedTypes = $types;
        if (in_array('Revenue', $types)) {
            $consolidatedTypes = array_merge($consolidatedTypes, ['Income', 'Other Income', 'Sales']);
        }
        if (in_array('Expense', $types)) {
            $consolidatedTypes = array_merge($consolidatedTypes, ['Cost of Goods Sold', 'Other Expense', 'Operating Expense', 'Cost of Revenue']);
        }
        $consolidatedTypes = array_unique($consolidatedTypes);

        $query = ChartOfAccount::where('company_id', $companyId)
            ->whereIn('account_type', $consolidatedTypes)
            ->withSum([
                'journalLines as total_debit' => function ($q) use ($startDate, $endDate) {
                    $q->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id');
                    if ($startDate) {
                        $q->whereBetween('journal_entries.transaction_date', [$startDate, $endDate]);
                    } else {
                        $q->where('journal_entries.transaction_date', '<=', $endDate);
                    }
                }
            ], 'debit')
            ->withSum([
                'journalLines as total_credit' => function ($q) use ($startDate, $endDate) {
                    $q->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id');
                    if ($startDate) {
                        $q->whereBetween('journal_entries.transaction_date', [$startDate, $endDate]);
                    } else {
                        $q->where('journal_entries.transaction_date', '<=', $endDate);
                    }
                }
            ], 'credit')
            ->orderBy('account_code')
            ->get();

        return $query->map(function($account) {
            $debits = (float) ($account->total_debit ?? 0);
            $credits = (float) ($account->total_credit ?? 0);
            $rawBalance = round($debits - $credits, 2);
            $balance = $this->adjustBalanceSign($rawBalance, $account->account_type);

            return [
                'account_code' => $account->account_code,
                'account_name' => $account->account_name,
                'account_subtype' => $account->account_subtype ?? null,
                'balance' => $balance
            ];
        })->filter(function($account) {
            return abs($account['balance']) >= 0.01;
        })->values();
    }

    /**
     * Calculates Net Income (Revenue - Expenses).
     */
    private function calculateNetIncome($startDate, $endDate): float {
        $revenue = $this->getSummedBalanceForType(['Revenue'], $startDate, $endDate);
        $expenses = $this->getSummedBalanceForType(['Expense'], $startDate, $endDate);
        return round($revenue - $expenses, 2);
    }

    /**
     * Sums balance for a list of account SUBTYPES.
     */
    private function getSummedBalanceForSubtypes(array $subtypes, ?Carbon $startDate = null, ?Carbon $endDate = null): float {
        $companyId = $this->getCompanyId();
        $accounts = ChartOfAccount::where('company_id', $companyId)
            ->whereIn('account_subtype', $subtypes)
            ->get(['id', 'account_type']);

        if ($accounts->isEmpty()) return 0.0;

        $accountIds = $accounts->pluck('id')->all();
        $endDate = $endDate ? $endDate->copy()->endOfDay() : now()->endOfDay();
        $startDate = $startDate ? $startDate->copy()->startOfDay() : null;

        $query = DB::table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->whereIn('journal_entry_lines.chart_of_account_id', $accountIds)
            ->select(
                'journal_entry_lines.chart_of_account_id',
                DB::raw('SUM(journal_entry_lines.debit) as total_debit'),
                DB::raw('SUM(journal_entry_lines.credit) as total_credit')
            );

        if ($startDate) {
            $query->whereBetween('journal_entries.transaction_date', [$startDate, $endDate]);
        } else {
            $query->where('journal_entries.transaction_date', '<=', $endDate);
        }

        $results = $query->groupBy('journal_entry_lines.chart_of_account_id')->get()->keyBy('chart_of_account_id');
        $totalBalance = 0;

        foreach ($accounts as $account) {
            $result = $results->get($account->id);
            if ($result) {
                $rawBalance = ($result->total_debit ?? 0) - ($result->total_credit ?? 0);
                $totalBalance += $this->adjustBalanceSign($rawBalance, $account->account_type);
            }
        }

        return round($totalBalance, 2);
    }

    /**
     * Sums the total adjusted balance for a list of account types.
     */
    private function getSummedBalanceForType(array $types, ?Carbon $startDate = null, ?Carbon $endDate = null): float {
        $companyId = $this->getCompanyId();
        $accounts = ChartOfAccount::where('company_id', $companyId)->whereIn('account_type', $types)->get(['id', 'account_type']);

        if ($accounts->isEmpty()) return 0.0;

        $accountIds = $accounts->pluck('id')->all();
        $endDate = $endDate ? $endDate->copy()->endOfDay() : now()->endOfDay();
        $startDate = $startDate ? $startDate->copy()->startOfDay() : null;

        $query = DB::table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->whereIn('journal_entry_lines.chart_of_account_id', $accountIds)
            ->select(
                'journal_entry_lines.chart_of_account_id',
                DB::raw('SUM(journal_entry_lines.debit) as total_debit'),
                DB::raw('SUM(journal_entry_lines.credit) as total_credit')
            );

        if ($startDate) { $query->whereBetween('journal_entries.transaction_date', [$startDate, $endDate]); } else { $query->where('journal_entries.transaction_date', '<=', $endDate); }

        $results = $query->groupBy('journal_entry_lines.chart_of_account_id')->get()->keyBy('chart_of_account_id');
        $totalBalance = 0;

        foreach ($accounts as $account) {
            $result = $results->get($account->id);
            if ($result) {
                $rawBalance = ($result->total_debit ?? 0) - ($result->total_credit ?? 0);
                $totalBalance += $this->adjustBalanceSign($rawBalance, $account->account_type);
            }
        }

        return round($totalBalance, 2);
    }

    /**
     * Reverses the sign of the raw balance for Liability, Equity, and Revenue accounts.
     */
    public function adjustBalanceSign(float $rawBalance, string $accountType): float {
        if (in_array($accountType, ['Liability', 'Equity', 'Revenue', 'Income', 'Other Income', 'Sales'])) {
            return -$rawBalance;
        }
        return $rawBalance;
    }

    /**
     * Helper to fetch cumulative balances for ALL Balance Sheet accounts.
     */
    private function getAllAccountBalancesCumulative(Carbon $date): Collection
    {
        $companyId = $this->getCompanyId();
        $types = ['Asset', 'Liability', 'Equity'];

        $query = ChartOfAccount::where('company_id', $companyId)
            ->whereIn('account_type', $types)
            ->withSum([
                'journalLines as debits_sum' => function ($q) use ($date) {
                    $q->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
                      ->where('journal_entries.transaction_date', '<=', $date);
                }
            ], 'debit')
            ->withSum([
                'journalLines as credits_sum' => function ($q) use ($date) {
                    $q->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
                      ->where('journal_entries.transaction_date', '<=', $date);
                }
            ], 'credit')
            ->get();

        return $query->mapWithKeys(function($account) {
            $debits = (float) ($account->debits_sum ?? 0);
            $credits = (float) ($account->credits_sum ?? 0);
            $rawBalance = $debits - $credits;

            $balance = $this->adjustBalanceSign($rawBalance, $account->account_type);

            return [
                $account->account_name => [
                    'id' => $account->id,
                    'type' => $account->account_type,
                    'subtype' => $account->account_subtype,
                    'balance' => $balance,
                ]
            ];
        });
    }

    /**
     * Calculates adjustments for non-cash operating activities based on SUBTYPES.
     */
    private function calculateOperatingChanges(Collection $startBalances, Collection $endBalances): array
    {
        $details = [];
        $netAdjustment = 0;

        $operatingSubtypes = [
            'asset_receivable' => -1,
            'asset_inventory' => -1,
            'asset_prepaid' => -1,
            'asset_current_other' => -1,
            'liability_payable' => 1,
            'liability_unearned_revenue' => 1,
            'liability_tax_payable' => 1,
            'liability_current_other' => 1,
            'liability_credit_card' => 1,
        ];

        foreach ($endBalances as $accountName => $data) {
            $subtype = $data['subtype'] ?? null;

            if ($subtype && isset($operatingSubtypes[$subtype])) {
                $start = $startBalances->get($accountName)['balance'] ?? 0;
                $end = $data['balance'];
                $change = $end - $start;

                if (abs($change) > 0.01) {
                    $direction = $operatingSubtypes[$subtype];
                    $adjustment = $change * $direction;
                    $netAdjustment += $adjustment;

                    $details[] = [
                        'account' => "Change in {$accountName}",
                        'change' => $change,
                        'adjustment' => round($adjustment, 2),
                    ];
                }
            }
        }

        foreach ($endBalances as $accountName => $data) {
            if (($data['subtype'] ?? null) === 'contra_asset_depreciation') {
                 $start = $startBalances->get($accountName)['balance'] ?? 0;
                 $end = $data['balance'];
                 $change = abs($end) - abs($start);

                 if ($change > 0.01) {
                     $details[] = [
                         'account' => "Add back: Depreciation/Amortization ({$accountName})",
                         'change' => $change,
                         'adjustment' => round($change, 2),
                     ];
                     $netAdjustment += $change;
                 }
            }
        }

        return [
            'operating_details' => $details,
            'operating_net_adjustment' => round($netAdjustment, 2),
        ];
    }

    /**
     * Calculates adjustments for investing activities based on SUBTYPES.
     */
    private function calculateInvestingChanges(Collection $startBalances, Collection $endBalances): array
    {
        $details = [];
        $netInvestingChange = 0;

        $investingSubtypes = ['asset_fixed', 'asset_non_current_investment'];

        foreach ($endBalances as $accountName => $data) {
            if (in_array($data['subtype'] ?? null, $investingSubtypes)) {
                $start = $startBalances->get($accountName)['balance'] ?? 0;
                $end = $data['balance'];
                $change = $end - $start;

                if (abs($change) > 0.01) {
                    $adjustment = -$change;
                    $netInvestingChange += $adjustment;

                    $details[] = [
                        'account' => "Purchase/Sale of {$accountName} (Net)",
                        'change' => $change,
                        'adjustment' => round($adjustment, 2),
                    ];
                }
            }
        }

        return [
            'details' => $details,
            'investing_net' => round($netInvestingChange, 2),
        ];
    }

    /**
     * Calculates adjustments for financing activities based on SUBTYPES.
     */
    private function calculateFinancingChanges(Collection $startBalances, Collection $endBalances): array
    {
        $details = [];
        $netFinancingChange = 0;

        $financingSubtypes = ['liability_long_term_debt', 'equity_capital'];

        foreach ($endBalances as $accountName => $data) {
            if (in_array($data['subtype'] ?? null, $financingSubtypes)) {
                $start = $startBalances->get($accountName)['balance'] ?? 0;
                $end = $data['balance'];
                $change = $end - $start;

                if (abs($change) > 0.01) {
                    $adjustment = $change;
                    $netFinancingChange += $adjustment;

                    $details[] = [
                        'account' => "Change in {$accountName}",
                        'change' => $change,
                        'adjustment' => round($adjustment, 2),
                    ];
                }
            }
        }

        return [
            'details' => $details,
            'financing_net' => round($netFinancingChange, 2),
        ];
    }

    /**
     * Helper to get the Cash/Bank balance at the end date.
     */
    private function getCashBalance(Collection $endBalances): float
    {
        $totalCash = 0;
        foreach ($endBalances as $data) {
            if (($data['subtype'] ?? null) === 'asset_cash') {
                $totalCash += $data['balance'];
            }
        }
        return round($totalCash, 2);
    }
}
