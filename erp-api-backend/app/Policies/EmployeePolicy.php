<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class EmployeePolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // Any authenticated user can view the list of employees in their own company.
        return !is_null($user->company_id);
    }

    /**
     * Determine whether the user can view a specific employee's profile.
     */
    public function view(User $user, User $model): bool
    {
        return $user->company_id === $model->company_id;
    }

    /**
     * Determine whether the user can create models (hire employees).
     */
    public function create(User $user): bool
    {
        // Add this line for debugging
        // dd($user->hasAdminRole(), $user->company_role);
        // Only Owners or Admins can hire new employees.
        return $user->hasAdminRole();
    }

    /**
     * Determine whether an employee can update their own personal profile details.
     */
    public function updateProfile(User $user, User $model): bool
    {
        // An Owner/Admin can update anyone's profile, OR a user can update their own.
        return $user->hasAdminRole() || $user->id === $model->id;
    }

    /**
     * Determine whether a user can change an employee's department (transfer).
     */
    public function changeDepartment(User $user, User $model): bool
    {
        // An Owner/Admin can transfer anyone, OR a supervisor can transfer an employee.
        return $user->hasAdminRole() || ($user->isSupervisor() && $user->company_id === $model->company_id);
    }

    /**
     * Determine whether a user can change an employee's status to 'suspended'.
     */
    public function suspend(User $user, User $model): bool
    {
        // An Owner/Admin can suspend anyone, OR a supervisor can suspend an employee.
        return $user->hasAdminRole() || ($user->isSupervisor() && $user->company_id === $model->company_id);
    }

    /**
     * Determine whether a user can change salary or job title (promote/demote).
     */
    public function changeSalaryAndTitle(User $user, User $model): bool
    {
        // Only Owners or Admins can perform this action.
        return $user->hasAdminRole();
    }

    /**
     * Determine whether the user can terminate the employee.
     */
    public function terminate(User $user, User $model): bool
    {
        // Only an Owner/Admin can terminate an employee.
        if (!$user->hasAdminRole()) {
            return false;
        }

        // Additional checks: ensure they are in the same company, not deleting self, and not deleting another owner.
        return $user->company_id === $model->company_id
            && $user->id !== $model->id
            && $model->company_role !== 'OWNER';
    }
}

