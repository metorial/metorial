import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  baseUrl: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    this.axios = createAxios({
      baseURL: config.baseUrl,
      headers: {
        Authorization: config.token
      }
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
    let response = await this.axios.get(`/apis/${owner}`, { params });
    return response.data;
  }

  async getApiVersions(owner: string, api: string) {
    let response = await this.axios.get(`/apis/${owner}/${api}`);
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
    let response = await this.axios.get(`/apis/${owner}/${api}/${version}`, {
      params,
      headers: { Accept: 'application/json' }
    });
    return response.data;
  }

  async getApiDefinitionYaml(owner: string, api: string, version: string) {
    let response = await this.axios.get(`/apis/${owner}/${api}/${version}/swagger.yaml`, {
      headers: { Accept: 'application/yaml' },
      responseType: 'text'
    });
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
    let response = await this.axios.post(`/apis/${owner}/${api}`, params.definition, {
      headers: { 'Content-Type': 'application/yaml' },
      params: {
        version: params.version,
        isPrivate: params.isPrivate,
        oas: params.oas,
        force: params.force
      }
    });
    return response.data;
  }

  async deleteApi(owner: string, api: string) {
    let response = await this.axios.delete(`/apis/${owner}/${api}`);
    return response.data;
  }

  async deleteApiVersion(owner: string, api: string, version: string) {
    let response = await this.axios.delete(`/apis/${owner}/${api}/${version}`);
    return response.data;
  }

  async renameApi(owner: string, api: string, newName: string) {
    let response = await this.axios.post(`/apis/${owner}/${api}/rename`, { newName });
    return response.data;
  }

  // ─── API Settings ─────────────────────────────────────

  async getApiDefaultVersion(owner: string, api: string) {
    let response = await this.axios.get(`/apis/${owner}/${api}/settings/default`);
    return response.data;
  }

  async setApiDefaultVersion(owner: string, api: string, version: string) {
    let response = await this.axios.put(`/apis/${owner}/${api}/settings/default`, { version });
    return response.data;
  }

  async getApiVersionLifecycle(owner: string, api: string, version: string) {
    let response = await this.axios.get(`/apis/${owner}/${api}/${version}/settings/lifecycle`);
    return response.data;
  }

  async setApiVersionLifecycle(
    owner: string,
    api: string,
    version: string,
    published: boolean
  ) {
    let response = await this.axios.put(
      `/apis/${owner}/${api}/${version}/settings/lifecycle`,
      { published }
    );
    return response.data;
  }

  async getApiVersionVisibility(owner: string, api: string, version: string) {
    let response = await this.axios.get(`/apis/${owner}/${api}/${version}/settings/private`);
    return response.data;
  }

  async setApiVersionVisibility(
    owner: string,
    api: string,
    version: string,
    isPrivate: boolean
  ) {
    let response = await this.axios.put(`/apis/${owner}/${api}/${version}/settings/private`, {
      private: isPrivate
    });
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
    let response = await this.axios.get(`/domains/${owner}`, { params });
    return response.data;
  }

  async getDomainVersions(owner: string, domain: string) {
    let response = await this.axios.get(`/domains/${owner}/${domain}`);
    return response.data;
  }

  async getDomainDefinition(owner: string, domain: string, version: string) {
    let response = await this.axios.get(`/domains/${owner}/${domain}/${version}`, {
      headers: { Accept: 'application/json' }
    });
    return response.data;
  }

  async getDomainDefinitionYaml(owner: string, domain: string, version: string) {
    let response = await this.axios.get(`/domains/${owner}/${domain}/${version}/domain.yaml`, {
      headers: { Accept: 'application/yaml' },
      responseType: 'text'
    });
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
    let response = await this.axios.post(`/domains/${owner}/${domain}`, params.definition, {
      headers: { 'Content-Type': 'application/yaml' },
      params: {
        version: params.version,
        isPrivate: params.isPrivate,
        force: params.force
      }
    });
    return response.data;
  }

  async deleteDomain(owner: string, domain: string) {
    let response = await this.axios.delete(`/domains/${owner}/${domain}`);
    return response.data;
  }

  async deleteDomainVersion(owner: string, domain: string, version: string) {
    let response = await this.axios.delete(`/domains/${owner}/${domain}/${version}`);
    return response.data;
  }

  async renameDomain(owner: string, domain: string, newName: string) {
    let response = await this.axios.post(`/domains/${owner}/${domain}/rename`, { newName });
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
      `/domains/${owner}/${domain}/${version}/settings/lifecycle`,
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
      `/domains/${owner}/${domain}/${version}/settings/private`,
      { private: isPrivate }
    );
    return response.data;
  }

  // ─── Comments ─────────────────────────────────────────

  async getApiComments(owner: string, api: string, version: string) {
    let response = await this.axios.get(`/apis/${owner}/${api}/${version}/comments`);
    return response.data;
  }

  async getDomainComments(owner: string, domain: string, version: string) {
    let response = await this.axios.get(`/domains/${owner}/${domain}/${version}/comments`);
    return response.data;
  }

  // ─── Integrations ────────────────────────────────────

  async getApiIntegrations(owner: string, api: string, version: string) {
    let response = await this.axios.get(`/apis/${owner}/${api}/${version}/integrations`);
    return response.data;
  }

  async createApiIntegration(
    owner: string,
    api: string,
    version: string,
    integration: Record<string, unknown>
  ) {
    let response = await this.axios.post(
      `/apis/${owner}/${api}/${version}/integrations`,
      integration
    );
    return response.data;
  }

  async getApiIntegration(owner: string, api: string, version: string, integrationId: string) {
    let response = await this.axios.get(
      `/apis/${owner}/${api}/${version}/integrations/${integrationId}`
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
      `/apis/${owner}/${api}/${version}/integrations/${integrationId}`,
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
      `/apis/${owner}/${api}/${version}/integrations/${integrationId}`
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
      `/apis/${owner}/${api}/${version}/integrations/${integrationId}/execute`
    );
    return response.data;
  }

  // ─── Projects ─────────────────────────────────────────

  async getProjects(owner: string) {
    let response = await this.axios.get(`/projects/${owner}`);
    return response.data;
  }

  async createProject(owner: string, project: { name: string; description?: string }) {
    let response = await this.axios.post(`/projects/${owner}`, project);
    return response.data;
  }

  async getProject(owner: string, projectId: string) {
    let response = await this.axios.get(`/projects/${owner}/${projectId}`);
    return response.data;
  }

  async updateProject(
    owner: string,
    projectId: string,
    project: { name?: string; description?: string }
  ) {
    let response = await this.axios.put(`/projects/${owner}/${projectId}`, project);
    return response.data;
  }

  async deleteProject(owner: string, projectId: string) {
    let response = await this.axios.delete(`/projects/${owner}/${projectId}`);
    return response.data;
  }

  async addToProject(
    owner: string,
    projectId: string,
    specType: 'apis' | 'domains',
    name: string
  ) {
    let response = await this.axios.put(`/projects/${owner}/${projectId}/${specType}/${name}`);
    return response.data;
  }

  // ─── Standardization ─────────────────────────────────

  async getStandardizationErrors(owner: string, api: string, version: string) {
    let response = await this.axios.get(`/apis/${owner}/${api}/${version}/standardization`);
    return response.data;
  }

  // ─── Collaboration ───────────────────────────────────

  async getApiCollaboration(owner: string, api: string) {
    let response = await this.axios.get(`/apis/${owner}/${api}/.collaboration`);
    return response.data;
  }
}
