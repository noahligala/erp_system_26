<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @param Company $company The company to seed departments for.
     * @return void
     */
    public function run(Company $company): void
    {
        $departments = [
            ['name' => 'General Management', 'description' => 'Oversees all company operations.'],
            ['name' => 'Sales & Marketing', 'description' => 'Responsible for revenue generation and promotion.'],
            ['name' => 'Operations', 'description' => 'Handles the day-to-day core business activities.'],
            ['name' => 'Human Resources', 'description' => 'Manages employee relations, hiring, and compliance.'],
            ['name' => 'Finance & Accounting', 'description' => 'Manages company finances, payroll, and reporting.'],
        ];

        foreach ($departments as $department) {
            Department::create(array_merge($department, ['company_id' => $company->id]));
        }
    }
}
