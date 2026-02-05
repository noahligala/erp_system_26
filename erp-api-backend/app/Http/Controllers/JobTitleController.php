<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\JobTitle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests; // 💡 NEW: Import trait

class JobTitleController extends Controller
{
    use AuthorizesRequests; // 💡 NEW: Use trait to enable authorization

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $this->authorize('viewAny', JobTitle::class); // 💡 Policy applied

        $companyId = Auth::user()->company_id;
        $jobTitles = JobTitle::where('company_id', $companyId)->orderBy('name')->get();

        return response()->json($jobTitles);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $this->authorize('create', JobTitle::class); // 💡 Policy applied

        $user = Auth::user();
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('job_titles')->where('company_id', $user->company_id),
            ],
            'description' => 'nullable|string',
            'responsibilities' => 'nullable|string',
            'salary_min' => 'nullable|numeric|min:0',
            'salary_max' => 'nullable|numeric|min:0|gte:salary_min',
            'benefits' => 'nullable|string',
        ]);

        $jobTitle = JobTitle::create(array_merge($validated, ['company_id' => $user->company_id]));

        return response()->json($jobTitle, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(JobTitle $jobTitle)
    {
        $this->authorize('view', $jobTitle); // 💡 Policy applied

        return response()->json($jobTitle);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, JobTitle $jobTitle)
    {
        $this->authorize('update', $jobTitle); // 💡 Policy applied

        $user = Auth::user();
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('job_titles')->where('company_id', $user->company_id)->ignore($jobTitle->id),
            ],
            'description' => 'nullable|string',
            'responsibilities' => 'nullable|string',
            'salary_min' => 'nullable|numeric|min:0',
            'salary_max' => 'nullable|numeric|min:0|gte:salary_min',
            'benefits' => 'nullable|string',
        ]);

        $jobTitle->update($validated);

        return response()->json($jobTitle);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(JobTitle $jobTitle)
    {
        $this->authorize('delete', $jobTitle); // 💡 Policy applied

        $jobTitle->delete();

        return response()->noContent();
    }
}

