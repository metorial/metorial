import { createAxios } from '@slates/provider';
import { withFirebaseApiError } from './errors';

export class RealtimeDbClient {
  private token: string;
  private databaseUrl: string;
  private axiosInstance;

  constructor(params: { token: string; databaseUrl: string }) {
    this.token = params.token;
    this.databaseUrl = params.databaseUrl.replace(/\/$/, '');
    this.axiosInstance = createAxios({
      baseURL: this.databaseUrl
    });
  }

  private get authParams() {
    return { access_token: this.token };
  }

  async getData(
    path: string,
    query?: {
      orderBy?: string;
      startAt?: string | number;
      endAt?: string | number;
      limitToFirst?: number;
      limitToLast?: number;
      equalTo?: string | number | boolean;
      shallow?: boolean;
    }
  ): Promise<any> {
    let params: Record<string, any> = { ...this.authParams };

    if (query?.orderBy) params.orderBy = `"${query.orderBy}"`;
    if (query?.startAt !== undefined)
      params.startAt =
        typeof query.startAt === 'string' ? `"${query.startAt}"` : query.startAt;
    if (query?.endAt !== undefined)
      params.endAt = typeof query.endAt === 'string' ? `"${query.endAt}"` : query.endAt;
    if (query?.limitToFirst) params.limitToFirst = query.limitToFirst;
    if (query?.limitToLast) params.limitToLast = query.limitToLast;
    if (query?.equalTo !== undefined)
      params.equalTo =
        typeof query.equalTo === 'string' ? `"${query.equalTo}"` : query.equalTo;
    if (query?.shallow) params.shallow = true;

    let normalizedPath = path.startsWith('/') ? path : `/${path}`;

    let response = await withFirebaseApiError('Realtime Database get data', () =>
      this.axiosInstance.get(`${normalizedPath}.json`, {
        params
      })
    );

    return response.data;
  }

  async setData(path: string, data: any): Promise<any> {
    let normalizedPath = path.startsWith('/') ? path : `/${path}`;

    let response = await withFirebaseApiError('Realtime Database set data', () =>
      this.axiosInstance.put(`${normalizedPath}.json`, data, {
        params: this.authParams
      })
    );

    return response.data;
  }

  async pushData(path: string, data: any): Promise<{ generatedKey: string }> {
    let normalizedPath = path.startsWith('/') ? path : `/${path}`;

    let response = await withFirebaseApiError('Realtime Database push data', () =>
      this.axiosInstance.post(`${normalizedPath}.json`, data, {
        params: this.authParams
      })
    );

    return {
      generatedKey: response.data.name
    };
  }

  async updateData(path: string, data: Record<string, any>): Promise<any> {
    let normalizedPath = path.startsWith('/') ? path : `/${path}`;

    let response = await withFirebaseApiError('Realtime Database update data', () =>
      this.axiosInstance.patch(`${normalizedPath}.json`, data, {
        params: this.authParams
      })
    );

    return response.data;
  }

  async deleteData(path: string): Promise<void> {
    let normalizedPath = path.startsWith('/') ? path : `/${path}`;

    await withFirebaseApiError('Realtime Database delete data', () =>
      this.axiosInstance.delete(`${normalizedPath}.json`, {
        params: this.authParams
      })
    );
  }

  async getShallowData(path: string): Promise<Record<string, boolean> | null> {
    return this.getData(path, { shallow: true });
  }
}
