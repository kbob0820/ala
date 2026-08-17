import api from './api';
import type { ApiEnvelope, PaymentType, PaginatedResponse } from '@/types';

export async function getPaymentTypes(params?: {
  per_page?: number;
  page?: number;
}): Promise<PaginatedResponse<PaymentType>> {
  const res = await api.get<ApiEnvelope<PaginatedResponse<PaymentType>>>('/payment-types', {
    params,
  });
  return res.data.data;
}

export async function getPaymentType(id: number): Promise<PaymentType> {
  const res = await api.get<ApiEnvelope<PaymentType>>(`/payment-types/${id}`);
  return res.data.data;
}

export async function createPaymentType(data: {
  name: string;
  category: 'payment_method' | 'release_method';
  is_active?: boolean;
  fee?: number | null;
}): Promise<PaymentType> {
  const res = await api.post<ApiEnvelope<PaymentType>>('/payment-types', data);
  return res.data.data;
}

export async function updatePaymentType(
  id: number,
  data: { name: string; category: 'payment_method' | 'release_method'; is_active?: boolean; fee?: number | null },
): Promise<PaymentType> {
  const res = await api.put<ApiEnvelope<PaymentType>>(`/payment-types/${id}`, data);
  return res.data.data;
}

export async function deletePaymentType(id: number): Promise<void> {
  await api.delete(`/payment-types/${id}`);
}
