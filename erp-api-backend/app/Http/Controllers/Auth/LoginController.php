<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Http\JsonResponse;
use Laravel\Sanctum\PersonalAccessToken;

class LoginController extends Controller
{
    /**
     * Handle a login request, authenticate the user, and return tokens & user data.
     */
    public function login(Request $request): JsonResponse
{
    $request->validate([
        'email' => 'required|email',
        'password' => 'required|string',
    ]);

    $userQuery = User::where('email', $request->email);
    if ($request->filled('company_id')) {
        $userQuery->where('company_id', $request->company_id);
    }
    $user = $userQuery->first();

    if (!$user || !Hash::check($request->password, $user->password)) {
        return response()->json([
            'success' => false,
            'error' => 'Invalid credentials',
        ], 401);
    }

    if (!$user->secret_key) {
        $user->secret_key = Str::random(32);
        $user->save();
    }

    $user->tokens()->delete();

    return response()->json([
        'success' => true,
        'data' => $this->generateTokenResponse($user),
    ]);
}

    /**
     * Refresh the access token using a valid refresh token.
     */
    public function refreshToken(Request $request): JsonResponse
{
    $refreshToken = $request->input('refresh_token');

    if (!$refreshToken) {
        return response()->json([
            'success' => false,
            'error' => 'Refresh token not provided. Please log in again.'
        ], 401);
    }

    $token = PersonalAccessToken::findToken($refreshToken);

    if (!$token || $token->name !== 'refresh-token') {
        return response()->json([
            'success' => false,
            'error' => 'Invalid or expired refresh token. Please log in again.'
        ], 401);
    }

    $user = $token->tokenable;

    if (!$user) {
        return response()->json([
            'success' => false,
            'error' => 'User not found. Please log in again.'
        ], 401);
    }

    $user->tokens()->where('name', 'access-token')->delete();
    $token->delete();

    $accessToken = $user->createToken('access-token', ['*']);
    $refreshTokenNew = $user->createToken('refresh-token', ['*']);

    return response()->json([
        'success' => true,
        'data' => [
            'token' => [
                'access_token' => $accessToken->plainTextToken,
                'refresh_token' => $refreshTokenNew->plainTextToken,
                'token_type' => 'Bearer',
                'expires_in' => 3600,
            ],
            'user' => $this->transformUser($user),
        ],
    ]);
}

    /**
     * Return authenticated user details.
     */
    public function user(Request $request): JsonResponse
    {
        return response()->json([
            'message' => 'User details fetched successfully.',
            'data' => $this->transformUser($request->user()),
        ]);
    }

    /**
     * Log the user out by revoking all tokens.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();

        return response()->json([
            'message' => 'Successfully logged out.',
            'data' => null
        ]);
    }

    /**
     * Generate the complete login response with tokens and user info.
     */
    private function generateTokenResponse(User $user): array
    {
        return [
            'token' => $this->generateTokenData($user),
            'user'  => $this->transformUser($user),
        ];
    }

    /**
     * Create new access and refresh tokens for the user.
     */
    private function generateTokenData(User $user): array
    {
        // Create tokens with real expiry metadata
        $accessToken = $user->createToken(
            'access-token',
            ['*'],
            now()->addHour()
        );

        $refreshToken = $user->createToken(
            'refresh-token',
            ['*'],
            now()->addDays(7)
        );

        return [
            'access_token' => $accessToken->plainTextToken,
            'refresh_token' => $refreshToken->plainTextToken,
            'token_type' => 'Bearer',
            'expires_in'    => 3600,
        ];
    }

    /**
     * Transform the user model into a clean JSON-friendly structure.
     */
    private function transformUser(User $user): array
    {
        // Eager load employee data
        $user->loadMissing(['employeeProfile.jobTitle', 'employeeProfile.department']);

        // Fetch Spatie roles and permissions
        $roles = $user->getRoleNames()->toArray();
        $permissions = $user->getAllPermissions()->pluck('name')->toArray();

        return [
            'id'          => $user->id,
            'name'        => $user->name,
            'email'       => $user->email,
            'company_id'  => $user->company_id,
            'secret_key'  => $user->secret_key,
            'company_role'=> $user->company_role,
            'is_admin'    => $user->hasAnyRole(['Admin', 'OWNER']),
            'job_title'   => $user->employeeProfile?->jobTitle?->name,
            'department'  => $user->employeeProfile?->department?->name,
            'roles'       => $roles,
            'permissions' => $permissions,
        ];
    }
}
