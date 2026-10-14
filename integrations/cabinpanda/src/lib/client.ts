import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export class CabinPandaClient {
  private http;

  constructor(config: { token: string }) {
    if (typeof config.token !== 'string' || !config.token.trim()) {
      throw createApiServiceError('A CabinPanda API token is required.', {
        reason: 'cabinpanda_missing_token'
      });
    }

    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.cabinpanda.com/api/v1',
      authHeader: { value: `Bearer ${config.token}` },
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'CabinPanda',
          reason: 'cabinpanda_api_error'
        })
    });
  }

  private getPathId(value: string, label: string) {
    if (typeof value !== 'string' || !value.trim()) {
      throw createApiServiceError(`${label} must not be empty.`, {
        reason: 'cabinpanda_invalid_id'
      });
    }
    return encodeURIComponent(value);
  }

  private getList(data: any, label: string): any[] {
    let items = data?.data ?? data;
    if (!Array.isArray(items)) {
      throw createApiServiceError(`CabinPanda returned an unexpected ${label} response.`, {
        reason: 'cabinpanda_invalid_response'
      });
    }
    return items;
  }

  // Profile

  async getProfile(): Promise<any> {
    let response = await this.http.get('/profile');
    let profile = response.data?.data ?? response.data;
    if (
      !profile ||
      typeof profile !== 'object' ||
      Array.isArray(profile) ||
      (profile.id == null && profile.name == null && profile.email == null)
    ) {
      throw createApiServiceError('CabinPanda returned an unexpected profile response.', {
        reason: 'cabinpanda_invalid_response'
      });
    }
    return profile;
  }

  // Forms

  async listForms(): Promise<any[]> {
    let response = await this.http.get('/forms');
    return this.getList(response.data, 'forms');
  }

  async getForm(formId: string): Promise<any> {
    let response = await this.http.get(`/forms/${this.getPathId(formId, 'Form ID')}`);
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

    let response = await this.http.put(`/forms/${this.getPathId(formId, 'Form ID')}`, body);
    return response.data?.data ?? response.data;
  }

  async deleteForm(formId: string): Promise<any> {
    let response = await this.http.delete(`/forms/${this.getPathId(formId, 'Form ID')}`);
    return response.data?.data ?? response.data;
  }

  // Submissions

  async listSubmissions(formId: string): Promise<any[]> {
    let response = await this.http.get(
      `/forms/${this.getPathId(formId, 'Form ID')}/submissions`
    );
    return this.getList(response.data, 'submissions');
  }

  // Integrations

  async listIntegrations(): Promise<any[]> {
    let response = await this.http.get('/integrations');
    return this.getList(response.data, 'integrations');
  }

  async getIntegration(integrationId: string): Promise<any> {
    let response = await this.http.get(
      `/integrations/${this.getPathId(integrationId, 'Integration ID')}`
    );
    return response.data?.data ?? response.data;
  }

  async deleteIntegration(integrationId: string): Promise<any> {
    let response = await this.http.delete(
      `/integrations/${this.getPathId(integrationId, 'Integration ID')}`
    );
    return response.data?.data ?? response.data;
  }

  // Users

  async listUsers(): Promise<any[]> {
    let response = await this.http.get('/users');
    return this.getList(response.data, 'users');
  }
}
