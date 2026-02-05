<?php

namespace App\Services;

use App\Models\User;
use App\Models\Accounts\ChartOfAccount;
use App\Models\Inventory\SalesOrder;
use App\Models\PurchaseOrder;
use App\Models\Inventory\Product;
use App\Models\CRM\Customer;
use App\Models\Supplier;
use App\Models\EmployeeProfile;
use App\Models\SystemAlert;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class DashboardService
{
    protected User $user;
    protected int $companyId;
    protected string $companyIndustry;
    protected int $timeframeDays;
    protected int $defaultCacheTtl;
    protected Carbon $startDate;
    protected Carbon $endDate;
    protected Carbon $previousPeriodStart;
    protected Carbon $previousPeriodEnd;

    /**
     * Local runtime balances cache to avoid repeated DB hits.
     * Keys: "type:TYPE_NAME" or account name as-is.
     * Values: float
     */
    protected array $balancesCache = [];

    public function __construct(User $user, int $timeframeDays = 30)
    {
        $this->user = $user;
        $this->companyId = $user->company_id;
        // Assumes the User model has access to the Company model which has an 'industry' field.
        $this->companyIndustry = strtolower($user->company->industry ?? 'generic');
        $this->timeframeDays = $timeframeDays;
        $this->defaultCacheTtl = config('dashboard.cache_ttl', 300);

        $now = now();
        $this->endDate = $now->copy()->endOfDay();
        $this->startDate = $now->copy()->subDays($timeframeDays)->startOfDay();
        $this->previousPeriodEnd = $this->startDate->copy()->subSecond();
        $this->previousPeriodStart = $this->previousPeriodEnd->copy()->subDays($timeframeDays)->startOfDay();
    }

    public function getDashboardData(): array
    {
        $data = [];
        $failedSections = [];
        $cacheStatus = [];

        // Define sections dynamically based on industry
        $sections = $this->getIndustrySpecificSections();

        foreach ($sections as $key => $callback) {
            try {
                if ($this->canAccessSection($key)) {
                    $result = $callback();
                    $data[$key] = $this->normalizeForApi($result);
                    $cacheStatus[$key] = 'loaded';
                }
            } catch (Throwable $e) {
                $logPayload = ['company_id' => $this->companyId, 'error' => $e->getMessage()];
                if (config('app.debug')) $logPayload['trace'] = $e->getTraceAsString();
                Log::warning("Dashboard section [{$key}] failed to load", $logPayload);
                $failedSections[] = $key;
                $cacheStatus[$key] = 'failed';
                $data[$key] = $this->getFallbackData($key);
            }
        }

        // Add computed insights
        try {
            $data['suggested_actions'] = $this->getSuggestedActions($data);
            $data['performance_insights'] = $this->getPerformanceInsights($data);
            $data['kpi_summary'] = $this->getKpiSummary($data);
        } catch (Throwable $e) {
            $logPayload = ['company_id' => $this->companyId, 'error' => $e->getMessage()];
            if (config('app.debug')) $logPayload['trace'] = $e->getTraceAsString();
            Log::warning('Dashboard insights computation failed', $logPayload);
        }

        return [
            'success' => empty($failedSections),
            'data' => $data,
            'failed_sections' => $failedSections,
            'cache_status' => $cacheStatus,
        ];
    }

    /**
     * Define the list of dashboard sections to load based on the company's industry.
     */
    protected function getIndustrySpecificSections(): array
    {
        // Core sections common to most businesses
        $commonSections = [
            'financial_summary' => fn() => $this->getFinancialSummary(),
            'cash_flow_analysis' => fn() => $this->getCashFlowAnalysis(),
            'hrm_overview' => fn() => $this->getHrmOverview(),
            'key_metrics' => fn() => $this->getKeyMetrics(),
            'system_health' => fn() => $this->getSystemHealth(),
            'alerts_notifications' => fn() => $this->getAlertsAndNotifications(),
        ];

        // Industry-specific additions
        switch ($this->companyIndustry) {
            case 'retail':
            case 'supermarket':
            case 'manufacturing':
                return array_merge($commonSections, [
                    'sales_performance' => fn() => $this->getSalesPerformance(),
                    'inventory_status' => fn() => $this->getInventoryStatus(),
                    'purchasing_overview' => fn() => $this->getPurchasingOverview(),
                    'recent_sales' => fn() => $this->getRecentActivity('sales'),
                ]);

            case 'service':
            case 'consulting':
            case 'lawfirm':
                return array_merge($commonSections, [
                    'sales_performance' => fn() => $this->getSalesPerformance('Service Contracts'),
                    'customer_analytics' => fn() => $this->getCustomerAnalytics(),
                    'recent_sales' => fn() => $this->getRecentActivity('sales'),
                ]);

            case 'healthcare':
            case 'hospital':
                return array_merge($commonSections, [
                    'customer_analytics' => fn() => $this->getCustomerAnalytics(),
                    'sales_performance' => fn() => $this->getSalesPerformance('Service Billings'),
                    'inventory_status' => fn() => $this->getInventoryStatus(),
                    'purchasing_overview' => fn() => $this->getPurchasingOverview(),
                ]);

            case 'education':
            case 'school':
                return array_merge($commonSections, [
                    'customer_analytics' => fn() => $this->getCustomerAnalytics(),
                    'sales_performance' => fn() => $this->getSalesPerformance('Fee Collections'),
                    'inventory_status' => fn() => $this->getInventoryStatus(),
                ]);

            default: // 'generic' or unknown
                return array_merge($commonSections, [
                    'sales_performance' => fn() => $this->getSalesPerformance(),
                    'inventory_status' => fn() => $this->getInventoryStatus(),
                    'customer_analytics' => fn() => $this->getCustomerAnalytics(),
                ]);
        }
    }

    // ========================================================================
    // CORE SECTION IMPLEMENTATIONS
    // ========================================================================

    // -----------------------
    // FINANCIAL SUMMARY
    // -----------------------
    protected function getFinancialSummary(): array
    {
        return Cache::tags(['dashboard', "company:{$this->companyId}"])
            ->remember("dashboard:financial_summary:{$this->companyId}:{$this->timeframeDays}", $this->defaultCacheTtl, function () {
                $this->loadBalances(['Cash', 'Accounts Receivable', 'Accounts Payable'], ['Revenue', 'Expense']);

                $revenueYTD = $this->getAccountBalanceForType('Revenue');
                $expensesYTD = $this->getAccountBalanceForType('Expense');
                $revenueThisMonth = $this->getAccountBalanceForType('Revenue', now()->startOfMonth(), now()->endOfDay());
                $revenueLastMonth = $this->getAccountBalanceForType('Revenue', now()->subMonth()->startOfMonth(), now()->subMonth()->endOfMonth());

                return [
                    'revenue_ytd' => round($revenueYTD, 2),
                    'expenses_ytd' => round($expensesYTD, 2),
                    'net_income_ytd' => round($revenueYTD - $expensesYTD, 2),
                    'profit_margin_ytd' => $revenueYTD > 0 ? round((($revenueYTD - $expensesYTD) / $revenueYTD) * 100, 2) : 0,
                    'revenue_change_vs_last_month' => $revenueLastMonth > 0 ? round((($revenueThisMonth - $revenueLastMonth) / $revenueLastMonth) * 100, 2) : 0,
                    'cash_balance' => round($this->getAccountBalanceByName('Cash'), 2),
                    'accounts_receivable' => round($this->getAccountBalanceByName('Accounts Receivable'), 2),
                    'accounts_payable' => round($this->getAccountBalanceByName('Accounts Payable'), 2),
                ];
            });
    }

    // -----------------------
    // CASH FLOW
    // -----------------------
    protected function getCashFlowAnalysis(): array
    {
        return Cache::tags(['dashboard', "company:{$this->companyId}"])
            ->remember("dashboard:cash_flow:{$this->companyId}:{$this->timeframeDays}", $this->defaultCacheTtl, function () {
                $this->loadBalances(['Depreciation', 'Fixed Assets', 'Long Term Debt', 'Dividends', 'Capital Expenditures'], ['Revenue', 'Expense']);

                return [
                    'operating_cash_flow' => round($this->calculateOperatingCashFlow(), 2),
                    'investing_cash_flow' => round($this->calculateInvestingCashFlow(), 2),
                    'financing_cash_flow' => round($this->calculateFinancingCashFlow(), 2),
                    'net_cash_flow' => round($this->calculateNetCashFlow(), 2),
                    'free_cash_flow' => round($this->calculateFreeCashFlow(), 2),
                ];
            });
    }

    // -----------------------
    // SALES PERFORMANCE (Broadened concept)
    // -----------------------
    protected function getSalesPerformance(string $contextLabel = 'Sales'): array
    {
        return Cache::tags(['dashboard', "company:{$this->companyId}"])
            ->remember("dashboard:sales_performance:{$this->companyId}:{$this->timeframeDays}", $this->defaultCacheTtl, function () use ($contextLabel) {
                $startOfMonth = now()->startOfMonth();

                $salesQuery = SalesOrder::where('company_id', $this->companyId)
                    ->whereDate('order_date', '>=', $startOfMonth);

                $totalSales = $salesQuery->sum('total_amount');

                // Top "selling" items could be products, services, fee structures, etc.
                $topSelling = DB::table('sales_order_items')
                    ->join('products', 'sales_order_items.product_id', '=', 'products.id')
                    ->where('sales_order_items.company_id', $this->companyId)
                    ->select('products.name', DB::raw('SUM(sales_order_items.quantity) as total_sold'))
                    ->groupBy('products.name')
                    ->orderByDesc('total_sold')
                    ->limit(5)
                    ->get()
                    ->toArray();

                $trend = SalesOrder::where('company_id', $this->companyId)
                    ->select(DB::raw("DATE_FORMAT(order_date, '%Y-%m') as month"), DB::raw('SUM(total_amount) as total_sales'))
                    ->where('order_date', '>=', now()->subMonths(6)->startOfMonth())
                    ->groupBy('month')
                    ->orderBy('month')
                    ->get()
                    ->toArray();

                return [
                    'context_label' => $contextLabel,
                    'open_orders_count' => SalesOrder::where('company_id', $this->companyId)
                        ->whereNotIn('status', ['SHIPPED', 'COMPLETED', 'PAID'])->count(),
                    'sales_value_this_month' => round($totalSales, 2),
                    'new_customers_this_month' => Customer::where('company_id', $this->companyId)
                        ->whereDate('created_at', '>=', $startOfMonth)->count(),
                    'top_selling_products' => $topSelling,
                    'sales_trend_last_6_months'=> $trend,
                ];
            });
    }

    // -----------------------
    // SALES FUNNEL
    // -----------------------
    protected function getSalesFunnel(): array
    {
        // Simplified stages, adjust based on your actual CRM definition
        return [
            'stages' => [
                'leads' => Customer::where('company_id', $this->companyId)->count(),
                'qualified' => Customer::where('company_id', $this->companyId)->has('salesOrders')->count(),
                'closed_won' => SalesOrder::where('company_id', $this->companyId)
                    ->whereIn('status', ['SHIPPED', 'COMPLETED', 'PAID'])->count(),
            ],
            'conversion_rates' => [
                'lead_to_customer' => $this->calculateConversionRate(),
            ],
        ];
    }

    // -----------------------
    // CUSTOMER ANALYTICS
    // -----------------------
    protected function getCustomerAnalytics(): array
    {
        return [
            'customer_segments' => [
                'new_customers' => Customer::where('company_id', $this->companyId)
                    ->where('created_at', '>=', $this->startDate)->count(),
                'repeat_customers' => $this->getRepeatCustomers(),
                'vip_customers' => $this->getVipCustomers(),
            ],
            'lifetime_value' => round($this->calculateCustomerLifetimeValue(), 2),
            'churn_rate' => $this->calculateChurnRate(),
        ];
    }

    // -----------------------
    // PURCHASING OVERVIEW
    // -----------------------
    protected function getPurchasingOverview(): array
    {
        return Cache::tags(['dashboard', "company:{$this->companyId}"])
            ->remember("dashboard:purchasing:{$this->companyId}:{$this->timeframeDays}", $this->defaultCacheTtl, function () {
                $openPOs = PurchaseOrder::where('company_id', $this->companyId)
                    ->whereNotIn('status', ['RECEIVED', 'CANCELLED']);

                return [
                    'open_purchase_orders_count' => $openPOs->count(),
                    'open_purchase_orders_value' => round($openPOs->sum('total_amount'), 2),
                ];
            });
    }

    // -----------------------
    // HRM OVERVIEW
    // -----------------------
    protected function getHrmOverview(): array
    {
        return Cache::tags(['dashboard', "company:{$this->companyId}"])
            ->remember("dashboard:hrm:{$this->companyId}:{$this->timeframeDays}", $this->defaultCacheTtl, function () {
                $activeEmployees = User::where('company_id', $this->companyId)
                    ->whereHas('employeeProfile', fn($q) => $q->where('status', 'active'))
                    ->count();

                $revenueYTD = $this->getAccountBalanceForType('Revenue');

                return [
                    'active_employees' => $activeEmployees,
                    'new_hires_this_month' => User::where('company_id', $this->companyId)
                        ->whereHas('employeeProfile', fn($q) => $q->whereDate('hired_on', '>=', now()->startOfMonth()))
                        ->count(),
                    'revenue_per_employee' => $activeEmployees > 0 ? round($revenueYTD / $activeEmployees, 2) : 0,
                ];
            });
    }

    // -----------------------
    // INVENTORY STATUS (Contextualized)
    // -----------------------
    protected function getInventoryStatus(): array
    {
        $threshold = config('dashboard.low_stock_threshold', 10);

        return Cache::tags(['dashboard', "company:{$this->companyId}"])
            ->remember("dashboard:inventory:{$this->companyId}:{$this->timeframeDays}", $this->defaultCacheTtl, function () use ($threshold) {
                $lowStockQuery = Product::where('company_id', $this->companyId)
                    ->where('current_stock', '<=', $threshold);

                // For service industries, we only care about 'goods', not 'services'
                if (in_array($this->companyIndustry, ['service', 'lawfirm', 'consulting'])) {
                    $lowStockQuery->where('is_service', false);
                }

                return [
                    'products_low_on_stock' => $lowStockQuery->count(),
                    'total_inventory_value' => (float) Product::where('company_id', $this->companyId)
                        ->where('is_service', false)
                        ->sum(DB::raw('current_stock * unit_price')),
                ];
            });
    }

    // -----------------------
    // KEY METRICS
    // -----------------------
    protected function getKeyMetrics(): array
    {
        return [
            'financial_health' => [
                'current_ratio' => $this->calculateCurrentRatio(),
            ],
            'operational_efficiency' => [
                'inventory_turnover' => $this->calculateInventoryTurnover(),
            ],
            'customer_satisfaction' => [
                'nps_score' => $this->calculateNPSScore(),
            ],
        ];
    }

    // -----------------------
    // SYSTEM HEALTH
    // -----------------------
    protected function getSystemHealth(): array
    {
        return [
            'application' => [
                'response_time' => defined('LARAVEL_START') ? round(microtime(true) - LARAVEL_START, 3) : 0,
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

    // -----------------------
    // ALERTS AND NOTIFICATIONS
    // -----------------------
    protected function getAlertsAndNotifications(): array
    {
        if (!class_exists(SystemAlert::class)) {
            return ['critical_alerts' => []];
        }

        $alerts = SystemAlert::where('company_id', $this->companyId)
            ->where('created_at', '>=', now()->subDays(7))
            ->orderByDesc('created_at')
            ->get();

        $critical = $alerts->filter(fn($a) => $a->severity === 'critical' && !$a->resolved)
            ->map(function ($alert) {
                return [
                    'id' => $alert->id,
                    'title' => $alert->title,
                    'description' => $alert->description,
                    'created_at' => $alert->created_at->toISOString(),
                ];
            })->values()->toArray();

        return ['critical_alerts' => $critical];
    }

    // -----------------------
    // RECENT ACTIVITY
    // -----------------------
    protected function getRecentActivity(string $type, int $limit = 5): array
    {
        $cacheKey = "dashboard:recent_activity:{$type}:{$this->companyId}:{$limit}";

        return Cache::tags(['dashboard', "company:{$this->companyId}"])
            ->remember($cacheKey, $this->defaultCacheTtl, function () use ($type, $limit) {
                return match ($type) {
                    'sales' => SalesOrder::where('company_id', $this->companyId)
                        ->with('customer:id,name')
                        ->latest('order_date')
                        ->limit($limit)
                        ->get(['id', 'order_number', 'customer_id', 'total_amount', 'order_date'])
                        ->map(function ($s) {
                            return [
                                'id' => $s->id,
                                'order_number' => $s->order_number,
                                'customer' => $s->customer ? ['id' => $s->customer->id, 'name' => $s->customer->name] : null,
                                'total_amount' => (float) $s->total_amount,
                                'order_date' => optional($s->order_date)->toDateTimeString(),
                            ];
                        })->values()->toArray(),

                    default => [],
                };
            });
    }

    // ========================================================================
    // HELPER & CALCULATION METHODS
    // ========================================================================

    // -----------------------
    // SUGGESTED ACTIONS (Context-Aware)
    // -----------------------
    protected function getSuggestedActions(array $data): array
    {
        $actions = [];

        // Inventory actions
        if (isset($data['inventory_status']) && ($data['inventory_status']['products_low_on_stock'] ?? 0) > 0) {
            $itemName = match($this->companyIndustry) {
                'hospital' => 'medical supplies',
                'school' => 'school supplies',
                default => 'products',
            };
            $actions[] = [
                'message' => "You have {$data['inventory_status']['products_low_on_stock']} $itemName low on stock.",
                'action'  => 'Create Purchase Order',
                'urgency' => 'high',
            ];
        }

        // Sales/Revenue actions
        if (isset($data['sales_performance']) && ($data['sales_performance']['open_orders_count'] ?? 0) > 0) {
            $orderName = match($this->companyIndustry) {
                'service', 'lawfirm' => 'client engagements',
                'school' => 'fee payments',
                'hospital' => 'patient bills',
                default => 'sales orders',
            };
            $actions[] = [
                'message' => "There are {$data['sales_performance']['open_orders_count']} open $orderName to process.",
                'action'  => 'View Orders',
                'urgency' => 'medium',
            ];
        }

        // Purchasing actions
        if (isset($data['purchasing_overview']) && ($data['purchasing_overview']['open_purchase_orders_count'] ?? 0) > 0) {
             $actions[] = [
                'message' => "There are {$data['purchasing_overview']['open_purchase_orders_count']} purchase orders awaiting delivery.",
                'action'  => 'View Purchase Orders',
                'urgency' => 'low',
            ];
        }

        return $actions;
    }

    // -----------------------
    // PERFORMANCE INSIGHTS
    // -----------------------
    protected function getPerformanceInsights(array $data): array
    {
        $insights = [];

        $revenueGrowth = $data['financial_summary']['revenue_change_vs_last_month'] ?? 0;
        if ($revenueGrowth > 20) {
            $insights[] = [
                'type' => 'positive',
                'title' => 'Strong Revenue Growth',
                'description' => "Revenue growing at {$revenueGrowth}% - exceeding targets",
            ];
        } elseif ($revenueGrowth < 0) {
            $insights[] = [
                'type' => 'negative',
                'title' => 'Revenue Decline Detected',
                'description' => "Revenue decreased by " . abs($revenueGrowth) . "% - review sales strategy",
            ];
        }

        $profitMargin = $data['financial_summary']['profit_margin_ytd'] ?? 0;
        if ($profitMargin < 5) {
            $insights[] = [
                'type' => 'warning',
                'title' => 'Low Profit Margin',
                'description' => "Profit margin at {$profitMargin}% - consider cost optimization",
            ];
        }

        return $insights;
    }

    // -----------------------
    // KPI SUMMARY (Context-Aware Labels)
    // -----------------------
    protected function getKpiSummary(array $data): array
    {
        $revenueLabel = match($this->companyIndustry) {
            'school' => 'Total Fees Collected',
            'hospital' => 'Total Patient Billing',
            default => 'Total Revenue',
        };

        return [
            'financial_kpis' => [
                ['label' => $revenueLabel, 'value' => $data['financial_summary']['revenue_ytd'] ?? 0, 'format' => 'currency'],
                ['label' => 'Profit Margin', 'value' => $data['financial_summary']['profit_margin_ytd'] ?? 0, 'format' => 'percentage'],
            ],
            'growth_kpis' => [
                ['label' => 'Revenue Growth (MoM)', 'value' => $data['financial_summary']['revenue_change_vs_last_month'] ?? 0, 'format' => 'percentage'],
            ],
        ];
    }

    // -----------------------
    // FINANCIAL CALCULATION METHODS
    // -----------------------
    protected function calculateCurrentRatio(): float
    {
        $currentAssets = $this->getAccountBalanceForType('Current Asset');
        $currentLiabilities = $this->getAccountBalanceForType('Current Liability');
        return $currentLiabilities != 0 ? round($currentAssets / $currentLiabilities, 2) : 0;
    }

    protected function calculateInventoryTurnover(): float
    {
        $cogs = $this->getAccountBalanceByName('Cost of Goods Sold');
        $averageInventory = $this->getAccountBalanceByName('Inventory');
        return $averageInventory != 0 ? round($cogs / $averageInventory, 2) : 0;
    }

    // -----------------------
    // CASH FLOW CALCULATION METHODS
    // -----------------------
    protected function calculateOperatingCashFlow(): float
    {
        $netIncome = $this->getAccountBalanceForType('Revenue') - $this->getAccountBalanceForType('Expense');
        $depreciation = $this->getAccountBalanceByName('Depreciation');
        return $netIncome + $depreciation;
    }

    protected function calculateInvestingCashFlow(): float
    {
        return -1 * $this->getAccountBalanceByName('Fixed Assets');
    }

    protected function calculateFinancingCashFlow(): float
    {
        $debtIssued = $this->getAccountBalanceByName('Long Term Debt');
        $dividendsPaid = $this->getAccountBalanceByName('Dividends');
        return $debtIssued - $dividendsPaid;
    }

    protected function calculateNetCashFlow(): float
    {
        return $this->calculateOperatingCashFlow() + $this->calculateInvestingCashFlow() + $this->calculateFinancingCashFlow();
    }

    protected function calculateFreeCashFlow(): float
    {
        return $this->calculateOperatingCashFlow() - $this->getAccountBalanceByName('Capital Expenditures');
    }

    // -----------------------
    // SALES & CUSTOMER METHODS
    // -----------------------
    protected function calculateConversionRate(): float
    {
        $leads = Customer::where('company_id', $this->companyId)->count();
        $customers = Customer::where('company_id', $this->companyId)->has('salesOrders')->count();
        return $leads > 0 ? round(($customers / $leads) * 100, 2) : 0;
    }

    protected function getRepeatCustomers(): int
    {
        return Customer::where('company_id', $this->companyId)
            ->has('salesOrders', '>', 1)
            ->count();
    }

    protected function getVipCustomers(): int
    {
        return Customer::where('company_id', $this->companyId)
            ->whereHas('salesOrders', function($q) {
                $q->select('customer_id')
                  ->groupBy('customer_id')
                  ->havingRaw('SUM(total_amount) > 10000'); // VIP threshold
            })
            ->count();
    }

    protected function calculateCustomerLifetimeValue(): float
    {
        // Placeholder calculation
        $avgOrderValue = SalesOrder::where('company_id', $this->companyId)->avg('total_amount') ?? 0;
        return round($avgOrderValue * 4.2 * 3.5, 2);
    }

    protected function calculateChurnRate(): float
    {
        return 8.5; // Placeholder
    }

    // -----------------------
    // CUSTOMER SATISFACTION METHODS
    // -----------------------
    protected function calculateNPSScore(): float
    {
        return 42.0; // Placeholder
    }

    // -----------------------
    // SYSTEM HEALTH METHODS
    // -----------------------
    protected function checkDatabaseConnection(): string
    {
        try {
            DB::connection()->getPdo();
            return 'connected';
        } catch (\Exception $e) {
            return 'disconnected';
        }
    }

    protected function checkCacheStatus(): string
    {
        try {
            Cache::put('health_check', 'ok', 10);
            return Cache::get('health_check') === 'ok' ? 'healthy' : 'unhealthy';
        } catch (\Exception $e) {
            return 'unhealthy';
        }
    }

    // -----------------------
    // ACCOUNT BALANCE HELPERS
    // -----------------------
    protected function loadBalances(array $names = [], array $types = []): void
    {
        if (!empty($names)) {
            $accounts = ChartOfAccount::where('company_id', $this->companyId)
                ->whereIn('account_name', $names)
                ->withSum('journalLines as debits', 'debit')
                ->withSum('journalLines as credits', 'credit')
                ->get();

            foreach ($accounts as $account) {
                $bal = ($account->debits ?? 0) - ($account->credits ?? 0);
                $this->balancesCache[$account->account_name] = in_array($account->account_type, ['Liability', 'Equity', 'Revenue']) ? -$bal : $bal;
            }
        }

        if (!empty($types)) {
            $accounts = ChartOfAccount::where('company_id', $this->companyId)
                ->whereIn('account_type', $types)
                ->withSum(['journalLines as debits' => fn($q) => $this->applyDateFilter($q)], 'debit')
                ->withSum(['journalLines as credits' => fn($q) => $this->applyDateFilter($q)], 'credit')
                ->get();

            $sumByType = [];
            foreach ($accounts as $account) {
                $bal = ($account->debits ?? 0) - ($account->credits ?? 0);
                $adjusted = in_array($account->account_type, ['Liability', 'Equity', 'Revenue']) ? -$bal : $bal;
                $sumByType[$account->account_type] = ($sumByType[$account->account_type] ?? 0) + $adjusted;
            }

            foreach ($sumByType as $type => $value) {
                $this->balancesCache["type:{$type}"] = $value;
            }
        }
    }

    protected function getAccountBalanceForType(string $type, ?Carbon $start = null, ?Carbon $end = null): float
    {
        $key = "type:{$type}";
        if ($start === null && $end === null && array_key_exists($key, $this->balancesCache)) {
            return round($this->balancesCache[$key], 2);
        }

        $query = ChartOfAccount::where('company_id', $this->companyId)
            ->where('account_type', $type)
            ->withSum(['journalLines as debits' => fn($q) => $this->applyDateFilter($q, $start, $end)], 'debit')
            ->withSum(['journalLines as credits' => fn($q) => $this->applyDateFilter($q, $start, $end)], 'credit')
            ->get();

        $balance = 0;
        foreach ($query as $account) {
            $bal = ($account->debits ?? 0) - ($account->credits ?? 0);
            $balance += in_array($account->account_type, ['Liability', 'Equity', 'Revenue']) ? -$bal : $bal;
        }

        return round($balance, 2);
    }

    protected function getAccountBalanceByName(string $name): float
    {
        if (array_key_exists($name, $this->balancesCache)) {
            return round($this->balancesCache[$name], 2);
        }

        $account = ChartOfAccount::where('company_id', $this->companyId)
            ->where('account_name', $name)
            ->withSum('journalLines as debits', 'debit')
            ->withSum('journalLines as credits', 'credit')
            ->first();

        if (!$account) {
            $this->balancesCache[$name] = 0.0;
            return 0.0;
        }

        $bal = ($account->debits ?? 0) - ($account->credits ?? 0);
        $adjusted = in_array($account->account_type, ['Liability', 'Equity', 'Revenue']) ? -$bal : $bal;
        $this->balancesCache[$name] = $adjusted;

        return round($adjusted, 2);
    }

    private function applyDateFilter($query, ?Carbon $start = null, ?Carbon $end = null)
    {
        $startTs = ($start ?? $this->startDate)->copy()->startOfDay();
        $endTs = ($end ?? $this->endDate)->copy()->endOfDay();
        return $query->whereBetween('created_at', [$startTs, $endTs]);
    }

    // -----------------------
    // ACCESS CONTROL
    // -----------------------
    private function canAccessSection(string $key): bool
    {
        $industrySections = array_keys($this->getIndustrySpecificSections());
        if (!in_array($key, $industrySections)) return false;

        return match ($key) {
            'financial_summary', 'cash_flow_analysis' => $this->user->can('view-financial-reports'),
            'sales_performance', 'sales_funnel', 'customer_analytics', 'recent_sales' => $this->user->can('view-sales') || $this->user->can('create-sales') || $this->user->can('view-customers'),
            'purchasing_overview' => $this->user->can('manage-purchasing'),
            'hrm_overview' => $this->user->hasAdminRole() || $this->user->can('view-hrm'),
            'inventory_status' => $this->user->can('manage-products') || $this->user->can('view-inventory'),
            'system_health', 'key_metrics', 'alerts_notifications' => true,
            default => false,
        };
    }

    // -----------------------
    // UTILITIES
    // -----------------------
    private function getFallbackData(string $section): array
    {
        return ['error' => 'Section data temporarily unavailable'];
    }

    protected function normalizeForApi(mixed $value): mixed
    {
        if ($value instanceof Collection) {
            return $value->map(function ($item) {
                if (is_array($item)) return $item;
                if (method_exists($item, 'toArray')) return $item->toArray();
                return (array) $item;
            })->values()->toArray();
        }
        if (is_object($value)) {
            if (method_exists($value, 'toArray')) return $value->toArray();
            return (array) $value;
        }
        return $value;
    }
}
