<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Company;
use App\Models\User;
use App\Models\Accounts\ChartOfAccount;
use App\Models\Accounts\SupplierBill;
use App\Models\Accounts\BillPayment;
use App\Models\Supplier;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Throwable;

class SupplierBillSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(Company $company): void
    {
        $companyId = $company->id;
        $user = User::where('company_id', $companyId)->first();

        if (!$user) {
            $this->command->warn("No users found for company {$company->name}, skipping SupplierBillSeeder.");
            return;
        }

        // --- Get necessary relations ---
        $suppliers = Supplier::where('company_id', $companyId)->get();
        if ($suppliers->isEmpty()) {
            $this->command->warn("No suppliers found for company {$company->name}, skipping SupplierBillSeeder.");
            return;
        }

        $expenseAccounts = ChartOfAccount::where('company_id', $companyId)
            ->where('account_type', 'Expense')
            ->get();
        if ($expenseAccounts->isEmpty()) {
            $this->command->warn("No 'Expense' type accounts found for company {$company->name}, skipping SupplierBillSeeder.");
            return;
        }

        $paymentAccount = ChartOfAccount::where('company_id', $companyId)
            ->where('account_type', 'Asset')
            ->where('account_name', 'like', '%Bank%')
            ->first();
        if (!$paymentAccount) {
            $this->command->warn("No 'Bank' account found for company {$company->name}, skipping SupplierBillSeeder payments.");
        }

        $this->command->info("Creating sample supplier bills for: {$company->name}");

        $statuses = ['Posted', 'Posted', 'Posted', 'Posted', 'Partially Paid', 'Paid', 'Draft', 'Overdue'];

        for ($i = 0; $i < 25; $i++) {
            DB::beginTransaction();
            try {
                $supplier = $suppliers->random();
                $billDate = Carbon::now()->subDays(rand(5, 90));
                $dueDate = $billDate->copy()->addDays(rand(15, 45));
                $status = $statuses[array_rand($statuses)];

                // 1. Create Line Items & Calculate Total
                $linesData = [];
                $totalAmount = 0;
                $lineCount = rand(1, 3);

                for ($j = 0; $j < $lineCount; $j++) {
                    $qty = rand(1, 5);
                    $price = rand(1000, 15000);
                    $subtotal = $qty * $price;
                    $totalAmount += $subtotal;
                    $linesData[] = [
                        'chart_of_account_id' => $expenseAccounts->random()->id,
                        'description' => 'Seeded expense line item',
                        'quantity' => $qty,
                        'unit_price' => $price,
                        'subtotal' => $subtotal,
                    ];
                }

                // 2. Determine payment status
                $amountPaid = 0;
                $balanceDue = $totalAmount;

                if ($status === 'Paid') {
                    $amountPaid = $totalAmount;
                    $balanceDue = 0;
                } elseif ($status === 'Partially Paid') {
                    $amountPaid = round($totalAmount / 2, 2);
                    $balanceDue = $totalAmount - $amountPaid;
                } elseif ($status === 'Overdue') {
                     $dueDate = Carbon::now()->subDays(rand(1, 30)); // Force due date to be in the past
                }

                // 3. Create the Bill
                $bill = SupplierBill::create([
                    'company_id' => $companyId,
                    'supplier_id' => $supplier->id,
                    'bill_number' => 'BILL-' . rand(1000, 9999),
                    'bill_date' => $billDate,
                    'due_date' => $dueDate,
                    'amount' => $totalAmount,
                    'amount_paid' => $amountPaid,
                    'balance_due' => $balanceDue,
                    'status' => $status,
                    'notes' => 'Seeded supplier bill',
                ]);

                // 4. Attach Lines
                $bill->lines()->createMany($linesData);

                // 5. Create Payment record if Paid or Partially Paid (and payment account exists)
                if (($status === 'Paid' || $status === 'Partially Paid') && $paymentAccount) {
                    BillPayment::create([
                        'company_id' => $companyId,
                        'supplier_id' => $supplier->id,
                        'supplier_bill_id' => $bill->id,
                        'journal_entry_id' => null, // We are not seeding JEs here for speed
                        'payment_date' => $billDate->copy()->addDays(rand(1, 5)),
                        'amount' => $amountPaid,
                        'payment_method' => 'Bank Transfer',
                        'reference' => 'SEED-PAY-' . rand(100, 999),
                        'created_by' => $user->id,
                    ]);
                }

                DB::commit();
            } catch (Throwable $e) {
                DB::rollBack();
                $this->command->error("Failed to create seeded bill: " . $e->getMessage());
            }
        }

        $this->command->info("✅ Sample supplier bills created for {$company->name}.");
    }
}
