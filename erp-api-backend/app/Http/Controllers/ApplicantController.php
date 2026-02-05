<?php

namespace App\Http\Controllers;

use App\Models\Applicant;
use App\Models\JobOpening;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class ApplicantController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user->company_id) { return response()->json(['status' => 'error', 'message' => 'User not associated.'], 403); }
        // Add Auth checks

        try {
            $query = Applicant::where('company_id', $user->company_id)
                ->with('jobOpening:id,title') // Load opening title
                ->latest();

            if ($request->filled('job_opening_id')) {
                // Ensure the opening belongs to the company
                $openingExists = JobOpening::where('company_id', $user->company_id)
                                        ->where('id', $request->job_opening_id)
                                        ->exists();
                if ($openingExists) {
                    $query->where('job_opening_id', $request->job_opening_id);
                } else {
                     return response()->json(['status' => 'error', 'message' => 'Invalid job opening specified.'], 404);
                }
            }
             if ($request->filled('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            $applicants = $query->paginate($request->input('per_page', 20));
            return response()->json(['status' => 'success', 'data' => $applicants]);
        } catch (\Exception $e) {
            Log::error('Error fetching applicants: '.$e->getMessage(), ['company_id' => $user->company_id]);
            return response()->json(['status' => 'error', 'message' => 'Could not fetch applicants.'], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user->company_id) { return response()->json(['status' => 'error', 'message' => 'User not associated.'], 403); }
         // Add Auth checks

        $validator = Validator::make($request->all(), [
            'job_opening_id' => ['required', Rule::exists('job_openings', 'id')->where('company_id', $user->company_id)],
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => [
                'required','email','max:255',
                 // Unique applicant per job opening within the company
                 Rule::unique('applicants')->where(function ($query) use ($user, $request) {
                    return $query->where('company_id', $user->company_id)
                                 ->where('job_opening_id', $request->job_opening_id);
                 }),
            ],
            'phone' => 'nullable|string|max:20',
            'source' => 'nullable|string|max:100',
            'status' => ['nullable', Rule::in(['new', 'screening', 'interviewing', 'offer_extended', 'offer_accepted', 'hired', 'rejected', 'withdrawn'])],
            'notes' => 'nullable|string',
            'resume' => 'nullable|file|mimes:pdf,doc,docx|max:5120', // Example: PDF/Word, max 5MB
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $resumePath = null;
        $resumeFilename = null;

        DB::beginTransaction();
        try {
            // Handle file upload
            if ($request->hasFile('resume')) {
                $file = $request->file('resume');
                $resumeFilename = $file->getClientOriginalName();
                // Store in a company-specific folder within 'resumes' directory
                $resumePath = $file->store("companies/{$user->company_id}/resumes", 'private'); // Use 'private' disk if configured

                 if (!$resumePath) {
                    throw new \Exception("Could not store resume file.");
                 }
            }

            $applicant = Applicant::create(array_merge($validator->validated(), [
                'company_id' => $user->company_id,
                'added_by' => $user->id,
                'status' => $request->input('status', 'new'), // Default status
                'resume_path' => $resumePath,
                'resume_filename' => $resumeFilename,
            ]));

            DB::commit();
             return response()->json(['status' => 'success', 'data' => $applicant->load('jobOpening:id,title')], 201);

        } catch (\Exception $e) {
            DB::rollBack();
             // Clean up uploaded file if DB transaction failed
             if ($resumePath && Storage::disk('private')->exists($resumePath)) {
                 Storage::disk('private')->delete($resumePath);
             }
            Log::error('Error creating applicant: '.$e->getMessage(), ['company_id' => $user->company_id, 'user_id' => $user->id]);
            return response()->json(['status' => 'error', 'message' => 'Could not create applicant.'], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, Applicant $applicant)
    {
        $user = $request->user();
        if (!$user->company_id || $applicant->company_id !== $user->company_id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }
        // Add auth checks

        try {
            return response()->json(['status' => 'success', 'data' => $applicant->load(['jobOpening:id,title', 'addedByUser:id,name'])]);
        } catch (\Exception $e) {
             Log::error('Error fetching applicant: '.$e->getMessage(), ['id' => $applicant->id]);
             return response()->json(['status' => 'error', 'message' => 'Could not fetch applicant details.'], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Applicant $applicant)
    {
        $user = $request->user();
        if (!$user->company_id || $applicant->company_id !== $user->company_id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }
        // Add Auth checks (can user update?)

        $validator = Validator::make($request->all(), [
             // Allow updating only specific fields, e.g., status and notes
             'status' => ['sometimes','required', Rule::in(['new', 'screening', 'interviewing', 'offer_extended', 'offer_accepted', 'hired', 'rejected', 'withdrawn'])],
             'notes' => 'nullable|string',
             // Add other fields if needed, carefully considering validation rules (e.g., email uniqueness check needs ->ignore($applicant->id))
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        try {
            $applicant->update($validator->validated());
            // TODO: Add logic here if changing status to 'hired' should trigger something (e.g., create employee record)
            return response()->json(['status' => 'success', 'data' => $applicant->load('jobOpening:id,title')]);
        } catch (\Exception $e) {
             Log::error('Error updating applicant: '.$e->getMessage(), ['id' => $applicant->id]);
             return response()->json(['status' => 'error', 'message' => 'Could not update applicant.'], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Applicant $applicant)
    {
        $user = $request->user();
        if (!$user->company_id || $applicant->company_id !== $user->company_id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }
        // Add Auth check (can user delete?)

         try {
             // Optionally delete the resume file from storage first
             if ($applicant->resume_path && Storage::disk('private')->exists($applicant->resume_path)) {
                 Storage::disk('private')->delete($applicant->resume_path);
             }
            $applicant->delete(); // Soft delete
            return response()->json(['status' => 'success', 'message' => 'Applicant archived successfully.']);
        } catch (\Exception $e) {
             Log::error('Error archiving applicant: '.$e->getMessage(), ['id' => $applicant->id]);
             return response()->json(['status' => 'error', 'message' => 'Could not archive applicant.'], 500);
        }
    }

    /**
     * Download the applicant's resume.
     */
    public function downloadResume(Request $request, Applicant $applicant)
    {
        $user = $request->user();
         if (!$user->company_id || $applicant->company_id !== $user->company_id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }
         // Add auth checks

        if (!$applicant->resume_path) {
            return response()->json(['status' => 'error', 'message' => 'No resume file found for this applicant.'], 404);
        }

        // Use the 'private' disk if that's where you stored it
        $disk = Storage::disk('private');

        if (!$disk->exists($applicant->resume_path)) {
             Log::error('Resume file not found in storage.', ['path' => $applicant->resume_path, 'applicant_id' => $applicant->id]);
             return response()->json(['status' => 'error', 'message' => 'Resume file not found.'], 404);
        }

        // Return a download response
        $filename = $applicant->resume_filename ?? 'resume_'. $applicant->id . '.' . pathinfo($applicant->resume_path, PATHINFO_EXTENSION);
        return $disk->download($applicant->resume_path, $filename);
    }
}
