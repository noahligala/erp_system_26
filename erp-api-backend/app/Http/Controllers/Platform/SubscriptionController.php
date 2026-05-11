<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class SubscriptionController extends Controller
{
    /**
     * Public endpoint used by the landing page to load subscription plans.
     */
    public function plans(Request $request): JsonResponse
    {
        $query = SubscriptionPlan::query();

        if (Schema::hasColumn('subscription_plans', 'is_active')) {
            $query->where('is_active', true);
        }

        if (Schema::hasColumn('subscription_plans', 'status')) {
            $query->whereIn('status', ['active', 'published', 'enabled']);
        }

        if (Schema::hasColumn('subscription_plans', 'sort_order')) {
            $query->orderBy('sort_order');
        } else {
            $query->orderBy('id');
        }

        $plans = $query->get()->map(function ($plan) {
            return [
                'id' => $plan->id,
                'name' => $plan->name ?? $plan->title ?? 'Plan',
                'slug' => $plan->slug ?? null,
                'description' => $plan->description ?? 'Scalable ERP subscription plan.',
                'price' => $this->resolvePlanPrice($plan),
                'billing_cycle' => $plan->billing_cycle
                    ?? $plan->interval
                    ?? $plan->duration
                    ?? 'monthly',
                'trial_days' => $plan->trial_days
                    ?? $plan->free_trial_days
                    ?? $plan->trial_period_days
                    ?? 14,
                'features' => $this->resolveFeatures($plan),
                'raw' => app()->environment('local') ? $plan : null,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $plans,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $plan = SubscriptionPlan::query()->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $plan->id,
                'name' => $plan->name ?? $plan->title ?? 'Plan',
                'slug' => $plan->slug ?? null,
                'description' => $plan->description ?? 'Scalable ERP subscription plan.',
                'price' => $this->resolvePlanPrice($plan),
                'billing_cycle' => $plan->billing_cycle
                    ?? $plan->interval
                    ?? $plan->duration
                    ?? 'monthly',
                'trial_days' => $plan->trial_days
                    ?? $plan->free_trial_days
                    ?? $plan->trial_period_days
                    ?? 14,
                'features' => $this->resolveFeatures($plan),
            ],
        ]);
    }

    private function resolvePlanPrice(SubscriptionPlan $plan): float
    {
        foreach (['price', 'amount', 'monthly_price', 'subscription_fee'] as $column) {
            if (isset($plan->{$column}) && is_numeric($plan->{$column})) {
                return (float) $plan->{$column};
            }
        }

        return 0.0;
    }

    private function resolveFeatures(SubscriptionPlan $plan): array
    {
        $features = $plan->features ?? null;

        if (is_array($features)) {
            return $features;
        }

        if (is_string($features)) {
            $decoded = json_decode($features, true);

            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return $decoded;
            }

            return collect(explode(',', $features))
                ->map(fn ($feature) => trim($feature))
                ->filter()
                ->values()
                ->toArray();
        }

        return [
            'ERP dashboard',
            'User management',
            'Business modules',
            'Secure tenant data',
        ];
    }
}
