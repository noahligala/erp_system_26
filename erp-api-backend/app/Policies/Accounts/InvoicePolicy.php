<?php

namespace App\Policies\Accounts;

use App\Models\Accounts\Invoice;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class InvoicePolicy
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
     * Determine whether the user can view any models (Invoice List).
     * This is the check for GET /invoices.
     */
    public function viewAny(User $user): bool
    {
        // Any user with 'view-invoices' permission can see the list.
        return $user->hasPermissionTo('view-invoices');
    }

    /**
     * Determine whether the user can view the specific model.
     */
    public function view(User $user, Invoice $invoice): bool
    {
        // User can view if they own the invoice's company.
        return $user->company_id === $invoice->company_id;
    }

    /**
     * Determine whether the user can create models.
     * This is the check for POST /invoices.
     */
    public function create(User $user): bool
    {
        // Requires permission to manage/create sales or invoices.
        return $user->hasPermissionTo('create-invoices');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Invoice $invoice): bool
    {
        // Requires permission AND company ownership.
        return $user->hasPermissionTo('manage-invoices') && $user->company_id === $invoice->company_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Invoice $invoice): bool
    {
        return $user->hasPermissionTo('manage-invoices') && $user->company_id === $invoice->company_id;
    }
}
