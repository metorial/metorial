import { Buffer } from 'buffer';
import { createAxios } from 'slates';

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

  // ---- Documents ----

  async uploadDocument(params: {
    file?: { name: string; data: string };
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
  }): Promise<any> {
    let data: Record<string, any> = {};

    if (params.url) {
      data.url = params.url;
    }
    if (params.workspace) data.workspace = params.workspace;
    if (params.collection) data.collection = params.collection;
    if (params.documentType) data.document_type = params.documentType;
    if (params.wait !== undefined) data.wait = params.wait;
    if (params.identifier) data.identifier = params.identifier;
    if (params.customIdentifier) data.custom_identifier = params.customIdentifier;
    if (params.fileName) data.file_name = params.fileName;
    if (params.language) data.language = params.language;
    if (params.rejectDuplicates !== undefined)
      data.reject_duplicates = params.rejectDuplicates;
    if (params.lowPriority !== undefined) data.low_priority = params.lowPriority;
    if (params.compact !== undefined) data.compact = params.compact;
    if (params.deleteAfterParse !== undefined)
      data.delete_after_parse = params.deleteAfterParse;
    if (params.enableValidationTool !== undefined)
      data.enable_validation_tool = params.enableValidationTool;

    if (params.file) {
      let buffer = Buffer.from(params.file.data, 'base64');
      let blob = new Blob([buffer]);
      let formData = new FormData();
      formData.append('file', blob, params.file.name);
      for (let [key, value] of Object.entries(data)) {
        formData.append(key, String(value));
      }
      let response = await this.axios.post('/documents', formData);
      return response.data;
    }

    let response = await this.axios.post('/documents', data);
    return response.data;
  }

  async getDocument(
    identifier: string,
    params?: { format?: string; compact?: boolean }
  ): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.format) queryParams.format = params.format;
    if (params?.compact !== undefined) queryParams.compact = params.compact;
    let response = await this.axios.get(`/documents/${identifier}`, { params: queryParams });
    return response.data;
  }

  async listDocuments(params?: {
    workspace?: string;
    collection?: string;
    state?: string;
    tags?: string[];
    search?: string;
    offset?: number;
    limit?: number;
    ordering?: string;
    includeData?: boolean;
    inReview?: boolean;
    failed?: boolean;
    ready?: boolean;
    validatable?: boolean;
    hasChallenges?: boolean;
    customIdentifier?: string;
    compact?: boolean;
  }): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.workspace) queryParams.workspace = params.workspace;
    if (params?.collection) queryParams.collection = params.collection;
    if (params?.state) queryParams.state = params.state;
    if (params?.tags) queryParams.tags = params.tags;
    if (params?.search) queryParams.search = params.search;
    if (params?.offset !== undefined) queryParams.offset = params.offset;
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.ordering) queryParams.ordering = params.ordering;
    if (params?.includeData !== undefined) queryParams.include_data = params.includeData;
    if (params?.inReview !== undefined) queryParams.in_review = params.inReview;
    if (params?.failed !== undefined) queryParams.failed = params.failed;
    if (params?.ready !== undefined) queryParams.ready = params.ready;
    if (params?.validatable !== undefined) queryParams.validatable = params.validatable;
    if (params?.hasChallenges !== undefined) queryParams.has_challenges = params.hasChallenges;
    if (params?.customIdentifier) queryParams.custom_identifier = params.customIdentifier;
    if (params?.compact !== undefined) queryParams.compact = params.compact;

    let response = await this.axios.get('/documents', { params: queryParams });
    return response.data;
  }

  async updateDocument(identifier: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/documents/${identifier}`, data);
    return response.data;
  }

  async deleteDocument(identifier: string): Promise<void> {
    await this.axios.delete(`/documents/${identifier}`);
  }

  async getRedactedDocument(
    identifier: string,
    params?: {
      redactHeadshot?: boolean;
      redactPersonalDetails?: boolean;
      redactWorkDetails?: boolean;
      redactEducationDetails?: boolean;
      redactReferees?: boolean;
      redactLocations?: boolean;
      redactDates?: boolean;
      redactGender?: boolean;
      redactPdfMetadata?: boolean;
    }
  ): Promise<string> {
    let queryParams: Record<string, any> = {};
    if (params?.redactHeadshot !== undefined)
      queryParams.redact_headshot = params.redactHeadshot;
    if (params?.redactPersonalDetails !== undefined)
      queryParams.redact_personal_details = params.redactPersonalDetails;
    if (params?.redactWorkDetails !== undefined)
      queryParams.redact_work_details = params.redactWorkDetails;
    if (params?.redactEducationDetails !== undefined)
      queryParams.redact_education_details = params.redactEducationDetails;
    if (params?.redactReferees !== undefined)
      queryParams.redact_referees = params.redactReferees;
    if (params?.redactLocations !== undefined)
      queryParams.redact_locations = params.redactLocations;
    if (params?.redactDates !== undefined) queryParams.redact_dates = params.redactDates;
    if (params?.redactGender !== undefined) queryParams.redact_gender = params.redactGender;
    if (params?.redactPdfMetadata !== undefined)
      queryParams.redact_pdf_metadata = params.redactPdfMetadata;

    let response = await this.axios.get(`/documents/${identifier}/redacted`, {
      params: queryParams,
      responseType: 'arraybuffer'
    });
    let buffer = Buffer.from(response.data as ArrayBuffer);
    return buffer.toString('base64');
  }

  // ---- Workspaces ----

  async listWorkspaces(organization: string, name?: string): Promise<any> {
    let params: Record<string, any> = { organization };
    if (name) params.name = name;
    let response = await this.axios.get('/workspaces', { params });
    return response.data;
  }

  async getWorkspace(identifier: string): Promise<any> {
    let response = await this.axios.get(`/workspaces/${identifier}`);
    return response.data;
  }

  async createWorkspace(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/workspaces', data);
    return response.data;
  }

  async updateWorkspace(identifier: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/workspaces/${identifier}`, data);
    return response.data;
  }

  async deleteWorkspace(identifier: string): Promise<void> {
    await this.axios.delete(`/workspaces/${identifier}`);
  }

  // ---- Organizations ----

  async listOrganizations(): Promise<any> {
    let response = await this.axios.get('/organizations');
    return response.data;
  }

  async getOrganization(identifier: string): Promise<any> {
    let response = await this.axios.get(`/organizations/${identifier}`);
    return response.data;
  }

  // ---- Document Types ----

  async listDocumentTypes(params?: {
    organization?: string;
    workspace?: string;
  }): Promise<any> {
    let response = await this.axios.get('/document_types', { params });
    return response.data;
  }

  async getDocumentType(identifier: string): Promise<any> {
    let response = await this.axios.get(`/document_types/${identifier}`);
    return response.data;
  }

  // ---- Annotations ----

  async listAnnotations(documentIdentifier: string): Promise<any> {
    let response = await this.axios.get('/annotations', {
      params: { document: documentIdentifier }
    });
    return response.data;
  }

  async updateAnnotation(annotationId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/annotations/${annotationId}`, data);
    return response.data;
  }

  async batchUpdateAnnotations(data: Record<string, any>[]): Promise<any> {
    let response = await this.axios.post('/annotations/batch_update', data);
    return response.data;
  }

  async batchCreateAnnotations(data: Record<string, any>[]): Promise<any> {
    let response = await this.axios.post('/annotations/batch_create', data);
    return response.data;
  }

  async batchDeleteAnnotations(data: number[]): Promise<any> {
    let response = await this.axios.post('/annotations/batch_delete', data);
    return response.data;
  }

  // ---- Validation Results ----

  async listValidationResults(documentIdentifier: string): Promise<any> {
    let response = await this.axios.get('/validation_results', {
      params: { document: documentIdentifier }
    });
    return response.data;
  }

  async createValidationResult(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/validation_results', data);
    return response.data;
  }

  // ---- Tags ----

  async listTags(workspace: string): Promise<any> {
    let response = await this.axios.get('/tags', { params: { workspace } });
    return response.data;
  }

  async createTag(data: { name: string; workspace: string }): Promise<any> {
    let response = await this.axios.post('/tags', data);
    return response.data;
  }

  async batchAddTag(tagId: number, documentIdentifiers: string[]): Promise<any> {
    let response = await this.axios.post('/documents/batch_add_tag', {
      tag: tagId,
      documents: documentIdentifiers
    });
    return response.data;
  }

  async batchRemoveTag(tagId: number, documentIdentifiers: string[]): Promise<any> {
    let response = await this.axios.post('/documents/batch_remove_tag', {
      tag: tagId,
      documents: documentIdentifiers
    });
    return response.data;
  }

  // ---- Search & Match ----

  async searchResumes(params: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/resume_search', params);
    return response.data;
  }

  async getResumeSearchDetails(identifier: string, params: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/resume_search/details/${identifier}`, params);
    return response.data;
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
    let response = await this.axios.get('/resume_search/match', { params: queryParams });
    return response.data;
  }

  async searchJobDescriptions(params: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/job_description_search', params);
    return response.data;
  }

  // ---- Resthook Subscriptions ----

  async createResthookSubscription(data: {
    targetUrl: string;
    event: string;
    organization?: string;
    workspace?: string;
    version?: string;
  }): Promise<any> {
    let response = await this.axios.post('/resthook_subscriptions', data);
    return response.data;
  }

  async activateResthookSubscription(hookSecret: string): Promise<any> {
    let response = await this.axios.post('/resthook_subscriptions/activate', null, {
      headers: { 'X-Hook-Secret': hookSecret }
    });
    return response.data;
  }

  async listResthookSubscriptions(params?: { offset?: number; limit?: number }): Promise<any> {
    let response = await this.axios.get('/resthook_subscriptions', { params });
    return response.data;
  }

  async deleteResthookSubscription(subscriptionId: number): Promise<void> {
    await this.axios.delete(`/resthook_subscriptions/${subscriptionId}`);
  }

  // ---- Indexes ----

  async listIndexes(params?: { documentType?: string; name?: string }): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.documentType) queryParams.document_type = params.documentType;
    if (params?.name) queryParams.name = params.name;
    let response = await this.axios.get('/index', { params: queryParams });
    return response.data;
  }
}
