<?php

namespace App\Http\Controllers;

use App\Models\JobOpening;
use App\Models\Applicant;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class PublicCareersController extends Controller
{
    /**
     * Display a listing of open jobs for a specific company.
     * * @param int $company_id
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request, $company_id)
    {
        try {
            // Verify the company exists and is active (optional, depending on your setup)
            $companyExists = Company::where('id', $company_id)->exists();
            if (!$companyExists) {
                return response()->json(['status' => 'error', 'message' => 'Company not found.'], 404);
            }

            // Fetch only jobs that are actively open
            $query = JobOpening::where('company_id', $company_id)
                ->where('status', 'open') // Assuming 'open' is your active status
                ->select(['id', 'title', 'department', 'location', 'type', 'description', 'created_at'])
                ->latest();

            // Optional: Backend search/filtering if you prefer that over frontend filtering
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('department', 'like', "%{$search}%");
                });
            }

            // Get all open jobs (or use ->paginate(20) if you have hundreds of jobs)
            $jobs = $query->get();

            return response()->json(['status' => 'success', 'data' => $jobs]);

        } catch (\Exception $e) {
            Log::error('Public Careers Index Error: ' . $e->getMessage(), ['company_id' => $company_id]);
            return response()->json(['status' => 'error', 'message' => 'Could not load job openings.'], 500);
        }
    }

    /**
     * Display the specific details for a single job opening.
     *
     * @param int $company_id
     * @param int $job_opening_id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($company_id, $job_opening_id)
    {
        try {
            $job = JobOpening::where('company_id', $company_id)
                ->where('id', $job_opening_id)
                ->where('status', 'open')
                ->select(['id', 'title', 'department', 'location', 'type', 'description', 'requirements', 'benefits'])
                ->first();

            if (!$job) {
                return response()->json(['status' => 'error', 'message' => 'Job opening not found or is no longer accepting applications.'], 404);
            }

            return response()->json(['status' => 'success', 'data' => $job]);

        } catch (\Exception $e) {
            Log::error('Public Careers Show Error: ' . $e->getMessage(), ['job_id' => $job_opening_id]);
            return response()->json(['status' => 'error', 'message' => 'Could not load job details.'], 500);
        }
    }

    /**
     * Store a new applicant submitted via the public careers page.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function storeApplication(Request $request)
    {
        // 1. Strict Validation
        $validator = Validator::make($request->all(), [
            'company_id' => 'required|integer|exists:companies,id',
            'job_opening_id' => [
                'required',
                'integer',
                // Ensure the job opening actually belongs to the provided company and is open
                Rule::exists('job_openings', 'id')->where(function ($query) use ($request) {
                    return $query->where('company_id', $request->company_id)
                                 ->where('status', 'open');
                }),
            ],
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:20', // Made required based on frontend form
            'source' => 'nullable|string|max:100',
            'resume' => 'required|file|mimes:pdf,doc,docx|max:5120', // Required, Max 5MB
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        // 2. Prevent Duplicate Applications
        $existingApplication = Applicant::where('company_id', $request->company_id)
            ->where('job_opening_id', $request->job_opening_id)
            ->where('email', $request->email)
            ->first();

        if ($existingApplication) {
            return response()->json([
                'status' => 'error',
                'message' => 'You have already applied for this position with this email address.'
            ], 409); // 409 Conflict
        }

        $resumePath = null;
        $resumeFilename = null;

        // 3. Database Transaction for Data Integrity
        DB::beginTransaction();
        try {
            // Handle Resume Upload
            if ($request->hasFile('resume')) {
                $file = $request->file('resume');

                // Generate a safe, unique filename
                $resumeFilename = time() . '_' . preg_replace('/[^A-Za-z0-9_\-\.]/', '_', $file->getClientOriginalName());

                // Store securely on the 'private' or 'local' disk so it isn't publicly accessible via URL
                $resumePath = $file->storeAs("companies/{$request->company_id}/resumes", $resumeFilename, 'private');

                if (!$resumePath) {
                    throw new \Exception("Failed to store the resume file on the server.");
                }
            }

            // Create the Applicant
            $applicant = Applicant::create([
                'company_id' => $request->company_id,
                'job_opening_id' => $request->job_opening_id,
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'email' => $request->email,
                'phone' => $request->phone,
                'source' => $request->input('source', 'Careers Website'),
                'status' => 'new', // Default status for fresh applications
                'resume_path' => $resumePath,
                'resume_filename' => $file->getClientOriginalName(), // Keep original name for display
                // 'added_by' => null, // Leave null since this was submitted by a guest, not a logged-in user
            ]);

            DB::commit();

            // Optional: Dispatch an event to send a confirmation email to the applicant
            // event(new ApplicationReceived($applicant));

            return response()->json([
                'status' => 'success',
                'message' => 'Application submitted successfully.'
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            // Clean up the uploaded file if the database transaction failed
            if ($resumePath && Storage::disk('private')->exists($resumePath)) {
                Storage::disk('private')->delete($resumePath);
            }

            Log::error('Application Submission Error: ' . $e->getMessage(), [
                'company_id' => $request->company_id,
                'job_opening_id' => $request->job_opening_id,
                'email' => $request->email
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'An unexpected error occurred while processing your application. Please try again later.'
            ], 500);
        }
    }
}
