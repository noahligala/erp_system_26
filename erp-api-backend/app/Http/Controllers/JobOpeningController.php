<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\JobOpening;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class JobOpeningController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if (!$user || !$user->company_id) {
            return response()->json([
                'status' => 'error',
                'message' => 'User not associated with a company.',
            ], 403);
        }

        try {
            $query = JobOpening::query()
                ->where('company_id', $user->company_id)
                ->with([
                    'department:id,name',
                    'jobTitle:id,name',
                    'creator:id,name',
                ])
                ->latest();

            if ($request->filled('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            $openings = $query->paginate((int) $request->input('per_page', 15));

            return response()->json([
                'status' => 'success',
                'data' => $openings,
            ]);
        } catch (\Throwable $e) {
            Log::error('Error fetching job openings.', [
                'company_id' => $user->company_id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Could not fetch job openings.',
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $user = $request->user();

        if (!$user || !$user->company_id) {
            return response()->json([
                'status' => 'error',
                'message' => 'User not associated with a company.',
            ], 403);
        }

        $payload = $this->preparePayload($request);

        $validator = Validator::make(
            $payload,
            $this->rules($user->company_id, false)
        );

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $validated = $validator->validated();
            $validated = $this->attachDepartmentSnapshot($validated, $user->company_id);

            $opening = JobOpening::create([
                ...$validated,
                'company_id' => $user->company_id,
                'created_by' => $user->id,
                'positions_to_fill' => $validated['positions_to_fill'] ?? 1,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Job opening created successfully.',
                'data' => $opening->load([
                    'department:id,name',
                    'jobTitle:id,name',
                    'creator:id,name',
                ]),
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Error creating job opening.', [
                'company_id' => $user->company_id,
                'user_id' => $user->id,
                'payload' => $payload,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Could not create job opening.',
            ], 500);
        }
    }

    public function show(Request $request, JobOpening $jobOpening)
    {
        $user = $request->user();

        if (!$user || !$user->company_id || (int) $jobOpening->company_id !== (int) $user->company_id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized.',
            ], 403);
        }

        try {
            return response()->json([
                'status' => 'success',
                'data' => $jobOpening->load([
                    'department:id,name',
                    'jobTitle:id,name',
                    'creator:id,name',
                ]),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error fetching job opening.', [
                'job_opening_id' => $jobOpening->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Could not fetch job opening details.',
            ], 500);
        }
    }

    public function update(Request $request, JobOpening $jobOpening)
    {
        $user = $request->user();

        if (!$user || !$user->company_id || (int) $jobOpening->company_id !== (int) $user->company_id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized.',
            ], 403);
        }

        $payload = $this->preparePayload($request);

        $validator = Validator::make(
            $payload,
            $this->rules($user->company_id, true)
        );

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $validated = $validator->validated();

            if (array_key_exists('positions_to_fill', $validated) && $validated['positions_to_fill'] === null) {
                $validated['positions_to_fill'] = 1;
            }

            $validated = $this->attachDepartmentSnapshot($validated, $user->company_id);

            $jobOpening->update($validated);

            return response()->json([
                'status' => 'success',
                'message' => 'Job opening updated successfully.',
                'data' => $jobOpening->fresh()->load([
                    'department:id,name',
                    'jobTitle:id,name',
                    'creator:id,name',
                ]),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error updating job opening.', [
                'job_opening_id' => $jobOpening->id,
                'user_id' => $user->id,
                'payload' => $payload,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Could not update job opening.',
            ], 500);
        }
    }

    public function destroy(Request $request, JobOpening $jobOpening)
    {
        $user = $request->user();

        if (!$user || !$user->company_id || (int) $jobOpening->company_id !== (int) $user->company_id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized.',
            ], 403);
        }

        try {
            $jobOpening->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Job opening archived successfully.',
            ]);
        } catch (\Throwable $e) {
            Log::error('Error archiving job opening.', [
                'job_opening_id' => $jobOpening->id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Could not archive job opening.',
            ], 500);
        }
    }

    private function rules(int $companyId, bool $isUpdate = false): array
    {
        return [
            'title' => $isUpdate
                ? ['sometimes', 'required', 'string', 'max:255']
                : ['required', 'string', 'max:255'],

            'description' => ['nullable', 'string'],
            'requirements' => ['nullable', 'string'],
            'benefits' => ['nullable', 'string'],
            'location' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:100'],

            'department_id' => [
                'nullable',
                Rule::exists('departments', 'id')->where(function ($query) use ($companyId) {
                    $query->where('company_id', $companyId);
                }),
            ],

            'job_title_id' => [
                'nullable',
                Rule::exists('job_titles', 'id')->where(function ($query) use ($companyId) {
                    $query->where('company_id', $companyId);
                }),
            ],

            'status' => $isUpdate
                ? ['sometimes', 'required', Rule::in(['draft', 'open', 'closed', 'on_hold'])]
                : ['required', Rule::in(['draft', 'open', 'closed', 'on_hold'])],

            'positions_to_fill' => ['nullable', 'integer', 'min:1'],
            'posted_date' => ['nullable', 'date'],
            'closing_date' => ['nullable', 'date', 'after_or_equal:posted_date'],
        ];
    }

    private function preparePayload(Request $request): array
    {
        $data = $request->all();

        foreach ([
            'title',
            'description',
            'requirements',
            'benefits',
            'location',
            'type',
            'department_id',
            'job_title_id',
            'status',
        ] as $field) {
            if (array_key_exists($field, $data) && is_string($data[$field])) {
                $data[$field] = trim($data[$field]);
            }
        }

        foreach ([
            'description',
            'requirements',
            'benefits',
            'location',
            'type',
            'department_id',
            'job_title_id',
            'posted_date',
            'closing_date',
        ] as $nullableField) {
            if (array_key_exists($nullableField, $data) && $data[$nullableField] === '') {
                $data[$nullableField] = null;
            }
        }

        if (array_key_exists('positions_to_fill', $data) && $data['positions_to_fill'] === '') {
            $data['positions_to_fill'] = null;
        }

        return $data;
    }

    private function attachDepartmentSnapshot(array $validated, int $companyId): array
    {
        if (array_key_exists('department_id', $validated)) {
            if ($validated['department_id']) {
                $department = Department::query()
                    ->where('company_id', $companyId)
                    ->find($validated['department_id']);

                $validated['department'] = $department?->name;
            } else {
                $validated['department'] = null;
            }
        }

        return $validated;
    }
}
