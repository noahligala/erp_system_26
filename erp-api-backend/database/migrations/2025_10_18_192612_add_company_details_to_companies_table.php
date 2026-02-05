<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
{
    Schema::table('companies', function (Blueprint $table) {
        $table->string('registration_number')->nullable()->after('is_active');
        $table->string('kra_pin')->nullable()->after('registration_number');
        $table->string('nhif_number')->nullable()->after('kra_pin');
        $table->string('nssf_number')->nullable()->after('nhif_number');
        $table->string('phone')->nullable()->after('nssf_number');
        $table->string('email')->nullable()->after('phone');
        $table->string('address')->nullable()->after('email');
        $table->string('city')->nullable()->after('address');
        $table->string('country')->nullable()->after('city');
    });
}

public function down(): void
{
    Schema::table('companies', function (Blueprint $table) {
        $table->dropColumn([
            'registration_number',
            'kra_pin',
            'nhif_number',
            'nssf_number',
            'phone',
            'email',
            'address',
            'city',
            'country',
        ]);
    });
}
};
