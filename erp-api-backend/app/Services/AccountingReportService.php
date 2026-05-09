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
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

class AccountingReportService
{
    protected Company $company;

    protected int $cacheTtl = 300;

    protected array $revenueTypes = [
        'Revenue',
        'Income',
        'Sales',
        'Other Income',
    ];

    protected array $expenseTypes = [
        'Expense',
        'Cost of Goods Sold',
        'Operating Expense',
        'Other Expense',
    ];

    protected array $creditNormalTypes = [
        'Liability',
        'Equity',
        'Revenue',
        'Income',
        'Other Income',
        'Sales',
    ];

    public function setCompany(Company $company): self
    {
        $this->company = $company;

        return $this;
    }

    protected function getCompanyId(): int
    {
        if (!isset($this->company)) {
            throw new RuntimeException('Company context not set for AccountingReportService.');
        }

        return (int) $this->company->id;
    }

    protected function cacheKey(string $name, array $parts = []): string
    {
        $safeParts = collect($parts)
            ->map(fn ($part) => is_scalar($part) ? (string) $part : md5(json_encode($part)))
            ->implode('_');

        return "company_{$this->getCompanyId()}_{$name}" . ($safeParts ? "_{$safeParts}" : '');
    }

    protected function rememberCache(string $key, callable $callback, ?int $ttl = null)
    {
        return Cache::remember($key, $ttl ?? $this->cacheTtl, $callback);
    }

    protected function dateKey(?Carbon $date): string
    {
        return $date ? $date->format('Ymd') : 'none';
    }

    protected function roundMoney($value): float
    {
        return round((float) $value, 2);
    }

    protected function postedJournalBaseQuery()
    {
        return DB::table('journal_entry_lines as jel')
            ->join('journal_entries as je', 'jel.journal_entry_id', '=', 'je.id')
            ->join('chart_of_accounts as coa', 'jel.chart_of_account_id', '=', 'coa.id')
            ->where('je.company_id', $this->getCompanyId())
            ->where('coa.company_id', $this->getCompanyId())
            ->where('je.status', 'posted');
    }

    /*
    |--------------------------------------------------------------------------
    | Schema-Safe Aging Helpers
    |--------------------------------------------------------------------------
    */

    private function moneyDueExpression(string $table): string
    {
        if (!Schema::hasTable($table)) {
            throw new RuntimeException("Table {$table} does not exist.");
        }

        if (!Schema::hasColumn($table, 'total_amount')) {
            throw new RuntimeException("Missing total_amount column on {$table}.");
        }

        $paidCandidates = [
            'amount_paid',
            'paid_amount',
            'amount_received',
            'total_paid',
        ];

        $paidColumn = collect($paidCandidates)
            ->first(fn ($column) => Schema::hasColumn($table, $column));

        $paidExpression = $paidColumn
            ? "COALESCE({$paidColumn}, 0)"
            : "0";

        return "COALESCE(total_amount, 0) - {$paidExpression}";
    }

    private function dateColumnForAging(string $table): string
    {
        $dateCandidates = [
            'due_date',
            'order_date',
            'invoice_date',
            'bill_date',
            'transaction_date',
            'created_at',
        ];

        $dateColumn = collect($dateCandidates)
            ->first(fn ($column) => Schema::hasColumn($table, $column));

        if (!$dateColumn) {
            throw new RuntimeException("No usable aging date column found on {$table}.");
        }

        return $dateColumn;
    }

    private function upperStatusWhereIn($query, array $statuses)
    {
        return $query->whereIn(DB::raw('UPPER(status)'), array_map('strtoupper', $statuses));
    }

    /*
    |--------------------------------------------------------------------------
    | Core Balance Engine
    |--------------------------------------------------------------------------
    */

    private function getSummedBalances(
        array $filters,
        ?Carbon $startDate = null,
        ?Carbon $endDate = null
    ): float {
        $endDate = ($endDate ?? now())->copy()->endOfDay();
        $startDate = $startDate?->copy()->startOfDay();

        $query = $this->postedJournalBaseQuery();

        if (!empty($filters['types'])) {
            $query->whereIn('coa.account_type', $filters['types']);
        }

        if (!empty($filters['subtypes'])) {
            $query->whereIn('coa.account_subtype', $filters['subtypes']);
        }

        if ($startDate) {
            $query->whereBetween('je.transaction_date', [$startDate, $endDate]);
        } else {
            $query->where('je.transaction_date', '<=', $endDate);
        }

        $rows = $query
            ->select(
                'coa.account_type',
                DB::raw('COALESCE(SUM(jel.debit), 0) as total_debit'),
                DB::raw('COALESCE(SUM(jel.credit), 0) as total_credit')
            )
            ->groupBy('coa.account_type')
            ->get();

        $total = 0;

        foreach ($rows as $row) {
            $raw = (float) $row->total_debit - (float) $row->total_credit;
            $total += $this->adjustBalanceSign($raw, $row->account_type);
        }

        return $this->roundMoney($total);
    }

    public function adjustBalanceSign(float $rawBalance, string $accountType): float
    {
        return in_array($accountType, $this->creditNormalTypes, true)
            ? -$rawBalance
            : $rawBalance;
    }

    public function calculateNetIncome($startDate, $endDate): float
    {
        $startDate = $startDate instanceof Carbon ? $startDate : Carbon::parse($startDate);
        $endDate = $endDate instanceof Carbon ? $endDate : Carbon::parse($endDate);

        $revenue = $this->getSummedBalances($this->filterByTypes($this->revenueTypes), $startDate, $endDate);
        $expenses = $this->getSummedBalances($this->filterByTypes($this->expenseTypes), $startDate, $endDate);

        return $this->roundMoney($revenue - $expenses);
    }

    protected function filterByTypes(array $types): array
    {
        return ['types' => $types];
    }

    protected function filterBySubtypes(array $subtypes): array
    {
        return ['subtypes' => $subtypes];
    }

    /*
    |--------------------------------------------------------------------------
    | Enterprise Dashboard APIs
    |--------------------------------------------------------------------------
    */

    public function getDashboardSummary(Carbon $startDate, Carbon $endDate): array
    {
        $startDate = $startDate->copy()->startOfDay();
        $endDate = $endDate->copy()->endOfDay();

        $cacheKey = $this->cacheKey('dashboard_summary', [
            $this->dateKey($startDate),
            $this->dateKey($endDate),
        ]);

        return $this->rememberCache($cacheKey, function () use ($startDate, $endDate) {
            $revenue = $this->getSummedBalances($this->filterByTypes($this->revenueTypes), $startDate, $endDate);
            $expenses = $this->getSummedBalances($this->filterByTypes($this->expenseTypes), $startDate, $endDate);

            $cashBalance = $this->getSummedBalances($this->filterBySubtypes(['asset_cash']), null, $endDate);
            $receivables = $this->getSummedBalances($this->filterBySubtypes(['asset_receivable']), null, $endDate);
            $payables = $this->getSummedBalances($this->filterBySubtypes(['liability_payable']), null, $endDate);

            return [
                'company_name' => $this->company->name,
                'period_start' => $startDate->toDateString(),
                'period_end' => $endDate->toDateString(),

                'revenue' => $revenue,
                'expenses' => $expenses,
                'net_income' => $this->roundMoney($revenue - $expenses),

                'cash_balance' => $cashBalance,
                'receivables' => $receivables,
                'payables' => $payables,

                'working_capital' => $this->roundMoney($cashBalance + $receivables - $payables),
            ];
        });
    }

    public function getFinancialTrends(int $months = 12): Collection
    {
        $months = max(1, min($months, 36));

        $cacheKey = $this->cacheKey('financial_trends', [$months]);

        return $this->rememberCache($cacheKey, function () use ($months) {
            return collect(range($months - 1, 0))
                ->map(function ($i) {
                    $date = now()->subMonths($i);
                    $start = $date->copy()->startOfMonth();
                    $end = $date->copy()->endOfMonth();

                    $revenue = $this->getSummedBalances($this->filterByTypes($this->revenueTypes), $start, $end);
                    $expenses = $this->getSummedBalances($this->filterByTypes($this->expenseTypes), $start, $end);

                    return [
                        'month' => $date->format('M Y'),
                        'sort_key' => $date->format('Y-m'),
                        'revenue' => $revenue,
                        'expenses' => $expenses,
                        'net_income' => $this->roundMoney($revenue - $expenses),
                    ];
                })
                ->values();
        }, 3600);
    }

    public function getKpiTargets(Carbon $startDate, Carbon $endDate): array
    {
        $report = $this->generateBudgetVsActuals($startDate, $endDate);

        return [
            'revenue_target' => $this->roundMoney(data_get($report, 'totals.revenue_budget', 0)),
            'revenue_actual' => $this->roundMoney(data_get($report, 'totals.revenue_actual', 0)),
            'expense_target' => $this->roundMoney(data_get($report, 'totals.expense_budget', 0)),
            'expense_actual' => $this->roundMoney(data_get($report, 'totals.expense_actual', 0)),
        ];
    }

    public function getAlerts(): array
    {
        $today = now();
        $yesterday = now()->subDay();

        $todayRevenue = $this->getSummedBalances(
            $this->filterByTypes($this->revenueTypes),
            $today->copy()->startOfDay(),
            $today
        );

        $yesterdayRevenue = $this->getSummedBalances(
            $this->filterByTypes($this->revenueTypes),
            $yesterday->copy()->startOfDay(),
            $yesterday->copy()->endOfDay()
        );

        $cashBalance = $this->getSummedBalances($this->filterBySubtypes(['asset_cash']), null, $today);
        $payables = $this->getSummedBalances($this->filterBySubtypes(['liability_payable']), null, $today);
        $receivables = $this->getSummedBalances($this->filterBySubtypes(['asset_receivable']), null, $today);

        $alerts = [];

        if ($yesterdayRevenue > 0 && (($todayRevenue - $yesterdayRevenue) / $yesterdayRevenue) > 0.5) {
            $alerts[] = [
                'type' => 'success',
                'title' => 'Revenue Spike Detected',
                'message' => "Today's revenue is tracking more than 50% higher than yesterday.",
            ];
        }

        if ($yesterdayRevenue > 0 && $todayRevenue < ($yesterdayRevenue * 0.5) && $today->hour > 12) {
            $alerts[] = [
                'type' => 'warning',
                'title' => 'Low Revenue Alert',
                'message' => 'Revenue is significantly lower than yesterday at this time.',
            ];
        }

        if ($payables > $cashBalance && $cashBalance > 0) {
            $alerts[] = [
                'type' => 'error',
                'title' => 'Liquidity Warning',
                'message' => 'Current payables exceed available cash on hand.',
            ];
        }

        if ($receivables > 0 && $receivables > ($todayRevenue * 3) && $todayRevenue > 0) {
            $alerts[] = [
                'type' => 'warning',
                'title' => 'Receivables Build-up',
                'message' => 'Outstanding receivables are high compared to current revenue.',
            ];
        }

        return $alerts;
    }

    public function getRevenueBreakdown(Carbon $startDate, Carbon $endDate): Collection
    {
        if (!Schema::hasTable('sales_orders')) {
            return collect();
        }

        return DB::table('sales_orders')
            ->join('customers', 'sales_orders.customer_id', '=', 'customers.id')
            ->where('sales_orders.company_id', $this->getCompanyId())
            ->whereBetween('sales_orders.order_date', [
                $startDate->copy()->startOfDay(),
                $endDate->copy()->endOfDay(),
            ])
            ->select(
                'customers.id as customer_id',
                'customers.name as customer_name',
                DB::raw('COALESCE(SUM(sales_orders.total_amount), 0) as total_revenue')
            )
            ->groupBy('customers.id', 'customers.name')
            ->orderByDesc('total_revenue')
            ->limit(10)
            ->get()
            ->map(function ($row) {
                $row->total_revenue = $this->roundMoney($row->total_revenue);
                return $row;
            });
    }

    /*
    |--------------------------------------------------------------------------
    | Core Financial Reports
    |--------------------------------------------------------------------------
    */

    public function generateTrialBalance(?Carbon $asOfDate = null): array
    {
        $asOfDate = ($asOfDate ?? now())->copy()->endOfDay();

        $cacheKey = $this->cacheKey('trial_balance', [$this->dateKey($asOfDate)]);

        return $this->rememberCache($cacheKey, function () use ($asOfDate) {
            $accounts = ChartOfAccount::where('company_id', $this->getCompanyId())
                ->orderBy('account_code')
                ->get(['id', 'account_code', 'account_name', 'account_type']);

            if ($accounts->isEmpty()) {
                return [
                    'company_name' => $this->company->name,
                    'as_of_date' => $asOfDate->toFormattedDateString(),
                    'debits' => [],
                    'credits' => [],
                    'total_debits' => 0,
                    'total_credits' => 0,
                    'status' => 'Balanced',
                    'difference' => 0,
                ];
            }

            $balances = DB::table('journal_entry_lines as jel')
                ->join('journal_entries as je', 'jel.journal_entry_id', '=', 'je.id')
                ->where('je.company_id', $this->getCompanyId())
                ->where('je.status', 'posted')
                ->whereIn('jel.chart_of_account_id', $accounts->pluck('id'))
                ->where('je.transaction_date', '<=', $asOfDate)
                ->select(
                    'jel.chart_of_account_id',
                    DB::raw('COALESCE(SUM(jel.debit), 0) as total_debit'),
                    DB::raw('COALESCE(SUM(jel.credit), 0) as total_credit')
                )
                ->groupBy('jel.chart_of_account_id')
                ->get()
                ->keyBy('chart_of_account_id');

            $debits = [];
            $credits = [];
            $totalDebits = 0;
            $totalCredits = 0;

            foreach ($accounts as $account) {
                $row = $balances->get($account->id);

                $netBalance = (float) ($row->total_debit ?? 0) - (float) ($row->total_credit ?? 0);

                if (abs($netBalance) < 0.01) {
                    continue;
                }

                $accountData = [
                    'account_id' => $account->id,
                    'account_code' => $account->account_code,
                    'account_name' => $account->account_name,
                ];

                if ($netBalance > 0) {
                    $accountData['balance'] = $this->roundMoney($netBalance);
                    $debits[] = $accountData;
                    $totalDebits += $netBalance;
                } else {
                    $accountData['balance'] = $this->roundMoney(abs($netBalance));
                    $credits[] = $accountData;
                    $totalCredits += abs($netBalance);
                }
            }

            $totalDebits = $this->roundMoney($totalDebits);
            $totalCredits = $this->roundMoney($totalCredits);
            $difference = $this->roundMoney($totalDebits - $totalCredits);

            return [
                'company_name' => $this->company->name,
                'as_of_date' => $asOfDate->toFormattedDateString(),
                'debits' => $debits,
                'credits' => $credits,
                'total_debits' => $totalDebits,
                'total_credits' => $totalCredits,
                'status' => abs($difference) < 0.01 ? 'Balanced' : 'Unbalanced',
                'difference' => abs($difference) < 0.01 ? 0 : $difference,
            ];
        });
    }

    public function generateProfitAndLoss(Carbon $startDate, Carbon $endDate): array
    {
        $startDate = $startDate->copy()->startOfDay();
        $endDate = $endDate->copy()->endOfDay();

        $cacheKey = $this->cacheKey('profit_loss', [
            $this->dateKey($startDate),
            $this->dateKey($endDate),
        ]);

        return $this->rememberCache($cacheKey, function () use ($startDate, $endDate) {
            $revenues = $this->getAccountBalances($this->revenueTypes, $endDate, $startDate);
            $expenses = $this->getAccountBalances($this->expenseTypes, $endDate, $startDate);

            $totalRevenue = $this->roundMoney($revenues->sum('balance'));
            $totalExpenses = $this->roundMoney($expenses->sum('balance'));

            return [
                'company_name' => $this->company->name,
                'period' => $startDate->toFormattedDateString() . ' - ' . $endDate->toFormattedDateString(),
                'period_start' => $startDate->toDateString(),
                'period_end' => $endDate->toDateString(),

                'revenues' => $revenues,
                'total_revenue' => $totalRevenue,

                'expenses' => $expenses,
                'total_expenses' => $totalExpenses,

                'net_income' => $this->roundMoney($totalRevenue - $totalExpenses),
            ];
        });
    }

    public function generateBalanceSheet(?Carbon $asOfDate = null): array
    {
        $asOfDate = ($asOfDate ?? now())->copy()->endOfDay();

        $cacheKey = $this->cacheKey('balance_sheet', [$this->dateKey($asOfDate)]);

        return $this->rememberCache($cacheKey, function () use ($asOfDate) {
            $assets = $this->getAccountBalances(['Asset'], $asOfDate);
            $liabilities = $this->getAccountBalances(['Liability'], $asOfDate);
            $equity = $this->getAccountBalances(['Equity'], $asOfDate);

            $startOfYear = $asOfDate->copy()->startOfYear();
            $netIncomeYtd = $this->calculateNetIncome($startOfYear, $asOfDate);

            if (abs($netIncomeYtd) >= 0.01) {
                $equity->push([
                    'account_id' => null,
                    'account_code' => 'NI-YTD',
                    'account_name' => 'Net Income (YTD)',
                    'account_subtype' => 'equity_retained_earnings',
                    'account_type' => 'Equity',
                    'balance' => $this->roundMoney($netIncomeYtd),
                ]);
            }

            $totalAssets = $this->roundMoney($assets->sum('balance'));
            $totalLiabilities = $this->roundMoney($liabilities->sum('balance'));
            $totalEquity = $this->roundMoney($equity->sum('balance'));
            $totalLiabilitiesAndEquity = $this->roundMoney($totalLiabilities + $totalEquity);

            $difference = $this->roundMoney($totalAssets - $totalLiabilitiesAndEquity);

            return [
                'company_name' => $this->company->name,
                'as_of_date' => $asOfDate->toFormattedDateString(),

                'assets' => [
                    'accounts' => $assets->groupBy('account_subtype'),
                    'total' => $totalAssets,
                ],

                'liabilities' => [
                    'accounts' => $liabilities->groupBy('account_subtype'),
                    'total' => $totalLiabilities,
                ],

                'equity' => [
                    'accounts' => $equity->groupBy('account_subtype'),
                    'total' => $totalEquity,
                ],

                'total_liabilities_and_equity' => $totalLiabilitiesAndEquity,
                'difference' => abs($difference) < 0.01 ? 0 : $difference,
                'check_balance' => abs($difference) < 0.01 ? 'Balanced' : 'Unbalanced',
            ];
        });
    }

    public function generateCashFlowStatement(Carbon $startDate, Carbon $endDate): array
    {
        $startDate = $startDate->copy()->startOfDay();
        $endDate = $endDate->copy()->endOfDay();

        $cacheKey = $this->cacheKey('cash_flow_statement', [
            $this->dateKey($startDate),
            $this->dateKey($endDate),
        ]);

        return $this->rememberCache($cacheKey, function () use ($startDate, $endDate) {
            $netIncome = $this->calculateNetIncome($startDate, $endDate);

            $startBalances = $this->getAllAccountBalancesCumulative($startDate->copy()->subSecond());
            $endBalances = $this->getAllAccountBalancesCumulative($endDate);

            $operatingChanges = $this->calculateOperatingChanges($startBalances, $endBalances);
            $cashFlowFromOperations = $this->roundMoney($netIncome + $operatingChanges['operating_net_adjustment']);

            $investing = $this->calculateInvestingChanges($startBalances, $endBalances);
            $financing = $this->calculateFinancingChanges($startBalances, $endBalances);

            $netChangeInCash = $this->roundMoney(
                $cashFlowFromOperations + $investing['investing_net'] + $financing['financing_net']
            );

            $endingCashBalance = $this->getCashBalance($endBalances);
            $beginningCashBalance = $this->getCashBalance($startBalances);

            return [
                'company_name' => $this->company->name,
                'report_period' => $startDate->toFormattedDateString() . ' to ' . $endDate->toFormattedDateString(),
                'period_start' => $startDate->toDateString(),
                'period_end' => $endDate->toDateString(),

                'net_income' => $this->roundMoney($netIncome),

                'operating' => [
                    'details' => $operatingChanges['operating_details'],
                    'total' => $cashFlowFromOperations,
                ],

                'investing' => [
                    'details' => $investing['details'],
                    'total' => $this->roundMoney($investing['investing_net']),
                ],

                'financing' => [
                    'details' => $financing['details'],
                    'total' => $this->roundMoney($financing['financing_net']),
                ],

                'net_change_in_cash' => $netChangeInCash,
                'beginning_cash_balance' => $beginningCashBalance,
                'ending_cash_balance' => $endingCashBalance,
                'cash_reconciliation_difference' => $this->roundMoney(
                    ($beginningCashBalance + $netChangeInCash) - $endingCashBalance
                ),
            ];
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Budget, Ratios, Aging, Tax, Period Close
    |--------------------------------------------------------------------------
    */

    public function generateBudgetVsActuals(Carbon $startDate, Carbon $endDate): array
    {
        $startDate = $startDate->copy()->startOfDay();
        $endDate = $endDate->copy()->endOfDay();

        $revenueActuals = $this->getAccountBalances($this->revenueTypes, $endDate, $startDate);
        $expenseActuals = $this->getAccountBalances($this->expenseTypes, $endDate, $startDate);
        $allActuals = $revenueActuals->merge($expenseActuals);

        $budgets = Budget::where('company_id', $this->getCompanyId())
            ->whereBetween('period', [
                $startDate->copy()->format('Y-m-01'),
                $endDate->copy()->format('Y-m-t'),
            ])
            ->get()
            ->groupBy('chart_of_account_id')
            ->map(fn ($group) => $this->roundMoney($group->sum('amount')));

        $coaMap = ChartOfAccount::where('company_id', $this->getCompanyId())
            ->where(function ($query) {
                $query->whereIn('account_type', array_merge($this->revenueTypes, $this->expenseTypes))
                    ->orWhereIn('account_subtype', [
                        'revenue_sales',
                        'revenue_other',
                        'expense_cogs',
                        'expense_operating',
                        'expense_other',
                    ]);
            })
            ->get()
            ->keyBy('id');

        $actualsByAccountId = $allActuals->keyBy('account_id');

        $reportLines = [];

        foreach ($coaMap as $accountId => $account) {
            $actualAmount = $this->roundMoney(data_get($actualsByAccountId, "{$accountId}.balance", 0));
            $budgetAmount = $this->roundMoney($budgets->get($accountId, 0));

            if (abs($actualAmount) < 0.01 && abs($budgetAmount) < 0.01) {
                continue;
            }

            $variance = $this->roundMoney($actualAmount - $budgetAmount);

            $variancePercent = abs($budgetAmount) > 0
                ? ($variance / abs($budgetAmount)) * 100
                : (abs($actualAmount) > 0 ? 100 : 0);

            $groupType = in_array($account->account_type, $this->revenueTypes, true)
                ? 'Revenue'
                : 'Expense';

            $reportLines[] = [
                'account_id' => $accountId,
                'account_code' => $account->account_code,
                'account_name' => $account->account_name,
                'type' => $account->account_type,
                'subtype' => $account->account_subtype,
                'group_type' => $groupType,
                'actual' => $actualAmount,
                'budget' => $budgetAmount,
                'variance' => $variance,
                'variance_percent' => round($variancePercent, 1),
            ];
        }

        $grouped = collect($reportLines)->groupBy('group_type');

        return [
            'company_name' => $this->company->name,
            'report_period' => $startDate->toFormattedDateString() . ' to ' . $endDate->toFormattedDateString(),
            'period_start' => $startDate->toDateString(),
            'period_end' => $endDate->toDateString(),

            'revenue' => $grouped->get('Revenue', collect())->values(),
            'expenses' => $grouped->get('Expense', collect())->values(),

            'totals' => [
                'revenue_actual' => $this->roundMoney(collect($grouped->get('Revenue', []))->sum('actual')),
                'revenue_budget' => $this->roundMoney(collect($grouped->get('Revenue', []))->sum('budget')),
                'expense_actual' => $this->roundMoney(collect($grouped->get('Expense', []))->sum('actual')),
                'expense_budget' => $this->roundMoney(collect($grouped->get('Expense', []))->sum('budget')),
            ],
        ];
    }

    public function getBudgetSummary(Carbon $startDate, Carbon $endDate): array
    {
        $report = $this->generateBudgetVsActuals($startDate, $endDate);

        $revenueActual = (float) data_get($report, 'totals.revenue_actual', 0);
        $revenueBudget = (float) data_get($report, 'totals.revenue_budget', 0);
        $expenseActual = (float) data_get($report, 'totals.expense_actual', 0);
        $expenseBudget = (float) data_get($report, 'totals.expense_budget', 0);

        $actualTotal = $revenueActual - $expenseActual;
        $budgetTotal = $revenueBudget - $expenseBudget;
        $varianceAmount = $actualTotal - $budgetTotal;

        $variancePercent = abs($budgetTotal) > 0
            ? ($varianceAmount / abs($budgetTotal)) * 100
            : (abs($actualTotal) > 0 ? 100 : 0);

        $utilizationPercent = abs($expenseBudget) > 0
            ? ($expenseActual / $expenseBudget) * 100
            : 0;

        return [
            'company_name' => data_get($report, 'company_name', $this->company->name),
            'report_period' => data_get($report, 'report_period'),

            'revenue_actual' => $this->roundMoney($revenueActual),
            'revenue_budget' => $this->roundMoney($revenueBudget),
            'expense_actual' => $this->roundMoney($expenseActual),
            'expense_budget' => $this->roundMoney($expenseBudget),

            'actual_total' => $this->roundMoney($actualTotal),
            'budget_total' => $this->roundMoney($budgetTotal),

            'variance_amount' => $this->roundMoney($varianceAmount),
            'variance' => round($variancePercent, 1),

            'utilization_amount' => $this->roundMoney($expenseActual),
            'utilization_percent' => round($utilizationPercent, 1),
        ];
    }

    public function getKeyRatios(): array
    {
        $endDate = now()->endOfDay();

        $currentAssets = $this->getSummedBalances($this->filterBySubtypes([
            'asset_cash',
            'asset_receivable',
            'asset_inventory',
            'asset_prepaid',
            'asset_current_other',
        ]), null, $endDate);

        $inventory = $this->getSummedBalances($this->filterBySubtypes(['asset_inventory']), null, $endDate);

        $currentLiabilities = $this->getSummedBalances($this->filterBySubtypes([
            'liability_payable',
            'liability_unearned_revenue',
            'liability_tax_payable',
            'liability_current_other',
            'liability_credit_card',
        ]), null, $endDate);

        $startOfYear = $endDate->copy()->startOfYear();
        $revenueYtd = $this->getSummedBalances($this->filterByTypes($this->revenueTypes), $startOfYear, $endDate);
        $expensesYtd = $this->getSummedBalances($this->filterByTypes($this->expenseTypes), $startOfYear, $endDate);

        $netIncomeYtd = $revenueYtd - $expensesYtd;

        return [
            'company_name' => $this->company->name,
            'as_of_date' => $endDate->toFormattedDateString(),

            'current_assets' => $this->roundMoney($currentAssets),
            'current_liabilities' => $this->roundMoney($currentLiabilities),
            'inventory' => $this->roundMoney($inventory),

            'current_ratio' => $currentLiabilities != 0
                ? round($currentAssets / $currentLiabilities, 2)
                : 0,

            'quick_ratio' => $currentLiabilities != 0
                ? round(($currentAssets - $inventory) / $currentLiabilities, 2)
                : 0,

            'net_profit_margin_ytd' => $revenueYtd != 0
                ? round(($netIncomeYtd / $revenueYtd) * 100, 2)
                : 0,

            'ytd_net_income' => $this->roundMoney($netIncomeYtd),
            'ytd_revenue' => $this->roundMoney($revenueYtd),
        ];
    }

    public function generateAccountsReceivableAging(array $customBuckets = []): array
    {
        $table = 'sales_orders';

        $buckets = $customBuckets ?: [
            'current' => [0, 30],
            '31-60' => [31, 60],
            '61-90' => [61, 90],
            '90+' => [91, null],
        ];

        $customerLabel = match (strtolower($this->company->industry ?? 'generic')) {
            'school', 'education' => 'Student/Parent',
            'hospital', 'healthcare' => 'Patient',
            'lawfirm', 'legal' => 'Client',
            default => 'Customer',
        };

        $unpaidStatuses = ['PENDING', 'PARTIAL', 'APPROVED'];

        $dueExpression = $this->moneyDueExpression($table);
        $dateColumn = $this->dateColumnForAging($table);

        $selects = [
            'customer_id',
            DB::raw("COALESCE(SUM({$dueExpression}), 0) as total_due"),
        ];

        foreach ($buckets as $name => [$min, $max]) {
            $alias = str_replace('`', '', $name);

            $condition = "DATEDIFF(CURDATE(), {$dateColumn}) >= {$min}";

            if ($max !== null) {
                $condition .= " AND DATEDIFF(CURDATE(), {$dateColumn}) <= {$max}";
            }

            $selects[] = DB::raw(
                "COALESCE(SUM(CASE WHEN {$condition} THEN ({$dueExpression}) ELSE 0 END), 0) as `{$alias}`"
            );
        }

        $query = SalesOrder::where('company_id', $this->getCompanyId())
            ->whereRaw("ROUND({$dueExpression}, 2) > 0")
            ->with('customer:id,name')
            ->select($selects)
            ->groupBy('customer_id');

        $this->upperStatusWhereIn($query, $unpaidStatuses);

        $rows = $query->get();

        $totals = [
            'total_due' => $this->roundMoney($rows->sum('total_due')),
        ];

        foreach (array_keys($buckets) as $bucketName) {
            $totals[$bucketName] = $this->roundMoney($rows->sum($bucketName));
        }

        return [
            'company_name' => $this->company->name,
            'report_date' => now()->toFormattedDateString(),
            'customer_label' => $customerLabel,
            'bucket_definitions' => $buckets,
            'totals' => $totals,
            'details' => $rows->map(function ($row) use ($customerLabel, $buckets) {
                $data = [
                    'customer_id' => $row->customer_id,
                    $customerLabel . '_name' => optional($row->customer)->name ?? 'Unknown',
                    'total_due' => $this->roundMoney($row->total_due),
                ];

                foreach (array_keys($buckets) as $bucketName) {
                    $data[$bucketName] = $this->roundMoney($row->{$bucketName} ?? 0);
                }

                return $data;
            })->values(),
        ];
    }

    public function generateAccountsPayableAging(array $customBuckets = []): array
    {
        $table = 'purchase_orders';

        $buckets = $customBuckets ?: [
            'current' => [0, 30],
            '31-60' => [31, 60],
            '61-90' => [61, 90],
            '90+' => [91, null],
        ];

        $unpaidStatuses = ['PENDING', 'PARTIAL', 'APPROVED', 'RECEIVED'];

        $dueExpression = $this->moneyDueExpression($table);
        $dateColumn = $this->dateColumnForAging($table);

        $selects = [
            'supplier_id',
            DB::raw("COALESCE(SUM({$dueExpression}), 0) as total_due"),
        ];

        foreach ($buckets as $name => [$min, $max]) {
            $alias = str_replace('`', '', $name);

            $condition = "DATEDIFF(CURDATE(), {$dateColumn}) >= {$min}";

            if ($max !== null) {
                $condition .= " AND DATEDIFF(CURDATE(), {$dateColumn}) <= {$max}";
            }

            $selects[] = DB::raw(
                "COALESCE(SUM(CASE WHEN {$condition} THEN ({$dueExpression}) ELSE 0 END), 0) as `{$alias}`"
            );
        }

        $query = PurchaseOrder::where('company_id', $this->getCompanyId())
            ->whereRaw("ROUND({$dueExpression}, 2) > 0")
            ->with('supplier:id,name')
            ->select($selects)
            ->groupBy('supplier_id');

        $this->upperStatusWhereIn($query, $unpaidStatuses);

        $rows = $query->get();

        $totals = [
            'total_due' => $this->roundMoney($rows->sum('total_due')),
        ];

        foreach (array_keys($buckets) as $bucketName) {
            $totals[$bucketName] = $this->roundMoney($rows->sum($bucketName));
        }

        return [
            'company_name' => $this->company->name,
            'report_date' => now()->toFormattedDateString(),
            'bucket_definitions' => $buckets,
            'totals' => $totals,
            'details' => $rows->map(function ($row) use ($buckets) {
                $data = [
                    'supplier_id' => $row->supplier_id,
                    'supplier_name' => optional($row->supplier)->name ?? 'Unknown',
                    'total_due' => $this->roundMoney($row->total_due),
                ];

                foreach (array_keys($buckets) as $bucketName) {
                    $data[$bucketName] = $this->roundMoney($row->{$bucketName} ?? 0);
                }

                return $data;
            })->values(),
        ];
    }

    public function getCashflowSummary(Carbon $startDate, Carbon $endDate): array
    {
        $report = $this->generateCashFlowStatement($startDate, $endDate);

        return [
            'company_name' => data_get($report, 'company_name', $this->company->name),
            'report_period' => data_get($report, 'report_period'),

            'net_income' => $this->roundMoney(data_get($report, 'net_income', 0)),

            'operating_cashflow' => $this->roundMoney(data_get($report, 'operating.total', 0)),
            'investing_cashflow' => $this->roundMoney(data_get($report, 'investing.total', 0)),
            'financing_cashflow' => $this->roundMoney(data_get($report, 'financing.total', 0)),

            'net_cashflow' => $this->roundMoney(data_get($report, 'net_change_in_cash', 0)),
            'beginning_cash_balance' => $this->roundMoney(data_get($report, 'beginning_cash_balance', 0)),
            'ending_cash_balance' => $this->roundMoney(data_get($report, 'ending_cash_balance', 0)),
        ];
    }

    public function getTaxSummary(Carbon $endDate): array
    {
        $endDate = $endDate->copy()->endOfMonth();
        $monthStart = $endDate->copy()->startOfMonth();

        $payslips = Payslip::where('company_id', $this->getCompanyId())
            ->whereBetween('pay_period_end', [
                $monthStart->toDateString(),
                $endDate->toDateString(),
            ])
            ->get();

        $paye = 0;
        $nssf = 0;
        $nhif = 0;
        $housingLevy = 0;

        foreach ($payslips as $payslip) {
            $deductions = $this->normalizeArray($payslip->deductions);

            $paye += (float) ($payslip->tax_paid ?? 0);
            $nssf += (float) ($deductions['nssf'] ?? 0);
            $nhif += (float) ($deductions['nhif'] ?? 0);
            $housingLevy += (float) ($deductions['housing_levy'] ?? 0);
        }

        $vatPayable = $this->getSummedBalances(
            $this->filterBySubtypes(['liability_tax_payable']),
            null,
            $endDate
        );

        return [
            'company_name' => $this->company->name,
            'period' => $endDate->format('F Y'),

            'vat_payable' => $this->roundMoney($vatPayable),
            'paye_payable' => $this->roundMoney($paye),
            'nssf_payable' => $this->roundMoney($nssf),
            'nhif_payable' => $this->roundMoney($nhif),
            'housing_levy' => $this->roundMoney($housingLevy),

            'withholding_tax' => 0,
            'other_statutory' => $this->roundMoney($nssf + $nhif + $housingLevy),
            'total_tax_exposure' => $this->roundMoney($vatPayable + $paye + $nssf + $nhif + $housingLevy),
        ];
    }

    public function getPeriodStatus(?Carbon $date = null): array
    {
        $date = ($date ?? now())->copy();

        $startDate = $date->copy()->startOfMonth();
        $endDate = $date->copy()->endOfMonth();

        $postedEntries = DB::table('journal_entries')
            ->where('company_id', $this->getCompanyId())
            ->whereBetween('transaction_date', [$startDate, $endDate])
            ->where('status', 'posted')
            ->count();

        $draftEntries = DB::table('journal_entries')
            ->where('company_id', $this->getCompanyId())
            ->whereBetween('transaction_date', [$startDate, $endDate])
            ->where('status', 'draft')
            ->count();

        $trialBalance = $this->generateTrialBalance($endDate);

        $isBalanced = ($trialBalance['status'] ?? null) === 'Balanced';
        $hasDrafts = $draftEntries > 0;

        return [
            'company_name' => $this->company->name,
            'period' => $date->format('F Y'),
            'period_start' => $startDate->toDateString(),
            'period_end' => $endDate->toDateString(),

            'status' => $isBalanced && !$hasDrafts ? 'Ready to close' : 'Open',
            'is_balanced' => $isBalanced,
            'has_draft_entries' => $hasDrafts,

            'posted_entries' => $postedEntries,
            'draft_entries' => $draftEntries,
            'trial_balance_status' => $trialBalance['status'] ?? 'Unknown',
            'trial_balance_difference' => $this->roundMoney($trialBalance['difference'] ?? 0),
        ];
    }

    public function getFinanceDashboardBundle(Carbon $startDate, Carbon $endDate): array
    {
        return [
            'summary' => $this->getDashboardSummary($startDate, $endDate),
            'trends' => $this->getFinancialTrends(6)->values(),
            'ratios' => $this->getKeyRatios(),
            'alerts' => $this->getAlerts(),
            'ar_aging' => $this->generateAccountsReceivableAging(),
            'ap_aging' => $this->generateAccountsPayableAging(),
            'cashflow' => $this->getCashflowSummary($startDate, $endDate),
            'budget' => $this->getBudgetSummary($startDate, $endDate),
            'tax' => $this->getTaxSummary($endDate),
            'period' => $this->getPeriodStatus($endDate),
            'metadata' => [
                'generated_at' => now()->toISOString(),
                'company_id' => $this->getCompanyId(),
                'period_start' => $startDate->toDateString(),
                'period_end' => $endDate->toDateString(),
            ],
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Payroll Reports
    |--------------------------------------------------------------------------
    */

    public function generateBankPaymentList(Carbon $endDate, array $options = []): array
    {
        $query = Payslip::where('company_id', $this->getCompanyId())
            ->where('pay_period_end', $endDate->copy()->toDateString())
            ->with('user.employeeProfile');

        if (isset($options['department_id'])) {
            $query->whereHas('user.employeeProfile', function ($q) use ($options) {
                $q->where('department_id', $options['department_id']);
            });
        }

        $payslips = $query->get();

        $paymentList = $payslips->map(function ($payslip) {
            $profile = $payslip->user?->employeeProfile;

            return [
                'employee_id' => $payslip->user?->id,
                'employee_name' => $payslip->user?->name ?? 'Unknown',
                'bank_name' => $profile->bank_name ?? 'N/A',
                'bank_account_number' => $profile->bank_account_number ?? $profile->bank_account ?? 'N/A',
                'bank_branch' => $profile->bank_branch ?? null,
                'net_pay' => $this->roundMoney($payslip->net_pay),
            ];
        });

        return [
            'company_name' => $this->company->name,
            'pay_period' => $endDate->format('F Y'),
            'total_net_payable' => $this->roundMoney($payslips->sum('net_pay')),
            'payment_list' => $paymentList->values()->toArray(),
        ];
    }

    public function generateStatutoryReport(Carbon $endDate): array
    {
        $payslips = Payslip::where('company_id', $this->getCompanyId())
            ->where('pay_period_end', $endDate->copy()->toDateString())
            ->with('user.employeeProfile')
            ->get();

        $labels = match (strtolower($this->company->industry ?? 'generic')) {
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

        $totals = [
            'paye' => 0,
            'nssf' => 0,
            'nhif' => 0,
            'housing_levy' => 0,
        ];

        $details = $payslips->map(function ($payslip) use (&$totals) {
            $profile = $payslip->user?->employeeProfile;
            $deductions = $this->normalizeArray($payslip->deductions);

            $paye = (float) ($payslip->tax_paid ?? 0);
            $nssf = (float) ($deductions['nssf'] ?? 0);
            $nhif = (float) ($deductions['nhif'] ?? 0);
            $housingLevy = (float) ($deductions['housing_levy'] ?? 0);

            $totals['paye'] += $paye;
            $totals['nssf'] += $nssf;
            $totals['nhif'] += $nhif;
            $totals['housing_levy'] += $housingLevy;

            return [
                'employee_id' => $payslip->user?->id,
                'employee_name' => $payslip->user?->name ?? 'Unknown',
                'kra_pin' => $profile->kra_pin ?? 'N/A',
                'nssf_number' => $profile->nssf_number ?? 'N/A',
                'nhif_number' => $profile->nhif_number ?? 'N/A',
                'paye' => $this->roundMoney($paye),
                'nssf' => $this->roundMoney($nssf),
                'nhif' => $this->roundMoney($nhif),
                'housing_levy' => $this->roundMoney($housingLevy),
            ];
        });

        return [
            'company_name' => $this->company->name,
            'pay_period' => $endDate->format('F Y'),
            'labels' => $labels,
            'totals' => array_map(fn ($value) => $this->roundMoney($value), $totals),
            'details' => $details->values()->toArray(),
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Ledger Helpers
    |--------------------------------------------------------------------------
    */

    public function generateGeneralLedger(int $accountId, Carbon $startDate, Carbon $endDate): array
    {
        $account = ChartOfAccount::where('company_id', $this->getCompanyId())
            ->findOrFail($accountId);

        $startDate = $startDate->copy()->startOfDay();
        $endDate = $endDate->copy()->endOfDay();

        $openingBalanceData = JournalEntryLine::where('chart_of_account_id', $accountId)
            ->whereHas('journalEntry', function ($q) use ($startDate) {
                $q->where('company_id', $this->getCompanyId())
                    ->where('status', 'posted')
                    ->where('transaction_date', '<', $startDate);
            })
            ->selectRaw('COALESCE(SUM(debit), 0) as total_debit, COALESCE(SUM(credit), 0) as total_credit')
            ->first();

        $openingRaw = (float) ($openingBalanceData->total_debit ?? 0)
            - (float) ($openingBalanceData->total_credit ?? 0);

        $openingBalance = $this->adjustBalanceSign($openingRaw, $account->account_type);
        $runningBalance = $openingBalance;

        $isCreditAccount = in_array($account->account_type, $this->creditNormalTypes, true);

        $lines = JournalEntryLine::where('chart_of_account_id', $accountId)
            ->whereHas('journalEntry', function ($q) use ($startDate, $endDate) {
                $q->where('company_id', $this->getCompanyId())
                    ->where('status', 'posted')
                    ->whereBetween('transaction_date', [$startDate, $endDate]);
            })
            ->with('journalEntry')
            ->get()
            ->sortBy([
                fn ($a, $b) => strcmp((string) $a->journalEntry?->transaction_date, (string) $b->journalEntry?->transaction_date),
                fn ($a, $b) => $a->journal_entry_id <=> $b->journal_entry_id,
            ]);

        $transactions = $lines->map(function ($line) use (&$runningBalance, $isCreditAccount) {
            $movement = (float) $line->debit - (float) $line->credit;

            if ($isCreditAccount) {
                $movement = -$movement;
            }

            $runningBalance += $movement;

            return [
                'date' => optional($line->journalEntry?->transaction_date)->toFormattedDateString(),
                'journal_entry_id' => $line->journalEntry?->id,
                'description' => $line->journalEntry?->description,
                'debit' => $this->roundMoney($line->debit),
                'credit' => $this->roundMoney($line->credit),
                'balance' => $this->roundMoney($runningBalance),
            ];
        })->values();

        return [
            'company_name' => $this->company->name,
            'account_id' => $account->id,
            'account_name' => $account->account_name,
            'account_code' => $account->account_code,
            'period' => $startDate->toFormattedDateString() . ' - ' . $endDate->toFormattedDateString(),
            'opening_balance' => $this->roundMoney($openingBalance),
            'transactions' => $transactions,
            'closing_balance' => $this->roundMoney($runningBalance),
        ];
    }

    public function getAccountBalances(array $types, $endDate, $startDate = null): Collection
    {
        $endDate = $endDate instanceof Carbon
            ? $endDate->copy()->endOfDay()
            : Carbon::parse($endDate)->endOfDay();

        $startDate = $startDate
            ? ($startDate instanceof Carbon ? $startDate->copy()->startOfDay() : Carbon::parse($startDate)->startOfDay())
            : null;

        $query = DB::table('chart_of_accounts as coa')
            ->leftJoin('journal_entry_lines as jel', 'coa.id', '=', 'jel.chart_of_account_id')
            ->leftJoin('journal_entries as je', function ($join) use ($startDate, $endDate) {
                $join->on('jel.journal_entry_id', '=', 'je.id')
                    ->where('je.company_id', '=', $this->getCompanyId())
                    ->where('je.status', '=', 'posted');

                if ($startDate) {
                    $join->whereBetween('je.transaction_date', [$startDate, $endDate]);
                } else {
                    $join->where('je.transaction_date', '<=', $endDate);
                }
            })
            ->where('coa.company_id', $this->getCompanyId())
            ->whereIn('coa.account_type', $types)
            ->select(
                'coa.id',
                'coa.account_code',
                'coa.account_name',
                'coa.account_type',
                'coa.account_subtype',
                DB::raw('COALESCE(SUM(CASE WHEN je.id IS NOT NULL THEN jel.debit ELSE 0 END), 0) as total_debit'),
                DB::raw('COALESCE(SUM(CASE WHEN je.id IS NOT NULL THEN jel.credit ELSE 0 END), 0) as total_credit')
            )
            ->groupBy(
                'coa.id',
                'coa.account_code',
                'coa.account_name',
                'coa.account_type',
                'coa.account_subtype'
            )
            ->orderBy('coa.account_code')
            ->get();

        return $query
            ->map(function ($account) {
                $rawBalance = (float) $account->total_debit - (float) $account->total_credit;
                $balance = $this->adjustBalanceSign($rawBalance, $account->account_type);

                return [
                    'account_id' => $account->id,
                    'account_code' => $account->account_code,
                    'account_name' => $account->account_name,
                    'account_type' => $account->account_type,
                    'account_subtype' => $account->account_subtype,
                    'balance' => $this->roundMoney($balance),
                ];
            })
            ->filter(fn ($account) => abs($account['balance']) >= 0.01)
            ->values();
    }

    private function getAllAccountBalancesCumulative(Carbon $date): Collection
    {
        $rows = DB::table('chart_of_accounts as coa')
            ->leftJoin('journal_entry_lines as jel', 'coa.id', '=', 'jel.chart_of_account_id')
            ->leftJoin('journal_entries as je', function ($join) use ($date) {
                $join->on('jel.journal_entry_id', '=', 'je.id')
                    ->where('je.company_id', '=', $this->getCompanyId())
                    ->where('je.status', '=', 'posted')
                    ->where('je.transaction_date', '<=', $date);
            })
            ->where('coa.company_id', $this->getCompanyId())
            ->whereIn('coa.account_type', ['Asset', 'Liability', 'Equity'])
            ->select(
                'coa.id',
                'coa.account_name',
                'coa.account_type',
                'coa.account_subtype',
                DB::raw('COALESCE(SUM(CASE WHEN je.id IS NOT NULL THEN jel.debit ELSE 0 END), 0) as total_debit'),
                DB::raw('COALESCE(SUM(CASE WHEN je.id IS NOT NULL THEN jel.credit ELSE 0 END), 0) as total_credit')
            )
            ->groupBy('coa.id', 'coa.account_name', 'coa.account_type', 'coa.account_subtype')
            ->get();

        return $rows->mapWithKeys(function ($account) {
            $raw = (float) $account->total_debit - (float) $account->total_credit;

            return [
                $account->id => [
                    'id' => $account->id,
                    'name' => $account->account_name,
                    'type' => $account->account_type,
                    'subtype' => $account->account_subtype,
                    'balance' => $this->roundMoney(
                        $this->adjustBalanceSign($raw, $account->account_type)
                    ),
                ],
            ];
        });
    }

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

        foreach ($endBalances as $accountId => $data) {
            $subtype = $data['subtype'] ?? null;

            if (!$subtype || !isset($operatingSubtypes[$subtype])) {
                continue;
            }

            $start = (float) data_get($startBalances, "{$accountId}.balance", 0);
            $end = (float) $data['balance'];
            $change = $end - $start;

            if (abs($change) <= 0.01) {
                continue;
            }

            $adjustment = $change * $operatingSubtypes[$subtype];
            $netAdjustment += $adjustment;

            $details[] = [
                'account' => 'Change in ' . $data['name'],
                'change' => $this->roundMoney($change),
                'adjustment' => $this->roundMoney($adjustment),
            ];
        }

        foreach ($endBalances as $accountId => $data) {
            if (($data['subtype'] ?? null) !== 'contra_asset_depreciation') {
                continue;
            }

            $start = abs((float) data_get($startBalances, "{$accountId}.balance", 0));
            $end = abs((float) $data['balance']);
            $change = $end - $start;

            if ($change <= 0.01) {
                continue;
            }

            $details[] = [
                'account' => 'Add back: Depreciation/Amortization (' . $data['name'] . ')',
                'change' => $this->roundMoney($change),
                'adjustment' => $this->roundMoney($change),
            ];

            $netAdjustment += $change;
        }

        return [
            'operating_details' => $details,
            'operating_net_adjustment' => $this->roundMoney($netAdjustment),
        ];
    }

    private function calculateInvestingChanges(Collection $startBalances, Collection $endBalances): array
    {
        $details = [];
        $netInvestingChange = 0;

        $investingSubtypes = [
            'asset_fixed',
            'asset_non_current_investment',
        ];

        foreach ($endBalances as $accountId => $data) {
            if (!in_array($data['subtype'] ?? null, $investingSubtypes, true)) {
                continue;
            }

            $start = (float) data_get($startBalances, "{$accountId}.balance", 0);
            $end = (float) $data['balance'];
            $change = $end - $start;

            if (abs($change) <= 0.01) {
                continue;
            }

            $adjustment = -$change;
            $netInvestingChange += $adjustment;

            $details[] = [
                'account' => 'Purchase/Sale of ' . $data['name'] . ' (Net)',
                'change' => $this->roundMoney($change),
                'adjustment' => $this->roundMoney($adjustment),
            ];
        }

        return [
            'details' => $details,
            'investing_net' => $this->roundMoney($netInvestingChange),
        ];
    }

    private function calculateFinancingChanges(Collection $startBalances, Collection $endBalances): array
    {
        $details = [];
        $netFinancingChange = 0;

        $financingSubtypes = [
            'liability_long_term_debt',
            'equity_capital',
        ];

        foreach ($endBalances as $accountId => $data) {
            if (!in_array($data['subtype'] ?? null, $financingSubtypes, true)) {
                continue;
            }

            $start = (float) data_get($startBalances, "{$accountId}.balance", 0);
            $end = (float) $data['balance'];
            $change = $end - $start;

            if (abs($change) <= 0.01) {
                continue;
            }

            $netFinancingChange += $change;

            $details[] = [
                'account' => 'Change in ' . $data['name'],
                'change' => $this->roundMoney($change),
                'adjustment' => $this->roundMoney($change),
            ];
        }

        return [
            'details' => $details,
            'financing_net' => $this->roundMoney($netFinancingChange),
        ];
    }

    private function getCashBalance(Collection $balances): float
    {
        return $this->roundMoney(
            $balances
                ->filter(fn ($data) => ($data['subtype'] ?? null) === 'asset_cash')
                ->sum('balance')
        );
    }

    private function normalizeArray($value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (is_string($value)) {
            return json_decode($value, true) ?: [];
        }

        return [];
    }
}
