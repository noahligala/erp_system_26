<?php

namespace App\Policies;

use App\Models\Inventory\Product;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ProductPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // Any authenticated user can view the list of products in their own company.
        return !is_null($user->company_id);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Product $product): bool
    {
        // A user can view a product if it belongs to their company.
        return $user->company_id === $product->company_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Only Owners or Admins can create new products.
        return in_array($user->company_role, ['OWNER', 'ADMIN']);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Product $product): bool
    {
        // An Owner/Admin can update a product if it belongs to their company.
        return in_array($user->company_role, ['OWNER', 'ADMIN'])
            && $user->company_id === $product->company_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Product $product): bool
    {
        // An Owner/Admin can delete a product if it belongs to their company.
        return in_array($user->company_role, ['OWNER', 'ADMIN'])
            && $user->company_id === $product->company_id;
    }
}
