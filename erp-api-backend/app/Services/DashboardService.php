<?php

namespace App\Services;

use App\Models\User;
use App\Models\Accounts\ChartOfAccount;
use App\Models\Inventory\SalesOrder;
use App\Models\PurchaseOrder;
use App\Models\Inventory\Product;
use App\Models\CRM\Customer;
use App\Models\Supplier;
use App\Models\Company;
use App\Models\SystemAlert;
use Carbon\Carbon;
use Illuminate\Cache\TaggableStore;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Throwable;

class DashboardService
{
    protected User $user;
    protected ?Company $company;
    protected int $companyId;
    protected string $companyIndustry;
    protected int $timeframeDays;
    protected int $defaultCacheTtl;

    protected Carbon $startDate;
    protected Carbon $endDate;
    protected Carbon $previousPeriodStart;
    protected Carbon $previousPeriodEnd;

    protected array $balancesCache = [];

    public function __construct(User $user, int $timeframeDays = 30)
    {
        $this->user = $user->loadMissing('company');
        $this->company = $this->user->company;
        $this->companyId = (int) $this->user->company_id;
        $this->companyIndustry = strtolower((string) ($this->company?->industry ?? 'generic'));
        $this->timeframeDays = max(7, min($timeframeDays, 365));
        $this->defaultCacheTtl = (int) config('dashboard.cache_ttl', 300);

        $now = now();

        $this->endDate = $now->copy()->endOfDay();
        $this->startDate = $now->copy()->subDays($this->timeframeDays)->startOfDay();

        $this->previousPeriodEnd = $this->startDate->copy()->subSecond();
        $this->previousPeriodStart = $this->previousPeriodEnd
            ->copy()
            ->subDays($this->timeframeDays)
            ->startOfDay();
    }

    public function getDashboardData(): array
    {
        $data = [];
        $failedSections = [];
        $cacheStatus = [];

        $sections = $this->getIndustrySpecificSections();

        foreach ($sections as $key => $callback) {
            try {
                if (!$this->canAccessSection($key)) {
                    $cacheStatus[$key] = 'not_authorized';
                    continue;
                }

                $result = $callback();

                $data[$key] = $this->normalizeForApi($result);
                $cacheStatus[$key] = 'loaded';
            } catch (Throwable $e) {
                $this->logSectionFailure($key, $e);

                $failedSections[] = $key;
                $cacheStatus[$key] = 'failed';
                $data[$key] = $this->getFallbackData($key);
            }
        }

        try {
            $data['suggested_actions'] = $this->getSuggestedActions($data);
            $data['performance_insights'] = $this->getPerformanceInsights($data);
            $data['kpi_summary'] = $this->getKpiSummary($data);
        } catch (Throwable $e) {
            Log::warning('Dashboard insights computation failed', [
                'company_id' => $this->companyId,
                'error' => $e->getMessage(),
            ]);
        }

        $status = empty($failedSections) ? 'ok' : 'partial';

        return [
            'success' => true,
            'status' => $status,
            'message' => $status === 'partial'
                ? 'Dashboard loaded with partial data.'
                : 'Dashboard loaded successfully.',
            'data' => $this->ensureFrontendKeys($data),
            'failed_sections' => $failedSections,
            'cache_status' => $cacheStatus,
            'metadata' => [
                'generated_at' => now()->toISOString(),
                'timeframe_days' => $this->timeframeDays,
                'period' => [
                    'start' => $this->startDate->toDateString(),
                    'end' => $this->endDate->toDateString(),
                ],
                'company' => [
                    'id' => $this->company?->id,
                    'name' => $this->company?->name,
                    'industry' => $this->companyIndustry,
                    'currency' => $this->company?->currency ?? 'KES',
                ],
            ],
        ];
    }

    protected function getIndustrySpecificSections(): array
    {
        $commonSections = [
            'financial_summary' => fn () => $this->getFinancialSummary(),
            'cash_flow_analysis' => fn () => $this->getCashFlowAnalysis(),
            'hrm_overview' => fn () => $this->getHrmOverview(),
            'key_metrics' => fn () => $this->getKeyMetrics(),
            'system_health' => fn () => $this->getSystemHealth(),
            'alerts_notifications' => fn () => $this->getAlertsAndNotifications(),
        ];

        return match ($this->companyIndustry) {
            'retail', 'supermarket', 'manufacturing', 'restaurant', 'agriculture' => array_merge($commonSections, [
                'sales_performance' => fn () => $this->getSalesPerformance(),
                'inventory_status' => fn () => $this->getInventoryStatus(),
                'purchasing_overview' => fn () => $this->getPurchasingOverview(),
                'recent_sales' => fn () => $this->getRecentActivity('sales'),
            ]),

            'service', 'consulting', 'lawfirm', 'realestate', 'logistics' => array_merge($commonSections, [
                'sales_performance' => fn () => $this->getSalesPerformance('Service Revenue'),
                'customer_analytics' => fn () => $this->getCustomerAnalytics(),
                'purchasing_overview' => fn () => $this->getPurchasingOverview(),
                'recent_sales' => fn () => $this->getRecentActivity('sales'),
            ]),

            'healthcare', 'hospital' => array_merge($commonSections, [
                'customer_analytics' => fn () => $this->getCustomerAnalytics(),
                'sales_performance' => fn () => $this->getSalesPerformance('Patient Billing'),
                'inventory_status' => fn () => $this->getInventoryStatus(),
                'purchasing_overview' => fn () => $this->getPurchasingOverview(),
                'recent_sales' => fn () => $this->getRecentActivity('sales'),
            ]),

            'education', 'school' => array_merge($commonSections, [
                'customer_analytics' => fn () => $this->getCustomerAnalytics(),
                'sales_performance' => fn () => $this->getSalesPerformance('Fee Collections'),
                'inventory_status' => fn () => $this->getInventoryStatus(),
                'purchasing_overview' => fn () => $this->getPurchasingOverview(),
                'recent_sales' => fn () => $this->getRecentActivity('sales'),
            ]),

            default => array_merge($commonSections, [
                'sales_performance' => fn () => $this->getSalesPerformance(),
                'inventory_status' => fn () => $this->getInventoryStatus(),
                'purchasing_overview' => fn () => $this->getPurchasingOverview(),
                'customer_analytics' => fn () => $this->getCustomerAnalytics(),
                'recent_sales' => fn () => $this->getRecentActivity('sales'),
            ]),
        };
    }

    protected function getFinancialSummary(): array
    {
        return $this->rememberSection('financial_summary', function () {
            $ytdStart = now()->startOfYear();
            $today = now()->endOfDay();

            $revenueYtd = $this->getAccountBalanceForType('Revenue', $ytdStart, $today);
            $expensesYtd = $this->getAccountBalanceForType('Expense', $ytdStart, $today);

            $revenueThisMonth = $this->getAccountBalanceForType(
                'Revenue',
                now()->startOfMonth(),
                now()->endOfDay()
            );

            $revenueLastMonth = $this->getAccountBalanceForType(
                'Revenue',
                now()->subMonth()->startOfMonth(),
                now()->subMonth()->endOfMonth()
            );

            $netIncome = $revenueYtd - $expensesYtd;

            return [
                'revenue_ytd' => round($revenueYtd, 2),
                'expenses_ytd' => round($expensesYtd, 2),
                'net_income_ytd' => round($netIncome, 2),
                'profit_margin_ytd' => $revenueYtd > 0
                    ? round(($netIncome / $revenueYtd) * 100, 2)
                    : 0,
                'revenue_change_vs_last_month' => $revenueLastMonth > 0
                    ? round((($revenueThisMonth - $revenueLastMonth) / $revenueLastMonth) * 100, 2)
                    : 0,
                'cash_balance' => round($this->getBalanceByPossibleAccountNames([
                    'Cash',
                    'Cash at Bank',
                    'Bank',
                    'Bank Account',
                    'Checking Account',
                ]), 2),
                'accounts_receivable' => round($this->getBalanceByPossibleAccountNames([
                    'Accounts Receivable',
                    'Trade Receivables',
                    'Debtors',
                ]), 2),
                'accounts_payable' => round($this->getBalanceByPossibleAccountNames([
                    'Accounts Payable',
                    'Trade Payables',
                    'Creditors',
                ]), 2),
            ];
        });
    }

    protected function getCashFlowAnalysis(): array
    {
        return $this->rememberSection('cash_flow_analysis', function () {
            $operating = $this->calculateOperatingCashFlow();
            $investing = $this->calculateInvestingCashFlow();
            $financing = $this->calculateFinancingCashFlow();
            $net = $operating + $investing + $financing;

            return [
                'operating_cash_flow' => round($operating, 2),
                'investing_cash_flow' => round($investing, 2),
                'financing_cash_flow' => round($financing, 2),
                'net_cash_flow' => round($net, 2),
                'free_cash_flow' => round($this->calculateFreeCashFlow(), 2),
            ];
        });
    }

    protected function getSalesPerformance(string $contextLabel = 'Sales'): array
    {
        return $this->rememberSection('sales_performance', function () use ($contextLabel) {
            $startOfMonth = now()->startOfMonth();

            $salesThisMonth = SalesOrder::query()
                ->where('company_id', $this->companyId)
                ->whereDate('order_date', '>=', $startOfMonth)
                ->sum('total_amount');

            $previousMonthSales = SalesOrder::query()
                ->where('company_id', $this->companyId)
                ->whereBetween('order_date', [
                    now()->subMonth()->startOfMonth(),
                    now()->subMonth()->endOfMonth(),
                ])
                ->sum('total_amount');

            $openOrdersQuery = SalesOrder::query()
                ->where('company_id', $this->companyId);

            if (Schema::hasColumn('sales_orders', 'status')) {
                $openOrdersQuery->whereNotIn(DB::raw('UPPER(status)'), [
                    'SHIPPED',
                    'COMPLETED',
                    'PAID',
                    'CANCELLED',
                    'CANCELED',
                    'CLOSED',
                ]);
            }

            $topSelling = $this->getTopSellingProducts();

            $trend = SalesOrder::query()
                ->where('company_id', $this->companyId)
                ->where('order_date', '>=', now()->subMonths(5)->startOfMonth())
                ->selectRaw("DATE_FORMAT(order_date, '%Y-%m') as month")
                ->selectRaw('COALESCE(SUM(total_amount), 0) as total_sales')
                ->groupBy('month')
                ->orderBy('month')
                ->get()
                ->map(fn ($row) => [
                    'month' => $row->month,
                    'total_sales' => round((float) $row->total_sales, 2),
                ])
                ->values()
                ->toArray();

            return [
                'context_label' => $contextLabel,
                'open_orders_count' => $openOrdersQuery->count(),
                'sales_value_this_month' => round((float) $salesThisMonth, 2),
                'sales_change_vs_last_month' => $previousMonthSales > 0
                    ? round((($salesThisMonth - $previousMonthSales) / $previousMonthSales) * 100, 2)
                    : 0,
                'new_customers_this_month' => Customer::where('company_id', $this->companyId)
                    ->whereDate('created_at', '>=', $startOfMonth)
                    ->count(),
                'top_selling_products' => $topSelling,
                'sales_trend_last_6_months' => $trend,
            ];
        });
    }

    protected function getPurchasingOverview(): array
    {
        return $this->rememberSection('purchasing_overview', function () {
            $query = PurchaseOrder::query()
                ->where('company_id', $this->companyId);

            if (Schema::hasColumn('purchase_orders', 'status')) {
                $query->whereNotIn(DB::raw('UPPER(status)'), [
                    'RECEIVED',
                    'COMPLETED',
                    'PAID',
                    'CANCELLED',
                    'CANCELED',
                    'CLOSED',
                ]);
            }

            return [
                'open_purchase_orders_count' => (clone $query)->count(),
                'open_purchase_orders_value' => round((float) (clone $query)->sum('total_amount'), 2),
                'suppliers_count' => Supplier::where('company_id', $this->companyId)->count(),
            ];
        });
    }

    protected function getHrmOverview(): array
    {
        return $this->rememberSection('hrm_overview', function () {
            $activeEmployees = User::query()
                ->where('company_id', $this->companyId)
                ->whereHas('employeeProfile', function ($q) {
                    if (Schema::hasColumn('employee_profiles', 'status')) {
                        $q->where('status', 'active');
                    }
                })
                ->count();

            $newHires = User::query()
                ->where('company_id', $this->companyId)
                ->whereHas('employeeProfile', function ($q) {
                    if (Schema::hasColumn('employee_profiles', 'hired_on')) {
                        $q->whereDate('hired_on', '>=', now()->startOfMonth());
                    }
                })
                ->count();

            $revenueYtd = $this->getAccountBalanceForType(
                'Revenue',
                now()->startOfYear(),
                now()->endOfDay()
            );

            return [
                'active_employees' => $activeEmployees,
                'new_hires_this_month' => $newHires,
                'revenue_per_employee' => $activeEmployees > 0
                    ? round($revenueYtd / $activeEmployees, 2)
                    : 0,
            ];
        });
    }

    protected function getInventoryStatus(): array
    {
        return $this->rememberSection('inventory_status', function () {
            $threshold = (int) config('dashboard.low_stock_threshold', 10);

            if (Schema::hasTable('inventory_summaries')) {
                $inventory = DB::table('inventory_summaries')
                    ->join('products', 'inventory_summaries.product_id', '=', 'products.id')
                    ->where('inventory_summaries.company_id', $this->companyId)
                    ->where('products.is_service', false)
                    ->selectRaw('products.id')
                    ->selectRaw('products.name')
                    ->selectRaw('COALESCE(SUM(inventory_summaries.quantity_on_hand), 0) as quantity_on_hand')
                    ->selectRaw('COALESCE(products.current_avg_cost, products.unit_price, 0) as unit_cost')
                    ->groupBy('products.id', 'products.name', 'products.current_avg_cost', 'products.unit_price')
                    ->get();

                $lowStock = $inventory->filter(
                    fn ($item) => (float) $item->quantity_on_hand <= $threshold
                )->count();

                $value = $inventory->sum(
                    fn ($item) => (float) $item->quantity_on_hand * (float) $item->unit_cost
                );

                return [
                    'products_low_on_stock' => $lowStock,
                    'total_inventory_value' => round($value, 2),
                    'tracked_products' => $inventory->count(),
                ];
            }

            $productQuery = Product::where('company_id', $this->companyId)
                ->where('is_service', false);

            $stockColumn = Schema::hasColumn('products', 'current_stock')
                ? 'current_stock'
                : null;

            return [
                'products_low_on_stock' => $stockColumn
                    ? (clone $productQuery)->where($stockColumn, '<=', $threshold)->count()
                    : 0,
                'total_inventory_value' => $stockColumn
                    ? round((float) (clone $productQuery)->sum(DB::raw("{$stockColumn} * COALESCE(current_avg_cost, unit_price, 0)")), 2)
                    : 0,
                'tracked_products' => (clone $productQuery)->count(),
            ];
        });
    }

    protected function getCustomerAnalytics(): array
    {
        return $this->rememberSection('customer_analytics', function () {
            return [
                'customer_segments' => [
                    'new_customers' => Customer::where('company_id', $this->companyId)
                        ->where('created_at', '>=', $this->startDate)
                        ->count(),
                    'repeat_customers' => $this->getRepeatCustomers(),
                    'vip_customers' => $this->getVipCustomers(),
                ],
                'lifetime_value' => round($this->calculateCustomerLifetimeValue(), 2),
                'churn_rate' => $this->calculateChurnRate(),
            ];
        });
    }

    protected function getKeyMetrics(): array
    {
        return $this->rememberSection('key_metrics', function () {
            return [
                'financial_health' => [
                    'current_ratio' => $this->calculateCurrentRatio(),
                    'quick_ratio' => $this->calculateQuickRatio(),
                ],
                'operational_efficiency' => [
                    'inventory_turnover' => $this->calculateInventoryTurnover(),
                ],
                'customer_satisfaction' => [
                    'nps_score' => $this->calculateNPSScore(),
                ],
            ];
        });
    }

    protected function getSystemHealth(): array
    {
        return [
            'application' => [
                'response_time' => defined('LARAVEL_START')
                    ? round(microtime(true) - LARAVEL_START, 3)
                    : 0,
                'memory_usage' => round(memory_get_usage(true) / 1024 / 1024, 2) . ' MB',
            ],
            'database' => [
                'connection_status' => $this->checkDatabaseConnection(),
            ],
            'cache' => [
                'status' => $this->checkCacheStatus(),
            ],
        ];
    }

    protected function getAlertsAndNotifications(): array
    {
        if (!class_exists(SystemAlert::class) || !Schema::hasTable('system_alerts')) {
            return [
                'critical_alerts' => [],
            ];
        }

        $alerts = SystemAlert::where('company_id', $this->companyId)
            ->where('created_at', '>=', now()->subDays(7))
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        $critical = $alerts
            ->filter(fn ($alert) => ($alert->severity ?? null) === 'critical' && !($alert->resolved ?? false))
            ->map(fn ($alert) => [
                'id' => $alert->id,
                'title' => $alert->title,
                'description' => $alert->description,
                'created_at' => optional($alert->created_at)->toISOString(),
            ])
            ->values()
            ->toArray();

        return [
            'critical_alerts' => $critical,
        ];
    }

    protected function getRecentActivity(string $type, int $limit = 8): array
    {
        return $this->rememberSection("recent_activity_{$type}_{$limit}", function () use ($type, $limit) {
            return match ($type) {
                'sales' => SalesOrder::where('company_id', $this->companyId)
                    ->with('customer:id,name')
                    ->latest('order_date')
                    ->limit($limit)
                    ->get(['id', 'order_number', 'customer_id', 'total_amount', 'order_date', 'status'])
                    ->map(fn ($sale) => [
                        'id' => $sale->id,
                        'order_number' => $sale->order_number,
                        'customer' => $sale->customer
                            ? [
                                'id' => $sale->customer->id,
                                'name' => $sale->customer->name,
                            ]
                            : null,
                        'total_amount' => round((float) $sale->total_amount, 2),
                        'order_date' => optional($sale->order_date)->toDateTimeString(),
                        'status' => $sale->status,
                    ])
                    ->values()
                    ->toArray(),

                default => [],
            };
        });
    }

    protected function getTopSellingProducts(): array
    {
        if (!Schema::hasTable('sales_order_items') || !Schema::hasTable('products')) {
            return [];
        }

        return DB::table('sales_order_items')
            ->join('products', 'sales_order_items.product_id', '=', 'products.id')
            ->where('sales_order_items.company_id', $this->companyId)
            ->select('products.name')
            ->selectRaw('SUM(sales_order_items.quantity) as total_sold')
            ->selectRaw('SUM(sales_order_items.quantity * sales_order_items.unit_price) as total_value')
            ->groupBy('products.name')
            ->orderByDesc('total_sold')
            ->limit(5)
            ->get()
            ->map(fn ($row) => [
                'name' => $row->name,
                'total_sold' => (float) $row->total_sold,
                'total_value' => round((float) $row->total_value, 2),
            ])
            ->toArray();
    }

    protected function getSuggestedActions(array $data): array
    {
        $actions = [];

        $lowStock = (int) ($data['inventory_status']['products_low_on_stock'] ?? 0);

        if ($lowStock > 0) {
            $itemName = match ($this->companyIndustry) {
                'hospital' => 'medical supplies',
                'school' => 'school supplies',
                default => 'products',
            };

            $actions[] = [
                'message' => "You have {$lowStock} {$itemName} low on stock.",
                'action' => 'Create Purchase Order',
                'route' => '/purchasing/orders/create',
                'urgency' => 'high',
            ];
        }

        $openOrders = (int) ($data['sales_performance']['open_orders_count'] ?? 0);

        if ($openOrders > 0) {
            $orderName = match ($this->companyIndustry) {
                'service', 'lawfirm' => 'client engagements',
                'school' => 'fee payments',
                'hospital' => 'patient bills',
                default => 'sales orders',
            };

            $actions[] = [
                'message' => "There are {$openOrders} open {$orderName} to process.",
                'action' => 'View Orders',
                'route' => '/sales/orders',
                'urgency' => 'medium',
            ];
        }

        $openPos = (int) ($data['purchasing_overview']['open_purchase_orders_count'] ?? 0);

        if ($openPos > 0) {
            $actions[] = [
                'message' => "There are {$openPos} purchase orders awaiting processing.",
                'action' => 'View Purchase Orders',
                'route' => '/purchasing/orders',
                'urgency' => 'low',
            ];
        }

        return $actions;
    }

    protected function getPerformanceInsights(array $data): array
    {
        $insights = [];

        $revenueGrowth = (float) ($data['financial_summary']['revenue_change_vs_last_month'] ?? 0);

        if ($revenueGrowth > 20) {
            $insights[] = [
                'type' => 'positive',
                'title' => 'Strong Revenue Growth',
                'description' => "Revenue is up {$revenueGrowth}% compared to last month.",
            ];
        } elseif ($revenueGrowth < 0) {
            $insights[] = [
                'type' => 'negative',
                'title' => 'Revenue Decline Detected',
                'description' => 'Revenue decreased by ' . abs($revenueGrowth) . '% compared to last month.',
            ];
        }

        $profitMargin = (float) ($data['financial_summary']['profit_margin_ytd'] ?? 0);

        if ($profitMargin > 0 && $profitMargin < 5) {
            $insights[] = [
                'type' => 'warning',
                'title' => 'Low Profit Margin',
                'description' => "Profit margin is {$profitMargin}%. Review expenses and pricing.",
            ];
        }

        return $insights;
    }

    protected function getKpiSummary(array $data): array
    {
        $revenueLabel = match ($this->companyIndustry) {
            'school' => 'Total Fees Collected',
            'hospital' => 'Total Patient Billing',
            default => 'Total Revenue',
        };

        return [
            'financial_kpis' => [
                [
                    'label' => $revenueLabel,
                    'value' => $data['financial_summary']['revenue_ytd'] ?? 0,
                    'format' => 'currency',
                ],
                [
                    'label' => 'Profit Margin',
                    'value' => $data['financial_summary']['profit_margin_ytd'] ?? 0,
                    'format' => 'percentage',
                ],
            ],
            'growth_kpis' => [
                [
                    'label' => 'Revenue Growth (MoM)',
                    'value' => $data['financial_summary']['revenue_change_vs_last_month'] ?? 0,
                    'format' => 'percentage',
                ],
            ],
        ];
    }

    protected function calculateCurrentRatio(): float
    {
        $currentAssets = $this->getAccountBalanceForType('Current Asset');
        $currentLiabilities = $this->getAccountBalanceForType('Current Liability');

        if ($currentAssets == 0) {
            $currentAssets = $this->getBalanceByPossibleAccountNames([
                'Cash',
                'Cash at Bank',
                'Accounts Receivable',
                'Inventory',
            ]);
        }

        if ($currentLiabilities == 0) {
            $currentLiabilities = $this->getBalanceByPossibleAccountNames([
                'Accounts Payable',
                'Tax Payable',
                'Salaries Payable',
            ]);
        }

        return $currentLiabilities != 0
            ? round($currentAssets / $currentLiabilities, 2)
            : 0;
    }

    protected function calculateQuickRatio(): float
    {
        $cash = $this->getBalanceByPossibleAccountNames(['Cash', 'Cash at Bank', 'Bank']);
        $receivables = $this->getBalanceByPossibleAccountNames(['Accounts Receivable', 'Trade Receivables']);
        $liabilities = $this->getBalanceByPossibleAccountNames(['Accounts Payable', 'Tax Payable', 'Salaries Payable']);

        return $liabilities != 0
            ? round(($cash + $receivables) / $liabilities, 2)
            : 0;
    }

    protected function calculateInventoryTurnover(): float
    {
        $cogs = $this->getBalanceByPossibleAccountNames(['Cost of Goods Sold', 'COGS']);
        $inventory = $this->getBalanceByPossibleAccountNames(['Inventory']);

        return $inventory != 0
            ? round($cogs / $inventory, 2)
            : 0;
    }

    protected function calculateOperatingCashFlow(): float
    {
        $revenue = $this->getAccountBalanceForType('Revenue', $this->startDate, $this->endDate);
        $expenses = $this->getAccountBalanceForType('Expense', $this->startDate, $this->endDate);
        $depreciation = $this->getBalanceByPossibleAccountNames(['Depreciation', 'Depreciation Expense']);

        return $revenue - $expenses + $depreciation;
    }

    protected function calculateInvestingCashFlow(): float
    {
        return -1 * $this->getBalanceByPossibleAccountNames([
            'Fixed Assets',
            'Property Plant and Equipment',
            'Capital Expenditures',
        ]);
    }

    protected function calculateFinancingCashFlow(): float
    {
        $debt = $this->getBalanceByPossibleAccountNames(['Long Term Debt', 'Loans Payable']);
        $dividends = $this->getBalanceByPossibleAccountNames(['Dividends']);

        return $debt - $dividends;
    }

    protected function calculateFreeCashFlow(): float
    {
        $capex = $this->getBalanceByPossibleAccountNames([
            'Capital Expenditures',
            'Fixed Assets',
        ]);

        return $this->calculateOperatingCashFlow() - $capex;
    }

    protected function getRepeatCustomers(): int
    {
        if (!method_exists(Customer::class, 'salesOrders')) {
            return 0;
        }

        return Customer::where('company_id', $this->companyId)
            ->has('salesOrders', '>', 1)
            ->count();
    }

    protected function getVipCustomers(): int
    {
        return Customer::where('company_id', $this->companyId)
            ->whereHas('salesOrders', function ($q) {
                $q->select('customer_id')
                    ->groupBy('customer_id')
                    ->havingRaw('SUM(total_amount) > ?', [10000]);
            })
            ->count();
    }

    protected function calculateCustomerLifetimeValue(): float
    {
        $avgOrderValue = SalesOrder::where('company_id', $this->companyId)->avg('total_amount') ?? 0;

        return round((float) $avgOrderValue * 4.2 * 3.5, 2);
    }

    protected function calculateChurnRate(): float
    {
        return 8.5;
    }

    protected function calculateNPSScore(): float
    {
        return 42.0;
    }

    protected function checkDatabaseConnection(): string
    {
        try {
            DB::connection()->getPdo();

            return 'connected';
        } catch (Throwable) {
            return 'disconnected';
        }
    }

    protected function checkCacheStatus(): string
    {
        try {
            Cache::put('dashboard_health_check', 'ok', 10);

            return Cache::get('dashboard_health_check') === 'ok'
                ? 'healthy'
                : 'unhealthy';
        } catch (Throwable) {
            return 'unhealthy';
        }
    }

    protected function getAccountBalanceForType(
        string $type,
        ?Carbon $start = null,
        ?Carbon $end = null
    ): float {
        $cacheKey = "type:{$type}:"
            . ($start?->toDateString() ?? 'all') . ':'
            . ($end?->toDateString() ?? 'all');

        if (array_key_exists($cacheKey, $this->balancesCache)) {
            return round($this->balancesCache[$cacheKey], 2);
        }

        $query = DB::table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->join('chart_of_accounts', 'journal_entry_lines.chart_of_account_id', '=', 'chart_of_accounts.id')
            ->where('journal_entries.company_id', $this->companyId)
            ->where('chart_of_accounts.company_id', $this->companyId)
            ->where('chart_of_accounts.account_type', $type);

        $this->applyPostedJournalFilter($query);
        $this->applyJournalDateFilter($query, $start, $end);

        $totals = $query
            ->selectRaw('COALESCE(SUM(journal_entry_lines.debit), 0) as debits')
            ->selectRaw('COALESCE(SUM(journal_entry_lines.credit), 0) as credits')
            ->first();

        $balance = (float) ($totals->debits ?? 0) - (float) ($totals->credits ?? 0);

        if (in_array($type, ['Liability', 'Equity', 'Revenue', 'Current Liability'], true)) {
            $balance *= -1;
        }

        $this->balancesCache[$cacheKey] = $balance;

        return round($balance, 2);
    }

    protected function getAccountBalanceByName(string $name): float
    {
        return $this->getBalanceByPossibleAccountNames([$name]);
    }

    protected function getBalanceByPossibleAccountNames(array $names): float
    {
        $cacheKey = 'names:' . implode('|', $names);

        if (array_key_exists($cacheKey, $this->balancesCache)) {
            return round($this->balancesCache[$cacheKey], 2);
        }

        $query = DB::table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->join('chart_of_accounts', 'journal_entry_lines.chart_of_account_id', '=', 'chart_of_accounts.id')
            ->where('journal_entries.company_id', $this->companyId)
            ->where('chart_of_accounts.company_id', $this->companyId)
            ->where(function ($q) use ($names) {
                foreach ($names as $name) {
                    $q->orWhere('chart_of_accounts.account_name', $name);
                }
            });

        $this->applyPostedJournalFilter($query);

        $rows = $query
            ->select('chart_of_accounts.account_type')
            ->selectRaw('COALESCE(SUM(journal_entry_lines.debit), 0) as debits')
            ->selectRaw('COALESCE(SUM(journal_entry_lines.credit), 0) as credits')
            ->groupBy('chart_of_accounts.account_type')
            ->get();

        $balance = 0;

        foreach ($rows as $row) {
            $lineBalance = (float) $row->debits - (float) $row->credits;

            if (in_array($row->account_type, ['Liability', 'Equity', 'Revenue', 'Current Liability'], true)) {
                $lineBalance *= -1;
            }

            $balance += $lineBalance;
        }

        $this->balancesCache[$cacheKey] = $balance;

        return round($balance, 2);
    }

    protected function applyJournalDateFilter($query, ?Carbon $start = null, ?Carbon $end = null): void
    {
        $startTs = ($start ?? $this->startDate)->copy()->startOfDay();
        $endTs = ($end ?? $this->endDate)->copy()->endOfDay();

        if (Schema::hasColumn('journal_entries', 'transaction_date')) {
            $query->whereBetween('journal_entries.transaction_date', [
                $startTs->toDateString(),
                $endTs->toDateString(),
            ]);
        } else {
            $query->whereBetween('journal_entries.created_at', [$startTs, $endTs]);
        }
    }

    protected function applyPostedJournalFilter($query): void
    {
        if (Schema::hasColumn('journal_entries', 'status')) {
            $query->whereIn(DB::raw('LOWER(journal_entries.status)'), ['posted', 'approved']);
        }
    }

    protected function canAccessSection(string $key): bool
    {
        if ($this->isPrivilegedUser()) {
            return true;
        }

        return match ($key) {
            'financial_summary',
            'cash_flow_analysis' => $this->hasAnyPermission([
                'view-financial-reports',
                'manage-payroll',
                'manage-allowances',
            ]),

            'sales_performance',
            'customer_analytics',
            'recent_sales' => $this->hasAnyPermission([
                'view-sales',
                'create-sales',
                'edit-sales',
                'manage-customers',
                'view-customers',
            ]),

            'purchasing_overview' => $this->hasAnyPermission([
                'manage-purchasing',
                'view-purchasing',
            ]),

            'hrm_overview' => $this->hasAnyPermission([
                'view-hrm',
                'manage-hrm',
                'manage-payroll',
            ]),

            'inventory_status' => $this->hasAnyPermission([
                'manage-products',
                'view-inventory',
                'manage-inventory',
            ]),

            'system_health',
            'key_metrics',
            'alerts_notifications' => true,

            default => false,
        };
    }

    protected function hasAnyPermission(array $permissions): bool
    {
        foreach ($permissions as $permission) {
            try {
                if (method_exists($this->user, 'can') && $this->user->can($permission)) {
                    return true;
                }
            } catch (Throwable) {
                continue;
            }
        }

        return false;
    }

    protected function isPrivilegedUser(): bool
    {
        $role = strtoupper((string) ($this->user->company_role ?? ''));

        if (in_array($role, ['OWNER', 'ADMIN', 'MANAGER'], true)) {
            return true;
        }

        if (method_exists($this->user, 'hasAdminRole')) {
            try {
                return (bool) $this->user->hasAdminRole();
            } catch (Throwable) {
                return false;
            }
        }

        return false;
    }

    protected function rememberSection(string $section, callable $callback): mixed
    {
        $key = "dashboard:{$section}:company:{$this->companyId}:days:{$this->timeframeDays}";

        try {
            if (Cache::getStore() instanceof TaggableStore) {
                return Cache::tags(['dashboard', "company:{$this->companyId}"])
                    ->remember($key, $this->defaultCacheTtl, $callback);
            }

            return Cache::remember($key, $this->defaultCacheTtl, $callback);
        } catch (Throwable $e) {
            Log::warning('Dashboard cache failed; loading directly.', [
                'company_id' => $this->companyId,
                'section' => $section,
                'error' => $e->getMessage(),
            ]);

            return $callback();
        }
    }

    protected function ensureFrontendKeys(array $data): array
    {
        $data['financial_summary'] = array_merge([
            'revenue_ytd' => 0,
            'expenses_ytd' => 0,
            'net_income_ytd' => 0,
            'profit_margin_ytd' => 0,
            'revenue_change_vs_last_month' => 0,
            'cash_balance' => 0,
            'accounts_receivable' => 0,
            'accounts_payable' => 0,
        ], $data['financial_summary'] ?? []);

        $data['sales_performance'] = array_merge([
            'context_label' => 'Sales',
            'open_orders_count' => 0,
            'sales_value_this_month' => 0,
            'sales_change_vs_last_month' => 0,
            'new_customers_this_month' => 0,
            'top_selling_products' => [],
            'sales_trend_last_6_months' => [],
        ], $data['sales_performance'] ?? []);

        $data['hrm_overview'] = array_merge([
            'active_employees' => 0,
            'new_hires_this_month' => 0,
            'revenue_per_employee' => 0,
        ], $data['hrm_overview'] ?? []);

        $data['inventory_status'] = array_merge([
            'products_low_on_stock' => 0,
            'total_inventory_value' => 0,
            'tracked_products' => 0,
        ], $data['inventory_status'] ?? []);

        $data['purchasing_overview'] = array_merge([
            'open_purchase_orders_count' => 0,
            'open_purchase_orders_value' => 0,
            'suppliers_count' => 0,
        ], $data['purchasing_overview'] ?? []);

        $data['recent_sales'] = $data['recent_sales'] ?? [];

        return $data;
    }

    protected function getFallbackData(string $section): array
    {
        return [
            'error' => 'Section data temporarily unavailable.',
            'section' => $section,
        ];
    }

    protected function normalizeForApi(mixed $value): mixed
    {
        if ($value instanceof Collection) {
            return $value
                ->map(function ($item) {
                    if (is_array($item)) {
                        return $item;
                    }

                    if (method_exists($item, 'toArray')) {
                        return $item->toArray();
                    }

                    return (array) $item;
                })
                ->values()
                ->toArray();
        }

        if (is_object($value)) {
            if (method_exists($value, 'toArray')) {
                return $value->toArray();
            }

            return (array) $value;
        }

        return $value;
    }

    protected function logSectionFailure(string $section, Throwable $e): void
    {
        $payload = [
            'company_id' => $this->companyId,
            'section' => $section,
            'error' => $e->getMessage(),
        ];

        if (config('app.debug')) {
            $payload['trace'] = $e->getTraceAsString();
        }

        Log::warning("Dashboard section [{$section}] failed to load", $payload);
    }
}
