import { createAxios } from 'slates';

let BASE_URLS: Record<string, string> = {
  production: 'https://api.truvera.io',
  test: 'https://api-testnet.truvera.io'
};

export class Client {
  private axios;

  constructor(params: { token: string; environment: string }) {
    let baseURL = BASE_URLS[params.environment] || BASE_URLS.production;
    this.axios = createAxios({
      baseURL,
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---------- DIDs ----------

  async listDids(options?: { offset?: number; limit?: number }) {
    let res = await this.axios.get('/dids', { params: options });
    return res.data;
  }

  async getDid(did: string) {
    let res = await this.axios.get(`/dids/${encodeURIComponent(did)}`);
    return res.data;
  }

  async createDid(body: { type?: string; keyType?: string; controller?: string }) {
    let res = await this.axios.post('/dids', body);
    return res.data;
  }

  async deleteDid(did: string) {
    let res = await this.axios.delete(`/dids/${encodeURIComponent(did)}`);
    return res.data;
  }

  async exportDid(did: string, password: string) {
    let res = await this.axios.post(`/dids/${encodeURIComponent(did)}/export`, { password });
    return res.data;
  }

  // ---------- Credentials ----------

  async listCredentials(options?: { offset?: number; limit?: number }) {
    let res = await this.axios.get('/credentials', { params: options });
    return res.data;
  }

  async getCredential(credentialId: string, password?: string) {
    let res = await this.axios.get(`/credentials/${encodeURIComponent(credentialId)}`, {
      params: password ? { password } : undefined
    });
    return res.data;
  }

  async issueCredential(body: Record<string, any>) {
    let res = await this.axios.post('/credentials', body);
    return res.data;
  }

  async deleteCredential(credentialId: string) {
    let res = await this.axios.delete(`/credentials/${encodeURIComponent(credentialId)}`);
    return res.data;
  }

  async createClaimRequest(body: Record<string, any>) {
    let res = await this.axios.post('/credentials/request-claims', body);
    return res.data;
  }

  async listClaimRequests(options?: { offset?: number; limit?: number }) {
    let res = await this.axios.get('/credentials/request-claims', { params: options });
    return res.data;
  }

  // ---------- Schemas ----------

  async listSchemas(options?: { offset?: number; limit?: number }) {
    let res = await this.axios.get('/schemas', { params: options });
    return res.data;
  }

  async getSchema(schemaId: string) {
    let res = await this.axios.get(`/schemas/${encodeURIComponent(schemaId)}`);
    return res.data;
  }

  async createSchema(body: Record<string, any>) {
    let res = await this.axios.post('/schemas', body);
    return res.data;
  }

  async deleteSchema(schemaId: string) {
    let res = await this.axios.delete(`/schemas/${encodeURIComponent(schemaId)}`);
    return res.data;
  }

  // ---------- Registries ----------

  async listRegistries(options?: { offset?: number; limit?: number }) {
    let res = await this.axios.get('/registries', { params: options });
    return res.data;
  }

  async getRegistry(registryId: string) {
    let res = await this.axios.get(`/registries/${encodeURIComponent(registryId)}`);
    return res.data;
  }

  async createRegistry(body: { policy: string[]; type?: string; addOnly?: boolean }) {
    let res = await this.axios.post('/registries', body);
    return res.data;
  }

  async deleteRegistry(registryId: string) {
    let res = await this.axios.delete(`/registries/${encodeURIComponent(registryId)}`);
    return res.data;
  }

  async revokeCredentials(registryId: string, credentialIds: string[]) {
    let res = await this.axios.post(`/registries/${encodeURIComponent(registryId)}`, {
      action: 'revoke',
      credentialIds
    });
    return res.data;
  }

  async unrevokeCredentials(registryId: string, credentialIds: string[]) {
    let res = await this.axios.post(`/registries/${encodeURIComponent(registryId)}`, {
      action: 'unrevoke',
      credentialIds
    });
    return res.data;
  }

  // ---------- Proof Templates ----------

  async listProofTemplates(options?: { offset?: number; limit?: number }) {
    let res = await this.axios.get('/proof-templates', { params: options });
    return res.data;
  }

  async getProofTemplate(templateId: string) {
    let res = await this.axios.get(`/proof-templates/${encodeURIComponent(templateId)}`);
    return res.data;
  }

  async createProofTemplate(body: Record<string, any>) {
    let res = await this.axios.post('/proof-templates', body);
    return res.data;
  }

  async updateProofTemplate(templateId: string, body: Record<string, any>) {
    let res = await this.axios.patch(
      `/proof-templates/${encodeURIComponent(templateId)}`,
      body
    );
    return res.data;
  }

  async deleteProofTemplate(templateId: string) {
    let res = await this.axios.delete(`/proof-templates/${encodeURIComponent(templateId)}`);
    return res.data;
  }

  // ---------- Proof Requests ----------

  async listProofRequests(options?: { offset?: number; limit?: number }) {
    let res = await this.axios.get('/proof-requests', { params: options });
    return res.data;
  }

  async getProofRequest(requestId: string) {
    let res = await this.axios.get(`/proof-requests/${encodeURIComponent(requestId)}`);
    return res.data;
  }

  async createProofRequest(body: Record<string, any>) {
    let res = await this.axios.post('/proof-requests', body);
    return res.data;
  }

  async createProofRequestFromTemplate(templateId: string, body?: Record<string, any>) {
    let res = await this.axios.post(
      `/proof-templates/${encodeURIComponent(templateId)}/request`,
      body || {}
    );
    return res.data;
  }

  async deleteProofRequest(requestId: string) {
    let res = await this.axios.delete(`/proof-requests/${encodeURIComponent(requestId)}`);
    return res.data;
  }

  // ---------- Profiles ----------

  async listProfiles(options?: { offset?: number; limit?: number }) {
    let res = await this.axios.get('/profiles', { params: options });
    return res.data;
  }

  async getProfile(did: string) {
    let res = await this.axios.get(`/profiles/${encodeURIComponent(did)}`);
    return res.data;
  }

  async createProfile(body: {
    did: string;
    name: string;
    logo?: string;
    description?: string;
  }) {
    let res = await this.axios.post('/profiles', body);
    return res.data;
  }

  async updateProfile(
    did: string,
    body: { name?: string; logo?: string; description?: string }
  ) {
    let res = await this.axios.patch(`/profiles/${encodeURIComponent(did)}`, body);
    return res.data;
  }

  async deleteProfile(did: string) {
    let res = await this.axios.delete(`/profiles/${encodeURIComponent(did)}`);
    return res.data;
  }

  // ---------- Verify ----------

  async verifyCredential(credential: Record<string, any>) {
    let res = await this.axios.post('/verify', credential);
    return res.data;
  }

  // ---------- Webhooks ----------

  async listWebhooks() {
    let res = await this.axios.get('/webhooks');
    return res.data;
  }

  async createWebhook(body: {
    url: string;
    events: string[];
    description?: string;
    status?: number;
  }) {
    let res = await this.axios.post('/webhooks', body);
    return res.data;
  }

  async deleteWebhook(webhookId: string) {
    let res = await this.axios.delete(`/webhooks/${encodeURIComponent(webhookId)}`);
    return res.data;
  }

  async updateWebhook(webhookId: string, body: Record<string, any>) {
    let res = await this.axios.patch(`/webhooks/${encodeURIComponent(webhookId)}`, body);
    return res.data;
  }

  // ---------- Jobs ----------

  async getJob(jobId: string) {
    let res = await this.axios.get(`/jobs/${encodeURIComponent(jobId)}`);
    return res.data;
  }
}
