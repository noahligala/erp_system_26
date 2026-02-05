<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Console\Scheduling\Schedule; // 💡 Need to assume this import or add it if outside the Application::configure scope

// --- Imports for API Exception Handling ---
use Illuminate\Auth\AuthenticationException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )

    // 💡 FIX: ADD THE SCHEDULING BLOCK HERE
    ->withSchedule(function (Schedule $schedule) {
        // Run fixed asset depreciation command at 1:00 AM on the last day of the month.
        // This ensures all financial transactions for the month are included.
        $schedule->command('assets:depreciate')->lastDayOfMonth('01:00');
    })

    ->withMiddleware(function (Middleware $middleware) {
        // Global middleware applied to all HTTP requests
        // ✅ ADD THIS ALIAS:
        $middleware->alias([
            'decrypt_path' => \App\Http\Middleware\DecodeEncryptedApiPath::class
        ]);
    })

    ->withExceptions(function (Exceptions $exceptions): void {

        // --- 401 Unauthorized ---
        $exceptions->renderable(function (AuthenticationException $e, $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Unauthenticated.'
                ], 401);
            }
        });

        // --- 403 Forbidden (YOUR REQUESTED FIX) ---
        $exceptions->renderable(function (AuthorizationException $e, $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Access denied. You do not have the required permissions.'
                ], 403);
            }
        });

        // --- 404 Not Found (Model) ---
        $exceptions->renderable(function (ModelNotFoundException $e, $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Resource not found.'
                ], 404);
            }
        });

        // --- 404 Not Found (Route) ---
        $exceptions->renderable(function (NotFoundHttpException $e, $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'error' => 'The requested endpoint does not exist.'
                ], 404);
            }
        });

        // --- 422 Unprocessable Entity (Validation) ---
        $exceptions->renderable(function (ValidationException $e, $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'error' => 'The given data was invalid.',
                    'errors' => $e->validator->errors()
                ], 422);
            }
        });

        // --- 429 Too Many Requests (Rate Limiting) ---
        $exceptions->renderable(function (ThrottleRequestsException $e, $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Too many attempts. Please try again later.'
                ], 429);
            }
        });

        // --- 500+ Generic HTTP Exceptions ---
        $exceptions->renderable(function (HttpException $e, $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                $message = $e->getMessage() ?: 'An HTTP error occurred.';
                return response()->json([
                    'success' => false,
                    'error' => $message
                ], $e->getStatusCode());
            }
        });

        // --- 500 Internal Server Error (Catch-all) ---
        $exceptions->renderable(function (Throwable $e, $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                $response = [
                    'success' => false,
                    'error' => 'Internal Server Error.'
                ];

                // If in debug mode, provide detailed error information
                if (config('app.debug')) {
                    $response['error_details'] = $e->getMessage();
                    $response['trace'] = array_slice($e->getTrace(), 0, 5); // Limit trace for readability
                }

                return response()->json($response, 500);
            }
        });

    })->create();
