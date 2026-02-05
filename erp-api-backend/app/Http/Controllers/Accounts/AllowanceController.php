<?php

namespace App\Http\Controllers\Accounts;

use App\Http\Controllers\Controller;
use App\Models\Accounts\Allowance;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Log;
use Throwable;
use App\Policies\AllowancePolicy;
use App\Models\User;

class AllowanceController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $this->authorize('viewAny', Allowance::class);
        return Allowance::where('company_id', auth()->user()->company_id)->with('jobTitles')->get();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $this->authorize('manage', Allowance::class);
        $companyId = auth()->user()->company_id;

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('allowances')->where('company_id', $companyId)],
            'job_titles' => 'sometimes|array',
            'job_titles.*.id' => ['required_with:job_titles', 'integer', Rule::exists('job_titles', 'id')->where('company_id', $companyId)],
            'job_titles.*.amount' => 'required_with:job_titles|numeric|min:0',
        ]);

        try {
            $allowance = Allowance::create([
                'name' => $validated['name'],
                'company_id' => $companyId,
            ]);

            if (isset($validated['job_titles'])) {
                $jobTitlesToSync = collect($validated['job_titles'])->keyBy('id')->map(fn ($item) => ['amount' => $item['amount']]);
                $allowance->jobTitles()->sync($jobTitlesToSync);
            }

            return response()->json($allowance->load('jobTitles'), 201);
        } catch (Throwable $e) {
            Log::error('Allowance creation failed: ' . $e->getMessage());
            return response()->json(['message' => 'An unexpected error occurred during allowance creation.'], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Allowance $allowance)
    {
        $this->authorize('viewAny', $allowance); // Re-use viewAny as all employees can view
        return response()->json($allowance->load('jobTitles'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Allowance $allowance)
    {
        $this->authorize('manage', $allowance);
        $companyId = auth()->user()->company_id;

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('allowances')->where('company_id', $companyId)->ignore($allowance->id)],
            'job_titles' => 'sometimes|array',
            'job_titles.*.id' => ['required_with:job_titles', 'integer', Rule::exists('job_titles', 'id')->where('company_id', $companyId)],
            'job_titles.*.amount' => 'required_with:job_titles|numeric|min:0',
        ]);

        try {
            if (isset($validated['name'])) {
                $allowance->update(['name' => $validated['name']]);
            }

            if (isset($validated['job_titles'])) {
                $jobTitlesToSync = collect($validated['job_titles'])->keyBy('id')->map(fn ($item) => ['amount' => $item['amount']]);
                $allowance->jobTitles()->sync($jobTitlesToSync);
            }

            return response()->json($allowance->load('jobTitles'));
        } catch (Throwable $e) {
            Log::error("Allowance update failed for ID {$allowance->id}: " . $e->getMessage());
            return response()->json(['message' => 'An unexpected error occurred while updating the allowance.'], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Allowance $allowance)
    {
        $this->authorize('manage', $allowance);

        try {
            $allowance->delete();
            return response()->noContent();
        } catch (Throwable $e) {
            Log::error("Allowance deletion failed for ID {$allowance->id}: " . $e->getMessage());
            return response()->json(['message' => 'An unexpected error occurred while deleting the allowance.'], 500);
        }
    }
}

