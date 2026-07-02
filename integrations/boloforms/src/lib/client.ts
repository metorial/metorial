import { createAxios } from 'slates';

export class BoloFormsClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(params: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://sapi.boloforms.com/signature',
      headers: {
        'x-api-key': params.token,
        'Content-Type': 'application/json'
      }
    });
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
  }) {
    let response = await this.axios.get('/get-documents', {
      params: {
        page: options?.page,
        limit: options?.limit,
        filter: options?.filter,
        query: options?.query,
        sortBy: options?.sortBy,
        sortOrder: options?.sortOrder,
        dateFrom: options?.dateFrom,
        dateTo: options?.dateTo,
        documentId: options?.documentId
      }
    });
    return response.data;
  }

  async sendPdfTemplate(data: {
    documentId: string;
    receiversList: Array<{
      name: string;
      email: string;
      roleTitle: string;
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
    let response = await this.axios.post('/pdf-template-lambda', {
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
    let response = await this.axios.post('/pdf-template-lambda', {
      signingType: 'FORM_TEMPLATE',
      documentId: data.documentId,
      receiversList: data.receiversList,
      mailData: data.mailData,
      customVariables: data.customVariables
    });
    return response.data;
  }

  async getTemplateRespondents(options: {
    templateId: string;
    respondentDocumentId?: string;
    page?: number;
    limit?: number;
  }) {
    let response = await this.axios.get('/get-template-respondent', {
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
    let response = await this.axios.get('/get-form-responses', {
      params: {
        formId: options?.formId,
        responseId: options?.responseId,
        page: options?.page,
        limit: options?.limit
      }
    });
    return response.data;
  }
}
