<?php

namespace App\Services\Banking\Contracts;

use App\Models\Accounts\ChartOfAccount;
use Carbon\Carbon;

/**
 * Interface for all bank/payment gateway API integrations.
 * Each adapter (KCB, M-Pesa, etc.) must implement this.
 */
interface BankIntegrationInterface
{
    /**
     * Authenticate with the bank's API using stored credentials.
     *
     * @param array $credentials Decrypted credentials (keys, tokens, etc.) from the database.
     * @return bool True on success
     */
    public function authenticate(array $credentials): bool;

    /**
     * Fetch new transactions from the bank's API.
     *
     * @param ChartOfAccount $account The account to sync.
     * @param Carbon $startDate The date to start fetching from.
     * @return array A standardized array of transaction lines.
     */
    public function fetchTransactions(ChartOfAccount $account, Carbon $startDate): array;

    /**
     * Standardizes raw bank data into our application's format.
     *
     * @param mixed $rawTransaction The raw transaction object from the bank's API.
     * @return array A single transaction line: [
     * 'transaction_date' => (string) 'Y-m-d H:i:s',
     * 'description' => (string),
     * 'debit' => (float) 0.00, // Money out
     * 'credit' => (float) 0.00, // Money in
     * 'reference' => (string) // Unique bank reference
     * ]
     */
    public function normalizeTransaction(array $rawTransaction): array;
}
