<?php

namespace App\Http\Controllers\Banking;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MpesaCallbackController extends Controller
{
    public function balanceResult(Request $request): JsonResponse
    {
        Log::info('M-Pesa balance result received', [
            'payload' => $request->all(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Balance result received.',
        ]);
    }

    public function statusResult(Request $request): JsonResponse
    {
        Log::info('M-Pesa transaction status result received', [
            'payload' => $request->all(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Status result received.',
        ]);
    }

    public function timeout(Request $request): JsonResponse
    {
        Log::warning('M-Pesa callback timeout received', [
            'payload' => $request->all(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Timeout received.',
        ]);
    }
}
