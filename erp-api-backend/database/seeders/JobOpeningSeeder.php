<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Department;
use App\Models\JobTitle;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class JobOpeningSeeder extends Seeder
{
    public function run(?Company $company = null): void
    {
        if (!Schema::hasTable('job_openings')) {
            $this->command?->warn('⚠️ Skipping JobOpeningSeeder: job_openings table does not exist.');
            return;
        }

        $companies = $company
            ? collect([$company])
            : Company::query()->get();

        foreach ($companies as $company) {
            $this->seedForCompany($company);
        }
    }

    protected function seedForCompany(Company $company): void
    {
        $departments = Department::where('company_id', $company->id)->get();
        $jobTitles = JobTitle::where('company_id', $company->id)->get();

        if ($departments->isEmpty() || $jobTitles->isEmpty()) {
            $this->command?->warn("⚠️ Skipping job openings for {$company->name}: missing departments or job titles.");
            return;
        }

        $creator = User::where('company_id', $company->id)
            ->whereIn('company_role', ['OWNER', 'ADMIN', 'MANAGER'])
            ->first()
            ?? User::where('company_id', $company->id)->first();

        $industry = strtolower((string) ($company->industry ?? 'generic'));

        $openings = $this->openingTemplates($industry);

        foreach ($openings as $index => $template) {
            $department = $departments->random();
            $jobTitle = $jobTitles->random();

            $postedDate = Carbon::now()
                ->subDays(rand(5, 60))
                ->startOfDay();

            $closingDate = $postedDate
                ->copy()
                ->addDays(rand(21, 45))
                ->endOfDay();

            $status = $this->safeStatus('job_openings', 'status', $index < 4 ? 'open' : 'draft');

            $data = [
                'company_id' => $company->id,
                'title' => $template['title'] ?? $jobTitle->name,
                'description' => $template['description'],
                'department_id' => $department->id,
                'department' => $department->name,
                'location' => $company->city ?: 'Nairobi',
                'type' => $template['type'] ?? 'Full-time',
                'requirements' => $template['requirements'],
                'benefits' => $template['benefits'],
                'positions_to_fill' => rand(1, 4),
                'posted_date' => $postedDate->toDateString(),
                'closing_date' => $closingDate->toDateString(),
                'status' => $status,
                'created_by' => $creator?->id,
                'user_id' => $creator?->id,
                'created_at' => $postedDate,
                'updated_at' => now(),
            ];

            $data = $this->filterColumns('job_openings', $data);

            DB::table('job_openings')->updateOrInsert(
                [
                    'company_id' => $company->id,
                    'title' => $data['title'],
                ],
                $data
            );
        }

        $this->command?->info("✅ Seeded job openings for {$company->name}");
    }

    protected function openingTemplates(string $industry): array
    {
        return match ($industry) {
            'lawfirm' => [
                [
                    'title' => 'Litigation Associate',
                    'type' => 'Full-time',
                    'description' => 'Represent clients in civil litigation, prepare pleadings, conduct legal research, and support court proceedings.',
                    'requirements' => 'LLB degree, advocate admission preferred, strong drafting and litigation experience.',
                    'benefits' => 'Medical cover, professional development, performance bonus.',
                ],
                [
                    'title' => 'Legal Clerk',
                    'type' => 'Full-time',
                    'description' => 'Support case filing, document preparation, diary management, and client communication.',
                    'requirements' => 'Diploma or degree in law, strong organization skills, court filing experience preferred.',
                    'benefits' => 'Training, transport allowance, leave benefits.',
                ],
            ],

            'school' => [
                [
                    'title' => 'Mathematics Teacher',
                    'type' => 'Full-time',
                    'description' => 'Teach mathematics, prepare lesson plans, assess learners, and support academic programs.',
                    'requirements' => 'Teaching qualification, TSC registration preferred, strong classroom management.',
                    'benefits' => 'Medical cover, school meals, training.',
                ],
                [
                    'title' => 'School Administrator',
                    'type' => 'Full-time',
                    'description' => 'Support admissions, parent communication, records, and school operations.',
                    'requirements' => 'Administration experience, computer literacy, strong communication skills.',
                    'benefits' => 'Leave benefits, staff welfare, training.',
                ],
            ],

            'hospital' => [
                [
                    'title' => 'Registered Nurse',
                    'type' => 'Full-time',
                    'description' => 'Provide patient care, administer medication, maintain records, and support clinical operations.',
                    'requirements' => 'Nursing qualification, valid license, clinical experience preferred.',
                    'benefits' => 'Medical cover, shift allowance, professional training.',
                ],
                [
                    'title' => 'Lab Technician',
                    'type' => 'Full-time',
                    'description' => 'Conduct laboratory tests, maintain equipment, and support diagnostic services.',
                    'requirements' => 'Diploma in medical laboratory science, valid certification, attention to detail.',
                    'benefits' => 'Medical cover, training, leave benefits.',
                ],
            ],

            'supermarket' => [
                [
                    'title' => 'Cashier',
                    'type' => 'Full-time',
                    'description' => 'Process customer payments, maintain till accuracy, and deliver excellent customer service.',
                    'requirements' => 'Cash handling experience, honesty, good communication.',
                    'benefits' => 'Staff discount, meals allowance, leave benefits.',
                ],
                [
                    'title' => 'Stock Controller',
                    'type' => 'Full-time',
                    'description' => 'Manage stock levels, receive goods, reconcile inventory, and support procurement.',
                    'requirements' => 'Inventory experience, attention to detail, computer literacy.',
                    'benefits' => 'Staff discount, training, performance bonus.',
                ],
            ],

            default => [
                [
                    'title' => 'Finance Officer',
                    'type' => 'Full-time',
                    'description' => 'Support accounting operations, reconciliations, payroll, reporting, and financial controls.',
                    'requirements' => 'Accounting qualification, ERP experience, attention to detail.',
                    'benefits' => 'Medical cover, professional development, leave benefits.',
                ],
                [
                    'title' => 'Operations Assistant',
                    'type' => 'Full-time',
                    'description' => 'Support daily operations, coordination, reporting, and customer service.',
                    'requirements' => 'Strong communication, computer literacy, organization skills.',
                    'benefits' => 'Training, leave benefits, staff welfare.',
                ],
                [
                    'title' => 'Sales Executive',
                    'type' => 'Full-time',
                    'description' => 'Generate leads, manage customer relationships, close sales, and prepare sales reports.',
                    'requirements' => 'Sales experience, negotiation skills, CRM knowledge preferred.',
                    'benefits' => 'Commission, transport allowance, performance bonus.',
                ],
                [
                    'title' => 'HR Assistant',
                    'type' => 'Full-time',
                    'description' => 'Support recruitment, employee records, leave tracking, and HR administration.',
                    'requirements' => 'HR qualification, confidentiality, strong administrative skills.',
                    'benefits' => 'Training, leave benefits, medical cover.',
                ],
            ],
        };
    }

    protected function filterColumns(string $table, array $data): array
    {
        return collect($data)
            ->filter(fn ($value, $column) => Schema::hasColumn($table, $column))
            ->all();
    }

    protected function safeStatus(string $table, string $column, string $desired): string
    {
        $allowed = $this->getEnumValues($table, $column);

        if (empty($allowed)) {
            return $desired;
        }

        $lookup = collect($allowed)
            ->mapWithKeys(fn ($status) => [strtolower($status) => $status]);

        $candidates = match (strtolower($desired)) {
            'open' => ['open', 'active', 'published', 'approved'],
            'draft' => ['draft', 'pending', 'inactive', 'open'],
            'closed' => ['closed', 'inactive', 'filled'],
            default => [$desired],
        };

        foreach ($candidates as $candidate) {
            if ($lookup->has(strtolower($candidate))) {
                return $lookup->get(strtolower($candidate));
            }
        }

        return $allowed[0];
    }

    protected function getEnumValues(string $table, string $column): array
    {
        try {
            $row = DB::selectOne(
                "
                SELECT COLUMN_TYPE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = ?
                  AND TABLE_NAME = ?
                  AND COLUMN_NAME = ?
                ",
                [DB::getDatabaseName(), $table, $column]
            );

            if (!$row || !isset($row->COLUMN_TYPE)) {
                return [];
            }

            $columnType = strtolower($row->COLUMN_TYPE);

            if (!str_starts_with($columnType, 'enum(')) {
                return [];
            }

            preg_match_all("/'([^']*)'/", $row->COLUMN_TYPE, $matches);

            return $matches[1] ?? [];
        } catch (\Throwable $e) {
            return [];
        }
    }
}
