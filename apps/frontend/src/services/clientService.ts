import api from './api';
import type { ApiEnvelope, Client, ClientFilters, ClientListItem, Document, PaginatedResponse } from '@/types';

export async function getClients(params?: ClientFilters): Promise<PaginatedResponse<ClientListItem>> {
  const res = await api.get<ApiEnvelope<PaginatedResponse<ClientListItem>>>('/clients', { params });
  return res.data.data;
}

export async function getClient(
  id: number,
): Promise<
  Client & {
    documents: Document[];
    loans: { id: number; amount: number; loan_status: string; application_status: string; created_at: string }[];
  }
> {
  const res = await api.get<
    ApiEnvelope<
      Client & { documents: Document[]; loans: unknown[] }
    >
  >(`/clients/${id}`);
  return res.data.data;
}

export async function createClient(data: FormData): Promise<Client> {
  const res = await api.post<ApiEnvelope<Client>>('/clients', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export async function updateClient(id: number, data: FormData): Promise<Client> {
  data.append('_method', 'PUT');
  const res = await api.post<ApiEnvelope<Client>>(`/clients/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export async function deleteClient(id: number): Promise<void> {
  await api.delete(`/clients/${id}`);
}

export async function restoreClient(id: number): Promise<Client> {
  const res = await api.post<ApiEnvelope<Client>>(`/clients/${id}/restore`);
  return res.data.data;
}

export async function forceDeleteClient(id: number): Promise<void> {
  await api.delete(`/clients/${id}/force`);
}

export async function getClientDocuments(clientId: number): Promise<Document[]> {
  const res = await api.get<ApiEnvelope<Document[]>>(`/clients/${clientId}/documents`);
  return res.data.data;
}

export async function uploadClientDocument(
  clientId: number,
  type: string,
  file: File,
): Promise<Document> {
  const formData = new FormData();
  formData.append('type', type);
  formData.append('file', file);
  const res = await api.post<ApiEnvelope<Document>>(`/clients/${clientId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export async function deleteDocument(documentId: number): Promise<void> {
  await api.delete(`/documents/${documentId}`);
}
