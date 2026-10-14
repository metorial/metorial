import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export class FlexisignClient {
  private api: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Provide a FlexiSign API key to connect your account.');
    }

    this.api = createAuthenticatedAxios({
      baseURL: 'https://api.flexisign.io/v1',
      authHeader: { name: 'api-key', value: config.token.trim() },
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'FlexiSign',
          reason: 'flexisign_api_error'
        })
    });
  }

  async listTemplates(): Promise<FlexisignTemplate[]> {
    let response = await this.api.get<unknown>('/templates/all');
    let data = response.data;
    let templates =
      isApiErrorRecord(data) && isApiErrorRecord(data.data) ? data.data.list : data;

    if (!Array.isArray(templates)) {
      throw createApiServiceError('FlexiSign returned an invalid template list.');
    }

    return templates.map(normalizeTemplate);
  }

  async getTemplateDetails(templateId: string): Promise<FlexisignTemplateDetails> {
    if (!templateId.trim()) {
      throw createApiServiceError('Provide a template ID from list_templates.');
    }

    let response = await this.api.get<unknown>('/template', {
      params: {
        templateId
      }
    });
    let data = response.data;
    let template =
      isApiErrorRecord(data) && isApiErrorRecord(data.data) ? data.data.template : data;

    if (!isApiErrorRecord(template) || !isApiErrorRecord(template.bodyStructure)) {
      throw createApiServiceError('FlexiSign returned an invalid template body structure.');
    }

    let recipients = template.recipients;
    if (
      recipients !== undefined &&
      recipients !== null &&
      (!Array.isArray(recipients) || !recipients.every(isApiErrorRecord))
    ) {
      throw createApiServiceError('FlexiSign returned invalid template recipient details.');
    }

    return {
      ...normalizeTemplate(template),
      bodyStructure: template.bodyStructure,
      recipients: Array.isArray(recipients) ? recipients : undefined
    };
  }

  async sendDocumentFromTemplate(
    body: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.api.post<unknown>('/template/create-document', body);
    if (!isApiErrorRecord(response.data)) {
      throw createApiServiceError('FlexiSign returned an invalid document creation response.');
    }
    return response.data;
  }
}

let normalizeTemplate = (value: unknown): FlexisignTemplate => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError('FlexiSign returned invalid template details.');
  }

  let templateId = value._id ?? value.templateId;
  let templateName = value.name ?? value.templateName;
  if (typeof templateId !== 'string' || typeof templateName !== 'string') {
    throw createApiServiceError('FlexiSign returned a template without an ID or name.');
  }

  return { ...value, templateId, templateName };
};

export interface FlexisignTemplate {
  templateId: string;
  templateName: string;
  [key: string]: unknown;
}

export interface FlexisignTemplateDetails {
  templateId: string;
  templateName: string;
  bodyStructure: Record<string, unknown>;
  recipients?: Record<string, unknown>[];
  [key: string]: unknown;
}
