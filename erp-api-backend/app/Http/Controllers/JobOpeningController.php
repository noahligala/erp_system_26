<?php

namespace App\Http\Controllers;

use App\Models\JobOpening;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class JobOpeningController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user->company_id) { return response()->json(['status' => 'error', 'message' => 'User not associated.'], 403); }

        // Add Authorization: Can user view job openings?

        try {
            $query = JobOpening::where('company_id', $user->company_id)
                ->with(['department:id,name', 'jobTitle:id,name']) // Eager load names
                ->latest();

            if ($request->filled('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            $openings = $query->paginate($request->input('per_page', 15));
            return response()->json(['status' => 'success', 'data' => $openings]);
        } catch (\Exception $e) {
            Log::error('Error fetching job openings: '.$e->getMessage(), ['company_id' => $user->company_id]);
            return response()->json(['status' => 'error', 'message' => 'Could not fetch job openings.'], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user->company_id) { return response()->json(['status' => 'error', 'message' => 'User not associated.'], 403); }

        // Add Authorization: Can user create job openings?

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'department_id' => ['nullable', Rule::exists('departments', 'id')->where('company_id', $user->company_id)],
            'job_title_id' => ['nullable', Rule::exists('job_titles', 'id')->where('company_id', $user->company_id)],
            'status' => ['required', Rule::in(['draft', 'open', 'closed', 'on_hold'])],
            'positions_to_fill' => 'nullable|integer|min:1',
            'posted_date' => 'nullable|date',
            'closing_date' => 'nullable|date|after_or_equal:posted_date',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        try {
            $opening = JobOpening::create(array_merge($validator->validated(), [
                'company_id' => $user->company_id,
                'created_by' => $user->id,
                'positions_to_fill' => $request->input('positions_to_fill', 1), // Default if null
            ]));
            return response()->json(['status' => 'success', 'data' => $opening->load(['department:id,name', 'jobTitle:id,name'])], 201);
        } catch (\Exception $e) {
            Log::error('Error creating job opening: '.$e->getMessage(), ['company_id' => $user->company_id, 'user_id' => $user->id]);
            return response()->json(['status' => 'error', 'message' => 'Could not create job opening.'], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, JobOpening $jobOpening) // Using Route Model Binding
    {
         $user = $request->user();
        if (!$user->company_id || $jobOpening->company_id !== $user->company_id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }
         // Add finer-grained auth if needed

        try {
            return response()->json(['status' => 'success', 'data' => $jobOpening->load(['department:id,name', 'jobTitle:id,name', 'creator:id,name'])]);
        } catch (\Exception $e) {
             Log::error('Error fetching job opening details: '.$e->getMessage(), ['id' => $jobOpening->id]);
             return response()->json(['status' => 'error', 'message' => 'Could not fetch job opening details.'], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, JobOpening $jobOpening)
    {
        $user = $request->user();
        if (!$user->company_id || $jobOpening->company_id !== $user->company_id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }
        // Add auth check: Can user update openings?

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'department_id' => ['nullable', Rule::exists('departments', 'id')->where('company_id', $user->company_id)],
            'job_title_id' => ['nullable', Rule::exists('job_titles', 'id')->where('company_id', $user->company_id)],
            'status' => ['sometimes','required', Rule::in(['draft', 'open', 'closed', 'on_hold'])],
            'positions_to_fill' => 'nullable|integer|min:1',
            'posted_date' => 'nullable|date',
            'closing_date' => 'nullable|date|after_or_equal:posted_date',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        try {
            $jobOpening->update($validator->validated());
            return response()->json(['status' => 'success', 'data' => $jobOpening->load(['department:id,name', 'jobTitle:id,name'])]);
        } catch (\Exception $e) {
             Log::error('Error updating job opening: '.$e->getMessage(), ['id' => $jobOpening->id]);
             return response()->json(['status' => 'error', 'message' => 'Could not update job opening.'], 500);
        }
    }

    /**
     * Remove the specified resource from storage (soft delete).
     */
    public function destroy(Request $request, JobOpening $jobOpening)
    {
         $user = $request->user();
        if (!$user->company_id || $jobOpening->company_id !== $user->company_id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }
         // Add auth check: Can user delete openings?

        try {
            $jobOpening->delete(); // Soft delete
            return response()->json(['status' => 'success', 'message' => 'Job opening archived successfully.']);
        } catch (\Exception $e) {
             Log::error('Error archiving job opening: '.$e->getMessage(), ['id' => $jobOpening->id]);
             return response()->json(['status' => 'error', 'message' => 'Could not archive job opening.'], 500);
        }
    }
}
