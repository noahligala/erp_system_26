<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class LoanAndAdvancePolicy
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
     * Determine whether the user can manage loans and advances.
     */
    public function manage(User $user): bool
    {
        return $user->hasPermissionTo('manage-loans-advances');
    }

    /**
     * Determine whether a user can view their own loans/advances.
     */
    public function viewOwn(User $user, User $model): bool
    {
        return $user->id === $model->id;
    }
}
