<?php

namespace App\Http\Controllers\Banking;

use App\Http\Controllers\Controller;
use App\Services\KenyaBankService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Throwable;

class KenyaBankController extends Controller
{
    protected KenyaBankService $service;

    public function __construct(KenyaBankService $service)
    {
        $this->service = $service;
    }

    /**
     * Manual Import Endpoint
     */
    public function importStatement(Request $request)
    {
        Gate::authorize('manage-financial-data');

        $request->validate([
            'file' => 'required|file|mimes:csv,txt',
            'account_id' => 'required|integer|exists:chart_of_accounts,id',
        ]);

        try {
            $companyId = auth()->user()->company_id;
            $accountId = $request->input('account_id');

            $result = $this->service->importFromFile(
                $request->file('file'),
                $companyId,
                $accountId
            );

            if ($result['status'] === 'error') {
                return response()->json($result, 422);
            }

            return response()->json($result);

        } catch (Throwable $e) {
            Log::error("Manual Import Failed: " . $e->getMessage());
            return response()->json(['message' => 'Import failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Real-time API Sync Endpoint
     */
    public function syncApi(Request $request)
    {
        Gate::authorize('manage-financial-data');

        $request->validate([
            'account_id' => 'required|integer|exists:chart_of_accounts,id'
        ]);

        try {
            // Delegate to the service to handle logic
            $result = $this->service->syncAccountTransactions($request->account_id);

            return response()->json($result);

        } catch (Throwable $e) {
            Log::error("Bank API Sync Failed: " . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
