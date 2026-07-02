import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(private config: { token: string; baseUrl: string }) {
    this.axios = createAxios({
      baseURL: this.config.baseUrl,
      headers: {
        Authorization: `Bearer ${this.config.token}`
      }
    });
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
    let res = await this.axios.get<DocSetMetadata>(`/v1/storage/docsets/${docsetId}`);
    return res.data;
  }

  async listDocsets(params?: {
    pageSize?: number;
    pageToken?: string;
    nameEq?: string;
  }): Promise<DocSetMetadata[]> {
    let res = await this.axios.get<DocSetMetadata[]>('/v1/storage/docsets', {
      params: {
        page_size: params?.pageSize,
        page_token: params?.pageToken,
        name_eq: params?.nameEq
      }
    });
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
      `/v1/storage/docsets/${docsetId}`,
      params
    );
    return res.data;
  }

  async deleteDocset(docsetId: string): Promise<DocSetMetadata> {
    let res = await this.axios.delete<DocSetMetadata>(`/v1/storage/docsets/${docsetId}`);
    return res.data;
  }

  // ── Document Operations ──

  async addDocument(docsetId: string, file: Uint8Array, fileName: string): Promise<any> {
    let formData = new FormData();
    let blob = new Blob([file]);
    formData.append('file', blob, fileName);

    let res = await this.axios.post(`/v1/storage/docsets/${docsetId}/docs`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  }

  async listDocuments(
    docsetId: string,
    params?: { pageSize?: number; pageToken?: string }
  ): Promise<DocumentListResponse> {
    let res = await this.axios.get<DocumentListResponse>(
      `/v1/storage/docsets/${docsetId}/docs`,
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
    let res = await this.axios.get(`/v1/storage/docsets/${docsetId}/docs/${docId}`, {
      params: {
        include_elements: params?.includeElements
      }
    });
    return res.data;
  }

  async deleteDocument(docsetId: string, docId: string): Promise<any> {
    let res = await this.axios.delete(`/v1/storage/docsets/${docsetId}/docs/${docId}`);
    return res.data;
  }

  async updateDocumentProperties(
    docsetId: string,
    docId: string,
    operations: PropertyPatchOperation[]
  ): Promise<any> {
    let res = await this.axios.patch(
      `/v1/storage/docsets/${docsetId}/docs/${docId}/properties`,
      operations
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
    return res.data;
  }

  async partitionDocumentFromUrl(fileUrl: string, options?: PartitionOptions): Promise<any> {
    let formData = new FormData();
    formData.append('file_url', fileUrl);

    if (options) {
      formData.append('options', JSON.stringify(options));
    }

    let res = await this.axios.post('/v1/document/partition', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000
    });
    return res.data;
  }

  // ── Search ──

  async search(docsetId: string, params: SearchParams): Promise<SearchResponse> {
    let res = await this.axios.post<SearchResponse>(
      `/v1/query/search/${docsetId}`,
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
    let res = await this.axios.post('/v1/query', {
      docset_id: params.docsetId,
      query: params.query,
      plan: params.plan,
      stream: false,
      summarize_result: params.summarizeResult ?? false,
      rag_mode: params.ragMode ?? false
    });
    return res.data;
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
    let res = await this.axios.post(`/v1/storage/docsets/${docsetId}/suggest-properties`);
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

export interface DocumentListResponse {
  documents?: any[];
  next_page_token?: string;
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
  property_extraction?: Record<string, any>;
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
  next_page_token?: string;
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
