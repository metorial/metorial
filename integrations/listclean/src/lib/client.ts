import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export let LISTCLEAN_BASE_URL = 'https://api.listclean.xyz/v1';

export interface VerificationResult {
  email: string;
  status: string;
  remarks: string;
}

export interface AccountProfile {
  id?: string | number;
  email?: string;
  name?: string;
}

// These fields belong to the existing bulk tools. Their legacy routes remain
// separate from the published /lists API below.
export interface BulkList {
  listId: string;
  fileName: string;
  status: string;
  totalEmails: number;
  cleanCount: number;
  dirtyCount: number;
  unknownCount: number;
  createdAt: string;
}

export interface BulkUploadResult {
  listId: string;
  fileName: string;
  status: string;
  totalEmails: number;
}

export interface VerificationList {
  list_id?: number;
  filename?: string;
  size_in_bytes?: number;
  request_time?: string;
  status?: string;
  upload_id?: string;
}

export interface VerificationLists {
  lists: VerificationList[];
  total?: number;
  cursor?: number;
}

let apiError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'Listclean',
    reason: 'listclean_api_error',
    operation,
    extractResponse: (value, helpers) => {
      let response = helpers.getResponseWithBody(value);
      if (typeof response?.data === 'string') {
        try {
          return { ...response, data: JSON.parse(response.data) };
        } catch {
          return response;
        }
      }
      return response;
    },
    extractUpstreamCode: (_value, response) => {
      let body = response?.data;
      return isApiErrorRecord(body) && body.error_code !== undefined
        ? String(body.error_code)
        : undefined;
    },
    parent: {}
  });

export class ListcleanClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(opts: { token: string }) {
    if (!opts.token.trim()) {
      throw createApiServiceError('Connect a Listclean account with an API token.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: LISTCLEAN_BASE_URL,
      authHeader: { name: 'X-Auth-Token', value: opts.token },
      errorAdapter: error => apiError(error, 'request')
    });
  }

  private async request<T>(
    operation: string,
    request: () => Promise<{ data: unknown; status: number }>
  ): Promise<T> {
    try {
      let response = await request();
      let body = response.data;
      if (typeof body === 'string' && body.trimStart().startsWith('{')) {
        try {
          body = JSON.parse(body);
        } catch {
          // CSV downloads may begin with a brace; preserve their original text.
        }
      }
      if (isApiErrorRecord(body) && 'success' in body) {
        if (body.success !== 1) {
          throw apiError({ response: { status: response.status, data: body } }, operation);
        }
        if (!('data' in body)) {
          throw createApiServiceError(`Listclean ${operation} returned no result data.`);
        }
        return body.data as T;
      }
      // Retain the legacy bulk tools' flat payloads and raw CSV return values.
      return response.data as T;
    } catch (error) {
      throw apiError(error, operation);
    }
  }

  async verifyEmail(email: string): Promise<VerificationResult> {
    let result = await this.request<VerificationResult>('verify email', () =>
      this.axios.get(`/verify/email/${encodeURIComponent(email)}`)
    );
    if (
      !result ||
      typeof result.email !== 'string' ||
      typeof result.status !== 'string' ||
      typeof result.remarks !== 'string'
    ) {
      throw createApiServiceError(
        'Listclean returned an incomplete email verification result.'
      );
    }
    return result;
  }

  async getAccountProfile(): Promise<AccountProfile> {
    let profile = await this.request<AccountProfile>('get account profile', () =>
      this.axios.get('/account/profile/')
    );
    if (!isApiErrorRecord(profile)) {
      throw createApiServiceError('Listclean returned no account profile.');
    }
    return profile;
  }

  async getCredits(): Promise<number> {
    let data = await this.request<{ credits: number }>('get credits', () =>
      this.axios.get('/credits')
    );
    if (!data || typeof data.credits !== 'number' || !Number.isFinite(data.credits)) {
      throw createApiServiceError('Listclean returned no valid credit balance.');
    }
    return data.credits;
  }

  async uploadBulkList(
    fileName: string,
    fileContent: string,
    fileType: 'csv' | 'txt'
  ): Promise<BulkUploadResult> {
    let formData = new FormData();
    let blob = new Blob([fileContent], {
      type: fileType === 'csv' ? 'text/csv' : 'text/plain'
    });
    formData.append('file', blob, fileName);

    let result = await this.request<BulkUploadResult>('upload bulk list', () =>
      this.axios.post('/bulk/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    );
    if (!result || result.listId === undefined) {
      throw createApiServiceError(
        'Listclean returned no identifier for the uploaded bulk list.'
      );
    }
    return { ...result, listId: String(result.listId) };
  }

  async getBulkListStatus(listId: string): Promise<BulkList> {
    let result = await this.request<BulkList>('get bulk list status', () =>
      this.axios.get(`/bulk/list/${encodeURIComponent(listId)}/`)
    );
    if (!result || result.listId === undefined) {
      throw createApiServiceError('Listclean returned no bulk list identifier.');
    }
    return { ...result, listId: String(result.listId) };
  }

  async getBulkLists(): Promise<BulkList[]> {
    let data = await this.request<BulkList[] | { results: BulkList[] }>(
      'list bulk lists',
      () => this.axios.get('/bulk/lists/')
    );
    let lists = Array.isArray(data) ? data : data?.results;
    if (!Array.isArray(lists)) {
      throw createApiServiceError('Listclean returned no bulk list collection.');
    }
    return lists.map(list => {
      if (!list || list.listId === undefined) {
        throw createApiServiceError('Listclean returned a bulk list without an identifier.');
      }
      return { ...list, listId: String(list.listId) };
    });
  }

  async downloadBulkResults(
    listId: string,
    filter: 'all' | 'clean' | 'dirty' = 'all'
  ): Promise<string> {
    let filterParam = filter === 'clean' ? 'ok' : filter === 'dirty' ? 'bad' : 'all';
    return this.download(`/bulk/list/${encodeURIComponent(listId)}/download/`, {
      filter: filterParam
    });
  }

  async verifyEmailBatch(emails: string[], fileName?: string): Promise<string> {
    let data = await this.request<{ list_id: number }>('verify email batch', () =>
      this.axios.post('/verify/email/batch', pickDefined({ emails, filename: fileName }))
    );
    if (!data || typeof data.list_id !== 'number' || !Number.isFinite(data.list_id)) {
      throw createApiServiceError('Listclean returned no batch list identifier.');
    }
    return String(data.list_id);
  }

  async listVerificationLists(): Promise<VerificationLists> {
    let result = await this.request<VerificationLists>('list verification lists', () =>
      this.axios.get('/lists/')
    );
    if (!result || !Array.isArray(result.lists)) {
      throw createApiServiceError('Listclean returned no verification list collection.');
    }
    return result;
  }

  async getVerificationList(listId: string): Promise<VerificationList[]> {
    let result = await this.request<VerificationList[]>('get verification list', () =>
      this.axios.get(`/lists/${encodeURIComponent(listId)}`)
    );
    if (!Array.isArray(result)) {
      throw createApiServiceError('Listclean returned no verification list records.');
    }
    return result;
  }

  private async download(path: string, params?: Record<string, string>): Promise<string> {
    let result = await this.request<unknown>('download results', () =>
      this.axios.get(path, { params, responseType: 'text' })
    );
    if (typeof result !== 'string') {
      throw createApiServiceError('Listclean returned a response without CSV file content.');
    }
    return result;
  }
}
