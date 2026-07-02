import { createAxios } from '@slates/provider';
import { typeformApiError } from './errors';

export class TypeformClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; baseUrl: string }) {
    this.axios = createAxios({
      baseURL: config.baseUrl,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private async request<T>(action: string, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      throw typeformApiError(action, error);
    }
  }

  // ─── Account ──────────────────────────────────────────────────

  async getAccount(): Promise<any> {
    let response = await this.request('retrieving account profile', () =>
      this.axios.get('/me')
    );
    return response.data;
  }

  // ─── Forms ────────────────────────────────────────────────────

  async listForms(params?: {
    search?: string;
    page?: number;
    pageSize?: number;
    workspaceId?: string;
    sortBy?: string;
    orderBy?: string;
    sort?: string;
  }): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.search) query.search = params.search;
    if (params?.page) query.page = params.page;
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.workspaceId) query.workspace_id = params.workspaceId;
    if (params?.sortBy) query.sort_by = params.sortBy;
    if (params?.orderBy) query.order_by = params.orderBy;
    if (params?.sort && !params.sortBy) {
      let [sortBy, orderBy] = params.sort.split(',').map(value => value.trim());
      if (sortBy) query.sort_by = sortBy;
      if (orderBy && !params.orderBy) query.order_by = orderBy;
    }

    let response = await this.request('listing forms', () =>
      this.axios.get('/forms', { params: query })
    );
    return response.data;
  }

  async getForm(formId: string): Promise<any> {
    let response = await this.request('retrieving form', () =>
      this.axios.get(`/forms/${formId}`)
    );
    return response.data;
  }

  async createForm(formData: any): Promise<any> {
    let response = await this.request('creating form', () =>
      this.axios.post('/forms', formData)
    );
    return response.data;
  }

  async updateForm(formId: string, formData: any): Promise<any> {
    let response = await this.request('updating form', () =>
      this.axios.put(`/forms/${formId}`, formData)
    );
    return response.data;
  }

  async patchForm(formId: string, operations: any[]): Promise<void> {
    await this.request('patching form', () =>
      this.axios.patch(`/forms/${formId}`, operations)
    );
  }

  async deleteForm(formId: string): Promise<void> {
    await this.request('deleting form', () => this.axios.delete(`/forms/${formId}`));
  }

  async getFormMessages(formId: string): Promise<any> {
    let response = await this.request('retrieving form messages', () =>
      this.axios.get(`/forms/${formId}/messages`)
    );
    return response.data;
  }

  async updateFormMessages(formId: string, messages: any): Promise<void> {
    await this.request('updating form messages', () =>
      this.axios.put(`/forms/${formId}/messages`, messages)
    );
  }

  // ─── Responses ────────────────────────────────────────────────

  async getResponses(
    formId: string,
    params?: {
      pageSize?: number;
      since?: string;
      until?: string;
      after?: string;
      before?: string;
      includedResponseIds?: string;
      excludedResponseIds?: string;
      completed?: boolean;
      sort?: string;
      query?: string;
      fields?: string[];
      answeredFields?: string[];
      responseType?: string;
      responseTypes?: string[];
    }
  ): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.since) query.since = params.since;
    if (params?.until) query.until = params.until;
    if (params?.after) query.after = params.after;
    if (params?.before) query.before = params.before;
    if (params?.includedResponseIds) query.included_response_ids = params.includedResponseIds;
    if (params?.excludedResponseIds) query.excluded_response_ids = params.excludedResponseIds;
    if (params?.completed !== undefined) query.completed = params.completed;
    if (params?.sort) query.sort = params.sort;
    if (params?.query) query.query = params.query;
    if (params?.fields) query.fields = params.fields.join(',');
    if (params?.answeredFields) query.answered_fields = params.answeredFields.join(',');
    if (params?.responseTypes?.length) query.response_type = params.responseTypes.join(',');
    else if (params?.responseType) query.response_type = params.responseType;

    let response = await this.request('retrieving responses', () =>
      this.axios.get(`/forms/${formId}/responses`, { params: query })
    );
    return response.data;
  }

  async deleteResponses(formId: string, includedTokens: string[]): Promise<void> {
    await this.request('deleting responses', () =>
      this.axios.delete(`/forms/${formId}/responses`, {
        params: { included_tokens: includedTokens.join(',') }
      })
    );
  }

  async downloadResponseFile(params: {
    formId: string;
    responseId: string;
    fieldId: string;
    filename: string;
    inline?: boolean;
  }): Promise<{
    base64Content: string;
    contentType?: string;
    contentDisposition?: string;
    byteLength: number;
  }> {
    let response = await this.request('downloading response file', () =>
      this.axios.get(
        `/forms/${params.formId}/responses/${params.responseId}/fields/${params.fieldId}/files/${encodeURIComponent(params.filename)}`,
        {
          params: params.inline === undefined ? undefined : { inline: String(params.inline) },
          responseType: 'arraybuffer'
        }
      )
    );
    let buffer = Buffer.from(response.data);
    let contentType = response.headers?.['content-type'];
    let contentDisposition = response.headers?.['content-disposition'];

    return {
      base64Content: buffer.toString('base64'),
      contentType: typeof contentType === 'string' ? contentType : undefined,
      contentDisposition:
        typeof contentDisposition === 'string' ? contentDisposition : undefined,
      byteLength: buffer.byteLength
    };
  }

  // ─── Workspaces ───────────────────────────────────────────────

  async listWorkspaces(params?: {
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.search) query.search = params.search;
    if (params?.page) query.page = params.page;
    if (params?.pageSize) query.page_size = params.pageSize;

    let response = await this.request('listing workspaces', () =>
      this.axios.get('/workspaces', { params: query })
    );
    return response.data;
  }

  async getWorkspace(workspaceId: string): Promise<any> {
    let response = await this.request('retrieving workspace', () =>
      this.axios.get(`/workspaces/${workspaceId}`)
    );
    return response.data;
  }

  async createWorkspace(name: string): Promise<any> {
    let response = await this.request('creating workspace', () =>
      this.axios.post('/workspaces', { name })
    );
    return response.data;
  }

  async updateWorkspace(workspaceId: string, operations: any[]): Promise<void> {
    await this.request('updating workspace', () =>
      this.axios.patch(`/workspaces/${workspaceId}`, operations)
    );
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.request('deleting workspace', () =>
      this.axios.delete(`/workspaces/${workspaceId}`)
    );
  }

  // ─── Themes ───────────────────────────────────────────────────

  async listThemes(params?: { page?: number; pageSize?: number }): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.pageSize) query.page_size = params.pageSize;

    let response = await this.request('listing themes', () =>
      this.axios.get('/themes', { params: query })
    );
    return response.data;
  }

  async getTheme(themeId: string): Promise<any> {
    let response = await this.request('retrieving theme', () =>
      this.axios.get(`/themes/${themeId}`)
    );
    return response.data;
  }

  async createTheme(themeData: any): Promise<any> {
    let response = await this.request('creating theme', () =>
      this.axios.post('/themes', themeData)
    );
    return response.data;
  }

  async updateTheme(themeId: string, themeData: any): Promise<any> {
    let response = await this.request('updating theme', () =>
      this.axios.patch(`/themes/${themeId}`, themeData)
    );
    return response.data;
  }

  async deleteTheme(themeId: string): Promise<void> {
    await this.request('deleting theme', () => this.axios.delete(`/themes/${themeId}`));
  }

  // ─── Images ───────────────────────────────────────────────────

  async listImages(): Promise<any> {
    let response = await this.request('listing images', () => this.axios.get('/images'));
    return response.data;
  }

  async getImage(imageId: string): Promise<any> {
    let response = await this.request('retrieving image', () =>
      this.axios.get(`/images/${imageId}`, {
        headers: {
          Accept: 'application/json'
        }
      })
    );
    return response.data;
  }

  async createImage(imageData: {
    image?: string;
    url?: string;
    fileName: string;
  }): Promise<any> {
    let response = await this.request('creating image', () =>
      this.axios.post('/images', {
        ...(imageData.image ? { image: imageData.image } : {}),
        ...(imageData.url ? { url: imageData.url } : {}),
        file_name: imageData.fileName
      })
    );
    return response.data;
  }

  async deleteImage(imageId: string): Promise<void> {
    await this.request('deleting image', () => this.axios.delete(`/images/${imageId}`));
  }

  // ─── Webhooks ─────────────────────────────────────────────────

  async listWebhooks(formId: string): Promise<any> {
    let response = await this.request('listing webhooks', () =>
      this.axios.get(`/forms/${formId}/webhooks`)
    );
    return response.data;
  }

  async getWebhook(formId: string, tag: string): Promise<any> {
    let response = await this.request('retrieving webhook', () =>
      this.axios.get(`/forms/${formId}/webhooks/${tag}`)
    );
    return response.data;
  }

  async createOrUpdateWebhook(
    formId: string,
    tag: string,
    params: {
      url: string;
      enabled?: boolean;
      secret?: string;
      verifySsl?: boolean;
      eventTypes?: Record<string, boolean>;
    }
  ): Promise<any> {
    let body: Record<string, any> = {
      url: params.url
    };
    if (params.enabled !== undefined) body.enabled = params.enabled;
    if (params.secret) body.secret = params.secret;
    if (params.verifySsl !== undefined) body.verify_ssl = params.verifySsl;
    if (params.eventTypes) body.event_types = params.eventTypes;

    let response = await this.request('creating or updating webhook', () =>
      this.axios.put(`/forms/${formId}/webhooks/${tag}`, body)
    );
    return response.data;
  }

  async deleteWebhook(formId: string, tag: string): Promise<void> {
    await this.request('deleting webhook', () =>
      this.axios.delete(`/forms/${formId}/webhooks/${tag}`)
    );
  }

  // ─── Insights ─────────────────────────────────────────────────

  async getFormInsights(formId: string): Promise<any> {
    let response = await this.request('retrieving form insights', () =>
      this.axios.get(`/insights/${formId}/summary`)
    );
    return response.data;
  }

  // ─── Translations ─────────────────────────────────────────────

  async getTranslationStatuses(formId: string): Promise<any> {
    let response = await this.request('retrieving translation statuses', () =>
      this.axios.get(`/forms/${formId}/translations/status`)
    );
    return response.data;
  }

  async getMainTranslationPayload(formId: string): Promise<any> {
    let response = await this.request('retrieving main translation payload', () =>
      this.axios.get(`/forms/${formId}/translations/main`)
    );
    return response.data;
  }

  async getTranslation(formId: string, language: string): Promise<any> {
    let response = await this.request('retrieving translation', () =>
      this.axios.get(`/forms/${formId}/translations/${language}`)
    );
    return response.data;
  }

  async updateTranslation(
    formId: string,
    language: string,
    translationData: any
  ): Promise<void> {
    await this.request('updating translation', () =>
      this.axios.put(`/forms/${formId}/translations/${language}`, translationData)
    );
  }

  async deleteTranslation(formId: string, language: string): Promise<void> {
    await this.request('deleting translation', () =>
      this.axios.delete(`/forms/${formId}/translations/${language}`)
    );
  }

  async autoTranslate(formId: string, language: string): Promise<any> {
    let response = await this.request('auto-translating form', () =>
      this.axios.post(`/forms/${formId}/translations/${language}/auto`)
    );
    return response.data;
  }
}
