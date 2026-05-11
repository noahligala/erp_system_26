<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\EmployeeProfile;
use App\Models\LeaveType;
use App\Models\User;
use Carbon\Carbon;
use Faker\Factory as FakerFactory;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class LeaveSeeder extends Seeder
{
    protected string $leaveRequestTable = 'leave_requests';
    protected string $leaveTypeTable = 'leave_types';

    public function run(?Company $company = null): void
    {
        $leaveTable = $this->resolveLeaveTable();

        if (!$leaveTable) {
            $this->command?->warn('⚠️ Skipping LeaveSeeder: no supported leave request table found.');
            return;
        }

        $this->leaveRequestTable = $leaveTable;

        if (!Schema::hasTable('employee_profiles')) {
            $this->command?->warn('⚠️ Skipping LeaveSeeder: employee_profiles table does not exist.');
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

        $employeeProfiles = $this->getCompanyEmployeeProfiles($company);

        if ($employeeProfiles->isEmpty()) {
            $this->command?->warn("⚠️ Skipping leaves for {$company->name}: no employee profiles found.");
            return;
        }

        $approver = $this->getApproverForCompany($company, $employeeProfiles);

        $leaveTypes = $this->getLeaveTypesForCompany($company);

        if ($leaveTypes->isEmpty()) {
            $this->command?->warn("⚠️ Skipping leaves for {$company->name}: no leave types found.");
            return;
        }

        $employeeIdReference = $this->getForeignKeyReferenceTable($this->leaveRequestTable, 'employee_id');

        foreach ($employeeProfiles->take(min($employeeProfiles->count(), 35)) as $employeeProfile) {
            $employeeUser = $employeeProfile->user;

            if (!$employeeUser || (int) $employeeUser->company_id !== (int) $company->id) {
                continue;
            }

            $leaveApplications = rand(1, 4);

            for ($i = 0; $i < $leaveApplications; $i++) {
                $leaveType = $leaveTypes->random();

                $startDate = Carbon::now()
                    ->subMonths(rand(0, 8))
                    ->addDays(rand(1, 22))
                    ->startOfDay();

                $days = rand(1, min(10, max(1, (int) ($leaveType->default_days ?? 10))));
                $endDate = $this->addWeekdays($startDate, $days - 1);

                $desiredStatus = collect(['pending', 'approved', 'rejected'])->random();
                $status = $this->safeStatus($this->leaveRequestTable, 'status', $desiredStatus);

                $isApproved = in_array(strtolower($status), ['approved', 'accepted', 'completed'], true);
                $isRejected = in_array(strtolower($status), ['rejected', 'declined', 'cancelled', 'canceled'], true);

                $appliedAt = $startDate->copy()->subDays(rand(3, 14));

                $employeeIdValue = $this->resolveEmployeeIdValue(
                    employeeProfile: $employeeProfile,
                    employeeUser: $employeeUser,
                    referencedTable: $employeeIdReference
                );

                $payload = [
                    'company_id' => $company->id,

                    'user_id' => $employeeUser->id,
                    'employee_profile_id' => $employeeProfile->id,
                    'employee_id' => $employeeIdValue,

                    'leave_type_id' => $leaveType->id,
                    'type' => $leaveType->name,
                    'leave_type' => $leaveType->name,

                    'start_date' => $startDate->toDateString(),
                    'end_date' => $endDate->toDateString(),

                    'requested_days' => $days,
                    'days' => $days,
                    'number_of_days' => $days,
                    'duration' => $days,

                    'reason' => $faker->sentence(10),
                    'status' => $status,

                    'approved_by' => $isApproved ? $approver?->id : null,
                    'approved_at' => $isApproved ? $startDate->copy()->subDays(rand(1, 5)) : null,

                    'rejected_by' => $isRejected ? $approver?->id : null,
                    'rejected_at' => $isRejected ? $startDate->copy()->subDays(rand(1, 4)) : null,
                    'rejection_reason' => $isRejected ? $faker->sentence(8) : null,

                    'applied_at' => $appliedAt,
                    'created_at' => $appliedAt,
                    'updated_at' => now(),
                ];

                $data = $this->filterColumns($this->leaveRequestTable, $payload);

                if (!$this->hasRequiredEmployeeReference($data)) {
                    continue;
                }

                if ($this->wouldOverlapExistingRequest($employeeUser->id, $startDate, $endDate)) {
                    continue;
                }

                DB::table($this->leaveRequestTable)->insert($data);
            }
        }

        $this->command?->info("✅ Seeded leaves for employees under {$company->name}");
    }

    protected function getCompanyEmployeeProfiles(Company $company): EloquentCollection
    {
        return EmployeeProfile::query()
            ->with('user')
            ->whereHas('user', function ($query) use ($company) {
                $query->where('company_id', $company->id);
            })
            ->when(Schema::hasColumn('employee_profiles', 'status'), function ($query) {
                $query->whereIn('status', [
                    'active',
                    'probation',
                    'on_leave',
                    'ACTIVE',
                    'PROBATION',
                    'ON_LEAVE',
                ]);
            })
            ->get();
    }

    protected function getApproverForCompany(Company $company, EloquentCollection $employeeProfiles): ?User
    {
        return User::query()
            ->where('company_id', $company->id)
            ->whereIn('company_role', ['OWNER', 'ADMIN', 'MANAGER'])
            ->first()
            ?? $employeeProfiles->first()?->user;
    }

    protected function getLeaveTypesForCompany(Company $company)
    {
        if (!Schema::hasTable($this->leaveTypeTable)) {
            return collect();
        }

        return DB::table($this->leaveTypeTable)
            ->when(Schema::hasColumn($this->leaveTypeTable, 'company_id'), function ($query) use ($company) {
                $query->where(function ($q) use ($company) {
                    $q->where('company_id', $company->id)
                        ->orWhereNull('company_id');
                });
            })
            ->when(Schema::hasColumn($this->leaveTypeTable, 'is_active'), function ($query) {
                $query->where('is_active', true);
            })
            ->get();
    }

    protected function resolveEmployeeIdValue(
        EmployeeProfile $employeeProfile,
        User $employeeUser,
        ?string $referencedTable
    ): int {
        return match ($referencedTable) {
            'users' => $employeeUser->id,
            'employee_profiles' => $employeeProfile->id,
            'employees' => $employeeProfile->id,
            default => $employeeProfile->id,
        };
    }

    protected function hasRequiredEmployeeReference(array $data): bool
    {
        $hasUserIdColumn = Schema::hasColumn($this->leaveRequestTable, 'user_id');
        $hasEmployeeIdColumn = Schema::hasColumn($this->leaveRequestTable, 'employee_id');
        $hasEmployeeProfileIdColumn = Schema::hasColumn($this->leaveRequestTable, 'employee_profile_id');

        if (!$hasUserIdColumn && !$hasEmployeeIdColumn && !$hasEmployeeProfileIdColumn) {
            return true;
        }

        if ($hasUserIdColumn && !empty($data['user_id'])) {
            return true;
        }

        if ($hasEmployeeIdColumn && !empty($data['employee_id'])) {
            return true;
        }

        if ($hasEmployeeProfileIdColumn && !empty($data['employee_profile_id'])) {
            return true;
        }

        return false;
    }

    protected function wouldOverlapExistingRequest(int $userId, Carbon $startDate, Carbon $endDate): bool
    {
        if (!Schema::hasColumn($this->leaveRequestTable, 'user_id')) {
            return false;
        }

        if (!Schema::hasColumn($this->leaveRequestTable, 'start_date') || !Schema::hasColumn($this->leaveRequestTable, 'end_date')) {
            return false;
        }

        $query = DB::table($this->leaveRequestTable)
            ->where('user_id', $userId)
            ->whereDate('start_date', '<=', $endDate->toDateString())
            ->whereDate('end_date', '>=', $startDate->toDateString());

        if (Schema::hasColumn($this->leaveRequestTable, 'status')) {
            $query->whereIn(DB::raw('LOWER(status)'), [
                'pending',
                'requested',
                'submitted',
                'approved',
                'accepted',
                'completed',
            ]);
        }

        return $query->exists();
    }

    protected function addWeekdays(Carbon $startDate, int $additionalWeekdays): Carbon
    {
        $date = $startDate->copy();

        while ($additionalWeekdays > 0) {
            $date->addDay();

            if ($date->isWeekday()) {
                $additionalWeekdays--;
            }
        }

        return $date;
    }

    protected function resolveLeaveTable(): ?string
    {
        $candidates = [
            'leave_requests',
            'leave_applications',
            'leaves',
        ];

        foreach ($candidates as $table) {
            if (Schema::hasTable($table)) {
                return $table;
            }
        }

        return null;
    }

    protected function filterColumns(string $table, array $data): array
    {
        return collect($data)
            ->filter(fn ($value, $column) => Schema::hasColumn($table, $column))
            ->all();
    }

    protected function safeStatus(string $table, string $column, string $desired): string
    {
        if (!Schema::hasColumn($table, $column)) {
            return $desired;
        }

        $allowed = $this->getEnumValues($table, $column);

        if (empty($allowed)) {
            return $desired;
        }

        $lookup = collect($allowed)
            ->mapWithKeys(fn ($status) => [strtolower($status) => $status]);

        $candidates = match (strtolower($desired)) {
            'pending' => ['pending', 'requested', 'submitted', 'draft'],
            'approved' => ['approved', 'accepted', 'completed'],
            'rejected' => ['rejected', 'declined', 'cancelled', 'canceled'],
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
        } catch (\Throwable) {
            return [];
        }
    }

    protected function getForeignKeyReferenceTable(string $table, string $column): ?string
    {
        try {
            $row = DB::selectOne(
                "
                SELECT REFERENCED_TABLE_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = ?
                  AND TABLE_NAME = ?
                  AND COLUMN_NAME = ?
                  AND REFERENCED_TABLE_NAME IS NOT NULL
                LIMIT 1
                ",
                [DB::getDatabaseName(), $table, $column]
            );

            return $row?->REFERENCED_TABLE_NAME;
        } catch (\Throwable) {
            return null;
        }
    }
}
