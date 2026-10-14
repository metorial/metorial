import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';
import type { FirmaoListParams, FirmaoListResponse } from './types';

export class FirmaoClient {
  private axios;

  constructor(params: {
    token: string;
    organizationId: string;
  }) {
    this.axios = createAuthenticatedAxios({
      baseURL: `https://system.firmao.net/${encodeURIComponent(params.organizationId)}/svc/v1`,
      authHeader: { value: `Basic ${params.token}` },
      contentType: 'application/json; charset=UTF-8',
      timeout: 30_000,
      errorMapping: {
        extractResponseData: response => {
          let data = response.data;
          return isApiErrorRecord(data)
            ? {
                ...data,
                message: data.message ?? data.errorCode,
                code: data.errorCode ?? data.code
              }
            : data;
        }
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Firmao',
          reason: 'firmao_api_error',
          extractUpstreamCode: error => {
            if (!isApiErrorRecord(error) || !isApiErrorRecord(error.data)) return undefined;
            let upstream = error.data.upstream;
            return isApiErrorRecord(upstream) && typeof upstream.code === 'string'
              ? upstream.code
              : undefined;
          }
        })
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
    if (params?.start !== undefined && (!Number.isInteger(params.start) || params.start < 0)) {
      throw createApiServiceError('Pagination start must be a non-negative integer.');
    }
    if (params?.limit !== undefined && (!Number.isInteger(params.limit) || params.limit < 1)) {
      throw createApiServiceError('Pagination limit must be a positive integer.');
    }
    let query = this.buildQueryString({
      ...params,
      start: params?.start ?? 0,
      limit: params?.limit ?? 50
    });
    query += `${query ? '&' : '?'}dataFormat=MEDIUM`;
    let response = await this.axios.get(`/${resource}${query}`);
    let data = response.data;
    let records = Array.isArray(data) ? data : data?.data;

    if (!Array.isArray(records)) {
      throw createApiServiceError('Firmao returned an invalid list response.', {
        reason: 'firmao_invalid_response'
      });
    }

    return {
      data: records,
      totalSize: data?.totalSize ?? records.length
    };
  }

  async getById<T = any>(resource: string, id: number | string): Promise<T> {
    let response = await this.axios.get(`/${resource}/${encodeURIComponent(String(id))}`);
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
    let response = await this.axios.put(
      `/${resource}/${encodeURIComponent(String(id))}`,
      body
    );
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

  async listNumberingSeries(
    params?: FirmaoListParams
  ): Promise<FirmaoListResponse<Record<string, unknown>>> {
    return this.list('invoicenumbers', params);
  }
}
