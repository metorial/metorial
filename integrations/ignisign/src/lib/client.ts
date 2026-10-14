import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

export let getApiKeyScope = (token: string) => {
  if (!token.startsWith('skv2_')) return undefined;
  let [, environment, application, secret] = token.split('_');
  let appEnv = environment?.toUpperCase();
  if (
    !appEnv ||
    !application ||
    !secret ||
    !['DEVELOPMENT', 'STAGING', 'PRODUCTION'].includes(appEnv)
  ) {
    throw createApiServiceError(
      'The API key is invalid. Create a new API key in the IgniSign Console.'
    );
  }
  return { appId: `appId_${application}`, appEnv };
};

export class IgnisignClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  private appId: string;
  private appEnv: string;

  constructor(config: { token: string; appId?: string; appEnv?: string }) {
    let scope = getApiKeyScope(config.token);
    let appId = scope?.appId ?? config.appId;
    let appEnv = scope?.appEnv ?? config.appEnv;
    if (!appId || !appEnv) {
      throw createApiServiceError(
        'Reconnect with a current IgniSign API key to identify the application and environment.'
      );
    }
    this.appId = appId;
    this.appEnv = appEnv;
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.ignisign.io',
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'IgniSign',
          reason: 'The IgniSign API request failed'
        })
    });
  }

  private get basePath(): string {
    return `/v4/applications/${encodeURIComponent(this.appId)}/envs/${encodeURIComponent(this.appEnv)}`;
  }

  // ── Application ──

  async getApplicationContext(): Promise<any> {
    let response = await this.http.get(
      `/v4/applications/${encodeURIComponent(this.appId)}/context`
    );
    return response.data;
  }

  // ── Signature Profiles ──

  async listSignatureProfiles(): Promise<any[]> {
    let response = await this.http.get(`${this.basePath}/signature-profiles`);
    return response.data;
  }

  async getSignatureProfile(signatureProfileId: string): Promise<any> {
    let response = await this.http.get(
      `${this.basePath}/signature-profiles/${encodeURIComponent(signatureProfileId)}`
    );
    return response.data;
  }

  // ── Signer Profiles ──

  async listSignerProfiles(): Promise<any[]> {
    let response = await this.http.get(`${this.basePath}/signer-profiles`);
    return response.data;
  }

  async getSignerProfile(signerProfileId: string): Promise<any> {
    let response = await this.http.get(
      `${this.basePath}/signer-profiles/${encodeURIComponent(signerProfileId)}`
    );
    return response.data;
  }

  async getSignerProfileInputsNeeded(signerProfileId: string): Promise<any> {
    let response = await this.http.get(
      `${this.basePath}/signer-profiles/${encodeURIComponent(signerProfileId)}/inputs-needed`
    );
    return response.data;
  }

  // ── Signers ──

  async createSigner(data: {
    signerProfileId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    nationality?: string;
    birthDate?: string;
    birthPlace?: string;
    birthCountry?: string;
  }): Promise<any> {
    let response = await this.http.post(`${this.basePath}/signers`, data);
    return response.data;
  }

  async getSigner(signerId: string): Promise<any> {
    let response = await this.http.get(
      `${this.basePath}/signers/${encodeURIComponent(signerId)}`
    );
    return response.data;
  }

  async getSignerDetails(signerId: string): Promise<any> {
    let response = await this.http.get(
      `${this.basePath}/signers/${encodeURIComponent(signerId)}/details`
    );
    return response.data;
  }

  async updateSigner(signerId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.put(
      `${this.basePath}/signers/${encodeURIComponent(signerId)}`,
      data
    );
    return response.data;
  }

  async searchSigners(filter?: string): Promise<any> {
    let response = await this.http.post(
      `${this.basePath}/signers-search`,
      {},
      {
        params: filter ? { filter } : undefined
      }
    );
    return response.data;
  }

  async paginateSigners(page?: number): Promise<any> {
    let response = await this.http.get(`${this.basePath}/signers-paginate`, {
      params: page !== undefined ? { page } : undefined
    });
    return response.data;
  }

  async revokeSigner(signerId: string): Promise<any> {
    let response = await this.http.delete(
      `${this.basePath}/signers/${encodeURIComponent(signerId)}/revoke`
    );
    return response.data;
  }

  // ── Signature Requests ──

  async initSignatureRequest(signatureProfileId?: string): Promise<any> {
    let body = signatureProfileId ? { signatureProfileId } : {};
    let response = await this.http.post(`${this.basePath}/signature-requests`, body);
    return response.data;
  }

  async getSignatureRequestContext(signatureRequestId: string): Promise<any> {
    let response = await this.http.get(
      `/v4/signature-requests/${encodeURIComponent(signatureRequestId)}/context`
    );
    return response.data;
  }

  async updateSignatureRequest(
    signatureRequestId: string,
    data: {
      title?: string;
      description?: string;
      externalId?: string;
      documentIds?: string[];
      signerIds?: string[];
      language?: string;
      expirationDate?: string;
      expirationDateIsActivated?: boolean;
      diffusionMode?: string;
    }
  ): Promise<any> {
    let response = await this.http.put(
      `/v4/signature-requests/${encodeURIComponent(signatureRequestId)}`,
      data
    );
    return response.data;
  }

  async publishSignatureRequest(signatureRequestId: string): Promise<any> {
    let response = await this.http.post(
      `/v4/signature-requests/${encodeURIComponent(signatureRequestId)}/publish`
    );
    return response.data;
  }

  async closeSignatureRequest(signatureRequestId: string): Promise<any> {
    let response = await this.http.post(
      `/v4/signature-requests/${encodeURIComponent(signatureRequestId)}/close`
    );
    return response.data;
  }

  async listSignatureRequests(page?: number): Promise<any> {
    let response = await this.http.get(`${this.basePath}/signature-requests`, {
      params: page !== undefined ? { page } : undefined
    });
    return response.data;
  }

  async getSignatureRequestsStatus(signatureRequestIds: string[]): Promise<any> {
    let response = await this.http.post(`${this.basePath}/signature-requests/status`, {
      signatureRequestIds
    });
    return response.data;
  }

  // ── Documents ──

  async initDocument(data: {
    signatureRequestId: string;
    documentType?: string;
    title?: string;
    description?: string;
  }): Promise<any> {
    let response = await this.http.post(
      `${this.basePath}/init-documents`,
      pickDefined({
        signatureRequestId: data.signatureRequestId,
        label: data.title,
        description: data.description
      })
    );
    return response.data;
  }

  async getDocument(documentId: string): Promise<any> {
    let response = await this.http.get(`/v4/documents/${encodeURIComponent(documentId)}`);
    return response.data;
  }

  async getDocumentContext(documentId: string): Promise<any> {
    let response = await this.http.get(
      `/v4/documents/${encodeURIComponent(documentId)}/context`
    );
    return response.data;
  }

  async updateDocument(documentId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.put(
      `/v4/documents/${encodeURIComponent(documentId)}`,
      data
    );
    return response.data;
  }

  async deleteDocument(documentId: string): Promise<any> {
    let response = await this.http.delete(`/v4/documents/${encodeURIComponent(documentId)}`);
    return response.data;
  }

  async uploadDocumentFile(
    documentId: string,
    fileContent: string,
    fileName: string,
    contentType: string
  ): Promise<any> {
    let normalized = fileContent.replace(/\s/g, '');
    if (
      !normalized ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized) ||
      normalized.length % 4 === 1
    ) {
      throw createApiServiceError('Provide valid base64-encoded file content.');
    }
    let content = Buffer.from(normalized, 'base64');
    if (content.toString('base64').replace(/=+$/, '') !== normalized.replace(/=+$/, '')) {
      throw createApiServiceError('Provide valid base64-encoded file content.');
    }
    let form = new FormData();
    form.append('file', new Blob([content], { type: contentType }), fileName);
    let response = await this.http.post(
      `/v4/documents/${encodeURIComponent(documentId)}/file`,
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    );
    return response.data;
  }

  async uploadDocumentDataJson(documentId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.post(
      `/v4/documents/${encodeURIComponent(documentId)}/data-json-content`,
      { jsonContent: data }
    );
    return response.data;
  }

  // ── Signature Proofs ──

  async getSignatureProof(documentId: string, signatureType: string): Promise<any> {
    let response = await this.http.get(
      `/v4/documents/${encodeURIComponent(documentId)}/signature-type/${encodeURIComponent(signatureType)}`,
      {
        responseType: 'arraybuffer'
      }
    );
    return response.data;
  }

  async getSignatureImages(documentId: string): Promise<any> {
    let response = await this.http.get(
      `/v4/documents/${encodeURIComponent(documentId)}/img-signatures`
    );
    return response.data;
  }

  async getLowLevelSignatureProof(
    documentId: string,
    signatureType: string,
    signerId: string
  ): Promise<any> {
    let response = await this.http.get(
      `/v4/documents/${encodeURIComponent(documentId)}/signature-type/${encodeURIComponent(signatureType)}/signers/${encodeURIComponent(signerId)}`,
      {
        responseType: 'arraybuffer'
      }
    );
    return response.data;
  }

  // ── Webhooks ──

  async listWebhooks(): Promise<any[]> {
    let response = await this.http.get(`${this.basePath}/webhooks`);
    return response.data;
  }

  async createWebhook(data: { url: string; description?: string }): Promise<any> {
    let response = await this.http.post(`${this.basePath}/webhooks`, data);
    return response.data;
  }

  async updateWebhook(
    webhookId: string,
    data: { url?: string; description?: string }
  ): Promise<any> {
    let response = await this.http.put(`/v4/webhooks/${webhookId}`, data);
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<any> {
    let response = await this.http.delete(`/v4/webhooks/${webhookId}`);
    return response.data;
  }

  async listWebhookEvents(webhookId: string, page?: number, filter?: string): Promise<any> {
    let response = await this.http.get(`/v4/webhooks/${webhookId}/events`, {
      params: { ...(page !== undefined ? { page } : {}), ...(filter ? { filter } : {}) }
    });
    return response.data;
  }

  // ── M2M / E-Seal ──

  async signM2M(m2mId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.post(
      `${this.basePath}/m2m/${encodeURIComponent(m2mId)}/sign`,
      data
    );
    return response.data;
  }

  // ── One-Call Sign ──

  async oneCallSign(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/v4/signature-requests/one-call-sign', data);
    return response.data;
  }
}
