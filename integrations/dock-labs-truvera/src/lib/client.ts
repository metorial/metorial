import { createAxios } from 'slates';

export class DockClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; environment: string }) {
    let baseURL =
      config.environment === 'testnet' ? 'https://api-testnet.dock.io' : 'https://api.dock.io';

    this.axios = createAxios({
      baseURL,
      headers: {
        'DOCK-API-TOKEN': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- DIDs ----

  async createDid(params: {
    type?: string;
    keyType?: string;
    controller?: string;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {};
    if (params.type !== undefined) body.type = params.type;
    if (params.keyType !== undefined) body.keyType = params.keyType;
    if (params.controller !== undefined) body.controller = params.controller;

    let response = await this.axios.post('/dids', body);
    return response.data;
  }

  async getDid(did: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/dids/${encodeURIComponent(did)}`);
    return response.data;
  }

  async listDids(params?: {
    offset?: number;
    limit?: number;
  }): Promise<Record<string, unknown>[]> {
    let queryParams: Record<string, string> = {};
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);

    let response = await this.axios.get('/dids', { params: queryParams });
    return response.data;
  }

  async deleteDid(did: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/dids/${encodeURIComponent(did)}`);
    return response.data;
  }

  async exportDid(did: string, password: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/dids/${encodeURIComponent(did)}/export`, {
      password
    });
    return response.data;
  }

  // ---- Profiles ----

  async createProfile(params: {
    name: string;
    did: string;
    description?: string;
    logo?: string;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/profiles', params);
    return response.data;
  }

  async getProfile(profileId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/profiles/${encodeURIComponent(profileId)}`);
    return response.data;
  }

  async listProfiles(params?: {
    offset?: number;
    limit?: number;
  }): Promise<Record<string, unknown>[]> {
    let queryParams: Record<string, string> = {};
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);

    let response = await this.axios.get('/profiles', { params: queryParams });
    return response.data;
  }

  async updateProfile(
    profileId: string,
    params: {
      name?: string;
      description?: string;
      logo?: string;
    }
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.patch(
      `/profiles/${encodeURIComponent(profileId)}`,
      params
    );
    return response.data;
  }

  async deleteProfile(profileId: string): Promise<void> {
    await this.axios.delete(`/profiles/${encodeURIComponent(profileId)}`);
  }

  // ---- Credentials ----

  async issueCredential(params: {
    anchor?: boolean;
    persist?: boolean;
    distribute?: boolean;
    recipientEmail?: string;
    schema?: string;
    template?: string;
    credential: {
      type?: string[];
      subject: Record<string, unknown> | Record<string, unknown>[];
      issuer: string | Record<string, unknown>;
      issuanceDate?: string;
      expirationDate?: string;
      context?: string[];
      status?: Record<string, unknown>;
      name?: string;
      description?: string;
    };
    password?: string;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/credentials', params);
    return response.data;
  }

  async getCredential(
    credentialId: string,
    params?: {
      password?: string;
    }
  ): Promise<Record<string, unknown>> {
    let queryParams: Record<string, string> = {};
    if (params?.password !== undefined) queryParams.password = params.password;

    let response = await this.axios.get(`/credentials/${encodeURIComponent(credentialId)}`, {
      params: queryParams
    });
    return response.data;
  }

  async listCredentials(params?: {
    offset?: number;
    limit?: number;
  }): Promise<Record<string, unknown>[]> {
    let queryParams: Record<string, string> = {};
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);

    let response = await this.axios.get('/credentials', { params: queryParams });
    return response.data;
  }

  async deleteCredential(credentialId: string): Promise<void> {
    await this.axios.delete(`/credentials/${encodeURIComponent(credentialId)}`);
  }

  // ---- Verification ----

  async verifyCredential(
    credential: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/verify', credential);
    return response.data;
  }

  async verifyPresentation(
    presentation: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/verify', presentation);
    return response.data;
  }

  // ---- Presentations ----

  async createPresentation(params: {
    holder: string;
    credentials: Record<string, unknown>[];
    challenge?: string;
    domain?: string;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/presentations', params);
    return response.data;
  }

  // ---- Schemas ----

  async createSchema(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/schemas', params);
    return response.data;
  }

  async getSchema(schemaId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/schemas/${encodeURIComponent(schemaId)}`);
    return response.data;
  }

  async listSchemas(params?: {
    offset?: number;
    limit?: number;
  }): Promise<Record<string, unknown>[]> {
    let queryParams: Record<string, string> = {};
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);

    let response = await this.axios.get('/schemas', { params: queryParams });
    return response.data;
  }

  // ---- Registries ----

  async createRegistry(params: {
    addOnly?: boolean;
    policy: string[];
    type?: string;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/registries', params);
    return response.data;
  }

  async getRegistry(registryId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/registries/${encodeURIComponent(registryId)}`);
    return response.data;
  }

  async listRegistries(params?: {
    offset?: number;
    limit?: number;
  }): Promise<Record<string, unknown>[]> {
    let queryParams: Record<string, string> = {};
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);

    let response = await this.axios.get('/registries', { params: queryParams });
    return response.data;
  }

  async deleteRegistry(registryId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/registries/${encodeURIComponent(registryId)}`);
    return response.data;
  }

  async revokeCredential(
    registryId: string,
    credentialIds: string[]
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/registries/${encodeURIComponent(registryId)}`, {
      action: 'revoke',
      credentialIds
    });
    return response.data;
  }

  async unrevokeCredential(
    registryId: string,
    credentialIds: string[]
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/registries/${encodeURIComponent(registryId)}`, {
      action: 'unrevoke',
      credentialIds
    });
    return response.data;
  }

  // ---- Revocation Status ----

  async getRevocationStatus(
    registryId: string,
    credentialId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/revocationStatus/${encodeURIComponent(registryId)}/${encodeURIComponent(credentialId)}`
    );
    return response.data;
  }

  // ---- Anchors ----

  async createAnchor(documents: string[]): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/anchors', { documents });
    return response.data;
  }

  async getAnchor(anchorId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/anchors/${encodeURIComponent(anchorId)}`);
    return response.data;
  }

  async listAnchors(params?: {
    offset?: number;
    limit?: number;
  }): Promise<Record<string, unknown>[]> {
    let queryParams: Record<string, string> = {};
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);

    let response = await this.axios.get('/anchors', { params: queryParams });
    return response.data;
  }

  async verifyAnchor(anchorId: string, documents: string[]): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/anchors/${encodeURIComponent(anchorId)}/verify`, {
      documents
    });
    return response.data;
  }

  // ---- Proof Requests ----

  async createProofRequest(params: {
    name?: string;
    purpose?: string;
    request: Record<string, unknown>;
    nonce?: string;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/proof-requests', params);
    return response.data;
  }

  async getProofRequest(proofRequestId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/proof-requests/${encodeURIComponent(proofRequestId)}`
    );
    return response.data;
  }

  async listProofRequests(params?: {
    offset?: number;
    limit?: number;
  }): Promise<Record<string, unknown>[]> {
    let queryParams: Record<string, string> = {};
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);

    let response = await this.axios.get('/proof-requests', { params: queryParams });
    return response.data;
  }

  // ---- Certificate Design Templates ----

  async getTemplate(templateId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/designs/${encodeURIComponent(templateId)}`);
    return response.data;
  }

  async listTemplates(params?: {
    offset?: number;
    limit?: number;
  }): Promise<Record<string, unknown>[]> {
    let queryParams: Record<string, string> = {};
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);

    let response = await this.axios.get('/designs', { params: queryParams });
    return response.data;
  }

  // ---- Messaging ----

  async sendMessage(params: {
    to: string;
    from: string;
    message: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/messaging/send', params);
    return response.data;
  }

  async encryptMessage(params: {
    type: string;
    payload: Record<string, unknown>;
    senderDid: string;
    recipientDids: string[];
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/messaging/encrypt', params);
    return response.data;
  }

  // ---- Jobs ----

  async getJob(jobId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/jobs/${encodeURIComponent(jobId)}`);
    return response.data;
  }

  // ---- Sub-Accounts ----

  async createSubAccount(params: { name: string }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/sub-accounts', params);
    return response.data;
  }

  async getSubAccount(subAccountId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/sub-accounts/${encodeURIComponent(subAccountId)}`);
    return response.data;
  }

  async listSubAccounts(params?: {
    offset?: number;
    limit?: number;
  }): Promise<Record<string, unknown>[]> {
    let queryParams: Record<string, string> = {};
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);

    let response = await this.axios.get('/sub-accounts', { params: queryParams });
    return response.data;
  }
}
