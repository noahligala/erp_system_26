<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class DispatchCalendarReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:dispatch-calendar-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Command description';

    /**
     * Execute the console command.
     */
   // php artisan make:command DispatchCalendarReminders
    public function handle()
    {
        $now = now();

        $events = \App\Models\Calendar\Event::query()
            ->whereNotNull('remind_at')
            ->whereNull('reminded_at')
            ->where('remind_at', '<=', $now)
            ->where('start', '>=', $now->copy()->subDays(1)) // safety window
            ->get();

        foreach ($events as $event) {
            // Decide recipients: personal event -> owner only, company event -> all users in company
            $recipients = $event->user_id
                ? \App\Models\User::whereKey($event->user_id)->get()
                : \App\Models\User::where('company_id', $event->company_id)->get();

            foreach ($recipients as $user) {
                $user->notify(new \App\Notifications\CalendarEventReminderNotification($event));
            }

            $event->update(['reminded_at' => $now]);
        }

        return self::SUCCESS;
    }
}
