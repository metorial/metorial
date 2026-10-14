import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

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
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { accountName: string; token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: `https://${config.accountName}.fibery.io`,
      authHeader: { value: `Token ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Fibery',
          reason: 'fibery_api',
          extractUpstreamCode: (_error, response) =>
            isApiErrorRecord(response?.data) && typeof response.data.name === 'string'
              ? response.data.name
              : undefined
        })
    });
  }

  // ─── Command API ──────────────────────────────────────────────

  async executeCommands(commands: FiberyCommand[]): Promise<FiberyCommandResult[]> {
    let response = await this.axios.post('/api/commands', commands);
    if (!Array.isArray(response.data) || response.data.length !== commands.length) {
      throw createApiServiceError('Fibery returned an invalid command response.');
    }
    return response.data.map((result: FiberyCommandResult, index: number) => {
      if (!result || typeof result.success !== 'boolean') {
        throw createApiServiceError('Fibery returned an invalid command result.');
      }
      if (!result.success) {
        let error = result.result ?? result.error;
        throw createApiServiceError(
          `Fibery command ${commands[index]?.command} failed: ${isApiErrorRecord(error) && typeof error.message === 'string' ? error.message : 'The provider rejected the command.'}`,
          {
            reason: 'fibery_command',
            upstreamCode:
              isApiErrorRecord(error) && typeof error.name === 'string'
                ? error.name
                : undefined
          }
        );
      }
      return result;
    });
  }

  async executeCommand(command: FiberyCommand): Promise<FiberyCommandResult> {
    let results = await this.executeCommands([command]);
    let result = results[0];
    if (!result) {
      throw createApiServiceError('No result returned from Fibery command.');
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
        entity: { [params.entityId]: params.itemIds }
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
        entity: { [params.entityId]: params.itemIds }
      }
    });
    return result.result;
  }

  async setCollectionItems(params: {
    typeName: string;
    field: string;
    entityId: string;
    itemIds: string[];
  }): Promise<any> {
    let result = await this.executeCommand({
      command: 'fibery.entity/set-collection-items',
      args: {
        type: params.typeName,
        field: params.field,
        entity: { [params.entityId]: params.itemIds }
      }
    });
    return result.result;
  }

  async resetCollectionItems(params: {
    typeName: string;
    field: string;
    entityId: string;
  }): Promise<any> {
    let result = await this.executeCommand({
      command: 'fibery.entity/reset-collection-items',
      args: { type: params.typeName, field: params.field, entity: params.entityId }
    });
    return result.result;
  }

  // ─── Documents API ────────────────────────────────────────────

  async getDocumentContent(
    documentSecret: string,
    format: 'md' | 'html' | 'json' | 'plain-text' = 'md'
  ): Promise<{ secret: string; content: string }> {
    let response = await this.axios.get(
      `/api/documents/${encodeURIComponent(documentSecret)}`,
      {
        params: { format }
      }
    );
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
    let response = await this.axios.post('/api/files/sign-urls', { secrets });
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
      entities: params.entities.map(entity => ({
        ...entity,
        'fibery/id': entity['fibery/id'] ?? crypto.randomUUID()
      }))
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
    if (!Array.isArray(result.result)) {
      throw createApiServiceError('Fibery returned an invalid batch upsert response.');
    }
    return result.result;
  }
}
