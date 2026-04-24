<?php

namespace App\Http\Controllers;

use App\Models\Applicant;
use App\Models\JobOpening;
// use App\Models\Employee; // Uncomment if creating an employee record automatically
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

        $validator = Validator::make($request->all(), [
            'job_opening_id' => ['required', Rule::exists('job_openings', 'id')->where('company_id', $user->company_id)],
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => [
                'required','email','max:255',
                 Rule::unique('applicants')->where(function ($query) use ($user, $request) {
                    return $query->where('company_id', $user->company_id)
                                 ->where('job_opening_id', $request->job_opening_id);
                 }),
            ],
            'phone' => 'nullable|string|max:20',
            'source' => 'nullable|string|max:100',
            'status' => ['nullable', Rule::in(['new', 'screening', 'interviewing', 'offer_extended', 'offer_accepted', 'hired', 'rejected', 'withdrawn'])],
            'notes' => 'nullable|string',
            'resume' => 'nullable|file|mimes:pdf,doc,docx|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $resumePath = null;
        $resumeFilename = null;

        DB::beginTransaction();
        try {
            if ($request->hasFile('resume')) {
                $file = $request->file('resume');
                $resumeFilename = $file->getClientOriginalName();
                $resumePath = $file->store("companies/{$user->company_id}/resumes", 'private');

                 if (!$resumePath) {
                    throw new \Exception("Could not store resume file.");
                 }
            }

            $applicant = Applicant::create(array_merge($validator->validated(), [
                'company_id' => $user->company_id,
                'added_by' => $user->id,
                'status' => $request->input('status', 'new'),
                'resume_path' => $resumePath,
                'resume_filename' => $resumeFilename,
            ]));

            DB::commit();
            return response()->json(['status' => 'success', 'data' => $applicant->load('jobOpening:id,title')], 201);

        } catch (\Exception $e) {
            DB::rollBack();
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

        $validator = Validator::make($request->all(), [
             'status' => ['sometimes','required', Rule::in(['new', 'screening', 'interviewing', 'offer_extended', 'offer_accepted', 'hired', 'rejected', 'withdrawn'])],
             'notes' => 'nullable|string',
             'rating' => 'nullable|numeric|min:0|max:5', // Added validation for rating
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        try {
            // $validator->validated() strips out any extra frontend data to prevent mass assignment
            $applicant->update($validator->validated());

            return response()->json(['status' => 'success', 'data' => $applicant->load('jobOpening:id,title')]);
        } catch (\Exception $e) {
             Log::error('Error updating applicant: '.$e->getMessage(), ['id' => $applicant->id]);
             return response()->json(['status' => 'error', 'message' => 'Could not update applicant.'], 500);
        }
    }

    /**
     * Custom Action: Transition an applicant to Hired status (and potentially create an employee)
     */
    public function hire(Request $request, Applicant $applicant)
    {
        $user = $request->user();
        if (!$user->company_id || $applicant->company_id !== $user->company_id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        DB::beginTransaction();
        try {
            // 1. Update the applicant status
            $applicant->update(['status' => 'hired']);

            // 2. TODO: Automatically create an Employee record
            /*
            Employee::create([
                'company_id' => $user->company_id,
                'first_name' => $applicant->first_name,
                'last_name' => $applicant->last_name,
                'email' => $applicant->email,
                'phone' => $applicant->phone,
                // Map other necessary fields or trigger an onboarding workflow
            ]);
            */

            DB::commit();
            return response()->json(['status' => 'success', 'data' => $applicant, 'message' => 'Applicant hired successfully.']);
        } catch (\Exception $e) {
             DB::rollBack();
             Log::error('Error hiring applicant: '.$e->getMessage(), ['id' => $applicant->id]);
             return response()->json(['status' => 'error', 'message' => 'Could not process hiring action.'], 500);
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

         try {
             if ($applicant->resume_path && Storage::disk('private')->exists($applicant->resume_path)) {
                 Storage::disk('private')->delete($applicant->resume_path);
             }
            $applicant->delete();
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

        if (!$applicant->resume_path) {
            return response()->json(['status' => 'error', 'message' => 'No resume file found for this applicant.'], 404);
        }

        $disk = Storage::disk('private');

        if (!$disk->exists($applicant->resume_path)) {
             Log::error('Resume file not found in storage.', ['path' => $applicant->resume_path, 'applicant_id' => $applicant->id]);
             return response()->json(['status' => 'error', 'message' => 'Resume file not found.'], 404);
        }

        $filename = $applicant->resume_filename ?? 'resume_'. $applicant->id . '.' . pathinfo($applicant->resume_path, PATHINFO_EXTENSION);
        return $disk->download($applicant->resume_path, $filename);
    }
}
