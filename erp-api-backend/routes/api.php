<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Auth\LoginController;

use App\Http\Controllers\Platform\RegistrationController;
use App\Http\Controllers\Platform\SignupController;
use App\Http\Controllers\Platform\SubscriptionController;

use App\Http\Controllers\CRM\CustomerController;
use App\Http\Controllers\CRM\SupplierController;

use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\JobTitleController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\LeaveController;
use App\Http\Controllers\JobOpeningController;
use App\Http\Controllers\ApplicantController;
use App\Http\Controllers\PublicCareersController;

use App\Http\Controllers\CompanyController;
use App\Http\Controllers\Dashboard\DashboardController;

use App\Http\Controllers\Accounts\AccountingController;
use App\Http\Controllers\Accounts\AllowanceController;
use App\Http\Controllers\Accounts\AdvanceController;
use App\Http\Controllers\Accounts\BankStatementController;
use App\Http\Controllers\Accounts\BillPaymentController;
use App\Http\Controllers\Accounts\BudgetController;
use App\Http\Controllers\Accounts\CustomerPaymentController;
use App\Http\Controllers\Accounts\ExpenseController;
use App\Http\Controllers\Accounts\FixedAssetController;
use App\Http\Controllers\Accounts\InvoiceController;
use App\Http\Controllers\Accounts\JournalEntryController;
use App\Http\Controllers\Accounts\LoanController;
use App\Http\Controllers\Accounts\PayrollController;
use App\Http\Controllers\Accounts\PayslipController;
use App\Http\Controllers\Accounts\ReportsController;
use App\Http\Controllers\Accounts\SupplierBillController;

use App\Http\Controllers\Inventory\ProductController;
use App\Http\Controllers\Inventory\StockAdjustmentController;

use App\Http\Controllers\Purchasing\PurchaseOrderController;
use App\Http\Controllers\Sales\SalesController;

use App\Http\Controllers\Calendar\CalendarController;
use App\Http\Controllers\Calendar\CalendarFeedController;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
|
| These routes are available without authentication.
| The landing page currently uses:
| GET  /api/plans
| POST /api/register-subscribe
|
*/

Route::get('/plans', [SubscriptionController::class, 'plans']);
Route::get('/plans/{id}', [SubscriptionController::class, 'show'])
    ->whereNumber('id');

Route::post('/register-subscribe', [RegistrationController::class, 'registerAndSubscribe']);

Route::post('/login', [LoginController::class, 'login']);

/*
|--------------------------------------------------------------------------
| Platform Public Aliases
|--------------------------------------------------------------------------
|
| These are optional aliases for platform-specific frontend clients.
|
*/

Route::prefix('platform')->group(function () {
    Route::get('/plans', [SubscriptionController::class, 'plans']);

    Route::get('/plans/{id}', [SubscriptionController::class, 'show'])
        ->whereNumber('id');

    Route::post('/register-subscribe', [RegistrationController::class, 'registerAndSubscribe']);
});

/*
|--------------------------------------------------------------------------
| Backward-Compatible Signup Route
|--------------------------------------------------------------------------
|
| Keep this only for older frontend code that still calls:
| POST /api/signup/register-subscribe
|
*/

Route::post('/signup/register-subscribe', [SignupController::class, 'registerAndSubscribe']);

/*
|--------------------------------------------------------------------------
| Public Careers Routes
|--------------------------------------------------------------------------
*/

Route::prefix('public')->group(function () {
    Route::get('/companies/{company_id}/jobs', [PublicCareersController::class, 'index'])
        ->whereNumber('company_id');

    Route::get('/companies/{company_id}/jobs/{job_opening_id}', [PublicCareersController::class, 'show'])
        ->whereNumber('company_id')
        ->whereNumber('job_opening_id');

    Route::post('/apply', [PublicCareersController::class, 'storeApplication']);
});

/*
|--------------------------------------------------------------------------
| Protected Routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {
    /*
    |--------------------------------------------------------------------------
    | Auth
    |--------------------------------------------------------------------------
    */

    Route::post('/logout', [LoginController::class, 'logout']);

    Route::get('/user', fn (Request $request) => $request->user());

    /*
    |--------------------------------------------------------------------------
    | Token Refresh
    |--------------------------------------------------------------------------
    |
    | Keep both paths because your frontend may call either one.
    |
    */

    Route::post('/refresh', [LoginController::class, 'refreshToken']);
    Route::post('/auth/refresh', [LoginController::class, 'refreshToken']);

    /*
    |--------------------------------------------------------------------------
    | Main Dashboard
    |--------------------------------------------------------------------------
    |
    | Frontend calls apiClient.get("/dashboard"), so this direct route
    | must exist as GET /api/dashboard.
    |
    */

    Route::get('/dashboard', DashboardController::class);

    Route::prefix('dashboard')->controller(DashboardController::class)->group(function () {
        Route::get('/financial-summary', 'financialSummary');
        Route::get('/sales-performance', 'salesPerformance');
        Route::get('/purchasing-overview', 'purchasingOverview');
        Route::get('/hrm-overview', 'hrmOverview');
        Route::get('/inventory-overview', 'inventoryOverview');
        Route::get('/cash-flow', 'cashFlow');
        Route::get('/key-metrics', 'keyMetrics');
        Route::get('/system-health', 'systemHealth');
        Route::get('/alerts', 'alerts');
        Route::get('/recent-sales', 'recentSales');

        /*
        |--------------------------------------------------------------------------
        | Backward-Compatible Dashboard Aliases
        |--------------------------------------------------------------------------
        */

        Route::get('/financial', 'financialSummary');
        Route::get('/sales', 'salesPerformance');
        Route::get('/purchasing', 'purchasingOverview');
        Route::get('/hrm', 'hrmOverview');
        Route::get('/inventory', 'inventoryOverview');
        Route::get('/system', 'systemHealth');
    });

    /*
    |--------------------------------------------------------------------------
    | CRM
    |--------------------------------------------------------------------------
    */

    Route::apiResource('customers', CustomerController::class);
    Route::apiResource('suppliers', SupplierController::class);

    /*
    |--------------------------------------------------------------------------
    | HRM Core
    |--------------------------------------------------------------------------
    */

    Route::apiResource('departments', DepartmentController::class);
    Route::apiResource('job-titles', JobTitleController::class);

    Route::post('/employees/{employee}/loans', [LoanController::class, 'store'])
        ->whereNumber('employee');

    Route::post('/employees/{employee}/advances', [AdvanceController::class, 'store'])
        ->whereNumber('employee');

    Route::get('/employees/{employee}/leave-balance', [LeaveController::class, 'getEmployeeLeaveBalance'])
        ->whereNumber('employee');

    Route::get('/employees/{employee}/leave-history', [LeaveController::class, 'getEmployeeLeaveHistory'])
        ->whereNumber('employee');

    Route::apiResource('employees', EmployeeController::class);

    /*
    |--------------------------------------------------------------------------
    | Recruitment
    |--------------------------------------------------------------------------
    */

    Route::apiResource('job-openings', JobOpeningController::class);

    Route::get('/applicants/{applicant}/resume', [ApplicantController::class, 'downloadResume'])
        ->whereNumber('applicant');

    Route::post('/applicants/{applicant}/hire', [ApplicantController::class, 'hire'])
        ->whereNumber('applicant');

    Route::apiResource('applicants', ApplicantController::class);

    /*
    |--------------------------------------------------------------------------
    | Leave Management
    |--------------------------------------------------------------------------
    */

    Route::get('/leave-types', [LeaveController::class, 'getLeaveTypes']);
    Route::get('/leave-balance', [LeaveController::class, 'getUserLeaveBalance']);

    Route::get('/leave-requests', [LeaveController::class, 'index']);
    Route::post('/leave-requests', [LeaveController::class, 'storeLeaveRequest']);

    Route::get('/leave-requests/pending', [LeaveController::class, 'getPendingRequests']);

    Route::patch('/leave-requests/{leaveRequest}/approve', [LeaveController::class, 'approve'])
        ->whereNumber('leaveRequest');

    Route::patch('/leave-requests/{leaveRequest}/reject', [LeaveController::class, 'reject'])
        ->whereNumber('leaveRequest');

    /*
    |--------------------------------------------------------------------------
    | Payroll / Payslips / Allowances
    |--------------------------------------------------------------------------
    */

    Route::apiResource('allowances', AllowanceController::class);
    Route::apiResource('payslips', PayslipController::class);

    Route::prefix('payroll')->group(function () {
        Route::post('/generate', [PayrollController::class, 'generate'])
            ->name('payroll.generate');

        Route::post('/close-month', [PayrollController::class, 'closeMonth'])
            ->name('payroll.close');

        Route::get('/reports', [PayrollController::class, 'index'])
            ->name('payroll.reports.index');

        Route::get('/reports/summary', [PayrollController::class, 'getMonthlySummary'])
            ->name('payroll.reports.summary');

        Route::get('/reports/{payrollArchive}', [PayrollController::class, 'show'])
            ->whereNumber('payrollArchive')
            ->name('payroll.reports.show');
    });

    /*
    |--------------------------------------------------------------------------
    | Inventory
    |--------------------------------------------------------------------------
    */

    Route::apiResource('products', ProductController::class);
    Route::apiResource('stock-adjustments', StockAdjustmentController::class);

    /*
    |--------------------------------------------------------------------------
    | Purchasing
    |--------------------------------------------------------------------------
    */

    Route::apiResource('purchase-orders', PurchaseOrderController::class)
        ->except(['destroy']);

    /*
    |--------------------------------------------------------------------------
    | Sales
    |--------------------------------------------------------------------------
    */

    Route::apiResource('sales', SalesController::class)
        ->except(['destroy']);

    /*
    |--------------------------------------------------------------------------
    | Invoices / Accounts Receivable
    |--------------------------------------------------------------------------
    */

    Route::apiResource('invoices', InvoiceController::class);

    Route::post('/invoices/recalculate-balances', [InvoiceController::class, 'recalculateBalances']);

    Route::prefix('invoices/reports')->group(function () {
        Route::get('/ar-aging', [ReportsController::class, 'getArAging']);
        Route::get('/all', [ReportsController::class, 'getInvoiceList']);
    });

    /*
    |--------------------------------------------------------------------------
    | Expense Claims
    |--------------------------------------------------------------------------
    */

    Route::apiResource('expenses', ExpenseController::class)
        ->except(['show']);

    /*
    |--------------------------------------------------------------------------
    | Customer Payments / AR Receipts
    |--------------------------------------------------------------------------
    */

    Route::prefix('payments')->group(function () {
        Route::get('/', [CustomerPaymentController::class, 'index']);
        Route::post('/', [CustomerPaymentController::class, 'store']);

        Route::get('/{id}', [CustomerPaymentController::class, 'show'])
            ->whereNumber('id');

        Route::delete('/{id}', [CustomerPaymentController::class, 'destroy'])
            ->whereNumber('id');
    });

    /*
    |--------------------------------------------------------------------------
    | Supplier Bills / AP
    |--------------------------------------------------------------------------
    */

    Route::apiResource('bills', SupplierBillController::class);

    Route::prefix('bill-payments')->group(function () {
        Route::get('/', [BillPaymentController::class, 'index']);
        Route::post('/', [BillPaymentController::class, 'store']);

        Route::get('/{billPayment}', [BillPaymentController::class, 'show'])
            ->whereNumber('billPayment');

        Route::delete('/{billPayment}', [BillPaymentController::class, 'destroy'])
            ->whereNumber('billPayment');
    });

    /*
    |--------------------------------------------------------------------------
    | Accounting / Finance Department
    |--------------------------------------------------------------------------
    */

    Route::prefix('accounting')->group(function () {
        /*
        |--------------------------------------------------------------------------
        | Core Financial Reports
        |--------------------------------------------------------------------------
        */

        Route::get('/chart-of-accounts', [AccountingController::class, 'chartOfAccounts']);
        Route::get('/balance-sheet', [AccountingController::class, 'getBalanceSheet']);
        Route::get('/profit-loss', [AccountingController::class, 'getProfitAndLoss']);
        Route::get('/trial-balance', [AccountingController::class, 'getTrialBalance']);
        Route::get('/general-ledger', [AccountingController::class, 'getGeneralLedger']);
        Route::get('/cash-flow-statement', [AccountingController::class, 'generateCashFlowStatement']);

        /*
        |--------------------------------------------------------------------------
        | Finance Dashboard Endpoints
        |--------------------------------------------------------------------------
        */

        Route::get('/dashboard-summary', [AccountingController::class, 'getDashboardSummary']);
        Route::get('/financial-trends', [AccountingController::class, 'getFinancialTrends']);
        Route::get('/key-ratios', [AccountingController::class, 'getKeyRatios']);
        Route::get('/alerts', [AccountingController::class, 'getAlerts']);
        Route::get('/period-status', [AccountingController::class, 'getPeriodStatus']);
        Route::get('/finance-dashboard', [AccountingController::class, 'getFinanceDashboardBundle']);

        /*
        |--------------------------------------------------------------------------
        | Dashboard-Friendly Report Summaries
        |--------------------------------------------------------------------------
        */

        Route::prefix('reports')->group(function () {
            Route::get('/ar-aging', [AccountingController::class, 'getAccountsReceivableAging']);
            Route::get('/ap-aging', [AccountingController::class, 'getAccountsPayableAging']);
            Route::get('/cashflow-summary', [AccountingController::class, 'getCashflowSummary']);
            Route::get('/budget-vs-actual', [AccountingController::class, 'getBudgetSummary']);
            Route::get('/tax-summary', [AccountingController::class, 'getTaxSummary']);
        });

        /*
        |--------------------------------------------------------------------------
        | Report Archives
        |--------------------------------------------------------------------------
        */

        Route::get('/archived-reports', [AccountingController::class, 'listArchivedReports']);

        Route::get('/archived-reports/{archivedReport}', [AccountingController::class, 'showArchivedReport'])
            ->whereNumber('archivedReport');

        /*
        |--------------------------------------------------------------------------
        | Fixed Assets
        |--------------------------------------------------------------------------
        */

        Route::apiResource('assets', FixedAssetController::class);

        /*
        |--------------------------------------------------------------------------
        | Journal Entries
        |--------------------------------------------------------------------------
        */

        Route::apiResource('journal-entries', JournalEntryController::class);

        /*
        |--------------------------------------------------------------------------
        | Bank Reconciliation
        |--------------------------------------------------------------------------
        */

        Route::post('/bank-statements/upload', [BankStatementController::class, 'uploadStatement']);
        Route::get('/bank-statements', [BankStatementController::class, 'index']);
        Route::get('/unreconciled-lines', [BankStatementController::class, 'getUnreconciledLedgerLines']);
        Route::post('/reconcile', [BankStatementController::class, 'reconcileTransactions']);

        /*
        |--------------------------------------------------------------------------
        | Mpesa Banking Callbacks / Results
        |--------------------------------------------------------------------------
        |
        | These are registered only if the controller exists.
        | This prevents php artisan route:list from crashing during development.
        |
        */

        if (class_exists(\App\Http\Controllers\Banking\MpesaCallbackController::class)) {
            Route::post('/mpesa/balance-result', [
                \App\Http\Controllers\Banking\MpesaCallbackController::class,
                'balanceResult',
            ]);

            Route::post('/mpesa/status-result', [
                \App\Http\Controllers\Banking\MpesaCallbackController::class,
                'statusResult',
            ]);

            Route::post('/mpesa/timeout', [
                \App\Http\Controllers\Banking\MpesaCallbackController::class,
                'timeout',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Budgets
        |--------------------------------------------------------------------------
        */

        Route::get('/budgets', [BudgetController::class, 'index']);
        Route::post('/budgets', [BudgetController::class, 'store']);

        Route::delete('/budgets/{id}', [BudgetController::class, 'destroy'])
            ->whereNumber('id');

        /*
        |--------------------------------------------------------------------------
        | Backward-Compatible Accounting Route
        |--------------------------------------------------------------------------
        */

        Route::get('/budget-vs-actuals', [AccountingController::class, 'getBudgetVsActuals']);
    });

    /*
    |--------------------------------------------------------------------------
    | Company / Settings
    |--------------------------------------------------------------------------
    */

    Route::get('/company', [CompanyController::class, 'show']);
    Route::post('/company/users', [CompanyController::class, 'addUser']);
    Route::post('/company/update', [CompanyController::class, 'update']);

    /*
    |--------------------------------------------------------------------------
    | Calendar
    |--------------------------------------------------------------------------
    */

    Route::prefix('calendar')->group(function () {
        Route::get('/events', [CalendarController::class, 'index']);
        Route::post('/events', [CalendarController::class, 'store']);

        Route::get('/events/{event}', [CalendarController::class, 'show'])
            ->whereNumber('event');

        Route::put('/events/{event}', [CalendarController::class, 'update'])
            ->whereNumber('event');

        Route::delete('/events/{event}', [CalendarController::class, 'destroy'])
            ->whereNumber('event');

        Route::patch('/events/{event}/done', [CalendarController::class, 'toggleDone'])
            ->whereNumber('event');

        Route::patch('/events/{event}/move', [CalendarController::class, 'move'])
            ->whereNumber('event');

        Route::patch('/events/{event}/resize', [CalendarController::class, 'resize'])
            ->whereNumber('event');

        Route::get('/feed', [CalendarFeedController::class, 'index']);
    });

    /*
    |--------------------------------------------------------------------------
    | Notifications
    |--------------------------------------------------------------------------
    */

    Route::get('/notifications', function (Request $request) {
        return [
            'ok' => true,
            'data' => $request->user()
                ->notifications()
                ->latest()
                ->limit(50)
                ->get(),
        ];
    });

    Route::post('/notifications/{id}/read', function (Request $request, string $id) {
        $notification = $request->user()
            ->notifications()
            ->where('id', $id)
            ->firstOrFail();

        $notification->markAsRead();

        return ['ok' => true];
    });
});
