import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface ClientConfig {
  token: string;
  baseUrl: string;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: ClientConfig) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A SwaggerHub API key is required. Reconnect with an API key.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: config.baseUrl,
      authHeader: { value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'SwaggerHub',
          reason: 'swaggerhub_api_error'
        })
    });
  }

  // ─── Search ───────────────────────────────────────────

  async searchApisAndDomains(params: {
    query?: string;
    specType?: 'API' | 'DOMAIN' | 'ANY';
    visibility?: 'PUBLIC' | 'PRIVATE' | 'ANY';
    state?: 'ALL' | 'PUBLISHED' | 'UNPUBLISHED';
    owner?: string;
    page?: number;
    limit?: number;
    sort?: 'NAME' | 'UPDATED' | 'CREATED' | 'OWNER' | 'BEST_MATCH' | 'TITLE';
    order?: 'ASC' | 'DESC';
  }) {
    let response = await this.axios.get('/specs', { params });
    return response.data;
  }

  // ─── APIs ─────────────────────────────────────────────

  async getOwnerApis(
    owner: string,
    params?: {
      page?: number;
      limit?: number;
      sort?: 'NAME' | 'UPDATED' | 'CREATED' | 'OWNER';
      order?: 'ASC' | 'DESC';
    }
  ) {
    let response = await this.axios.get(`/apis/${encodeURIComponent(owner)}`, { params });
    return response.data;
  }

  async getApiVersions(owner: string, api: string) {
    let response = await this.axios.get(
      `/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}`
    );
    return response.data;
  }

  async getApiDefinition(
    owner: string,
    api: string,
    version: string,
    params?: {
      resolved?: boolean;
      flatten?: boolean;
    }
  ) {
    let response = await this.axios.get(
      `/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}/${encodeURIComponent(version)}`,
      {
        params,
        headers: { Accept: 'application/json' }
      }
    );
    return response.data;
  }

  async getApiDefinitionYaml(
    owner: string,
    api: string,
    version: string,
    params?: { resolved?: boolean; flatten?: boolean }
  ) {
    let response = await this.axios.get(
      `/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}/${encodeURIComponent(version)}/swagger.yaml`,
      {
        headers: { Accept: 'application/yaml' },
        params,
        responseType: 'text'
      }
    );
    return response.data;
  }

  async saveApiDefinition(
    owner: string,
    api: string,
    params: {
      definition: string;
      version?: string;
      isPrivate?: boolean;
      oas?: string;
      force?: boolean;
    }
  ) {
    let response = await this.axios.post(
      `/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}`,
      params.definition,
      {
        headers: { 'Content-Type': 'application/yaml' },
        params: {
          version: params.version,
          isPrivate: params.isPrivate,
          oas: params.oas,
          force: params.force
        }
      }
    );
    return response.data;
  }

  async deleteApi(owner: string, api: string) {
    let response = await this.axios.delete(
      `/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}`
    );
    return response.data;
  }

  async deleteApiVersion(owner: string, api: string, version: string) {
    let response = await this.axios.delete(
      `/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}/${encodeURIComponent(version)}`
    );
    return response.data;
  }

  async renameApi(owner: string, api: string, newName: string) {
    let response = await this.axios.post(
      `/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}/rename`,
      undefined,
      { params: { newName } }
    );
    return response.data;
  }

  // ─── API Settings ─────────────────────────────────────

  async getApiDefaultVersion(owner: string, api: string) {
    let response = await this.axios.get(
      `/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}/settings/default`
    );
    return response.data;
  }

  async setApiDefaultVersion(owner: string, api: string, version: string) {
    let response = await this.axios.put(
      `/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}/settings/default`,
      { version }
    );
    return response.data;
  }

  async getApiVersionLifecycle(owner: string, api: string, version: string) {
    let response = await this.axios.get(
      `/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}/${encodeURIComponent(version)}/settings/lifecycle`
    );
    return response.data;
  }

  async setApiVersionLifecycle(
    owner: string,
    api: string,
    version: string,
    published: boolean
  ) {
    let response = await this.axios.put(
      `/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}/${encodeURIComponent(version)}/settings/lifecycle`,
      { published }
    );
    return response.data;
  }

  async getApiVersionVisibility(owner: string, api: string, version: string) {
    let response = await this.axios.get(
      `/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}/${encodeURIComponent(version)}/settings/private`
    );
    return response.data;
  }

  async setApiVersionVisibility(
    owner: string,
    api: string,
    version: string,
    isPrivate: boolean
  ) {
    let response = await this.axios.put(
      `/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}/${encodeURIComponent(version)}/settings/private`,
      {
        private: isPrivate
      }
    );
    return response.data;
  }

  // ─── Domains ──────────────────────────────────────────

  async getOwnerDomains(
    owner: string,
    params?: {
      page?: number;
      limit?: number;
      sort?: 'NAME' | 'UPDATED' | 'CREATED' | 'OWNER';
      order?: 'ASC' | 'DESC';
    }
  ) {
    let response = await this.axios.get(`/domains/${encodeURIComponent(owner)}`, { params });
    return response.data;
  }

  async getDomainVersions(owner: string, domain: string) {
    let response = await this.axios.get(
      `/domains/${encodeURIComponent(owner)}/${encodeURIComponent(domain)}`
    );
    return response.data;
  }

  async getDomainDefinition(owner: string, domain: string, version: string) {
    let response = await this.axios.get(
      `/domains/${encodeURIComponent(owner)}/${encodeURIComponent(domain)}/${encodeURIComponent(version)}`,
      {
        headers: { Accept: 'application/json' }
      }
    );
    return response.data;
  }

  async getDomainDefinitionYaml(owner: string, domain: string, version: string) {
    let response = await this.axios.get(
      `/domains/${encodeURIComponent(owner)}/${encodeURIComponent(domain)}/${encodeURIComponent(version)}/domain.yaml`,
      {
        headers: { Accept: 'application/yaml' },
        responseType: 'text'
      }
    );
    return response.data;
  }

  async saveDomainDefinition(
    owner: string,
    domain: string,
    params: {
      definition: string;
      version?: string;
      isPrivate?: boolean;
      force?: boolean;
    }
  ) {
    let response = await this.axios.post(
      `/domains/${encodeURIComponent(owner)}/${encodeURIComponent(domain)}`,
      params.definition,
      {
        headers: { 'Content-Type': 'application/yaml' },
        params: {
          version: params.version,
          isPrivate: params.isPrivate,
          force: params.force
        }
      }
    );
    return response.data;
  }

  async deleteDomain(owner: string, domain: string) {
    let response = await this.axios.delete(
      `/domains/${encodeURIComponent(owner)}/${encodeURIComponent(domain)}`
    );
    return response.data;
  }

  async deleteDomainVersion(owner: string, domain: string, version: string) {
    let response = await this.axios.delete(
      `/domains/${encodeURIComponent(owner)}/${encodeURIComponent(domain)}/${encodeURIComponent(version)}`
    );
    return response.data;
  }

  async renameDomain(owner: string, domain: string, newName: string) {
    let response = await this.axios.post(
      `/domains/${encodeURIComponent(owner)}/${encodeURIComponent(domain)}/rename`,
      undefined,
      { params: { newName } }
    );
    return response.data;
  }

  // ─── Domain Settings ──────────────────────────────────

  async setDomainVersionLifecycle(
    owner: string,
    domain: string,
    version: string,
    published: boolean
  ) {
    let response = await this.axios.put(
      `/domains/${encodeURIComponent(owner)}/${encodeURIComponent(domain)}/${encodeURIComponent(version)}/settings/lifecycle`,
      { published }
    );
    return response.data;
  }

  async setDomainVersionVisibility(
    owner: string,
    domain: string,
    version: string,
    isPrivate: boolean
  ) {
    let response = await this.axios.put(
      `/domains/${encodeURIComponent(owner)}/${encodeURIComponent(domain)}/${encodeURIComponent(version)}/settings/private`,
      { private: isPrivate }
    );
    return response.data;
  }

  // ─── Comments ─────────────────────────────────────────

  async getApiComments(owner: string, api: string, version: string) {
    let response = await this.axios.get(
      `/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}/${encodeURIComponent(version)}/comments`
    );
    return response.status === 204 ? [] : response.data;
  }

  async getDomainComments(owner: string, domain: string, version: string) {
    let response = await this.axios.get(
      `/domains/${encodeURIComponent(owner)}/${encodeURIComponent(domain)}/${encodeURIComponent(version)}/comments`
    );
    return response.status === 204 ? [] : response.data;
  }

  // ─── Integrations ────────────────────────────────────

  async getApiIntegrations(owner: string, api: string, version: string) {
    let response = await this.axios.get(
      `/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}/${encodeURIComponent(version)}/integrations`
    );
    return response.data;
  }

  async createApiIntegration(
    owner: string,
    api: string,
    version: string,
    integration: Record<string, unknown>
  ) {
    let response = await this.axios.post(
      `/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}/${encodeURIComponent(version)}/integrations`,
      integration
    );
    return response.data;
  }

  async getApiIntegration(owner: string, api: string, version: string, integrationId: string) {
    let response = await this.axios.get(
      `/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}/${encodeURIComponent(version)}/integrations/${encodeURIComponent(integrationId)}`
    );
    return response.data;
  }

  async updateApiIntegration(
    owner: string,
    api: string,
    version: string,
    integrationId: string,
    integration: Record<string, unknown>
  ) {
    let response = await this.axios.put(
      `/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}/${encodeURIComponent(version)}/integrations/${encodeURIComponent(integrationId)}`,
      integration
    );
    return response.data;
  }

  async deleteApiIntegration(
    owner: string,
    api: string,
    version: string,
    integrationId: string
  ) {
    let response = await this.axios.delete(
      `/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}/${encodeURIComponent(version)}/integrations/${encodeURIComponent(integrationId)}`
    );
    return response.data;
  }

  async executeApiIntegration(
    owner: string,
    api: string,
    version: string,
    integrationId: string
  ) {
    let response = await this.axios.post(
      `/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}/${encodeURIComponent(version)}/integrations/${encodeURIComponent(integrationId)}/execute`
    );
    return response.data;
  }

  // ─── Projects ─────────────────────────────────────────

  async getProjects(
    owner: string,
    params?: { page?: number; limit?: number; order?: 'ASC' | 'DESC' }
  ) {
    let response = await this.axios.get(`/projects/${encodeURIComponent(owner)}`, { params });
    return response.data;
  }

  async createProject(
    owner: string,
    project: { name: string; description?: string; apis?: string[]; domains?: string[] }
  ) {
    let response = await this.axios.post(`/projects/${encodeURIComponent(owner)}`, project);
    return response.data;
  }

  async getProject(owner: string, projectId: string) {
    let response = await this.axios.get(
      `/projects/${encodeURIComponent(owner)}/${encodeURIComponent(projectId)}`
    );
    return response.data;
  }

  async updateProject(
    owner: string,
    projectId: string,
    project: { name?: string; description?: string; apis?: string[]; domains?: string[] }
  ) {
    let response = await this.axios.put(
      `/projects/${encodeURIComponent(owner)}/${encodeURIComponent(projectId)}`,
      project
    );
    return response.data;
  }

  async deleteProject(owner: string, projectId: string) {
    let response = await this.axios.delete(
      `/projects/${encodeURIComponent(owner)}/${encodeURIComponent(projectId)}`
    );
    return response.data;
  }

  async addToProject(
    owner: string,
    projectId: string,
    specType: 'apis' | 'domains',
    name: string
  ) {
    let response = await this.axios.put(
      `/projects/${encodeURIComponent(owner)}/${encodeURIComponent(projectId)}/${specType}/${encodeURIComponent(name)}`
    );
    return response.data;
  }

  async cloneDefinitionVersion(
    resourceType: 'api' | 'domain',
    owner: string,
    name: string,
    version: string,
    newVersion: string,
    isPrivate?: boolean
  ) {
    let response = await this.axios.post(
      `/${resourceType === 'api' ? 'apis' : 'domains'}/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/${encodeURIComponent(version)}/clone`,
      { version: newVersion, ...(isPrivate === undefined ? {} : { private: isPrivate }) }
    );
    return response.data;
  }

  // ─── Standardization ─────────────────────────────────

  async getStandardizationErrors(owner: string, api: string, version: string) {
    let response = await this.axios.get(
      `/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}/${encodeURIComponent(version)}/standardization`
    );
    return response.data;
  }

  // ─── Collaboration ───────────────────────────────────

  async getApiCollaboration(owner: string, api: string) {
    let response = await this.axios.get(
      `/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}/.collaboration`
    );
    return response.data;
  }
}
