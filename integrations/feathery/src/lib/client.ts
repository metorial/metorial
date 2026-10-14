import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

let BASE_URLS: Record<string, string> = {
  us: 'https://api.feathery.io',
  canada: 'https://api-ca.feathery.io',
  europe: 'https://api-eu.feathery.io',
  australia: 'https://api-au.feathery.io'
};

export class FeatheryClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(params: { token: string; region?: string }) {
    let baseURL = BASE_URLS[params.region || 'us'];
    if (!baseURL) throw createApiServiceError('Choose a supported Feathery account region.');
    this.axios = createAuthenticatedAxios({
      baseURL,
      authHeader: { value: `Token ${params.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Feathery',
          reason: 'Feathery API request failed'
        })
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
    let response = await this.axios.post('/api/account/invite/', [
      {
        email: params.email,
        role: params.role,
        ...params.permissions,
        user_groups: params.userGroups
      }
    ]);
    return response.data;
  }

  async removeTeamMember(email: string): Promise<any> {
    let response = await this.axios.patch('/api/account/uninvite/', [{ email }]);
    return response.data;
  }

  // ---- Forms ----

  async listForms(params?: { tags?: string; active?: boolean }): Promise<any[]> {
    let response = await this.axios.get('/api/form/', { params });
    return response.data;
  }

  async getForm(formId: string): Promise<any> {
    let response = await this.axios.get(`/api/form/${encodeURIComponent(formId)}/`);
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

    let response = await this.axios.patch(`/api/form/${encodeURIComponent(formId)}/`, body);
    return response.data;
  }

  async deleteForm(formId: string): Promise<void> {
    await this.axios.delete(`/api/form/${encodeURIComponent(formId)}/`, {
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
    count?: number;
    pageUrl?: string;
  }): Promise<any> {
    let queryParams: Record<string, any> = {
      form_id: params.formId
    };
    if (params.startTime) queryParams.start_time = params.startTime;
    if (params.endTime) queryParams.end_time = params.endTime;
    if (params.createdAfter) queryParams.created_after = params.createdAfter;
    if (params.createdBefore) queryParams.created_before = params.createdBefore;
    if (params.completed !== undefined) queryParams.completed = params.completed;
    if (params.fieldSearch)
      queryParams.field_search = JSON.stringify(
        Object.entries(params.fieldSearch).map(([field_id, value]) => ({ field_id, value }))
      );
    if (params.fuzzySearch) queryParams.fuzzy_search = JSON.stringify(params.fuzzySearch);
    if (params.fields) queryParams.fields = params.fields.join(',');
    if (params.noFieldValues) queryParams.no_field_values = params.noFieldValues;
    if (params.sort) queryParams.sort = params.sort;
    if (params.pageSize !== undefined) queryParams.page_size = params.pageSize;
    if (params.count !== undefined) queryParams.count = params.count;

    if (params.pageUrl) {
      let page: URL;
      try {
        page = new URL(params.pageUrl);
      } catch {
        throw createApiServiceError('Use the nextPageUrl returned by list_submissions.');
      }
      if (
        page.origin !== this.axios.defaults.baseURL ||
        page.pathname !== '/api/form/submission/' ||
        page.searchParams.get('form_id') !== params.formId
      ) {
        throw createApiServiceError(
          'The submission page must belong to this Feathery region and form. Use nextPageUrl returned by list_submissions.'
        );
      }
      let response = await this.axios.get(`${page.pathname}${page.search}`);
      return response.data;
    }
    let response = await this.axios.get('/api/form/submission/', { params: queryParams });
    return response.data;
  }

  async createOrUpdateSubmission(params: {
    userId: string;
    forms: string[];
    fields: Record<string, any>;
    complete?: boolean;
    documents?: Array<{ id: string; outputLocation?: { sheet: string; cell: string } }>;
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

  async waitForSubmissionPdf(url: string): Promise<void> {
    for (let attempt = 0; attempt < 5; attempt++) {
      let response: Response;
      try {
        response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
        await response.body?.cancel();
      } catch (error) {
        throw buildApiServiceError(error, {
          providerLabel: 'Feathery',
          reason: 'Could not check submission PDF availability'
        });
      }
      if (response.status === 200) return;
      if (response.status !== 404 && response.status !== 202) {
        throw buildApiServiceError(
          { response: { status: response.status } },
          { providerLabel: 'Feathery', reason: 'Submission PDF download failed' }
        );
      }
      if (attempt < 4) await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw createApiServiceError(
      'Feathery is still preparing the submission PDF. Retry the export shortly.'
    );
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
    await this.axios.delete(`/api/user/${encodeURIComponent(userId)}/`);
  }

  async getUserSession(userId: string): Promise<any> {
    let response = await this.axios.get(`/api/user/${encodeURIComponent(userId)}/session/`);
    return response.data;
  }

  async getUserFields(userId: string): Promise<any> {
    let response = await this.axios.get('/api/field/', { params: { id: userId } });
    return response.data;
  }

  // ---- Hidden Fields ----

  async listHiddenFields(): Promise<any[]> {
    let response = await this.axios.get('/api/field/hidden/');
    return response.data;
  }

  async createHiddenField(fieldId: string): Promise<any> {
    let response = await this.axios.post('/api/field/hidden/', {
      id: fieldId,
      type: 'json_value',
      server_side: false
    });
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

    let response = await this.axios.post(
      `/api/ai/run/${encodeURIComponent(extractionId)}/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
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

    let response = await this.axios.get(
      `/api/ai/run/batch/${encodeURIComponent(extractionId)}/`,
      {
        params: queryParams
      }
    );
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
    await this.axios.delete(`/api/document/envelope/${encodeURIComponent(envelopeId)}/`);
  }

  // ---- Workspaces ----

  async listWorkspaces(submissionData?: boolean): Promise<any[]> {
    let params: Record<string, any> = {};
    if (submissionData !== undefined) params.submission_data = submissionData;

    let response = await this.axios.get('/api/workspace/', { params });
    return response.data;
  }

  async getWorkspace(workspaceId: string): Promise<any> {
    let response = await this.axios.get(`/api/workspace/${encodeURIComponent(workspaceId)}/`);
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
    if (params.colors) {
      if (Object.keys(params.colors).some(key => key !== 'primary' && key !== 'secondary')) {
        throw createApiServiceError(
          'Workspace colors supports only primary and secondary color keys.'
        );
      }
      body.brand_primary_color = params.colors.primary;
      body.brand_secondary_color = params.colors.secondary;
    }
    if (params.features) body.features = params.features;
    if (params.disabledTabs) {
      let globalTabs = ['themes', 'ab_tests', 'all_users'];
      let formTabs = ['flow', 'integrations', 'results', 'settings'];
      if (
        params.disabledTabs.some(tab => !globalTabs.includes(tab) && !formTabs.includes(tab))
      )
        throw createApiServiceError(
          'Workspace disabledTabs must contain supported global or form editor tabs.'
        );
      body.disabled_global_tabs = params.disabledTabs.filter(tab => globalTabs.includes(tab));
      body.disabled_form_tabs = params.disabledTabs.filter(tab => formTabs.includes(tab));
    }
    if (params.disabledSettings) body.disabled_form_settings = params.disabledSettings;
    if (params.disabledElements) body.disabled_form_elements = params.disabledElements;
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
    if (params.colors !== undefined) {
      if (Object.keys(params.colors).some(key => key !== 'primary' && key !== 'secondary'))
        throw createApiServiceError(
          'Workspace colors supports only primary and secondary color keys.'
        );
      body.brand_primary_color = params.colors.primary;
      body.brand_secondary_color = params.colors.secondary;
    }
    if (params.features !== undefined) body.features = params.features;
    if (params.disabledTabs !== undefined) {
      let globalTabs = ['themes', 'ab_tests', 'all_users'];
      let formTabs = ['flow', 'integrations', 'results', 'settings'];
      if (
        params.disabledTabs.some(tab => !globalTabs.includes(tab) && !formTabs.includes(tab))
      )
        throw createApiServiceError(
          'Workspace disabledTabs must contain supported global or form editor tabs.'
        );
      body.disabled_global_tabs = params.disabledTabs.filter(tab => globalTabs.includes(tab));
      body.disabled_form_tabs = params.disabledTabs.filter(tab => formTabs.includes(tab));
    }
    if (params.disabledSettings !== undefined)
      body.disabled_form_settings = params.disabledSettings;
    if (params.disabledElements !== undefined)
      body.disabled_form_elements = params.disabledElements;
    if (params.enabledIntegrations !== undefined)
      body.enabled_integrations = params.enabledIntegrations;
    if (params.metadata !== undefined) body.metadata = params.metadata;

    let response = await this.axios.patch(
      `/api/workspace/${encodeURIComponent(workspaceId)}/`,
      body
    );
    return response.data;
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.axios.delete(`/api/workspace/${encodeURIComponent(workspaceId)}/`);
  }

  async generateWorkspaceLoginToken(workspaceId: string): Promise<any> {
    let response = await this.axios.post(
      `/api/workspace/${encodeURIComponent(workspaceId)}/login_token/`
    );
    return response.data;
  }

  async populateWorkspaceTemplate(workspaceId: string, templateFormId: string): Promise<any> {
    let response = await this.axios.post(
      `/api/workspace/${encodeURIComponent(workspaceId)}/populate_template/`,
      {
        template_form_id: templateFormId
      }
    );
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

    let response = await this.axios.get(
      `/api/logs/api-connector/${encodeURIComponent(formId)}/`,
      {
        params: queryParams
      }
    );
    return response.data;
  }

  async getFormEmailLogs(
    formId: string,
    params?: { startTime?: string; endTime?: string }
  ): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.startTime) queryParams.start_time = params.startTime;
    if (params?.endTime) queryParams.end_time = params.endTime;

    let response = await this.axios.get(
      `/api/logs/email/form/${encodeURIComponent(formId)}/`,
      {
        params: queryParams
      }
    );
    return response.data;
  }

  async getEmailIssueLogs(params?: { eventType?: string }): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.eventType) queryParams.event_type = params.eventType;

    let response = await this.axios.get('/api/logs/email/issues/', { params: queryParams });
    return response.data;
  }
}
