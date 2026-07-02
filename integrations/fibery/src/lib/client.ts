import { createAxios } from 'slates';

export interface FiberyCommand {
  command: string;
  args: Record<string, any>;
}

export interface FiberyCommandResult {
  success: boolean;
  result?: any;
  error?: any;
}

export class Client {
  private baseUrl: string;
  private token: string;

  constructor(config: { accountName: string; token: string }) {
    this.baseUrl = `https://${config.accountName}.fibery.io`;
    this.token = config.token;
  }

  private get axios() {
    return createAxios({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Token ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Command API ──────────────────────────────────────────────

  async executeCommands(commands: FiberyCommand[]): Promise<FiberyCommandResult[]> {
    let response = await this.axios.post('/api/commands', commands);
    return response.data;
  }

  async executeCommand(command: FiberyCommand): Promise<FiberyCommandResult> {
    let results = await this.executeCommands([command]);
    let result = results[0];
    if (!result) {
      throw new Error('No result returned from Fibery command');
    }
    if (!result.success) {
      throw new Error(`Fibery command failed: ${JSON.stringify(result.error)}`);
    }
    return result;
  }

  // ─── Schema ───────────────────────────────────────────────────

  async getSchema(): Promise<any> {
    let result = await this.executeCommand({
      command: 'fibery.schema/query',
      args: { 'with-description?': true }
    });
    return result.result;
  }

  // ─── Entity Operations ────────────────────────────────────────

  async queryEntities(params: {
    typeName: string;
    select: any[];
    where?: any;
    orderBy?: any[];
    limit?: number;
    offset?: number;
    queryParams?: Record<string, any>;
  }): Promise<any[]> {
    let query: Record<string, any> = {
      'q/from': params.typeName,
      'q/select': params.select
    };

    if (params.where) {
      query['q/where'] = params.where;
    }
    if (params.orderBy) {
      query['q/order-by'] = params.orderBy;
    }
    if (params.limit !== undefined) {
      query['q/limit'] = params.limit;
    }
    if (params.offset !== undefined) {
      query['q/offset'] = params.offset;
    }

    let result = await this.executeCommand({
      command: 'fibery.entity/query',
      args: {
        query,
        params: params.queryParams || {}
      }
    });

    return result.result || [];
  }

  async createEntity(typeName: string, entity: Record<string, any>): Promise<any> {
    let result = await this.executeCommand({
      command: 'fibery.entity/create',
      args: { type: typeName, entity }
    });
    return result.result;
  }

  async updateEntity(typeName: string, entity: Record<string, any>): Promise<any> {
    let result = await this.executeCommand({
      command: 'fibery.entity/update',
      args: { type: typeName, entity }
    });
    return result.result;
  }

  async deleteEntity(typeName: string, entityId: string): Promise<any> {
    let result = await this.executeCommand({
      command: 'fibery.entity/delete',
      args: {
        type: typeName,
        entity: { 'fibery/id': entityId }
      }
    });
    return result.result;
  }

  // ─── Collection Operations ────────────────────────────────────

  async addCollectionItems(params: {
    typeName: string;
    field: string;
    entityId: string;
    itemIds: string[];
  }): Promise<any> {
    let result = await this.executeCommand({
      command: 'fibery.entity/add-collection-items',
      args: {
        type: params.typeName,
        field: params.field,
        entity: { 'fibery/id': params.entityId },
        items: params.itemIds.map(id => ({ 'fibery/id': id }))
      }
    });
    return result.result;
  }

  async removeCollectionItems(params: {
    typeName: string;
    field: string;
    entityId: string;
    itemIds: string[];
  }): Promise<any> {
    let result = await this.executeCommand({
      command: 'fibery.entity/remove-collection-items',
      args: {
        type: params.typeName,
        field: params.field,
        entity: { 'fibery/id': params.entityId },
        items: params.itemIds.map(id => ({ 'fibery/id': id }))
      }
    });
    return result.result;
  }

  // ─── Documents API ────────────────────────────────────────────

  async getDocumentContent(
    documentSecret: string,
    format: 'md' | 'html' | 'json' | 'plain-text' = 'md'
  ): Promise<{ secret: string; content: string }> {
    let response = await this.axios.get(`/api/documents/${documentSecret}`, {
      params: { format }
    });
    return response.data;
  }

  async updateDocumentContent(
    documentSecret: string,
    content: string,
    format: 'md' | 'html' | 'json' | 'plain-text' = 'md'
  ): Promise<any> {
    let response = await this.axios.post(
      `/api/documents/commands`,
      {
        command: 'create-or-update-documents',
        args: [{ secret: documentSecret, content }]
      },
      {
        params: { format }
      }
    );
    return response.data;
  }

  // ─── File API ─────────────────────────────────────────────────

  async uploadFileFromUrl(params: { url: string; name?: string }): Promise<any> {
    let response = await this.axios.post('/api/files/from-url', {
      url: params.url,
      name: params.name
    });
    return response.data;
  }

  async getFileSignedUrls(secrets: string[]): Promise<any> {
    let response = await this.axios.post('/api/files/sign-urls', secrets);
    return response.data;
  }

  // ─── Webhook API ──────────────────────────────────────────────

  async createWebhook(url: string, typeName: string): Promise<any> {
    let response = await this.axios.post('/api/webhooks/v2', {
      url,
      type: typeName
    });
    return response.data;
  }

  async listWebhooks(): Promise<any[]> {
    let response = await this.axios.get('/api/webhooks/v2');
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/api/webhooks/v2/${webhookId}`);
  }

  // ─── Schema Batch Operations ──────────────────────────────────

  async batchSchemaCommands(commands: any[]): Promise<any> {
    let result = await this.executeCommand({
      command: 'fibery.schema/batch',
      args: { commands }
    });
    return result.result;
  }

  // ─── Batch Create or Update ───────────────────────────────────

  async batchCreateOrUpdate(params: {
    typeName: string;
    entities: Record<string, any>[];
    conflictField?: string;
    conflictAction?: 'skip-create' | 'update-latest';
  }): Promise<any> {
    let args: Record<string, any> = {
      type: params.typeName,
      entities: params.entities
    };
    if (params.conflictField) {
      args['conflict-field'] = params.conflictField;
    }
    if (params.conflictAction) {
      args['conflict-action'] = params.conflictAction;
    }
    let result = await this.executeCommand({
      command: 'fibery.entity.batch/create-or-update',
      args
    });
    return result.result;
  }
}
