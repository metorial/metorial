import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

let BASE_URL = 'https://app.passcreator.com';

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A Passcreator API key is required. Reconnect with a valid API key.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { value: config.token },
      timeout: 30_000,
      maxRedirects: 0,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Passcreator',
          reason: 'Passcreator API request failed',
          detailKeys: ['description', 'message', 'error', 'detail'],
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
        })
    });
    this.axios.interceptors.response.use(response => {
      if (response.data?.success === false) {
        throw buildApiServiceError(
          {
            response: {
              status: response.data.statusCode ?? response.status,
              data: response.data
            }
          },
          {
            providerLabel: 'Passcreator',
            reason: 'Passcreator API request failed',
            detailKeys: ['description', 'message', 'error', 'detail'],
            extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
          }
        );
      }
      return response;
    });
  }

  private passPagePath(value: string): string {
    let url: URL;
    try {
      url = new URL(value, BASE_URL);
    } catch {
      throw createApiServiceError('nextPageUrl must be a valid Passcreator pagination URL.');
    }
    if (
      url.origin !== BASE_URL ||
      url.username ||
      url.password ||
      url.hash ||
      !(url.pathname === '/api/v3/pass' || url.pathname.startsWith('/api/pass/list/'))
    ) {
      throw createApiServiceError(
        'Use the nextPageUrl returned by the Passcreator pass listing.'
      );
    }
    return `${url.pathname}${url.search}`;
  }

  async listPassesPage(nextPageUrl: string): Promise<any> {
    let response = await this.axios.get(this.passPagePath(nextPageUrl));
    return response.data;
  }

  // ─── Pass Templates (V1) ───

  async listTemplates(): Promise<any[]> {
    let response = await this.axios.get('/api/pass-template');
    return response.data;
  }

  async getTemplateFields(templateId: string): Promise<any[]> {
    let response = await this.axios.get(
      `/api/pass-template/${encodeURIComponent(templateId)}`,
      {
        params: { zapierStyle: 'true' }
      }
    );
    return response.data;
  }

  async copyTemplate(
    templateId: string,
    body: { name: string; description?: string }
  ): Promise<any> {
    let response = await this.axios.post(
      `/api/pass-template/copy/${encodeURIComponent(templateId)}`,
      body
    );
    return response.data;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await this.axios.delete(`/api/pass-template/${encodeURIComponent(templateId)}`);
  }

  // ─── Pass Templates (V2) ───

  async createTemplate(body: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/api/v2/pass-template', body);
    return response.data;
  }

  async describeTemplate(templateId: string): Promise<any> {
    let response = await this.axios.get(
      `/api/v2/pass-template/${encodeURIComponent(templateId)}/describe`
    );
    return response.data;
  }

  async updateTemplate(templateId: string, body: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      `/api/v2/pass-template/${encodeURIComponent(templateId)}`,
      body
    );
    return response.data;
  }

  async patchTemplate(templateId: string, body: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(
      `/api/v2/pass-template/${encodeURIComponent(templateId)}`,
      body
    );
    return response.data;
  }

  async publishTemplate(templateId: string): Promise<any> {
    let response = await this.axios.post(
      `/api/v2/pass-template/${encodeURIComponent(templateId)}/publish`
    );
    return response.data;
  }

  // ─── Template Notifications ───

  async scheduleTemplateNotification(
    templateId: string,
    body: { pushNotificationText: string; publicationDate?: string }
  ): Promise<any> {
    let response = await this.axios.post(
      `/api/pass-template/${encodeURIComponent(templateId)}/notification`,
      body
    );
    return response.data;
  }

  async listTemplateNotifications(templateId: string): Promise<any> {
    let response = await this.axios.get(
      `/api/pass-template/${encodeURIComponent(templateId)}/notification`
    );
    return response.data;
  }

  async deleteTemplateNotification(notificationId: string): Promise<void> {
    await this.axios.delete(
      `/api/pass-template/notification/${encodeURIComponent(notificationId)}`
    );
  }

  // ─── Passes (V1) ───

  async createPassV1(templateId: string, body: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/api/pass', body, {
      params: { passtemplate: templateId, zapierStyle: 'true' }
    });
    return response.data;
  }

  async listPasses(
    templateId: string,
    params?: {
      start?: number;
      pageSize?: number;
      lastIdOfPriorPage?: string;
      createdSince?: string;
      modifiedSince?: string;
    }
  ): Promise<any> {
    let response = await this.axios.get(`/api/pass/list/${encodeURIComponent(templateId)}`, {
      params
    });
    return response.data;
  }

  async getPass(
    passId: string,
    params?: { includeFieldMapping?: boolean; appConfigurationId?: string }
  ): Promise<any> {
    let response = await this.axios.get(`/api/pass/${encodeURIComponent(passId)}`, { params });
    return response.data;
  }

  async getPassUris(passId: string): Promise<any> {
    let response = await this.axios.get(`/api/pass/geturis/${encodeURIComponent(passId)}`);
    return response.data;
  }

  async searchPasses(templateId: string, searchString: string): Promise<any[]> {
    let response = await this.axios.get(
      `/api/pass/search/${encodeURIComponent(templateId)}/${encodeURIComponent(searchString)}`
    );
    return response.data;
  }

  async updatePassV1(passId: string, body: Record<string, any>): Promise<void> {
    await this.axios.post(`/api/pass/${encodeURIComponent(passId)}`, body, {
      params: { zapierStyle: 'true' }
    });
  }

  async voidPass(passId: string, voided: boolean): Promise<void> {
    await this.axios.put(`/api/pass/${encodeURIComponent(passId)}`, { voided });
  }

  async deletePassV1(passId: string): Promise<void> {
    await this.axios.delete(`/api/pass/${encodeURIComponent(passId)}`);
  }

  async enableDownload(passId: string, enableDownloadUntil?: string): Promise<void> {
    let body: Record<string, any> = {};
    if (enableDownloadUntil) {
      body.enableDownloadUntil = enableDownloadUntil;
    }
    await this.axios.post(`/api/pass/${encodeURIComponent(passId)}/enabledownload`, body);
  }

  // ─── Passes (V3) ───

  async createPass(body: Record<string, any>, async_?: boolean): Promise<any> {
    let response = await this.axios.post(
      '/api/v3/pass',
      { data: body },
      {
        params: async_ !== undefined ? { async: async_ } : undefined
      }
    );
    return response.data;
  }

  async updatePass(passId: string, body: Record<string, any>, async_?: boolean): Promise<any> {
    let response = await this.axios.post(
      `/api/v3/pass/${encodeURIComponent(passId)}`,
      { data: body },
      {
        params: async_ !== undefined ? { async: async_ } : undefined
      }
    );
    return response.data;
  }

  async patchPass(passId: string, body: Record<string, any>, async_?: boolean): Promise<any> {
    let response = await this.axios.patch(
      `/api/v3/pass/${encodeURIComponent(passId)}`,
      { data: body },
      {
        params: async_ !== undefined ? { async: async_ } : undefined
      }
    );
    return response.data;
  }

  async bulkUpdatePasses(
    method: 'POST' | 'PATCH',
    body: { data: Record<string, any>; filter: Record<string, any> }
  ): Promise<any> {
    let response =
      method === 'PATCH'
        ? await this.axios.patch('/api/v3/pass/bulk', body)
        : await this.axios.post('/api/v3/pass/bulk', body);
    return response.data;
  }

  async listPassesV3(params?: {
    pageSize?: number;
    formatKeyAdditionalProperties?: string;
    segmentId?: string;
    query?: string;
    fields?: string;
    nextPageUrl?: string;
  }): Promise<any> {
    if (params?.nextPageUrl) {
      let response = await this.axios.get(this.passPagePath(params.nextPageUrl));
      return response.data;
    }
    let queryParams: Record<string, any> = {};
    if (params?.pageSize) queryParams.pageSize = params.pageSize;
    if (params?.formatKeyAdditionalProperties)
      queryParams.formatKeyAdditionalProperties = params.formatKeyAdditionalProperties;
    if (params?.segmentId) queryParams.segmentId = params.segmentId;
    if (params?.query) queryParams.query = params.query;
    if (params?.fields) queryParams.fields = params.fields;
    let response = await this.axios.get('/api/v3/pass', { params: queryParams });
    return response.data;
  }

  async deletePass(passId: string): Promise<any> {
    let response = await this.axios.delete(`/api/v3/pass/${encodeURIComponent(passId)}`);
    return response.data;
  }

  async movePass(passId: string, targetTemplateId: string): Promise<any> {
    let response = await this.axios.post(
      `/api/v2/pass/${encodeURIComponent(passId)}/movetotemplate/${encodeURIComponent(targetTemplateId)}`
    );
    return response.data;
  }

  // ─── Distribution ───

  async sendPassByEmail(passId: string, email: string): Promise<any> {
    let response = await this.axios.post(
      `/api/pass/deliver/${encodeURIComponent(passId)}/email/${encodeURIComponent(email)}`
    );
    return response.data;
  }

  async sendPushNotification(passId: string, text: string): Promise<void> {
    await this.axios.post(`/api/pass/${encodeURIComponent(passId)}/sendpushnotification`, {
      pushNotificationText: text
    });
  }

  async sendBulkPushNotifications(passIds: string[], text: string): Promise<any> {
    let response = await this.axios.post('/api/pass/sendpushnotifications', {
      listOfPasses: passIds,
      pushNotificationText: text
    });
    return response.data;
  }

  // ─── Statistics ───

  async getPassStatistics(templateId: string, timeFrame: string, day: string): Promise<any> {
    let response = await this.axios.get(
      `/api/pass/statistics/${encodeURIComponent(templateId)}`,
      {
        params: { timeFrame, day }
      }
    );
    return response.data;
  }

  async getActiveHistory(templateId: string, startingDay: string): Promise<any> {
    let response = await this.axios.get(
      `/api/pass/statistics/${encodeURIComponent(templateId)}/activehistory/${encodeURIComponent(startingDay)}`
    );
    return response.data;
  }

  // ─── Bundling ───

  async createBundle(passIds: string[]): Promise<any> {
    let response = await this.axios.post('/api/v2/pass-bundle', { passes: passIds });
    return response.data;
  }

  async updateBundle(bundleId: string, passIds: string[]): Promise<any> {
    let response = await this.axios.post(
      `/api/v2/pass-bundle/${encodeURIComponent(bundleId)}`,
      {
        passes: passIds
      }
    );
    return response.data;
  }

  async getBundle(bundleId: string): Promise<any> {
    let response = await this.axios.get(`/api/v2/pass-bundle/${encodeURIComponent(bundleId)}`);
    return response.data;
  }

  async voidBundle(bundleId: string, voided: boolean): Promise<any> {
    let response = await this.axios.put(
      `/api/v2/pass-bundle/void/${encodeURIComponent(bundleId)}`,
      { voided }
    );
    return response.data;
  }

  async deleteBundle(bundleId: string): Promise<void> {
    await this.axios.delete(`/api/v2/pass-bundle/${encodeURIComponent(bundleId)}`);
  }

  // ─── App Configurations / Validation ───

  async listAppConfigurations(): Promise<any[]> {
    let response = await this.axios.get('/api/appconfiguration');
    return response.data;
  }

  async getAppConfiguration(configId: string): Promise<any> {
    let response = await this.axios.get(
      `/api/appconfiguration/${encodeURIComponent(configId)}`
    );
    return response.data;
  }

  async createAppConfiguration(body: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/api/appconfiguration', body);
    return response.data;
  }

  async listAppScans(
    configId: string,
    params?: { start?: number; pageSize?: number; createdSince?: string }
  ): Promise<any> {
    let response = await this.axios.get(`/api/appscan/list/${encodeURIComponent(configId)}`, {
      params
    });
    return response.data;
  }

  async createAppScan(body: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/api/appscan', body);
    return response.data;
  }

  // ─── Webhooks ───

  async subscribeWebhook(
    event: string,
    targetUrl: string,
    options?: { templateId?: string; retryEnabled?: boolean; signPayload?: boolean }
  ): Promise<any> {
    let url = options?.templateId
      ? `/api/hook/subscribe/${options.templateId}`
      : '/api/hook/subscribe';
    let body: Record<string, any> = {
      target_url: targetUrl,
      event
    };
    if (options?.retryEnabled !== undefined) body.retryEnabled = options.retryEnabled;
    if (options?.signPayload !== undefined) body.signPayload = options.signPayload;
    let response = await this.axios.post(url, body);
    return response.data;
  }

  async unsubscribeWebhook(targetUrl: string): Promise<void> {
    await this.axios.post('/api/hook/unsubscribe', { target_url: targetUrl });
  }

  async listWebhooks(): Promise<any[]> {
    let response = await this.axios.get('/api/hook/list');
    return response.data;
  }

  // ─── Process ───

  async getProcess(processId: string): Promise<any> {
    let response = await this.axios.get(`/api/v3/process/${encodeURIComponent(processId)}`);
    return response.data;
  }
}
