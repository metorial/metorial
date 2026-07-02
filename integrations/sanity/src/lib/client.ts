import { createAxios } from 'slates';

export interface SanityClientConfig {
  token: string;
  projectId: string;
  dataset: string;
  apiVersion: string;
}

export class SanityClient {
  private config: SanityClientConfig;

  constructor(config: SanityClientConfig) {
    this.config = config;
  }

  private get dataAxios() {
    return createAxios({
      baseURL: `https://${this.config.projectId}.api.sanity.io/v${this.config.apiVersion}`,
      headers: {
        Authorization: `Bearer ${this.config.token}`
      }
    });
  }

  private get managementAxios() {
    return createAxios({
      baseURL: `https://api.sanity.io/v${this.config.apiVersion}`,
      headers: {
        Authorization: `Bearer ${this.config.token}`
      }
    });
  }

  // ── GROQ Query ──

  async query(
    groqQuery: string,
    params?: Record<string, any>,
    options?: {
      perspective?: string;
      useCdn?: boolean;
    }
  ) {
    let ax = options?.useCdn
      ? createAxios({
          baseURL: `https://${this.config.projectId}.apicdn.sanity.io/v${this.config.apiVersion}`,
          headers: { Authorization: `Bearer ${this.config.token}` }
        })
      : this.dataAxios;

    let response = await ax.post(
      `/data/query/${this.config.dataset}`,
      {
        query: groqQuery,
        params: params || {}
      },
      {
        params: options?.perspective ? { perspective: options.perspective } : undefined
      }
    );

    return response.data;
  }

  // ── Document Operations ──

  async getDocument(documentId: string) {
    let response = await this.dataAxios.get(`/data/doc/${this.config.dataset}/${documentId}`);
    return response.data;
  }

  async getDocuments(documentIds: string[]) {
    let ids = documentIds.join(',');
    let response = await this.dataAxios.get(`/data/doc/${this.config.dataset}/${ids}`);
    return response.data;
  }

  async mutate(
    mutations: any[],
    options?: {
      returnIds?: boolean;
      returnDocuments?: boolean;
      visibility?: 'sync' | 'async' | 'deferred';
      dryRun?: boolean;
      autoGenerateArrayKeys?: boolean;
      transactionId?: string;
    }
  ) {
    let response = await this.dataAxios.post(
      `/data/mutate/${this.config.dataset}`,
      { mutations },
      {
        params: {
          returnIds: options?.returnIds ?? true,
          returnDocuments: options?.returnDocuments ?? false,
          visibility: options?.visibility,
          dryRun: options?.dryRun,
          autoGenerateArrayKeys: options?.autoGenerateArrayKeys,
          transactionId: options?.transactionId
        }
      }
    );
    return response.data;
  }

  // ── Document History ──

  async getDocumentRevision(
    documentId: string,
    options: {
      revision?: string;
      time?: string;
    }
  ) {
    let response = await this.dataAxios.get(
      `/data/history/${this.config.dataset}/documents/${documentId}`,
      { params: options }
    );
    return response.data;
  }

  // ── Asset Upload ──

  async uploadImage(fileData: ArrayBuffer | string, filename?: string, contentType?: string) {
    let response = await this.dataAxios.post(
      `/assets/images/${this.config.dataset}`,
      fileData,
      {
        params: filename ? { filename } : undefined,
        headers: {
          'Content-Type': contentType || 'application/octet-stream'
        }
      }
    );
    return response.data;
  }

  async uploadFile(fileData: ArrayBuffer | string, filename?: string, contentType?: string) {
    let response = await this.dataAxios.post(
      `/assets/files/${this.config.dataset}`,
      fileData,
      {
        params: filename ? { filename } : undefined,
        headers: {
          'Content-Type': contentType || 'application/octet-stream'
        }
      }
    );
    return response.data;
  }

  // ── Projects ──

  async listProjects() {
    let response = await this.managementAxios.get('/projects');
    return response.data;
  }

  async getProject(projectId?: string) {
    let id = projectId || this.config.projectId;
    let response = await this.managementAxios.get(`/projects/${id}`);
    return response.data;
  }

  // ── Datasets ──

  async listDatasets(projectId?: string) {
    let id = projectId || this.config.projectId;
    let response = await this.managementAxios.get(`/projects/${id}/datasets`);
    return response.data;
  }

  async createDataset(name: string, aclMode?: 'public' | 'private' | 'custom') {
    let response = await this.managementAxios.put(
      `/projects/${this.config.projectId}/datasets/${name}`,
      aclMode ? { aclMode } : undefined
    );
    return response.data;
  }

  async deleteDataset(name: string) {
    let response = await this.managementAxios.delete(
      `/projects/${this.config.projectId}/datasets/${name}`
    );
    return response.data;
  }

  // ── Webhooks ──

  async listWebhooks() {
    let response = await this.dataAxios.get(`/hooks/projects/${this.config.projectId}`);
    return response.data;
  }

  async createWebhook(webhook: {
    type?: 'document' | 'transaction';
    name: string;
    url: string;
    dataset: string;
    apiVersion: string;
    description?: string;
    rule?: {
      on?: ('create' | 'update' | 'delete')[];
      filter?: string;
      projection?: string;
    };
    httpMethod?: string;
    includeDrafts?: boolean;
    headers?: Record<string, string>;
    secret?: string;
    isDisabledByUser?: boolean;
  }) {
    let response = await this.dataAxios.post(`/hooks/projects/${this.config.projectId}`, {
      type: webhook.type || 'document',
      ...webhook
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.dataAxios.delete(
      `/hooks/projects/${this.config.projectId}/${webhookId}`
    );
    return response.data;
  }

  async getWebhook(webhookId: string) {
    let response = await this.dataAxios.get(
      `/hooks/projects/${this.config.projectId}/${webhookId}`
    );
    return response.data;
  }

  // ── Users ──

  async getCurrentUser() {
    let response = await this.managementAxios.get('/users/me');
    return response.data;
  }
}
