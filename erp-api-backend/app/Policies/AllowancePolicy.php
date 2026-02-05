<?php

namespace App\Policies;

use App\Models\Allowance;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class AllowancePolicy
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
        // Any user can see the available allowances in their company.
        return !is_null($user->company_id);
    }

    /**
     * Determine whether the user can create, update, or delete models.
     */
    public function manage(User $user): bool
    {
        // Check for a specific permission to manage allowances.
        return $user->hasPermissionTo('manage-allowances');
    }
}
