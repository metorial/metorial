import { createAxios } from 'slates';

let BASE_URL = 'https://app.dromo.io/api/v1';

export class DromoClient {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'X-Dromo-License-Key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Uploads ----

  async listUploads(): Promise<DromoUpload[]> {
    let response = await this.axios.get('/uploads/');
    return response.data;
  }

  async getUploadMetadata(uploadId: string): Promise<DromoUploadMetadata> {
    let response = await this.axios.get(`/upload/${uploadId}/metadata/`);
    return response.data;
  }

  async getUploadDownloadUrl(uploadId: string): Promise<{ url: string }> {
    let response = await this.axios.get(`/upload/${uploadId}/url/`);
    return response.data;
  }

  async deleteUpload(uploadId: string): Promise<void> {
    await this.axios.post(`/upload/${uploadId}/delete/`);
  }

  // ---- Schemas ----

  async listSchemas(): Promise<DromoSchema[]> {
    let response = await this.axios.get('/schemas/');
    return response.data;
  }

  async getSchema(schemaId: string): Promise<DromoSchema> {
    let response = await this.axios.get(`/schemas/${schemaId}/`);
    return response.data;
  }

  async createSchema(schema: DromoSchemaInput): Promise<DromoSchema> {
    let response = await this.axios.post('/schemas/', schema);
    return response.data;
  }

  async updateSchema(schemaId: string, schema: DromoSchemaInput): Promise<DromoSchema> {
    let response = await this.axios.put(`/schemas/${schemaId}/`, schema);
    return response.data;
  }

  async deleteSchema(schemaId: string): Promise<void> {
    await this.axios.delete(`/schemas/${schemaId}/`);
  }

  // ---- Headless Imports ----

  async listHeadlessImports(): Promise<DromoHeadlessImport[]> {
    let response = await this.axios.get('/headless/imports/');
    return response.data;
  }

  async getHeadlessImport(importId: string): Promise<DromoHeadlessImport> {
    let response = await this.axios.get(`/headless/imports/${importId}/`);
    return response.data;
  }

  async createHeadlessImport(
    params: DromoHeadlessImportCreateInput
  ): Promise<DromoHeadlessImportCreateResponse> {
    let response = await this.axios.post('/headless/imports/', params);
    return response.data;
  }

  async getHeadlessImportDownloadUrl(importId: string): Promise<{ url: string }> {
    let response = await this.axios.get(`/headless/imports/${importId}/url/`);
    return response.data;
  }

  async deleteHeadlessImport(importId: string): Promise<void> {
    await this.axios.delete(`/headless/imports/${importId}/`);
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
}

export interface DromoUploadMetadata {
  id: string;
  filename: string;
  user: {
    id: string;
    name: string;
    email: string;
    company_id: string | null;
    company_name: string | null;
  };
  created_date: string;
  import_type: string;
  status: string;
  num_data_rows: number;
  development_mode: boolean;
  has_data: boolean;
  field_order: string[];
  download_url?: string;
}

export interface DromoSchema {
  id: string;
  name: string;
  fields: DromoSchemaField[];
  settings?: Record<string, any>;
  created_date?: string;
  updated_date?: string;
}

export interface DromoSchemaField {
  key: string;
  label: string;
  type?: string;
  description?: string;
  validators?: any[];
  alternateMatches?: string[];
  required?: boolean;
}

export interface DromoSchemaInput {
  name: string;
  fields: DromoSchemaField[];
  settings?: Record<string, any>;
}

export interface DromoHeadlessImport {
  id: string;
  schema_id: string;
  original_filename: string;
  status: string;
  created_date: string;
  updated_date?: string;
  num_data_rows?: number;
  review_url?: string;
  has_data?: boolean;
}

export interface DromoHeadlessImportCreateInput {
  schema_id: string;
  original_filename?: string;
  initial_data?: Record<string, any>[];
}

export interface DromoHeadlessImportCreateResponse {
  id: string;
  upload?: string;
  status: string;
}
