import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import * as clientService from '../../src/services/clientService';
import api from '../../src/services/api';

describe('clientService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getClients', () => {
    it('calls GET /clients with correct params', async () => {
      const mockResponse = {
        data: {
          data: { data: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } },
        },
      };
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      await clientService.getClients({ search: 'test', page: 1 });

      expect(api.get).toHaveBeenCalledWith('/clients', { params: { search: 'test', page: 1 } });
    });

    it('returns paginated data', async () => {
      const clientList = [
        { id: 1, name: 'Alice', loans_count: 2, loans_by_status: '{}' },
        { id: 2, name: 'Bob', loans_count: 0, loans_by_status: '{}' },
      ];
      const mockResponse = {
        data: {
          data: {
            data: clientList,
            meta: { current_page: 1, last_page: 3, per_page: 15, total: 30 },
            links: { first: null, last: null, prev: null, next: null },
          },
        },
      };
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await clientService.getClients();

      expect(result).toEqual({
        data: clientList,
        meta: { current_page: 1, last_page: 3, per_page: 15, total: 30 },
        links: { first: null, last: null, prev: null, next: null },
      });
    });
  });

  describe('getClient', () => {
    it('calls GET /clients/:id and returns client with documents and loans', async () => {
      const client = { id: 1, name: 'Alice' };
      const documents = [{ id: 10, type: 'govt_id', original_name: 'id.jpg' }];
      const loans = [{ id: 100, amount: 5000, loan_status: 'active', application_status: 'approved' }];
      const mockResponse = {
        data: {
          data: { ...client, documents, loans },
        },
      };
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await clientService.getClient(1);

      expect(api.get).toHaveBeenCalledWith('/clients/1');
      expect(result).toMatchObject({ id: 1, name: 'Alice' });
      expect(result.documents).toEqual(documents);
      expect(result.loans).toEqual(loans);
    });
  });

  describe('createClient', () => {
    it('sends POST with FormData and multipart headers', async () => {
      const formData = new FormData();
      formData.append('name', 'New Client');
      const mockResponse = {
        data: { data: { id: 3, name: 'New Client' } },
      };
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await clientService.createClient(formData);

      expect(api.post).toHaveBeenCalledWith('/clients', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      expect(result).toEqual({ id: 3, name: 'New Client' });
    });
  });

  describe('updateClient', () => {
    it('appends _method: PUT and sends POST', async () => {
      const formData = new FormData();
      formData.append('name', 'Updated Client');
      const mockResponse = {
        data: { data: { id: 5, name: 'Updated Client' } },
      };
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await clientService.updateClient(5, formData);

      expect(formData.get('_method')).toBe('PUT');
      expect(api.post).toHaveBeenCalledWith('/clients/5', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      expect(result).toEqual({ id: 5, name: 'Updated Client' });
    });
  });

  describe('deleteClient', () => {
    it('calls DELETE /clients/:id', async () => {
      (api.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await clientService.deleteClient(1);

      expect(api.delete).toHaveBeenCalledWith('/clients/1');
    });
  });

  describe('getClientDocuments', () => {
    it('returns documents array', async () => {
      const documents = [
        { id: 1, type: 'govt_id', original_name: 'id.png' },
        { id: 2, type: 'payslip', original_name: 'pay.pdf' },
      ];
      const mockResponse = {
        data: { data: documents },
      };
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await clientService.getClientDocuments(1);

      expect(api.get).toHaveBeenCalledWith('/clients/1/documents');
      expect(result).toEqual(documents);
    });
  });

  describe('uploadClientDocument', () => {
    it('sends POST with type and file fields', async () => {
      const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
      const mockResponse = {
        data: { data: { id: 3, type: 'govt_id', original_name: 'doc.pdf' } },
      };
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await clientService.uploadClientDocument(1, 'govt_id', file);

      expect(api.post).toHaveBeenCalledWith('/clients/1/documents', expect.any(FormData), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const sentFormData = (api.post as ReturnType<typeof vi.fn>).mock.calls[0][1] as FormData;
      expect(sentFormData.get('type')).toBe('govt_id');
      expect(sentFormData.get('file')).toBe(file);
      expect(result).toEqual({ id: 3, type: 'govt_id', original_name: 'doc.pdf' });
    });
  });

  describe('deleteDocument', () => {
    it('calls DELETE /documents/:id', async () => {
      (api.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await clientService.deleteDocument(42);

      expect(api.delete).toHaveBeenCalledWith('/documents/42');
    });
  });
});
