<?php

namespace App\Policies;

use App\Models\JobTitle;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class JobTitlePolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // Any authenticated user can view the list of job titles in their own company.
        return !is_null($user->company_id);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, JobTitle $jobTitle): bool
    {
        // A user can view a job title if it belongs to their company.
        return $user->company_id === $jobTitle->company_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Only Owners or Admins can create new job titles.
        return in_array($user->company_role, ['OWNER', 'ADMIN']);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, JobTitle $jobTitle): bool
    {
        // An Owner/Admin can update a job title if it belongs to their company.
        return in_array($user->company_role, ['OWNER', 'ADMIN'])
            && $user->company_id === $jobTitle->company_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, JobTitle $jobTitle): bool
    {
        // An Owner/Admin can delete a job title if it belongs to their company.
        return in_array($user->company_role, ['OWNER', 'ADMIN'])
            && $user->company_id === $jobTitle->company_id;
    }
}

