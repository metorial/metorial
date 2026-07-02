import { createAxios } from 'slates';

export interface ZohoClientConfig {
  token: string;
  apiBaseUrl: string;
}

export interface RecordData {
  [key: string]: any;
}

export interface ListParams {
  page?: number;
  perPage?: number;
  fields?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  ids?: string[];
}

export interface SearchParams {
  criteria?: string;
  email?: string;
  phone?: string;
  word?: string;
  page?: number;
  perPage?: number;
}

export interface CoqlQuery {
  selectQuery: string;
}

export interface NotificationWatch {
  channelId: string;
  eventsTypes: string[];
  notifyUrl: string;
  token?: string;
  channelExpiry?: string;
  notificationCondition?: Array<{ fieldName: string; value?: string; operation?: string }>;
}

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: ZohoClientConfig) {
    this.http = createAxios({
      baseURL: `${config.apiBaseUrl}/crm/v7`,
      headers: {
        Authorization: `Zoho-oauthtoken ${config.token}`
      }
    });
  }

  // --- Records ---

  async getRecords(module: string, params?: ListParams): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = String(params.page);
    if (params?.perPage) queryParams.per_page = String(params.perPage);
    if (params?.fields?.length) queryParams.fields = params.fields.join(',');
    if (params?.sortBy) queryParams.sort_by = params.sortBy;
    if (params?.sortOrder) queryParams.sort_order = params.sortOrder;
    if (params?.ids?.length) queryParams.ids = params.ids.join(',');

    let response = await this.http.get(`/${module}`, { params: queryParams });
    return response.data;
  }

  async getRecord(module: string, recordId: string, fields?: string[]): Promise<any> {
    let params: Record<string, string> = {};
    if (fields?.length) params.fields = fields.join(',');

    let response = await this.http.get(`/${module}/${recordId}`, { params });
    return response.data;
  }

  async createRecords(
    module: string,
    records: RecordData[],
    triggers?: string[]
  ): Promise<any> {
    let body: Record<string, any> = { data: records };
    if (triggers?.length) body.trigger = triggers;

    let response = await this.http.post(`/${module}`, body);
    return response.data;
  }

  async updateRecords(
    module: string,
    records: Array<RecordData & { id: string }>,
    triggers?: string[]
  ): Promise<any> {
    let body: Record<string, any> = { data: records };
    if (triggers?.length) body.trigger = triggers;

    let response = await this.http.put(`/${module}`, body);
    return response.data;
  }

  async updateRecord(
    module: string,
    recordId: string,
    record: RecordData,
    triggers?: string[]
  ): Promise<any> {
    let body: Record<string, any> = { data: [record] };
    if (triggers?.length) body.trigger = triggers;

    let response = await this.http.put(`/${module}/${recordId}`, body);
    return response.data;
  }

  async deleteRecords(module: string, recordIds: string[]): Promise<any> {
    let response = await this.http.delete(`/${module}`, {
      params: { ids: recordIds.join(',') }
    });
    return response.data;
  }

  // --- Search ---

  async searchRecords(module: string, params: SearchParams): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params.criteria) queryParams.criteria = params.criteria;
    if (params.email) queryParams.email = params.email;
    if (params.phone) queryParams.phone = params.phone;
    if (params.word) queryParams.word = params.word;
    if (params.page) queryParams.page = String(params.page);
    if (params.perPage) queryParams.per_page = String(params.perPage);

    let response = await this.http.get(`/${module}/search`, { params: queryParams });
    return response.data;
  }

  async executeCoql(query: CoqlQuery): Promise<any> {
    let response = await this.http.post('/coql', { select_query: query.selectQuery });
    return response.data;
  }

  // --- Users ---

  async getUsers(type?: string, page?: number, perPage?: number): Promise<any> {
    let params: Record<string, string> = {};
    if (type) params.type = type;
    if (page) params.page = String(page);
    if (perPage) params.per_page = String(perPage);

    let response = await this.http.get('/users', { params });
    return response.data;
  }

  async getUser(userId: string): Promise<any> {
    let response = await this.http.get(`/users/${userId}`);
    return response.data;
  }

  // --- Modules Metadata ---

  async getModules(): Promise<any> {
    let response = await this.http.get('/settings/modules');
    return response.data;
  }

  async getModuleFields(module: string): Promise<any> {
    let response = await this.http.get(`/settings/fields`, { params: { module } });
    return response.data;
  }

  async getModuleLayouts(module: string): Promise<any> {
    let response = await this.http.get(`/settings/layouts`, { params: { module } });
    return response.data;
  }

  // --- Notes ---

  async getNotes(
    module: string,
    recordId: string,
    page?: number,
    perPage?: number
  ): Promise<any> {
    let params: Record<string, string> = {};
    if (page) params.page = String(page);
    if (perPage) params.per_page = String(perPage);

    let response = await this.http.get(`/${module}/${recordId}/Notes`, { params });
    return response.data;
  }

  async createNote(
    module: string,
    recordId: string,
    noteTitle: string,
    noteContent: string
  ): Promise<any> {
    let response = await this.http.post(`/${module}/${recordId}/Notes`, {
      data: [{ Note_Title: noteTitle, Note_Content: noteContent }]
    });
    return response.data;
  }

  async deleteNote(module: string, recordId: string, noteId: string): Promise<any> {
    let response = await this.http.delete(`/${module}/${recordId}/Notes/${noteId}`);
    return response.data;
  }

  // --- Tags ---

  async getTags(module: string): Promise<any> {
    let response = await this.http.get('/settings/tags', { params: { module } });
    return response.data;
  }

  async addTagsToRecords(
    module: string,
    recordIds: string[],
    tagNames: string[]
  ): Promise<any> {
    let response = await this.http.post(`/${module}/actions/add_tags`, {
      ids: recordIds,
      tags: tagNames.map(name => ({ name }))
    });
    return response.data;
  }

  async removeTagsFromRecords(
    module: string,
    recordIds: string[],
    tagNames: string[]
  ): Promise<any> {
    let response = await this.http.post(`/${module}/actions/remove_tags`, {
      ids: recordIds,
      tags: tagNames.map(name => ({ name }))
    });
    return response.data;
  }

  // --- Related Records ---

  async getRelatedRecords(
    module: string,
    recordId: string,
    relatedModule: string,
    page?: number,
    perPage?: number
  ): Promise<any> {
    let params: Record<string, string> = {};
    if (page) params.page = String(page);
    if (perPage) params.per_page = String(perPage);

    let response = await this.http.get(`/${module}/${recordId}/${relatedModule}`, { params });
    return response.data;
  }

  // --- Notifications ---

  async enableNotifications(watches: NotificationWatch[]): Promise<any> {
    let response = await this.http.post('/actions/watch', {
      watch: watches.map(w => ({
        channel_id: w.channelId,
        events: w.eventsTypes,
        notify_url: w.notifyUrl,
        token: w.token,
        channel_expiry: w.channelExpiry,
        notification_condition: w.notificationCondition?.map(c => ({
          field_name: c.fieldName,
          value: c.value,
          operation: c.operation
        }))
      }))
    });
    return response.data;
  }

  async getNotificationDetails(channelIds?: string[]): Promise<any> {
    let params: Record<string, string> = {};
    if (channelIds?.length) params.channel_ids = channelIds.join(',');

    let response = await this.http.get('/actions/watch', { params });
    return response.data;
  }

  async disableNotifications(channelIds: string[]): Promise<any> {
    let response = await this.http.patch('/actions/watch', {
      watch: channelIds.map(id => ({ channel_id: id, _delete_events: true }))
    });
    return response.data;
  }

  // --- Blueprints ---

  async getBlueprint(module: string, recordId: string): Promise<any> {
    let response = await this.http.get(`/${module}/${recordId}/actions/blueprint`);
    return response.data;
  }

  // --- Emails ---

  async sendEmail(
    module: string,
    recordId: string,
    emailData: {
      from: { userName: string; email: string };
      to: Array<{ userName?: string; email: string }>;
      subject: string;
      content: string;
      mailFormat?: 'text' | 'html';
    }
  ): Promise<any> {
    let response = await this.http.post(`/${module}/${recordId}/actions/send_mail`, {
      data: [
        {
          from: { user_name: emailData.from.userName, email: emailData.from.email },
          to: emailData.to.map(t => ({ user_name: t.userName, email: t.email })),
          subject: emailData.subject,
          content: emailData.content,
          mail_format: emailData.mailFormat || 'html'
        }
      ]
    });
    return response.data;
  }

  // --- Organization ---

  async getOrganization(): Promise<any> {
    let response = await this.http.get('/org');
    return response.data;
  }

  // --- Custom Views ---

  async getCustomViews(module: string): Promise<any> {
    let response = await this.http.get(`/settings/custom_views`, { params: { module } });
    return response.data;
  }
}
