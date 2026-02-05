<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class CompanyController extends Controller
{
    /**
     * Return authenticated user's company details.
     */
    public function show()
    {
        $user = Auth::user();

        if (!$user || !$user->company) {
            return response()->json(['message' => 'No company associated with this user.'], 404);
        }

        $company = $user->company;

        return response()->json([
            'name' => $company->name,
            'po_box' => $company->po_box,
            'tel_number' => $company->tel_number,
            'email_address' => $company->email_address,
            'tagline' => $company->tagline,
            'website_url' => $company->website_url,
            'logo' => $company->logo ? asset('storage/' . $company->logo) : null,
        ]);
    }

    /**
     * Add a new user (staff) to the authenticated user's company.
     */
    public function addUser(Request $request)
    {
        $actionUser = Auth::user();
        $company = $actionUser->company;

        if (!$company) {
            return response()->json(['message' => 'You are not associated with a company.'], 403);
        }

        // Validate new user data
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|unique:users,email',
            'password' => 'required|string|min:8',
            'company_role' => 'required|string|in:ADMIN,EMPLOYEE',
        ]);

        $newUser = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'company_id' => $company->id,
            'company_role' => $request->company_role,
        ]);

        return response()->json($newUser, 201);
    }

    /**
     * Update company profile (including logo).
     */
    public function update(Request $request)
    {
        $user = Auth::user();
        $company = $user->company;

        if (!$company) {
            return response()->json(['message' => 'You are not associated with a company.'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'po_box' => 'nullable|string|max:255',
            'tel_number' => 'nullable|string|max:20',
            'email_address' => 'nullable|email|max:255',
            'tagline' => 'nullable|string|max:255',
            'website_url' => 'nullable|url|max:255',
            'logo' => 'nullable|image|mimes:jpg,jpeg,png,svg|max:2048',
        ]);

        // Handle logo upload if provided
        if ($request->hasFile('logo')) {
            // Delete old logo if it exists
            if ($company->logo && Storage::disk('public')->exists($company->logo)) {
                Storage::disk('public')->delete($company->logo);
            }

            $path = $request->file('logo')->store('company_logos', 'public');
            $validated['logo'] = $path;
        }

        $company->update($validated);

        return response()->json([
            'message' => 'Company profile updated successfully.',
            'company' => [
                'name' => $company->name,
                'po_box' => $company->po_box,
                'tel_number' => $company->tel_number,
                'email_address' => $company->email_address,
                'tagline' => $company->tagline,
                'website_url' => $company->website_url,
                'logo' => $company->logo ? asset('storage/' . $company->logo) : null,
            ]
        ]);
    }
}
