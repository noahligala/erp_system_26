<?php

namespace App\Policies;

use App\Models\Accounts\Payslip;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PayslipPolicy
{
    use HandlesAuthorization;

    /**
     * Grant all permissions to Owners and Admins.
     */
    public function before(User $user, string $ability): bool|null
    {
        if ($user->hasAdminRole()) {
            return true;
        }
        return null;
    }

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('manage-payroll');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Payslip $payslip): bool
    {
        return $user->hasPermissionTo('manage-payroll') && $user->company_id === $payslip->company_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('manage-payroll');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Payslip $payslip): bool
    {
        return $user->hasPermissionTo('manage-payroll') && $user->company_id === $payslip->company_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Payslip $payslip): bool
    {
        return $user->hasPermissionTo('manage-payroll') && $user->company_id === $payslip->company_id;
    }
}

