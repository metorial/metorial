import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.imagior.com'
});

export class Client {
  private headers: Record<string, string>;

  constructor(private config: { token: string }) {
    this.headers = {
      Authorization: `Bearer ${this.config.token}`,
      'Content-Type': 'application/json'
    };
  }

  async generateImage(templateId: string, elements?: Record<string, any>) {
    let body: Record<string, any> = { templateId };
    if (elements) {
      body.elements = elements;
    }

    let response = await http.post('/image/generate', body, {
      headers: this.headers
    });

    return response.data;
  }

  async listTemplates(options?: { sort?: string; order?: string }) {
    let params: Record<string, string> = {};
    if (options?.sort) {
      params.sort = options.sort;
    }
    if (options?.order) {
      params.order = options.order;
    }

    let response = await http.get('/templates/all', {
      headers: this.headers,
      params
    });

    return response.data;
  }

  async getTemplateElements(templateId: string) {
    let response = await http.get(`/templates/${templateId}/elements`, {
      headers: this.headers
    });

    return response.data;
  }

  async getTemplateElementsBasic(templateId: string) {
    let response = await http.get(`/templates/${templateId}/elements/basic`, {
      headers: this.headers
    });

    return response.data;
  }

  async getAccount() {
    let response = await http.get('/user/account', {
      headers: this.headers
    });

    return response.data;
  }
}
