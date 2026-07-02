import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://api.flexisign.io/v1'
});

export class FlexisignClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private get headers() {
    return {
      'api-key': this.token
    };
  }

  async listTemplates(): Promise<FlexisignTemplate[]> {
    let response = await api.get('/templates/all', {
      headers: this.headers
    });
    return response.data;
  }

  async getTemplateDetails(templateId: string): Promise<FlexisignTemplateDetails> {
    let response = await api.get('/template', {
      headers: this.headers,
      params: {
        templateId
      }
    });
    return response.data;
  }

  async sendDocumentFromTemplate(
    body: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await api.post('/template/create-document', body, {
      headers: this.headers
    });
    return response.data;
  }
}

export interface FlexisignTemplate {
  templateId: string;
  templateName: string;
  [key: string]: unknown;
}

export interface FlexisignTemplateDetails {
  templateId: string;
  templateName: string;
  bodyStructure: Record<string, unknown>;
  [key: string]: unknown;
}
