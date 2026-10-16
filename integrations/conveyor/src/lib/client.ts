import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

let conveyorError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Conveyor',
    reason: 'conveyor_api_error',
    extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
    nestedKeys: ['errors', 'error'],
    extractUpstreamCode: (_error, response) => {
      let body = response?.data;
      return isApiErrorRecord(body) &&
        (typeof body.code === 'string' || typeof body.code === 'number')
        ? String(body.code)
        : undefined;
    },
    fallbackMessage:
      'The request failed. Check the API key permissions and request parameters.'
  });

let BASE_URL = 'https://api.conveyor.com/api/v2';

export class ConveyorClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) throw createApiServiceError('A Conveyor API key is required.');
    this.http = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { name: 'X-API-KEY', value: config.token },
      contentType: false,
      errorAdapter: conveyorError
    });
    this.http.interceptors.response.use(response => {
      let body: unknown = response.data;
      let hasError = (value: unknown) => {
        if (typeof value === 'string') return value.trim().length > 0;
        if (Array.isArray(value)) return value.length > 0;
        if (isApiErrorRecord(value)) return Object.keys(value).length > 0;
        return value === true;
      };
      if (
        isApiErrorRecord(body) &&
        (body.success === false || hasError(body.error) || hasError(body.errors))
      ) {
        throw conveyorError({ response: { status: response.status, data: body } });
      }
      return response;
    });
  }

  private validatePagination(params?: { page?: number; perPage?: number }) {
    for (let [key, value] of Object.entries(params ?? {})) {
      if (
        (key === 'page' || key === 'perPage') &&
        value !== undefined &&
        (!Number.isInteger(value) || value < 1)
      ) {
        throw createApiServiceError(`${key} must be a positive whole number.`);
      }
    }
  }

  // ─── Analytics: Connections ───

  async listConnections(params?: { domain?: string; page?: number; perPage?: number }) {
    this.validatePagination(params);
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
    this.validatePagination(params);
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
    this.validatePagination(params);
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
    this.validatePagination(params);
    let response = await this.http.get(
      `/interactions/connections/${encodeURIComponent(connectionId)}`,
      {
        params: {
          type: params?.type,
          created_at_start: params?.createdAtStart,
          created_at_end: params?.createdAtEnd,
          page: params?.page,
          per_page: params?.perPage
        }
      }
    );
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
    this.validatePagination(params);
    let response = await this.http.get(
      `/interactions/documents/${encodeURIComponent(documentId)}`,
      {
        params: {
          created_at_start: params?.createdAtStart,
          created_at_end: params?.createdAtEnd,
          page: params?.page,
          per_page: params?.perPage
        }
      }
    );
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
    this.validatePagination(params);
    let response = await this.http.get(
      `/interactions/questions/${encodeURIComponent(questionId)}`,
      {
        params: {
          created_at_start: params?.createdAtStart,
          created_at_end: params?.createdAtEnd,
          page: params?.page,
          per_page: params?.perPage
        }
      }
    );
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
      `/exchange/authorization_requests/${encodeURIComponent(authorizationRequestId)}`
    );
    return response.data;
  }

  async ignoreAuthorizationRequest(authorizationRequestId: string, reviewerEmail: string) {
    let response = await this.http.patch(
      `/exchange/authorization_requests/${encodeURIComponent(authorizationRequestId)}`,
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
    let response = await this.http.patch(
      `/exchange/authorizations/${encodeURIComponent(authorizationId)}`,
      null,
      {
        params: {
          access_group_ids: params.accessGroupIds,
          status: params.status
        }
      }
    );
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
    await this.http.delete(`/exchange/folders/${encodeURIComponent(folderId)}`);
  }

  // ─── Portal: Documents ───

  async listDocuments() {
    let response = await this.http.get('/exchange/documents');
    return response.data;
  }

  async createDocument(params: {
    name: string;
    file: Blob;
    description?: string;
    certification?: string;
    featured?: boolean;
    folderId?: string;
    accessLevel?: string;
    productLineIds?: string;
    accessGroupIds?: string;
    disableDownloads?: boolean;
    useForQuestionAnswering?: boolean;
    expiresAt?: string;
    curatorId?: string;
    curatorEmail?: string;
  }) {
    let formData = new FormData();
    formData.append('name', params.name);
    formData.append('file', params.file);
    if (params.description !== undefined) formData.append('description', params.description);
    if (params.certification !== undefined)
      formData.append('certification', params.certification);
    if (params.featured !== undefined) formData.append('featured', String(params.featured));
    if (params.folderId !== undefined) formData.append('folder_id', params.folderId);
    if (params.accessLevel !== undefined) formData.append('access_level', params.accessLevel);
    if (params.productLineIds !== undefined)
      formData.append('product_line_ids', params.productLineIds);
    if (params.accessGroupIds !== undefined)
      formData.append('access_group_ids', params.accessGroupIds);
    if (params.disableDownloads !== undefined)
      formData.append('disable_downloads', String(params.disableDownloads));
    if (params.useForQuestionAnswering !== undefined)
      formData.append('use_for_question_answering', String(params.useForQuestionAnswering));

    if (params.expiresAt !== undefined) formData.append('expires_at', params.expiresAt);
    if (params.curatorId !== undefined) formData.append('curator_id', params.curatorId);
    if (params.curatorEmail !== undefined)
      formData.append('curator_email', params.curatorEmail);

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
      expiresAt?: string;
      curatorId?: string;
      curatorEmail?: string;
      file?: Blob;
    }
  ) {
    let formData = new FormData();
    if (params.name !== undefined) formData.append('name', params.name);
    if (params.description !== undefined) formData.append('description', params.description);
    if (params.certification !== undefined)
      formData.append('certification', params.certification);
    if (params.featured !== undefined) formData.append('featured', String(params.featured));
    if (params.folderId !== undefined) formData.append('folder_id', params.folderId);
    if (params.accessLevel !== undefined) formData.append('access_level', params.accessLevel);
    if (params.productLineIds !== undefined)
      formData.append('product_line_ids', params.productLineIds);
    if (params.accessGroupIds !== undefined)
      formData.append('access_group_ids', params.accessGroupIds);
    if (params.disableDownloads !== undefined)
      formData.append('disable_downloads', String(params.disableDownloads));
    if (params.useForQuestionAnswering !== undefined)
      formData.append('use_for_question_answering', String(params.useForQuestionAnswering));
    if (params.file) formData.append('file', params.file);
    if (params.expiresAt !== undefined) formData.append('expires_at', params.expiresAt);
    if (params.curatorId !== undefined) formData.append('curator_id', params.curatorId);
    if (params.curatorEmail !== undefined)
      formData.append('curator_email', params.curatorEmail);

    let response = await this.http.patch(
      `/exchange/documents/${encodeURIComponent(documentId)}`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    );
    return response.data;
  }

  async deleteDocument(documentId: string) {
    await this.http.delete(`/exchange/documents/${encodeURIComponent(documentId)}`);
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
    page?: number;
    perPage?: number;
  }) {
    this.validatePagination(params);
    let response = await this.http.get('/questionnaires', {
      params: {
        status: params?.status,
        product_line_ids: params?.productLineIds,
        created_at_start: params?.createdAtStart,
        created_at_end: params?.createdAtEnd,
        completed_at_start: params?.completedAtStart,
        completed_at_end: params?.completedAtEnd,
        due_at_start: params?.dueAtStart,
        due_at_end: params?.dueAtEnd,
        page: params?.page,
        per_page: params?.perPage
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
    file?: Blob;
    customerName?: string;
    crmId?: string;
    crmAmount?: number;
    contentVersionId?: string;
    filename?: string;
    contentType?: string;
  }) {
    let formData = new FormData();
    formData.append('domain', params.domain);
    formData.append('email', params.email);
    formData.append('original_format', params.originalFormat);
    if (params.questionnaireType !== undefined)
      formData.append('questionnaire_type', params.questionnaireType);
    if (params.dueAt !== undefined) formData.append('due_at', params.dueAt);
    if (params.productLineIds !== undefined)
      formData.append('product_line_ids', params.productLineIds);
    if (params.portalUrl !== undefined) formData.append('portal_url', params.portalUrl);
    if (params.notes !== undefined) formData.append('notes', params.notes);
    if (params.file) formData.append('file', params.file);
    if (params.customerName !== undefined)
      formData.append('customer_name', params.customerName);
    if (params.crmId !== undefined) formData.append('crm_id', params.crmId);
    if (params.contentVersionId !== undefined)
      formData.append('content_version_id', params.contentVersionId);
    if (params.filename !== undefined) formData.append('filename', params.filename);
    if (params.contentType !== undefined) formData.append('content_type', params.contentType);
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
    file?: Blob;
    source?: string;
  }) {
    let formData = new FormData();
    if (params.submitterEmail !== undefined)
      formData.append('submitter_email', params.submitterEmail);
    if (params.submitterExternalId !== undefined)
      formData.append('submitter_external_id', params.submitterExternalId);
    if (params.submitterExternalName !== undefined)
      formData.append('submitter_external_name', params.submitterExternalName);
    if (params.externalId !== undefined) formData.append('external_id', params.externalId);
    if (params.caseIds !== undefined) formData.append('case_ids', params.caseIds);
    if (params.rawData !== undefined) formData.append('raw_data', params.rawData);
    if (params.file) formData.append('file', params.file);
    if (params.source !== undefined) formData.append('source', params.source);

    let response = await this.http.post('/questionnaire_requests', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async updateQuestionnaireRequest(params: {
    externalId?: string;
    caseIds?: string;
    rawData?: string;
    file?: Blob;
    source?: string;
  }) {
    let formData = new FormData();
    if (params.externalId !== undefined) formData.append('external_id', params.externalId);
    if (params.caseIds !== undefined) formData.append('case_ids', params.caseIds);
    if (params.rawData !== undefined) formData.append('raw_data', params.rawData);
    if (params.file) formData.append('file', params.file);
    if (params.source !== undefined) formData.append('source', params.source);

    let response = await this.http.patch('/questionnaire_requests', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async searchKnowledgeBase(queryText: string, productLineIds?: string) {
    return (
      await this.http.get('/knowledge_base/search', {
        params: { query_text: queryText, product_line_ids: productLineIds }
      })
    ).data;
  }

  async listQuestionTags(params: { page?: number; perPage?: number }) {
    this.validatePagination(params);
    return (
      await this.http.get('/knowledge_base/question_tags', {
        params: { page: params.page, per_page: params.perPage }
      })
    ).data;
  }

  async createKnowledgeBaseQuestion(params: {
    content: string;
    answer: string;
    status: string;
    productLineIds?: string[];
    questionAnsweringUsage?: string;
    curatorEmail?: string;
    questionTagIds?: string[];
    maxVerificationAge?: number;
  }) {
    return (
      await this.http.post('/knowledge_base/questions', {
        content: params.content,
        answer: params.answer,
        status: params.status,
        product_line_ids: params.productLineIds,
        question_answering_usage: params.questionAnsweringUsage,
        curator_email: params.curatorEmail,
        question_tag_ids: params.questionTagIds,
        max_verification_age: params.maxVerificationAge
      })
    ).data;
  }

  async updateKnowledgeBaseQuestion(
    questionId: string,
    params: {
      answer?: string;
      status?: string;
      productLineIds?: string[];
      questionTagIds?: string[];
      curatorEmail?: string;
    }
  ) {
    return (
      await this.http.patch(
        `/knowledge_base/questions/${encodeURIComponent(questionId)}`,
        null,
        {
          params: {
            answer: params.answer,
            status: params.status,
            product_line_ids: params.productLineIds,
            question_tag_ids: params.questionTagIds,
            curator_email: params.curatorEmail
          }
        }
      )
    ).data;
  }

  async listOneOffQuestions(params: {
    createdAtStart?: string;
    createdAtEnd?: string;
    source?: string;
    isTest?: string;
    page?: number;
    perPage?: number;
  }) {
    this.validatePagination(params);
    return (
      await this.http.get('/oneoff_questions', {
        params: {
          created_at_start: params.createdAtStart,
          created_at_end: params.createdAtEnd,
          source: params.source,
          is_test: params.isTest,
          page: params.page,
          per_page: params.perPage
        }
      })
    ).data;
  }

  async listQuestionnaireQuestions(params: {
    questionnaireId?: string;
    questionnaireType?: string;
    questionnaireStatus?: string;
    createdAtStart?: string;
    createdAtEnd?: string;
    isTest?: string;
    isConveyoraiAnswered?: string;
    reusable?: boolean;
    page?: number;
    perPage?: number;
  }) {
    this.validatePagination(params);
    if (params.perPage !== undefined && params.perPage > 500) {
      throw createApiServiceError('perPage must be at most 500 for questionnaire questions.');
    }
    return (
      await this.http.get('/questionnaires/questions', {
        params: {
          questionnaire_id: params.questionnaireId,
          questionnaire_type: params.questionnaireType,
          questionnaire_status: params.questionnaireStatus,
          created_at_start: params.createdAtStart,
          created_at_end: params.createdAtEnd,
          is_test: params.isTest,
          is_conveyorai_answered: params.isConveyoraiAnswered,
          reusable: params.reusable,
          page: params.page,
          per_page: params.perPage
        }
      })
    ).data;
  }

  async updateQuestionnaire(
    questionnaireId: string,
    params: {
      status?: string;
      dueAt?: string;
      assigneeEmail?: string;
      notes?: string | null;
    }
  ) {
    return (
      await this.http.patch(`/questionnaires/${encodeURIComponent(questionnaireId)}`, {
        status: params.status,
        due_at: params.dueAt,
        assignee_email: params.assigneeEmail,
        notes: params.notes
      })
    ).data;
  }

  async listProjects(params: {
    crmId?: string;
    crmLink?: string;
    status?: string;
    domain?: string;
    page?: number;
    perPage?: number;
  }) {
    this.validatePagination(params);
    return (
      await this.http.get('/projects', {
        params: {
          crm_id: params.crmId,
          crm_link: params.crmLink,
          status: params.status,
          domain: params.domain,
          page: params.page,
          per_page: params.perPage
        }
      })
    ).data;
  }

  // ─── Single Question ───

  async askQuestion(
    question: string,
    params?: {
      productLineIds?: string;
      questionType?: string;
      multipleChoiceOptions?: string[];
      confidenceThreshold?: string;
      email?: string;
    }
  ) {
    let response = await this.http.post('/single_question', {
      question,
      product_line_ids: params?.productLineIds,
      question_type: params?.questionType,
      multiple_choice_options: params?.multipleChoiceOptions,
      confidence_threshold: params?.confidenceThreshold,
      email: params?.email
    });
    return response.data;
  }
}
