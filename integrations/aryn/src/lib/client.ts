import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(private config: { token: string; baseUrl: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Provide an Aryn API key before calling the API.');
    }
    let baseUrl: URL;
    try {
      baseUrl = new URL(config.baseUrl);
    } catch {
      throw createApiServiceError('The Aryn API base URL must be a valid HTTP or HTTPS URL.');
    }
    if (!['https:', 'http:'].includes(baseUrl.protocol)) {
      throw createApiServiceError('The Aryn API base URL must use HTTP or HTTPS.');
    }
    this.config.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.axios = createAuthenticatedAxios({
      baseURL: this.config.baseUrl,
      authHeader: { value: `Bearer ${this.config.token}` },
      contentType: false,
      timeout: 300000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Aryn',
          reason: 'aryn_api_error',
          detailKeys: ['message', 'msg', 'detail', 'error', 'code'],
          nestedKeys: ['detail', 'errors']
        })
    });
  }

  private validatePageSize(pageSize?: number) {
    if (pageSize !== undefined && (!Number.isInteger(pageSize) || pageSize <= 0)) {
      throw createApiServiceError('pageSize must be a positive whole number.');
    }
  }

  private validateFileUrl(fileUrl: string) {
    try {
      let url = new URL(fileUrl);
      if (!['https:', 'http:'].includes(url.protocol)) {
        throw createApiServiceError('fileUrl must use HTTP or HTTPS.');
      }
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Aryn',
        reason: 'invalid_file_url',
        operation: 'document URL validation',
        fallbackMessage: 'Provide a valid HTTP or HTTPS document URL.'
      });
    }
  }

  // ── DocSet Operations ──

  async createDocset(params: {
    name: string;
    properties?: Record<string, any>;
    schema?: SchemaInput;
    prompts?: Record<string, string>;
  }): Promise<DocSetMetadata> {
    let res = await this.axios.post<DocSetMetadata>('/v1/storage/docsets', params);
    return res.data;
  }

  async getDocset(docsetId: string): Promise<DocSetMetadata> {
    let res = await this.axios.get<DocSetMetadata>(
      `/v1/storage/docsets/${encodeURIComponent(docsetId)}`
    );
    return res.data;
  }

  async listDocsets(params?: {
    pageSize?: number;
    pageToken?: string;
    nameEq?: string;
  }): Promise<DocSetListResponse | DocSetMetadata[]> {
    this.validatePageSize(params?.pageSize);
    let res = await this.axios.get<DocSetListResponse | DocSetMetadata[]>(
      '/v1/storage/docsets',
      {
        params: {
          page_size: params?.pageSize,
          page_token: params?.pageToken,
          name_eq: params?.nameEq
        }
      }
    );
    return res.data;
  }

  async updateDocset(
    docsetId: string,
    params: {
      name?: string;
      properties?: Record<string, any>;
      prompts?: Record<string, string>;
    }
  ): Promise<DocSetMetadata> {
    let res = await this.axios.patch<DocSetMetadata>(
      `/v1/storage/docsets/${encodeURIComponent(docsetId)}`,
      params
    );
    return res.data;
  }

  async deleteDocset(docsetId: string): Promise<DocSetMetadata> {
    let res = await this.axios.delete<DocSetMetadata>(
      `/v1/storage/docsets/${encodeURIComponent(docsetId)}`
    );
    return res.data;
  }

  // ── Document Operations ──

  async addDocument(docsetId: string, file: Uint8Array, fileName: string): Promise<any> {
    let formData = new FormData();
    let blob = new Blob([file]);
    formData.append('file', blob, fileName);

    let res = await this.axios.post(
      `/v1/storage/docsets/${encodeURIComponent(docsetId)}/docs`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    );
    return res.data;
  }

  async listDocuments(
    docsetId: string,
    params?: { pageSize?: number; pageToken?: string }
  ): Promise<DocumentListResponse> {
    this.validatePageSize(params?.pageSize);
    let res = await this.axios.get<DocumentListResponse>(
      `/v1/storage/docsets/${encodeURIComponent(docsetId)}/docs`,
      {
        params: {
          page_size: params?.pageSize,
          page_token: params?.pageToken
        }
      }
    );
    return res.data;
  }

  async getDocument(
    docsetId: string,
    docId: string,
    params?: { includeElements?: boolean }
  ): Promise<any> {
    let form = new URLSearchParams();
    form.set('include_elements', String(params?.includeElements ?? true));
    let res = await this.axios.get(
      `/v1/storage/docsets/${encodeURIComponent(docsetId)}/docs/${encodeURIComponent(docId)}`,
      {
        data: form.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return res.data;
  }

  async deleteDocument(docsetId: string, docId: string): Promise<any> {
    let res = await this.axios.delete(
      `/v1/storage/docsets/${encodeURIComponent(docsetId)}/docs/${encodeURIComponent(docId)}`
    );
    return res.data;
  }

  async updateDocumentProperties(
    docsetId: string,
    docId: string,
    operations: PropertyPatchOperation[]
  ): Promise<any> {
    let res = await this.axios.patch(
      `/v1/storage/docsets/${encodeURIComponent(docsetId)}/docs/${encodeURIComponent(docId)}/properties`,
      { operations }
    );
    return res.data;
  }

  // ── Partition (Parse) ──

  async partitionDocument(
    file: Uint8Array,
    fileName: string,
    options?: PartitionOptions
  ): Promise<any> {
    let formData = new FormData();
    let blob = new Blob([file]);
    formData.append('file', blob, fileName);

    if (options) {
      formData.append('options', JSON.stringify(options));
    }

    let res = await this.axios.post('/v1/document/partition', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000 // 5 minutes for large docs
    });
    return this.validatePartitionResponse(res.data);
  }

  async partitionDocumentFromUrl(fileUrl: string, options?: PartitionOptions): Promise<any> {
    this.validateFileUrl(fileUrl);
    let formData = new FormData();
    formData.append('file_url', fileUrl);

    if (options) {
      formData.append('options', JSON.stringify(options));
    }

    let res = await this.axios.post('/v1/document/partition', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000
    });
    return this.validatePartitionResponse(res.data);
  }

  private validatePartitionResponse(result: any) {
    if (
      result?.error ||
      (typeof result?.status_code === 'number' && result.status_code >= 400)
    ) {
      throw createApiServiceError(result.error || 'Aryn could not parse the document.', {
        reason: 'aryn_partition_failed',
        upstreamStatus: result.status_code
      });
    }
    return result;
  }

  async addDocumentFromUrl(docsetId: string, fileUrl: string): Promise<DocumentMetadata> {
    this.validateFileUrl(fileUrl);
    let formData = new FormData();
    formData.append('file_url', fileUrl);
    let res = await this.axios.post<DocumentMetadata>(
      `/v1/storage/docsets/${encodeURIComponent(docsetId)}/docs`,
      formData
    );
    return res.data;
  }

  getDocumentBinaryUrl(docsetId: string, docId: string) {
    return `${this.config.baseUrl}/v1/storage/docsets/${encodeURIComponent(docsetId)}/docs/${encodeURIComponent(docId)}/binary`;
  }

  // ── Search ──

  async search(docsetId: string, params: SearchParams): Promise<SearchResponse> {
    this.validatePageSize(params.pageSize);
    let res = await this.axios.post<SearchResponse>(
      `/v1/query/search/${encodeURIComponent(docsetId)}`,
      {
        query: params.query,
        query_type: params.queryType,
        properties_filter: params.propertiesFilter,
        return_type: params.returnType,
        include_fields: params.includeFields
      },
      {
        params: {
          page_size: params.pageSize,
          page_token: params.pageToken
        }
      }
    );
    return res.data;
  }

  // ── Query ──

  async runQuery(params: QueryParams): Promise<any> {
    return this.performQuery(params, false);
  }

  async executeQueryPlan(params: QueryParams): Promise<any> {
    return this.performQuery(params, params.summarizeResult ?? false);
  }

  private async performQuery(params: QueryParams, streaming: boolean): Promise<any> {
    if ((params.query === undefined) === (params.plan === undefined)) {
      throw createApiServiceError('Provide either a query or a logical plan, but not both.');
    }
    if (
      params.plan &&
      (params.ragMode ||
        !Number.isInteger(params.plan.result_node) ||
        Object.values(params.plan.nodes ?? {}).some(
          (node: any) =>
            !Number.isInteger(node.node_id) ||
            (node.inputs ?? []).some((id: number) => !Number.isInteger(id))
        ))
    ) {
      throw createApiServiceError(
        'Query plans require whole-number node IDs and cannot be used in RAG mode.'
      );
    }
    let res = await this.axios.post(
      '/v1/query',
      {
        docset_id: params.docsetId,
        query: params.query,
        plan: params.plan,
        stream: streaming,
        summarize_result: params.summarizeResult ?? false,
        rag_mode: params.ragMode ?? false
      },
      streaming
        ? { responseType: 'text', headers: { Accept: 'text/event-stream' } }
        : undefined
    );
    if (!streaming || typeof res.data !== 'string') return res.data;

    let events: { event_type: string; data: unknown }[] = [];
    let eventType = 'message';
    let dataLines: string[] = [];
    let flush = () => {
      if (dataLines.length === 0) return;
      let data: unknown = dataLines.join('\n');
      if (['plan', 'result_doc', 'trace_doc'].includes(eventType)) {
        try {
          data = JSON.parse(data as string);
        } catch {
          throw createApiServiceError('Aryn returned invalid query event data.');
        }
      }
      if (eventType === 'error') {
        throw createApiServiceError(`Aryn query failed: ${String(data)}`, {
          reason: 'aryn_query_failed'
        });
      }
      events.push({ event_type: eventType, data });
      eventType = 'message';
      dataLines = [];
    };
    for (let line of res.data.split(/\r?\n/)) {
      if (line === '') flush();
      else if (line.startsWith('event:')) eventType = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
    }
    flush();
    if (!events.some(e => e.event_type === 'complete')) {
      throw createApiServiceError('Aryn did not complete the query. Retry the query.');
    }
    return {
      events,
      result:
        events.filter(e => e.event_type === 'result').at(-1)?.data ??
        (events.some(e => e.event_type === 'result_doc')
          ? events.filter(e => e.event_type === 'result_doc').map(e => e.data)
          : events
              .filter(e => e.event_type === 'rag_answer')
              .map(e => e.data)
              .join('')),
      summary: events
        .filter(e => e.event_type === 'result_summary')
        .map(e => e.data)
        .join(''),
      plan: events.find(e => e.event_type === 'plan')?.data
    };
  }

  async generatePlan(params: { docsetId: string; query: string }): Promise<any> {
    let res = await this.axios.post('/v1/query/plan', {
      docset_id: params.docsetId,
      query: params.query
    });
    return res.data;
  }

  // ── Transform (Property Extraction) ──

  async extractProperties(docsetId: string, schema: SchemaInput): Promise<any> {
    let res = await this.axios.post('/v1/jobs/extract-properties', schema, {
      params: { docset_id: docsetId }
    });
    return res.data;
  }

  async deleteProperties(docsetId: string, names: string[]): Promise<any> {
    let res = await this.axios.post(
      '/v1/jobs/delete-properties',
      { names },
      {
        params: { docset_id: docsetId }
      }
    );
    return res.data;
  }

  async suggestProperties(docsetId: string): Promise<any> {
    let res = await this.axios.post(
      `/v1/storage/docsets/${encodeURIComponent(docsetId)}/suggest-properties`,
      {}
    );
    return res.data;
  }
}

// ── Types ──

export interface DocSetMetadata {
  docset_id: string;
  account_id: string;
  name: string;
  created_at: string;
  readonly: boolean;
  size?: number;
  properties?: Record<string, any>;
  schema?: any;
  prompts?: Record<string, string>;
}

export interface DocSetListResponse {
  items?: DocSetMetadata[];
  docsets?: DocSetMetadata[];
  next_page_token?: string | null;
}

export interface DocumentListResponse {
  items?: any[];
  documents?: any[];
  next_page_token?: string | null;
}

export interface DocumentMetadata {
  account_id: string;
  doc_id: string;
  docset_id: string;
  name: string;
  created_at: string;
  size: number;
  content_type: string;
  properties?: Record<string, any> | null;
}

export interface SchemaInput {
  properties: SchemaProperty[];
}

export interface SchemaProperty {
  name: string;
  field_type: string;
  description?: string;
  default?: any;
  examples?: string[];
}

export interface PartitionOptions {
  pipeline?: string;
  text_mode?: string;
  table_mode?: string;
  output_format?: string;
  summarize_images?: boolean;
  extract_images?: boolean;
  threshold?: number | string;
  ocr_language?: string;
  selected_pages?: (number | number[])[];
  add_to_docset_id?: string;
  chunking_options?: Record<string, any>;
  property_extraction_options?: Record<string, any>;
  table_extraction_options?: Record<string, any>;
  pages_per_call?: number;
  image_extraction_options?: Record<string, any>;
  text_extraction_options?: Record<string, any>;
  output_label_options?: Record<string, any>;
  markdown_options?: Record<string, any>;
}

export interface SearchParams {
  query?: string;
  queryType?: string;
  propertiesFilter?: string;
  returnType?: string;
  includeFields?: string[];
  pageSize?: number;
  pageToken?: string;
}

export interface SearchResponse {
  results: any[];
  query_embedding?: number[];
  next_page_token?: string | null;
}

export interface QueryParams {
  docsetId: string;
  query?: string;
  plan?: any;
  summarizeResult?: boolean;
  ragMode?: boolean;
}

export interface PropertyPatchOperation {
  op: string;
  path: string;
  value?: any;
}
