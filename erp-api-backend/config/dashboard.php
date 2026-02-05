<?php

return [
    'cache_ttl' => env('DASHBOARD_CACHE_TTL', 300),
    'low_stock_threshold' => env('LOW_STOCK_THRESHOLD', 10),
    'default_timeframe_days' => env('DASHBOARD_TIMEFRAME_DAYS', 30),
    'refresh_intervals' => [
        'realtime' => 30,
        'standard' => 300,
        'background' => 1800,
    ],
    'alerts' => [
        'critical_thresholds' => [
            'current_ratio' => 1.0,
            'profit_margin' => 5.0,
            'turnover_rate' => 15.0,
        ],
    ],
    'sections' => [
        'financial_summary',
        'financial_ratios',
        'cash_flow',
        'sales_performance',
        'sales_funnel',
        'customer_analytics',
        'recent_activity_sales',
        'purchasing_overview',
        'supplier_performance',
        'recent_activity_purchases',
        'hrm_overview',
        'workforce_analytics',
        'inventory',
        'inventory_valuation',
        'system_health',
        'key_metrics',
    ],
];
