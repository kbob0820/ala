<?php

namespace App\Services;

use App\Repositories\Contracts\AuditLogRepositoryInterface;
use Illuminate\Support\Facades\Request;

class AuditService
{
    public function __construct(
        private readonly AuditLogRepositoryInterface $auditLogRepository
    ) {}

    public function log(string $action, string $entityType, int $entityId, ?array $oldState = null, ?array $newState = null, ?string $reference = null, ?string $reason = null): void
    {
        $this->auditLogRepository->create([
            'user_id' => auth()->id(),
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'old_state' => $oldState,
            'new_state' => $newState,
            'reference' => $reference,
            'reason' => $reason,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
            'created_at' => now(),
        ]);
    }
}
