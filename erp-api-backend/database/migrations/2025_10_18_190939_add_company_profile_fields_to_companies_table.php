<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->string('logo')->nullable()->after('is_active');
            $table->string('po_box')->nullable()->after('logo');
            $table->string('tel_number')->nullable()->after('po_box');
            $table->string('email_address')->nullable()->after('tel_number');
            $table->string('tagline')->nullable()->after('email_address');
            $table->string('website_url')->nullable()->after('tagline');
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn(['logo', 'po_box', 'tel_number', 'email_address', 'tagline', 'website_url']);
        });
    }
};
