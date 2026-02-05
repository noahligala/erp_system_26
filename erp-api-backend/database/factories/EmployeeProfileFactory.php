<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\EmployeeProfile>
 */
class EmployeeProfileFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $banks = [
            'Equity Bank',
            'KCB Bank Kenya',
            'Co-operative Bank of Kenya',
            'Absa Bank Kenya',
            'NCBA Bank',
            'Stanbic Bank',
            'Family Bank',
            'I&M Bank',
            'DTB Bank',
            'Standard Chartered Bank',
            'HF Group',
            'Postbank',
            'Kingdom Bank',
        ];

        $branches = [
            'Nairobi', 'Westlands', 'Thika', 'Nakuru', 'Mombasa', 'Kisumu', 'Eldoret',
            'Nyeri', 'Meru', 'Machakos', 'Kitale', 'Kericho', 'Naivasha'
        ];

        return [
            'status' => 'active',
            'salary' => $this->faker->numberBetween(45000, 150000),
            'hired_on' => $this->faker->dateTimeBetween('-5 years', 'now'),
            'bank_account_number' => $this->faker->bankAccountNumber,
            'bank_name' => $this->faker->randomElement($banks),       // ✅ Added
            'bank_branch' => $this->faker->randomElement($branches),  // ✅ Added
            'national_id_number' => $this->faker->unique()->numerify('ID-#######'),
            'nssf_number' => $this->faker->unique()->numerify('NSSF-#######'),
            'kra_pin' => $this->faker->unique()->bothify('A#########?'),
            'nhif_number' => $this->faker->unique()->numerify('NHIF-#######'),
            // department_id and job_title_id will be set by the seeder.
        ];
    }
}
