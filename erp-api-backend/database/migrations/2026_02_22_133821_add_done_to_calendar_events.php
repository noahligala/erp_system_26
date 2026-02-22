<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void {
    Schema::table('events', function (Blueprint $table) {
      $table->boolean('is_done')->default(false)->after('color');
      $table->timestamp('done_at')->nullable()->after('is_done');
      $table->unsignedBigInteger('done_by')->nullable()->after('done_at');

      // reminder fields (if you haven't added them yet)
      $table->integer('reminder_minutes_before')->nullable()->after('done_by');
      $table->timestamp('remind_at')->nullable()->after('reminder_minutes_before');
      $table->timestamp('reminded_at')->nullable()->after('remind_at');
      $table->boolean('remind_in_app')->default(true)->after('reminded_at');
      $table->boolean('remind_email')->default(false)->after('remind_in_app');
    });
  }

  public function down(): void {
    Schema::table('calendar_events', function (Blueprint $table) {
      $table->dropColumn([
        'is_done','done_at','done_by',
        'reminder_minutes_before','remind_at','reminded_at','remind_in_app','remind_email'
      ]);
    });
  }
};
