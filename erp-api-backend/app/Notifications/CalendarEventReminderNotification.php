<?php

namespace App\Notifications;

use App\Models\Calendar\Event;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class CalendarEventReminderNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Event $event) {}

    public function via($notifiable): array
    {
        $channels = [];
        if ($this->event->remind_in_app) $channels[] = 'database';
        if ($this->event->remind_email) $channels[] = 'mail';
        return $channels;
    }

    public function toDatabase($notifiable): array
    {
        return [
            'type' => 'calendar.reminder',
            'event_id' => $this->event->id,
            'title' => $this->event->title,
            'start' => optional($this->event->start)?->toIso8601String(),
            'end' => optional($this->event->end)?->toIso8601String(),
            'all_day' => (bool) $this->event->all_day,
            'location' => $this->event->location,
            'remind_at' => optional($this->event->remind_at)?->toIso8601String(),
        ];
    }

    public function toMail($notifiable): MailMessage
    {
        $start = optional($this->event->start)?->format('D, M j Y H:i');

        return (new MailMessage)
            ->subject("Reminder: {$this->event->title}")
            ->greeting("Hello {$notifiable->name},")
            ->line("This is a reminder for: {$this->event->title}")
            ->when($start, fn ($m) => $m->line("Start: {$start}"))
            ->when($this->event->location, fn ($m) => $m->line("Location: {$this->event->location}"))
            ->when($this->event->description, fn ($m) => $m->line($this->event->description));
    }
}
