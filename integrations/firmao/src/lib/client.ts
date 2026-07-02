import { createAxios } from 'slates';
import type { FirmaoListParams, FirmaoListResponse } from './types';

export class FirmaoClient {
  private axios;

  constructor(params: {
    token: string;
    organizationId: string;
  }) {
    this.axios = createAxios({
      baseURL: `https://system.firmao.net/${params.organizationId}/svc/v1`,
      headers: {
        Authorization: `Basic ${params.token}`,
        'Content-Type': 'application/json; charset=UTF-8'
      }
    });
  }

  private buildQueryString(listParams?: FirmaoListParams): string {
    if (!listParams) return '';
    let parts: string[] = [];

    if (listParams.start !== undefined) parts.push(`start=${listParams.start}`);
    if (listParams.limit !== undefined) parts.push(`limit=${listParams.limit}`);
    if (listParams.sort) parts.push(`sort=${encodeURIComponent(listParams.sort)}`);
    if (listParams.dir) parts.push(`dir=${listParams.dir}`);

    if (listParams.filters) {
      for (let [key, value] of Object.entries(listParams.filters)) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
    }

    return parts.length > 0 ? `?${parts.join('&')}` : '';
  }

  async list<T = any>(
    resource: string,
    params?: FirmaoListParams
  ): Promise<FirmaoListResponse<T>> {
    let query = this.buildQueryString(params);
    let response = await this.axios.get(`/${resource}${query}`);
    let data = response.data;

    return {
      data: data.data ?? data ?? [],
      totalSize: data.totalSize ?? 0
    };
  }

  async getById<T = any>(resource: string, id: number | string): Promise<T> {
    let response = await this.axios.get(`/${resource}/${id}`);
    return response.data;
  }

  async create<T = any>(resource: string, body: Record<string, any>): Promise<T> {
    let response = await this.axios.post(`/${resource}`, body);
    return response.data;
  }

  async update<T = any>(
    resource: string,
    id: number | string,
    body: Record<string, any>
  ): Promise<T> {
    let response = await this.axios.put(`/${resource}/${id}`, body);
    return response.data;
  }

  async deleteResource(resource: string, id: number | string): Promise<void> {
    await this.axios.put(`/${resource}/${id}`, { deleted: true });
  }

  async hardDelete(resource: string, id: number | string): Promise<void> {
    await this.axios.delete(`/${resource}/${id}`);
  }

  async uploadFile(
    objectType: string,
    objectId: number | string,
    fileName: string,
    fileContent: string,
    description?: string
  ): Promise<any> {
    let boundary = `----FormBoundary${Math.random().toString(36).substring(2)}`;
    let body = '';

    if (description) {
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="description"\r\n\r\n`;
      body += `${description}\r\n`;
    }

    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    body += `Content-Type: application/octet-stream\r\n\r\n`;
    body += `${fileContent}\r\n`;
    body += `--${boundary}--\r\n`;

    let response = await this.axios.post(`/${objectType}/${objectId}/documentsUpload`, body, {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      }
    });
    return response.data;
  }

  async getNextNumber(
    objectClass: string,
    type: string,
    mode: string,
    seriesId?: number
  ): Promise<any> {
    let params = [
      `objectClass=${encodeURIComponent(objectClass)}`,
      `type=${encodeURIComponent(type)}`,
      `mode=${encodeURIComponent(mode)}`
    ];
    if (seriesId !== undefined) {
      params.push(`id=${seriesId}`);
    }
    let response = await this.axios.get(`/invoicenumbers/next?${params.join('&')}`);
    return response.data;
  }

  async listNumberingSeries(): Promise<any> {
    let response = await this.axios.get('/invoicenumbers?dataFormat=MEDIUM');
    return response.data;
  }
}
