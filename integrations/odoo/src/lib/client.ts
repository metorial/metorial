import { createAxios } from 'slates';

export type OdooDomainFilter = Array<string | [string, string, unknown]>;

export interface OdooClientConfig {
  instanceUrl: string;
  database: string;
  uid: number;
  username: string;
  token: string;
}

export class OdooClient {
  private axios: ReturnType<typeof createAxios>;
  private database: string;
  private uid: number;
  private token: string;
  private requestId: number = 0;

  constructor(config: OdooClientConfig) {
    let baseUrl = config.instanceUrl.replace(/\/+$/, '');
    this.axios = createAxios({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    this.database = config.database;
    this.uid = config.uid;
    this.token = config.token;
  }

  private nextId(): number {
    this.requestId += 1;
    return this.requestId;
  }

  private async rpc(service: string, method: string, args: unknown[]): Promise<unknown> {
    let response = await this.axios.post('/jsonrpc', {
      jsonrpc: '2.0',
      method: 'call',
      id: this.nextId(),
      params: {
        service,
        method,
        args
      }
    });

    let data = response.data;
    if (data?.error) {
      let errMsg = data.error.data?.message || data.error.message || 'Unknown Odoo RPC error';
      throw new Error(`Odoo RPC Error: ${errMsg}`);
    }

    return data?.result;
  }

  async executeKw(
    model: string,
    method: string,
    args: unknown[],
    kwargs?: Record<string, unknown>
  ): Promise<unknown> {
    let callArgs: unknown[] = [this.database, this.uid, this.token, model, method, args];
    if (kwargs) {
      callArgs.push(kwargs);
    }
    return this.rpc('object', 'execute_kw', callArgs);
  }

  async searchRead(
    model: string,
    domain: OdooDomainFilter,
    options?: {
      fields?: string[];
      limit?: number;
      offset?: number;
      order?: string;
    }
  ): Promise<Record<string, unknown>[]> {
    let kwargs: Record<string, unknown> = {};
    if (options?.fields) kwargs.fields = options.fields;
    if (options?.limit !== undefined) kwargs.limit = options.limit;
    if (options?.offset !== undefined) kwargs.offset = options.offset;
    if (options?.order) kwargs.order = options.order;

    let result = await this.executeKw(model, 'search_read', [domain], kwargs);
    return (result as Record<string, unknown>[]) || [];
  }

  async search(
    model: string,
    domain: OdooDomainFilter,
    options?: {
      limit?: number;
      offset?: number;
      order?: string;
    }
  ): Promise<number[]> {
    let kwargs: Record<string, unknown> = {};
    if (options?.limit !== undefined) kwargs.limit = options.limit;
    if (options?.offset !== undefined) kwargs.offset = options.offset;
    if (options?.order) kwargs.order = options.order;

    let result = await this.executeKw(model, 'search', [domain], kwargs);
    return (result as number[]) || [];
  }

  async searchCount(model: string, domain: OdooDomainFilter): Promise<number> {
    let result = await this.executeKw(model, 'search_count', [domain]);
    return result as number;
  }

  async read(
    model: string,
    ids: number[],
    fields?: string[]
  ): Promise<Record<string, unknown>[]> {
    let kwargs: Record<string, unknown> = {};
    if (fields) kwargs.fields = fields;

    let result = await this.executeKw(model, 'read', [ids], kwargs);
    return (result as Record<string, unknown>[]) || [];
  }

  async create(model: string, values: Record<string, unknown>): Promise<number> {
    let result = await this.executeKw(model, 'create', [values]);
    return result as number;
  }

  async write(
    model: string,
    ids: number[],
    values: Record<string, unknown>
  ): Promise<boolean> {
    let result = await this.executeKw(model, 'write', [ids, values]);
    return result as boolean;
  }

  async unlink(model: string, ids: number[]): Promise<boolean> {
    let result = await this.executeKw(model, 'unlink', [ids]);
    return result as boolean;
  }

  async fieldsGet(
    model: string,
    attributes?: string[]
  ): Promise<Record<string, Record<string, unknown>>> {
    let kwargs: Record<string, unknown> = {};
    if (attributes) kwargs.attributes = attributes;

    let result = await this.executeKw(model, 'fields_get', [], kwargs);
    return (result as Record<string, Record<string, unknown>>) || {};
  }

  async callMethod(
    model: string,
    method: string,
    recordIds: number[],
    args?: unknown[],
    kwargs?: Record<string, unknown>
  ): Promise<unknown> {
    let positionalArgs: unknown[] = [recordIds];
    if (args) {
      positionalArgs.push(...args);
    }
    return this.executeKw(model, method, positionalArgs, kwargs);
  }
}
