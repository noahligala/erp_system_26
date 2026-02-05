<?php

namespace App\Http\Controllers\Accounts;

use App\Http\Controllers\Controller;
use App\Models\Accounts\FixedAsset;
use App\Models\Accounts\ChartOfAccount;
use App\Models\Accounts\JournalEntry;
use App\Services\JournalEntryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Carbon\Carbon;
use Throwable;

class FixedAssetController extends Controller
{
    protected JournalEntryService $journalEntryService;

    public function __construct(JournalEntryService $journalEntryService)
    {
        $this->journalEntryService = $journalEntryService;
    }

    /**
     * Display a listing of assets.
     */
    public function index(Request $request)
    {
        Gate::authorize('view-assets');

        $assets = FixedAsset::where('company_id', auth()->user()->company_id)
            ->with(['depreciationAccount', 'accumulatedDepreciationAccount'])
            ->latest()
            ->paginate($request->get('per_page', 20));

        return response()->json($assets);
    }

    /**
     * Store a new asset record and post the initial acquisition JE.
     */
    public function store(Request $request)
    {
        Gate::authorize('manage-assets');

        $companyId = auth()->user()->company_id;
        $userId = auth()->id();

        $validated = $request->validate([
            'asset_name' => 'required|string|max:255',
            'asset_code' => ['nullable', 'string', 'max:50', Rule::unique('fixed_assets')->where('company_id', $companyId)],
            'purchase_date' => 'required|date_format:Y-m-d',
            'cost' => 'required|numeric|min:0.01',
            'useful_life_years' => 'required|integer|min:1',
            'salvage_value' => 'nullable|numeric|min:0',
            'depreciation_method' => ['required', Rule::in(['Straight-Line'])],
            'depreciation_account_id' => ['required', 'integer', Rule::exists('chart_of_accounts', 'id')->where('company_id', $companyId)->where('account_type', 'Expense')],
            'accumulated_depreciation_account_id' => ['required', 'integer', Rule::exists('chart_of_accounts', 'id')->where('company_id', $companyId)->where('account_name', 'like', '%Accumulated Depreciation%')],
            'asset_account_id' => ['required', 'integer', Rule::exists('chart_of_accounts', 'id')->where('company_id', $companyId)->where('account_type', 'Asset')], // The Fixed Asset account
        ]);

        $cost = $validated['cost'];
        $initialBookValue = round($cost, 2);

        DB::beginTransaction();
        try {
            // 1. Create the Asset Record
            $asset = FixedAsset::create([
                'company_id' => $companyId,
                'created_by' => $userId,
                'asset_name' => $validated['asset_name'],
                'asset_code' => $validated['asset_code'] ?? null,
                'purchase_date' => $validated['purchase_date'],
                'cost' => $cost,
                'useful_life_years' => $validated['useful_life_years'],
                'salvage_value' => $validated['salvage_value'] ?? 0,
                'depreciation_method' => $validated['depreciation_method'],
                'depreciation_account_id' => $validated['depreciation_account_id'],
                'accumulated_depreciation_account_id' => $validated['accumulated_depreciation_account_id'],
                'asset_account_id' => $validated['asset_account_id'],
                'book_value' => $initialBookValue,
                'accumulated_depreciation' => 0.00,
                'status' => 'In Use',
            ]);

            // 2. Post Initial Journal Entry (Debit Fixed Asset, Credit Cash/Payable)
            $cashAccount = ChartOfAccount::getAccountIdByCode('1000', $companyId);

            if (!$cashAccount) {
                 throw new \Exception("Critical GL accounts (Cash/Bank: 1000) not found for JE posting.");
            }

            $jeLines = [
                // DEBIT: Fixed Asset Cost (Asset increases)
                ['account_id' => $validated['asset_account_id'], 'debit' => $cost, 'credit' => 0, 'line_description' => "Acquisition of {$asset->asset_name}"],
                // CREDIT: Cash/Payable (Asset decreases / Liability increases)
                ['account_id' => $cashAccount, 'debit' => 0, 'credit' => $cost, 'line_description' => "Payment for asset acquisition"],
            ];

            $journalEntry = $this->journalEntryService->createJournalEntry(
                $validated['purchase_date'],
                "Acquisition of Fixed Asset: {$asset->asset_name}",
                'Asset Acquisition',
                $jeLines,
                $asset
            );

            $asset->journal_entry_id = $journalEntry->id;
            $asset->save();

            DB::commit();
            return response()->json([
                'message' => 'Asset registered and acquisition posted successfully.',
                'data' => $asset->load(['depreciationAccount', 'accumulatedDepreciationAccount']),
            ], 201);

        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Asset creation failed: ' . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified asset.
     */
    public function show(FixedAsset $asset)
    {
        Gate::authorize('view', $asset);
        if ($asset->company_id !== auth()->user()->company_id) abort(403);

        return response()->json($asset->load(['depreciationAccount', 'accumulatedDepreciationAccount', 'journalEntries']));
    }

    /**
     * Update the specified asset.
     */
    public function update(Request $request, FixedAsset $asset)
    {
        Gate::authorize('manage-assets', $asset);
        if ($asset->company_id !== auth()->user()->company_id) abort(403);
        if ($asset->status !== 'In Use') {
            return response()->json(['message' => 'Cannot edit asset details after status is set to Fully Depreciated or Disposed.'], 422);
        }

        $validated = $request->validate([
            'asset_name' => 'sometimes|required|string|max:255',
            'useful_life_years' => 'sometimes|required|integer|min:1',
            'salvage_value' => 'sometimes|nullable|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            $asset->update($validated);

            // Note: If cost or depreciation accounts are updated, related JEs may need reversal/repost (complex logic omitted for brevity).

            DB::commit();
            return response()->json($asset);
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Asset update failed: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to update asset.'], 500);
        }
    }

    /**
     * Remove the specified asset (Soft Delete).
     */
    public function destroy(FixedAsset $asset)
    {
        Gate::authorize('delete', $asset);
        if ($asset->company_id !== auth()->user()->company_id) abort(403);

        // Only allow deletion if the asset is still new/draft and has no depreciation posted
        if ($asset->accumulated_depreciation > 0 || $asset->status !== 'In Use') {
            return response()->json(['message' => 'Cannot delete an asset that has been depreciated or disposed.'], 422);
        }

        DB::beginTransaction();
        try {
            // Reverse the acquisition JE before deletion
            JournalEntry::where('referenceable_type', FixedAsset::class)
                        ->where('referenceable_id', $asset->id)
                        ->delete(); // Assumes soft delete on JE

            $asset->delete();
            DB::commit();
            return response()->json(['message' => 'Asset deleted successfully.'], 204);
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Asset deletion failed: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to delete asset.'], 500);
        }
    }


    /**
     * Calculates and posts monthly depreciation for a single asset.
     */
    public function postDepreciation(FixedAsset $asset, string $runDate)
    {
        Gate::authorize('manage-financial-data');

        if ($asset->company_id !== auth()->user()->company_id) abort(403);

        $runDateCarbon = Carbon::parse($runDate);
        $lastDepreciationDate = $asset->last_depreciation_date ? Carbon::parse($asset->last_depreciation_date) : Carbon::parse($asset->purchase_date);

        // 1. Check if asset is fully depreciated or disposed
        if ($asset->status !== 'In Use' || abs($asset->book_value) < 0.01) {
            Log::warning("Skipping depreciation for asset {$asset->id}. Status: {$asset->status}");
            return false;
        }

        // 2. Calculate time elapsed since last depreciation run
        $monthsToDepreciate = $lastDepreciationDate->diffInMonths($runDateCarbon);

        if ($monthsToDepreciate < 1) {
             Log::info("Depreciation already run for this month for asset {$asset->id}.");
             return false;
        }

        // 3. Calculate Monthly Rate (Straight-Line Method)
        $annualDepreciation = ($asset->cost - $asset->salvage_value) / $asset->useful_life_years;
        $monthlyDepreciationRate = round($annualDepreciation / 12, 2);

        // 4. Calculate Total Depreciation Amount for the period
        $depreciationAmount = $monthlyDepreciationRate * $monthsToDepreciate;

        // Ensure we don't over-depreciate (cannot go below salvage value)
        $remainingDepreciableValue = $asset->cost - $asset->accumulated_depreciation - $asset->salvage_value;
        if ($depreciationAmount > $remainingDepreciableValue) {
            $depreciationAmount = $remainingDepreciableValue;
        }

        if ($depreciationAmount <= 0.01) return false;

        DB::beginTransaction();
        try {
            // 5. Post to General Ledger (Debit Expense, Credit Contra-Asset)
            $jeLines = [
                // DEBIT: Depreciation Expense (Expense increases)
                ['account_id' => $asset->depreciation_account_id, 'debit' => $depreciationAmount, 'credit' => 0, 'line_description' => "Monthly Depreciation"],
                // CREDIT: Accumulated Depreciation (Contra-Asset increases)
                ['account_id' => $asset->accumulated_depreciation_account_id, 'debit' => 0, 'credit' => $depreciationAmount, 'line_description' => "Depreciation for {$asset->asset_name}"],
            ];

            $journalEntry = $this->journalEntryService->createJournalEntry(
                $runDate,
                "Depreciation for {$asset->asset_name}",
                'Depreciation',
                $jeLines,
                $asset // Link polymorphic relationship
            );

            // 6. Update Asset Record
            $asset->accumulated_depreciation += $depreciationAmount;
            $asset->book_value = $asset->cost - $asset->accumulated_depreciation;
            $asset->last_depreciation_date = $runDate;

            if ($asset->book_value <= $asset->salvage_value + 0.01) {
                $asset->status = 'Fully Depreciated';
                $asset->book_value = $asset->salvage_value; // Cap book value at salvage
            }
            $asset->save();

            DB::commit();
            return $journalEntry;

        } catch (Throwable $e) {
            DB::rollBack();
            Log::error("Depreciation posting failed for asset {$asset->id}: " . $e->getMessage());
            throw $e;
        }
    }


    /**
     * Handles the disposal (sale or scrapping) of a fixed asset.
     */
    public function disposeAsset(Request $request, FixedAsset $asset)
    {
        Gate::authorize('manage-financial-data');

        if ($asset->company_id !== auth()->user()->company_id) abort(403);
        if ($asset->status === 'Disposed') {
             return response()->json(['message' => 'Asset is already disposed.'], 422);
        }

        $validated = $request->validate([
            'disposal_date' => 'required|date_format:Y-m-d',
            'sale_price' => 'nullable|numeric|min:0', // 0 if scrapped
            'cash_account_id' => [
                'required_if:sale_price,>,0',
                'integer',
                Rule::exists('chart_of_accounts', 'id')->where('company_id', auth()->user()->company_id)
            ],
        ]);

        $salePrice = (float)($validated['sale_price'] ?? 0);
        $disposalDate = $validated['disposal_date'];

        DB::beginTransaction();
        try {
            // 1. Calculate final book value and determine gain/loss
            $currentBookValue = $asset->book_value;
            $gainOrLoss = $salePrice - $currentBookValue;
            $isGain = $gainOrLoss >= 0;

            // Find necessary GL accounts
            $cashAccountId = $validated['cash_account_id'] ?? null;
            // NOTE: asset_account_id is assumed to be available on the FixedAsset model
            $assetOriginalCostAccount = ChartOfAccount::findOrFail($asset->asset_account_id ?? 1500);

            // Assuming the ChartOfAccount model has a helper to retrieve codes like 4200 (Gain) and 6200 (Loss)
            $gainAccountId = ChartOfAccount::getAccountIdByCode('4200', $asset->company_id);
            $lossAccountId = ChartOfAccount::getAccountIdByCode('6200', $asset->company_id);

            if (!$gainAccountId || !$lossAccountId) {
                 throw new \Exception("Critical GL accounts (Gain/Loss: 4200/6200) not found. Check Chart of Accounts.");
            }

            $jeLines = [];

            // DEBIT 1: Remove Accumulated Depreciation (Zero out the contra-asset account)
            $jeLines[] = [
                'account_id' => $asset->accumulated_depreciation_account_id,
                'debit' => $asset->accumulated_depreciation,
                'credit' => 0,
                'line_description' => "Remove accumulated depreciation"
            ];

            // DEBIT 2: Record Cash Received (If sale occurred)
            if ($salePrice > 0) {
                 $jeLines[] = [
                    'account_id' => $cashAccountId,
                    'debit' => $salePrice,
                    'credit' => 0,
                    'line_description' => "Cash received from asset sale"
                ];
            }

            // DEBIT/CREDIT 3: Record Gain or Loss (Balancing Entry)
            if (abs($gainOrLoss) > 0.01) {
                if ($isGain) {
                    // CREDIT: Gain on Disposal (Revenue/Income increase)
                    $jeLines[] = [
                        'account_id' => $gainAccountId,
                        'debit' => 0,
                        'credit' => abs($gainOrLoss),
                        'line_description' => "Gain on asset sale"
                    ];
                } else {
                    // DEBIT: Loss on Disposal (Expense increase)
                    $jeLines[] = [
                        'account_id' => $lossAccountId,
                        'debit' => abs($gainOrLoss),
                        'credit' => 0,
                        'line_description' => "Loss on asset disposal"
                    ];
                }
            }

            // CREDIT 4: Remove Original Asset Cost (Zero out the Fixed Asset account)
            $jeLines[] = [
                'account_id' => $assetOriginalCostAccount->id,
                'debit' => 0,
                'credit' => $asset->cost,
                'line_description' => "Remove original cost of {$asset->asset_name}"
            ];


            // 2. Post Journal Entry
            $journalEntry = $this->journalEntryService->createJournalEntry(
                $disposalDate,
                "Disposal of Asset: {$asset->asset_name}",
                'Asset Disposal',
                $jeLines,
                $asset // Link polymorphic relationship
            );

            // 3. Update Asset Status and link JE
            $asset->status = 'Disposed';
            $asset->journal_entry_id = $journalEntry->id;
            $asset->disposal_date = $disposalDate;
            $asset->save();

            DB::commit();

            return response()->json([
                'message' => 'Asset disposed and financial entries posted.',
                'gain_loss' => round($gainOrLoss, 2)
            ]);

        } catch (Throwable $e) {
            DB::rollBack();
            Log::error("Asset disposal failed for asset {$asset->id}: " . $e->getMessage());
            return response()->json(['message' => 'Failed to dispose asset.'], 500);
        }
    }
}
