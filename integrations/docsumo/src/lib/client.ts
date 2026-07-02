import { Buffer } from 'node:buffer';
import { createAxios } from 'slates';
import { docsumoApiError, docsumoServiceError } from './errors';

export interface DocsumoDocument {
  docId: string;
  title: string;
  status: string;
  type: string;
  typeTitle?: string;
  createdAt?: string;
  createdAtIso?: string;
  modifiedAtIso?: string;
  email?: string;
  reviewUrl?: string;
  userDocId?: string;
  docMetaData?: string;
  userId?: string;
  folderId?: string;
  folderName?: string;
  caseId?: string;
  approvedWithError?: boolean;
  convertedToDigital?: boolean;
  reviewToken?: boolean;
  previewImage?: {
    url: string;
    width: number;
    height: number;
  };
  uploadedBy?: {
    userId: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
  };
  timeDict?: {
    processingTime: number;
    totalTime: number;
  };
}

export interface DocumentType {
  docTypeId: string;
  title: string;
  docType: string;
  canUpload?: boolean;
  isDefault?: boolean;
  category?: string;
  docCounts?: {
    all: number;
    processed: number;
    reviewing: number;
  };
  uploadEmail?: string;
}

export interface AccountInfo {
  userId: string;
  email: string;
  fullName: string;
  monthlyDocCurrent: number;
  monthlyDocLimit: number;
  documentTypes: DocumentType[];
}

export interface ListDocumentsParams {
  view?: 'files' | 'folder' | 'all_files';
  folderId?: string;
  limit?: number;
  offset?: number;
  docType?: string;
  status?: 'reviewing' | 'processed' | 'erred';
  query?: string;
  sortBy?: 'created_date.asc' | 'created_date.desc';
  createdDateGte?: string;
  createdDateLte?: string;
}

export interface UploadUrlParams {
  fileUrl: string;
  documentType: string;
  userDocId?: string;
  docMetaData?: string;
  reviewToken?: boolean;
  filename?: string;
  password?: string;
}

export interface UploadBase64Params {
  base64Content: string;
  documentType: string;
  filename: string;
  userDocId?: string;
  docMetaData?: string;
  reviewToken?: boolean;
  password?: string;
}

export interface UpdateReviewStatusParams {
  docId: string;
  action: 'start' | 'end' | 'skip';
  forced?: boolean;
  strict?: boolean;
}

export interface ListAgentsParams {
  agentType?: 'all' | 'doctype' | 'casetype';
}

export interface ListCasesParams {
  casetypeId: string;
  limit?: number;
  offset?: number;
  sortBy?:
    | 'created_date.asc'
    | 'created_date.desc'
    | 'modified_date.asc'
    | 'modified_date.desc';
  stageIds?: string[];
  assignedTo?: string[];
  workflowStates?: string[];
  createdDateFrom?: string;
  createdDateTo?: string;
  modifiedDateFrom?: string;
  modifiedDateTo?: string;
}

export interface CreateCaseFile {
  filename: string;
  contentBase64: string;
  contentType?: string;
}

export interface CreateCaseParams {
  casetypeId: string;
  caseId?: string;
  userCaseId?: string;
  caseName?: string;
  stageId?: string;
  assignedTo?: string;
  doctype?: string;
  triggerWorkflow?: boolean;
  userCaseMetadata?: Record<string, unknown>;
  caseFields?: Record<string, unknown>;
  files?: CreateCaseFile[];
}

export interface UpdateCaseParams {
  casetypeId: string;
  caseId: string;
  stageId?: string;
  caseFields?: Record<string, unknown>;
  assignedTo?: string;
  approval?: {
    id: string;
    isApproved: boolean;
    reason?: string;
  };
  triggerWorkflow?: boolean;
  caseName?: string;
}

let isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null;

let documentCount = (value: unknown) => {
  if (!isRecord(value)) {
    return {
      all: 0,
      processed: 0,
      reviewing: 0
    };
  }

  return {
    all: Number(value.all) || 0,
    processed: Number(value.processed) || 0,
    reviewing: Number(value.reviewing) || 0
  };
};

let mapDocument = (doc: any): DocsumoDocument => ({
  docId: String(doc.doc_id ?? doc.docId ?? ''),
  title: String(doc.title ?? ''),
  status: String(doc.status ?? ''),
  type: String(doc.type ?? doc.doc_type ?? ''),
  typeTitle: doc.type_title,
  createdAt: doc.created_at,
  createdAtIso: doc.created_at_iso,
  modifiedAtIso: doc.modified_at_iso,
  email: doc.email,
  reviewUrl: doc.review_url,
  userDocId: doc.user_doc_id,
  docMetaData: doc.doc_meta_data,
  userId: doc.user_id,
  folderId: doc.folder_id,
  folderName: doc.folder_name,
  caseId: doc.case_id,
  approvedWithError: doc.approved_with_error,
  convertedToDigital: doc.converted_to_digital,
  reviewToken: doc.review_token,
  previewImage: doc.preview_image
    ? {
        url: doc.preview_image.url,
        width: doc.preview_image.width,
        height: doc.preview_image.height
      }
    : undefined,
  uploadedBy: doc.uploaded_by
    ? {
        userId: doc.uploaded_by.user_id,
        email: doc.uploaded_by.email,
        fullName: doc.uploaded_by.full_name,
        avatarUrl: doc.uploaded_by.avatar_url
      }
    : undefined,
  timeDict: doc.time_dict
    ? {
        processingTime: Number(doc.time_dict.processing_time) || 0,
        totalTime: Number(doc.time_dict.total_time) || 0
      }
    : undefined
});

let mapDocumentType = (docType: any): DocumentType => ({
  docTypeId: String(
    docType.id ?? docType.doc_type_id ?? docType.value ?? docType.doc_type ?? ''
  ),
  title: String(docType.title ?? ''),
  docType: String(docType.doc_type ?? docType.value ?? ''),
  canUpload: docType.can_upload,
  isDefault: docType.default,
  category: docType.category,
  docCounts: docType.doc_counts ? documentCount(docType.doc_counts) : undefined,
  uploadEmail: docType.upload_email
});

let asArray = (value: unknown): any[] => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
};

let dataUrlPattern = /^data:[^;,]+;base64,/i;

let normalizeBase64 = (value: string) => value.replace(dataUrlPattern, '').trim();

let toBlob = (file: CreateCaseFile) => {
  let normalized = normalizeBase64(file.contentBase64);
  let bytes = Buffer.from(normalized, 'base64');
  let roundTrip = bytes.toString('base64').replace(/=+$/, '');

  if (!bytes.length || roundTrip !== normalized.replace(/=+$/, '')) {
    throw docsumoServiceError('Case file contentBase64 must be valid non-empty base64 data.');
  }

  return new Blob([bytes], { type: file.contentType || 'application/octet-stream' });
};

let appendFormField = (formData: FormData, name: string, value: unknown) => {
  if (value === undefined || value === null) return;
  if (typeof value === 'boolean') {
    formData.append(name, value ? 'true' : 'false');
    return;
  }
  if (typeof value === 'object') {
    formData.append(name, JSON.stringify(value));
    return;
  }
  formData.append(name, String(value));
};

export class Client {
  private axios;

  constructor(options: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://app.docsumo.com',
      headers: {
        'X-API-KEY': options.token,
        apikey: options.token
      }
    });
  }

  private async request<T>(operation: string, run: () => Promise<any>): Promise<T> {
    try {
      let response = await run();
      this.assertSuccessfulResponse(response, operation);
      return response.data;
    } catch (error) {
      throw docsumoApiError(error, operation);
    }
  }

  private async requestData<T>(operation: string, run: () => Promise<any>): Promise<T> {
    let body = await this.request<any>(operation, run);
    return (body?.data ?? body) as T;
  }

  private assertSuccessfulResponse(response: any, operation: string) {
    let body = response?.data;
    let statusCode = Number(body?.status_code ?? response?.status);
    let status = typeof body?.status === 'string' ? body.status.toLowerCase() : '';

    if (status === 'fail' || statusCode >= 400 || statusCode === 202) {
      let reason = [body?.error, body?.message, body?.error_code]
        .filter((value: unknown) => typeof value === 'string' && value.trim())
        .join(' - ');

      throw docsumoServiceError(
        `Docsumo API ${operation} failed: ${statusCode ? `HTTP ${statusCode}: ` : ''}${reason || 'Unknown error'}`
      );
    }
  }

  async getAccountInfo(): Promise<AccountInfo> {
    let data = await this.requestData<any>('get account info', () =>
      this.axios.get('/api/v1/eevee/apikey/limit/')
    );

    return {
      userId: String(data.user_id ?? ''),
      email: String(data.email ?? ''),
      fullName: String(data.full_name ?? ''),
      monthlyDocCurrent: Number(data.monthly_doc_current) || 0,
      monthlyDocLimit: Number(data.monthly_doc_limit) || 0,
      documentTypes: asArray(data.document_types).map(mapDocumentType)
    };
  }

  async listEnabledDocumentTypes(): Promise<DocumentType[]> {
    let data = await this.requestData<any>('list enabled document types', () =>
      this.axios.get('/api/v1/mew/documents/types/')
    );

    return asArray(data.document ?? data.documents ?? data.document_types).map(
      mapDocumentType
    );
  }

  async getDocumentsSummary(): Promise<{
    documentTypes: DocumentType[];
    disabledDocumentTypes: string[];
  }> {
    let data = await this.requestData<any>('get documents summary', () =>
      this.axios.get('/api/v1/mew/apikey/documents/summary/')
    );

    return {
      documentTypes: asArray(data.document ?? data.documents).map(mapDocumentType),
      disabledDocumentTypes: asArray(data.disabled_doc_types).map(String)
    };
  }

  async listDocuments(params: ListDocumentsParams = {}): Promise<{
    documents: DocsumoDocument[];
    total: number;
    limit: number;
    offset: number;
  }> {
    let queryParams: Record<string, string> = {};

    if (params.view) queryParams.view = params.view;
    if (params.folderId) queryParams.folder_id = params.folderId;
    if (params.limit !== undefined) queryParams.limit = String(params.limit);
    if (params.offset !== undefined) queryParams.offset = String(params.offset);
    if (params.docType) queryParams.doc_type = params.docType;
    if (params.status) queryParams.status = params.status;
    if (params.query) queryParams.q = params.query;
    if (params.sortBy) queryParams.sort_by = params.sortBy;
    if (params.createdDateGte) queryParams.created_date = `gte:${params.createdDateGte}`;
    if (params.createdDateLte) {
      queryParams.created_date = queryParams.created_date
        ? `${queryParams.created_date},lte:${params.createdDateLte}`
        : `lte:${params.createdDateLte}`;
    }

    let data = await this.requestData<any>('list documents', () =>
      this.axios.get('/api/v1/eevee/apikey/documents/all/', {
        params: queryParams
      })
    );
    let documents = asArray(data.documents).map(mapDocument);

    return {
      documents,
      total: Number(data.total) || 0,
      limit: Number(data.limit) || 0,
      offset: Number(data.offset) || 0
    };
  }

  async getDocumentDetail(docId: string): Promise<DocsumoDocument> {
    let data = await this.requestData<any>('get document detail', () =>
      this.axios.get(`/api/v1/eevee/apikey/documents/detail/${docId}/`)
    );
    let doc = data.document || data;
    return mapDocument(doc);
  }

  async deleteDocument(docId: string): Promise<void> {
    await this.request('delete document', () =>
      this.axios.delete(`/api/v1/eevee/apikey/delete/${docId}/`)
    );
  }

  async uploadFromUrl(params: UploadUrlParams): Promise<DocsumoDocument[]> {
    let formData = new FormData();
    formData.append('file', params.fileUrl);
    formData.append('file_type', 'url');
    formData.append('type', params.documentType);
    appendFormField(formData, 'user_doc_id', params.userDocId);
    appendFormField(formData, 'doc_meta_data', params.docMetaData);
    appendFormField(formData, 'review_token', params.reviewToken);
    appendFormField(formData, 'filename', params.filename);
    appendFormField(formData, 'password', params.password);

    let data = await this.requestData<any>('upload document from URL', () =>
      this.axios.post('/api/v1/eevee/apikey/upload/custom/', formData)
    );
    return asArray(data.document).map(mapDocument);
  }

  async uploadFromBase64(params: UploadBase64Params): Promise<DocsumoDocument[]> {
    let formData = new FormData();
    formData.append('file', params.base64Content);
    formData.append('file_type', 'base64');
    formData.append('type', params.documentType);
    formData.append('filename', params.filename);
    appendFormField(formData, 'user_doc_id', params.userDocId);
    appendFormField(formData, 'doc_meta_data', params.docMetaData);
    appendFormField(formData, 'review_token', params.reviewToken);
    appendFormField(formData, 'password', params.password);

    let data = await this.requestData<any>('upload document from base64', () =>
      this.axios.post('/api/v1/eevee/apikey/upload/custom/', formData)
    );
    return asArray(data.document).map(mapDocument);
  }

  async getExtractedData(docId: string): Promise<{
    sections: Record<string, any>;
    metaData: Record<string, any>;
  }> {
    let data = await this.requestData<any>('get extracted data', () =>
      this.axios.get(`/api/v1/eevee/apikey/data/simplified/${docId}/`)
    );
    let metaData = data.meta_data || {};
    let sections: Record<string, any> = {};

    for (let key of Object.keys(data)) {
      if (key !== 'meta_data') {
        sections[key] = data[key];
      }
    }

    return { sections, metaData };
  }

  async updateReviewStatus(params: UpdateReviewStatusParams): Promise<{
    status: string;
    statusCode: number;
    message?: string;
  }> {
    let queryParams: Record<string, boolean> = {};
    if (params.forced !== undefined) queryParams.forced = params.forced;
    if (params.strict !== undefined) queryParams.strict = params.strict;

    let body = await this.request<any>('update review status', () =>
      this.axios.post(`/api/v1/pik/review/${params.docId}/${params.action}/`, null, {
        params: queryParams
      })
    );

    return {
      status: String(body.status ?? ''),
      statusCode: Number(body.status_code) || 0,
      message: body.message
    };
  }

  async getReviewUrl(docId: string): Promise<string> {
    let data = await this.requestData<any>('get review URL', () =>
      this.axios.get(`/api/v1/eevee/apikey/review-url/${docId}/`)
    );
    return data.review_url || data.url || '';
  }

  async getBankStatementAnalytics(
    docId: string,
    mode: 'basic' | 'all' = 'basic'
  ): Promise<Record<string, any>> {
    let body = await this.request<any>('get bank statement analytics', () =>
      this.axios.get(`/api/v1/mew/usbs-analytics/${docId}/`, {
        params: {
          output: 'json',
          mode
        },
        headers: {
          'Content-Type': 'application/json'
        }
      })
    );

    return body.data ?? body;
  }

  async listAgents(params: ListAgentsParams = {}): Promise<{
    agents: Record<string, any>[];
    disabledAgents: Record<string, any>[];
  }> {
    let data = await this.requestData<any>('list agents', () =>
      this.axios.get('/api/v1/external/agents', {
        params: {
          type: params.agentType || 'all'
        }
      })
    );

    return {
      agents: asArray(data.agents),
      disabledAgents: asArray(data.disabled_agents)
    };
  }

  async getCaseTypeDetails(casetypeId: string): Promise<Record<string, any>> {
    return await this.requestData<Record<string, any>>('get case type details', () =>
      this.axios.get(`/api/v1/external/agents/${casetypeId}`)
    );
  }

  async listCases(params: ListCasesParams): Promise<{
    cases: Record<string, any>[];
    pagination: Record<string, any>;
  }> {
    let data = await this.requestData<any>('list cases', () =>
      this.axios.get(`/api/v1/external/agents/${params.casetypeId}/cases`, {
        params: {
          limit: params.limit,
          offset: params.offset,
          sort_by: params.sortBy,
          stage_id: params.stageIds,
          assigned_to: params.assignedTo,
          workflow_state: params.workflowStates,
          created_date_from: params.createdDateFrom,
          created_date_to: params.createdDateTo,
          modified_date_from: params.modifiedDateFrom,
          modified_date_to: params.modifiedDateTo
        }
      })
    );

    return {
      cases: asArray(data.cases),
      pagination: isRecord(data.pagination) ? data.pagination : {}
    };
  }

  async getCaseOverview(params: {
    casetypeId: string;
    caseId: string;
    include?: Array<'doctypes' | 'fields' | 'approvals' | 'exports' | 'documents'>;
  }): Promise<Record<string, any>> {
    return await this.requestData<Record<string, any>>('get case overview', () =>
      this.axios.get(`/api/v1/external/agents/${params.casetypeId}/case/${params.caseId}`, {
        params: {
          include: params.include?.join(',')
        }
      })
    );
  }

  async createCase(params: CreateCaseParams): Promise<Record<string, any>> {
    let formData = new FormData();
    formData.append('casetype_id', params.casetypeId);
    appendFormField(formData, 'case_id', params.caseId);
    appendFormField(formData, 'user_case_id', params.userCaseId);
    appendFormField(formData, 'case_name', params.caseName);
    appendFormField(formData, 'stage_id', params.stageId);
    appendFormField(formData, 'assigned_to', params.assignedTo);
    appendFormField(formData, 'doctype', params.doctype);
    appendFormField(formData, 'trigger_workflow', params.triggerWorkflow);
    appendFormField(formData, 'user_case_metadata', params.userCaseMetadata);
    appendFormField(formData, 'case_fields', params.caseFields);

    for (let file of params.files ?? []) {
      formData.append('files', toBlob(file), file.filename);
    }

    return await this.requestData<Record<string, any>>('create case', () =>
      this.axios.post('/api/v1/upload-service/agents/casetype/case', formData)
    );
  }

  async updateCase(params: UpdateCaseParams): Promise<Record<string, any>> {
    let body: Record<string, unknown> = {};
    if (params.stageId !== undefined) body.stage_id = params.stageId;
    if (params.caseFields !== undefined) body.case_fields = params.caseFields;
    if (params.assignedTo !== undefined) body.assigned_to = params.assignedTo;
    if (params.approval !== undefined) {
      body.approval = {
        id: params.approval.id,
        is_approved: params.approval.isApproved,
        reason: params.approval.reason
      };
    }
    if (params.triggerWorkflow !== undefined) body.trigger_workflow = params.triggerWorkflow;
    if (params.caseName !== undefined) body.case_name = params.caseName;

    if (Object.keys(body).length === 0) {
      throw docsumoServiceError(
        'Provide at least one case update field: stageId, caseFields, assignedTo, approval, triggerWorkflow, or caseName.'
      );
    }

    return await this.requestData<Record<string, any>>('update case', () =>
      this.axios.patch(
        `/api/v1/external/agents/${params.casetypeId}/case/${params.caseId}`,
        body
      )
    );
  }

  async runCaseWorkflow(
    casetypeId: string,
    caseId: string
  ): Promise<{
    status: string;
    statusCode: number;
    message?: string;
  }> {
    let body = await this.request<any>('run case workflow', () =>
      this.axios.get(`/api/v1/external/agents/${casetypeId}/case/${caseId}/run`)
    );

    return {
      status: String(body.status ?? ''),
      statusCode: Number(body.status_code) || 0,
      message: body.message
    };
  }
}
