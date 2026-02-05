<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class AccountingPolicy
{
    use HandlesAuthorization;

    /**
     * Grant all permissions to Owners and Admins before any other check.
     * This is the most reliable way to provide "super-admin" access.
     */
    public function before(User $user, string $ability): bool|null
    {
        if ($user->hasAdminRole()) {
            return true;
        }
        return null;
    }

    /**
     * Determine whether the user can view financial reports.
     */
    public function viewFinancialReports(User $user): bool
    {
        return $user->hasPermissionTo('view-financial-reports');
    }

    /**
     * Determine whether the user can manage payroll.
     */
    public function managePayroll(User $user): bool
    {
        return $user->hasPermissionTo('manage-payroll');
    }
}

