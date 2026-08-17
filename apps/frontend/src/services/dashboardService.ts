import api from './api';
import type { ApiEnvelope, DashboardData } from '@/types';

export async function getDashboard(): Promise<DashboardData> {
  const res = await api.get<ApiEnvelope<DashboardData>>('/dashboard');
  return res.data.data;
}
