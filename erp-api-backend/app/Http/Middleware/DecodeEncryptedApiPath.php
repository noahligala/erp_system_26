<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Helpers\ApiEncoder;

class DecodeEncryptedApiPath
{
    public function handle(Request $request, Closure $next)
    {
        // Skip validation for open routes
        if ($request->is('api/login') || $request->is('api/register') || $request->is('api/refresh')) {
            return $next($request);
        }

        $encoded = $request->header('X-Encrypted-Path');
        $user = $request->user();

        if (!$encoded || !$user || !$user->secret_key) {
            return response()->json(['error' => 'Unauthorized or missing encryption key'], 401);
        }

        // Decode using user's secret key
        $decoded = ApiEncoder::decode($encoded, $user->secret_key);

        // Normalize for correct matching
        $normalizedPath = '/' . ltrim($request->path(), '/');

        if (!$decoded || $decoded !== $normalizedPath) {
            return response()->json([
                'error' => 'Invalid signature or tampered request',
                'expected' => $normalizedPath,
                'decoded' => $decoded,
            ], 401);
        }

        return $next($request);
    }
}
