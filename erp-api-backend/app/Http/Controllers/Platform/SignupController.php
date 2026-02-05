<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class SignupController extends Controller
{
    // Single endpoint to handle user registration and company/plan creation
    public function registerAndSubscribe(Request $request)
    {
        // 1. Validate Input (Requires user, company, and plan details)
        $request->validate([
            'name' => 'required|string|max:255',
            'phone_number' => 'required',
            'email' => 'required|string|email|unique:users,email',
            'password' => 'required|string|min:8',
            'company_name' => 'required|string|unique:companies,name|max:255',
            'plan_id' => 'required|exists:subscription_plans,id',
        ]);

        // Fetch the chosen plan
        $plan = SubscriptionPlan::findOrFail($request->plan_id);

        // 2. Create the Platform User (The Owner)
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone_number' => $request->phone_number,
            'password' => Hash::make($request->password),
            // The user is created without a company_id yet
            'company_id' => null,
            'company_role' => 'OWNER', // Default role for the creator
        ]);

        // 3. Create the Company (Tenant)
        $company = Company::create([
            'name' => $request->company_name,
            'owner_user_id' => $user->id,
            'subscription_plan_id' => $plan->id,
            'trial_ends_at' => Carbon::now()->addDays(14), // Example: 14-day trial
        ]);

        // 4. Finalize User Setup (Link User to the new Company)
        $user->company_id = $company->id;
        $user->save();

        // 5. Authenticate the User and Return Success
        // Use standard web guard for Sanctum SPA login (will issue session cookie)
        Auth::login($user);

        return response()->json([
            'message' => 'Registration and subscription successful. Redirecting to dashboard.',
            'user' => $user,
            'company' => $company
        ], 201);
    }
}
