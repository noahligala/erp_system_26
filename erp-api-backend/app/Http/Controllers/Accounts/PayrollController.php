<?php

namespace App\Http\Controllers\Accounts;

use App\Http\Controllers\Controller;
use App\Models\Accounts\ChartOfAccount;
use App\Models\Accounts\JournalEntry;
use App\Models\Accounts\Payslip;
use App\Models\Accounts\PayrollArchive;
use App\Models\User;
use App\Services\PayslipService;
use Carbon\Carbon;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use App\Services\AccountingReportService;
use Throwable;

class PayrollController extends Controller
{
    use AuthorizesRequests;

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

        // This is the correct fallback
        return Carbon::now()->startOfMonth();
    }
    /**
     * Generate payslips for all active employees for a given month.
     */
    public function generate(Request $request, PayslipService $payslipService)
    {
        Gate::authorize('manage-payroll');
        $validated = $request->validate([
            'pay_period_end' => 'required|date',
        ]);

        try {
            $company = auth()->user()->company;
            $endDate = Carbon::parse($validated['pay_period_end']);
            $count = $payslipService->generateForMonth($company, $endDate);
            if ($count === 0) {
                return response()->json(['message' => 'No active employees found to generate payslips for.'], 404);
            }
            return response()->json([
                'message' => "Successfully generated {$count} payslips for " . $endDate->format('F Y') . "."
            ], 201);
        } catch (\InvalidArgumentException $e) { // Or PayrollGenerationException
            return response()->json(['message' => $e->getMessage()], 409);
        } catch (Throwable $e) {
            Log::error('Payroll generation failed: ' . $e->getMessage());
            return response()->json(['message' => 'An unexpected error occurred during payroll generation.'], 500);
        }
    }

    /**
     * List all archived payroll reports for the company (summary view).
     */
    public function index()
    {
        Gate::authorize('manage-payroll');
        $company_id = auth()->user()->company_id;

        $reports = PayrollArchive::where('company_id', $company_id)
            ->orderBy('report_period_end', 'desc')
            ->get(['id', 'report_period_end', 'summary']);

        // Safely decode summary
        $reports->transform(function ($report) {
            $summaryData = [];
            if (is_string($report->summary)) {
                $summaryData = json_decode($report->summary, true) ?? [];
            } elseif (is_array($report->summary) || is_object($report->summary)) {
                $summaryData = (array)$report->summary; // Cast object to array if needed
            }

            $report->summary_details = [
                'total_gross_income' => $summaryData['total_gross_income'] ?? 0,
                'total_deductions' => $summaryData['total_deductions'] ?? 0,
                'total_net_pay' => $summaryData['total_net_pay'] ?? 0,
                'payslip_count' => $summaryData['payslip_count'] ?? 0,
            ];
            unset($report->summary);
            return $report;
        });

        return response()->json($reports);
    }

    /**
     * Get a single, detailed archived payroll report.
     */
    public function show(PayrollArchive $payrollArchive)
    {
        Gate::authorize('manage-payroll');

        if ($payrollArchive->company_id !== auth()->user()->company_id) {
            abort(404, 'Payroll report not found.');
        }

        // Safely decode payslip_data
        $payslipData = [];
        $rawPayslipData = $payrollArchive->payslip_data;
        if (is_string($rawPayslipData)) { $payslipData = json_decode($rawPayslipData, true) ?? []; }
        elseif (is_array($rawPayslipData) || is_object($rawPayslipData)) {
            $payslipData = json_decode(json_encode($rawPayslipData), true) ?? []; // Convert object to array reliably
        }
        if (!empty($payslipData) && !isset($payslipData[0])){ $payslipData = array_values($payslipData); }

        // Ensure allowances and statutory_deductions within each payslip are consistently arrays/objects
        foreach ($payslipData as $key => $payslip) {
             if (isset($payslip['allowances'])) {
                if (is_string($payslip['allowances'])) { $payslipData[$key]['allowances'] = json_decode($payslip['allowances'], true) ?? []; }
                elseif (!is_array($payslip['allowances']) && !is_object($payslip['allowances'])) { $payslipData[$key]['allowances'] = []; }
                else { $payslipData[$key]['allowances'] = (array)$payslip['allowances']; }
             } else { $payslipData[$key]['allowances'] = []; }

             if (isset($payslip['statutory_deductions'])) {
                if (is_string($payslip['statutory_deductions'])) { $payslipData[$key]['statutory_deductions'] = json_decode($payslip['statutory_deductions'], true) ?? []; }
                elseif (!is_array($payslip['statutory_deductions']) && !is_object($payslip['statutory_deductions'])) { $payslipData[$key]['statutory_deductions'] = []; }
                 else { $payslipData[$key]['statutory_deductions'] = (array)$payslip['statutory_deductions']; }
             } else { $payslipData[$key]['statutory_deductions'] = []; }
        }

        // Safely decode summary
        $summaryData = [];
        $rawSummary = $payrollArchive->summary;
        if (is_string($rawSummary)) { $summaryData = json_decode($rawSummary, true) ?? []; }
        elseif (is_array($rawSummary) || is_object($rawSummary)) { $summaryData = (array)$rawSummary; }

        return response()->json([
            'id' => $payrollArchive->id,
            'report_period' => Carbon::parse($payrollArchive->report_period_end)->format('F Y'),
            'report_period_end' => $payrollArchive->report_period_end,
            'company_totals' => $summaryData,
            'payslips' => $payslipData,
            'journal_entry_id' => $payrollArchive->journal_entry_id,
        ]);
    }


    /**
     * Close the payroll period for a given month.
     */
    public function closeMonth(Request $request)
    {
        Gate::authorize('manage-payroll');
        $validated = $request->validate(['month_end_date' => 'required|date']);
        $company = auth()->user()->company;
        $monthEndDate = Carbon::parse($validated['month_end_date'])->endOfMonth();

        // Get the start of the *current* open month, then get its end date.
        $expectedMonthEndDate = $this->getOpenMonthDate()->endOfMonth();

        if (!$monthEndDate->isSameDay($expectedMonthEndDate)) {
             return response()->json(['message' => 'Invalid payroll period. The next period to close should end on ' . $expectedMonthEndDate->format('F d, Y')], 422);
        }

        $payslips = Payslip::where('company_id', $company->id)->where('pay_period_end', $monthEndDate->toDateString())->with('user.employeeProfile')->get();
        $activeEmployeesCount = User::where('company_id', $company->id)->whereHas('employeeProfile', fn($q) => $q->where('status', 'active'))->count();

        if ($payslips->isEmpty()) {
             return response()->json(['message' => "Cannot close month. No payslips found for {$monthEndDate->format('F Y')}. Please generate payslips first."], 409);
        }
        if ($payslips->count() !== $activeEmployeesCount) {
             return response()->json(['message' => "Cannot close month. Found {$payslips->count()} payslips but there are {$activeEmployeesCount} active employees. Ensure all payslips are generated."], 409);
        }

        try {
            $archive = DB::transaction(function () use ($company, $monthEndDate, $payslips) {
                $summary = [
                    'total_gross_income' => $payslips->sum('gross_income'),
                    'total_deductions' => $payslips->sum(function($p) {
                        $custom_deductions = 0;
                        $deductionsData = $p->deductions ?? [];
                        if (is_string($deductionsData)) { try { $deductionsData = json_decode($deductionsData, true) ?? []; } catch (\Exception $e) {$deductionsData = [];} }
                        if (is_array($deductionsData) || is_object($deductionsData)) {
                             $custom_deductions = collect((array)$deductionsData)->sum(fn($value) => is_numeric($value) ? (float)$value : 0);
                        }
                         return ($p->tax_paid ?? 0) + ($p->loan_repayment ?? 0) + ($p->advance_repayment ?? 0) + $custom_deductions;
                    }),
                    'total_net_pay' => $payslips->sum('net_pay'),
                    'payslip_count' => $payslips->count(),
                ];

                 $detailedPayslipData = $payslips->map(function ($payslip) {
                     $profile = $payslip->user->employeeProfile;
                     $allowances = $payslip->allowances;
                     if (is_string($allowances)) { try { $allowances = json_decode($allowances, true) ?? []; } catch (\Exception $e) { $allowances = []; }}
                     elseif (!is_array($allowances) && !is_object($allowances)) { $allowances = []; }
                     $deductions = $payslip->deductions;
                      if (is_string($deductions)) { try { $deductions = json_decode($deductions, true) ?? []; } catch (\Exception $e) { $deductions = []; }}
                     elseif (!is_array($deductions) && !is_object($deductions)) { $deductions = []; }
                     return [
                         'employee_id' => $payslip->user->id,
                         'employee_name' => $payslip->user->name,
                         'gross_income' => $payslip->gross_income,
                         'allowances' => (array)$allowances,
                         'statutory_deductions' => (array)$deductions,
                         'tax_paid' => $payslip->tax_paid,
                         'loan_repayment' => $payslip->loan_repayment,
                         'advance_repayment' => $payslip->advance_repayment,
                         'net_pay' => $payslip->net_pay,
                         'bank_details' => [ 'bank_name' => $profile->bank_name ?? null, 'bank_account_number' => $profile->bank_account_number ?? null ]
                     ];
                 });

                $accounts = ChartOfAccount::where('company_id', $company->id)->whereIn('account_name', ['Salaries Expense', 'Salaries Payable', 'Tax Payable'])->get()->keyBy('account_name');
                if($accounts->count() < 3) throw new \Exception('Required accounting accounts (Salaries Expense, Salaries Payable, Tax Payable) are not set up.');

                $archive = PayrollArchive::create([
                    'company_id' => $company->id,
                    'report_period_end' => $monthEndDate,
                    'summary' => json_encode($summary),
                    'payslip_data' => $detailedPayslipData->toJson(),
                ]);

                 $journalEntry = JournalEntry::create([
                    'company_id' => $company->id, 'transaction_date' => $monthEndDate,
                    'description' => 'Payroll for ' . $monthEndDate->format('F Y'),
                    'referenceable_id' => $archive->id, 'referenceable_type' => PayrollArchive::class,
                 ]);
                 $salariesExpenseId = $accounts['Salaries Expense']?->id;
                 $salariesPayableId = $accounts['Salaries Payable']?->id;
                 $taxPayableId = $accounts['Tax Payable']?->id;
                 if (!$salariesExpenseId || !$salariesPayableId || !$taxPayableId) { throw new \Exception('One or more required accounting accounts are missing.'); }
                 $total_tax_and_other_deductions = $summary['total_deductions'] - $payslips->sum('loan_repayment') - $payslips->sum('advance_repayment');
                 $journalEntry->lines()->createMany([
                    ['chart_of_account_id' => $salariesExpenseId, 'debit' => $summary['total_gross_income']],
                    ['chart_of_account_id' => $salariesPayableId, 'credit' => $summary['total_net_pay']],
                    ['chart_of_account_id' => $taxPayableId, 'credit' => $total_tax_and_other_deductions],
                 ]);

                $archive->update(['journal_entry_id' => $journalEntry->id]);
                $company->update(['payroll_last_closed_month' => $monthEndDate]);

                return $archive;
            });
            return response()->json(['message' => 'Payroll for ' . $monthEndDate->format('F Y') . ' closed and archived.', 'archive' => $archive], 201);

        } catch (Throwable $e) {
            Log::error('Failed to close payroll month: ' . $e->getMessage() . ' in ' . $e->getFile() . ' on line ' . $e->getLine());
             if (str_contains($e->getMessage(), 'Required accounting accounts')) {
                 return response()->json(['message' => $e->getMessage()], 422);
            }
             return response()->json(['message' => 'An unexpected error occurred while closing the payroll period.'], 500);
        }
    }


     /**
      * Get various payroll summaries for a specific archived month.
      * FIXED: Added robust checks and *completed* loan/advance summary logic.
      */
     public function getMonthlySummary(Request $request)
     {
         Gate::authorize('manage-payroll');

         $validated = $request->validate([
             'year' => 'required|integer|min:2000',
             'month' => 'required|integer|min:1|max:12',
         ]);

         $company_id = auth()->user()->company_id;
         $year = $validated['year'];
         $month = $validated['month'];
         $periodEnd = Carbon::create($year, $month, 1)->endOfMonth();

         $archive = PayrollArchive::where('company_id', $company_id)
             ->whereDate('report_period_end', $periodEnd->toDateString())
             ->first();

         if (!$archive) {
             return response()->json(['message' => 'No payroll archive found for the selected period.'], 404);
         }

         // --- Robust Payslip Decoding ---
         $payslips = [];
         $rawPayslipData = $archive->payslip_data;
         if (is_string($rawPayslipData)) { $payslips = json_decode($rawPayslipData, true) ?? []; }
         elseif (is_array($rawPayslipData) || is_object($rawPayslipData)) {
            $payslips = json_decode(json_encode($rawPayslipData), true) ?? [];
         }
         if (!empty($payslips) && !isset($payslips[0])){ $payslips = array_values($payslips); }
         // --- End Robust Payslip Decoding ---


         if (empty($payslips)) {
              return response()->json(['message' => 'Archive found, but contains no payslip details.'], 404);
         }

        // --- Fetch Employee Profiles ---
        $userIds = collect($payslips)->pluck('employee_id')->filter()->unique()->all();
        $profiles = User::whereIn('id', $userIds)
                        ->where('company_id', $company_id)
                        ->with('employeeProfile')
                        ->get()
                        ->keyBy('id');
        // --- End Fetch Employee Profiles ---


         // --- Calculate Summaries (with safe access) ---

         // 1. Bank Summary
         $bankSummary = collect($payslips)
             ->filter(fn($slip) => isset($slip['bank_details']))
             ->groupBy(function ($slip) {
                 return ((array)$slip['bank_details'])['bank_name'] ?? 'Unspecified Bank';
             })
             ->map(function ($group, $bankName) use ($profiles) {
                 return [
                     'bank_name' => $bankName,
                     'total_net_pay' => $group->sum(fn($s) => (float)($s['net_pay'] ?? 0)),
                     'employee_count' => $group->count(),
                     'details' => $group->map(function ($slip) use ($profiles) {
                         $userId = $slip['employee_id'] ?? null;
                         $profile = $userId ? $profiles->get($userId)?->employeeProfile : null;
                         return [
                             'employee_name' => $slip['employee_name'] ?? 'N/A',
                             'bank_branch' => $profile->bank_branch ?? 'N/A',
                             'account_number' => ((array)($slip['bank_details'] ?? []))['bank_account_number'] ?? 'N/A',
                             'net_pay' => (float)($slip['net_pay'] ?? 0)
                         ];
                     })->sortBy('employee_name')->values()->all(),
                 ];
             })->sortBy('bank_name')->values()->all();

         // 2. KRA (PAYE) Summary
         $kraDetails = collect($payslips)->map(function ($slip) use ($profiles) {
            $userId = $slip['employee_id'] ?? null;
            $profile = $userId ? $profiles->get($userId)?->employeeProfile : null;
            return [
                'employee_name' => $slip['employee_name'] ?? 'N/A',
                'kra_pin' => $profile->kra_pin ?? 'N/A',
                'amount' => (float)($slip['tax_paid'] ?? 0)
            ];
         })->where('amount', '>', 0)->sortBy('employee_name')->values()->all();
         $kraSummary = [
            'total_paye' => collect($kraDetails)->sum('amount'),
            'details' => $kraDetails
         ];


         // 3. NSSF Summary
         $nssfDetails = collect($payslips)->map(function ($slip) use ($profiles) {
             $userId = $slip['employee_id'] ?? null;
             $profile = $userId ? $profiles->get($userId)?->employeeProfile : null;
             $deductions = $slip['statutory_deductions'] ?? [];
             if (is_string($deductions)) { try { $deductions = json_decode($deductions, true) ?? []; } catch (\Exception $e) { $deductions = []; }}
             elseif (!is_array($deductions) && !is_object($deductions)) { $deductions = []; }
             $nssfAmount = (float)(((array)$deductions)['nssf'] ?? 0);
             return [
                 'employee_name' => $slip['employee_name'] ?? 'N/A',
                 'nssf_no' => $profile->nssf_no ?? 'N/A',
                 'amount' => $nssfAmount
             ];
         })->where('amount', '>', 0)->sortBy('employee_name')->values()->all();
         $nssfSummary = [
            'total_nssf' => collect($nssfDetails)->sum('amount'),
            'details' => $nssfDetails
         ];

         // 4. NHIF Summary
         $nhifDetails = collect($payslips)->map(function ($slip) use ($profiles) {
              $userId = $slip['employee_id'] ?? null;
              $profile = $userId ? $profiles->get($userId)?->employeeProfile : null;
              $deductions = $slip['statutory_deductions'] ?? [];
              if (is_string($deductions)) { try { $deductions = json_decode($deductions, true) ?? []; } catch (\Exception $e) { $deductions = []; }}
              elseif (!is_array($deductions) && !is_object($deductions)) { $deductions = []; }
              $nhifAmount = (float)(((array)$deductions)['nhif'] ?? 0);
              return [
                  'employee_name' => $slip['employee_name'] ?? 'N/A',
                  'nhif_no' => $profile->nhif_no ?? 'N/A',
                  'amount' => $nhifAmount
              ];
         })->where('amount', '>', 0)->sortBy('employee_name')->values()->all();
         $nhifSummary = [
            'total_nhif' => collect($nhifDetails)->sum('amount'),
            'details' => $nhifDetails
         ];

         // 5. Loan Summary
         $loanRepayments = collect($payslips)->filter(fn($slip) => (float)($slip['loan_repayment'] ?? 0) > 0);
         $loanSummary = [
            'total_repayment' => $loanRepayments->sum(fn($s)=>(float)($s['loan_repayment'] ?? 0)),
            'count' => $loanRepayments->count(),
            'details' => $loanRepayments->map(fn($slip) => [
                'employee_name' => $slip['employee_name'] ?? 'N/A',
                'amount' => (float)($slip['loan_repayment'] ?? 0)
            ])->sortBy('employee_name')->values()->all(),
         ];

         // 6. Advance Summary
         $advanceRepayments = collect($payslips)->filter(fn($slip) => (float)($slip['advance_repayment'] ?? 0) > 0);
         $advanceSummary = [
            'total_repayment' => $advanceRepayments->sum(fn($s)=>(float)($s['advance_repayment'] ?? 0)),
            'count' => $advanceRepayments->count(),
            'details' => $advanceRepayments->map(fn($slip) => [
                'employee_name' => $slip['employee_name'] ?? 'N/A',
                'amount' => (float)($slip['advance_repayment'] ?? 0)
            ])->sortBy('employee_name')->values()->all(),
         ];


         return response()->json([
             'report_period' => $periodEnd->format('F Y'),
             'bank_summary' => $bankSummary,
             'kra_summary' => $kraSummary,
             'nssf_summary' => $nssfSummary,
             'nhif_summary' => $nhifSummary,
             'loan_summary' => $loanSummary,
             'advance_summary' => $advanceSummary,
         ]);
     }


    // --- Report generation methods ---
    public function getBankPaymentList(Request $request, AccountingReportService $reportService)
    {
        Gate::authorize('manage-payroll');
        $validated = $request->validate(['pay_period_end' => 'required|date']);
        $endDate = Carbon::parse($validated['pay_period_end'])->endOfMonth();
        $reportData = $reportService->generateBankPaymentList(auth()->user()->company_id, $endDate);
        if (empty($reportData)) {
            return response()->json(['message' => 'No payslips found for the selected period.'], 404);
        }
        return response()->json($reportData);
    }

    public function getStatutoryReport(Request $request, AccountingReportService $reportService)
    {
        Gate::authorize('manage-payroll');
        $validated = $request->validate(['pay_period_end' => 'required|date']);
        $endDate = Carbon::parse($validated['pay_period_end'])->endOfMonth();
        $reportData = $reportService->generateStatutoryReport(auth()->user()->company_id, $endDate);
        if (empty($reportData)) {
            return response()->json(['message' => 'No payslips found for the selected period.'], 404);
        }
        return response()->json($reportData);
    }
}

