<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

class DashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        return $this->respondWithDashboard($request, 'full');
    }

    public function financialSummary(Request $request): JsonResponse
    {
        return $this->respondWithDashboard($request, 'financial_summary');
    }

    public function salesPerformance(Request $request): JsonResponse
    {
        return $this->respondWithDashboard($request, 'sales_performance');
    }

    public function purchasingOverview(Request $request): JsonResponse
    {
        return $this->respondWithDashboard($request, 'purchasing_overview');
    }

    public function hrmOverview(Request $request): JsonResponse
    {
        return $this->respondWithDashboard($request, 'hrm_overview');
    }

    public function inventoryOverview(Request $request): JsonResponse
    {
        return $this->respondWithDashboard($request, 'inventory_status');
    }

    public function systemHealth(Request $request): JsonResponse
    {
        return $this->respondWithDashboard($request, 'system_health');
    }

    public function alerts(Request $request): JsonResponse
    {
        return $this->respondWithDashboard($request, 'alerts_notifications');
    }

    public function keyMetrics(Request $request): JsonResponse
    {
        return $this->respondWithDashboard($request, 'key_metrics');
    }

    public function cashFlow(Request $request): JsonResponse
    {
        return $this->respondWithDashboard($request, 'cash_flow_analysis');
    }

    public function recentSales(Request $request): JsonResponse
    {
        return $this->respondWithDashboard($request, 'recent_sales');
    }

    private function respondWithDashboard(Request $request, string $mode = 'full'): JsonResponse
    {
        $user = $request->user();
        $startTime = microtime(true);

        if (!$user) {
            return response()->json([
                'success' => false,
                'status' => 'unauthenticated',
                'message' => 'Unauthenticated.',
                'data' => [],
                'failed_sections' => [],
                'metadata' => [
                    'generated_at' => now()->toISOString(),
                ],
            ], 401);
        }

        if (!$user->company_id) {
            return response()->json([
                'success' => false,
                'status' => 'missing_company',
                'message' => 'User is not attached to a company.',
                'data' => [],
                'failed_sections' => [],
                'metadata' => [
                    'generated_at' => now()->toISOString(),
                    'user_id' => $user->id,
                ],
            ], 422);
        }

        $validated = $request->validate([
            'timeframe' => ['nullable', 'integer', 'min:7', 'max:365'],
            'refresh_interval' => ['nullable', 'integer', 'min:30', 'max:3600'],
            'refresh' => ['nullable', 'boolean'],
        ]);

        $timeframe = (int) ($validated['timeframe'] ?? 30);
        $refreshInterval = (int) ($validated['refresh_interval'] ?? 300);

        try {
            if ($request->boolean('refresh')) {
                $this->clearDashboardCache((int) $user->company_id);
            }

            $dashboardService = app(DashboardService::class, [
                'user' => $user,
                'timeframeDays' => $timeframe,
            ]);

            $payload = $dashboardService->getDashboardData();

            $payload['metadata'] = array_merge($payload['metadata'] ?? [], [
                'refresh_interval' => $refreshInterval,
                'processing_time_ms' => round((microtime(true) - $startTime) * 1000, 2),
                'user_role' => $user->company_role ?? null,
                'request_mode' => $mode,
            ]);

            if ($mode !== 'full') {
                return $this->respondWithSection($payload, $mode);
            }

            if (!empty($payload['failed_sections'])) {
                Log::warning('Dashboard returned partial data', [
                    'user_id' => $user->id,
                    'company_id' => $user->company_id,
                    'failed_sections' => $payload['failed_sections'],
                ]);
            }

            return response()->json($payload, 200);
        } catch (Throwable $e) {
            Log::error('DashboardController failed', [
                'user_id' => $user->id ?? null,
                'company_id' => $user->company_id ?? null,
                'mode' => $mode,
                'timeframe' => $timeframe,
                'error' => $e->getMessage(),
                'trace' => app()->environment('production') ? null : $e->getTraceAsString(),
            ]);

            $response = [
                'success' => false,
                'status' => 'error',
                'message' => 'Dashboard temporarily unavailable.',
                'data' => [],
                'failed_sections' => [$mode],
                'metadata' => [
                    'generated_at' => now()->toISOString(),
                    'timeframe_days' => $timeframe,
                    'refresh_interval' => $refreshInterval,
                    'processing_time_ms' => round((microtime(true) - $startTime) * 1000, 2),
                    'request_mode' => $mode,
                ],
                'retry_after' => 60,
            ];

            if (config('app.debug')) {
                $response['error_details'] = $e->getMessage();
            }

            return response()->json($response, 503);
        }
    }

    private function respondWithSection(array $payload, string $section): JsonResponse
    {
        $data = $payload['data'] ?? [];
        $failedSections = $payload['failed_sections'] ?? [];

        $sectionFailed = in_array($section, $failedSections, true);
        $sectionData = $data[$section] ?? [
            'error' => 'Section unavailable.',
            'section' => $section,
        ];

        return response()->json([
            'success' => !$sectionFailed,
            'status' => $sectionFailed ? 'partial' : 'ok',
            'message' => $sectionFailed
                ? 'Dashboard section loaded with errors.'
                : 'Dashboard section loaded successfully.',
            'data' => [
                $section => $sectionData,
            ],
            'failed_sections' => $sectionFailed ? [$section] : [],
            'cache_status' => [
                $section => $payload['cache_status'][$section] ?? null,
            ],
            'metadata' => $payload['metadata'] ?? [
                'generated_at' => now()->toISOString(),
            ],
        ], 200);
    }

    private function clearDashboardCache(int $companyId): void
    {
        try {
            Cache::tags(['dashboard', "company:{$companyId}"])->flush();

            Log::info('Dashboard cache cleared using tags.', [
                'company_id' => $companyId,
            ]);
        } catch (Throwable $e) {
            Log::warning('Dashboard cache tag flush failed.', [
                'company_id' => $companyId,
                'error' => $e->getMessage(),
            ]);

            /*
             * Fallback:
             * If your cache driver does not support tags, exact keys are difficult
             * because they include timeframe days and section names.
             *
             * Recommended for local development:
             * php artisan cache:clear
             *
             * Recommended for production:
             * Use redis or memcached for dashboard cache tagging.
             */
        }
    }
}
