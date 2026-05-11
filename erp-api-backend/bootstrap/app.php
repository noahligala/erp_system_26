<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Console\Scheduling\Schedule;

// API exception handling imports
use Illuminate\Auth\AuthenticationException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )

    ->withSchedule(function (Schedule $schedule) {
        $schedule->command('assets:depreciate')->lastDayOfMonth('01:00');
    })

    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'decrypt_path' => \App\Http\Middleware\DecodeEncryptedApiPath::class,
        ]);
    })

    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->renderable(function (AuthenticationException $e, $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Unauthenticated.',
                ], 401);
            }

            return null;
        });

        $exceptions->renderable(function (AuthorizationException $e, $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Access denied. You do not have the required permissions.',
                ], 403);
            }

            return null;
        });

        $exceptions->renderable(function (ModelNotFoundException $e, $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Resource not found.',
                ], 404);
            }

            return null;
        });

        $exceptions->renderable(function (NotFoundHttpException $e, $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'error' => 'The requested endpoint does not exist.',
                ], 404);
            }

            return null;
        });

        $exceptions->renderable(function (ValidationException $e, $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'error' => 'The given data was invalid.',
                    'errors' => $e->validator->errors(),
                ], 422);
            }

            return null;
        });

        $exceptions->renderable(function (ThrottleRequestsException $e, $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Too many attempts. Please try again later.',
                ], 429);
            }

            return null;
        });

        $exceptions->renderable(function (HttpException $e, $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'error' => $e->getMessage() ?: 'An HTTP error occurred.',
                ], $e->getStatusCode());
            }

            return null;
        });

        $exceptions->renderable(function (\Throwable $e, $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                $response = [
                    'success' => false,
                    'error' => 'Internal Server Error.',
                ];

                if (config('app.debug')) {
                    $response['error_details'] = $e->getMessage();
                    $response['trace'] = array_slice($e->getTrace(), 0, 5);
                }

                return response()->json($response, 500);
            }

            return null;
        });
    })
    ->create();
