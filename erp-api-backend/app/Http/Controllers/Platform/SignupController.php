<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SignupController extends Controller
{
    public function registerAndSubscribe(Request $request): JsonResponse
    {
        return app(RegistrationController::class)->registerAndSubscribe($request);
    }
}
