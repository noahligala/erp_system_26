<?php

namespace Database\Seeders;

use App\Models\Accounts\ChartOfAccount;
use App\Models\Company;
use Illuminate\Database\Seeder;

class CompanyDefaultAccountsSeeder extends Seeder
{
    public function run(Company $company = null): void
    {
        // If run directly without args, seed for all companies
        if (!$company) {
            $companies = Company::all();
            foreach ($companies as $c) {
                $this->createDefaultsForCompany($c);
            }
            return;
        }

        $this->createDefaultsForCompany($company);
    }

    public function createDefaultsForCompany(Company $company)
    {
        // Standard Chart of Accounts with Subtypes required for Reporting
        $accounts = [
            // --- ASSETS ---
            [
                'code' => '1000', 'name' => 'Cash', 'type' => 'Asset',
                'subtype' => 'asset_cash', // 💡 Critical for Cash Flow
                'desc' => 'Cash on hand'
            ],
            [
                'code' => '1010', 'name' => 'Petty Cash', 'type' => 'Asset',
                'subtype' => 'asset_cash',
                'desc' => 'Small incidental expenses'
            ],
            [
                'code' => '1050', 'name' => 'Bank Account', 'type' => 'Asset',
                'subtype' => 'asset_cash',
                'desc' => 'Primary business bank account'
            ],
            [
                'code' => '1100', 'name' => 'Accounts Receivable', 'type' => 'Asset',
                'subtype' => 'asset_receivable', // 💡 Critical for AR Aging
                'desc' => 'Money owed by customers'
            ],
            [
                'code' => '1200', 'name' => 'Inventory', 'type' => 'Asset',
                'subtype' => 'asset_inventory', // 💡 Critical for Quick Ratio
                'desc' => 'Stock on hand'
            ],
            [
                'code' => '1300', 'name' => 'Prepaid Expenses', 'type' => 'Asset',
                'subtype' => 'asset_prepaid',
                'desc' => 'Payments made in advance'
            ],
            [
                'code' => '1500', 'name' => 'Property, Plant & Equipment', 'type' => 'Asset',
                'subtype' => 'asset_fixed', // 💡 Critical for Investing Cash Flow
                'desc' => 'Fixed assets'
            ],
            [
                'code' => '1590', 'name' => 'Accumulated Depreciation', 'type' => 'Asset',
                'subtype' => 'contra_asset_depreciation', // 💡 Critical: Added back to Operating Cash Flow
                'desc' => 'Total depreciation allocated to assets'
            ],

            // --- LIABILITIES ---
            [
                'code' => '2000', 'name' => 'Accounts Payable', 'type' => 'Liability',
                'subtype' => 'liability_payable', // 💡 Critical for AP Aging
                'desc' => 'Money owed to suppliers'
            ],
            [
                'code' => '2100', 'name' => 'VAT Payable', 'type' => 'Liability',
                'subtype' => 'liability_tax_payable',
                'desc' => 'Value Added Tax collected'
            ],
            [
                'code' => '2200', 'name' => 'Salaries Payable', 'type' => 'Liability',
                'subtype' => 'liability_payable',
                'desc' => 'Net salaries owed to employees'
            ],
            [
                'code' => '2250', 'name' => 'Tax Payable', 'type' => 'Liability',
                'subtype' => 'liability_tax_payable',
                'desc' => 'Payroll taxes (PAYE) or Income Tax'
            ],
            [
                'code' => '2300', 'name' => 'Unearned Revenue', 'type' => 'Liability',
                'subtype' => 'liability_unearned_revenue',
                'desc' => 'Money received for services not yet performed'
            ],
            [
                'code' => '2500', 'name' => 'Long-Term Debt', 'type' => 'Liability',
                'subtype' => 'liability_long_term_debt', // 💡 Critical for Financing Cash Flow
                'desc' => 'Loans due after 1 year'
            ],

            // --- EQUITY ---
            [
                'code' => '3000', 'name' => 'Owner’s Capital', 'type' => 'Equity',
                'subtype' => 'equity_capital', // 💡 Critical for Financing Cash Flow
                'desc' => 'Capital invested by owners'
            ],
            [
                'code' => '3100', 'name' => 'Retained Earnings', 'type' => 'Equity',
                'subtype' => 'equity_retained_earnings',
                'desc' => 'Accumulated net income'
            ],
            [
                'code' => '3200', 'name' => 'Opening Balance Equity', 'type' => 'Equity',
                'subtype' => 'equity_capital',
                'desc' => 'Offset for initial data import'
            ],
            [
                'code' => '3300', 'name' => 'Dividends Paid', 'type' => 'Equity',
                'subtype' => 'equity_dividends',
                'desc' => 'Distributions to owners'
            ],

            // --- REVENUE ---
            [
                'code' => '4000', 'name' => 'Sales Revenue', 'type' => 'Revenue',
                'subtype' => 'revenue_sales',
                'desc' => 'Income from goods sold'
            ],
            [
                'code' => '4100', 'name' => 'Service Revenue', 'type' => 'Revenue',
                'subtype' => 'revenue_sales',
                'desc' => 'Income from services rendered'
            ],
            [
                'code' => '4200', 'name' => 'Other Income', 'type' => 'Revenue',
                'subtype' => 'revenue_other',
                'desc' => 'Interest, Gains, etc.'
            ],

            // --- EXPENSES ---
            [
                'code' => '5000', 'name' => 'Cost of Goods Sold', 'type' => 'Expense',
                'subtype' => 'expense_cogs', // 💡 Critical for Gross Margin
                'desc' => 'Direct costs of goods sold'
            ],
            [
                'code' => '6000', 'name' => 'Rent Expense', 'type' => 'Expense',
                'subtype' => 'expense_operating',
                'desc' => 'Office or facility rent'
            ],
            [
                'code' => '6100', 'name' => 'Salaries Expense', 'type' => 'Expense',
                'subtype' => 'expense_operating',
                'desc' => 'Gross salaries and wages'
            ],
            [
                'code' => '6200', 'name' => 'Utilities Expense', 'type' => 'Expense',
                'subtype' => 'expense_operating',
                'desc' => 'Water, electricity, internet'
            ],
            [
                'code' => '6300', 'name' => 'Depreciation Expense', 'type' => 'Expense',
                'subtype' => 'expense_operating',
                'desc' => 'Depreciation for the period'
            ],
            [
                'code' => '6400', 'name' => 'Bank Fees', 'type' => 'Expense',
                'subtype' => 'expense_operating',
                'desc' => 'Service charges'
            ],
        ];

        foreach ($accounts as $acc) {
            ChartOfAccount::firstOrCreate(
                [
                    'company_id' => $company->id,
                    'account_code' => $acc['code']
                ],
                [
                    'account_name' => $acc['name'],
                    'account_type' => $acc['type'],
                    'account_subtype' => $acc['subtype'], // 💡 Saving the subtype
                    'description' => $acc['desc'],
                    'is_system' => true, // Mark as system defaults
                ]
            );
        }
    }
}
