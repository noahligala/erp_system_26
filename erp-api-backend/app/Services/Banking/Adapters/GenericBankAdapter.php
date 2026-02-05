<?php

namespace App\Services\Banking\Adapters;

use App\Services\Banking\Contracts\BankIntegrationInterface;
use App\Models\Accounts\ChartOfAccount;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GenericBankAdapter implements BankIntegrationInterface
{
    protected string $apiBaseUrl;
    protected string $accessToken;

    public function __construct(string $apiBaseUrl)
    {
        $this->apiBaseUrl = $apiBaseUrl;
    }

    public function authenticate(array $credentials): bool
    {
        // Standard OAuth 2.0 Client Credentials Flow
        $response = Http::asForm()->post("{$this->apiBaseUrl}/oauth2/token", [
            'client_id' => $credentials['client_id'],
            'client_secret' => $credentials['client_secret'],
            'grant_type' => 'client_credentials',
        ]);

        if ($response->successful()) {
            $this->accessToken = $response->json()['access_token'];
            return true;
        }

        Log::error("GenericBankAdapter Auth Failed: " . $response->body());
        throw new \Exception("Bank Authentication Failed.");
    }

    public function fetchTransactions(ChartOfAccount $account, Carbon $startDate): array
    {
        // This is a PULL request for a statement
        $response = Http::withToken($this->accessToken)
            ->get("{$this->apiBaseUrl}/v1/accounts/{$account->bank_account_number}/transactions", [
                'from_date' => $startDate->format('Y-m-d'),
                'to_date' => now()->format('Y-m-d'),
            ]);

        if ($response->failed()) {
            Log::error("GenericBankAdapter Fetch Failed: " . $response->body());
            return [];
        }

        // Loop and normalize the response
        $normalized = [];
        foreach ($response->json()['transactions'] as $tx) {
            $normalized[] = $this->normalizeTransaction($tx);
        }
        return $normalized;
    }

    public function normalizeTransaction(array $rawTx): array
    {
        $isDebit = $rawTx['transaction_type'] === 'DEBIT';
        return [
            'transaction_date' => Carbon::parse($rawTx['booking_date'])->toDateTimeString(),
            'description' => $rawTx['narrative'] ?? 'N/A',
            'debit' => $isDebit ? (float)$rawTx['amount'] : 0.00,
            'credit' => !$isDebit ? (float)$rawTx['amount'] : 0.00,
            'reference' => $rawTx['transaction_id'],
        ];
    }
}
