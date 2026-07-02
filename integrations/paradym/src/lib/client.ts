import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://api.paradym.id/v1'
});

export interface PaginationParams {
  pageSize?: number;
  pageAfter?: string;
  pageBefore?: string;
}

export interface ListResponse<T> {
  data: T[];
  metadata?: {
    pagination?: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
}

export class Client {
  private token: string;
  private projectId: string;

  constructor(config: { token: string; projectId: string }) {
    this.token = config.token;
    this.projectId = config.projectId;
  }

  private headers() {
    return {
      'x-access-token': this.token,
      'Content-Type': 'application/json'
    };
  }

  private projectUrl(path: string) {
    return `/projects/${this.projectId}${path}`;
  }

  // ─── Projects ───

  async listProjects(params?: PaginationParams) {
    let res = await api.get('/projects', {
      headers: this.headers(),
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getProject(projectId?: string) {
    let id = projectId ?? this.projectId;
    let res = await api.get(`/projects/${id}`, {
      headers: this.headers()
    });
    return res.data;
  }

  async createProject(data: { name: string }) {
    let res = await api.post('/projects', data, {
      headers: this.headers()
    });
    return res.data;
  }

  async getProjectProfile(projectId?: string) {
    let id = projectId ?? this.projectId;
    let res = await api.get(`/projects/${id}/profile`, {
      headers: this.headers()
    });
    return res.data;
  }

  async listProjectMembers(projectId?: string) {
    let id = projectId ?? this.projectId;
    let res = await api.get(`/projects/${id}/members`, {
      headers: this.headers()
    });
    return res.data;
  }

  // ─── Credential Templates ───

  async listCredentialTemplates(params?: PaginationParams) {
    let res = await api.get(this.projectUrl('/templates/credentials'), {
      headers: this.headers(),
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getCredentialTemplate(templateId: string) {
    let res = await api.get(this.projectUrl(`/templates/credentials/${templateId}`), {
      headers: this.headers()
    });
    return res.data;
  }

  async createSdJwtCredentialTemplate(data: {
    name: string;
    type: string;
    attributes: Record<string, any>;
    issuer: Record<string, any>;
    description?: string;
    revocable?: boolean;
    background?: Record<string, any>;
    text?: Record<string, any>;
    validFrom?: string;
    validUntil?: string;
  }) {
    let res = await api.post(this.projectUrl('/templates/credentials/sd-jwt-vc'), data, {
      headers: this.headers()
    });
    return res.data;
  }

  async createMdocCredentialTemplate(data: {
    name: string;
    type: string;
    attributes: Record<string, any>;
    issuer: Record<string, any>;
    description?: string;
    background?: Record<string, any>;
    text?: Record<string, any>;
    validUntil?: string;
  }) {
    let res = await api.post(this.projectUrl('/templates/credentials/mdoc'), data, {
      headers: this.headers()
    });
    return res.data;
  }

  async createAnonCredsCredentialTemplate(data: {
    name: string;
    schema: Record<string, any>;
    attributes: Record<string, any>;
    issuer: Record<string, any>;
    description?: string;
    revocable?: boolean;
    background?: Record<string, any>;
    text?: Record<string, any>;
  }) {
    let res = await api.post(this.projectUrl('/templates/credentials/anoncreds'), data, {
      headers: this.headers()
    });
    return res.data;
  }

  async updateCredentialTemplate(templateId: string, data: Record<string, any>) {
    let res = await api.patch(this.projectUrl(`/templates/credentials/${templateId}`), data, {
      headers: this.headers()
    });
    return res.data;
  }

  // ─── Presentation Templates ───

  async listPresentationTemplates(params?: PaginationParams) {
    let res = await api.get(this.projectUrl('/templates/presentations'), {
      headers: this.headers(),
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getPresentationTemplate(templateId: string) {
    let res = await api.get(this.projectUrl(`/templates/presentations/${templateId}`), {
      headers: this.headers()
    });
    return res.data;
  }

  async createPresentationTemplate(data: {
    name: string;
    description: string;
    credentials: Record<string, any>[];
    verifier?: Record<string, any>;
  }) {
    let res = await api.post(this.projectUrl('/templates/presentations'), data, {
      headers: this.headers()
    });
    return res.data;
  }

  async updatePresentationTemplate(templateId: string, data: Record<string, any>) {
    let res = await api.patch(
      this.projectUrl(`/templates/presentations/${templateId}`),
      data,
      {
        headers: this.headers()
      }
    );
    return res.data;
  }

  // ─── OpenID4VC Issuance ───

  async createOpenId4VcIssuanceOffer(data: {
    credentials: Array<{
      credentialTemplateId: string;
      attributes?: Record<string, any>;
    }>;
    expirationInMinutes?: number;
  }) {
    let res = await api.post(this.projectUrl('/openid4vc/issuance/offer'), data, {
      headers: this.headers()
    });
    return res.data;
  }

  async listOpenId4VcIssuances(params?: PaginationParams) {
    let res = await api.get(this.projectUrl('/openid4vc/issuance'), {
      headers: this.headers(),
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getOpenId4VcIssuance(issuanceId: string) {
    let res = await api.get(this.projectUrl(`/openid4vc/issuance/${issuanceId}`), {
      headers: this.headers()
    });
    return res.data;
  }

  // ─── Direct Issuance ───

  async directIssueSdJwtVc(data: {
    credentialTemplateId: string;
    attributes?: Record<string, any>;
  }) {
    let res = await api.post(this.projectUrl('/issuance/sd-jwt-vc'), data, {
      headers: this.headers()
    });
    return res.data;
  }

  // ─── OpenID4VC Verification ───

  async createOpenId4VcVerification(data: {
    presentationTemplateId: string;
    expirationInMinutes?: number;
    requireResponseEncryption?: boolean;
  }) {
    let res = await api.post(this.projectUrl('/openid4vc/verification/request'), data, {
      headers: this.headers()
    });
    return res.data;
  }

  async listOpenId4VcVerifications(params?: PaginationParams) {
    let res = await api.get(this.projectUrl('/openid4vc/verification'), {
      headers: this.headers(),
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getOpenId4VcVerification(verificationId: string) {
    let res = await api.get(this.projectUrl(`/openid4vc/verification/${verificationId}`), {
      headers: this.headers()
    });
    return res.data;
  }

  // ─── DIDComm Issuance ───

  async createDidcommIssuanceOffer(data: {
    credential: {
      credentialTemplateId: string;
      attributes?: Record<string, any>;
    };
    didcommInvitation?: {
      createConnection?: boolean;
    };
    didcommConnectionId?: string;
  }) {
    let res = await api.post(this.projectUrl('/didcomm/issuance/offer'), data, {
      headers: this.headers()
    });
    return res.data;
  }

  async listDidcommIssuances(params?: PaginationParams) {
    let res = await api.get(this.projectUrl('/didcomm/issuance'), {
      headers: this.headers(),
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getDidcommIssuance(issuanceId: string) {
    let res = await api.get(this.projectUrl(`/didcomm/issuance/${issuanceId}`), {
      headers: this.headers()
    });
    return res.data;
  }

  // ─── DIDComm Verification ───

  async createDidcommVerification(data: {
    presentationTemplateId: string;
    didcommInvitation?: {
      createConnection?: boolean;
    };
    didcommConnectionId?: string;
  }) {
    let res = await api.post(this.projectUrl('/didcomm/verification/request'), data, {
      headers: this.headers()
    });
    return res.data;
  }

  async listDidcommVerifications(params?: PaginationParams) {
    let res = await api.get(this.projectUrl('/didcomm/verification'), {
      headers: this.headers(),
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getDidcommVerification(verificationId: string) {
    let res = await api.get(this.projectUrl(`/didcomm/verification/${verificationId}`), {
      headers: this.headers()
    });
    return res.data;
  }

  // ─── DIDComm Connections ───

  async listDidcommConnections(params?: PaginationParams) {
    let res = await api.get(this.projectUrl('/didcomm/connections'), {
      headers: this.headers(),
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getDidcommConnection(connectionId: string) {
    let res = await api.get(this.projectUrl(`/didcomm/connections/${connectionId}`), {
      headers: this.headers()
    });
    return res.data;
  }

  async updateDidcommConnection(connectionId: string, data: { displayName: string }) {
    let res = await api.patch(this.projectUrl(`/didcomm/connections/${connectionId}`), data, {
      headers: this.headers()
    });
    return res.data;
  }

  async createDidcommInvitation(data: { reusable?: boolean; did?: string; goal?: string }) {
    let res = await api.post(this.projectUrl('/didcomm/invitations'), data, {
      headers: this.headers()
    });
    return res.data;
  }

  async listDidcommInvitations(params?: PaginationParams) {
    let res = await api.get(this.projectUrl('/didcomm/invitations'), {
      headers: this.headers(),
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async receiveDidcommInvitation(data: { didcommInvitation: string; displayName?: string }) {
    let res = await api.post(this.projectUrl('/didcomm/receive-invitation'), data, {
      headers: this.headers()
    });
    return res.data;
  }

  // ─── Issued Credentials / Revocation ───

  async listIssuedCredentials(
    params?: PaginationParams & { filter?: Record<string, string> }
  ) {
    let query: Record<string, any> = this.paginationQuery(params);
    if (params?.filter) {
      for (let [key, value] of Object.entries(params.filter)) {
        query[`filter[${key}]`] = value;
      }
    }
    let res = await api.get(this.projectUrl('/issuance'), {
      headers: this.headers(),
      params: query
    });
    return res.data;
  }

  async batchRevokeCredentials(data: {
    issuedCredentialIds: string[];
    notifyWallet?: boolean;
  }) {
    let res = await api.post(this.projectUrl('/issuance/revoke'), data, {
      headers: this.headers()
    });
    return res.data;
  }

  // ─── Trusted Entities ───

  async listTrustedEntities(params?: PaginationParams) {
    let res = await api.get(this.projectUrl('/trusted-entities'), {
      headers: this.headers(),
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getTrustedEntity(entityId: string) {
    let res = await api.get(this.projectUrl(`/trusted-entities/${entityId}`), {
      headers: this.headers()
    });
    return res.data;
  }

  async createTrustedEntity(data: { name: string; dids?: string[]; certificates?: string[] }) {
    let res = await api.post(this.projectUrl('/trusted-entities'), data, {
      headers: this.headers()
    });
    return res.data;
  }

  async updateTrustedEntity(entityId: string, data: Record<string, any>) {
    let res = await api.patch(this.projectUrl(`/trusted-entities/${entityId}`), data, {
      headers: this.headers()
    });
    return res.data;
  }

  // ─── Attribute Providers ───

  async listAttributeProviders(params?: PaginationParams) {
    let res = await api.get(this.projectUrl('/attribute-providers'), {
      headers: this.headers(),
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async createAttributeProvider(data: {
    name: string;
    url: string;
    credentialTemplateId: string;
  }) {
    let res = await api.post(this.projectUrl('/attribute-providers'), data, {
      headers: this.headers()
    });
    return res.data;
  }

  // ─── DIDs ───

  async listDids(params?: PaginationParams) {
    let res = await api.get(this.projectUrl('/dids'), {
      headers: this.headers(),
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  // ─── Webhooks ───

  async createWebhook(data: { name: string; url: string; eventTypes: string[] }) {
    let res = await api.post(this.projectUrl('/webhooks'), data, {
      headers: this.headers()
    });
    return res.data;
  }

  async listWebhooks(params?: PaginationParams) {
    let res = await api.get(this.projectUrl('/webhooks'), {
      headers: this.headers(),
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async deleteWebhook(webhookId: string) {
    let res = await api.delete(this.projectUrl(`/webhooks/${webhookId}`), {
      headers: this.headers()
    });
    return res.data;
  }

  // ─── Helpers ───

  private paginationQuery(params?: PaginationParams): Record<string, any> {
    let query: Record<string, any> = {};
    if (params?.pageSize) query['page[size]'] = params.pageSize;
    if (params?.pageAfter) query['page[after]'] = params.pageAfter;
    if (params?.pageBefore) query['page[before]'] = params.pageBefore;
    return query;
  }
}
