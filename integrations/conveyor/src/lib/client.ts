import { createAxios } from 'slates';

let BASE_URL = 'https://api.conveyor.com/api/v2';

export class ConveyorClient {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: BASE_URL,
      headers: {
        'X-API-KEY': config.token
      }
    });
  }

  // ─── Analytics: Connections ───

  async listConnections(params?: { domain?: string; page?: number; perPage?: number }) {
    let response = await this.http.get('/exchange/connections', {
      params: {
        domain: params?.domain,
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  // ─── Analytics: Product Lines ───

  async listProductLines() {
    let response = await this.http.get('/product_lines');
    return response.data;
  }

  // ─── Analytics: Knowledge Base Questions ───

  async listKnowledgeBaseQuestions(params?: {
    status?: string;
    page?: number;
    perPage?: number;
  }) {
    let response = await this.http.get('/knowledge_base/questions', {
      params: {
        status: params?.status,
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  // ─── Analytics: Interactions ───

  async listInteractions(params?: {
    type?: string;
    createdAtStart?: string;
    createdAtEnd?: string;
    page?: number;
    perPage?: number;
  }) {
    let response = await this.http.get('/interactions', {
      params: {
        type: params?.type,
        created_at_start: params?.createdAtStart,
        created_at_end: params?.createdAtEnd,
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async listInteractionsByConnection(
    connectionId: string,
    params?: {
      type?: string;
      createdAtStart?: string;
      createdAtEnd?: string;
      page?: number;
      perPage?: number;
    }
  ) {
    let response = await this.http.get(`/interactions/connections/${connectionId}`, {
      params: {
        type: params?.type,
        created_at_start: params?.createdAtStart,
        created_at_end: params?.createdAtEnd,
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async listInteractionsByDocument(
    documentId: string,
    params?: {
      createdAtStart?: string;
      createdAtEnd?: string;
      page?: number;
      perPage?: number;
    }
  ) {
    let response = await this.http.get(`/interactions/documents/${documentId}`, {
      params: {
        created_at_start: params?.createdAtStart,
        created_at_end: params?.createdAtEnd,
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async listInteractionsByQuestion(
    questionId: string,
    params?: {
      createdAtStart?: string;
      createdAtEnd?: string;
      page?: number;
      perPage?: number;
    }
  ) {
    let response = await this.http.get(`/interactions/questions/${questionId}`, {
      params: {
        created_at_start: params?.createdAtStart,
        created_at_end: params?.createdAtEnd,
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  // ─── Portal: Authorization Requests ───

  async listAuthorizationRequests(params?: { status?: string; email?: string }) {
    let response = await this.http.get('/exchange/authorization_requests', {
      params: {
        status: params?.status,
        email: params?.email
      }
    });
    return response.data;
  }

  async getAuthorizationRequest(authorizationRequestId: string) {
    let response = await this.http.get(
      `/exchange/authorization_requests/${authorizationRequestId}`
    );
    return response.data;
  }

  async ignoreAuthorizationRequest(authorizationRequestId: string, reviewerEmail: string) {
    let response = await this.http.patch(
      `/exchange/authorization_requests/${authorizationRequestId}`,
      null,
      {
        params: {
          status: 'ignored',
          reviewer_email: reviewerEmail
        }
      }
    );
    return response.data;
  }

  // ─── Portal: Authorizations ───

  async listAuthorizations(params?: { status?: string; email?: string }) {
    let response = await this.http.get('/exchange/authorizations', {
      params: {
        status: params?.status,
        email: params?.email
      }
    });
    return response.data;
  }

  async createAuthorization(params: {
    requestId?: string;
    email?: string;
    accessGroupIds?: string[];
    ndaBypass?: boolean;
    expiresAt?: string;
  }) {
    let response = await this.http.post('/exchange/authorizations', null, {
      params: {
        request_id: params.requestId,
        email: params.email,
        access_group_ids: params.accessGroupIds,
        nda_bypass: params.ndaBypass,
        expires_at: params.expiresAt
      }
    });
    return response.data;
  }

  async updateAuthorization(
    authorizationId: string,
    params: {
      accessGroupIds?: string[];
      status?: string;
    }
  ) {
    let response = await this.http.patch(`/exchange/authorizations/${authorizationId}`, null, {
      params: {
        access_group_ids: params.accessGroupIds,
        status: params.status
      }
    });
    return response.data;
  }

  // ─── Portal: Access Groups ───

  async listAccessGroups() {
    let response = await this.http.get('/exchange/access_groups');
    return response.data;
  }

  // ─── Portal: Folders ───

  async listFolders() {
    let response = await this.http.get('/exchange/folders');
    return response.data;
  }

  async createFolder(name: string) {
    let response = await this.http.post('/exchange/folders', null, {
      params: { name }
    });
    return response.data;
  }

  async deleteFolder(folderId: string) {
    await this.http.delete(`/exchange/folders/${folderId}`);
  }

  // ─── Portal: Documents ───

  async listDocuments() {
    let response = await this.http.get('/exchange/documents');
    return response.data;
  }

  async createDocument(params: {
    name: string;
    file: any;
    description?: string;
    certification?: string;
    featured?: boolean;
    folderId?: string;
    accessLevel?: string;
    productLineIds?: string;
    accessGroupIds?: string;
    disableDownloads?: boolean;
    useForQuestionAnswering?: boolean;
  }) {
    let formData = new FormData();
    formData.append('name', params.name);
    formData.append('file', params.file);
    if (params.description) formData.append('description', params.description);
    if (params.certification) formData.append('certification', params.certification);
    if (params.featured !== undefined) formData.append('featured', String(params.featured));
    if (params.folderId) formData.append('folder_id', params.folderId);
    if (params.accessLevel) formData.append('access_level', params.accessLevel);
    if (params.productLineIds) formData.append('product_line_ids', params.productLineIds);
    if (params.accessGroupIds) formData.append('access_group_ids', params.accessGroupIds);
    if (params.disableDownloads !== undefined)
      formData.append('disable_downloads', String(params.disableDownloads));
    if (params.useForQuestionAnswering !== undefined)
      formData.append('use_for_question_answering', String(params.useForQuestionAnswering));

    let response = await this.http.post('/exchange/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async updateDocument(
    documentId: string,
    params: {
      name?: string;
      description?: string;
      certification?: string;
      featured?: boolean;
      folderId?: string;
      accessLevel?: string;
      productLineIds?: string;
      accessGroupIds?: string;
      disableDownloads?: boolean;
      useForQuestionAnswering?: boolean;
      file?: any;
    }
  ) {
    let formData = new FormData();
    if (params.name) formData.append('name', params.name);
    if (params.description) formData.append('description', params.description);
    if (params.certification) formData.append('certification', params.certification);
    if (params.featured !== undefined) formData.append('featured', String(params.featured));
    if (params.folderId) formData.append('folder_id', params.folderId);
    if (params.accessLevel) formData.append('access_level', params.accessLevel);
    if (params.productLineIds) formData.append('product_line_ids', params.productLineIds);
    if (params.accessGroupIds) formData.append('access_group_ids', params.accessGroupIds);
    if (params.disableDownloads !== undefined)
      formData.append('disable_downloads', String(params.disableDownloads));
    if (params.useForQuestionAnswering !== undefined)
      formData.append('use_for_question_answering', String(params.useForQuestionAnswering));
    if (params.file) formData.append('file', params.file);

    let response = await this.http.patch(`/exchange/documents/${documentId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async deleteDocument(documentId: string) {
    await this.http.delete(`/exchange/documents/${documentId}`);
  }

  // ─── Questionnaires ───

  async listQuestionnaires(params?: {
    status?: string;
    productLineIds?: string;
    createdAtStart?: string;
    createdAtEnd?: string;
    completedAtStart?: string;
    completedAtEnd?: string;
    dueAtStart?: string;
    dueAtEnd?: string;
  }) {
    let response = await this.http.get('/questionnaires', {
      params: {
        status: params?.status,
        product_line_ids: params?.productLineIds,
        created_at_start: params?.createdAtStart,
        created_at_end: params?.createdAtEnd,
        completed_at_start: params?.completedAtStart,
        completed_at_end: params?.completedAtEnd,
        due_at_start: params?.dueAtStart,
        due_at_end: params?.dueAtEnd
      }
    });
    return response.data;
  }

  async createQuestionnaire(params: {
    domain: string;
    email: string;
    originalFormat: string;
    questionnaireType?: string;
    dueAt?: string;
    productLineIds?: string;
    portalUrl?: string;
    notes?: string;
    file?: any;
    customerName?: string;
    crmId?: string;
    crmAmount?: number;
  }) {
    let formData = new FormData();
    formData.append('domain', params.domain);
    formData.append('email', params.email);
    formData.append('original_format', params.originalFormat);
    if (params.questionnaireType)
      formData.append('questionnaire_type', params.questionnaireType);
    if (params.dueAt) formData.append('due_at', params.dueAt);
    if (params.productLineIds) formData.append('product_line_ids', params.productLineIds);
    if (params.portalUrl) formData.append('portal_url', params.portalUrl);
    if (params.notes) formData.append('notes', params.notes);
    if (params.file) formData.append('file', params.file);
    if (params.customerName) formData.append('customer_name', params.customerName);
    if (params.crmId) formData.append('crm_id', params.crmId);
    if (params.crmAmount !== undefined)
      formData.append('crm_amount', String(params.crmAmount));

    let response = await this.http.post('/questionnaires', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  // ─── Questionnaire Requests ───

  async createQuestionnaireRequest(params: {
    submitterEmail?: string;
    submitterExternalId?: string;
    submitterExternalName?: string;
    externalId?: string;
    caseIds?: string;
    rawData?: string;
    file?: any;
    source?: string;
  }) {
    let formData = new FormData();
    if (params.submitterEmail) formData.append('submitter_email', params.submitterEmail);
    if (params.submitterExternalId)
      formData.append('submitter_external_id', params.submitterExternalId);
    if (params.submitterExternalName)
      formData.append('submitter_external_name', params.submitterExternalName);
    if (params.externalId) formData.append('external_id', params.externalId);
    if (params.caseIds) formData.append('case_ids', params.caseIds);
    if (params.rawData) formData.append('raw_data', params.rawData);
    if (params.file) formData.append('file', params.file);
    if (params.source) formData.append('source', params.source);

    let response = await this.http.post('/questionnaire_requests', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async updateQuestionnaireRequest(params: {
    externalId?: string;
    caseIds?: string;
    rawData?: string;
    file?: any;
    source?: string;
  }) {
    let formData = new FormData();
    if (params.externalId) formData.append('external_id', params.externalId);
    if (params.caseIds) formData.append('case_ids', params.caseIds);
    if (params.rawData) formData.append('raw_data', params.rawData);
    if (params.file) formData.append('file', params.file);
    if (params.source) formData.append('source', params.source);

    let response = await this.http.patch('/questionnaire_requests', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  // ─── Single Question ───

  async askQuestion(question: string) {
    let response = await this.http.post('/single_question', { question });
    return response.data;
  }
}
