<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'view-customers', 'view-suppliers', 'manage-suppliers', 'view-invoices',
            'create-invoices', 'manage-invoices', 'view-sales', 'view-purchasing',
            'view-products', 'manage-inventory', 'manage-financial-data', 'view-employees',
            'manage-employees', 'manage-leave', 'apply-leave', 'manage-recruitment',
            'view-recruitment', 'manage-departments', 'manage-job-titles',
            'manage-settings', 'manage-users',
        ];

        foreach ($permissions as $permissionName) {
            Permission::firstOrCreate(
                ['name' => $permissionName, 'guard_name' => 'web'],
                ['name' => $permissionName, 'guard_name' => 'web']
            );
        }

        $adminRole = Role::where('name', 'Admin')->orWhere('name', 'Owner')->first();
        if ($adminRole) {
            $adminRole->givePermissionTo($permissions);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'view-customers', 'view-suppliers', 'manage-suppliers', 'view-invoices',
            'create-invoices', 'manage-invoices', 'view-sales', 'view-purchasing',
            'view-products', 'manage-inventory', 'manage-financial-data', 'view-employees',
            'manage-employees', 'manage-leave', 'apply-leave', 'manage-recruitment',
            'view-recruitment', 'manage-departments', 'manage-job-titles',
            'manage-settings', 'manage-users',
        ];

        foreach ($permissions as $permissionName) {
            $permission = Permission::where('name', $permissionName, 'guard_name', 'web')->first();
            if ($permission) {
                $roles = Role::permission($permission)->get();
                foreach($roles as $role) {
                    $role->revokePermissionTo($permission);
                }
                $permission->delete();
            }
        }
    }
};
