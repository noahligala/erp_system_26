<?php

namespace App\Providers;

use App\Models\Accounts\Invoice;          // 👈 --- ADD THIS
use App\Policies\Accounts\InvoicePolicy;  // 👈 --- ADD THIS
use Illuminate\Support\Facades\Gate;
use App\Models\Accounts\Payslip;
use App\Models\Accounts\Allowance;
use App\Models\User;
use App\Models\CRM\Customer;
use App\Models\Department;
use App\Models\JobTitle;
use App\Models\Inventory\Product;
use App\Models\PurchaseOrder;
use App\Models\Inventory\SalesOrder;
use App\Models\Supplier;
use App\Policies\AccountingPolicy;
use App\Policies\AllowancePolicy;
use App\Policies\CustomerPolicy;
use App\Policies\DepartmentPolicy;
use App\Policies\JobTitlePolicy;
use App\Policies\EmployeePolicy;
use App\Policies\LoanAndAdvancePolicy;
use App\Policies\PayslipPolicy;
use App\Policies\ProductPolicy;
use App\Policies\PurchaseOrderPolicy;
use App\Policies\SalesOrderPolicy;
use App\Policies\SupplierPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Allowance::class => AllowancePolicy::class,
        Customer::class => CustomerPolicy::class,
        Department::class => DepartmentPolicy::class,
        JobTitle::class => JobTitlePolicy::class,
        User::class => EmployeePolicy::class,
        Payslip::class => PayslipPolicy::class,
        Product::class => ProductPolicy::class,
        SalesOrder::class => SalesOrderPolicy::class,
        Supplier::class => SupplierPolicy::class,
        PurchaseOrder::class => PurchaseOrderPolicy::class,
        Invoice::class => InvoicePolicy::class, // 👈 --- ADD THIS
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        // --- Define Gates for Non-Model-Specific Authorization ---

        Gate::define('view-financial-reports', [AccountingPolicy::class, 'viewFinancialReports']);
        Gate::define('manage-payroll', [AccountingPolicy::class, 'managePayroll']);
        Gate::define('manage-loans-advances', [LoanAndAdvancePolicy::class, 'manage']);

        // --- 💡 ADD THESE GATES FOR INVOICING ---
        // (These now work because the class is imported)
        Gate::define('view-invoices', [InvoicePolicy::class, 'viewAny']);
        Gate::define('create-invoices', [InvoicePolicy::class, 'create']);
        Gate::define('manage-invoices', [InvoicePolicy::class, 'create']);

        // --- 💡 ADD GATES FOR PRODUCTS (Needed by CreateInvoice) ---
        Gate::define('view-products', [ProductPolicy::class, 'viewAny']);

        // --- 💡 ADD GATES FOR CUSTOMERS (Needed by CreateInvoice) ---
        Gate::define('view-customers', [CustomerPolicy::class, 'viewAny']);
    }
}
