<?php

namespace Database\Seeders;

use App\Models\Inventory\Location;
use App\Models\Inventory\InventorySummary;
use App\Models\Inventory\Category;
use App\Models\Accounts\ChartOfAccount;
use App\Models\Company;
use App\Models\CRM\Customer;
use App\Models\Department;
use App\Models\EmployeeProfile;
use App\Models\JobTitle;
use App\Models\Accounts\JournalEntry;
use App\Models\Inventory\Product;
use App\Models\PurchaseOrder;
use App\Models\Inventory\SalesOrder;
use App\Models\Inventory\StockMovement;
use App\Models\Supplier;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Models\Accounts\Allowance;
use App\Models\Accounts\Loan;
use App\Models\Accounts\Advance;
use App\Models\Accounts\Payslip;
use App\Models\Accounts\PayrollArchive;
use App\Models\Inventory\SalesOrderItem;
use App\Models\PurchaseOrderItem;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Faker\Generator;
use Faker\Factory as FakerFactory;
use RuntimeException;

class DatabaseSeeder extends Seeder
{
    protected Generator $faker;

    public function __construct()
    {
        $this->faker = FakerFactory::create();
    }

    protected array $techCatalog = [
        ['High-Performance Router', false, 150, 400],
        ['Wireless Access Point Pro', false, 120, 250],
        ['Network Installation Service (Per Hour)', true, 75, 125],
        ['Annual IT Support Contract (Basic)', true, 1200, 2500],
    ];

    protected array $lawFirmCatalog = [
        ['Legal Consultation (Hourly Rate)', true, 250, 500],
        ['Document Review & Drafting', true, 500, 2000],
        ['Court Representation (Per Day)', true, 1500, 4000],
        ['Retainer Fee (Monthly)', true, 1000, 3000],
        ['Standard Legal Forms Pack', false, 50, 150],
    ];

    protected array $schoolCatalog = [
        ['Tuition Fee (Term 1)', true, 500, 1500],
        ['Tuition Fee (Term 2)', true, 500, 1500],
        ['Transport Fee (Per Term)', true, 100, 300],
        ['Extracurricular Activity Fee', true, 50, 200],
        ['School Uniform Set (Small)', false, 30, 60],
        ['School Textbooks Pack (Grade 5)', false, 80, 150],
        ['Stationery Kit', false, 15, 30],
    ];

    protected array $supermarketCatalog = [
        ['Milk (1L)', false, 1, 2],
        ['Bread (Loaf)', false, 1.5, 3],
        ['Rice (5kg Bag)', false, 5, 10],
        ['Cooking Oil (3L)', false, 8, 15],
        ['Fresh Apples (1kg)', false, 3, 6],
        ['Detergent Powder (2kg)', false, 4, 8],
        ['Home Delivery Charge', true, 2, 5],
    ];

    protected array $hospitalCatalog = [
        ['General Consultation', true, 30, 60],
        ['Specialist Consultation', true, 80, 150],
        ['X-Ray Imaging', true, 50, 120],
        ['Blood Test Panel (Basic)', true, 25, 70],
        ['Inpatient Bed Charge (Per Night)', true, 100, 300],
        ['Paracetamol Pack (500mg)', false, 5, 15],
        ['Antibiotic Course (Amoxicillin)', false, 15, 40],
        ['Surgical Bandage Kit', false, 10, 25],
    ];

    protected array $constructionCatalog = [
        ['Cement (50kg Bag)', false, 8, 12],
        ['Steel Rebar (Per Ton)', false, 700, 900],
        ['Architectural Design Service', true, 2000, 10000],
        ['Site Supervision (Per Day)', true, 300, 600],
    ];

    protected array $restaurantCatalog = [
        ['Gourmet Burger Meal', false, 15, 25],
        ['Pasta Carbonara', false, 12, 20],
        ['Craft Beer (Pint)', false, 5, 10],
        ['Catering Service (Per Head)', true, 30, 80],
    ];

    protected array $logisticsCatalog = [
        ['Local Delivery (Same Day)', true, 10, 30],
        ['International Shipping (Per kg)', true, 5, 20],
        ['Warehousing Storage (Per Pallet/Month)', true, 15, 40],
        ['Freight Forwarding Service', true, 500, 2000],
    ];

    protected array $realEstateCatalog = [
        ['Property Valuation Report', true, 300, 800],
        ['Rental Property Management Fee (Monthly)', true, 100, 500],
        ['Real Estate Agent Commission (Sales)', true, 5000, 20000],
    ];

    protected array $agricultureCatalog = [
        ['Premium Coffee Beans (Export Grade, Per ton)', false, 3000, 5000],
        ['Fertilizer (50kg Bag)', false, 30, 60],
        ['Tractor Leasing Service (Per Day)', true, 200, 400],
        ['Agronomy Consultation Service', true, 500, 1500],
    ];

    public function run(): void
    {
        DB::disableQueryLog();

        /*
        |--------------------------------------------------------------------------
        | Seed subscription plans first
        |--------------------------------------------------------------------------
        |
        | Every company must belong to one of:
        | - basic
        | - silver
        | - platinum
        |
        */

        $this->call(SubscriptionPlanSeeder::class);

        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        InventorySummary::truncate();
        Location::truncate();
        StockMovement::truncate();

        DB::table('sales_order_items')->truncate();
        DB::table('purchase_order_items')->truncate();

        SalesOrder::truncate();
        PurchaseOrder::truncate();
        Customer::truncate();
        Supplier::truncate();
        Product::truncate();
        Category::truncate();
        Allowance::truncate();
        JobTitle::truncate();
        Department::truncate();
        Loan::truncate();
        Advance::truncate();
        EmployeeProfile::truncate();

        DB::table('journal_entry_lines')->truncate();

        JournalEntry::truncate();
        ChartOfAccount::truncate();
        Payslip::truncate();
        PayrollArchive::truncate();
        Company::truncate();
        User::truncate();

        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $this->call(PermissionSeeder::class);

        $this->createTestCompany(
            'Apex Legal Partners',
            'law@apex.com',
            'silver',
            15,
            true,
            $this->lawFirmCatalog,
            ['Nairobi CBD Chambers'],
            [
                'city' => 'Nairobi',
                'industry' => 'LawFirm',
                'department_names' => ['Litigation', 'Corporate Law', 'Family Law', 'Conveyancing'],
            ]
        );

        $this->createTestCompany(
            'Sunrise Academy',
            'info@sunrise.edu',
            'platinum',
            50,
            true,
            $this->schoolCatalog,
            ['Main Campus', 'Sports Complex'],
            [
                'city' => 'Nakuru',
                'industry' => 'School',
                'department_names' => ['Teaching Staff', 'Administration', 'Sports & Arts', 'Maintenance'],
                'job_titles' => ['Principal', 'Senior Teacher', 'Teacher', 'Administrator', 'Coach'],
            ]
        );

        $this->createTestCompany(
            'QuickMart Grocers',
            'ops@quickmart.com',
            'platinum',
            80,
            true,
            $this->supermarketCatalog,
            ['Westlands Branch', 'Karen Branch', 'Kilimani Branch', 'Mombasa Rd Branch'],
            [
                'city' => 'Nairobi',
                'industry' => 'Supermarket',
                'department_names' => ['Procurement', 'Sales & Cashiers', 'Inventory Management', 'Logistics'],
                'job_titles' => ['Branch Manager', 'Cashier', 'Stock Clerk', 'Procurement Officer'],
            ]
        );

        $this->createTestCompany(
            'City General Hospital',
            'admin@cityhospital.com',
            'platinum',
            100,
            true,
            $this->hospitalCatalog,
            ['Main Wing', 'Maternity Wing', 'Outpatient Clinic'],
            [
                'city' => 'Kisumu',
                'industry' => 'Hospital',
                'department_names' => ['Medical', 'Nursing', 'Diagnostics', 'Administration'],
                'job_titles' => ['Chief Medical Officer', 'Surgeon', 'Nurse', 'Lab Technician', 'Administrator'],
            ]
        );

        $this->createTestCompany(
            'GlobalTech Solutions',
            'tech@global.com',
            'basic',
            10,
            true,
            $this->techCatalog,
            ['Innovation Hub'],
            [
                'city' => 'Nairobi',
                'industry' => 'Technology',
                'department_names' => ['Software Development', 'IT Infrastructure', 'Sales & Marketing'],
            ]
        );

        $this->createTestCompany(
            'BuildRight Construction',
            'info@buildright.co.ke',
            'platinum',
            30,
            true,
            $this->constructionCatalog,
            ['Head Office', 'Site A - Residential', 'Site B - Commercial'],
            [
                'city' => 'Mombasa',
                'industry' => 'Construction',
                'department_names' => ['Project Management', 'Engineering', 'Procurement', 'Site Operations'],
                'job_titles' => ['Project Manager', 'Civil Engineer', 'Site Foreman', 'Quantity Surveyor'],
            ]
        );

        $this->createTestCompany(
            'Savory Bites Group',
            'contact@savorybites.com',
            'platinum',
            25,
            true,
            $this->restaurantCatalog,
            ['Downtown Branch', 'Mall Branch'],
            [
                'city' => 'Nairobi',
                'industry' => 'Restaurant',
                'department_names' => ['Kitchen', 'Service', 'Management'],
                'job_titles' => ['Head Chef', 'Sous Chef', 'Restaurant Manager', 'Waiter/Waitress'],
            ]
        );

        $this->createTestCompany(
            'SwiftCargo Logistics',
            'ops@swiftcargo.com',
            'platinum',
            40,
            true,
            $this->logisticsCatalog,
            ['Nairobi Warehouse', 'Mombasa Port Office', 'Eldoret Depot'],
            [
                'city' => 'Nairobi',
                'industry' => 'Logistics',
                'department_names' => ['Operations', 'Fleet Management', 'Warehousing', 'Customer Service'],
                'job_titles' => ['Operations Manager', 'Fleet Supervisor', 'Warehouse Manager', 'Logistics Coordinator'],
            ]
        );

        $this->createTestCompany(
            'Prime Properties Ltd',
            'info@primeproperties.com',
            'silver',
            12,
            true,
            $this->realEstateCatalog,
            ['Head Office - Westlands'],
            [
                'city' => 'Nairobi',
                'industry' => 'RealEstate',
                'department_names' => ['Sales & Lettings', 'Property Management', 'Valuation', 'Marketing'],
                'job_titles' => ['Real Estate Agent', 'Property Manager', 'Valuer', 'Marketing Executive'],
            ]
        );

        $this->createTestCompany(
            'GreenHarvest Exports',
            'info@greenharvest.co.ke',
            'platinum',
            35,
            true,
            $this->agricultureCatalog,
            ['Main Farm & Processing - Kiambu', 'Packhouse - Naivasha'],
            [
                'city' => 'Kiambu',
                'industry' => 'Agriculture',
                'department_names' => ['Farming Operations', 'Processing & Quality Control', 'Export Sales', 'Logistics'],
                'job_titles' => ['Farm Manager', 'Agronomist', 'Quality Control Officer', 'Export Manager'],
            ]
        );

        $this->verifyCompaniesHaveSubscriptions();
    }

    protected function resolveSubscriptionPlan(string $requestedSlug, int $staffCount): SubscriptionPlan
    {
        /*
        |--------------------------------------------------------------------------
        | Current LigcoSync plan rules
        |--------------------------------------------------------------------------
        |
        | basic    => up to 10 employees
        | silver   => up to 20 employees
        | platinum => unlimited employees
        |
        | Old slugs are mapped safely:
        | free => basic
        | pro  => platinum
        |
        */

        $normalizedSlug = match ($requestedSlug) {
            'free' => 'basic',
            'pro' => 'platinum',
            default => $requestedSlug,
        };

        $correctSlug = match (true) {
            $staffCount <= 10 => 'basic',
            $staffCount <= 20 => 'silver',
            default => 'platinum',
        };

        $slug = $normalizedSlug;

        if ($normalizedSlug === 'basic' && $staffCount > 10) {
            $slug = $correctSlug;
        }

        if ($normalizedSlug === 'silver' && $staffCount > 20) {
            $slug = $correctSlug;
        }

        if (!in_array($slug, ['basic', 'silver', 'platinum'], true)) {
            $slug = $correctSlug;
        }

        return SubscriptionPlan::where('slug', $slug)->firstOrFail();
    }

    protected function verifyCompaniesHaveSubscriptions(): void
    {
        $missing = Company::whereNull('subscription_plan_id')->count();

        if ($missing > 0) {
            throw new RuntimeException("{$missing} companies do not have a subscription plan.");
        }

        echo "\n✅ All companies have subscription plans.\n";
    }

    protected function createTestCompany(
        string $name,
        string $email,
        string $planSlug,
        int $staffCount,
        bool $isActive,
        array $productCatalog,
        array $locationNames,
        array $details = []
    ): Company {
        $industry = $details['industry'] ?? 'Generic';

        echo "\n=================================================\n";
        echo "Creating Company: {$name} (Industry: {$industry})\n";

        $plan = $this->resolveSubscriptionPlan($planSlug, $staffCount);

        $owner = User::factory()->create([
            'name' => $name . ' Owner',
            'email' => $email,
            'password' => bcrypt('password'),
            'company_id' => null,
            'company_role' => 'OWNER',
        ]);

        $owner->assignRole('OWNER');

        $company = Company::factory()->create([
            'name' => $name,
            'domain' => Str::slug($name) . '.com',
            'owner_user_id' => $owner->id,
            'subscription_plan_id' => $plan->id,
            'is_active' => $isActive,
            'city' => $details['city'] ?? null,
            'industry' => $details['industry'] ?? null,
        ]);

        $owner->update([
            'company_id' => $company->id,
        ]);

        echo "   -> Owner: {$email}\n";
        echo "   -> Subscription Plan: {$plan->name} ({$plan->slug})\n";

        $this->call(
            [
                CompanyDefaultAccountsSeeder::class,
                AllowancesSeeder::class,
                JobTitleSeeder::class,
                LoanSeeder::class,
                LeaveTypeSeeder::class,
            ],
            false,
            ['company' => $company]
        );

        if (isset($details['department_names'])) {
            foreach ($details['department_names'] as $deptName) {
                Department::firstOrCreate([
                    'company_id' => $company->id,
                    'name' => $deptName,
                ]);
            }
        } else {
            $this->call(DepartmentSeeder::class, false, ['company' => $company]);
        }

        if (isset($details['job_titles'])) {
            foreach ($details['job_titles'] as $titleName) {
                JobTitle::firstOrCreate([
                    'company_id' => $company->id,
                    'name' => $titleName,
                ]);
            }
        } else {
            $this->call(JobTitleSeeder::class, false, ['company' => $company]);
        }

        $staff = User::factory($staffCount)
            ->for($company)
            ->create([
                'company_role' => 'EMPLOYEE',
                'password' => bcrypt('staffpass'),
            ]);

        foreach ($staff as $employee) {
            $employee->assignRole('USER');
        }

        echo "   -> Staff created: {$staffCount}\n";

        $departments = Department::where('company_id', $company->id)->get();
        $jobTitles = JobTitle::where('company_id', $company->id)->get();

        if ($departments->isNotEmpty() && $jobTitles->isNotEmpty()) {
            EmployeeProfile::factory()
                ->for($owner)
                ->create([
                    'department_id' => $departments->first()->id,
                    'job_title_id' => $jobTitles->first()->id,
                ]);

            $staff->each(function (User $user) use ($departments, $jobTitles) {
                EmployeeProfile::factory()
                    ->for($user)
                    ->create([
                        'department_id' => $departments->random()->id,
                        'job_title_id' => $jobTitles->random()->id,
                    ]);
            });
        }

        $this->call(JobOpeningSeeder::class, false, [
            'company' => $company,
        ]);

        $this->call(ApplicantSeeder::class, false, [
            'company' => $company,
        ]);

        $this->call(LeaveSeeder::class, false, [
            'company' => $company,
        ]);

        $baseScale = ceil($staffCount / 10);

        $customerCount = match ($industry) {
            'Supermarket', 'Hospital' => 40 * $baseScale,
            'School' => 100,
            default => 10 * $baseScale,
        };

        $supplierCount = match ($industry) {
            'Supermarket', 'Hospital', 'Construction', 'Manufacturing' => 15 * $baseScale,
            default => 5 * $baseScale,
        };

        $customers = Customer::factory($customerCount)->for($company)->create();
        $suppliers = Supplier::factory($supplierCount)->for($company)->create();
        $categories = Category::factory(rand(3, 8))->for($company)->create();

        $locations = collect();

        foreach ($locationNames as $locName) {
            $locations->push(Location::create([
                'company_id' => $company->id,
                'name' => $locName,
                'address' => $this->faker->address,
                'city' => $details['city'] ?? 'Nairobi',
                'country' => 'Kenya',
                'is_active' => true,
            ]));
        }

        echo "   -> Locations created: " . implode(', ', $locationNames) . "\n";

        $products = collect();

        foreach ($productCatalog as $itemData) {
            [$itemName, $isService, $minPrice, $maxPrice] = $itemData;

            $product = Product::create([
                'company_id' => $company->id,
                'category_id' => $categories->random()->id,
                'name' => $itemName,
                'sku' => strtoupper(Str::random(8)),
                'description' => "Standard {$itemName} specification.",
                'unit_price' => rand($minPrice * 100, $maxPrice * 100) / 100,
                'is_service' => $isService,
                'costing_method' => 'WAC',
            ]);

            $products->push($product);
        }

        echo "   -> Catalog created: " . $products->count() . " items.\n";

        $inventoryAccount = ChartOfAccount::where('company_id', $company->id)
            ->where('account_name', 'Inventory')
            ->first();

        $equityAccount = ChartOfAccount::where('company_id', $company->id)
            ->where(function ($q) {
                $q->where('account_name', 'Opening Balance Equity')
                    ->orWhere('account_name', 'Owner’s Equity')
                    ->orWhere('account_name', "Owner's Equity");
            })
            ->first()
            ?? ChartOfAccount::where('company_id', $company->id)->first();

        foreach ($products->where('is_service', false) as $product) {
            $baseQty = match ($industry) {
                'Supermarket', 'Manufacturing' => rand(1000, 5000),
                'Construction', 'Agriculture' => rand(500, 2000),
                default => rand(50, 500),
            };

            $unitCost = round($product->unit_price * rand(60, 85) / 100, 2);
            $totalValue = 0;

            foreach ($locations as $index => $location) {
                $qty = $index === 0
                    ? $baseQty
                    : rand(round($baseQty * 0.1), round($baseQty * 0.4));

                if ($qty <= 0) {
                    continue;
                }

                InventorySummary::create([
                    'company_id' => $company->id,
                    'product_id' => $product->id,
                    'location_id' => $location->id,
                    'quantity_on_hand' => $qty,
                ]);

                StockMovement::create([
                    'company_id' => $company->id,
                    'user_id' => $owner->id,
                    'product_id' => $product->id,
                    'location_id' => $location->id,
                    'quantity' => $qty,
                    'unit_cost' => $unitCost,
                    'movement_type' => 'INITIAL',
                    'description' => "Initial stock at {$location->name}",
                ]);

                $totalValue += $qty * $unitCost;
            }

            $totalValue = round($totalValue, 2);

            if ($totalValue > 0 && $inventoryAccount && $equityAccount) {
                $je = $this->createPostedJournalEntry([
                    'company_id' => $company->id,
                    'transaction_date' => now()->subMonths(12)->startOfMonth(),
                    'description' => "Opening Inventory: {$product->name}",
                    'total' => $totalValue,
                    'referenceable_id' => $product->id,
                    'referenceable_type' => Product::class,
                ], $owner->id);

                $je->lines()->createMany([
                    [
                        'chart_of_account_id' => $inventoryAccount->id,
                        'debit' => $totalValue,
                        'credit' => 0,
                    ],
                    [
                        'chart_of_account_id' => $equityAccount->id,
                        'debit' => 0,
                        'credit' => $totalValue,
                    ],
                ]);

                $product->update([
                    'current_avg_cost' => $unitCost,
                ]);
            }
        }

        echo "   -> Opening stock and financials established.\n";

        $accounts = ChartOfAccount::where('company_id', $company->id)
            ->get()
            ->keyBy('account_name');

        $txMultiplier = match ($industry) {
            'Supermarket' => 8,
            'Hospital', 'School', 'Restaurant' => 4,
            'Construction', 'Manufacturing', 'Logistics' => 2,
            default => 1,
        };

        for ($i = 12; $i >= 1; $i--) {
            $currentMonthEnd = now()->subMonths($i)->endOfMonth();

            $sales = SalesOrder::factory(rand(5, 15) * $txMultiplier)
                ->for($company)
                ->has(
                    SalesOrderItem::factory()
                        ->count(rand(1, 8))
                        ->state(function () use ($company, $products, $locations) {
                            $product = $products->random();

                            $locationId = !$product->is_service
                                ? $locations->random()->id
                                : ($locations->isNotEmpty() && rand(0, 1) ? $locations->random()->id : null);

                            return [
                                'product_id' => $product->id,
                                'company_id' => $company->id,
                                'location_id' => $locationId,
                                'quantity' => rand(1, 8),
                                'unit_price' => $product->unit_price,
                            ];
                        }),
                    'items'
                )
                ->create([
                    'order_date' => $currentMonthEnd->copy()->subDays(rand(1, 28)),
                    'customer_id' => $customers->random()->id,
                    'user_id' => $staff->random()->id,
                ]);

            $sales->each(function (SalesOrder $sale) {
                $this->prepareOrderForReporting($sale, 'sales_orders', 'sales', 'items');
            });

            $goods = $products->where('is_service', false);

            if ($goods->isNotEmpty()) {
                $purchases = PurchaseOrder::factory(rand(3, 8) * $txMultiplier)
                    ->for($company)
                    ->has(
                        PurchaseOrderItem::factory()
                            ->count(rand(2, 10))
                            ->state(function () use ($company, $goods, $locations) {
                                $product = $goods->random();

                                return [
                                    'product_id' => $product->id,
                                    'company_id' => $company->id,
                                    'location_id' => $locations->random()->id,
                                    'quantity' => rand(5, 60),
                                    'unit_cost' => round(($product->current_avg_cost ?: $product->unit_price * 0.7), 2),
                                ];
                            }),
                        'items'
                    )
                    ->create([
                        'order_date' => $currentMonthEnd->copy()->subDays(rand(1, 28)),
                        'supplier_id' => $suppliers->random()->id,
                        'user_id' => $staff->random()->id,
                    ]);

                $purchases->each(function (PurchaseOrder $purchase) {
                    $this->prepareOrderForReporting($purchase, 'purchase_orders', 'purchase', 'items');
                });
            }

            $this->call(PayslipSeeder::class, false, [
                'company' => $company,
                'month' => $currentMonthEnd,
            ]);
        }

        echo "   -> Historical transactions generated (12 Months).\n";

        $this->generateFinancialsFromOrders($company, $accounts);

        $company->update([
            'payroll_last_closed_month' => now()->subMonth()->endOfMonth(),
        ]);

        echo "   -> Seeding dashboard, payments, bills, expenses...\n";

        $this->call(DashboardDataSeeder::class, false, ['company' => $company]);
        $this->call(CustomerPaymentSeeder::class, false, ['company' => $company]);
        $this->call(ExpenseSeeder::class, false, ['company' => $company]);
        $this->call(SupplierBillSeeder::class, false, ['company' => $company]);

        echo "Done with {$name}.\n";

        return $company;
    }

    protected function createPostedJournalEntry(array $attributes, ?int $postedBy = null): JournalEntry
    {
        $entry = JournalEntry::create($attributes);

        $updates = [];

        if (Schema::hasColumn('journal_entries', 'status')) {
            $updates['status'] = 'posted';
        }

        if (Schema::hasColumn('journal_entries', 'posted_at')) {
            $updates['posted_at'] = now();
        }

        if ($postedBy && Schema::hasColumn('journal_entries', 'posted_by')) {
            $updates['posted_by'] = $postedBy;
        }

        if ($updates) {
            $entry->forceFill($updates)->save();
        }

        return $entry;
    }

    protected function calculateOrderItemsTotal(Model $order, string $relation = 'items'): float
    {
        $order->loadMissing($relation);

        return round(
            $order->{$relation}->sum(function ($item) {
                $quantity = (float) ($item->quantity ?? 1);

                $lineTotal = $item->total_amount
                    ?? $item->line_total
                    ?? $item->subtotal
                    ?? null;

                if ($lineTotal !== null && (float) $lineTotal > 0) {
                    return (float) $lineTotal;
                }

                $unitAmount = $item->unit_price
                    ?? $item->unit_cost
                    ?? $item->price
                    ?? $item->cost
                    ?? 0;

                return $quantity * (float) $unitAmount;
            }),
            2
        );
    }

    protected function syncOrderTotal(Model $order, string $table, string $relation = 'items'): Model
    {
        if (!Schema::hasColumn($table, 'total_amount')) {
            return $order;
        }

        $calculatedTotal = $this->calculateOrderItemsTotal($order, $relation);

        if ($calculatedTotal > 0) {
            $order->forceFill([
                'total_amount' => $calculatedTotal,
            ])->save();
        }

        return $order->refresh();
    }

    protected function applyOrderPaymentState(Model $order, string $table, string $type = 'sales'): Model
    {
        $updates = [];

        $totalAmount = round((float) ($order->total_amount ?? 0), 2);

        if ($totalAmount <= 0) {
            return $order;
        }

        $roll = rand(1, 100);

        if ($roll <= 50) {
            $paymentState = 'paid';
            $amountPaid = $totalAmount;
        } elseif ($roll <= 78) {
            $paymentState = 'partial';
            $amountPaid = round($totalAmount * (rand(20, 80) / 100), 2);
        } else {
            $paymentState = 'unpaid';
            $amountPaid = 0;
        }

        if (Schema::hasColumn($table, 'amount_paid')) {
            $updates['amount_paid'] = $amountPaid;
        }

        if (Schema::hasColumn($table, 'status')) {
            $allowedStatuses = $this->getEnumValues($table, 'status');
            $statusMap = $this->statusMapForTable($table, $allowedStatuses);
            $desiredStatus = $statusMap[$paymentState] ?? null;

            if ($desiredStatus) {
                $updates['status'] = $desiredStatus;
            }
        }

        if ($amountPaid >= $totalAmount && Schema::hasColumn($table, 'paid_at')) {
            $updates['paid_at'] = now()->subDays(rand(1, 90));
        }

        if ($updates) {
            $order->forceFill($updates)->save();
        }

        return $order->refresh();
    }

    protected function getEnumValues(string $table, string $column): array
    {
        try {
            $database = DB::getDatabaseName();

            $row = DB::selectOne(
                "
                SELECT COLUMN_TYPE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = ?
                  AND TABLE_NAME = ?
                  AND COLUMN_NAME = ?
                ",
                [$database, $table, $column]
            );

            if (!$row || !isset($row->COLUMN_TYPE)) {
                return [];
            }

            $columnType = $row->COLUMN_TYPE;

            if (!str_starts_with(strtolower($columnType), 'enum(')) {
                return [];
            }

            preg_match_all("/'([^']*)'/", $columnType, $matches);

            return $matches[1] ?? [];
        } catch (\Throwable $e) {
            return [];
        }
    }

    protected function statusMapForTable(string $table, array $allowedStatuses = []): array
    {
        $allowed = collect($allowedStatuses)
            ->mapWithKeys(fn ($status) => [strtolower($status) => $status]);

        $pick = function (array $candidates, string $fallback) use ($allowed) {
            foreach ($candidates as $candidate) {
                $key = strtolower($candidate);

                if ($allowed->has($key)) {
                    return $allowed->get($key);
                }
            }

            return $allowed->isNotEmpty()
                ? $allowed->first()
                : $fallback;
        };

        if ($table === 'purchase_orders') {
            return [
                'paid' => $pick(['paid', 'completed', 'received', 'approved'], 'received'),
                'partial' => $pick(['partial', 'partially_paid', 'approved', 'received', 'pending'], 'approved'),
                'unpaid' => $pick(['pending', 'approved', 'draft'], 'pending'),
            ];
        }

        return [
            'paid' => $pick(['paid', 'completed', 'approved'], 'completed'),
            'partial' => $pick(['partial', 'partially_paid', 'approved', 'pending'], 'approved'),
            'unpaid' => $pick(['pending', 'draft', 'approved'], 'pending'),
        ];
    }

    protected function prepareOrderForReporting(
        Model $order,
        string $table,
        string $type = 'sales',
        string $relation = 'items'
    ): Model {
        $order = $this->syncOrderTotal($order, $table, $relation);

        return $this->applyOrderPaymentState($order, $table, $type);
    }

    protected function generateFinancialsFromOrders(Company $company, $accounts): void
    {
        $inventoryAccount = $accounts['Inventory'] ?? null;
        $cogsAccount = $accounts['Cost of Goods Sold'] ?? null;
        $arAccount = $accounts['Accounts Receivable'] ?? $accounts->first();
        $revenueAccount = $accounts['Sales Revenue'] ?? $accounts->last();
        $apAccount = $accounts['Accounts Payable'] ?? $accounts->last();

        SalesOrder::where('company_id', $company->id)
            ->with('items.product')
            ->each(function (SalesOrder $sale) use (
                $company,
                $arAccount,
                $revenueAccount,
                $inventoryAccount,
                $cogsAccount
            ) {
                $sale = $this->prepareOrderForReporting($sale, 'sales_orders', 'sales', 'items');

                $totalAmount = round((float) ($sale->total_amount ?? 0), 2);

                if ($totalAmount <= 0 || !$arAccount || !$revenueAccount) {
                    return;
                }

                $entry = $this->createPostedJournalEntry([
                    'company_id' => $company->id,
                    'transaction_date' => $sale->order_date,
                    'description' => "Sale #{$sale->order_number}",
                    'referenceable_id' => $sale->id,
                    'referenceable_type' => SalesOrder::class,
                    'total' => $totalAmount,
                ], $sale->user_id);

                $entry->lines()->createMany([
                    [
                        'chart_of_account_id' => $arAccount->id,
                        'debit' => $totalAmount,
                        'credit' => 0,
                    ],
                    [
                        'chart_of_account_id' => $revenueAccount->id,
                        'debit' => 0,
                        'credit' => $totalAmount,
                    ],
                ]);

                if (!$inventoryAccount || !$cogsAccount) {
                    return;
                }

                $totalCogs = 0;

                foreach ($sale->items as $item) {
                    if (!$item->product || $item->product->is_service) {
                        continue;
                    }

                    $quantity = (float) ($item->quantity ?? 1);
                    $unitCost = (float) ($item->product->current_avg_cost ?? ($item->unit_price * 0.7));

                    $totalCogs += $quantity * $unitCost;
                }

                $totalCogs = round($totalCogs, 2);

                if ($totalCogs <= 0) {
                    return;
                }

                $cogsEntry = $this->createPostedJournalEntry([
                    'company_id' => $company->id,
                    'transaction_date' => $sale->order_date,
                    'description' => "COGS for Sale #{$sale->order_number}",
                    'referenceable_id' => $sale->id,
                    'referenceable_type' => SalesOrder::class,
                    'total' => $totalCogs,
                ], $sale->user_id);

                $cogsEntry->lines()->createMany([
                    [
                        'chart_of_account_id' => $cogsAccount->id,
                        'debit' => $totalCogs,
                        'credit' => 0,
                    ],
                    [
                        'chart_of_account_id' => $inventoryAccount->id,
                        'debit' => 0,
                        'credit' => $totalCogs,
                    ],
                ]);
            });

        PurchaseOrder::where('company_id', $company->id)
            ->with('items.product')
            ->each(function (PurchaseOrder $purchase) use (
                $company,
                $inventoryAccount,
                $apAccount
            ) {
                $purchase = $this->prepareOrderForReporting($purchase, 'purchase_orders', 'purchase', 'items');

                $totalAmount = round((float) ($purchase->total_amount ?? 0), 2);

                if ($totalAmount <= 0 || !$inventoryAccount || !$apAccount) {
                    return;
                }

                $entry = $this->createPostedJournalEntry([
                    'company_id' => $company->id,
                    'transaction_date' => $purchase->order_date,
                    'description' => "Purchase #{$purchase->po_number}",
                    'referenceable_id' => $purchase->id,
                    'referenceable_type' => PurchaseOrder::class,
                    'total' => $totalAmount,
                ], $purchase->user_id);

                $entry->lines()->createMany([
                    [
                        'chart_of_account_id' => $inventoryAccount->id,
                        'debit' => $totalAmount,
                        'credit' => 0,
                    ],
                    [
                        'chart_of_account_id' => $apAccount->id,
                        'debit' => 0,
                        'credit' => $totalAmount,
                    ],
                ]);
            });
    }
}
