<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Accounts\CustomerPayment;
use App\Models\Accounts\Invoice;
use App\Models\Accounts\ChartOfAccount;
use App\Models\Company; // 💡 1. Make sure Company is imported
use App\Models\CRM\Customer; // 💡 Added Customer import
use App\Models\User;
use App\Services\JournalEntryService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class CustomerPaymentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    // 💡 2. Add (Company $company) to the method signature
    public function run(Company $company): void
    {
        // 💡 3. REMOVE this line:
        // $company = $this->command->getLaravel()->make('company');

        if (!$company) {
            Log::error("❌ CustomerPaymentSeeder: No company provided.");
            return;
        }

        $journalEntryService = app(JournalEntryService::class);
        $companyId = $company->id;

        DB::beginTransaction();
        try {
            $user = User::where('company_id', $companyId)->first();
            if (!$user) {
                Log::warning("No user found for company_id {$companyId}. CustomerPaymentSeeder aborted.");
                return;
            }

            // ... (rest of the seeder is correct)
            $bankAccount = ChartOfAccount::where('company_id', $companyId)
                ->where('account_name', 'like', '%Bank%')
                ->first();

            $accountsReceivable = ChartOfAccount::where('company_id', $companyId)
                ->where('account_name', 'like', '%Accounts Receivable%')
                ->first();

            if (!$bankAccount || !$accountsReceivable) {
                Log::warning("Required accounts (Bank / Accounts Receivable) missing for company_id {$companyId}");
                return;
            }

            $invoices = Invoice::where('company_id', $companyId)->take(3)->get();
            $customer = Customer::where('company_id', $companyId)->first();

            if ($invoices->isEmpty()) {
                Log::info("No invoices found to seed payments for company_id {$companyId}");

                if (!$customer) {
                     Log::warning("No customer found for dummy payment for company_id {$companyId}");
                     return;
                }

                $payment = CustomerPayment::create([
                    'customer_id' => $customer->id,
                    'invoice_id'  => null,
                    'payment_date'=> Carbon::now()->subDays(3),
                    'method'      => 'Bank Transfer',
                    'reference'   => 'SEED-1001',
                    'amount'      => 50000,
                    'notes'       => 'Seeded on-account payment',
                    'created_by' => $user->id,
                ]);

                $lines = [
                    ['account_id' => $bankAccount->id, 'debit' => $payment->amount, 'credit' => 0],
                    ['account_id' => $accountsReceivable->id, 'debit' => 0, 'credit' => $payment->amount],
                ];
                $description = "Seeded Customer Payment {$payment->reference} (On-Account)";

                $journalEntryService->createJournalEntry(
                    $payment->payment_date, $description, 'Seeder: Customer Payment', $lines, null
                );

            } else {
                foreach ($invoices as $index => $invoice) {
                     $amount = $index == 2 ? $invoice->total / 2 : $invoice->total;
                     $payment = CustomerPayment::create([
                        'customer_id' => $invoice->customer_id,
                        'invoice_id'  => $invoice->id,
                        'payment_date'=> Carbon::now()->subDays(3 - $index),
                        'method'      => $index % 2 == 0 ? 'Bank Transfer' : 'Cash',
                        'reference'   => 'SEED-100' . $index,
                        'amount'      => $amount,
                        'notes'       => 'Payment for invoice #' . $invoice->invoice_number,
                        'created_by' => $user->id,
                    ]);

                    $invoice->balance_due = max($invoice->balance_due - $payment->amount, 0);
                    if ($invoice->balance_due <= 0) {
                        $invoice->status = 'Paid';
                    } else {
                        $invoice->status = 'Partially Paid';
                    }
                    $invoice->save();

                    $lines = [
                        ['account_id' => $bankAccount->id, 'debit' => $payment->amount, 'credit' => 0],
                        ['account_id' => $accountsReceivable->id, 'debit' => 0, 'credit' => $payment->amount],
                    ];
                    $description = "Seeded Customer Payment {$payment->reference} for invoice #" . $invoice->invoice_number;
                    $journalEntryService->createJournalEntry(
                        $payment->payment_date, $description, 'Seeder: Customer Payment', $lines, $invoice
                    );
                }
            }

            DB::commit();
            Log::info("✅ CustomerPaymentSeeder: Successfully seeded for company {$companyId}.");

        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error("❌ CustomerPaymentSeeder failed for company {$companyId}: " . $e->getMessage());
        }
    }
}
