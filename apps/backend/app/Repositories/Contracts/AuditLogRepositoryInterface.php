<?php

namespace App\Repositories\Contracts;

use App\Models\AuditLog;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface AuditLogRepositoryInterface
{
    /** @param array<string, mixed> $data */
    public function create(array $data): AuditLog;

    /** @return LengthAwarePaginator<AuditLog> */
    public function paginateForEntity(string $entityType, int $entityId, int $perPage = 15): LengthAwarePaginator;
}
