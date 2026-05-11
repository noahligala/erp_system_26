<?php

namespace Database\Seeders;

use App\Models\Company;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Faker\Factory as FakerFactory;

class ApplicantSeeder extends Seeder
{
    public function run(?Company $company = null): void
    {
        if (!Schema::hasTable('applicants')) {
            $this->command?->warn('⚠️ Skipping ApplicantSeeder: applicants table does not exist.');
            return;
        }

        if (!Schema::hasTable('job_openings')) {
            $this->command?->warn('⚠️ Skipping ApplicantSeeder: job_openings table does not exist.');
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
        $faker = FakerFactory::create();

        $openings = DB::table('job_openings')
            ->where('company_id', $company->id)
            ->get();

        if ($openings->isEmpty()) {
            $this->command?->warn("⚠️ Skipping applicants for {$company->name}: no job openings found.");
            return;
        }

        foreach ($openings as $opening) {
            $applicantCount = rand(4, 14);

            for ($i = 0; $i < $applicantCount; $i++) {
                $firstName = $faker->firstName();
                $lastName = $faker->lastName();

                $appliedAt = Carbon::parse($opening->posted_date ?? now())
                    ->addDays(rand(1, 18))
                    ->setTime(rand(8, 17), rand(0, 59));

                $status = $this->safeStatus(
                    'applicants',
                    'status',
                    collect(['new', 'reviewing', 'shortlisted', 'interviewed', 'rejected'])->random()
                );

                $data = [
                    'company_id' => $company->id,
                    'job_opening_id' => $opening->id,

                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'name' => "{$firstName} {$lastName}",

                    'email' => strtolower($firstName . '.' . $lastName . rand(10, 99) . '@example.com'),
                    'phone' => '+2547' . rand(10000000, 99999999),

                    'cover_letter' => $faker->paragraph(4),
                    'resume_path' => 'seeded/resumes/' . strtolower($firstName . '-' . $lastName) . '.pdf',

                    'status' => $status,
                    'source' => collect(['Website', 'LinkedIn', 'Referral', 'Walk-in', 'Job Board'])->random(),
                    'expected_salary' => rand(35000, 220000),
                    'notes' => $faker->optional(0.6)->sentence(),

                    'applied_at' => $appliedAt,
                    'created_at' => $appliedAt,
                    'updated_at' => now(),
                ];

                $data = $this->filterColumns('applicants', $data);

                DB::table('applicants')->insert($data);
            }
        }

        $this->command?->info("✅ Seeded applicants for {$company->name}");
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
            'new' => ['new', 'pending', 'applied', 'received'],
            'reviewing' => ['reviewing', 'review', 'in_review', 'pending'],
            'shortlisted' => ['shortlisted', 'selected', 'approved'],
            'interviewed' => ['interviewed', 'interview', 'shortlisted'],
            'rejected' => ['rejected', 'declined'],
            'hired' => ['hired', 'accepted', 'approved'],
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
