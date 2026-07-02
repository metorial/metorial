import { createAxios } from 'slates';

let BASE_URLS: Record<string, string> = {
  us: 'https://api.feathery.io',
  canada: 'https://api-ca.feathery.io',
  europe: 'https://api-eu.feathery.io',
  australia: 'https://api-au.feathery.io'
};

export class FeatheryClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(params: { token: string; region?: string }) {
    let baseURL = BASE_URLS[params.region || 'us'] || BASE_URLS.us;
    this.axios = createAxios({
      baseURL,
      headers: {
        Authorization: `Token ${params.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Account ----

  async getAccount(): Promise<any> {
    let response = await this.axios.get('/api/account/');
    return response.data;
  }

  async inviteTeamMember(params: {
    email: string;
    role: string;
    permissions?: Record<string, boolean>;
    userGroups?: string[];
  }): Promise<any> {
    let response = await this.axios.post('/api/account/invite/', {
      email: params.email,
      role: params.role,
      ...params.permissions,
      user_groups: params.userGroups
    });
    return response.data;
  }

  async removeTeamMember(email: string): Promise<any> {
    let response = await this.axios.patch('/api/account/uninvite/', { email });
    return response.data;
  }

  // ---- Forms ----

  async listForms(params?: { tags?: string; active?: boolean }): Promise<any[]> {
    let response = await this.axios.get('/api/form/', { params });
    return response.data;
  }

  async getForm(formId: string): Promise<any> {
    let response = await this.axios.get(`/api/form/${formId}/`);
    return response.data;
  }

  async createForm(params: {
    formName: string;
    templateFormId?: string;
    steps?: any[];
    navigationRules?: any[];
    logicRules?: any[];
  }): Promise<any> {
    let response = await this.axios.post('/api/form/', {
      form_name: params.formName,
      template_form_id: params.templateFormId,
      steps: params.steps,
      navigation_rules: params.navigationRules,
      logic_rules: params.logicRules
    });
    return response.data;
  }

  async updateForm(
    formId: string,
    params: {
      enabled?: boolean;
      formName?: string;
      translations?: any;
      integrations?: any[];
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (params.enabled !== undefined) body.enabled = params.enabled;
    if (params.formName !== undefined) body.form_name = params.formName;
    if (params.translations !== undefined) body.translations = params.translations;
    if (params.integrations !== undefined) body.integrations = params.integrations;

    let response = await this.axios.patch(`/api/form/${formId}/`, body);
    return response.data;
  }

  async deleteForm(formId: string): Promise<void> {
    await this.axios.delete(`/api/form/${formId}/`, {
      data: { confirm_delete: true }
    });
  }

  async copyForm(params: { formName: string; copyFormId: string }): Promise<any> {
    let response = await this.axios.post('/api/form/copy/', {
      form_name: params.formName,
      copy_form_id: params.copyFormId
    });
    return response.data;
  }

  // ---- Submissions ----

  async listSubmissions(params: {
    formId: string;
    startTime?: string;
    endTime?: string;
    createdAfter?: string;
    createdBefore?: string;
    completed?: boolean;
    fieldSearch?: Record<string, string>;
    fuzzySearch?: any;
    fields?: string[];
    noFieldValues?: boolean;
    sort?: string;
    pageSize?: number;
    count?: boolean;
  }): Promise<any> {
    let queryParams: Record<string, any> = {
      form_id: params.formId
    };
    if (params.startTime) queryParams.start_time = params.startTime;
    if (params.endTime) queryParams.end_time = params.endTime;
    if (params.createdAfter) queryParams.created_after = params.createdAfter;
    if (params.createdBefore) queryParams.created_before = params.createdBefore;
    if (params.completed !== undefined) queryParams.completed = params.completed;
    if (params.fieldSearch) queryParams.field_search = JSON.stringify(params.fieldSearch);
    if (params.fuzzySearch) queryParams.fuzzy_search = JSON.stringify(params.fuzzySearch);
    if (params.fields) queryParams.fields = params.fields.join(',');
    if (params.noFieldValues) queryParams.no_field_values = params.noFieldValues;
    if (params.sort) queryParams.sort = params.sort;
    if (params.pageSize) queryParams.page_size = params.pageSize;
    if (params.count) queryParams.count = params.count;

    let response = await this.axios.get('/api/form/submission/', { params: queryParams });
    return response.data;
  }

  async createOrUpdateSubmission(params: {
    userId: string;
    forms: string[];
    fields: Record<string, any>;
    complete?: boolean;
    documents?: Array<{ id: string; outputLocation?: string }>;
  }): Promise<any> {
    let body: Record<string, any> = {
      user_id: params.userId,
      forms: params.forms,
      fields: params.fields
    };
    if (params.complete !== undefined) body.complete = params.complete;
    if (params.documents) {
      body.documents = params.documents.map(d => ({
        id: d.id,
        output_location: d.outputLocation
      }));
    }

    let response = await this.axios.post('/api/form/submission/', body);
    return response.data;
  }

  async exportSubmissionPdf(params: { formId: string; userId: string }): Promise<any> {
    let response = await this.axios.post('/api/form/submission/pdf/', {
      form_id: params.formId,
      user_id: params.userId
    });
    return response.data;
  }

  // ---- Users ----

  async listUsers(params?: {
    createdAfter?: string;
    createdBefore?: string;
    filterFieldId?: string;
    filterFieldValue?: string;
  }): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.createdAfter) queryParams.created_after = params.createdAfter;
    if (params?.createdBefore) queryParams.created_before = params.createdBefore;
    if (params?.filterFieldId) queryParams.filter_field_id = params.filterFieldId;
    if (params?.filterFieldValue) queryParams.filter_field_value = params.filterFieldValue;

    let response = await this.axios.get('/api/user/', { params: queryParams });
    return response.data;
  }

  async createUser(userId: string): Promise<any> {
    let response = await this.axios.post('/api/user/', { id: userId });
    return response.data;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.axios.delete(`/api/user/${userId}/`);
  }

  async getUserSession(userId: string): Promise<any> {
    let response = await this.axios.get(`/api/user/${userId}/session/`);
    return response.data;
  }

  async getUserFields(userId: string): Promise<any> {
    let response = await this.axios.get('/api/field/', { params: { id: userId } });
    return response.data;
  }

  // ---- Hidden Fields ----

  async listHiddenFields(): Promise<any[]> {
    let response = await this.axios.get('/api/form/hidden_field/');
    return response.data;
  }

  async createHiddenField(fieldId: string): Promise<any> {
    let response = await this.axios.post('/api/form/hidden_field/', { field_id: fieldId });
    return response.data;
  }

  // ---- Document Intelligence (AI Extraction) ----

  async submitExtraction(
    extractionId: string,
    files: Array<{ name: string; content: string }>
  ): Promise<any> {
    // For AI extraction, we need to send multipart form data
    let formData = new FormData();
    for (let file of files) {
      let blob = new Blob([Buffer.from(file.content, 'base64')], {
        type: 'application/octet-stream'
      });
      formData.append('files', blob, file.name);
    }

    let response = await this.axios.post(`/api/ai/run/${extractionId}/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  async listExtractionRuns(
    extractionId: string,
    params?: {
      startTime?: string;
      endTime?: string;
      userId?: string;
    }
  ): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.startTime) queryParams.start_time = params.startTime;
    if (params?.endTime) queryParams.end_time = params.endTime;
    if (params?.userId) queryParams.user_id = params.userId;

    let response = await this.axios.get(`/api/ai/run/batch/${extractionId}/`, {
      params: queryParams
    });
    return response.data;
  }

  // ---- Document Templates ----

  async listDocumentTemplates(params?: { name?: string; tags?: string }): Promise<any[]> {
    let queryParams: Record<string, any> = {};
    if (params?.name) queryParams.name = params.name;
    if (params?.tags) queryParams.tags = params.tags;

    let response = await this.axios.get('/api/document/template/', { params: queryParams });
    return response.data;
  }

  async fillDocument(params: {
    documentId: string;
    fieldValues: Record<string, any>;
    signerEmail?: string;
    userId?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      document: params.documentId,
      field_values: params.fieldValues
    };
    if (params.signerEmail) body.signer_email = params.signerEmail;
    if (params.userId) body.user_id = params.userId;

    let response = await this.axios.post('/api/document/fill/', body);
    return response.data;
  }

  async listDocumentEnvelopes(params: {
    type: 'document' | 'user';
    id: string;
  }): Promise<any[]> {
    let response = await this.axios.get('/api/document/envelope/', {
      params: { type: params.type, id: params.id }
    });
    return response.data;
  }

  async deleteDocumentEnvelope(envelopeId: string): Promise<void> {
    await this.axios.delete(`/api/document/envelope/${envelopeId}/`);
  }

  // ---- Workspaces ----

  async listWorkspaces(submissionData?: boolean): Promise<any[]> {
    let params: Record<string, any> = {};
    if (submissionData !== undefined) params.submission_data = submissionData;

    let response = await this.axios.get('/api/workspace/', { params });
    return response.data;
  }

  async getWorkspace(workspaceId: string): Promise<any> {
    let response = await this.axios.get(`/api/workspace/${workspaceId}/`);
    return response.data;
  }

  async createWorkspace(params: {
    name: string;
    logo?: string;
    brandUrl?: string;
    brandFavicon?: string;
    brandName?: string;
    colors?: Record<string, string>;
    features?: Record<string, any>;
    disabledTabs?: string[];
    disabledSettings?: string[];
    disabledElements?: string[];
    enabledIntegrations?: string[];
    metadata?: Record<string, any>;
  }): Promise<any> {
    let body: Record<string, any> = { name: params.name };
    if (params.logo) body.logo = params.logo;
    if (params.brandUrl) body.brand_url = params.brandUrl;
    if (params.brandFavicon) body.brand_favicon = params.brandFavicon;
    if (params.brandName) body.brand_name = params.brandName;
    if (params.colors) body.colors = params.colors;
    if (params.features) body.features = params.features;
    if (params.disabledTabs) body.disabled_tabs = params.disabledTabs;
    if (params.disabledSettings) body.disabled_settings = params.disabledSettings;
    if (params.disabledElements) body.disabled_elements = params.disabledElements;
    if (params.enabledIntegrations) body.enabled_integrations = params.enabledIntegrations;
    if (params.metadata) body.metadata = params.metadata;

    let response = await this.axios.post('/api/workspace/', body);
    return response.data;
  }

  async updateWorkspace(
    workspaceId: string,
    params: {
      name?: string;
      logo?: string;
      brandUrl?: string;
      brandFavicon?: string;
      brandName?: string;
      colors?: Record<string, string>;
      features?: Record<string, any>;
      disabledTabs?: string[];
      disabledSettings?: string[];
      disabledElements?: string[];
      enabledIntegrations?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.logo !== undefined) body.logo = params.logo;
    if (params.brandUrl !== undefined) body.brand_url = params.brandUrl;
    if (params.brandFavicon !== undefined) body.brand_favicon = params.brandFavicon;
    if (params.brandName !== undefined) body.brand_name = params.brandName;
    if (params.colors !== undefined) body.colors = params.colors;
    if (params.features !== undefined) body.features = params.features;
    if (params.disabledTabs !== undefined) body.disabled_tabs = params.disabledTabs;
    if (params.disabledSettings !== undefined)
      body.disabled_settings = params.disabledSettings;
    if (params.disabledElements !== undefined)
      body.disabled_elements = params.disabledElements;
    if (params.enabledIntegrations !== undefined)
      body.enabled_integrations = params.enabledIntegrations;
    if (params.metadata !== undefined) body.metadata = params.metadata;

    let response = await this.axios.patch(`/api/workspace/${workspaceId}/`, body);
    return response.data;
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.axios.delete(`/api/workspace/${workspaceId}/`);
  }

  async generateWorkspaceLoginToken(workspaceId: string): Promise<any> {
    let response = await this.axios.post(`/api/workspace/${workspaceId}/login_token/`);
    return response.data;
  }

  async populateWorkspaceTemplate(workspaceId: string, templateFormId: string): Promise<any> {
    let response = await this.axios.post(`/api/workspace/${workspaceId}/populate_template/`, {
      template_form_id: templateFormId
    });
    return response.data;
  }

  // ---- Logs ----

  async getApiConnectorLogs(
    formId: string,
    params?: { startTime?: string; endTime?: string }
  ): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.startTime) queryParams.start_time = params.startTime;
    if (params?.endTime) queryParams.end_time = params.endTime;

    let response = await this.axios.get(`/api/logs/api-connector/${formId}/`, {
      params: queryParams
    });
    return response.data;
  }

  async getFormEmailLogs(
    formId: string,
    params?: { startTime?: string; endTime?: string }
  ): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.startTime) queryParams.start_time = params.startTime;
    if (params?.endTime) queryParams.end_time = params.endTime;

    let response = await this.axios.get(`/api/logs/email/form/${formId}/`, {
      params: queryParams
    });
    return response.data;
  }

  async getEmailIssueLogs(params?: { eventType?: string }): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.eventType) queryParams.event_type = params.eventType;

    let response = await this.axios.get('/api/logs/email/issues/', { params: queryParams });
    return response.data;
  }
}
