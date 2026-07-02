import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  baseUrl: string;
}

export interface PaginationParams {
  limit?: number;
  after?: number;
  before?: number;
}

// Template types
export interface TemplateDocument {
  name: string;
  file: string;
  fields?: Record<string, any>[];
}

export interface CreateTemplatePdfParams {
  name: string;
  documents: TemplateDocument[];
  folderName?: string;
  externalId?: string;
  sharedLink?: boolean;
  flatten?: boolean;
  removeTags?: boolean;
}

export interface CreateTemplateDocxParams {
  name: string;
  documents: TemplateDocument[];
  folderName?: string;
  externalId?: string;
  sharedLink?: boolean;
}

export interface CreateTemplateHtmlParams {
  html: string;
  htmlHeader?: string;
  htmlFooter?: string;
  name?: string;
  size?: string;
  externalId?: string;
  folderName?: string;
  sharedLink?: boolean;
  documents?: Array<{ html: string; name?: string }>;
}

export interface UpdateTemplateParams {
  name?: string;
  folderName?: string;
  externalId?: string;
  roles?: string[];
}

export interface CloneTemplateParams {
  name?: string;
  folderName?: string;
  externalId?: string;
}

export interface MergeTemplatesParams {
  templateIds: number[];
  name?: string;
  folderName?: string;
  externalId?: string;
  sharedLink?: boolean;
}

export interface ListTemplatesParams extends PaginationParams {
  q?: string;
  slug?: string;
  externalId?: string;
  folder?: string;
  archived?: boolean;
}

// Submission types
export interface SubmissionSubmitter {
  role?: string;
  email: string;
  name?: string;
  phone?: string;
  values?: Record<string, any>;
  externalId?: string;
  completed?: boolean;
  metadata?: Record<string, any>;
  sendEmail?: boolean;
  sendSms?: boolean;
  replyTo?: string;
  completedRedirectUrl?: string;
  requirePhone2fa?: boolean;
  requireEmail2fa?: boolean;
  message?: { subject?: string; body?: string };
  fields?: Record<string, any>[];
}

export interface CreateSubmissionParams {
  templateId: number;
  submitters: SubmissionSubmitter[];
  sendEmail?: boolean;
  sendSms?: boolean;
  order?: string;
  completedRedirectUrl?: string;
  bccCompleted?: string;
  replyTo?: string;
  expireAt?: string;
  variables?: Record<string, any>;
  message?: { subject?: string; body?: string };
}

export interface CreateSubmissionFromPdfParams {
  name?: string;
  documents: Array<{ name: string; file: string; fields?: Record<string, any>[] }>;
  submitters: SubmissionSubmitter[];
  sendEmail?: boolean;
  order?: string;
  fields?: Record<string, any>[];
  message?: { subject?: string; body?: string };
  flatten?: boolean;
  mergeDocuments?: boolean;
  removeTags?: boolean;
}

export interface CreateSubmissionFromHtmlParams {
  documents: Array<{ html: string; name?: string }>;
  submitters: SubmissionSubmitter[];
  name?: string;
  sendEmail?: boolean;
  order?: string;
  fields?: Record<string, any>[];
  mergeDocuments?: boolean;
}

export interface ListSubmissionsParams extends PaginationParams {
  templateId?: number;
  status?: string;
  q?: string;
  slug?: string;
  templateFolder?: string;
  archived?: boolean;
}

// Submitter types
export interface ListSubmittersParams extends PaginationParams {
  submissionId?: number;
  q?: string;
  slug?: string;
  completedAfter?: string;
  completedBefore?: string;
  externalId?: string;
}

export interface UpdateSubmitterParams {
  name?: string;
  email?: string;
  phone?: string;
  values?: Record<string, any>;
  externalId?: string;
  sendEmail?: boolean;
  sendSms?: boolean;
  replyTo?: string;
  completed?: boolean;
  metadata?: Record<string, any>;
  completedRedirectUrl?: string;
  requirePhone2fa?: boolean;
  requireEmail2fa?: boolean;
  message?: { subject?: string; body?: string };
  fields?: Record<string, any>[];
}

// Helper to convert camelCase to snake_case
let toSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

let toSnakeCaseKeys = (obj: Record<string, any>): Record<string, any> => {
  let result: Record<string, any> = {};
  for (let [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    let snakeKey = toSnakeCase(key);
    if (Array.isArray(value)) {
      result[snakeKey] = value.map(item =>
        typeof item === 'object' && item !== null && !Array.isArray(item)
          ? toSnakeCaseKeys(item)
          : item
      );
    } else if (typeof value === 'object' && value !== null) {
      result[snakeKey] = toSnakeCaseKeys(value);
    } else {
      result[snakeKey] = value;
    }
  }
  return result;
};

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    this.axios = createAxios({
      baseURL: config.baseUrl,
      headers: {
        'X-Auth-Token': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // Templates
  async listTemplates(params: ListTemplatesParams = {}): Promise<any> {
    let queryParams = toSnakeCaseKeys(params);
    let response = await this.axios.get('/templates', { params: queryParams });
    return response.data;
  }

  async getTemplate(templateId: number): Promise<any> {
    let response = await this.axios.get(`/templates/${templateId}`);
    return response.data;
  }

  async createTemplatePdf(params: CreateTemplatePdfParams): Promise<any> {
    let body = toSnakeCaseKeys(params);
    let response = await this.axios.post('/templates/pdf', body);
    return response.data;
  }

  async createTemplateDocx(params: CreateTemplateDocxParams): Promise<any> {
    let body = toSnakeCaseKeys(params);
    let response = await this.axios.post('/templates/docx', body);
    return response.data;
  }

  async createTemplateHtml(params: CreateTemplateHtmlParams): Promise<any> {
    let body = toSnakeCaseKeys(params);
    let response = await this.axios.post('/templates/html', body);
    return response.data;
  }

  async cloneTemplate(templateId: number, params: CloneTemplateParams = {}): Promise<any> {
    let body = toSnakeCaseKeys(params);
    let response = await this.axios.post(`/templates/${templateId}/clone`, body);
    return response.data;
  }

  async mergeTemplates(params: MergeTemplatesParams): Promise<any> {
    let body = toSnakeCaseKeys(params);
    let response = await this.axios.post('/templates/merge', body);
    return response.data;
  }

  async updateTemplate(templateId: number, params: UpdateTemplateParams): Promise<any> {
    let body = toSnakeCaseKeys(params);
    let response = await this.axios.put(`/templates/${templateId}`, body);
    return response.data;
  }

  async archiveTemplate(templateId: number): Promise<any> {
    let response = await this.axios.delete(`/templates/${templateId}`);
    return response.data;
  }

  // Submissions
  async listSubmissions(params: ListSubmissionsParams = {}): Promise<any> {
    let queryParams = toSnakeCaseKeys(params);
    let response = await this.axios.get('/submissions', { params: queryParams });
    return response.data;
  }

  async getSubmission(submissionId: number): Promise<any> {
    let response = await this.axios.get(`/submissions/${submissionId}`);
    return response.data;
  }

  async getSubmissionDocuments(submissionId: number, merge?: boolean): Promise<any> {
    let params: Record<string, any> = {};
    if (merge !== undefined) params.merge = merge;
    let response = await this.axios.get(`/submissions/${submissionId}/documents`, { params });
    return response.data;
  }

  async createSubmission(params: CreateSubmissionParams): Promise<any> {
    let body = toSnakeCaseKeys(params);
    let response = await this.axios.post('/submissions', body);
    return response.data;
  }

  async createSubmissionFromPdf(params: CreateSubmissionFromPdfParams): Promise<any> {
    let body = toSnakeCaseKeys(params);
    let response = await this.axios.post('/submissions/pdf', body);
    return response.data;
  }

  async createSubmissionFromHtml(params: CreateSubmissionFromHtmlParams): Promise<any> {
    let body = toSnakeCaseKeys(params);
    let response = await this.axios.post('/submissions/html', body);
    return response.data;
  }

  async archiveSubmission(submissionId: number): Promise<any> {
    let response = await this.axios.delete(`/submissions/${submissionId}`);
    return response.data;
  }

  // Submitters
  async listSubmitters(params: ListSubmittersParams = {}): Promise<any> {
    let queryParams = toSnakeCaseKeys(params);
    let response = await this.axios.get('/submitters', { params: queryParams });
    return response.data;
  }

  async getSubmitter(submitterId: number): Promise<any> {
    let response = await this.axios.get(`/submitters/${submitterId}`);
    return response.data;
  }

  async updateSubmitter(submitterId: number, params: UpdateSubmitterParams): Promise<any> {
    let body = toSnakeCaseKeys(params);
    let response = await this.axios.put(`/submitters/${submitterId}`, body);
    return response.data;
  }
}
