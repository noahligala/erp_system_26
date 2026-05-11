<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class RegistrationController extends Controller
{
    /**
     * Register a company tenant, create its owner user, attach a subscription plan,
     * and optionally issue a Sanctum token if Sanctum is installed.
     */
    public function registerAndSubscribe(Request $request): JsonResponse
    {
        $payload = $this->normalizePayload($request);

        $validated = validator($payload, [
            'company_name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('companies', 'name'),
            ],
            'company_email' => [
                'nullable',
                'email',
                'max:255',
            ],
            'company_phone' => [
                'nullable',
                'string',
                'max:30',
            ],
            'industry' => [
                'nullable',
                'string',
                'max:100',
            ],
            'company_size' => [
                'nullable',
                'string',
                'max:100',
            ],

            'owner_name' => [
                'required',
                'string',
                'max:255',
            ],
            'owner_email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email'),
            ],
            'owner_phone' => [
                'nullable',
                'string',
                'max:30',
            ],
            'owner_password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
            ],

            'plan_id' => [
                'required',
                'integer',
                Rule::exists('subscription_plans', 'id'),
            ],
            'trial' => [
                'sometimes',
                'boolean',
            ],
        ])->validate();

        try {
            $result = DB::transaction(function () use ($validated) {
                $plan = SubscriptionPlan::query()->findOrFail($validated['plan_id']);

                $trialEnabled = (bool) ($validated['trial'] ?? true);

                $trialDays = $this->getPlanTrialDays($plan);
                $trialEndsAt = $trialEnabled && $trialDays > 0
                    ? Carbon::now()->addDays($trialDays)
                    : null;

                $company = Company::query()->create(
                    $this->onlyExistingColumns('companies', [
                        'name' => $validated['company_name'],
                        'email' => $validated['company_email'] ?? null,
                        'phone' => $validated['company_phone'] ?? null,
                        'phone_number' => $validated['company_phone'] ?? null,
                        'industry' => $validated['industry'] ?? null,
                        'company_size' => $validated['company_size'] ?? null,
                        'subscription_plan_id' => $plan->id,
                        'plan_id' => $plan->id,
                        'subscription_status' => $trialEnabled ? 'trialing' : 'active',
                        'status' => 'active',
                        'trial_ends_at' => $trialEndsAt,
                        'subscription_starts_at' => Carbon::now(),
                        'subscription_ends_at' => $this->calculateSubscriptionEndDate($plan, $trialEnabled),
                    ])
                );

                $user = User::query()->create(
                    $this->onlyExistingColumns('users', [
                        'name' => $validated['owner_name'],
                        'email' => $validated['owner_email'],
                        'phone' => $validated['owner_phone'] ?? $validated['company_phone'] ?? null,
                        'phone_number' => $validated['owner_phone'] ?? $validated['company_phone'] ?? null,
                        'password' => Hash::make($validated['owner_password']),
                        'company_id' => $company->id,
                        'company_role' => 'OWNER',
                        'role' => 'OWNER',
                        'status' => 'active',
                    ])
                );

                $companyUpdate = $this->onlyExistingColumns('companies', [
                    'owner_user_id' => $user->id,
                    'owner_id' => $user->id,
                ]);

                if (!empty($companyUpdate)) {
                    $company->forceFill($companyUpdate)->save();
                }

                $this->assignOwnerRoleIfAvailable($user);

                $token = null;

                if (method_exists($user, 'createToken')) {
                    $tokenResult = $user->createToken('landing-registration');
                    $token = $tokenResult->plainTextToken ?? null;
                }

                return [
                    'company' => $company->fresh(),
                    'user' => $user->fresh(),
                    'plan' => $plan,
                    'token' => $token,
                    'trial_ends_at' => $trialEndsAt?->toDateTimeString(),
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Registration and subscription successful.',
                'data' => [
                    'company' => $result['company'],
                    'user' => $result['user'],
                    'plan' => $result['plan'],
                    'trial_ends_at' => $result['trial_ends_at'],
                    'token' => $result['token'],
                ],
            ], 201);
        } catch (ValidationException $e) {
            throw $e;
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Registration failed. Please try again.',
                'error' => app()->environment('local') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Normalize nested and flat frontend payloads into one backend-friendly shape.
     */
    private function normalizePayload(Request $request): array
    {
        $company = (array) $request->input('company', []);
        $owner = (array) $request->input('owner', []);
        $subscription = (array) $request->input('subscription', []);

        return [
            'company_name' => $company['name']
                ?? $request->input('company_name'),

            'company_email' => $company['email']
                ?? $request->input('company_email'),

            'company_phone' => $company['phone']
                ?? $company['phone_number']
                ?? $request->input('company_phone')
                ?? $request->input('phone_number'),

            'industry' => $company['industry']
                ?? $request->input('industry'),

            'company_size' => $company['company_size']
                ?? $request->input('company_size'),

            'owner_name' => $owner['name']
                ?? $request->input('owner_name')
                ?? $request->input('name'),

            'owner_email' => $owner['email']
                ?? $request->input('owner_email')
                ?? $request->input('email'),

            'owner_phone' => $owner['phone']
                ?? $owner['phone_number']
                ?? $request->input('owner_phone')
                ?? $request->input('phone_number'),

            'owner_password' => $owner['password']
                ?? $request->input('owner_password')
                ?? $request->input('password'),

            'owner_password_confirmation' => $owner['password_confirmation']
                ?? $request->input('owner_password_confirmation')
                ?? $request->input('password_confirmation'),

            'plan_id' => $subscription['plan_id']
                ?? $request->input('plan_id'),

            'trial' => $subscription['trial']
                ?? $request->boolean('trial', true),
        ];
    }

    /**
     * Avoid SQL errors if your companies/users table does not yet have every optional column.
     */
    private function onlyExistingColumns(string $table, array $data): array
    {
        return collect($data)
            ->filter(function ($value, string $column) use ($table) {
                return Schema::hasColumn($table, $column);
            })
            ->toArray();
    }

    private function getPlanTrialDays(SubscriptionPlan $plan): int
    {
        foreach (['trial_days', 'free_trial_days', 'trial_period_days'] as $column) {
            if (isset($plan->{$column}) && is_numeric($plan->{$column})) {
                return (int) $plan->{$column};
            }
        }

        return 14;
    }

    private function calculateSubscriptionEndDate(SubscriptionPlan $plan, bool $trialEnabled): ?Carbon
    {
        if ($trialEnabled) {
            return null;
        }

        $cycle = strtolower((string) (
            $plan->billing_cycle
            ?? $plan->interval
            ?? $plan->duration
            ?? 'monthly'
        ));

        return match ($cycle) {
            'yearly', 'annual', 'annually' => Carbon::now()->addYear(),
            'biannual', 'semiannual', 'semi-annually', '6 months' => Carbon::now()->addMonths(6),
            'quarterly' => Carbon::now()->addMonths(3),
            'weekly' => Carbon::now()->addWeek(),
            default => Carbon::now()->addMonth(),
        };
    }

    private function assignOwnerRoleIfAvailable(User $user): void
    {
        if (!method_exists($user, 'assignRole')) {
            return;
        }

        try {
            $user->assignRole('OWNER');
        } catch (Throwable $e) {
            // Do not fail registration if Spatie role is not seeded yet.
            report($e);
        }
    }
}
