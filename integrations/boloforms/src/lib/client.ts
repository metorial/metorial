import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export type DocumentActionInput = {
  documentId: string;
  documentType?: 'PDF' | 'PDF_TEMPLATE';
  responseId?: string;
};

type Pagination = {
  currentPage?: number;
  totalPages?: number;
  totalDocuments?: number;
  totalResponses?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
};

type CollectionResponse = Record<string, unknown> & {
  documents?: Record<string, unknown>[];
  respondents?: Record<string, unknown>[];
  responses?: Record<string, unknown>[];
  data?: Record<string, unknown>[] | Record<string, unknown>;
  pagination?: Pagination | null;
};

type SigningResponse = {
  message?: string | null;
  templateId?: string | null;
  createdDocumentId?: string | null;
  createdDocumentStatus?: string | null;
  signers?: Array<{
    signerId?: string | null;
    email?: string | null;
    name?: string | null;
    status?: string | null;
    roleTitle?: string | null;
    sentUrl?: string | null;
  }> | null;
};

type DocumentActionResponse = {
  message?: string | null;
  documentId?: string | null;
  documentType?: 'PDF' | 'PDF_TEMPLATE' | null;
  responseId?: string | null;
  status?: string | null;
  isVoid?: boolean | null;
  remindedSigners?: Record<string, unknown>[] | null;
  skippedSigners?: Record<string, unknown>[] | null;
};

export class BoloFormsClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(params: { token: string }) {
    if (!params.token.trim()) {
      throw createApiServiceError('Reconnect BoloForms with a valid API key.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://sapi.boloforms.com/signature',
      timeout: 30000,
      authHeader: { name: 'x-api-key', value: params.token },
      headers: { 'Content-Type': 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'BoloForms',
          reason: 'boloforms_api_error'
        })
    });
  }

  private validatePagination(options?: { page?: number; limit?: number }) {
    if (
      options?.page !== undefined &&
      (!Number.isInteger(options.page) || options.page < 1 || options.page > 10000)
    ) {
      throw createApiServiceError('Provide a whole-number page between 1 and 10000.');
    }
    if (
      options?.limit !== undefined &&
      (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 100)
    ) {
      throw createApiServiceError('Provide a whole-number limit between 1 and 100.');
    }
  }

  async getDocuments(options?: {
    page?: number;
    limit?: number;
    filter?: string;
    query?: string;
    sortBy?: string;
    sortOrder?: string;
    dateFrom?: string;
    dateTo?: string;
    documentId?: string;
    workspaceId?: string;
    documentType?: 'PDF' | 'PDF_TEMPLATE';
    status?: string;
    archive?: boolean;
  }) {
    this.validatePagination(options);
    if (!options?.workspaceId?.trim()) {
      throw createApiServiceError(
        'Provide workspaceId for list_documents. BoloForms requires the workspace UUID associated with your API key.'
      );
    }
    if (options.documentType === 'PDF_TEMPLATE' && options.status !== undefined) {
      throw createApiServiceError('The status filter is only supported for PDF documents.');
    }
    let response = await this.axios.get<CollectionResponse>('/get-documents', {
      headers: { workspaceid: options.workspaceId },
      params: {
        page: options?.page,
        limit: options?.limit,
        filter: options?.filter,
        query: options?.query,
        sortBy: options?.sortBy,
        sortOrder: options?.sortOrder,
        dateFrom: options?.dateFrom,
        dateTo: options?.dateTo,
        documentId: options?.documentId,
        documentType: options?.documentType,
        status: options?.status,
        archive: options?.archive === undefined ? undefined : String(options.archive)
      }
    });
    return response.data;
  }

  async sendPdfTemplate(data: {
    documentId: string;
    receiversList: Array<{
      name: string;
      email: string;
      roleTitle?: string;
      message?: string;
      subject?: string;
    }>;
    mailData?: {
      subject?: string;
      message?: string;
    };
    customVariables?: Array<{
      varName: string;
      varValue: string;
    }>;
  }) {
    if (data.receiversList.some(receiver => !receiver.roleTitle?.trim())) {
      throw createApiServiceError(
        'For PDF_TEMPLATE, provide roleTitle for every recipient using the exact role configured on the template.'
      );
    }
    if (
      new Set(data.receiversList.map(receiver => receiver.roleTitle)).size !==
      data.receiversList.length
    ) {
      throw createApiServiceError('Use a unique template roleTitle for each PDF recipient.');
    }
    this.validateReceivers(data.receiversList);
    let response = await this.axios.post<SigningResponse>('/pdf-template-lambda', {
      signingType: 'PDF_TEMPLATE',
      documentId: data.documentId,
      receiversList: data.receiversList,
      mailData: data.mailData,
      customVariables: data.customVariables
    });
    return response.data;
  }

  async sendFormTemplate(data: {
    documentId: string;
    receiversList: Array<{
      name: string;
      email: string;
      message?: string;
      subject?: string;
    }>;
    mailData?: {
      subject?: string;
      message?: string;
    };
    customVariables?: Array<{
      varName: string;
      varValue: string;
    }>;
  }) {
    this.validateReceivers(data.receiversList);
    let response = await this.axios.post<SigningResponse>('/pdf-template-lambda', {
      signingType: 'FORM_TEMPLATE',
      documentId: data.documentId,
      receiversList: data.receiversList,
      mailData: data.mailData,
      customVariables: data.customVariables
    });
    return response.data;
  }

  async getTemplateRespondents(options: {
    templateId?: string;
    respondentDocumentId?: string;
    page?: number;
    limit?: number;
  }) {
    this.validatePagination(options);
    if (!options.templateId?.trim() && !options.respondentDocumentId?.trim()) {
      throw createApiServiceError('Provide templateId, respondentDocumentId, or both.');
    }
    let response = await this.axios.get<CollectionResponse>('/get-template-respondent', {
      params: {
        templateId: options.templateId,
        respondentDocumentId: options.respondentDocumentId,
        page: options.page,
        limit: options.limit
      }
    });
    return response.data;
  }

  async getFormResponses(options?: {
    formId?: string;
    responseId?: string;
    page?: number;
    limit?: number;
  }) {
    this.validatePagination(options);
    if (!options?.formId?.trim() && !options?.responseId?.trim()) {
      throw createApiServiceError('Provide formId, responseId, or both.');
    }
    let response = await this.axios.get<CollectionResponse>('/get-form-responses', {
      params: {
        formId: options?.formId,
        responseId: options?.responseId,
        page: options?.page,
        limit: options?.limit
      }
    });
    return response.data;
  }

  private validateReceivers(receivers: Array<{ name: string; email: string }>) {
    if (receivers.length < 1 || receivers.length > 100) {
      throw createApiServiceError('Provide between 1 and 100 recipients.');
    }
    if (
      receivers.some(
        receiver => !receiver.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiver.email)
      )
    ) {
      throw createApiServiceError(
        'Provide a name and valid email address for every recipient.'
      );
    }
  }

  private documentActionBody(input: DocumentActionInput) {
    let documentType = input.documentType ?? (input.responseId ? 'PDF_TEMPLATE' : 'PDF');
    if (documentType === 'PDF_TEMPLATE' && !input.responseId) {
      throw createApiServiceError(
        'For PDF_TEMPLATE, provide responseId using createdDocumentId from send_template or respondentDocumentId from get_template_respondents.'
      );
    }
    if (documentType === 'PDF' && input.responseId !== undefined) {
      throw createApiServiceError('responseId is only supported for PDF_TEMPLATE documents.');
    }
    return { documentId: input.documentId, documentType, responseId: input.responseId };
  }

  async sendReminder(input: DocumentActionInput) {
    let response = await this.axios.post<DocumentActionResponse>(
      '/send-reminder',
      this.documentActionBody(input)
    );
    return response.data;
  }

  async voidDocument(input: DocumentActionInput) {
    let response = await this.axios.post<DocumentActionResponse>(
      '/void-document',
      this.documentActionBody(input)
    );
    return response.data;
  }
}
