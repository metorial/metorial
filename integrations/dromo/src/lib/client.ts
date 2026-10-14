import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

let BASE_URL = 'https://app.dromo.io/api/v1';

export class DromoClient {
  private axios;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Reconnect Dromo with a backend API key.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { name: 'X-Dromo-License-Key', value: config.token.trim() },
      errorAdapter: error =>
        buildApiServiceError(error, { providerLabel: 'Dromo', reason: 'dromo_api_error' })
    });
  }

  // ---- Uploads ----

  async listUploads(params: { start?: number; end?: number } = {}): Promise<DromoUploadPage> {
    let response = await this.axios.get('/uploads/', { params });
    return response.data;
  }

  async getUploadMetadata(uploadId: string): Promise<DromoUploadMetadata> {
    let response = await this.axios.get(`/upload/${encodeURIComponent(uploadId)}/metadata/`);
    return response.data;
  }

  async getUploadDownloadUrl(uploadId: string): Promise<{ url: string }> {
    let response = await this.axios.get(`/upload/${encodeURIComponent(uploadId)}/url/`);
    return { url: this.downloadUrl(response.data) };
  }

  async deleteUpload(uploadId: string): Promise<void> {
    await this.axios.post(`/upload/${encodeURIComponent(uploadId)}/delete/`);
  }

  // ---- Schemas ----

  async listSchemas(): Promise<DromoSchema[]> {
    let response = await this.axios.get('/schemas/');
    return response.data;
  }

  async getSchema(schemaId: string): Promise<DromoSchema> {
    let response = await this.axios.get(`/schemas/${encodeURIComponent(schemaId)}/`);
    return response.data;
  }

  async createSchema(schema: DromoSchemaInput): Promise<DromoSchema> {
    let response = await this.axios.post('/schemas/', this.schemaPayload(schema));
    return response.data;
  }

  async updateSchema(schemaId: string, schema: DromoSchemaInput): Promise<DromoSchema> {
    let response = await this.axios.put(
      `/schemas/${encodeURIComponent(schemaId)}/`,
      this.schemaPayload(schema)
    );
    return response.data;
  }

  async deleteSchema(schemaId: string): Promise<void> {
    await this.axios.delete(`/schemas/${encodeURIComponent(schemaId)}/`);
  }

  // ---- Headless Imports ----

  async listHeadlessImports(
    params: { offset?: number; limit?: number } = {}
  ): Promise<DromoHeadlessImportPage> {
    let response = await this.axios.get('/headless/imports/', { params });
    return response.data;
  }

  async getHeadlessImport(importId: string): Promise<DromoHeadlessImport> {
    let response = await this.axios.get(`/headless/imports/${encodeURIComponent(importId)}/`);
    return response.data;
  }

  async createHeadlessImport(
    params: DromoHeadlessImportCreateInput
  ): Promise<DromoHeadlessImportCreateResponse> {
    let response = await this.axios.post('/headless/imports/', params);
    return response.data;
  }

  async getHeadlessImportDownloadUrl(importId: string): Promise<{ url: string }> {
    let response = await this.axios.get(
      `/headless/imports/${encodeURIComponent(importId)}/url/`
    );
    return { url: this.downloadUrl(response.data) };
  }

  async deleteHeadlessImport(importId: string): Promise<void> {
    await this.axios.delete(`/headless/imports/${encodeURIComponent(importId)}/`);
  }

  private downloadUrl(data: { presigned_url?: string; url?: string }): string {
    let url = data.presigned_url ?? data.url;
    if (!url) {
      throw createApiServiceError(
        'Dromo did not return a download URL. Try again after processing completes.'
      );
    }
    return url;
  }

  private schemaPayload(schema: DromoSchemaInput) {
    let keys = new Set<string>();
    let fields = schema.fields.map(field => {
      if (!field.key.trim() || !field.label.trim() || keys.has(field.key)) {
        throw createApiServiceError(
          'Every schema field needs a non-empty, unique key and a label.'
        );
      }
      keys.add(field.key);
      let { required, ...definition } = field;
      let validators = [...(field.validators ?? [])];
      if (
        required &&
        !validators.some(
          validator =>
            validator && typeof validator === 'object' && validator.validate === 'required'
        )
      ) {
        validators.push({ validate: 'required' });
      }
      return { ...definition, type: field.type ?? 'string', validators };
    });
    return { ...schema, fields, settings: schema.settings ?? {} };
  }
}

// ---- Types ----

export interface DromoUpload {
  id: string;
  upload_status: string;
  total_num_rows: number;
  invalid_row_indexes: number[];
  errors: any[];
  storage_key: string;
  field_order: string[];
  download_url?: string;
  created_date?: string;
  import_identifier?: string;
  raw_upload?: { filename?: string; download_url?: string } | null;
}

export interface DromoUploadPage {
  start: number;
  end: number;
  total_num_uploads: number;
  data: DromoUpload[];
}

export interface DromoUploadMetadata extends DromoUpload {
  filename?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    company_id: string | null;
    company_name: string | null;
  } | null;
  created_date: string;
  import_type?: string;
  status?: string;
  num_data_rows?: number;
  development_mode?: boolean;
  has_data?: boolean;
}

export interface DromoSchema {
  id: string;
  name: string;
  fields: DromoSchemaField[];
  settings?: Record<string, any>;
  hooks?: Record<string, any>;
  created_date?: string;
  updated_date?: string;
}

export interface DromoSchemaField {
  key: string;
  label: string;
  type?: string | unknown[];
  description?: string;
  validators?: any[];
  alternateMatches?: string[];
  required?: boolean;
}

export interface DromoSchemaInput {
  name: string;
  fields: DromoSchemaField[];
  settings?: Record<string, any>;
  hooks?: Record<string, any>;
}

export interface DromoHeadlessImport {
  id: string;
  schema_id: string;
  original_filename: string | null;
  status: string;
  created_date: string;
  updated_date?: string;
  num_data_rows?: number;
  review_url?: string | null;
  has_data?: boolean;
  result_metadata?: Record<string, unknown> | null;
  import_errors?: Record<string, unknown>[] | null;
}

export interface DromoHeadlessImportPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: DromoHeadlessImport[];
}

export interface DromoHeadlessImportCreateInput {
  schema_id: string;
  original_filename?: string;
  initial_data?: Record<string, any>[];
  settings?: Record<string, any>;
  hooks?: Record<string, any>;
  import_metadata?: Record<string, any>;
}

export interface DromoHeadlessImportCreateResponse {
  id: string;
  upload?: string;
  status: string;
}
