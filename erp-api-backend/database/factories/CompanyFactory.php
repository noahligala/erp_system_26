<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\User;
use App\Models\SubscriptionPlan;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class CompanyFactory extends Factory
{
    protected $model = Company::class;

    public function definition(): array
    {
        $companyName = $this->faker->unique()->company();

        return [
            'name' => $companyName,
            'domain' => Str::slug($companyName) . '.com',
            'subscription_plan_id' => SubscriptionPlan::inRandomOrder()->value('id') ?? SubscriptionPlan::factory(),
            'trial_ends_at' => now()->addDays(14),
            'is_active' => true,
            'logo' => null, // can be replaced later with upload path
            'po_box' => $this->faker->numerify('P.O. Box ####-#####'),
            'tel_number' => '+254' . $this->faker->numerify('7########'),
            'email_address' => $this->faker->unique()->companyEmail(),
            'tagline' => $this->faker->catchPhrase(),
            'website_url' => 'https://www.' . Str::slug($companyName) . '.com',
            'owner_user_id' => null, // prevent circular dependency
            'kra_pin' =>$this->faker->numerify('#############'),
            'nhif_number' =>$this->faker->numerify('#############'),
            'nssf_number' =>$this->faker->numerify('#############'),
            'address' =>$this->faker->address()
        ];
    }

    /**
     * State: Attach an owner user once the company exists
     */
    public function withOwner(): static
    {
        return $this->afterCreating(function (Company $company) {
            // Create a user linked as company owner
            $owner = User::factory()->create([
                'company_id' => $company->id,
                'company_role' => 'OWNER',
            ]);

            $company->update(['owner_user_id' => $owner->id]);
        });
    }
}
