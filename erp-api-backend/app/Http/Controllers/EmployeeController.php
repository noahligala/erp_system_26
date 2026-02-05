<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User; // Make sure your User model uses SoftDeletes if needed
use Carbon\Carbon;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule; // Needed for unique checks within company
use Illuminate\Database\Eloquent\ModelNotFoundException; // To catch errors
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use App\Mail\NewEmployeeCredentials;


class EmployeeController extends Controller
{
    /**
     * Display a listing of employees for the authenticated user's company.
     */
    public function index(Request $request) // Inject Request to get the user
    {
        $user = $request->user();
        if (!$user->company_id) {
             Log::warning('User without company_id tried to access employees.', ['user_id' => $user->id]);
             return response()->json(['status' => 'error', 'message' => 'User not associated with a company.'], 403); // Forbidden
        }

        Log::info('Fetching employees for company.', ['company_id' => $user->company_id]);

        try {
            // ✅ --- FIX: Filter by company_id ---
            $employees = User::where('company_id', $user->company_id)
                ->with([
                    'employeeProfile.department',
                    'employeeProfile.jobTitle'
                 ])->get();
            // ✅ --- END FIX ---

            $transformed = $employees->map(fn($employee) => $this->transformEmployee($employee));

            Log::info('Employees fetched successfully for company.', ['company_id' => $user->company_id, 'count' => count($employees)]);

            return response()->json([
                'status' => 'success',
                'data' => $transformed
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching employees for company: ' . $e->getMessage(), ['company_id' => $user->company_id]);
            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred while fetching employees.'
            ], 500);
        }
    }

    // --- transformEmployee remains the same ---
    protected function transformEmployee($employee)
    {
        // ... (your existing transform logic is fine)
        $profile = $employee->employeeProfile;
        return [
            'id' => $employee->id,
            'first_name' => $employee->first_name, // Read from User
            'last_name' => $employee->last_name,   // Read from User
            'full_name' => $employee->name,        // Use User's name column
            'email' => $employee->email,
            'phone_number' => $employee->phone_number,
            'department' => $profile?->department?->name,
            'job_title' => $profile?->jobTitle?->name,
            'salary' => $profile?->salary,
            'status' => $profile?->status,
            'hired_on' => $profile?->hired_on ? Carbon::parse($profile->hired_on)->toDateString() : null,
            'national_id' => $profile?->national_id_number,
            'nssf_number' => $profile?->nssf_number,
            'kra_pin' => $profile?->kra_pin,
            'nhif_number' => $profile?->nhif_number,
            'bank_account' => $profile?->bank_account_number,
            'bank_name' => $profile?->bank_name,
            'bank_branch' => $profile?->bank_branch,
            'accessLevel' => $employee->company_role,
        ];
    }

    // /**
    //  * Store a newly created employee within the authenticated user's company.
    //  */
    // public function store(Request $request)
    // {
    //     $creator = $request->user();
    //      if (!$creator->company_id) {
    //          Log::warning('User without company_id tried to create an employee.', ['user_id' => $creator->id]);
    //          return response()->json(['status' => 'error', 'message' => 'User not associated with a company.'], 403);
    //     }

    //     Log::info('Attempting to create a new employee.', ['company_id' => $creator->company_id, 'payload' => $request->all()]);

    //     // ✅ --- FIX: Update validation rules for uniqueness within the company ---
    //     $validator = Validator::make($request->all(), [
    //         'first_name' => 'required|string|max:255',
    //         'last_name' => 'required|string|max:255',
    //         'email' => [
    //             'required','email',
    //             // Ensure email is unique within this company, ignoring deleted users if using SoftDeletes
    //             Rule::unique('users')->where(function ($query) use ($creator) {
    //                 return $query->where('company_id', $creator->company_id)->whereNull('deleted_at');
    //             }),
    //         ],
    //         'phone_number' => [
    //             'nullable','string','max:15', // Increased max length slightly
    //             Rule::unique('users')->where(function ($query) use ($creator) {
    //                 return $query->where('company_id', $creator->company_id)->whereNull('deleted_at');
    //             }),
    //         ],
    //         // Scoping unique profile fields might be complex, consider if needed or handle DB exceptions
    //         'national_id_number' => 'nullable|string|max:50', // Consider uniqueness carefully if needed across companies
    //         'nssf_number' => 'nullable|string|max:50',
    //         'kra_pin' => 'nullable|string|max:20',
    //         'nhif_number' => 'nullable|string|max:50',
    //         // --- Other rules are mostly fine ---
    //         'department_id' => 'nullable|exists:departments,id', // Ideally, also check if department belongs to company
    //         'job_title_id' => 'nullable|exists:job_titles,id', // Ideally, also check if job title belongs to company
    //         'salary' => 'nullable|numeric|min:0',
    //         'status' => 'nullable|string|in:active,inactive,pending,terminated', // Example status values
    //         'hired_on' => 'nullable|date',
    //         'bank_account_number' => 'nullable|string|max:50',
    //         'bank_name' => 'nullable|string|max:255',
    //         'bank_branch' => 'nullable|string|max:255',
    //         'company_role' => 'nullable|string|in:EMPLOYEE,MANAGER,ADMIN', // Use specific roles if defined
    //     ]);
    //     // ✅ --- END FIX ---


    //     if ($validator->fails()) {
    //         Log::warning('Employee creation validation failed', ['company_id' => $creator->company_id, 'errors' => $validator->errors()]);
    //         return response()->json([
    //             'status' => 'error',
    //             'errors' => $validator->errors()
    //         ], 422);
    //     }

    //     DB::beginTransaction();

    //     try {
    //         $generatedPassword = Str::random(10); // or use a stronger generator
    //         // ✅ --- FIX: Set company_id automatically ---
    //         $employee = User::create([
    //             'first_name' => $request->first_name,
    //             'last_name' => $request->last_name,
    //             'name' => $request->first_name . ' ' . $request->last_name,
    //             'email' => $request->email,
    //             'phone_number' => $request->phone_number,
    //             'company_role' => $request->input('company_role', 'EMPLOYEE'), // Default role
    //             'company_id' => $creator->company_id, // Assign to creator's company
    //             // IMPORTANT: Handle password creation securely!
    //             // Example: 'password' => bcrypt(Str::random(10)), // Or send invite, etc.
    //              'password' => Hash::make($generatedPassword),
    //         ]);
    //         // ✅ --- END FIX ---

    //         // Profile creation is fine (it links via user_id)
    //         $employee->employeeProfile()->create($request->only([
    //              // No first_name/last_name here
    //             'department_id', 'job_title_id', 'salary', 'status', 'hired_on',
    //             'national_id_number', 'nssf_number', 'kra_pin', 'nhif_number',
    //             'bank_account_number', 'bank_name', 'bank_branch',
    //         ]));

    //         DB::commit();

    //         Log::info('Employee created successfully', ['company_id' => $creator->company_id, 'employee_id' => $employee->id]);

    //         return response()->json([
    //             'status' => 'success',
    //             'message' => 'Employee created successfully.',
    //             'data' => $this->transformEmployee($employee->fresh('employeeProfile'))
    //         ], 201);
    //     } catch (\Exception $e) {
    //         DB::rollBack();
    //         Log::error('Error creating employee: ' . $e->getMessage(), ['company_id' => $creator->company_id]);

    //         return response()->json([
    //             'status' => 'error',
    //             'message' => 'An error occurred while creating the employee: ' . $e->getMessage() // More detailed error for debugging
    //         ], 500);
    //     }
    // }

/**
     * Store a newly created employee.
     */
    public function store(Request $request)
{
    $creator = $request->user();
    if (!$creator->company_id) {
        return response()->json(['status' => 'error', 'message' => 'User not associated with a company.'], 403);
    }

    $validator = Validator::make($request->all(), [
        'first_name' => 'required|string|max:255',
        'last_name' => 'required|string|max:255',
        'email' => [
            'required','email',
            Rule::unique('users')->where(fn($q) => $q->where('company_id', $creator->company_id)->whereNull('deleted_at'))
        ],
        'phone_number' => [
            'nullable','string','max:15',
            Rule::unique('users')->where(fn($q) => $q->where('company_id', $creator->company_id)->whereNull('deleted_at'))
        ],
        'department_id' => 'nullable|exists:departments,id',
        'job_title_id' => 'nullable|exists:job_titles,id',
        'salary' => 'nullable|numeric|min:0',
        'status' => 'nullable|string|in:active,inactive,pending,terminated',
        'hired_on' => 'nullable|date',
        'company_role' => 'nullable|string|in:EMPLOYEE,MANAGER,ADMIN',
    ]);

    if ($validator->fails()) {
        return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
    }

    DB::beginTransaction();

    try {
        $generatedPassword = Str::random(10);

        $employee = User::create([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'name' => $request->first_name . ' ' . $request->last_name,
            'email' => $request->email,
            'phone_number' => $request->phone_number,
            'company_role' => $request->input('company_role', 'EMPLOYEE'),
            'company_id' => $creator->company_id,
            'password' => Hash::make($generatedPassword),
            'temporary_password' => $generatedPassword,
            'must_change_password' => true,
        ]);

        $employee->employeeProfile()->create($request->only([
            'department_id', 'job_title_id', 'salary', 'status', 'hired_on',
            'national_id_number', 'nssf_number', 'kra_pin', 'nhif_number',
            'bank_account_number', 'bank_name', 'bank_branch',
        ]));

        // ✅ Assign Spatie role automatically based on JobTitle
        if ($request->filled('job_title_id')) {
            $jobTitle = \App\Models\JobTitle::with('company')->find($request->job_title_id);
            if ($jobTitle && $jobTitle->role_id) {
                $role = \Spatie\Permission\Models\Role::find($jobTitle->role_id);
                if ($role) {
                    $employee->assignRole($role->name);
                    Log::info("Assigned role {$role->name} to employee {$employee->id}");
                }
            }
        }

        // Send credentials email
        try {
            Mail::to($employee->email)->send(new NewEmployeeCredentials($employee, $generatedPassword));
        } catch (\Exception $mailException) {
            Log::warning('Failed to send credentials email', ['error' => $mailException->getMessage()]);
        }

        DB::commit();

        return response()->json([
            'status' => 'success',
            'message' => 'Employee created successfully. Login credentials have been sent via email.',
            'data' => $this->transformEmployee($employee->fresh('employeeProfile'))
        ], 201);

    } catch (\Exception $e) {
        DB::rollBack();
        Log::error('Error creating employee: ' . $e->getMessage());
        return response()->json(['status' => 'error', 'message' => 'Error creating employee.'], 500);
    }
}


    /**
     * Display the specified employee.
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        if (!$user->company_id) {
             return response()->json(['status' => 'error', 'message' => 'User not associated with a company.'], 403);
        }

        Log::info('Fetching employee details.', ['company_id' => $user->company_id, 'employee_id' => $id]);

        try {
            // Find the employee *within the user's company* and load relations
            $employee = User::where('company_id', $user->company_id)
                ->with([
                    'employeeProfile.department',
                    'employeeProfile.jobTitle'
                 ])
                ->findOrFail($id); // This will 404 if not found in their company

            // Use the existing transform method
            $transformed = $this->transformEmployee($employee);

            return response()->json([
                'status' => 'success',
                'data' => $transformed
            ]);

        } catch (ModelNotFoundException $e) {
            Log::warning('Employee not found or not in company.', ['employee_id' => $id, 'company_id' => $user->company_id]);
            return response()->json(['status' => 'error', 'message' => 'Employee not found.'], 404);
        } catch (\Exception $e) {
            Log::error('Error fetching employee: ' . $e->getMessage(), ['employee_id' => $id, 'company_id' => $user->company_id]);
            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred while fetching employee details.'
            ], 500);
        }
    }


    /**
     * Update employee if they belong to the user's company.
     */
    public function update(Request $request, $id)
{
    $updater = $request->user();
    if (!$updater->company_id) {
        return response()->json(['status' => 'error', 'message' => 'User not associated with a company.'], 403);
    }

    $validator = Validator::make($request->all(), [
        'first_name' => 'sometimes|required|string|max:255',
        'last_name' => 'sometimes|required|string|max:255',
        'email' => [
            'sometimes','required','email',
            Rule::unique('users')->where(fn($q) => $q->where('company_id', $updater->company_id)->whereNull('deleted_at'))->ignore($id),
        ],
        'phone_number' => [
            'nullable','string','max:15',
            Rule::unique('users')->where(fn($q) => $q->where('company_id', $updater->company_id)->whereNull('deleted_at'))->ignore($id),
        ],
        'job_title_id' => 'sometimes|exists:job_titles,id',
    ]);

    if ($validator->fails()) {
        return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
    }

    DB::beginTransaction();

    try {
        $employee = User::where('company_id', $updater->company_id)->findOrFail($id);
        $profile = $employee->employeeProfile()->firstOrCreate();

        $employeeData = $request->only(['first_name', 'last_name', 'email', 'phone_number', 'company_role']);
        if ($request->has('first_name') || $request->has('last_name')) {
            $employeeData['name'] = ($request->first_name ?? $employee->first_name) . ' ' . ($request->last_name ?? $employee->last_name);
        }

        $employee->update($employeeData);

        $profile->update($request->only([
            'department_id', 'job_title_id', 'salary', 'status', 'hired_on',
            'national_id_number', 'nssf_number', 'kra_pin', 'nhif_number',
            'bank_account_number', 'bank_name', 'bank_branch',
        ]));

        // ✅ Handle role sync on job title change
        if ($request->filled('job_title_id')) {
            $jobTitle = \App\Models\JobTitle::find($request->job_title_id);
            if ($jobTitle && $jobTitle->role_id) {
                $role = \Spatie\Permission\Models\Role::find($jobTitle->role_id);
                if ($role) {
                    $employee->syncRoles([$role->name]); // remove old, assign new
                    Log::info("Synced role {$role->name} for employee {$employee->id}");
                }
            }
        }

        DB::commit();

        return response()->json([
            'status' => 'success',
            'message' => 'Employee updated successfully.',
            'data' => $this->transformEmployee($employee->fresh(['employeeProfile.department', 'employeeProfile.jobTitle']))
        ]);
    } catch (ModelNotFoundException $e) {
        DB::rollBack();
        return response()->json(['status' => 'error', 'message' => 'Employee not found.'], 404);
    } catch (\Exception $e) {
        DB::rollBack();
        Log::error("Error updating employee: " . $e->getMessage());
        return response()->json(['status' => 'error', 'message' => 'Error updating employee.'], 500);
    }
}




    /**
     * Delete employee if they belong to the user's company.
     */
    public function destroy(Request $request, $id) // Inject Request
    {
         $deleter = $request->user();
         if (!$deleter->company_id) {
             return response()->json(['status' => 'error', 'message' => 'User not associated with a company.'], 403);
        }
        Log::info("Attempting delete for employee ID: {$id}", ['company_id' => $deleter->company_id]);

        DB::beginTransaction();
        try {
            // ✅ --- FIX: Ensure the employee belongs to the user's company before deleting ---
            $employee = User::where('company_id', $deleter->company_id)->findOrFail($id);
            // ✅ --- END FIX ---

            // Optional: Prevent deleting self?
            // if ($employee->id === $deleter->id) {
            //     return response()->json(['status' => 'error', 'message' => 'Cannot delete yourself.'], 403);
            // }

            // Soft deletes for profile might need manual handling if not cascaded
             if ($employee->employeeProfile) {
                 $employee->employeeProfile->delete(); // Use delete() for soft deletes if applicable
             }
            $employee->delete(); // Use delete() for soft deletes if applicable

            DB::commit();
            Log::info("Employee deleted successfully", ['employee_id' => $id, 'company_id' => $deleter->company_id]);

            return response()->json([
                'status' => 'success',
                'message' => 'Employee deleted successfully.'
            ]);
        } catch (ModelNotFoundException $e) {
             DB::rollBack();
             Log::warning("Employee not found or not in company during delete.", ['employee_id' => $id, 'company_id' => $deleter->company_id]);
             return response()->json(['status' => 'error', 'message' => 'Employee not found.'], 404);
        } catch (\Exception $e) {
             DB::rollBack();
            Log::error("Error deleting employee ID {$id}: " . $e->getMessage(), ['company_id' => $deleter->company_id]);

            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred while deleting the employee.'
            ], 500);
        }
    }
}
