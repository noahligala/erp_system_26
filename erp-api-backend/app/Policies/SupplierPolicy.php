<?php

namespace App\Policies;

use App\Models\Supplier;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class SupplierPolicy
{
    use HandlesAuthorization;

    public function before(User $user, string $ability): bool|null
    {
        if ($user->hasAdminRole()) {
            return true;
        }
        return null;
    }

    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('manage-purchasing');
    }

    public function view(User $user, Supplier $supplier): bool
    {
        return $user->hasPermissionTo('manage-purchasing') && $user->company_id === $supplier->company_id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('manage-purchasing');
    }

    public function update(User $user, Supplier $supplier): bool
    {
        return $user->hasPermissionTo('manage-purchasing') && $user->company_id === $supplier->company_id;
    }

    public function delete(User $user, Supplier $supplier): bool
    {
        return $user->hasPermissionTo('manage-purchasing') && $user->company_id === $supplier->company_id;
    }
}
