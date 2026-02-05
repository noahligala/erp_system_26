<?php

namespace App\Listeners;

use App\Events\SalesOrderCreated;
use App\Services\DashboardService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Cache;

// By implementing ShouldQueue, this listener will run in the background
// without slowing down the user's request.
class UpdateDashboardCache implements ShouldQueue
{
    /**
     * Handle the event.
     */
    public function handle(SalesOrderCreated $event): void
    {
        $companyId = $event->salesOrder->company_id;

        // Invalidate the old cache for this company
        Cache::forget("dashboard.sales.{$companyId}");

        // Instantiate the service and re-calculate the sales KPIs.
        // The service will automatically cache the new results.
        $dashboardService = new DashboardService($event->salesOrder->company->owner);
        $dashboardService->getDashboardData(); // Re-fetch all dashboard data to ensure consistency
    }
}
