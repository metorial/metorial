import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  instanceName: string;
  authType: 'oauth' | 'basic';
}

export interface TableRecord {
  sys_id: string;
  [key: string]: any;
}

export interface TableResponse {
  result: TableRecord[];
}

export interface SingleRecordResponse {
  result: TableRecord;
}

export interface PaginatedResult {
  records: TableRecord[];
  totalCount?: number;
}

export interface CatalogItem {
  sys_id: string;
  name: string;
  short_description: string;
  category: string;
  price: string;
  [key: string]: any;
}

export interface AttachmentRecord {
  sys_id: string;
  file_name: string;
  table_name: string;
  table_sys_id: string;
  content_type: string;
  size_bytes: string;
  [key: string]: any;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private baseUrl: string;

  constructor(config: ClientConfig) {
    this.baseUrl = `https://${config.instanceName}.service-now.com`;

    let authHeader =
      config.authType === 'basic' ? `Basic ${config.token}` : `Bearer ${config.token}`;

    this.axios = createAxios({
      baseURL: this.baseUrl,
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Table API (generic CRUD) ----

  async getRecords(
    tableName: string,
    options?: {
      query?: string;
      fields?: string[];
      limit?: number;
      offset?: number;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
      displayValue?: 'true' | 'false' | 'all';
    }
  ): Promise<PaginatedResult> {
    let params: Record<string, any> = {};

    if (options?.query) params.sysparm_query = options.query;
    if (options?.fields && options.fields.length > 0)
      params.sysparm_fields = options.fields.join(',');
    if (options?.limit) params.sysparm_limit = options.limit;
    if (options?.offset) params.sysparm_offset = options.offset;
    if (options?.displayValue) params.sysparm_display_value = options.displayValue;

    if (options?.orderBy) {
      let direction = options?.orderDirection === 'desc' ? 'DESC' : '';
      let orderQuery = direction
        ? `ORDERBYDESC${options.orderBy}`
        : `ORDERBY${options.orderBy}`;
      params.sysparm_query = params.sysparm_query
        ? `${params.sysparm_query}^${orderQuery}`
        : orderQuery;
    }

    let response = await this.axios.get(`/api/now/table/${tableName}`, {
      params
    });

    let totalCount: number | undefined;
    let totalHeader = response.headers?.['x-total-count'];
    if (totalHeader) {
      totalCount = Number.parseInt(totalHeader, 10);
    }

    return {
      records: response.data?.result || [],
      totalCount
    };
  }

  async getRecord(
    tableName: string,
    recordId: string,
    options?: {
      fields?: string[];
      displayValue?: 'true' | 'false' | 'all';
    }
  ): Promise<TableRecord> {
    let params: Record<string, any> = {};

    if (options?.fields && options.fields.length > 0)
      params.sysparm_fields = options.fields.join(',');
    if (options?.displayValue) params.sysparm_display_value = options.displayValue;

    let response = await this.axios.get(`/api/now/table/${tableName}/${recordId}`, {
      params
    });

    return response.data?.result;
  }

  async createRecord(
    tableName: string,
    fields: Record<string, any>,
    options?: {
      displayValue?: 'true' | 'false' | 'all';
    }
  ): Promise<TableRecord> {
    let params: Record<string, any> = {};
    if (options?.displayValue) params.sysparm_display_value = options.displayValue;

    let response = await this.axios.post(`/api/now/table/${tableName}`, fields, {
      params
    });

    return response.data?.result;
  }

  async updateRecord(
    tableName: string,
    recordId: string,
    fields: Record<string, any>,
    options?: {
      displayValue?: 'true' | 'false' | 'all';
    }
  ): Promise<TableRecord> {
    let params: Record<string, any> = {};
    if (options?.displayValue) params.sysparm_display_value = options.displayValue;

    let response = await this.axios.patch(`/api/now/table/${tableName}/${recordId}`, fields, {
      params
    });

    return response.data?.result;
  }

  async deleteRecord(tableName: string, recordId: string): Promise<void> {
    await this.axios.delete(`/api/now/table/${tableName}/${recordId}`);
  }

  // ---- CMDB ----

  async getCmdbInstances(
    className: string,
    options?: {
      query?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<PaginatedResult> {
    let params: Record<string, any> = {};
    if (options?.query) params.sysparm_query = options.query;
    if (options?.limit) params.sysparm_limit = options.limit;
    if (options?.offset) params.sysparm_offset = options.offset;

    let response = await this.axios.get(`/api/now/cmdb/instance/${className}`, {
      params
    });

    return {
      records: response.data?.result || []
    };
  }

  async getCmdbInstance(className: string, recordId: string): Promise<TableRecord> {
    let response = await this.axios.get(`/api/now/cmdb/instance/${className}/${recordId}`);
    return response.data?.result;
  }

  async createCmdbInstance(
    className: string,
    attributes: Record<string, any>
  ): Promise<TableRecord> {
    let response = await this.axios.post(`/api/now/cmdb/instance/${className}`, {
      attributes
    });
    return response.data?.result;
  }

  async updateCmdbInstance(
    className: string,
    recordId: string,
    attributes: Record<string, any>
  ): Promise<TableRecord> {
    let response = await this.axios.put(`/api/now/cmdb/instance/${className}/${recordId}`, {
      attributes
    });
    return response.data?.result;
  }

  // ---- Service Catalog ----

  async getCatalogItems(options?: {
    query?: string;
    limit?: number;
    offset?: number;
    catalogId?: string;
    categoryId?: string;
  }): Promise<TableRecord[]> {
    let params: Record<string, any> = {};
    if (options?.limit) params.sysparm_limit = options.limit;
    if (options?.offset) params.sysparm_offset = options.offset;
    if (options?.catalogId) params.sysparm_catalog = options.catalogId;
    if (options?.categoryId) params.sysparm_category = options.categoryId;

    let response = await this.axios.get('/api/sn_sc/servicecatalog/items', {
      params
    });

    return response.data?.result || [];
  }

  async getCatalogItem(itemId: string): Promise<TableRecord> {
    let response = await this.axios.get(`/api/sn_sc/servicecatalog/items/${itemId}`);
    return response.data?.result;
  }

  async orderCatalogItem(
    itemId: string,
    variables: Record<string, any>
  ): Promise<TableRecord> {
    let response = await this.axios.post(
      `/api/sn_sc/servicecatalog/items/${itemId}/order_now`,
      {
        sysparm_quantity: 1,
        variables
      }
    );
    return response.data?.result;
  }

  // ---- Knowledge ----

  async searchKnowledge(options: {
    query: string;
    limit?: number;
    offset?: number;
    knowledgeBaseId?: string;
  }): Promise<TableRecord[]> {
    let params: Record<string, any> = {
      sysparm_query: `short_descriptionLIKE${options.query}^ORtextLIKE${options.query}`,
      sysparm_limit: options.limit || 20
    };
    if (options.offset) params.sysparm_offset = options.offset;
    if (options.knowledgeBaseId) {
      params.sysparm_query += `^kb_knowledge_base=${options.knowledgeBaseId}`;
    }

    let response = await this.axios.get('/api/now/table/kb_knowledge', {
      params
    });

    return response.data?.result || [];
  }

  async createKnowledgeArticle(fields: Record<string, any>): Promise<TableRecord> {
    let response = await this.axios.post('/api/now/table/kb_knowledge', fields);
    return response.data?.result;
  }

  async updateKnowledgeArticle(
    articleId: string,
    fields: Record<string, any>
  ): Promise<TableRecord> {
    let response = await this.axios.patch(`/api/now/table/kb_knowledge/${articleId}`, fields);
    return response.data?.result;
  }

  // ---- Attachments ----

  async getAttachments(options: {
    tableName?: string;
    recordId?: string;
    limit?: number;
  }): Promise<AttachmentRecord[]> {
    let params: Record<string, any> = {};
    let queryParts: string[] = [];

    if (options.tableName) queryParts.push(`table_name=${options.tableName}`);
    if (options.recordId) queryParts.push(`table_sys_id=${options.recordId}`);
    if (queryParts.length > 0) params.sysparm_query = queryParts.join('^');
    if (options.limit) params.sysparm_limit = options.limit;

    let response = await this.axios.get('/api/now/attachment', {
      params
    });

    return response.data?.result || [];
  }

  async uploadAttachment(
    tableName: string,
    recordId: string,
    fileName: string,
    contentType: string,
    content: string
  ): Promise<AttachmentRecord> {
    let response = await this.axios.post('/api/now/attachment/file', content, {
      params: {
        table_name: tableName,
        table_sys_id: recordId,
        file_name: fileName
      },
      headers: {
        'Content-Type': contentType
      }
    });

    return response.data?.result;
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    await this.axios.delete(`/api/now/attachment/${attachmentId}`);
  }

  // ---- Import Sets ----

  async createImportSet(
    stagingTableName: string,
    records: Record<string, any>[]
  ): Promise<TableRecord[]> {
    let results: TableRecord[] = [];
    for (let record of records) {
      let response = await this.axios.post(`/api/now/import/${stagingTableName}`, record);
      if (response.data?.result) {
        results.push(
          ...(Array.isArray(response.data.result)
            ? response.data.result
            : [response.data.result])
        );
      }
    }
    return results;
  }

  // ---- Users and Groups ----

  async getUsers(options?: {
    query?: string;
    limit?: number;
    offset?: number;
    fields?: string[];
  }): Promise<PaginatedResult> {
    return this.getRecords('sys_user', {
      query: options?.query,
      limit: options?.limit,
      offset: options?.offset,
      fields: options?.fields
    });
  }

  async getUser(userId: string, fields?: string[]): Promise<TableRecord> {
    return this.getRecord('sys_user', userId, { fields });
  }

  async createUser(fields: Record<string, any>): Promise<TableRecord> {
    return this.createRecord('sys_user', fields);
  }

  async updateUser(userId: string, fields: Record<string, any>): Promise<TableRecord> {
    return this.updateRecord('sys_user', userId, fields);
  }

  async getGroups(options?: {
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResult> {
    return this.getRecords('sys_user_group', {
      query: options?.query,
      limit: options?.limit,
      offset: options?.offset
    });
  }

  async getGroupMembers(groupId: string): Promise<TableRecord[]> {
    let result = await this.getRecords('sys_user_grmember', {
      query: `group=${groupId}`,
      displayValue: 'true'
    });
    return result.records;
  }

  async addGroupMember(groupId: string, userId: string): Promise<TableRecord> {
    return this.createRecord('sys_user_grmember', {
      group: groupId,
      user: userId
    });
  }

  async removeGroupMember(membershipId: string): Promise<void> {
    await this.deleteRecord('sys_user_grmember', membershipId);
  }
}
