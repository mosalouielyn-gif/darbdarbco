<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class RestockRequestDecision extends Notification
{
    /** @param array<string, int|float|string|null> $decision */
    public function __construct(private readonly array $decision) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, int|float|string|null> */
    public function toDatabase(object $notifiable): array
    {
        return $this->decision;
    }
}
