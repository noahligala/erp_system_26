<?php

namespace App\Http\Controllers\CRM;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Throwable;

class SupplierController extends Controller
{
    use AuthorizesRequests;

    public function index()
    {
        $this->authorize('viewAny', Supplier::class);
        $suppliers = Supplier::where('company_id', auth()->user()->company_id)->get();
        return response()->json($suppliers);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Supplier::class);
        $companyId = auth()->user()->company_id;

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('suppliers')->where('company_id', $companyId)],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'phone' => 'nullable|string|max:255',
            'address' => 'nullable|string',
        ]);

        try {
            $supplier = Supplier::create(array_merge($validated, ['company_id' => $companyId]));
            return response()->json($supplier, 201);
        } catch (Throwable $e) {
            Log::error($e);
            return response()->json(['message' => 'An unexpected error occurred.'], 500);
        }
    }

    public function show(Supplier $supplier)
    {
        $this->authorize('view', $supplier);
        return response()->json($supplier);
    }

    public function update(Request $request, Supplier $supplier)
    {
        $this->authorize('update', $supplier);
        $companyId = auth()->user()->company_id;

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('suppliers')->where('company_id', $companyId)->ignore($supplier->id)],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'phone' => 'nullable|string|max:255',
            'address' => 'nullable|string',
        ]);

        try {
            $supplier->update($validated);
            return response()->json($supplier);
        } catch (Throwable $e) {
            Log::error($e);
            return response()->json(['message' => 'An unexpected error occurred.'], 500);
        }
    }

    public function destroy(Supplier $supplier)
    {
        $this->authorize('delete', $supplier);
        try {
            $supplier->delete(); // Assumes soft deletes are enabled on the model
            return response()->noContent();
        } catch (Throwable $e) {
            Log::error($e);
            return response()->json(['message' => 'An unexpected error occurred.'], 500);
        }
    }
}
