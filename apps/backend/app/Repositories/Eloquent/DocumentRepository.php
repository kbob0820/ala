<?php

namespace App\Repositories\Eloquent;

use App\Models\Document;
use App\Repositories\Contracts\DocumentRepositoryInterface;

class DocumentRepository implements DocumentRepositoryInterface
{
    public function create(array $data): Document
    {
        return Document::create($data);
    }

    public function delete(Document $document): bool
    {
        return (bool) $document->delete();
    }
}
