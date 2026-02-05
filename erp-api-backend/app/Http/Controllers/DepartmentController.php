<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class DepartmentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $companyId = Auth::user()->company_id;
        $departments = Department::where('company_id', $companyId)->orderBy('name')->get();

        return response()->json($departments);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        $companyId = $user->company_id;

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                // Ensure the department name is unique within the user's company
                Rule::unique('departments')->where('company_id', $companyId),
            ],
            'description' => 'nullable|string',
        ]);

        $department = Department::create([
            'company_id' => $companyId,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json($department, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Department $department)
    {
        // Security check: Ensure the requested department belongs to the user's company
        if ($department->company_id !== Auth::user()->company_id) {
            abort(404);
        }

        return response()->json($department);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Department $department)
    {
        $user = Auth::user();
        $companyId = $user->company_id;

        // Security check
        if ($department->company_id !== $companyId) {
            abort(404);
        }

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                // When updating, ignore the current department's ID in the unique check
                Rule::unique('departments')->where('company_id', $companyId)->ignore($department->id),
            ],
            'description' => 'nullable|string',
        ]);

        $department->update($validated);

        return response()->json($department);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Department $department)
    {
        // Security check
        if ($department->company_id !== Auth::user()->company_id) {
            abort(404);
        }

        // Note: The database migration for employee_profiles sets department_id to null on delete.
        // This means employees in this department will become unassigned, not deleted.
        $department->delete();

        return response()->noContent();
    }
}

