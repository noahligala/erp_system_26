<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class PermissionSeeder extends Seeder
{
    public function run()
    {
        // --------------------------------------------------------------------
        // 1. DEFINE ALL PERMISSIONS
        // --------------------------------------------------------------------
        $permissions = [
            'view-dashboard',

            // CORE DATA / CRM
            'view-customers',
            'manage-customers',
            'view-suppliers',
            'manage-suppliers',

            // INVENTORY / PRODUCTS
            'view-products',
            'manage-products',
            'manage-inventory',

            // ACCOUNTS RECEIVABLE
            'view-invoices',
            'create-invoices',
            'manage-invoices',
            'view-sales',
            'create-sales-payments',

            // ACCOUNTS PAYABLE
            'view-bills',
            'create-bills',
            'manage-bills',
            'manage-purchasing',

            // EXPENSE CLAIMS
            'view-expenses',
            'create-expenses',
            'manage-expenses',

            // CASH & BANK MANAGEMENT
            'manage-bank-reconciliation',
            'manage-payment-vouchers',

            // FINANCIAL REPORTING
            'view-financial-reports',
            'manage-financial-data',

            // FIXED ASSETS
            'view-assets',
            'manage-assets',
            'post-depreciation',

            // HRM
            'view-employees',
            'manage-employees',
            'process-payroll',
            'manage-leave',
            'apply-leave',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // --------------------------------------------------------------------
        // 2. ROLES AND PERMISSIONS
        // --------------------------------------------------------------------

        $allPermissions = Permission::all()->pluck('name')->toArray();

        $rolesWithPermissions = [

            // System Owner (full access)
            'OWNER' => $allPermissions,

            // Admin
            'ADMIN' => [
                'view-dashboard',
                'view-customers', 'manage-customers',
                'view-suppliers', 'manage-suppliers',
                'view-products', 'manage-products',
                'manage-inventory',
                'view-financial-reports',
                'manage-financial-data',
                'manage-bank-reconciliation',
                'manage-payment-vouchers',

                'view-invoices', 'create-invoices', 'manage-invoices',
                'view-bills', 'create-bills', 'manage-bills',
                'create-sales-payments',

                'view-employees', 'manage-employees',
                'process-payroll',
                'manage-leave',

                'view-assets', 'manage-assets', 'post-depreciation'
            ],

            // Finance Manager
            'FINANCE MANAGER' => [
                'view-dashboard',
                'view-customers', 'view-suppliers',
                'view-financial-reports',
                'manage-financial-data',
                'manage-bank-reconciliation',
                'manage-payment-vouchers',

                'view-invoices', 'create-invoices', 'manage-invoices',
                'view-bills', 'create-bills', 'manage-bills',
                'create-sales-payments',

                'view-assets',
                'post-depreciation',
            ],

            // Employee (basic staff)
            'EMPLOYEE' => [
                'view-dashboard',
                'create-expenses',
                'apply-leave',
                'view-employees'
            ],

            // User (system-level minimal role)
            'USER' => [
                'view-dashboard',
            ],
        ];

        foreach ($rolesWithPermissions as $roleName => $perms) {
            $role = Role::firstOrCreate(['name' => $roleName]);
            $role->syncPermissions($perms);
        }
    }
}
