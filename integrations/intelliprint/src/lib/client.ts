import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  requestAxiosData
} from 'slates';

let apiError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'Intelliprint',
    reason: 'intelliprint_api_error',
    operation,
    nestedKeys: ['error', 'errors'],
    detailKeys: ['message', 'type', 'code', 'param'],
    extractResponse: (error, helpers) => {
      let response = helpers.getResponse(error);
      if (
        isApiErrorRecord(error) &&
        isApiErrorRecord(error.data) &&
        isApiErrorRecord(error.data.baggage)
      ) {
        return { ...response, data: error.data.baggage.response };
      }
      return response;
    },
    extractUpstreamCode: (_, response) => {
      let body = response?.data;
      return isApiErrorRecord(body) &&
        isApiErrorRecord(body.error) &&
        typeof body.error.code === 'string'
        ? body.error.code
        : undefined;
    }
  });

let resourceId = (id: string) => {
  if (!id.trim()) {
    throw createApiServiceError('Provide a non-empty Intelliprint resource ID.');
  }
  return encodeURIComponent(id);
};

let BASE_URL = 'https://api.intelliprint.net/v1';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Provide your Intelliprint API key.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      timeout: 30_000,
      authHeader: { value: `Bearer ${config.token}` }
    });
  }

  // ─── Print Jobs ───────────────────────────────────────────────

  async createPrintJob(params: Record<string, any>): Promise<any> {
    return requestAxiosData<any>(
      'post print jobs',
      () =>
        this.axios.post('/prints', params, {
          headers: { 'Content-Type': 'application/json' }
        }),
      apiError
    );
  }

  async getPrintJob(printJobId: string): Promise<any> {
    return requestAxiosData<any>(
      'get print jobs',
      () => this.axios.get(`/prints/${resourceId(printJobId)}`),
      apiError
    );
  }

  async listPrintJobs(params?: Record<string, any>): Promise<any> {
    return requestAxiosData<any>(
      'get print jobs',
      () => this.axios.get('/prints', { params }),
      apiError
    );
  }

  async updatePrintJob(printJobId: string, params: Record<string, any>): Promise<any> {
    return requestAxiosData<any>(
      'post print jobs',
      () =>
        this.axios.post(`/prints/${resourceId(printJobId)}`, params, {
          headers: { 'Content-Type': 'application/json' }
        }),
      apiError
    );
  }

  async deletePrintJob(printJobId: string): Promise<any> {
    return requestAxiosData<any>(
      'delete print jobs',
      () => this.axios.delete(`/prints/${resourceId(printJobId)}`),
      apiError
    );
  }

  // ─── Backgrounds ──────────────────────────────────────────────

  async createBackground(params: Record<string, any>): Promise<any> {
    return requestAxiosData<any>(
      'post backgrounds',
      () =>
        this.axios.post('/backgrounds', params, {
          headers: { 'Content-Type': 'application/json' }
        }),
      apiError
    );
  }

  async getBackground(backgroundId: string): Promise<any> {
    return requestAxiosData<any>(
      'get backgrounds',
      () => this.axios.get(`/backgrounds/${resourceId(backgroundId)}`),
      apiError
    );
  }

  async listBackgrounds(params?: Record<string, any>): Promise<any> {
    return requestAxiosData<any>(
      'get backgrounds',
      () => this.axios.get('/backgrounds', { params }),
      apiError
    );
  }

  async updateBackground(backgroundId: string, params: Record<string, any>): Promise<any> {
    return requestAxiosData<any>(
      'post backgrounds',
      () =>
        this.axios.post(`/backgrounds/${resourceId(backgroundId)}`, params, {
          headers: { 'Content-Type': 'application/json' }
        }),
      apiError
    );
  }

  async deleteBackground(backgroundId: string): Promise<any> {
    return requestAxiosData<any>(
      'delete backgrounds',
      () => this.axios.delete(`/backgrounds/${resourceId(backgroundId)}`),
      apiError
    );
  }

  // ─── Mailing Lists ───────────────────────────────────────────

  async createMailingList(params: Record<string, any>): Promise<any> {
    return requestAxiosData<any>(
      'post mailing lists',
      () =>
        this.axios.post('/mailing_lists', params, {
          headers: { 'Content-Type': 'application/json' }
        }),
      apiError
    );
  }

  async getMailingList(mailingListId: string): Promise<any> {
    return requestAxiosData<any>(
      'get mailing lists',
      () => this.axios.get(`/mailing_lists/${resourceId(mailingListId)}`),
      apiError
    );
  }

  async listMailingLists(params?: Record<string, any>): Promise<any> {
    return requestAxiosData<any>(
      'get mailing lists',
      () => this.axios.get('/mailing_lists', { params }),
      apiError
    );
  }

  async updateMailingList(mailingListId: string, params: Record<string, any>): Promise<any> {
    return requestAxiosData<any>(
      'post mailing lists',
      () =>
        this.axios.post(`/mailing_lists/${resourceId(mailingListId)}`, params, {
          headers: { 'Content-Type': 'application/json' }
        }),
      apiError
    );
  }

  async deleteMailingList(mailingListId: string): Promise<any> {
    return requestAxiosData<any>(
      'delete mailing lists',
      () => this.axios.delete(`/mailing_lists/${resourceId(mailingListId)}`),
      apiError
    );
  }

  // ─── Mailing List Recipients ──────────────────────────────────

  async createRecipient(mailingListId: string, params: Record<string, any>): Promise<any> {
    return requestAxiosData<any>(
      'post recipients',
      () =>
        this.axios.post(`/mailing_lists/${resourceId(mailingListId)}/recipients`, params, {
          headers: { 'Content-Type': 'application/json' }
        }),
      apiError
    );
  }

  async getRecipient(mailingListId: string, recipientId: string): Promise<any> {
    return requestAxiosData<any>(
      'get recipients',
      () =>
        this.axios.get(
          `/mailing_lists/${resourceId(mailingListId)}/recipients/${resourceId(recipientId)}`
        ),
      apiError
    );
  }

  async listRecipients(mailingListId: string, params?: Record<string, any>): Promise<any> {
    return requestAxiosData<any>(
      'get recipients',
      () =>
        this.axios.get(`/mailing_lists/${resourceId(mailingListId)}/recipients`, {
          params
        }),
      apiError
    );
  }

  async updateRecipient(
    mailingListId: string,
    recipientId: string,
    params: Record<string, any>
  ): Promise<any> {
    return requestAxiosData<any>(
      'post recipients',
      () =>
        this.axios.post(
          `/mailing_lists/${resourceId(mailingListId)}/recipients/${resourceId(recipientId)}`,
          params,
          {
            headers: { 'Content-Type': 'application/json' }
          }
        ),
      apiError
    );
  }

  async deleteRecipient(mailingListId: string, recipientId: string): Promise<any> {
    return requestAxiosData<any>(
      'delete recipients',
      () =>
        this.axios.delete(
          `/mailing_lists/${resourceId(mailingListId)}/recipients/${resourceId(recipientId)}`
        ),
      apiError
    );
  }
}
