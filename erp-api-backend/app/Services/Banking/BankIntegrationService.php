<?php

namespace App\Services\Banking;

use App\Models\Accounts\BankStatementLine;
use App\Models\Accounts\ChartOfAccount;
use App\Services\Banking\Adapters\MpesaAdapter;
use App\Services\Banking\Adapters\GenericBankAdapter;
use Exception;

class BankIntegrationService
{
    public function syncAccount(ChartOfAccount $account)
    {
        if (!$account->bank_provider || empty($account->bank_credentials)) {
            throw new Exception("API integration not configured for this account.");
        }

        // 1. Select Adapter
        $adapter = match ($account->bank_provider) {
            'mpesa' => new MpesaAdapter(),
            'kcb' => new GenericBankAdapter('https://api.kcbgroup.com/v1'),
            'equity' => new GenericBankAdapter('https://api.equitybank.com/v2'),
            default => throw new Exception("Unsupported provider: {$account->bank_provider}"),
        };

        // 2. Authenticate
        $adapter->authenticate($account->bank_credentials);

        // 3. Fetch Data (Last 30 days or since last sync)
        $lastSync = BankStatementLine::where('chart_of_account_id', $account->id)
            ->latest('transaction_date')
            ->first();

        $startDate = $lastSync ? $lastSync->transaction_date->addDay() : now()->subDays(30);
        $transactions = $adapter->getStatement($startDate, now());

        // 4. Save to Database
        $count = 0;
        foreach ($transactions as $tx) {
            BankStatementLine::create([
                'company_id' => $account->company_id,
                'chart_of_account_id' => $account->id,
                'transaction_date' => $tx['date'],
                'description' => $tx['description'],
                'debit' => $tx['debit'],
                'credit' => $tx['credit'],
                'is_matched' => false,
            ]);
            $count++;
        }

        return $count;
    }
}
