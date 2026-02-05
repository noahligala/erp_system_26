<?php

namespace App\Http\Controllers\Accounts;

use App\Http\Controllers\Controller;
use App\Models\Accounts\Invoice;
use App\Services\AccountingReportService; // 💡 NEW IMPORT
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Throwable;

class ReportsController extends Controller
{
    /**
     * The accounting report service instance.
     */
    protected AccountingReportService $reportService;

    /**
     * Create a new controller instance.
     * Dependency injection will automatically provide the service.
     */
    public function __construct(AccountingReportService $reportService)
    {
        $this->reportService = $reportService;
    }

    /**
     * Helper method to set up the service context.
     */
    protected function setupService(): void
    {
        if (!auth()->check() || !auth()->user()->company) {
            throw new \Exception('User is not authenticated or does not belong to a company.');
        }
        // Set the company context for the service ONCE for this request
        $this->reportService->setCompany(auth()->user()->company);
    }

    /**
     * Generate an Accounts Receivable (AR) Aging report.
     * Delegates logic to the AccountingReportService.
     */
    public function getArAging(Request $request): JsonResponse
    {
        Gate::authorize('view-financial-reports');

        Log::info('[AR Aging Report] - Controller method reached.');

        try {
            $this->setupService();

            // Allows optional custom buckets from request, e.g. ?buckets={"0-30":[0,30],...}
            $customBuckets = $request->has('buckets') ? json_decode($request->input('buckets'), true) : [];

            // 💡 DELEGATION: Service handles query, bucketing, and totaling
            $reportData = $this->reportService->generateAccountsReceivableAging($customBuckets);

            Log::info("[AR Aging Report] - Report generated successfully via service.");

            return response()->json([
                'status' => 'success',
                'data' => [
                    'items' => $reportData['details'], // Service returns 'details' collection
                    'totals' => $reportData['totals'], // Service returns 'totals' array
                ],
                'report_date' => $reportData['report_date'],
            ]);

        } catch (Throwable $e) {
            Log::error("[AR Aging Report] - CRITICAL ERROR: " . $e->getMessage(), [
                'company_id' => auth()->id() ? auth()->user()->company_id : 'N/A',
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Unable to generate the AR Aging report. Please try again later.',
            ], 500);
        }
    }

    /**
     * Generate an Accounts Payable (AP) Aging report.
     * Delegates logic to the AccountingReportService.
     */
    public function getApAging(Request $request): JsonResponse
    {
        Gate::authorize('view-financial-reports'); // Or 'view-bills' depending on preference

        Log::info('[AP Aging Report] - Controller method reached.');

        try {
            $this->setupService();

            // Allows optional custom buckets
            $customBuckets = $request->has('buckets') ? json_decode($request->input('buckets'), true) : [];

            // 💡 DELEGATION
            $reportData = $this->reportService->generateAccountsPayableAging($customBuckets);

            Log::info("[AP Aging Report] - Report generated successfully via service.");

            return response()->json([
                'status' => 'success',
                'data' => [
                    'items' => $reportData['details'],
                    'totals' => $reportData['totals'],
                ],
                'report_date' => $reportData['report_date'],
            ]);

        } catch (Throwable $e) {
            Log::error("[AP Aging Report] - CRITICAL ERROR: " . $e->getMessage(), [
                'company_id' => auth()->id() ? auth()->user()->company_id : 'N/A',
                'exception' => $e
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Unable to generate the AP Aging report.',
            ], 500);
        }
    }

    /**
     * Generate a list of all invoices.
     *
     * Note: This is a simple listing and might not be in the service if it's purely operational.
     * However, for consistency, if you want it centralized, you can add a simple query method to the service.
     * Since it's not a "calculated" report like Aging/P&L, keeping it here or in InvoiceController is also standard practice.
     * I will leave it here as it was, but ensuring proper error handling.
     */
    public function getInvoiceList(Request $request): JsonResponse
    {
        Gate::authorize('view-invoices');

        Log::info('[Invoice List Report] - Controller method reached.');

        try {
            if (!auth()->check() || !auth()->user()->company_id) {
                return response()->json(['status' => 'error', 'message' => 'Unauthenticated.'], 401);
            }

            $companyId = auth()->user()->company_id;

            $invoices = Invoice::with('customer:id,name')
                ->select(
                    'id', 'company_id', 'customer_id', 'invoice_number', 'invoice_date',
                    'due_date', 'total_amount', 'balance_due', 'status'
                )
                ->where('company_id', $companyId)
                ->orderByDesc('invoice_date')
                ->orderByDesc('id')
                ->get();

            Log::info("[Invoice List Report] - Query successful. Found " . $invoices->count() . " invoices.");

            return response()->json([
                'status' => 'success',
                'data' => $invoices,
                'report_date' => Carbon::today()->toFormattedDateString(),
            ]);

        } catch (Throwable $e) {
            Log::error("[Invoice List Report] - CRITICAL ERROR: " . $e->getMessage(), [
                'company_id' => auth()->id() ? auth()->user()->company_id : 'N/A',
                'exception' => $e
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Unable to generate the invoice list report. Please try again later.',
            ], 500);
        }
    }
}
