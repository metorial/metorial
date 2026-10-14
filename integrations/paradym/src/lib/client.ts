import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

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
  private api: ReturnType<typeof createAuthenticatedAxios>;
  private projectId: unknown;

  constructor(config: { token: string; projectId?: unknown }) {
    if (typeof config.token !== 'string' || !config.token.trim()) {
      throw createApiServiceError(
        'A Paradym API key is required. Reconnect with a valid API key.'
      );
    }
    this.projectId = config.projectId;
    this.api = createAuthenticatedAxios({
      baseURL: 'https://api.paradym.id/v1',
      timeout: 30000,
      authHeader: { name: 'x-access-token', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Paradym',
          reason: 'paradym_api_error',
          nestedKeys: ['errors', 'details'],
          extractResponse: (error, helpers) => {
            let response = helpers.getResponse(error);
            if (!helpers.isRecord(error) || !helpers.isRecord(error.data)) return response;
            let baggage = error.data.baggage;
            if (!helpers.isRecord(baggage) || !helpers.isRecord(baggage.response))
              return response;
            return { ...response, data: baggage.response };
          },
          extractUpstreamCode: (_error, response, helpers) => {
            let data = response?.data;
            return helpers.isRecord(data) && typeof data.code === 'number'
              ? String(data.code)
              : undefined;
          }
        })
    });
  }

  private projectUrl(path: string) {
    if (typeof this.projectId !== 'string' || !this.projectId.trim()) {
      throw createApiServiceError(
        'projectId is required. Call list_projects and pass a project ID.'
      );
    }
    return `/projects/${encodeURIComponent(this.projectId)}${path}`;
  }

  // ─── Projects ───

  async listProjects(params?: PaginationParams) {
    let res = await this.api.get('/projects', {
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getProject(projectId?: string) {
    let id = projectId ?? this.projectId;
    let res = await this.api.get(`/projects/${id}`);
    return res.data;
  }

  async createProject(data: { name: string }) {
    let res = await this.api.post('/projects', data);
    return res.data;
  }

  async getProjectProfile(projectId?: string) {
    let id = projectId ?? this.projectId;
    let res = await this.api.get(`/projects/${id}/profiles/default`);
    return res.data;
  }

  async listProjectMembers(projectId?: string) {
    let id = projectId ?? this.projectId;
    let res = await this.api.get(`/projects/${id}/members`);
    return res.data;
  }

  // ─── Credential Templates ───

  async listCredentialTemplates(
    format: 'sd-jwt-vc' | 'mdoc' | 'anoncreds',
    params?: PaginationParams
  ) {
    let res = await this.api.get(this.projectUrl(`/templates/credentials/${format}`), {
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getCredentialTemplate(format: 'sd-jwt-vc' | 'mdoc' | 'anoncreds', templateId: string) {
    let res = await this.api.get(
      this.projectUrl(`/templates/credentials/${format}/${encodeURIComponent(templateId)}`)
    );
    return res.data;
  }

  async createSdJwtCredentialTemplate(data: {
    name: string;
    type: string;
    attributes: Record<string, any>;
    issuer?: Record<string, any>;
    description?: string;
    revocable?: boolean;
    background?: Record<string, any>;
    text?: Record<string, any>;
    validFrom?: string;
    validUntil?:
      | string
      | {
          future: { days?: number; months?: number; years?: number };
          start?: 'issuance' | 'validFrom';
        };
  }) {
    let res = await this.api.post(this.projectUrl('/templates/credentials/sd-jwt-vc'), data);
    return res.data;
  }

  async createMdocCredentialTemplate(data: {
    name: string;
    type: string;
    attributes: Record<string, any>;
    issuer?: Record<string, any>;
    description?: string;
    revocable?: boolean;
    background?: Record<string, any>;
    text?: Record<string, any>;
    validUntil?:
      | string
      | {
          future: { days?: number; months?: number; years?: number };
          start?: 'issuance' | 'validFrom';
        };
  }) {
    let res = await this.api.post(this.projectUrl('/templates/credentials/mdoc'), data);
    return res.data;
  }

  async createAnonCredsCredentialTemplate(data: {
    name: string;
    schema?: string;
    attributes: Record<string, any>;
    issuer?: Record<string, any>;
    description?: string;
    revocable?: boolean;
    background?: Record<string, any>;
    text?: Record<string, any>;
  }) {
    let res = await this.api.post(this.projectUrl('/templates/credentials/anoncreds'), data);
    return res.data;
  }

  async updateCredentialTemplate(templateId: string, data: Record<string, any>) {
    let res = await this.api.patch(
      this.projectUrl(`/templates/credentials/${encodeURIComponent(templateId)}`),
      data
    );
    return res.data;
  }

  // ─── Presentation Templates ───

  async listPresentationTemplates(params?: PaginationParams) {
    let res = await this.api.get(this.projectUrl('/templates/presentations'), {
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getPresentationTemplate(templateId: string) {
    let res = await this.api.get(
      this.projectUrl(`/templates/presentations/${encodeURIComponent(templateId)}`)
    );
    return res.data;
  }

  async createPresentationTemplate(data: {
    name: string;
    description: string;
    credentials: Record<string, any>[];
    verifier?: Record<string, any>;
  }) {
    let res = await this.api.post(this.projectUrl('/templates/presentations'), data);
    return res.data;
  }

  async updatePresentationTemplate(templateId: string, data: Record<string, any>) {
    let res = await this.api.put(
      this.projectUrl(`/templates/presentations/${encodeURIComponent(templateId)}`),
      data
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
    let res = await this.api.post(this.projectUrl('/openid4vc/issuance/offer'), data);
    return res.data;
  }

  async listOpenId4VcIssuances(params?: PaginationParams) {
    let res = await this.api.get(this.projectUrl('/openid4vc/issuance'), {
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getOpenId4VcIssuance(issuanceId: string) {
    let res = await this.api.get(
      this.projectUrl(`/openid4vc/issuance/${encodeURIComponent(issuanceId)}`)
    );
    return res.data;
  }

  // ─── Direct Issuance ───

  async directIssueSdJwtVc(data: {
    credentialTemplateId: string;
    attributes?: Record<string, any>;
  }) {
    let res = await this.api.post(this.projectUrl('/issuance/sd-jwt-vc'), {
      credential: data
    });
    return res.data;
  }

  // ─── OpenID4VC Verification ───

  async createOpenId4VcVerification(data: {
    presentationTemplateId: string;
    expirationInMinutes?: number;
    requireResponseEncryption?: boolean;
  }) {
    let res = await this.api.post(this.projectUrl('/openid4vc/verification/request'), data);
    return res.data;
  }

  async listOpenId4VcVerifications(params?: PaginationParams) {
    let res = await this.api.get(this.projectUrl('/openid4vc/verification'), {
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getOpenId4VcVerification(verificationId: string) {
    let res = await this.api.get(
      this.projectUrl(`/openid4vc/verification/${encodeURIComponent(verificationId)}`)
    );
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
    let res = await this.api.post(this.projectUrl('/didcomm/issuance/offer'), data);
    return res.data;
  }

  async listDidcommIssuances(params?: PaginationParams) {
    let res = await this.api.get(this.projectUrl('/didcomm/issuance'), {
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getDidcommIssuance(issuanceId: string) {
    let res = await this.api.get(
      this.projectUrl(`/didcomm/issuance/${encodeURIComponent(issuanceId)}`)
    );
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
    let res = await this.api.post(this.projectUrl('/didcomm/verification/request'), data);
    return res.data;
  }

  async listDidcommVerifications(params?: PaginationParams) {
    let res = await this.api.get(this.projectUrl('/didcomm/verification'), {
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getDidcommVerification(verificationId: string) {
    let res = await this.api.get(
      this.projectUrl(`/didcomm/verification/${encodeURIComponent(verificationId)}`)
    );
    return res.data;
  }

  // ─── DIDComm Connections ───

  async listDidcommConnections(params?: PaginationParams) {
    let res = await this.api.get(this.projectUrl('/didcomm/connections'), {
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getDidcommConnection(connectionId: string) {
    let res = await this.api.get(
      this.projectUrl(`/didcomm/connections/${encodeURIComponent(connectionId)}`)
    );
    return res.data;
  }

  async updateDidcommConnection(connectionId: string, data: { displayName: string }) {
    let res = await this.api.post(
      this.projectUrl(`/didcomm/connections/${encodeURIComponent(connectionId)}`),
      data
    );
    return res.data;
  }

  async createDidcommInvitation(data: {
    reusable?: boolean;
    did?: string;
    goal?: { description: string; code?: string };
  }) {
    let res = await this.api.post(
      this.projectUrl('/didcomm/invitations/create-connection'),
      data
    );
    return res.data;
  }

  async listDidcommInvitations(params?: PaginationParams) {
    let res = await this.api.get(this.projectUrl('/didcomm/invitations'), {
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async receiveDidcommInvitation(data: { didcommInvitation: string; displayName?: string }) {
    let res = await this.api.post(this.projectUrl('/didcomm/invitations/receive'), data);
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
    let res = await this.api.get(this.projectUrl('/issuance'), {
      params: query
    });
    return res.data;
  }

  async batchRevokeCredentials(data: {
    issuedCredentialIds: string[];
    notifyWallet?: boolean;
  }) {
    let res = await this.api.post(this.projectUrl('/revocation/batch'), data);
    return res.data;
  }

  // ─── Trusted Entities ───

  async listTrustedEntities(params?: PaginationParams) {
    let res = await this.api.get(this.projectUrl('/trusted-entities'), {
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getTrustedEntity(entityId: string) {
    let res = await this.api.get(
      this.projectUrl(`/trusted-entities/${encodeURIComponent(entityId)}`)
    );
    return res.data;
  }

  async createTrustedEntity(data: {
    name: string;
    dids?: { did: string }[];
    certificates?: { certificate: string }[];
  }) {
    let res = await this.api.post(this.projectUrl('/trusted-entities'), data);
    return res.data;
  }

  async updateTrustedEntity(entityId: string, data: Record<string, any>) {
    let res = await this.api.put(
      this.projectUrl(`/trusted-entities/${encodeURIComponent(entityId)}`),
      data
    );
    return res.data;
  }

  // ─── Attribute Providers ───

  async listAttributeProviders(params?: PaginationParams) {
    let res = await this.api.get(this.projectUrl('/attribute-providers'), {
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async createAttributeProvider(data: {
    name: string;
    url: string;
    credentialTemplateId: string;
  }) {
    let res = await this.api.post(this.projectUrl('/attribute-providers'), data);
    return res.data;
  }

  // ─── DIDs ───

  async listDids(params?: PaginationParams) {
    let res = await this.api.get(this.projectUrl('/dids'), {
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  // ─── Webhooks ───

  async createWebhook(data: { name: string; url: string; eventTypes: string[] }) {
    let res = await this.api.post(this.projectUrl('/webhooks'), data);
    return res.data;
  }

  async listWebhooks(params?: PaginationParams) {
    let res = await this.api.get(this.projectUrl('/webhooks'), {
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async deleteWebhook(webhookId: string) {
    let res = await this.api.delete(
      this.projectUrl(`/webhooks/${encodeURIComponent(webhookId)}`)
    );
    return res.data;
  }

  // ─── Helpers ───

  private paginationQuery(params?: PaginationParams): Record<string, any> {
    let query: Record<string, any> = {};
    if (params?.pageSize !== undefined) {
      if (!Number.isInteger(params.pageSize) || params.pageSize < 1) {
        throw createApiServiceError('pageSize must be a positive integer.');
      }
      query['page[size]'] = params.pageSize;
    }
    if (params?.pageAfter && params.pageBefore) {
      throw createApiServiceError('Provide only one of pageAfter or pageBefore.');
    }
    if (params?.pageAfter) query['page[after]'] = params.pageAfter;
    if (params?.pageBefore) query['page[before]'] = params.pageBefore;
    return query;
  }
}
