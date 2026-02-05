<?php
namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model)
    {
        // Only apply the scope if a user is logged in AND belongs to a company
        if (Auth::check() && Auth::user()->company_id) {
            $builder->where('company_id', Auth::user()->company_id);
        }
    }
}
