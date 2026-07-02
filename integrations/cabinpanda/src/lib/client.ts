import { createAxios } from 'slates';

export class CabinPandaClient {
  private http;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://api.cabinpanda.com/api/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  // Profile

  async getProfile(): Promise<any> {
    let response = await this.http.get('/profile');
    return response.data?.data ?? response.data;
  }

  // Forms

  async listForms(): Promise<any[]> {
    let response = await this.http.get('/forms');
    return response.data?.data ?? response.data ?? [];
  }

  async getForm(formId: string): Promise<any> {
    let response = await this.http.get(`/forms/${formId}`);
    return response.data?.data ?? response.data;
  }

  async createForm(params: {
    name: string;
    typeId?: string;
    templateId?: string;
    fields?: any[];
    settings?: Record<string, any>;
  }): Promise<any> {
    let body: Record<string, any> = {
      name: params.name
    };

    if (params.typeId) body.type_id = params.typeId;
    if (params.templateId) body.template_id = params.templateId;
    if (params.fields) body.fields = params.fields;
    if (params.settings) body.settings = params.settings;

    let response = await this.http.post('/forms', body);
    return response.data?.data ?? response.data;
  }

  async updateForm(
    formId: string,
    params: {
      name?: string;
      typeId?: string;
      templateId?: string;
      fields?: any[];
      settings?: Record<string, any>;
      receivers?: string[];
      showErrors?: boolean;
      successMessage?: string;
      submitButtonLabel?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};

    if (params.name !== undefined) body.name = params.name;
    if (params.typeId !== undefined) body.type_id = params.typeId;
    if (params.templateId !== undefined) body.template_id = params.templateId;
    if (params.fields !== undefined) body.fields = params.fields;
    if (params.settings !== undefined) body.settings = params.settings;
    if (params.receivers !== undefined) body.receivers = params.receivers;
    if (params.showErrors !== undefined) body.show_errors = params.showErrors;
    if (params.successMessage !== undefined) body.success_message = params.successMessage;
    if (params.submitButtonLabel !== undefined)
      body.submit_button_label = params.submitButtonLabel;

    let response = await this.http.put(`/forms/${formId}`, body);
    return response.data?.data ?? response.data;
  }

  async deleteForm(formId: string): Promise<any> {
    let response = await this.http.delete(`/forms/${formId}`);
    return response.data?.data ?? response.data;
  }

  // Submissions

  async listSubmissions(formId: string): Promise<any[]> {
    let response = await this.http.get(`/forms/${formId}/submissions`);
    return response.data?.data ?? response.data ?? [];
  }

  // Integrations

  async listIntegrations(): Promise<any[]> {
    let response = await this.http.get('/integrations');
    return response.data?.data ?? response.data ?? [];
  }

  async getIntegration(integrationId: string): Promise<any> {
    let response = await this.http.get(`/integrations/${integrationId}`);
    return response.data?.data ?? response.data;
  }

  async deleteIntegration(integrationId: string): Promise<any> {
    let response = await this.http.delete(`/integrations/${integrationId}`);
    return response.data?.data ?? response.data;
  }

  // Users

  async listUsers(): Promise<any[]> {
    let response = await this.http.get('/users');
    return response.data?.data ?? response.data ?? [];
  }
}
