<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Notifications\RestockRequestDecision;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\Response;

class RestockRequestNotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! Schema::hasTable('notifications')) {
            return response()->json(['notifications' => [], 'unread_count' => 0]);
        }

        $userNotifications = $request->user()->notifications()
            ->where('type', RestockRequestDecision::class);
        $unreadCount = (clone $userNotifications)->whereNull('read_at')->count();
        $notifications = $userNotifications
            ->latest()
            ->get()
            ->map(fn ($notification): array => [
                'id' => $notification->id,
                'data' => $notification->data,
                'read_at' => $notification->read_at?->toIso8601String(),
                'created_at' => $notification->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    public function markAsRead(Request $request, string $notificationId): Response
    {
        abort_unless(Schema::hasTable('notifications'), 404, 'Notification not found.');

        $notification = $request->user()->notifications()
            ->where('type', RestockRequestDecision::class)
            ->whereKey($notificationId)
            ->firstOrFail();

        $notification->markAsRead();

        return response()->noContent();
    }
}
