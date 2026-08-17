import api from './api';
import type { ApiEnvelope, User, PaginatedResponse } from '@/types';

export async function getUsers(params?: {
  per_page?: number;
  page?: number;
  search?: string;
}): Promise<PaginatedResponse<User>> {
  const res = await api.get<ApiEnvelope<PaginatedResponse<User>>>('/users', { params });
  return res.data.data;
}

export async function getUser(id: number): Promise<User> {
  const res = await api.get<ApiEnvelope<User>>(`/users/${id}`);
  return res.data.data;
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role_id?: number | null;
}): Promise<User> {
  const res = await api.post<ApiEnvelope<User>>('/users', data);
  return res.data.data;
}

export async function updateUser(
  id: number,
  data: {
    name: string;
    email: string;
    role_id?: number | null;
    is_active?: boolean;
    password?: string;
    password_confirmation?: string;
  },
): Promise<User> {
  const res = await api.put<ApiEnvelope<User>>(`/users/${id}`, data);
  return res.data.data;
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/users/${id}`);
}
