import { Buffer } from 'buffer';
import { createAxios } from 'slates';
import { affindaApiError } from './errors';

let BASE_URLS: Record<string, string> = {
  global: 'https://api.affinda.com/v3',
  us: 'https://api.us1.affinda.com/v3',
  eu: 'https://api.eu1.affinda.com/v3'
};

export interface ClientConfig {
  token: string;
  region?: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    let baseURL = BASE_URLS[config.region ?? 'global'] ?? BASE_URLS.global!;
    this.axios = createAxios({
      baseURL,
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  private async request<T>(operation: string, run: () => Promise<{ data: T }>): Promise<T> {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw affindaApiError(error, operation);
    }
  }

  // ---- Documents ----

  async uploadDocument(params: {
    file?: { name: string; data: string; mimeType?: string };
    url?: string;
    workspace?: string;
    collection?: string;
    documentType?: string;
    wait?: boolean;
    identifier?: string;
    customIdentifier?: string;
    fileName?: string;
    language?: string;
    rejectDuplicates?: boolean;
    lowPriority?: boolean;
    compact?: boolean;
    deleteAfterParse?: boolean;
    enableValidationTool?: boolean;
    expiryTime?: string;
    useOcr?: boolean;
    llmHint?: string;
    limitToExamples?: string[];
  }): Promise<any> {
    let data: Record<string, any> = {};

    if (params.url) {
      data.url = params.url;
    }
    if (params.workspace) data.workspace = params.workspace;
    if (params.collection) data.collection = params.collection;
    if (params.documentType) data.documentType = params.documentType;
    if (params.wait !== undefined) data.wait = params.wait;
    if (params.identifier) data.identifier = params.identifier;
    if (params.customIdentifier) data.customIdentifier = params.customIdentifier;
    if (params.fileName) data.fileName = params.fileName;
    if (params.language) data.language = params.language;
    if (params.rejectDuplicates !== undefined) data.rejectDuplicates = params.rejectDuplicates;
    if (params.lowPriority !== undefined) data.lowPriority = params.lowPriority;
    if (params.compact !== undefined) data.compact = params.compact;
    if (params.deleteAfterParse !== undefined) data.deleteAfterParse = params.deleteAfterParse;
    if (params.enableValidationTool !== undefined)
      data.enableValidationTool = params.enableValidationTool;
    if (params.expiryTime) data.expiryTime = params.expiryTime;
    if (params.useOcr !== undefined) data.useOcr = params.useOcr;
    if (params.llmHint) data.llmHint = params.llmHint;
    if (params.limitToExamples) data.limitToExamples = JSON.stringify(params.limitToExamples);

    let formData = new FormData();
    if (params.file) {
      let buffer = Buffer.from(params.file.data, 'base64');
      let blob = new Blob([buffer], {
        type: params.file.mimeType ?? 'application/octet-stream'
      });
      formData.append('file', blob, params.file.name);
    }

    for (let [key, value] of Object.entries(data)) {
      formData.append(key, String(value));
    }

    return this.request('upload document', () => this.axios.post('/documents', formData));
  }

  async getDocument(
    identifier: string,
    params?: { format?: string; compact?: boolean }
  ): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.format) queryParams.format = params.format;
    if (params?.compact !== undefined) queryParams.compact = params.compact;
    return this.request('get document', () =>
      this.axios.get(`/documents/${identifier}`, { params: queryParams })
    );
  }

  async listDocuments(params?: {
    workspace?: string;
    collection?: string;
    state?: string;
    tags?: number[];
    search?: string;
    createdDt?: string;
    offset?: number;
    limit?: number;
    ordering?: string[];
    includeData?: boolean;
    exclude?: string[];
    inReview?: boolean;
    failed?: boolean;
    ready?: boolean;
    validatable?: boolean;
    hasChallenges?: boolean;
    customIdentifier?: string;
    compact?: boolean;
    count?: boolean;
  }): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.workspace) queryParams.workspace = params.workspace;
    if (params?.collection) queryParams.collection = params.collection;
    if (params?.state) queryParams.state = params.state;
    if (params?.tags) queryParams.tags = params.tags;
    if (params?.search) queryParams.search = params.search;
    if (params?.createdDt) queryParams.created_dt = params.createdDt;
    if (params?.offset !== undefined) queryParams.offset = params.offset;
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.ordering) queryParams.ordering = params.ordering;
    if (params?.includeData !== undefined) queryParams.include_data = params.includeData;
    if (params?.exclude) queryParams.exclude = params.exclude;
    if (params?.inReview !== undefined) queryParams.in_review = params.inReview;
    if (params?.failed !== undefined) queryParams.failed = params.failed;
    if (params?.ready !== undefined) queryParams.ready = params.ready;
    if (params?.validatable !== undefined) queryParams.validatable = params.validatable;
    if (params?.hasChallenges !== undefined) queryParams.has_challenges = params.hasChallenges;
    if (params?.customIdentifier) queryParams.custom_identifier = params.customIdentifier;
    if (params?.compact !== undefined) queryParams.compact = params.compact;
    if (params?.count !== undefined) queryParams.count = params.count;

    return this.request('list documents', () =>
      this.axios.get('/documents', { params: queryParams })
    );
  }

  async updateDocument(
    identifier: string,
    data: Record<string, any>,
    params?: { compact?: boolean }
  ): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.compact !== undefined) queryParams.compact = params.compact;

    return this.request('update document', () =>
      this.axios.patch(`/documents/${identifier}`, data, { params: queryParams })
    );
  }

  async deleteDocument(identifier: string): Promise<void> {
    await this.request('delete document', () => this.axios.delete(`/documents/${identifier}`));
  }

  async getRedactedDocument(identifier: string): Promise<{
    contentBase64: string;
    mimeType: string;
    byteLength: number;
  }> {
    let data = await this.request<ArrayBuffer>('get redacted document', () =>
      this.axios.get(`/documents/${identifier}/redacted`, {
        responseType: 'arraybuffer'
      })
    );
    let buffer = Buffer.from(data);
    return {
      contentBase64: buffer.toString('base64'),
      mimeType: 'application/pdf',
      byteLength: buffer.byteLength
    };
  }

  // ---- Workspaces ----

  async listWorkspaces(organization: string, name?: string): Promise<any> {
    let params: Record<string, any> = { organization };
    if (name) params.name = name;
    return this.request('list workspaces', () => this.axios.get('/workspaces', { params }));
  }

  async getWorkspace(identifier: string): Promise<any> {
    return this.request('get workspace', () => this.axios.get(`/workspaces/${identifier}`));
  }

  async createWorkspace(data: Record<string, any>): Promise<any> {
    return this.request('create workspace', () => this.axios.post('/workspaces', data));
  }

  async updateWorkspace(identifier: string, data: Record<string, any>): Promise<any> {
    return this.request('update workspace', () =>
      this.axios.patch(`/workspaces/${identifier}`, data)
    );
  }

  async deleteWorkspace(identifier: string): Promise<void> {
    await this.request('delete workspace', () =>
      this.axios.delete(`/workspaces/${identifier}`)
    );
  }

  // ---- Organizations ----

  async listOrganizations(): Promise<any> {
    return this.request('list organizations', () => this.axios.get('/organizations'));
  }

  async getOrganization(identifier: string): Promise<any> {
    return this.request('get organization', () =>
      this.axios.get(`/organizations/${identifier}`)
    );
  }

  // ---- Document Types ----

  async listDocumentTypes(params?: {
    organization?: string;
    workspace?: string;
  }): Promise<any> {
    return this.request('list document types', () =>
      this.axios.get('/document_types', { params })
    );
  }

  async getDocumentType(identifier: string): Promise<any> {
    return this.request('get document type', () =>
      this.axios.get(`/document_types/${identifier}`)
    );
  }

  // ---- Annotations ----

  async listAnnotations(documentIdentifier: string): Promise<any> {
    return this.request('list annotations', () =>
      this.axios.get('/annotations', {
        params: { document: documentIdentifier }
      })
    );
  }

  async updateAnnotation(annotationId: number, data: Record<string, any>): Promise<any> {
    return this.request('update annotation', () =>
      this.axios.patch(`/annotations/${annotationId}`, data)
    );
  }

  async batchUpdateAnnotations(data: Record<string, any>[]): Promise<any> {
    return this.request('batch update annotations', () =>
      this.axios.post('/annotations/batch_update', data)
    );
  }

  async batchCreateAnnotations(data: Record<string, any>[]): Promise<any> {
    return this.request('batch create annotations', () =>
      this.axios.post('/annotations/batch_create', data)
    );
  }

  async batchDeleteAnnotations(data: number[]): Promise<any> {
    return this.request('batch delete annotations', () =>
      this.axios.post('/annotations/batch_delete', data)
    );
  }

  // ---- Validation Results ----

  async listValidationResults(params: {
    documentIdentifier: string;
    offset?: number;
    limit?: number;
  }): Promise<any> {
    let queryParams: Record<string, any> = {
      document: params.documentIdentifier
    };
    if (params.offset !== undefined) queryParams.offset = params.offset;
    if (params.limit !== undefined) queryParams.limit = params.limit;

    return this.request('list validation results', () =>
      this.axios.get('/validation_results', {
        params: queryParams
      })
    );
  }

  async createValidationResult(data: Record<string, any>): Promise<any> {
    return this.request('create validation result', () =>
      this.axios.post('/validation_results', data)
    );
  }

  // ---- Tags ----

  async listTags(params?: {
    workspace?: string;
    name?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    return this.request('list tags', () => this.axios.get('/tags', { params }));
  }

  async getTag(tagId: number): Promise<any> {
    return this.request('get tag', () => this.axios.get(`/tags/${tagId}`));
  }

  async createTag(data: { name: string; workspace: string }): Promise<any> {
    return this.request('create tag', () => this.axios.post('/tags', data));
  }

  async updateTag(tagId: number, data: { name?: string; workspace?: string }): Promise<any> {
    return this.request('update tag', () => this.axios.patch(`/tags/${tagId}`, data));
  }

  async deleteTag(tagId: number): Promise<void> {
    await this.request('delete tag', () => this.axios.delete(`/tags/${tagId}`));
  }

  async batchAddTag(tagId: number, documentIdentifiers: string[]): Promise<any> {
    return this.request('add tag to documents', () =>
      this.axios.post('/documents/batch_add_tag', {
        tag: tagId,
        identifiers: documentIdentifiers
      })
    );
  }

  async batchRemoveTag(tagId: number, documentIdentifiers: string[]): Promise<any> {
    return this.request('remove tag from documents', () =>
      this.axios.post('/documents/batch_remove_tag', {
        tag: tagId,
        identifiers: documentIdentifiers
      })
    );
  }

  // ---- Search & Match ----

  async searchResumes(params: Record<string, any>): Promise<any> {
    return this.request('search resumes', () => this.axios.post('/resume_search', params));
  }

  async getResumeSearchDetails(identifier: string, params: Record<string, any>): Promise<any> {
    return this.request('get resume search details', () =>
      this.axios.post(`/resume_search/details/${identifier}`, params)
    );
  }

  async matchResumeToJob(
    resumeIdentifier: string,
    jobDescriptionIdentifier: string,
    params?: Record<string, any>
  ): Promise<any> {
    let queryParams: Record<string, any> = {
      resume: resumeIdentifier,
      job_description: jobDescriptionIdentifier,
      ...params
    };
    return this.request('match resume to job', () =>
      this.axios.get('/resume_search/match', { params: queryParams })
    );
  }

  async searchJobDescriptions(params: Record<string, any>): Promise<any> {
    return this.request('search job descriptions', () =>
      this.axios.post('/job_description_search', params)
    );
  }

  // ---- Resthook Subscriptions ----

  async createResthookSubscription(data: {
    targetUrl: string;
    event: string;
    organization?: string;
    workspace?: string;
    version?: string;
  }): Promise<any> {
    return this.request('create resthook subscription', () =>
      this.axios.post('/resthook_subscriptions', data)
    );
  }

  async activateResthookSubscription(hookSecret: string): Promise<any> {
    return this.request('activate resthook subscription', () =>
      this.axios.post('/resthook_subscriptions/activate', null, {
        headers: { 'X-Hook-Secret': hookSecret }
      })
    );
  }

  async listResthookSubscriptions(params?: { offset?: number; limit?: number }): Promise<any> {
    return this.request('list resthook subscriptions', () =>
      this.axios.get('/resthook_subscriptions', { params })
    );
  }

  async deleteResthookSubscription(subscriptionId: number): Promise<void> {
    await this.request('delete resthook subscription', () =>
      this.axios.delete(`/resthook_subscriptions/${subscriptionId}`)
    );
  }

  // ---- Indexes ----

  async listIndexes(params?: {
    documentType?: string;
    name?: string;
    offset?: number;
    limit?: number;
  }): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.documentType) queryParams.document_type = params.documentType;
    if (params?.name) queryParams.name = params.name;
    if (params?.offset !== undefined) queryParams.offset = params.offset;
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    return this.request('list search indexes', () =>
      this.axios.get('/index', { params: queryParams })
    );
  }

  async createIndex(data: { name: string; docType: string }): Promise<any> {
    return this.request('create search index', () => this.axios.post('/index', data));
  }

  async updateIndex(name: string, data: { name: string }): Promise<any> {
    return this.request('update search index', () =>
      this.axios.patch(`/index/${encodeURIComponent(name)}`, data)
    );
  }

  async deleteIndex(name: string): Promise<void> {
    await this.request('delete search index', () =>
      this.axios.delete(`/index/${encodeURIComponent(name)}`)
    );
  }

  async listIndexedDocuments(
    name: string,
    params?: { offset?: number; limit?: number }
  ): Promise<any> {
    return this.request('list indexed documents', () =>
      this.axios.get(`/index/${encodeURIComponent(name)}/documents`, { params })
    );
  }

  async indexDocument(name: string, documentIdentifier: string): Promise<any> {
    return this.request('index document', () =>
      this.axios.post(`/index/${encodeURIComponent(name)}/documents`, {
        document: documentIdentifier
      })
    );
  }

  async deleteIndexedDocument(name: string, documentIdentifier: string): Promise<void> {
    await this.request('delete indexed document', () =>
      this.axios.delete(
        `/index/${encodeURIComponent(name)}/documents/${encodeURIComponent(documentIdentifier)}`
      )
    );
  }

  async reindexDocument(name: string, documentIdentifier: string): Promise<void> {
    await this.request('re-index document', () =>
      this.axios.post(
        `/index/${encodeURIComponent(name)}/documents/${encodeURIComponent(documentIdentifier)}/re_index`
      )
    );
  }
}
