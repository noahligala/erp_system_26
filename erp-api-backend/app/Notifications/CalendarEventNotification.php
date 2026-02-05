<?php

namespace App\Notifications;

use App\Models\Calendar\Event;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CalendarEventNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $action, // created|updated|deleted
        public Event $event
    ) {}

    public function via($notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'type' => "calendar.{$this->action}",
            'event_id' => $this->event->id,
            'title' => $this->event->title,
            'start' => optional($this->event->start)?->toIso8601String(),
            'end' => optional($this->event->end)?->toIso8601String(),
            'all_day' => (bool) $this->event->all_day,
            'location' => $this->event->location,
        ];
    }

    public function toMail($notifiable): MailMessage
    {
        $start = optional($this->event->start)?->format('D, M j Y H:i');
        $end = optional($this->event->end)?->format('D, M j Y H:i');

        return (new MailMessage)
            ->subject("Calendar event {$this->action}: {$this->event->title}")
            ->greeting("Hello {$notifiable->name},")
            ->line("Event {$this->action}: {$this->event->title}")
            ->when($start, fn ($m) => $m->line("Start: {$start}"))
            ->when($this->event->end, fn ($m) => $m->line("End: {$end}"))
            ->when($this->event->location, fn ($m) => $m->line("Location: {$this->event->location}"))
            ->when($this->event->description, fn ($m) => $m->line($this->event->description))
            ->line("This was sent to everyone in your organization.");
    }
}
