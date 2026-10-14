import { X509Certificate } from 'node:crypto';
import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  pickDefined
} from 'slates';

export interface SignPathClientConfig {
  token: string;
  organizationId: string;
  baseUrl: string;
}

interface SignPathContext {
  auth: { token: string; organizationId?: string; baseUrl?: string };
  config?: Record<string, unknown>;
}

export let createSignPathClient = (ctx: SignPathContext) => {
  let organizationId = ctx.auth.organizationId ?? ctx.config?.organizationId;
  let baseUrl = ctx.auth.baseUrl ?? ctx.config?.baseUrl ?? 'https://app.signpath.io';
  if (typeof organizationId !== 'string' || !organizationId.trim()) {
    throw createApiServiceError('Reconnect with your SignPath organization ID and API token.');
  }
  if (typeof baseUrl !== 'string') {
    throw createApiServiceError(
      'The SignPath instance URL is invalid. Reconnect your account.'
    );
  }
  return new SignPathClient({ token: ctx.auth.token, organizationId, baseUrl });
};

export class SignPathClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private preAxios: ReturnType<typeof createAuthenticatedAxios>;
  private baseUrl: string;

  constructor(config: SignPathClientConfig) {
    let instanceUrl: URL;
    try {
      instanceUrl = new URL(config.baseUrl);
    } catch {
      throw createApiServiceError('Provide a valid HTTPS URL for your SignPath instance.');
    }
    if (
      !['https:', 'http:'].includes(instanceUrl.protocol) ||
      instanceUrl.username ||
      instanceUrl.password ||
      instanceUrl.search ||
      instanceUrl.hash
    ) {
      throw createApiServiceError(
        'Provide an HTTP or HTTPS SignPath instance URL without credentials, query parameters, or a fragment.'
      );
    }
    let root = config.baseUrl.replace(/\/+$/, '');
    this.baseUrl = `${root}/Api/v1/${encodeURIComponent(config.organizationId)}`;
    let errorAdapter = (error: unknown) =>
      buildApiServiceError(error, { providerLabel: 'SignPath', reason: 'signpath_api_error' });
    let options = {
      authHeader: { value: `Bearer ${config.token}` },
      contentType: false as const,
      errorAdapter
    };
    this.axios = createAuthenticatedAxios({ ...options, baseURL: this.baseUrl });
    this.preAxios = createAuthenticatedAxios({
      ...options,
      baseURL: `${root}/Api/v1-pre/${encodeURIComponent(config.organizationId)}`
    });
  }

  async submitSigningRequest(params: {
    projectSlug: string;
    signingPolicySlug: string;
    artifactConfigurationSlug?: string;
    description?: string;
    artifact: Blob;
    artifactFilename: string;
    parameters?: Record<string, string>;
  }): Promise<{ signingRequestId: string; signingRequestUrl: string }> {
    let formData = new FormData();
    formData.append('projectSlug', params.projectSlug);
    formData.append('signingPolicySlug', params.signingPolicySlug);
    formData.append('artifact', params.artifact, params.artifactFilename);
    if (params.artifactConfigurationSlug !== undefined)
      formData.append('artifactConfigurationSlug', params.artifactConfigurationSlug);
    if (params.description !== undefined) formData.append('description', params.description);
    for (let [key, value] of Object.entries(params.parameters ?? {}))
      formData.append(`parameters.${key}`, value);
    let response = await this.axios.post<SigningRequestData>(
      '/SigningRequests/SubmitWithArtifact',
      formData
    );
    return this.createdRequest(
      response.data,
      getResponseHeaderValue(response.headers, 'location')
    );
  }

  async signHash(params: {
    projectSlug: string;
    signingPolicySlug: string;
    artifactConfigurationSlug?: string;
    description?: string;
    hashSigningData: HashSigningData;
  }): Promise<HashSigningResult> {
    let response = await this.axios.post<HashSigningResult>(
      '/SigningRequests/SignHash',
      pickDefined(params)
    );
    return response.data;
  }

  private createdRequest(
    data: { signingRequestId?: string; webLink?: string } | undefined,
    location?: string
  ) {
    let signingRequestUrl: string | undefined;
    let signingRequestId = data?.signingRequestId;
    try {
      signingRequestUrl = location
        ? new URL(location, `${this.baseUrl}/`).toString()
        : data?.webLink;
      if (!signingRequestId && signingRequestUrl)
        signingRequestId = new URL(signingRequestUrl).pathname
          .split('/')
          .filter(Boolean)
          .pop();
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'SignPath',
        reason: 'signpath_api_error',
        operation: 'read created signing request URL'
      });
    }
    if (!signingRequestId || !signingRequestUrl) {
      throw createApiServiceError(
        'SignPath created the request but did not return its ID and URL. Check the request list before retrying.'
      );
    }
    return { signingRequestId, signingRequestUrl };
  }

  async getSigningRequest(signingRequestId: string): Promise<SigningRequestData> {
    let response = await this.axios.get<SigningRequestData>(
      `/SigningRequests/${encodeURIComponent(signingRequestId)}`
    );
    return response.data;
  }

  async getSigningRequestStatus(signingRequestId: string): Promise<SigningRequestStatusData> {
    let response = await this.axios.get<SigningRequestStatusData>(
      `/SigningRequests/${encodeURIComponent(signingRequestId)}/Status`
    );
    return response.data;
  }

  async downloadSignedArtifact(signingRequestId: string): Promise<{ downloadUrl: string }> {
    return {
      downloadUrl: `${this.baseUrl}/SigningRequests/${encodeURIComponent(signingRequestId)}/SignedArtifact`
    };
  }

  async resubmitSigningRequest(params: {
    originalSigningRequestId: string;
    signingPolicySlug: string;
    description?: string;
    keepSnapshottedArtifactConfiguration?: boolean;
    cancellationTimeoutInSeconds?: number;
  }): Promise<{ signingRequestId: string; signingRequestUrl: string }> {
    let response = await this.axios.post('/SigningRequests/Resubmit', pickDefined(params));
    return this.createdRequest(
      response.data,
      getResponseHeaderValue(response.headers, 'location')
    );
  }

  async approveSigningRequest(signingRequestId: string): Promise<void> {
    await this.axios.post(`/SigningRequests/${encodeURIComponent(signingRequestId)}/Approve`);
  }

  async denySigningRequest(signingRequestId: string, denyReason?: string): Promise<void> {
    await this.axios.post(
      `/SigningRequests/${encodeURIComponent(signingRequestId)}/Deny`,
      pickDefined({ denyReason })
    );
  }

  async listSigningRequests(): Promise<SigningRequestSummary[]> {
    let response = await this.preAxios.get('/SigningRequests');
    return response.data;
  }

  async getCurrentUser(): Promise<CurrentUserData> {
    let response = await this.axios.get<CurrentUserData>('/Users/Me');
    return response.data;
  }

  async listProjects(): Promise<ProjectData[]> {
    let response = await this.axios.get<ProjectData[]>('/Projects');
    return response.data;
  }

  async getProject(projectSlug: string): Promise<ProjectData> {
    let response = await this.axios.get<ProjectData>(
      `/Projects/${encodeURIComponent(projectSlug)}`
    );
    return response.data;
  }

  async listCertificates(): Promise<CertificateData[]> {
    let response = await this.axios.get<CertificateData[]>('/Certificates');
    return response.data;
  }

  async getCertificate(certificateSlug: string): Promise<CertificateData> {
    let response = await this.axios.get<CertificateData>(
      `/Certificates/${encodeURIComponent(certificateSlug)}`
    );
    return response.data;
  }

  async getCertificateForSigningPolicy(
    projectSlug: string,
    signingPolicySlug: string
  ): Promise<CertificateData> {
    let response = await this.axios.get<CertificateData>(
      `/Projects/${encodeURIComponent(projectSlug)}/SigningPolicies/${encodeURIComponent(signingPolicySlug)}/Certificate`
    );
    return response.data;
  }

  async getCertificateThumbprint(certificate: CertificateData): Promise<string> {
    let thumbprint =
      certificate.thumbprint ??
      certificate.x509CertificateData?.x509CertificateChain?.[0]?.sha1Thumbprint;
    if (thumbprint) return thumbprint;
    if (certificate.status === 'CsrPending') return '';
    if (
      certificate.type !== 'X509' &&
      !certificate.x509CertificateData &&
      !certificate.x509Certificate
    )
      return '';
    let response = await this.axios.get<ArrayBuffer>(
      `/Certificates/${encodeURIComponent(certificate.slug)}/X509Certificate`,
      { responseType: 'arraybuffer', headers: { Accept: 'application/pkix-cert' } }
    );
    return this.certificateDetails(Buffer.from(response.data)).thumbprint;
  }

  certificateDetails(bytes: Buffer): { thumbprint: string; commonName: string } {
    try {
      let cert = new X509Certificate(bytes);
      return {
        thumbprint: cert.fingerprint.replaceAll(':', ''),
        commonName: cert.subject.match(/(?:^|\n)CN=(.*)/)?.[1] ?? ''
      };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'SignPath',
        reason: 'signpath_api_error',
        operation: 'read X.509 certificate'
      });
    }
  }

  async getSigningPolicies(params?: {
    projectSlug?: string;
    signingPolicySlug?: string;
  }): Promise<SigningPolicyInfo[]> {
    let response = await this.axios.get<{ signingPolicies: SigningPolicyInfo[] }>(
      '/Cryptoki/MySigningPolicies',
      { params: pickDefined(params ?? {}) }
    );
    return response.data.signingPolicies;
  }

  async getAuditLogEvents(params?: AuditLogParams): Promise<AuditLogResult> {
    let response = await this.preAxios.get<AuditLogResult>('/AuditLog/Events', {
      params: pickDefined(params ?? {})
    });
    return response.data;
  }

  async getSigningRequestAuditLog(params?: AuditLogParams): Promise<AuditLogResult> {
    let response = await this.preAxios.get<AuditLogResult>('/AuditLog/SigningRequestEvents', {
      params: pickDefined(params ?? {})
    });
    return response.data;
  }
}

export interface SigningRequestStatusData {
  signingRequestId: string;
  status: string;
  workflowStatus: string;
  isFinalStatus: boolean;
}

export interface SigningRequestData extends SigningRequestStatusData {
  webLink: string;
  description?: string | null;
  projectSlug: string;
  projectName: string;
  artifactConfigurationSlug: string;
  artifactConfigurationName: string;
  signingPolicySlug: string;
  signingPolicyName: string;
  unsignedArtifactLink?: string | null;
  signedArtifactLink?: string | null;
  createdDate?: string;
  parameters?: Record<string, string> | null;
  origin?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface SigningRequestSummary {
  signingRequestId: string;
  status: string;
  projectSlug: string;
  signingPolicySlug: string;
  createdDate: string;
  [key: string]: unknown;
}

export interface ProjectData {
  slug: string;
  name: string;
  description?: string | null;
  status: string;
  isActive?: boolean;
  signingPolicies: Array<{
    slug: string;
    name: string;
    status: string;
    isActive?: boolean;
    [key: string]: unknown;
  }>;
  artifactConfigurations?: Array<{
    slug: string;
    name: string;
    status: string;
    isActive?: boolean;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface CertificateData {
  certificateId: string;
  slug: string;
  name: string;
  status: string;
  type: string;
  thumbprint?: string;
  isActive?: boolean;
  x509CertificateData?: CertificateInfo | null;
  x509Certificate?: CertificateInfo | null;
  [key: string]: unknown;
}

export interface CertificateInfo {
  subjectNameParts?: { commonName: string };
  validFrom?: string | null;
  validTo?: string | null;
  x509CertificateChain?: Array<{
    issuer?: string | null;
    sha1Thumbprint?: string | null;
  }> | null;
  [key: string]: unknown;
}

export interface SigningPolicyInfo {
  projectSlug: string;
  signingPolicySlug: string;
  keySizeInBits: number;
  keyType: string;
  certificateBytes?: string | null;
  [key: string]: unknown;
}

export interface AuditLogEvent {
  metadata: {
    eventName: string;
    timestamp: string;
    actor: {
      id?: string | null;
      name?: string | null;
      identity?: string | null;
      type: string;
    };
    [key: string]: unknown;
  };
  entityMetadata: Record<string, unknown>;
  data: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AuditLogParams {
  cursor?: string;
  startTime?: string;
}
export interface AuditLogResult {
  auditLogEvents: AuditLogEvent[];
  pagination: { nextCursor?: string | null; nextLink?: string | null };
}
export interface CurrentUserData {
  userId: string;
  name: string;
  userType: string;
  role: string;
  status: string;
  identity?: string | null;
  accountEmailAddress?: string | null;
  notificationEmailAddress: {
    confirmedEmail?: string | null;
    unconfirmedEmail?: string | null;
  };
  isDirectorySynchronized: boolean;
}

export interface HashSigningData {
  hash: string;
  signatureAlgorithm: 'Rsa' | 'Ecdsa';
  rsaOptions?: {
    hashAlgorithmName?: 'Sha1' | 'Sha256' | 'Sha384' | 'Sha512';
    hashAlgorithmOid?: string;
    paddingMode: 'Pkcs1' | 'Pss';
  };
  ecdsaOptions?: { signatureFormat: 'Ieee' | 'Asn1' };
  metadata?: Record<string, unknown>;
}
export interface HashSigningResult {
  signingRequestId: string;
  webLink: string;
  hashSigningData: { hash: string };
  hashSigningResult: { signature: string };
}
