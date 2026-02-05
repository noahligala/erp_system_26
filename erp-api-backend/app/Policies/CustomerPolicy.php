<?php

namespace App\Policies;

use App\Models\CRM\Customer;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class CustomerPolicy
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
        // *** 💡 THE FIX ***
        // Allow any authenticated user in the company to view the customer list.
        // This is safe because your controllers/scopes already limit by company_id.
        return !is_null($user->company_id);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Customer $customer): bool
    {
        return $user->company_id === $customer->company_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Keep creation restricted
        return $user->hasPermissionTo('manage-customers');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Customer $customer): bool
    {
        // Keep updates restricted
        return $user->hasPermissionTo('manage-customers') && $user->company_id === $customer->company_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Customer $customer): bool
    {
        // Keep deletions restricted
        return $user->hasPermissionTo('manage-customers') && $user->company_id === $customer->company_id;
    }
}
