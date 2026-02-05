<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

class DashboardController extends Controller
{
    public function __invoke(Request $request)
    {
        return $this->respondWithDashboard($request, mode: 'full');
    }

    public function financialSummary(Request $request)
    {
        return $this->respondWithDashboard($request, mode: 'financial_summary');
    }

    public function salesPerformance(Request $request)
    {
        return $this->respondWithDashboard($request, mode: 'sales_performance');
    }

    public function purchasingOverview(Request $request)
    {
        return $this->respondWithDashboard($request, mode: 'purchasing_overview');
    }

    public function hrmOverview(Request $request)
    {
        return $this->respondWithDashboard($request, mode: 'hrm_overview');
    }

    public function inventoryOverview(Request $request)
    {
        return $this->respondWithDashboard($request, mode: 'inventory_status');
    }

    public function systemHealth(Request $request)
    {
        return $this->respondWithDashboard($request, mode: 'system_health');
    }

    private function respondWithDashboard(Request $request, string $mode = 'full')
    {
        $user = $request->user();
        $startTime = microtime(true);

        $timeframe = max(1, (int) $request->get('timeframe', 30));
        $refreshInterval = max(30, (int) $request->get('refresh_interval', 300));

        try {
            if ($request->boolean('refresh')) {
                $this->clearDashboardCache((int) $user->company_id);
            }

            // IMPORTANT: pass the correct constructor param name: timeframeDays
            $dashboardService = app(DashboardService::class, [
                'user' => $user,
                'timeframeDays' => $timeframe,
            ]);

            $result = $dashboardService->getDashboardData();

            $payload = [
                'success' => empty($result['failed_sections']),
                'status' => empty($result['failed_sections']) ? 'complete' : 'partial',
                'data' => $result['data'],
                'metadata' => [
                    'timeframe_days' => $timeframe,
                    'refresh_interval' => $refreshInterval,
                    'generated_at' => now()->toISOString(),
                    'processing_time_ms' => round((microtime(true) - $startTime) * 1000, 2),
                    'user_role' => $user->company_role ?? 'N/A',
                    'cache_status' => $result['cache_status'] ?? 'mixed',
                ],
                'failed_sections' => $result['failed_sections'] ?? [],
            ];

            if (!empty($payload['failed_sections'])) {
                $payload['message'] = 'Partial data loaded — some dashboard sections may be unavailable.';
                Log::warning('Dashboard returned partial data', [
                    'user_id' => $user->id,
                    'company_id' => $user->company_id,
                    'failed_sections' => $payload['failed_sections'],
                ]);
            }

            // If caller wants a single section, return it safely
            if ($mode !== 'full') {
                return response()->json([
                    'success' => true,
                    'status' => 'complete',
                    'data' => [
                        $mode => $payload['data'][$mode] ?? ['error' => 'Section unavailable'],
                    ],
                    'metadata' => $payload['metadata'],
                    'failed_sections' => array_values(array_filter($payload['failed_sections'], fn ($s) => $s === $mode)),
                ], 200);
            }

            return response()->json($payload, 200);

        } catch (Throwable $e) {
            Log::error('DashboardController failed', [
                'user_id' => $user?->id,
                'company_id' => $user?->company_id,
                'error' => $e->getMessage(),
                'trace' => app()->environment('production') ? null : $e->getTraceAsString(),
            ]);

            // return 200 with structured error if you prefer, but 503 is ok
            return response()->json([
                'success' => false,
                'error' => 'Dashboard temporarily unavailable',
                'retry_after' => 60,
                'timestamp' => now()->toISOString(),
            ], 503);
        }
    }

    private function clearDashboardCache(int $companyId): void
    {
        try {
            Cache::tags(["dashboard", "company:{$companyId}"])->flush();
            Log::info("Dashboard cache cleared for company {$companyId}");
        } catch (Throwable $e) {
            Log::warning('Cache tag flush failed; fallback to manual clear', [
                'company_id' => $companyId,
                'error' => $e->getMessage(),
            ]);

            $cacheKeys = [
                // NOTE: your service keys include timeframeDays, so this fallback doesn’t fully clear those.
                // Consider removing manual keys entirely, or generate them per timeframe.
            ];

            foreach ($cacheKeys as $key) {
                Cache::forget($key);
            }
        }
    }
}
