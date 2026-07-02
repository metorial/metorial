import { createAxios } from 'slates';

export class IgnisignClient {
  private http: ReturnType<typeof createAxios>;
  private appId: string;
  private appEnv: string;

  constructor(config: { token: string; appId: string; appEnv: string }) {
    this.appId = config.appId;
    this.appEnv = config.appEnv;
    this.http = createAxios({
      baseURL: 'https://api.ignisign.io',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private get basePath(): string {
    return `/v4/applications/${this.appId}/envs/${this.appEnv}`;
  }

  // ── Application ──

  async getApplicationContext(): Promise<any> {
    let response = await this.http.get(`/v4/applications/${this.appId}/context`);
    return response.data;
  }

  // ── Signature Profiles ──

  async listSignatureProfiles(): Promise<any[]> {
    let response = await this.http.get(`${this.basePath}/signature-profiles`);
    return response.data;
  }

  async getSignatureProfile(signatureProfileId: string): Promise<any> {
    let response = await this.http.get(
      `${this.basePath}/signature-profiles/${signatureProfileId}`
    );
    return response.data;
  }

  // ── Signer Profiles ──

  async listSignerProfiles(): Promise<any[]> {
    let response = await this.http.get(`${this.basePath}/signer-profiles`);
    return response.data;
  }

  async getSignerProfile(signerProfileId: string): Promise<any> {
    let response = await this.http.get(`${this.basePath}/signer-profiles/${signerProfileId}`);
    return response.data;
  }

  async getSignerProfileInputsNeeded(signerProfileId: string): Promise<any> {
    let response = await this.http.get(
      `${this.basePath}/signer-profiles/${signerProfileId}/inputs-needed`
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
    let response = await this.http.get(`${this.basePath}/signers/${signerId}`);
    return response.data;
  }

  async getSignerDetails(signerId: string): Promise<any> {
    let response = await this.http.get(`${this.basePath}/signers/${signerId}/details`);
    return response.data;
  }

  async updateSigner(signerId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.put(`${this.basePath}/signers/${signerId}`, data);
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
    let response = await this.http.delete(`${this.basePath}/signers/${signerId}/revoke`);
    return response.data;
  }

  // ── Signature Requests ──

  async initSignatureRequest(signatureProfileId?: string): Promise<any> {
    let body = signatureProfileId ? { signatureProfileId } : {};
    let response = await this.http.post(`${this.basePath}/signature-requests`, body);
    return response.data;
  }

  async getSignatureRequestContext(signatureRequestId: string): Promise<any> {
    let response = await this.http.get(`/v4/signature-requests/${signatureRequestId}/context`);
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
    let response = await this.http.put(`/v4/signature-requests/${signatureRequestId}`, data);
    return response.data;
  }

  async publishSignatureRequest(signatureRequestId: string): Promise<any> {
    let response = await this.http.post(
      `/v4/signature-requests/${signatureRequestId}/publish`
    );
    return response.data;
  }

  async closeSignatureRequest(signatureRequestId: string): Promise<any> {
    let response = await this.http.post(`/v4/signature-requests/${signatureRequestId}/close`);
    return response.data;
  }

  async listSignatureRequests(page?: number): Promise<any> {
    let response = await this.http.get(`${this.basePath}/signature-requests`, {
      params: page !== undefined ? { page } : undefined
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
    let response = await this.http.post(`${this.basePath}/init-documents`, data);
    return response.data;
  }

  async getDocument(documentId: string): Promise<any> {
    let response = await this.http.get(`/v4/documents/${documentId}`);
    return response.data;
  }

  async getDocumentContext(documentId: string): Promise<any> {
    let response = await this.http.get(`/v4/documents/${documentId}/context`);
    return response.data;
  }

  async updateDocument(documentId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.put(`/v4/documents/${documentId}`, data);
    return response.data;
  }

  async deleteDocument(documentId: string): Promise<any> {
    let response = await this.http.delete(`/v4/documents/${documentId}`);
    return response.data;
  }

  async uploadDocumentFile(
    documentId: string,
    fileContent: string,
    fileName: string,
    contentType: string
  ): Promise<any> {
    let response = await this.http.post(`/v4/documents/${documentId}/file`, fileContent, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
    return response.data;
  }

  async uploadDocumentDataJson(documentId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.post(`/v4/documents/${documentId}/data-json-content`, data);
    return response.data;
  }

  // ── Signature Proofs ──

  async getSignatureProof(documentId: string): Promise<any> {
    let response = await this.http.get(`/v4/documents/${documentId}/signature-proof`, {
      responseType: 'arraybuffer'
    });
    return response.data;
  }

  async getSignatureImages(documentId: string): Promise<any> {
    let response = await this.http.get(`/v4/documents/${documentId}/img-signatures`);
    return response.data;
  }

  async getLowLevelSignatureProof(
    documentId: string,
    signatureType: string,
    signerId: string
  ): Promise<any> {
    let response = await this.http.get(
      `/v4/documents/${documentId}/signatures/${signatureType}/signers/${signerId}`,
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
    let response = await this.http.post(`${this.basePath}/m2m/${m2mId}/sign`, data);
    return response.data;
  }

  // ── One-Call Sign ──

  async oneCallSign(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/v4/signature-requests/one-call-sign', data);
    return response.data;
  }
}
