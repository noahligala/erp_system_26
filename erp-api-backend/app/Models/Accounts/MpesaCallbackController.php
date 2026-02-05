<?php

namespace App\Http\Controllers\Banking;

use App\Http\Controllers\Controller;
use App\Models\Accounts\BankStatementLine;
use App\Models\Accounts\ChartOfAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Throwable;

class MpesaCallbackController extends Controller
{
    /**
     * Handle the "Account Balance" callback.
     * M-Pesa sends this after we call $adapter->checkAccountBalance().
     */
    public function balanceResult(Request $request)
    {
        Log::info("M-Pesa Balance Callback Received", $request->all());

        $content = $request->input('Result');

        if (!$content) {
            return response()->json(['message' => 'Invalid payload'], 400);
        }

        $code = $content['ResultCode'];
        $conversationId = $content['ConversationID'];
        $originatorId = $content['OriginatorConversationID'];

        if ($code != 0) {
            Log::error("M-Pesa Balance Query Failed: " . ($content['ResultDesc'] ?? 'Unknown Error'));
            return response()->json(['message' => 'Logged failure'], 200);
        }

        // Parse Parameters
        $params = $this->flattenParameters($content['ResultParameters']['ResultParameter'] ?? []);
        $balanceStr = $params['AccountBalance'] ?? ''; // Format: "Working Account|KES|50000.00|..."

        // Extract the numeric balance (Working Account)
        $balance = 0;
        $parts = explode('|', $balanceStr);
        if (count($parts) >= 3) {
            $balance = (float) $parts[2];
        }

        // 💡 ACTION: Insert a "Balance Check" line into BankStatementLines
        // We use the ConversationID to try and link it to a specific Account if possible.
        // For now, we'll try to find the account based on the 'Initiator' or just log it for the first 'M-Pesa' account found.

        $this->recordBalanceLine($balance, $conversationId);

        return response()->json(['message' => 'Balance processed'], 200);
    }

    /**
     * Handle "Transaction Status" callback.
     * M-Pesa sends this after we call $adapter->checkTransactionStatus().
     */
    public function statusResult(Request $request)
    {
        Log::info("M-Pesa Status Callback Received", $request->all());

        $content = $request->input('Result');
        if ($content['ResultCode'] != 0) {
            Log::error("M-Pesa Transaction Status Failed: " . ($content['ResultDesc'] ?? ''));
            return response()->json(['message' => 'Logged failure'], 200);
        }

        $params = $this->flattenParameters($content['ResultParameters']['ResultParameter'] ?? []);

        // 💡 ACTION: Create/Update the bank statement line
        // This ensures that if we queried a specific transaction, it now appears in our reconciliation list
        $this->recordTransactionLine($params);

        return response()->json(['message' => 'Status processed'], 200);
    }

    /**
     * Handle Timeouts (If M-Pesa takes too long)
     */
    public function timeout(Request $request)
    {
        Log::warning("M-Pesa Request Timed Out", $request->all());
        return response()->json(['message' => 'Timeout received'], 200);
    }

    /**
     * 💡 REAL-TIME: C2B Validation URL
     * M-Pesa calls this BEFORE accepting a customer payment.
     */
    public function c2bValidation(Request $request)
    {
        // You can add logic here to reject payments (e.g., wrong account number)
        // For now, we accept everything.
        return response()->json([
            'ResultCode' => 0,
            'ResultDesc' => 'Accepted'
        ]);
    }

    /**
     * 💡 REAL-TIME: C2B Confirmation URL
     * M-Pesa calls this AFTER a payment is successful.
     * This is the "Real-Time" sync you asked for!
     */
    public function c2bConfirmation(Request $request)
    {
        Log::info("M-Pesa C2B Payment Received", $request->all());

        DB::beginTransaction();
        try {
            // 1. Find the M-Pesa Asset Account
            // Ideally, match 'BusinessShortCode' from request to 'bank_account_number' in your DB
            $shortCode = $request->input('BusinessShortCode');
            $account = ChartOfAccount::where('bank_account_number', $shortCode)->first();

            if (!$account) {
                // Fallback: Find first account marked as 'mpesa' provider
                $account = ChartOfAccount::where('bank_provider', 'mpesa')->first();
            }

            if ($account) {
                // 2. Insert directly into Bank Statement Lines
                // This makes it appear INSTANTLY in the Reconciliation UI
                BankStatementLine::create([
                    'company_id' => $account->company_id,
                    'chart_of_account_id' => $account->id,
                    'transaction_date' => Carbon::parse($request->input('TransTime'))->format('Y-m-d'),
                    'description' => $request->input('TransID') . ' - ' . $request->input('FirstName') . ' ' . $request->input('LastName'),
                    'debit' => 0, // Incoming is not a debit
                    'credit' => (float) $request->input('TransAmount'),
                    'reference' => $request->input('TransID'),
                    'is_matched' => false,
                ]);

                Log::info("M-Pesa C2B: Recorded transaction {$request->input('TransID')}");
            } else {
                Log::warning("M-Pesa C2B: Could not find matching ChartOfAccount for Shortcode {$shortCode}");
            }

            DB::commit();
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error("M-Pesa C2B Error: " . $e->getMessage());
        }

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Saved']);
    }


    // --- Helpers ---

    private function flattenParameters(array $parameters): array
    {
        $flat = [];
        foreach ($parameters as $param) {
            $flat[$param['Key']] = $param['Value'];
        }
        return $flat;
    }

    private function recordBalanceLine($balance, $reference)
    {
        // Find an M-Pesa account to attach this to
        $account = ChartOfAccount::where('bank_provider', 'mpesa')->first();

        if ($account) {
            BankStatementLine::create([
                'company_id' => $account->company_id,
                'chart_of_account_id' => $account->id,
                'transaction_date' => now(),
                'description' => "M-Pesa Float Balance Check",
                'debit' => 0,
                'credit' => 0,
                'balance' => $balance, // 💡 Ensure you added this column in migration
                'reference' => "BAL-" . $reference,
                'is_matched' => false, // User must manually acknowledge
            ]);
        }
    }

    private function recordTransactionLine(array $params)
    {
        // Logic to save a specific queried transaction
        $account = ChartOfAccount::where('bank_provider', 'mpesa')->first();

        if ($account) {
            // Determine if Debit or Credit
            // This depends on the 'TransactionReason' or direction
            $amount = (float) $params['Amount'];
            $isDebit = false; // Logic needed based on 'TransactionReason' if available

            BankStatementLine::updateOrCreate(
                ['reference' => $params['TransactionID'] ?? 'unknown'],
                [
                    'company_id' => $account->company_id,
                    'chart_of_account_id' => $account->id,
                    'transaction_date' => Carbon::parse($params['TransactionDate'])->format('Y-m-d'),
                    'description' => ($params['TransactionReason'] ?? 'Query') . " - " . ($params['DebitPartyName'] ?? ''),
                    'debit' => $isDebit ? $amount : 0,
                    'credit' => !$isDebit ? $amount : 0,
                    'is_matched' => false,
                ]
            );
        }
    }
}
