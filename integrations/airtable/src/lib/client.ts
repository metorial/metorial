import { createAxios } from 'slates';
import { airtableApiError, airtableServiceError } from './errors';
import type {
  AirtableBaseSchema,
  AirtableComment,
  AirtableListCommentsResponse,
  AirtableListRecordsResponse,
  AirtableRecord,
  AirtableWebhook,
  CreateWebhookResponse,
  WebhookPayloadsResponse
} from './types';

export class Client {
  private api: ReturnType<typeof createAxios>;
  private contentApi: ReturnType<typeof createAxios>;
  private baseId?: string;

  constructor(config: { token: string; baseId?: string }) {
    this.baseId = config.baseId;
    this.api = createAxios({
      baseURL: 'https://api.airtable.com/v0',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
    this.contentApi = createAxios({
      baseURL: 'https://content.airtable.com/v0',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private requireBaseId() {
    if (!this.baseId) {
      throw airtableServiceError('baseId is required for Airtable base-specific operations.');
    }

    return this.baseId;
  }

  private async request<T>(operation: string, run: () => Promise<{ data: T }>): Promise<T> {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw airtableApiError(error, operation);
    }
  }

  // ─── Records ─────────────────────────────────────────────────────────

  async listRecords(
    tableIdOrName: string,
    options?: {
      fields?: string[];
      filterByFormula?: string;
      maxRecords?: number;
      pageSize?: number;
      sort?: { field: string; direction?: 'asc' | 'desc' }[];
      view?: string;
      offset?: string;
      cellFormat?: 'json' | 'string';
      timeZone?: string;
      userLocale?: string;
      returnFieldsByFieldId?: boolean;
    }
  ): Promise<AirtableListRecordsResponse> {
    let baseId = this.requireBaseId();
    let params: Record<string, any> = {};

    if (options?.fields) {
      options.fields.forEach((field, index) => {
        params[`fields[${index}]`] = field;
      });
    }
    if (options?.filterByFormula) params.filterByFormula = options.filterByFormula;
    if (options?.maxRecords) params.maxRecords = options.maxRecords;
    if (options?.pageSize) params.pageSize = options.pageSize;
    if (options?.sort) {
      options.sort.forEach((s, index) => {
        params[`sort[${index}][field]`] = s.field;
        if (s.direction) params[`sort[${index}][direction]`] = s.direction;
      });
    }
    if (options?.view) params.view = options.view;
    if (options?.offset) params.offset = options.offset;
    if (options?.cellFormat) params.cellFormat = options.cellFormat;
    if (options?.timeZone) params.timeZone = options.timeZone;
    if (options?.userLocale) params.userLocale = options.userLocale;
    if (options?.returnFieldsByFieldId)
      params.returnFieldsByFieldId = options.returnFieldsByFieldId;

    return await this.request('list records', () =>
      this.api.get(`/${baseId}/${encodeURIComponent(tableIdOrName)}`, {
        params
      })
    );
  }

  async getRecord(
    tableIdOrName: string,
    recordId: string,
    options?: { returnFieldsByFieldId?: boolean }
  ): Promise<AirtableRecord> {
    let baseId = this.requireBaseId();
    let params: Record<string, any> = {};
    if (options?.returnFieldsByFieldId)
      params.returnFieldsByFieldId = options.returnFieldsByFieldId;

    return await this.request('get record', () =>
      this.api.get(`/${baseId}/${encodeURIComponent(tableIdOrName)}/${recordId}`, {
        params
      })
    );
  }

  async createRecords(
    tableIdOrName: string,
    records: { fields: Record<string, any> }[],
    options?: { typecast?: boolean; returnFieldsByFieldId?: boolean }
  ): Promise<{ records: AirtableRecord[] }> {
    let baseId = this.requireBaseId();
    let body: Record<string, any> = {
      records
    };
    if (options?.typecast) body.typecast = true;
    if (options?.returnFieldsByFieldId) body.returnFieldsByFieldId = true;

    return await this.request('create records', () =>
      this.api.post(`/${baseId}/${encodeURIComponent(tableIdOrName)}`, body)
    );
  }

  async updateRecords(
    tableIdOrName: string,
    records: { id: string; fields: Record<string, any> }[],
    options?: { typecast?: boolean; returnFieldsByFieldId?: boolean; method?: 'PATCH' | 'PUT' }
  ): Promise<{ records: AirtableRecord[] }> {
    let baseId = this.requireBaseId();
    let body: Record<string, any> = {
      records
    };
    if (options?.typecast) body.typecast = true;
    if (options?.returnFieldsByFieldId) body.returnFieldsByFieldId = true;

    let method = options?.method || 'PATCH';
    return await this.request('update records', () =>
      method === 'PUT'
        ? this.api.put(`/${baseId}/${encodeURIComponent(tableIdOrName)}`, body)
        : this.api.patch(`/${baseId}/${encodeURIComponent(tableIdOrName)}`, body)
    );
  }

  async upsertRecords(
    tableIdOrName: string,
    records: { fields: Record<string, any> }[],
    fieldsToMergeOn: string[],
    options?: { typecast?: boolean; returnFieldsByFieldId?: boolean }
  ): Promise<{
    records: AirtableRecord[];
    createdRecords: string[];
    updatedRecords: string[];
  }> {
    let baseId = this.requireBaseId();
    let body: Record<string, any> = {
      performUpsert: {
        fieldsToMergeOn
      },
      records
    };
    if (options?.typecast) body.typecast = true;
    if (options?.returnFieldsByFieldId) body.returnFieldsByFieldId = true;

    return await this.request('upsert records', () =>
      this.api.patch(`/${baseId}/${encodeURIComponent(tableIdOrName)}`, body)
    );
  }

  async deleteRecords(
    tableIdOrName: string,
    recordIds: string[]
  ): Promise<{ records: { id: string; deleted: boolean }[] }> {
    let baseId = this.requireBaseId();
    let params = new URLSearchParams();
    recordIds.forEach(id => params.append('records[]', id));

    return await this.request('delete records', () =>
      this.api.delete(`/${baseId}/${encodeURIComponent(tableIdOrName)}`, { params })
    );
  }

  async uploadAttachment(
    recordId: string,
    attachmentFieldIdOrName: string,
    file: string,
    filename: string,
    contentType: string
  ): Promise<AirtableRecord> {
    let baseId = this.requireBaseId();
    return await this.request('upload attachment', () =>
      this.contentApi.post(
        `/${baseId}/${encodeURIComponent(recordId)}/${encodeURIComponent(attachmentFieldIdOrName)}/uploadAttachment`,
        {
          file,
          filename,
          contentType
        }
      )
    );
  }

  // ─── Schema ──────────────────────────────────────────────────────────

  async getBaseSchema(): Promise<AirtableBaseSchema> {
    let baseId = this.requireBaseId();
    return await this.request('get base schema', () =>
      this.api.get(`/meta/bases/${baseId}/tables`)
    );
  }

  async createTable(
    name: string,
    fields: {
      name: string;
      type: string;
      description?: string;
      options?: Record<string, any>;
    }[],
    description?: string
  ): Promise<any> {
    let baseId = this.requireBaseId();
    let body: Record<string, any> = { name, fields };
    if (description) body.description = description;

    return await this.request('create table', () =>
      this.api.post(`/meta/bases/${baseId}/tables`, body)
    );
  }

  async updateTable(
    tableIdOrName: string,
    updates: { name?: string; description?: string }
  ): Promise<any> {
    let baseId = this.requireBaseId();
    return await this.request('update table', () =>
      this.api.patch(
        `/meta/bases/${baseId}/tables/${encodeURIComponent(tableIdOrName)}`,
        updates
      )
    );
  }

  async createField(
    tableId: string,
    field: { name: string; type: string; description?: string; options?: Record<string, any> }
  ): Promise<any> {
    let baseId = this.requireBaseId();
    return await this.request('create field', () =>
      this.api.post(
        `/meta/bases/${baseId}/tables/${encodeURIComponent(tableId)}/fields`,
        field
      )
    );
  }

  async updateField(
    tableId: string,
    fieldId: string,
    updates: { name?: string; description?: string; options?: Record<string, any> }
  ): Promise<any> {
    let baseId = this.requireBaseId();
    return await this.request('update field', () =>
      this.api.patch(
        `/meta/bases/${baseId}/tables/${encodeURIComponent(tableId)}/fields/${encodeURIComponent(fieldId)}`,
        updates
      )
    );
  }

  // ─── Comments ────────────────────────────────────────────────────────

  async listComments(
    tableIdOrName: string,
    recordId: string,
    options?: { offset?: string; pageSize?: number }
  ): Promise<AirtableListCommentsResponse> {
    let baseId = this.requireBaseId();
    let params: Record<string, any> = {};
    if (options?.offset) params.offset = options.offset;
    if (options?.pageSize) params.pageSize = options.pageSize;

    return await this.request('list comments', () =>
      this.api.get(`/${baseId}/${encodeURIComponent(tableIdOrName)}/${recordId}/comments`, {
        params
      })
    );
  }

  async createComment(
    tableIdOrName: string,
    recordId: string,
    text: string
  ): Promise<AirtableComment> {
    let baseId = this.requireBaseId();
    return await this.request('create comment', () =>
      this.api.post(`/${baseId}/${encodeURIComponent(tableIdOrName)}/${recordId}/comments`, {
        text
      })
    );
  }

  async updateComment(
    tableIdOrName: string,
    recordId: string,
    commentId: string,
    text: string
  ): Promise<AirtableComment> {
    let baseId = this.requireBaseId();
    return await this.request('update comment', () =>
      this.api.patch(
        `/${baseId}/${encodeURIComponent(tableIdOrName)}/${recordId}/comments/${commentId}`,
        { text }
      )
    );
  }

  async deleteComment(
    tableIdOrName: string,
    recordId: string,
    commentId: string
  ): Promise<void> {
    let baseId = this.requireBaseId();
    await this.request('delete comment', () =>
      this.api.delete(
        `/${baseId}/${encodeURIComponent(tableIdOrName)}/${recordId}/comments/${commentId}`
      )
    );
  }

  // ─── Webhooks ────────────────────────────────────────────────────────

  async createWebhook(
    notificationUrl: string,
    specification: {
      options: {
        filters?: {
          dataTypes?: string[];
          recordChangeScope?: string;
        };
      };
    }
  ): Promise<CreateWebhookResponse> {
    let baseId = this.requireBaseId();
    return await this.request('create webhook', () =>
      this.api.post(`/bases/${baseId}/webhooks`, {
        notificationUrl,
        specification
      })
    );
  }

  async listWebhooks(): Promise<{ webhooks: AirtableWebhook[] }> {
    let baseId = this.requireBaseId();
    return await this.request('list webhooks', () =>
      this.api.get(`/bases/${baseId}/webhooks`)
    );
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    let baseId = this.requireBaseId();
    await this.request('delete webhook', () =>
      this.api.delete(`/bases/${baseId}/webhooks/${webhookId}`)
    );
  }

  async refreshWebhook(webhookId: string): Promise<{ expirationTime: string }> {
    let baseId = this.requireBaseId();
    return await this.request('refresh webhook', () =>
      this.api.post(`/bases/${baseId}/webhooks/${webhookId}/refresh`)
    );
  }

  async getWebhookPayloads(
    webhookId: string,
    cursor?: number
  ): Promise<WebhookPayloadsResponse> {
    let baseId = this.requireBaseId();
    let params: Record<string, any> = {};
    if (cursor !== undefined) params.cursor = cursor;

    return await this.request('get webhook payloads', () =>
      this.api.get(`/bases/${baseId}/webhooks/${webhookId}/payloads`, {
        params
      })
    );
  }

  // ─── Collaborators ──────────────────────────────────────────────────

  async addBaseCollaborator(userId: string, permissionLevel: string): Promise<any> {
    let baseId = this.requireBaseId();
    return await this.request('add base collaborator', () =>
      this.api.post(`/meta/bases/${baseId}/collaborators`, {
        collaborators: [{ user: { id: userId }, permissionLevel }]
      })
    );
  }

  async updateBaseCollaborator(userId: string, permissionLevel: string): Promise<any> {
    let baseId = this.requireBaseId();
    return await this.request('update base collaborator', () =>
      this.api.patch(`/meta/bases/${baseId}/collaborators/${userId}`, {
        permissionLevel
      })
    );
  }

  async deleteBaseCollaborator(userId: string): Promise<void> {
    let baseId = this.requireBaseId();
    await this.request('delete base collaborator', () =>
      this.api.delete(`/meta/bases/${baseId}/collaborators/${userId}`)
    );
  }

  // ─── Bases ───────────────────────────────────────────────────────────

  async listBases(options?: { offset?: string }): Promise<{
    bases: { id: string; name: string; permissionLevel: string }[];
    offset?: string;
  }> {
    let params: Record<string, any> = {};
    if (options?.offset) params.offset = options.offset;

    return await this.request('list bases', () => this.api.get('/meta/bases', { params }));
  }
}
