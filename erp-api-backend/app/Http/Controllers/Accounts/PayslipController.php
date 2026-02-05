<?php

namespace App\Http\Controllers\Accounts; // <-- Matches your error log namespace

use App\Http\Controllers\Controller;
use App\Models\Accounts\Payslip;
use App\Models\Accounts\PayrollArchive;
use App\Models\User;
use App\Models\EmployeeProfile;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

class PayslipController extends Controller
{
    /**
     * Get the date of the next open payroll month.
     */
    private function getOpenMonthDate()
    {
        $company = auth()->user()->company;
        $lastClosedMonth = $company->payroll_last_closed_month;

        if ($lastClosedMonth) {
            return Carbon::parse($lastClosedMonth)->addMonth()->startOfMonth();
        }

        $lastArchive = PayrollArchive::where('company_id', $company->id)
                            ->orderBy('report_period_end', 'desc')
                            ->first();

        if ($lastArchive) {
            return Carbon::parse($lastArchive->report_period_end)->addMonth()->startOfMonth();
        }

        return Carbon::now()->startOfMonth();
    }

    /**
     * Display a listing of ALL active employees and their payslips for a given month.
     */
    public function index(Request $request)
    {
        $company = auth()->user()->company;
        $openMonthDate = $this->getOpenMonthDate();

        $openMonthData = [
            'month' => $openMonthDate->month,
            'year' => $openMonthDate->year,
        ];

        $filterDate = null;
        if ($request->has('month') && $request->input('month')) {
            $monthStr = $request->input('month');
            if (!preg_match('/^\d{1,2}-\d{4}$/', $monthStr)) {
                 return response()->json(['error' => 'Invalid month format. Use m-Y.'], 422);
            }
            [$month, $year] = explode('-', $monthStr);
            $filterDate = Carbon::create($year, $month, 1)->endOfMonth();
        } else {
            $filterDate = $openMonthDate->endOfMonth();
        }

        $activeEmployees = User::where('company_id', $company->id)
                                ->whereHas('employeeProfile', fn($q) => $q->where('status', 'active'))
                                ->with('employeeProfile')
                                ->get();

        $payslipsForMonth = Payslip::where('company_id', $company->id)
                                    ->whereDate('pay_period_end', $filterDate->toDateString())
                                    ->get()
                                    ->keyBy('user_id');

        // Merge employees and their payslips
        $transformedData = $activeEmployees->map(function ($user) use ($payslipsForMonth, $filterDate) {

            $payslip = $payslipsForMonth->get($user->id);
            $profile = $user->employeeProfile; // Get the profile

            // --- (START) NEW EMPLOYEE DETAILS ---
            // These details will be included for everyone
            $employeeDetails = [
                'national_id_number' => $profile->national_id_number ?? null,
                'kra_pin' => $profile->kra_pin ?? null,
                'nssf_number' => $profile->nssf_number ?? null,
                'nhif_number' => $profile->nhif_number ?? null,
                'bank_name' => $profile->bank_name ?? null,
                'bank_account_number' => $profile->bank_account_number ?? null,
                'employee_profile_id' => $profile->id ?? null,
            ];
            // --- (END) NEW EMPLOYEE DETAILS ---

            if ($payslip) {
                // A payslip exists, return its data
                $payslipData = [
                    'id' => $payslip->id,
                    'user_id' => $user->id,
                    'employee_name' => $user->name ?? 'N/A',
                    'pay_period_start' => Carbon::parse($payslip->pay_period_end)->startOfMonth()->toDateString(),
                    'pay_period_end' => $payslip->pay_period_end,
                    'basic_salary' => $payslip->basic_salary,
                    'gross_income' => $payslip->gross_income,
                    'net_pay' => $payslip->net_pay,
                    'deductions' => $payslip->deductions,
                    'allowances' => $payslip->allowances,
                    'tax_paid' => $payslip->tax_paid,
                    'loan_repayment' => $payslip->loan_repayment,
                    'advance_repayment' => $payslip->advance_repayment,
                    'description' => $payslip->description,
                ];
                // Merge payslip data with employee details
                return array_merge($payslipData, $employeeDetails);
            } else {
                // No payslip exists, return employee data with defaults
                $defaultData = [
                    'id' => null,
                    'user_id' => $user->id,
                    'employee_name' => $user->name ?? 'N/A',
                    'pay_period_start' => $filterDate->startOfMonth()->toDateString(),
                    'pay_period_end' => $filterDate->endOfMonth()->toDateString(),
                    'basic_salary' => $profile->salary ?? 0,
                    'gross_income' => 0,
                    'net_pay' => 0,
                    'deductions' => null,
                    'allowances' => null,
                    'tax_paid' => 0,
                    'loan_repayment' => 0,
                    'advance_repayment' => 0,
                    'description' => null,
                ];
                // Merge default data with employee details
                return array_merge($defaultData, $employeeDetails);
            }
        });

        return response()->json([
            'data' => $transformedData,
            'open_month' => $openMonthData
        ]);
    }

    // ... (store, show, update, destroy, getActiveMonth, closeMonth methods remain the same) ...

    /**
     * Store a newly created payslip.
     */
    public function store(Request $request)
    {
        $openMonthDate = $this->getOpenMonthDate();
        $company_id = auth()->user()->company_id;

        // Validation from your Payslip model
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'basic_salary' => 'nullable|numeric',
            'gross_income' => 'nullable|numeric',
            'net_pay' => 'nullable|numeric',
            'deductions' => 'nullable|array', // Changed to array to match frontend
            'allowances' => 'nullable|array', // Changed to array to match frontend
            'tax_paid' => 'nullable|numeric',
            'loan_repayment' => 'nullable|numeric',
            'advance_repayment' => 'nullable|numeric',
            'description' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $employeeProfile = EmployeeProfile::where('user_id', $request->user_id)->first();
        if (!$employeeProfile) {
            return response()->json(['error' => 'Employee profile not found.'], 404);
        }

        $existing = Payslip::where('company_id', $company_id)
            ->where('user_id', $request->user_id)
            ->whereDate('pay_period_end', $openMonthDate->endOfMonth()->toDateString())
            ->first();

        if ($existing) {
            return response()->json(['error' => 'A payslip for this employee already exists for the open month.'], 409);
        }

        $payslipData = $request->all();
        // Ensure JSON fields are encoded
        $payslipData['deductions'] = json_encode($request->input('deductions') ?? []);
        $payslipData['allowances'] = json_encode($request->input('allowances') ?? []);

        $payslipData['company_id'] = $company_id;
        $payslipData['employee_profile_id'] = $employeeProfile->id;
        $payslipData['pay_period_end'] = $openMonthDate->endOfMonth()->toDateString();
        $payslipData['created_by'] = Auth::id();

        // Use fillable fields from your Payslip model
        $payslip = Payslip::create($payslipData);

        return response()->json([
            'message' => 'Payslip created successfully.',
            'payslip' => $payslip
        ], 201);
    }


    /**
     * Display a specific payslip.
     */
    public function show($id)
    {
        try {
            $payslip = Payslip::with(['user.employeeProfile'])
                ->findOrFail($id);

            if ($payslip->company_id !== auth()->user()->company_id) {
                abort(403, 'Unauthorized');
            }

            return response()->json($payslip);
        } catch (ModelNotFoundException $e) {
            return response()->json(['error' => 'Payslip not found.'], 404);
        }
    }

    /**
     * Update an existing payslip (only if month is open).
     */
    public function update(Request $request, $id)
    {
        try {
            $payslip = Payslip::findOrFail($id);

            if ($payslip->company_id !== auth()->user()->company_id) {
                abort(403, 'Unauthorized');
            }

            $openMonthDate = $this->getOpenMonthDate();

            if (Carbon::parse($payslip->pay_period_end)->startOfMonth()->ne($openMonthDate)) {
                return response()->json([
                    'error' => 'This financial month is closed. You cannot modify payslips.'
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'basic_salary' => 'sometimes|numeric',
                'gross_income' => 'sometimes|numeric',
                'net_pay' => 'sometimes|numeric',
                'deductions' => 'nullable|array',
                'allowances' => 'nullable|array',
                'description' => 'nullable|string|max:255',
                'tax_paid' => 'sometimes|numeric',
                'loan_repayment' => 'sometimes|numeric',
                'advance_repayment' => 'sometimes|numeric',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $dataToUpdate = $request->only([
                'basic_salary', 'gross_income', 'net_pay', 'description',
                'tax_paid', 'loan_repayment', 'advance_repayment'
            ]);

            if ($request->has('deductions')) {
                $dataToUpdate['deductions'] = json_encode($request->input('deductions'));
            }
            if ($request->has('allowances')) {
                $dataToUpdate['allowances'] = json_encode($request->input('allowances'));
            }

            $payslip->update($dataToUpdate);

            return response()->json(['message' => 'Payslip updated successfully.', 'payslip' => $payslip]);

        } catch (ModelNotFoundException $e) {
            return response()->json(['error' => 'Payslip not found.'], 404);
        }
    }

    /**
     * Delete a payslip (only allowed if month is open).
     */
    public function destroy($id)
    {
        try {
            $payslip = Payslip::findOrFail($id);

            if ($payslip->company_id !== auth()->user()->company_id) {
                abort(403, 'Unauthorized');
            }

            $openMonthDate = $this->getOpenMonthDate();

            if (Carbon::parse($payslip->pay_period_end)->startOfMonth()->ne($openMonthDate)) {
                return response()->json([
                    'error' => 'This financial month is closed. You cannot delete this payslip.'
                ], 403);
            }

            $payslip->delete();
            return response()->json(['message' => 'Payslip deleted successfully.']);

        } catch (ModelNotFoundException $e) {
            return response()->json(['error' => 'Payslip not found.'], 404);
        }
    }

    /**
     * Get the currently open financial month.
     */
    public function getActiveMonth()
    {
        $openMonthDate = $this->getOpenMonthDate();

        return response()->json([
            'month' => $openMonthDate->format('n-Y')
        ]);
    }

    /**
     * Close the currently open financial month.
     */
    public function closeMonth(Request $request)
    {
         return response()->json([
            'error' => 'This endpoint is deprecated. Closing the month is handled by the Payroll Controller.'
        ], 400);
    }
}
