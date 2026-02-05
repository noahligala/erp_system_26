<?php

namespace App\Services\Banking\Adapters;

use App\Services\Banking\Contracts\BankIntegrationInterface;
use App\Services\Banking\Traits\MpesaSecurity;
use App\Models\Accounts\ChartOfAccount;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MpesaAdapter implements BankIntegrationInterface
{
    use MpesaSecurity;

    protected string $baseUrl;
    protected string $environment;
    protected array $credentials;
    protected string $accessToken;

    public function authenticate(array $credentials): bool
    {
        $this->credentials = $credentials;
        $this->environment = $credentials['env'] ?? 'sandbox'; // 'sandbox' or 'production'

        $this->baseUrl = ($this->environment === 'production')
            ? 'https://api.safaricom.co.ke'
            : 'https://sandbox.safaricom.co.ke';

        $response = Http::withBasicAuth($credentials['consumer_key'], $credentials['consumer_secret'])
            ->get("{$this->baseUrl}/oauth/v1/generate?grant_type=client_credentials");

        if ($response->successful()) {
            $this->accessToken = $response->json()['access_token'];
            return true;
        }

        Log::error("M-Pesa Auth Failed: " . $response->body());
        throw new \Exception("Failed to connect to M-Pesa Daraja API.");
    }

    /**
     * M-Pesa doesn't have a "Get Full Statement" API.
     * Instead, we use this to poll for the status of PENDING system transactions.
     */
    public function fetchTransactions(ChartOfAccount $account, Carbon $startDate): array
    {
        Log::info("M-Pesa: Starting Transaction Status Check for account {$account->id}");

        // 1. Get recent PENDING transactions from our database that need verification
        // Note: This assumes you have a way to fetch these.
        // For this example, we return an empty array if no specific ID is provided,
        // or you could implement a loop here to check specific Transaction IDs from your ledger.

        // For a true "Statement Sync", M-Pesa requires you to rely on the C2B Callbacks (IPN).
        // However, we CAN check the ACCOUNT BALANCE to at least reconcile the total.

        $balance = $this->checkAccountBalance($account);

        // If we successfully got a balance, we create a synthetic "Closing Balance" line
        // This allows the reconciliation screen to show the actual M-Pesa balance.
        if ($balance) {
            return [[
                'transaction_date' => now()->toDateTimeString(),
                'description' => 'M-Pesa Closing Balance Check',
                'debit' => 0,
                'credit' => 0,
                'reference' => 'BAL-' . now()->format('dmY-Hi'),
                'balance_check' => $balance // Custom field to help user compare
            ]];
        }

        return [];
    }

    /**
     * Check the actual float balance on the Paybill/Till.
     */
    public function checkAccountBalance(ChartOfAccount $account)
    {
        $securityCredential = $this->generateSecurityCredential($this->credentials['initiator_password']);

        $payload = [
            'Initiator' => $this->credentials['initiator_name'],
            'SecurityCredential' => $securityCredential,
            'CommandID' => 'AccountBalance',
            'PartyA' => $this->credentials['shortcode'],
            'IdentifierType' => '4', // 4 for Shortcode/Organization
            'Remarks' => 'Balance Check',
            'QueueTimeOutURL' => config('app.url') . '/api/mpesa/timeout', // These must be real URLs
            'ResultURL' => config('app.url') . '/api/mpesa/balance-result',
        ];

        $response = Http::withToken($this->accessToken)
            ->post("{$this->baseUrl}/mpesa/accountbalance/v1/query", $payload);

        if ($response->successful()) {
            // M-Pesa Balance is async. The actual balance comes to the ResultURL callback.
            // In a real-time UI, this is tricky.
            // We typically just log that the request was sent.
            Log::info("M-Pesa Balance Request Sent: " . $response->json()['ConversationID']);
            return null;
        }

        Log::error("M-Pesa Balance Check Failed: " . $response->body());
        return null;
    }

    /**
     * Query specific transaction status (The "Reconcile Single Item" feature).
     */
    public function checkTransactionStatus(string $transactionId)
    {
        $securityCredential = $this->generateSecurityCredential($this->credentials['initiator_password']);

        $payload = [
            'Initiator' => $this->credentials['initiator_name'],
            'SecurityCredential' => $securityCredential,
            'CommandID' => 'TransactionStatusQuery',
            'TransactionID' => $transactionId,
            'PartyA' => $this->credentials['shortcode'], // Paybill/Till
            'IdentifierType' => '4',
            'Remarks' => 'Reconciliation',
            'QueueTimeOutURL' => config('app.url') . '/api/mpesa/timeout',
            'ResultURL' => config('app.url') . '/api/mpesa/status-result',
        ];

        $response = Http::withToken($this->accessToken)
            ->post("{$this->baseUrl}/mpesa/transactionstatus/v1/query", $payload);

        return $response->json();
    }

    public function normalizeTransaction(array $rawTransaction): array
    {
        // Helper to parse M-Pesa callback JSON format
        return [
            'transaction_date' => Carbon::parse($rawTransaction['TransactionDate'] ?? now())->toDateTimeString(),
            'description' => $rawTransaction['TransactionReason'] ?? 'M-Pesa Transaction',
            'debit' => $rawTransaction['TransactionType'] === 'Debit' ? $rawTransaction['Amount'] : 0,
            'credit' => $rawTransaction['TransactionType'] === 'Credit' ? $rawTransaction['Amount'] : 0,
            'reference' => $rawTransaction['TransactionID'],
        ];
    }
}
