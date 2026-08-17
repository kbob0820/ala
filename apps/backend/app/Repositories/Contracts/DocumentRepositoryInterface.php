<?php

namespace App\Repositories\Contracts;

use App\Models\Document;

interface DocumentRepositoryInterface
{
    /** @param array<string, mixed> $data */
    public function create(array $data): Document;

    public function delete(Document $document): bool;
}
