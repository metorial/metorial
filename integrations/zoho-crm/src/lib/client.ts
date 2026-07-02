import { createAxios } from 'slates';
import { decodeZohoCrmBase64File, zohoCrmApiError } from './errors';

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
  pageToken?: string;
  fields?: string[];
  customViewId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  ids?: string[];
  converted?: 'true' | 'false' | 'both';
  territoryId?: string;
  includeChildTerritories?: boolean;
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

export type AutomationTrigger =
  | 'approval'
  | 'workflow'
  | 'blueprint'
  | 'pathfinder'
  | 'orchestration';

export type FeatureExecutionName = 'layout_rules' | 'criteria_validation_rule';

export interface RecordWriteOptions {
  triggers?: AutomationTrigger[];
  applyFeatureExecution?: FeatureExecutionName[];
  skipFeatureExecution?: 'cadences'[];
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
      baseURL: `${config.apiBaseUrl}/crm/v8`,
      headers: {
        Authorization: `Zoho-oauthtoken ${config.token}`
      }
    });
  }

  private async request<T>(operation: string, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      throw zohoCrmApiError(error, operation);
    }
  }

  private buildRecordWriteBody(records: RecordData[], options?: RecordWriteOptions) {
    let body: Record<string, any> = { data: records };
    if (options?.triggers !== undefined) body.trigger = options.triggers;
    if (options?.applyFeatureExecution?.length) {
      body.apply_feature_execution = options.applyFeatureExecution.map(name => ({ name }));
    }
    if (options?.skipFeatureExecution?.length) {
      body.skip_feature_execution = options.skipFeatureExecution.map(name => ({ name }));
    }

    return body;
  }

  // --- Records ---

  async getRecords(module: string, params?: ListParams): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = String(params.page);
    if (params?.perPage) queryParams.per_page = String(params.perPage);
    if (params?.pageToken) queryParams.page_token = params.pageToken;
    if (params?.fields?.length) queryParams.fields = params.fields.join(',');
    if (params?.customViewId) queryParams.cvid = params.customViewId;
    if (params?.sortBy) queryParams.sort_by = params.sortBy;
    if (params?.sortOrder) queryParams.sort_order = params.sortOrder;
    if (params?.ids?.length) queryParams.ids = params.ids.join(',');
    if (params?.converted) queryParams.converted = params.converted;
    if (params?.territoryId) queryParams.territory_id = params.territoryId;
    if (params?.includeChildTerritories !== undefined) {
      queryParams.include_child = String(params.includeChildTerritories);
    }

    let response = await this.request('get records', () =>
      this.http.get(`/${module}`, { params: queryParams })
    );
    return response.data;
  }

  async getRecord(module: string, recordId: string, fields?: string[]): Promise<any> {
    let params: Record<string, string> = {};
    if (fields?.length) params.fields = fields.join(',');

    let response = await this.request('get record', () =>
      this.http.get(`/${module}/${recordId}`, { params })
    );
    return response.data;
  }

  async createRecords(module: string, records: RecordData[], options?: RecordWriteOptions) {
    let response = await this.request('create records', () =>
      this.http.post(`/${module}`, this.buildRecordWriteBody(records, options))
    );
    return response.data;
  }

  async updateRecords(
    module: string,
    records: Array<RecordData & { id: string }>,
    options?: RecordWriteOptions
  ): Promise<any> {
    let response = await this.request('update records', () =>
      this.http.put(`/${module}`, this.buildRecordWriteBody(records, options))
    );
    return response.data;
  }

  async updateRecord(
    module: string,
    recordId: string,
    record: RecordData,
    options?: RecordWriteOptions
  ): Promise<any> {
    let response = await this.request('update record', () =>
      this.http.put(`/${module}/${recordId}`, this.buildRecordWriteBody([record], options))
    );
    return response.data;
  }

  async deleteRecords(
    module: string,
    recordIds: string[],
    options?: { workflowTrigger?: boolean }
  ): Promise<any> {
    let params: Record<string, string> = { ids: recordIds.join(',') };
    if (options?.workflowTrigger !== undefined) {
      params.wf_trigger = String(options.workflowTrigger);
    }

    let response = await this.request('delete records', () =>
      this.http.delete(`/${module}`, { params })
    );
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

    let response = await this.request('search records', () =>
      this.http.get(`/${module}/search`, { params: queryParams })
    );
    return response.data;
  }

  async executeCoql(query: CoqlQuery): Promise<any> {
    let response = await this.request('execute COQL', () =>
      this.http.post('/coql', { select_query: query.selectQuery })
    );
    return response.data;
  }

  // --- Users ---

  async getUsers(type?: string, page?: number, perPage?: number): Promise<any> {
    let params: Record<string, string> = {};
    if (type) params.type = type;
    if (page) params.page = String(page);
    if (perPage) params.per_page = String(perPage);

    let response = await this.request('get users', () => this.http.get('/users', { params }));
    return response.data;
  }

  async getUser(userId: string): Promise<any> {
    let response = await this.request('get user', () => this.http.get(`/users/${userId}`));
    return response.data;
  }

  // --- Modules Metadata ---

  async getModules(): Promise<any> {
    let response = await this.request('get modules metadata', () =>
      this.http.get('/settings/modules')
    );
    return response.data;
  }

  async getModuleFields(module: string): Promise<any> {
    let response = await this.request('get fields metadata', () =>
      this.http.get('/settings/fields', { params: { module } })
    );
    return response.data;
  }

  async getModuleLayouts(module: string): Promise<any> {
    let response = await this.request('get layouts metadata', () =>
      this.http.get('/settings/layouts', { params: { module } })
    );
    return response.data;
  }

  async getCustomViews(module: string, customViewId?: string): Promise<any> {
    let path = customViewId
      ? `/settings/custom_views/${customViewId}`
      : '/settings/custom_views';
    let response = await this.request('get custom views metadata', () =>
      this.http.get(path, { params: { module } })
    );
    return response.data;
  }

  async getRelatedLists(module: string, layoutId?: string): Promise<any> {
    let params: Record<string, string> = { module };
    if (layoutId) params.layout_id = layoutId;

    let response = await this.request('get related lists metadata', () =>
      this.http.get('/settings/related_lists', { params })
    );
    return response.data;
  }

  // --- Notes ---

  async getNotes(
    module: string,
    recordId: string,
    page?: number,
    perPage?: number,
    fields?: string[]
  ): Promise<any> {
    let params: Record<string, string> = {};
    if (page) params.page = String(page);
    if (perPage) params.per_page = String(perPage);
    params.fields = (
      fields?.length
        ? fields
        : ['id', 'Note_Title', 'Note_Content', 'Created_Time', 'Parent_Id']
    ).join(',');

    let response = await this.request('get notes', () =>
      this.http.get(`/${module}/${recordId}/Notes`, { params })
    );
    return response.data;
  }

  async createNote(
    module: string,
    recordId: string,
    noteTitle: string,
    noteContent: string
  ): Promise<any> {
    let response = await this.request('create note', () =>
      this.http.post(`/${module}/${recordId}/Notes`, {
        data: [{ Note_Title: noteTitle, Note_Content: noteContent }]
      })
    );
    return response.data;
  }

  async updateNote(
    module: string,
    recordId: string,
    noteId: string,
    note: { noteTitle?: string; noteContent?: string; isSharedToClient?: boolean }
  ): Promise<any> {
    let data: Record<string, unknown> = {};
    if (note.noteTitle !== undefined) data.Note_Title = note.noteTitle;
    if (note.noteContent !== undefined) data.Note_Content = note.noteContent;
    if (note.isSharedToClient !== undefined) data.$is_shared_to_client = note.isSharedToClient;

    let response = await this.request('update note', () =>
      this.http.put(`/${module}/${recordId}/Notes/${noteId}`, {
        data: [data]
      })
    );
    return response.data;
  }

  async deleteNote(module: string, recordId: string, noteId: string): Promise<any> {
    let response = await this.request('delete note', () =>
      this.http.delete(`/${module}/${recordId}/Notes/${noteId}`)
    );
    return response.data;
  }

  // --- Tags ---

  async getTags(module: string, myTags?: boolean): Promise<any> {
    let params: Record<string, string> = { module };
    if (myTags !== undefined) params.my_tags = String(myTags);

    let response = await this.request('get tags', () =>
      this.http.get('/settings/tags', { params })
    );
    return response.data;
  }

  async addTagsToRecords(
    module: string,
    recordIds: string[],
    tagNames: string[],
    overWrite?: boolean
  ): Promise<any> {
    let body: Record<string, unknown> = {
      ids: recordIds,
      tags: tagNames.map(name => ({ name }))
    };
    if (overWrite !== undefined) body.over_write = overWrite;

    let response = await this.request('add tags to records', () =>
      this.http.post(`/${module}/actions/add_tags`, body)
    );
    return response.data;
  }

  async removeTagsFromRecords(
    module: string,
    recordIds: string[],
    tagNames: string[]
  ): Promise<any> {
    let response = await this.request('remove tags from records', () =>
      this.http.post(`/${module}/actions/remove_tags`, {
        ids: recordIds,
        tags: tagNames.map(name => ({ name }))
      })
    );
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

    let response = await this.request('get related records', () =>
      this.http.get(`/${module}/${recordId}/${relatedModule}`, { params })
    );
    return response.data;
  }

  // --- Attachments ---

  async getAttachments(
    module: string,
    recordId: string,
    fields: string[],
    page?: number,
    perPage?: number
  ): Promise<any> {
    let params: Record<string, string> = { fields: fields.join(',') };
    if (page) params.page = String(page);
    if (perPage) params.per_page = String(perPage);

    let response = await this.request('get attachments', () =>
      this.http.get(`/${module}/${recordId}/Attachments`, { params })
    );
    return response.data;
  }

  async uploadAttachment(params: {
    module: string;
    recordId: string;
    attachmentUrl?: string;
    fileName?: string;
    fileContentBase64?: string;
    mimeType?: string;
    title?: string;
  }): Promise<any> {
    let formData = new FormData();
    if (params.attachmentUrl) {
      formData.append('attachmentUrl', params.attachmentUrl);
      if (params.title) formData.append('title', params.title);
    } else if (params.fileContentBase64) {
      let file = decodeZohoCrmBase64File(params.fileContentBase64, 'fileContentBase64');
      let blob = new Blob([file], {
        type: params.mimeType ?? 'application/octet-stream'
      });
      formData.append('file', blob, params.fileName ?? 'attachment');
    }

    let response = await this.request('upload attachment', () =>
      this.http.post(`/${params.module}/${params.recordId}/Attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    );
    return response.data;
  }

  async downloadAttachment(
    module: string,
    recordId: string,
    attachmentId: string
  ): Promise<{ contentBase64: string; contentType: string; size: number; fileName?: string }> {
    let response = await this.request('download attachment', () =>
      this.http.get(`/${module}/${recordId}/Attachments/${attachmentId}`, {
        responseType: 'arraybuffer'
      })
    );
    let buffer = Buffer.from(response.data);
    let headers = (response.headers || {}) as Record<string, string | undefined>;
    let disposition = headers['content-disposition'];
    let fileName = disposition?.match(/filename="?([^";]+)"?/i)?.[1];

    return {
      contentBase64: buffer.toString('base64'),
      contentType: headers['content-type'] ?? 'application/octet-stream',
      size: buffer.byteLength,
      fileName
    };
  }

  async deleteAttachment(
    module: string,
    recordId: string,
    attachmentId: string
  ): Promise<any> {
    let response = await this.request('delete attachment', () =>
      this.http.delete(`/${module}/${recordId}/Attachments/${attachmentId}`)
    );
    return response.data;
  }

  // --- Notifications ---

  async enableNotifications(watches: NotificationWatch[]): Promise<any> {
    let response = await this.request('enable notifications', () =>
      this.http.post('/actions/watch', {
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
      })
    );
    return response.data;
  }

  async getNotificationDetails(channelIds?: string[]): Promise<any> {
    let params: Record<string, string> = {};
    if (channelIds?.length) params.channel_ids = channelIds.join(',');

    let response = await this.request('get notification details', () =>
      this.http.get('/actions/watch', { params })
    );
    return response.data;
  }

  async disableNotifications(channelIds: string[]): Promise<any> {
    let response = await this.request('disable notifications', () =>
      this.http.patch('/actions/watch', {
        watch: channelIds.map(id => ({ channel_id: id, _delete_events: true }))
      })
    );
    return response.data;
  }

  // --- Blueprints ---

  async getBlueprint(module: string, recordId: string): Promise<any> {
    let response = await this.request('get blueprint', () =>
      this.http.get(`/${module}/${recordId}/actions/blueprint`)
    );
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
    let response = await this.request('send email', () =>
      this.http.post(`/${module}/${recordId}/actions/send_mail`, {
        data: [
          {
            from: { user_name: emailData.from.userName, email: emailData.from.email },
            to: emailData.to.map(t => ({ user_name: t.userName, email: t.email })),
            subject: emailData.subject,
            content: emailData.content,
            mail_format: emailData.mailFormat || 'html'
          }
        ]
      })
    );
    return response.data;
  }

  // --- Organization ---

  async getOrganization(): Promise<any> {
    let response = await this.request('get organization', () => this.http.get('/org'));
    return response.data;
  }
}
