import api from './api';
import type { ApiEnvelope, AuthResponse, User } from '@/types';

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post<ApiEnvelope<AuthResponse>>('/login', { email, password });
  const data = res.data.data;
  if (!data?.token || !data?.user) {
    throw new Error('Server returned an unexpected response. Please try again.');
  }
  return data;
}

export async function register(
  name: string,
  email: string,
  password: string,
  password_confirmation: string,
): Promise<AuthResponse> {
  const res = await api.post<ApiEnvelope<AuthResponse>>('/register', {
    name,
    email,
    password,
    password_confirmation,
  });
  const data = res.data.data;
  if (!data?.token || !data?.user) {
    throw new Error('Server returned an unexpected response. Please try again.');
  }
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/logout');
}

export async function getUser(): Promise<User> {
  const res = await api.get<ApiEnvelope<User>>('/user');
  return res.data.data;
}
