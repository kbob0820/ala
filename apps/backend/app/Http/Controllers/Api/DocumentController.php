<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DocumentController extends Controller
{
    public function index(Client $client): JsonResponse
    {
        return response()->success($client->documents);
    }

    public function store(Request $request, Client $client): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'],
            'type' => ['required', 'string', 'max:50'],
        ]);

        $file = $request->file('file');

        if (! $file) {
            return response()->error('No file uploaded', 'NO_FILE', 422);
        }

        $path = $file->store('documents/'.$client->id);

        $ocrVerified = $file->isValid()
            && in_array(strtolower((string) $file->getClientOriginalExtension()), ['jpg', 'jpeg', 'png', 'pdf'], true);

        $document = $client->documents()->create([
            'type' => $request->string('type')->value(),
            'file_path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'ocr_verified' => $ocrVerified,
            'ocr_data' => $ocrVerified ? ['status' => 'readable', 'verified_at' => now()->toDateTimeString()] : null,
        ]);

        return response()->success($document, 201, 'Document uploaded successfully');
    }

    public function destroy(Document $document): JsonResponse
    {
        if (Storage::exists($document->file_path)) {
            Storage::delete($document->file_path);
        }

        $document->delete();

        return response()->success(null, 200, 'Document deleted successfully');
    }

    public function view(Document $document): BinaryFileResponse
    {
        if (! Storage::exists($document->file_path)) {
            abort(404);
        }

        $extension = strtolower((string) pathinfo($document->file_path, PATHINFO_EXTENSION));
        $mimeTypes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'pdf' => 'application/pdf',
        ];

        $contentType = $mimeTypes[$extension] ?? 'application/octet-stream';
        $disposition = in_array($extension, ['jpg', 'jpeg', 'png']) ? 'inline' : 'inline';
        $filename = $document->original_name;

        return response()->file(
            Storage::path($document->file_path),
            [
                'Content-Type' => $contentType,
                'Content-Disposition' => $disposition.'; filename="'.$filename.'"',
            ]
        );
    }
}
