<?php

namespace App\Policies;

use App\Models\Inventory\SalesOrder;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class SalesOrderPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('view-sales');
    }

    public function view(User $user, SalesOrder $salesOrder): bool
    {
        return $user->hasPermissionTo('view-sales') && $user->company_id === $salesOrder->company_id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('create-sale');
    }

    public function update(User $user, SalesOrder $salesOrder): bool
    {
        return $user->hasPermissionTo('edit-sale') && $user->company_id === $salesOrder->company_id;
    }
}

