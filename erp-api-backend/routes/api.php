<?php

use App\Http\Controllers\Accounts\FixedAssetController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Platform\SignupController;
use App\Http\Controllers\CRM\CustomerController;
use App\Http\Controllers\CRM\SupplierController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\JobTitleController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\Accounts\AllowanceController;
use App\Http\Controllers\Accounts\LoanController;
use App\Http\Controllers\Accounts\AdvanceController;
use App\Http\Controllers\Inventory\ProductController;
use App\Http\Controllers\Accounts\PayslipController;
use App\Http\Controllers\Accounts\PayrollController;
use App\Http\Controllers\Purchasing\PurchaseOrderController;
use App\Http\Controllers\Sales\SalesController;
use App\Http\Controllers\Accounts\AccountingController;
use App\Http\Controllers\Accounts\BankStatementController;
use App\Http\Controllers\Accounts\BillPaymentController;
use App\Http\Controllers\Accounts\InvoiceController;
use App\Http\Controllers\Dashboard\DashboardController;
use App\Http\Controllers\CompanyController;
use App\Models\SubscriptionPlan;
use App\Http\Controllers\LeaveController;
use App\Http\Controllers\JobOpeningController;
use App\Http\Controllers\ApplicantController;
use App\Http\Controllers\Accounts\CustomerPaymentController;
use App\Http\Controllers\Accounts\ExpenseController;
use App\Http\Controllers\Accounts\ReportsController;
use App\Http\Controllers\Accounts\SupplierBillController;
use App\Http\Controllers\Banking\MpesaCallbackController;
use App\Http\Controllers\Inventory\StockAdjustmentController;
use App\Http\Controllers\Calendar\CalendarController;

// --- PUBLIC ROUTES ---
Route::get('/plans', fn () => SubscriptionPlan::all());
Route::post('/register-subscribe', [SignupController::class, 'registerAndSubscribe']);
Route::post('/login', [LoginController::class, 'login']);

// --- PROTECTED ROUTES ---
Route::middleware('auth:sanctum')->group(function () {

    // --- AUTH ROUTES ---
    Route::post('/logout', [LoginController::class, 'logout']);
    Route::get('/user', fn (Request $request) => $request->user());
    Route::post('/refresh', [LoginController::class, 'refreshToken']);

    // CRM
    Route::apiResource('customers', CustomerController::class);
    Route::apiResource('suppliers', SupplierController::class);

    // HRM Core
    Route::apiResource('departments', DepartmentController::class);
    Route::apiResource('job-titles', JobTitleController::class);

    // Employee Specific Sub-Routes
    Route::post('/employees/{employee}/loans', [LoanController::class, 'store']);
    Route::post('/employees/{employee}/advances', [AdvanceController::class, 'store']);
    Route::get('/employees/{employee}/leave-balance', [LeaveController::class, 'getEmployeeLeaveBalance']);
    Route::get('/employees/{employee}/leave-history', [LeaveController::class, 'getEmployeeLeaveHistory']);

    // Employee Resource
    Route::apiResource('employees', EmployeeController::class);

    // --- RECRUITMENT ROUTES ---
    Route::apiResource('job-openings', JobOpeningController::class);
    Route::get('/applicants/{applicant}/resume', [ApplicantController::class, 'downloadResume']);
    Route::apiResource('applicants', ApplicantController::class);

    // Leave Management
    Route::get('/leave-types', [LeaveController::class, 'getLeaveTypes']);
    Route::get('/leave-balance', [LeaveController::class, 'getUserLeaveBalance']);
    Route::post('/leave-requests', [LeaveController::class, 'storeLeaveRequest']);
    Route::get('/leave-requests', [LeaveController::class, 'index']);
    Route::get('/leave-requests/pending', [LeaveController::class, 'getPendingRequests']);
    Route::patch('/leave-requests/{leaveRequest}/approve', [LeaveController::class, 'approve']);
    Route::patch('/leave-requests/{leaveRequest}/reject', [LeaveController::class, 'reject']);

    // Accounts / Payroll
    Route::apiResource('allowances', AllowanceController::class);
    Route::apiResource('payslips', PayslipController::class);

    // --- Payroll Routes ---
    Route::prefix('payroll')->group(function () {
        Route::post('/generate', [PayrollController::class, 'generate'])->name('payroll.generate');
        Route::post('/close-month', [PayrollController::class, 'closeMonth'])->name('payroll.close');
        Route::get('/reports', [PayrollController::class, 'index'])->name('payroll.reports.index');
        Route::get('/reports/{payrollArchive}', [PayrollController::class, 'show'])
            ->where('payrollArchive', '[0-9]+')
            ->name('payroll.reports.show');
        Route::get('/reports/summary', [PayrollController::class, 'getMonthlySummary'])->name('payroll.reports.summary');
    });

    // Inventory
    Route::apiResource('products', ProductController::class);

    // Stock Adjustment Resource Route
    Route::apiResource('stock-adjustments', StockAdjustmentController::class);

    // Purchasing
    Route::apiResource('purchase-orders', PurchaseOrderController::class)->except(['destroy']);

    // Sales
    Route::apiResource('sales', SalesController::class)->except(['destroy']);

    // --- Invoicing (Accounts Receivable) ---
    Route::apiResource('invoices', InvoiceController::class);

    // Helper route for data correction
    Route::post('/invoices/recalculate-balances', [InvoiceController::class, 'recalculateBalances']);

    // --- INVOICE REPORTS ---
    Route::prefix('invoices/reports')->group(function () {
        Route::get('/ar-aging', [ReportsController::class, 'getArAging']);
        Route::get('/all', [ReportsController::class, 'getInvoiceList']);
    });

    // --- Expense Claims ---
    Route::apiResource('expenses', ExpenseController::class)
        ->except(['show']);

    // --- Customer Payments (AR) ---
    Route::prefix('payments')->group(function () {
        Route::get('/', [CustomerPaymentController::class, 'index']);
        Route::post('/', [CustomerPaymentController::class, 'store']);
        Route::get('/{id}', [CustomerPaymentController::class, 'show']);
        Route::delete('/{id}', [CustomerPaymentController::class, 'destroy']);
    });

    // --- Supplier Bills (AP) ---
    Route::apiResource('bills', SupplierBillController::class);

    // Bill Payment routes
    Route::prefix('bill-payments')->group(function () {
        Route::get('/', [BillPaymentController::class, 'index']);
        Route::post('/', [BillPaymentController::class, 'store']);
        Route::get('/{billPayment}', [BillPaymentController::class, 'show']);
        Route::delete('/{billPayment}', [BillPaymentController::class, 'destroy']);
    });

    // Accounting
    Route::prefix('accounting')->group(function () {
        // Core Reports
        Route::get('/chart-of-accounts', [AccountingController::class, 'chartOfAccounts']);
        Route::get('/balance-sheet', [AccountingController::class, 'getBalanceSheet']);
        Route::get('/profit-loss', [AccountingController::class, 'getProfitAndLoss']);
        Route::get('/trial-balance', [AccountingController::class, 'getTrialBalance']);

        // 💡 FIX: ADD CASH FLOW STATEMENT ROUTE
        Route::get('/cash-flow-statement', [AccountingController::class, 'generateCashFlowStatement']);

        Route::get('/general-ledger', [AccountingController::class, 'getGeneralLedger']);
        Route::get('/key-ratios', [AccountingController::class, 'getKeyRatios']);

        // Report Archives
        Route::get('/archived-reports', [AccountingController::class, 'listArchivedReports']);
        Route::get('/archived-reports/{archivedReport}', [AccountingController::class, 'showArchivedReport']);

        Route::apiResource('assets', FixedAssetController::class);
        Route::apiResource('journal-entries', \App\Http\Controllers\Accounts\JournalEntryController::class);

        // Bank Reconciliation
        Route::post('/bank-statements/upload', [BankStatementController::class, 'uploadStatement']);
        Route::get('/bank-statements', [BankStatementController::class, 'index']);
        Route::get('/unreconciled-lines', [BankStatementController::class, 'getUnreconciledLedgerLines']);
        Route::post('/reconcile', [BankStatementController::class, 'reconcileTransactions']);

        // Mpesa
        Route::post('/mpesa/balance-result', [MpesaCallbackController::class, 'balanceResult']);
        Route::post('/mpesa/status-result', [MpesaCallbackController::class, 'statusResult']);
        Route::post('/mpesa/timeout', [MpesaCallbackController::class, 'timeout']);

         // Budgeting
        Route::get('/budgets', [\App\Http\Controllers\Accounts\BudgetController::class, 'index']);
        Route::post('/budgets', [\App\Http\Controllers\Accounts\BudgetController::class, 'store']);
        Route::delete('/budgets/{id}', [\App\Http\Controllers\Accounts\BudgetController::class, 'destroy']);
        Route::get('/budget-vs-actuals', [AccountingController::class, 'getBudgetVsActuals']);
    });

    // Company / Settings
    Route::get('/company', [CompanyController::class, 'show']);
    Route::post('/company/users', [CompanyController::class, 'addUser']);
    Route::post('/company/update', [CompanyController::class, 'update']);

    // Dashboard
    Route::prefix('dashboard')->controller(DashboardController::class)->group(function () {
        Route::get('/', '__invoke');
        Route::get('/financial', 'financialSummary');
        Route::get('/sales', 'salesPerformance');
        Route::get('/purchasing', 'purchasingOverview');
        Route::get('/hrm', 'hrmOverview');
        Route::get('/inventory', 'inventoryOverview');
        Route::get('/system', 'systemHealth');
    });

    Route::prefix('calendar')->group(function () {
        Route::get('/events', [CalendarController::class, 'index']);
        Route::post('/events', [CalendarController::class, 'store']);
        Route::get('/events/{event}', [CalendarController::class, 'show']);
        Route::put('/events/{event}', [CalendarController::class, 'update']);
        Route::delete('/events/{event}', [CalendarController::class, 'destroy']);

        // Drag/drop + resize support (optional but clean)
        Route::patch('/events/{event}/move', [CalendarController::class, 'move']);
        Route::patch('/events/{event}/resize', [CalendarController::class, 'resize']);
    });

    Route::get('/notifications', function (Request $request) {
        return [
            'ok' => true,
            'data' => $request->user()->notifications()->latest()->limit(50)->get(),
        ];
    });

    Route::post('/notifications/{id}/read', function (Request $request, string $id) {
        $n = $request->user()->notifications()->where('id', $id)->firstOrFail();
        $n->markAsRead();
        return ['ok' => true];
    });

});
