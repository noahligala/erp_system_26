<?php

namespace App\Http\Controllers\CRM;

use App\Http\Controllers\Controller;
use App\Models\CRM\Customer;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Facades\Log; // <-- ADD THIS
use Illuminate\Validation\Rule;
use Throwable;

class CustomerController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of the resource for the user's company.
     */
    public function index()
    {
        Log::debug("CustomerController@index hit by User ID: " . auth()->id()); // <-- ADDED LOG

        try {
            // This is where the 403 Forbidden is likely happening
            $this->authorize('viewAny', Customer::class);
            Log::debug("User authorized for 'viewAny' on Customer."); // <-- ADDED LOG

        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            Log::error("AuthorizationException in CustomerController@index for User ID: " . auth()->id() . ". Message: " . $e->getMessage()); // <-- ADDED LOG
            throw $e; // Re-throw the exception to trigger the 403
        }

        // Check if pagination is explicitly disabled
        if (request()->query('paginate') === 'false') {
            $customers = Customer::where('company_id', auth()->user()->company_id)->get();
        } else {
            $customers = Customer::where('company_id', auth()->user()->company_id)->paginate(request()->get('per_page', 20));
        }

        return response()->json($customers);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        Log::debug("CustomerController@store hit by User ID: " . auth()->id()); // <-- ADDED LOG
        $this->authorize('create', Customer::class);
        Log::debug("User authorized for 'create' on Customer."); // <-- ADDED LOG

        $companyId = auth()->user()->company_id;

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('customers')->where('company_id', $companyId)],
            'phone' => 'nullable|string|max:255',
            'address' => 'nullable|string',
        ]);

        try {
            $customer = Customer::create(array_merge($validated, ['company_id' => $companyId]));
            return response()->json($customer, 201);
        } catch (Throwable $e) {
            Log::error($e);
            return response()->json(['message' => 'An unexpected error occurred.'], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Customer $customer)
    {
        Log::debug("CustomerController@show({$customer->id}) hit by User ID: " . auth()->id()); // <-- ADDED LOG
        $this->authorize('view', $customer);
        Log::debug("User authorized for 'view' on Customer {$customer->id}."); // <-- ADDED LOG

        return response()->json($customer);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Customer $customer)
    {
        Log::debug("CustomerController@update({$customer->id}) hit by User ID: " . auth()->id()); // <-- ADDED LOG
        $this->authorize('update', $customer);
        Log::debug("User authorized for 'update' on Customer {$customer->id}."); // <-- ADDED LOG

        $companyId = auth()->user()->company_id;
        // ... validation ...
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('customers')->where('company_id', $companyId)->ignore($customer->id)],
            'phone' => 'nullable|string|max:255',
            'address' => 'nullable|string',
        ]);

        try {
            $customer->update($validated);
            return response()->json($customer);
        } catch (Throwable $e) {
            Log::error($e);
            return response()->json(['message' => 'An unexpected error occurred.'], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Customer $customer)
    {
        Log::debug("CustomerController@destroy({$customer->id}) hit by User ID: " . auth()->id()); // <-- ADDED LOG
        $this->authorize('delete', $customer);
        Log::debug("User authorized for 'delete' on Customer {$customer->id}."); // <-- ADDED LOG

        try {
            $customer->delete(); // Assumes soft delete
            return response()->noContent();
        } catch (Throwable $e) {
            Log::error($e);
            return response()->json(['message' => 'An unexpected error occurred.'], 500);
        }
    }
}
