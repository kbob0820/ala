import api from './api';
import type { ApiEnvelope, LoanSettings } from '@/types';

export async function getSettings(): Promise<LoanSettings> {
  const res = await api.get<ApiEnvelope<LoanSettings>>('/settings');
  return res.data.data;
}

export async function updateSettings(
  data: Partial<LoanSettings>,
): Promise<LoanSettings> {
  const res = await api.put<ApiEnvelope<LoanSettings>>('/settings', data);
  return res.data.data;
}
