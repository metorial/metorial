import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://pdf-api.io/api'
});

export interface TemplateVariable {
  name: string;
  type: string;
}

export interface TemplateMeta {
  description?: string;
  [key: string]: unknown;
}

export interface Template {
  id: string;
  name: string;
  type: string;
  created_at: string;
  meta: TemplateMeta;
  variables: TemplateVariable[];
  team_name?: string;
  team_id?: string;
}

export interface MergeTemplateEntry {
  id: string;
  data: Record<string, unknown>;
}

export interface JsonPdfResponse {
  status: number;
  data: string;
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers(extra?: Record<string, string>) {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      ...extra
    };
  }

  async listTemplates(): Promise<Template[]> {
    let response = await http.get('/templates', {
      headers: this.headers()
    });
    return response.data;
  }

  async getTemplate(templateId: string): Promise<Template> {
    let response = await http.get(`/templates/${templateId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async generatePdf(
    templateId: string,
    data: Record<string, unknown>,
    options?: { output?: 'pdf' | 'url' }
  ): Promise<{ base64?: string; url?: string }> {
    let body: Record<string, unknown> = { data };
    if (options?.output === 'url') {
      body.output = 'url';
    }

    let response = await http.post<JsonPdfResponse>(`/templates/${templateId}/pdf`, body, {
      headers: this.headers({
        Accept: 'application/json'
      })
    });

    if (options?.output === 'url') {
      return { url: response.data.data };
    }

    return { base64: response.data.data };
  }

  async mergeTemplates(
    templates: MergeTemplateEntry[],
    options?: { output?: 'pdf' | 'url' }
  ): Promise<{ base64?: string; url?: string }> {
    let body: Record<string, unknown> = { templates };
    if (options?.output === 'url') {
      body.output = 'url';
    }

    let response = await http.post<JsonPdfResponse>('/templates/merge', body, {
      headers: this.headers({
        Accept: 'application/json'
      })
    });

    if (options?.output === 'url') {
      return { url: response.data.data };
    }

    return { base64: response.data.data };
  }
}
