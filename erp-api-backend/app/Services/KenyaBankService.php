<?php

namespace App\Services;

use App\Models\Accounts\BankStatementLine;
use App\Models\Accounts\ChartOfAccount;
use App\Services\Banking\Contracts\BankIntegrationInterface;
use App\Services\Banking\Adapters\MpesaAdapter;
use App\Services\Banking\Adapters\GenericBankAdapter;
use Illuminate\Support\Facades\Log;
use League\Csv\Reader;
use League\Csv\Statement;
use Carbon\Carbon;
use Exception;

class KenyaBankService
{
    /**
     * Factory method to get the correct bank API adapter.
     */
    protected function getAdapter(string $provider): BankIntegrationInterface
    {
        return match (strtolower($provider)) {
            'mpesa'  => new MpesaAdapter(),
            'kcb'    => new GenericBankAdapter('https://buni.kcbgroup.com'), // Example URL
            'equity' => new GenericBankAdapter('https://api.equitybankgroup.com'), // Example URL
            default  => throw new Exception("Unsupported bank provider: {$provider}"),
        };
    }

    /**
     * ===================================================================
     * METHOD 1: AUTOMATIC API SYNC
     * Connects to the bank via Adapter and pulls latest transactions.
     * ===================================================================
     */
    public function syncAccountTransactions(int $chartOfAccountId): array
    {
        Log::info("KenyaBankService: Starting API sync for Account ID: {$chartOfAccountId}");

        $account = ChartOfAccount::findOrFail($chartOfAccountId);

        // 1. Validate Configuration
        if (!$account->bank_provider || empty($account->bank_credentials)) {
            throw new Exception("Account '{$account->account_name}' is not configured for API integration. Please update account settings.");
        }

        // 2. Determine Start Date (Avoid duplicates)
        $lastSync = BankStatementLine::where('chart_of_account_id', $account->id)
            ->latest('transaction_date')
            ->first();

        // Fetch since last sync, or default to 30 days ago
        $startDate = $lastSync ? $lastSync->transaction_date->addSecond() : now()->subDays(30);

        // 3. Instantiate Adapter & Authenticate
        try {
            $adapter = $this->getAdapter($account->bank_provider);
            $adapter->authenticate($account->bank_credentials); // Credentials auto-decrypted by model cast
        } catch (Exception $e) {
            Log::error("Bank Auth Failed: " . $e->getMessage());
            throw new Exception("Authentication failed with {$account->bank_provider}: " . $e->getMessage());
        }

        // 4. Fetch Transactions
        $newTransactions = $adapter->fetchTransactions($account, $startDate);

        if (empty($newTransactions)) {
            return ['status' => 'success', 'count' => 0, 'message' => 'No new transactions found.'];
        }

        // 5. Save to Database
        $savedCount = $this->saveTransactions($newTransactions, $account->company_id, $account->id);

        Log::info("Successfully synced {$savedCount} transactions for Account ID: {$chartOfAccountId}");

        return [
            'status' => 'success',
            'count' => $savedCount,
            'message' => "Successfully synced {$savedCount} new transactions."
        ];
    }

    /**
     * ===================================================================
     * METHOD 2: MANUAL FILE IMPORT
     * Parses CSV/PDF and saves to database.
     * ===================================================================
     */
    public function importFromFile($file, $companyId, $accountId)
    {
        $ext = $file->getClientOriginalExtension();

        if ($ext === 'csv' || $ext === 'txt') {
            return $this->parseCsv($file, $companyId, $accountId);
        }

        // Add PDF parser logic here if needed using spatie/pdf-to-text
        if ($ext === 'pdf') {
             return ['status' => 'error', 'message' => 'PDF parsing is not yet enabled. Please convert to CSV.'];
        }

        return ['status' => 'error', 'message' => 'Unsupported file type. Please upload a CSV file.'];
    }

    private function parseCsv($file, $companyId, $accountId)
    {
        $csv = Reader::createFromPath($file->getPathname(), 'r');
        $csv->setHeaderOffset(0); // Assumes header is row 0

        // 💡 Adjust these keys to match your actual bank CSV headers
        $headerMap = [
            'date' => 'Date',
            'description' => 'Description',
            'debit' => 'Debit',
            'credit' => 'Credit',
            'ref' => 'Reference' // Optional
        ];

        $records = Statement::create()->process($csv);
        $transactions = [];

        foreach ($records as $record) {
            // Skip invalid rows
            if (empty($record[$headerMap['description']])) continue;

            $transactions[] = [
                'transaction_date' => Carbon::parse($record[$headerMap['date']])->toDateTimeString(),
                'description'      => $record[$headerMap['description']],
                'debit'            => $this->cleanCurrency($record[$headerMap['debit']] ?? 0),
                'credit'           => $this->cleanCurrency($record[$headerMap['credit']] ?? 0),
                'reference'        => $record[$headerMap['ref']] ?? null,
            ];
        }

        $count = $this->saveTransactions($transactions, $companyId, $accountId);

        return ['status' => 'success', 'count' => $count, 'message' => "Imported {$count} lines successfully."];
    }

    // --- Shared Helpers ---

    private function saveTransactions(array $transactions, int $companyId, int $accountId): int
    {
        $now = now();
        $dataToInsert = [];

        foreach ($transactions as $tx) {
            $dataToInsert[] = [
                'company_id' => $companyId,
                'chart_of_account_id' => $accountId,
                'transaction_date' => $tx['transaction_date'],
                'description' => $tx['description'],
                'debit' => $tx['debit'],
                'credit' => $tx['credit'],
                'reference' => $tx['reference'] ?? null,
                'is_matched' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        if (!empty($dataToInsert)) {
            BankStatementLine::insert($dataToInsert);
        }

        return count($dataToInsert);
    }

    private function cleanCurrency($value): float
    {
        if (empty($value)) return 0.00;
        $cleaned = preg_replace('/[^\d\.-]/', '', $value);
        return (float) $cleaned;
    }
}
