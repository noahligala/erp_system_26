<?php

namespace App\Console\Commands;

use App\Http\Controllers\Accounts\FixedAssetController;
use App\Models\Accounts\FixedAsset;
use App\Models\Company;
use Illuminate\Console\Command;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class DepreciateAssets extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'assets:depreciate';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Calculates and posts monthly depreciation for all active fixed assets.';

    /**
     * Execute the console command.
     */
    public function handle(FixedAssetController $fixedAssetController)
    {
        $this->info("--- Starting Monthly Depreciation Run ---");
        $runDate = Carbon::now()->endOfDay(); // Post depreciation as of today/end of day
        $companies = Company::all();
        $totalAssetsDepreciated = 0;

        foreach ($companies as $company) {
            // Find all assets in use that belong to the company
            $assets = FixedAsset::where('company_id', $company->id)
                ->where('status', 'In Use')
                ->orWhere('status', 'Partially Depreciated') // Use appropriate statuses
                ->get();

            $this->info("Processing {$assets->count()} assets for Company ID: {$company->id}");
            $assetsDepreciated = 0;

            foreach ($assets as $asset) {
                try {
                    // Call the core logic in the FixedAssetController
                    $result = $fixedAssetController->postDepreciation($asset, $runDate->toDateString());

                    if ($result) {
                        $assetsDepreciated++;
                    }

                } catch (\Exception $e) {
                    $this->error("Failed to depreciate Asset {$asset->id}: {$e->getMessage()}");
                    Log::error("Depreciation command failed for asset {$asset->id}.", ['error' => $e->getMessage()]);
                }
            }
            $totalAssetsDepreciated += $assetsDepreciated;
        }

        $this->info("--- Depreciation Run Complete. Total assets posted: {$totalAssetsDepreciated} ---");
        return Command::SUCCESS;
    }
}
