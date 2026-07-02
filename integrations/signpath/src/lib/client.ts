import { createAxios } from 'slates';

export interface SignPathClientConfig {
  token: string;
  organizationId: string;
  baseUrl: string;
}

export class SignPathClient {
  private axios: ReturnType<typeof createAxios>;
  private organizationId: string;

  constructor(config: SignPathClientConfig) {
    this.organizationId = config.organizationId;
    this.axios = createAxios({
      baseURL: `${config.baseUrl}/API/v1/${config.organizationId}`,
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  private get preAxios(): ReturnType<typeof createAxios> {
    let ax = createAxios({
      baseURL: `${this.axios.defaults.baseURL}`.replace('/API/v1/', '/API/v1-pre/'),
      headers: this.axios.defaults.headers as Record<string, string>
    });
    return ax;
  }

  // ============ Signing Requests ============

  async submitSigningRequest(params: {
    projectSlug: string;
    signingPolicySlug: string;
    artifactConfigurationSlug?: string;
    description?: string;
    isFastSigningRequest?: boolean;
    parameters?: Record<string, string>;
  }): Promise<{ signingRequestId: string; signingRequestUrl: string }> {
    let formData = new FormData();
    formData.append('ProjectSlug', params.projectSlug);
    formData.append('SigningPolicySlug', params.signingPolicySlug);

    if (params.artifactConfigurationSlug) {
      formData.append('ArtifactConfigurationSlug', params.artifactConfigurationSlug);
    }
    if (params.description) {
      formData.append('Description', params.description);
    }
    if (params.isFastSigningRequest) {
      formData.append('IsFastSigningRequest', 'true');
    }
    if (params.parameters) {
      for (let [key, value] of Object.entries(params.parameters)) {
        formData.append(`Parameters.${key}`, value);
      }
    }

    let response = await this.axios.post('/SigningRequests/SubmitWithArtifact', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    let locationHeader = response.headers.location as string;
    let signingRequestId = locationHeader?.split('/').pop() || '';

    return {
      signingRequestId,
      signingRequestUrl: locationHeader || ''
    };
  }

  async getSigningRequest(signingRequestId: string): Promise<SigningRequestData> {
    let response = await this.axios.get(`/SigningRequests/${signingRequestId}`);
    return response.data;
  }

  async downloadSignedArtifact(signingRequestId: string): Promise<{ downloadUrl: string }> {
    return {
      downloadUrl: `${this.axios.defaults.baseURL}/SigningRequests/${signingRequestId}/SignedArtifact`
    };
  }

  async resubmitSigningRequest(params: {
    originalSigningRequestId: string;
    signingPolicySlug: string;
    description?: string;
  }): Promise<{ signingRequestId: string; signingRequestUrl: string }> {
    let formData = new FormData();
    formData.append('OriginalSigningRequestId', params.originalSigningRequestId);
    formData.append('SigningPolicySlug', params.signingPolicySlug);

    if (params.description) {
      formData.append('Description', params.description);
    }

    let response = await this.axios.post('/SigningRequests/Resubmit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    let locationHeader = response.headers.location as string;
    let signingRequestId = locationHeader?.split('/').pop() || '';

    return {
      signingRequestId,
      signingRequestUrl: locationHeader || ''
    };
  }

  async approveSigningRequest(signingRequestId: string): Promise<void> {
    await this.axios.post(`/SigningRequests/${signingRequestId}/Approve`, {});
  }

  async denySigningRequest(signingRequestId: string): Promise<void> {
    await this.axios.post(`/SigningRequests/${signingRequestId}/Deny`, {});
  }

  async listSigningRequests(): Promise<SigningRequestSummary[]> {
    let response = await this.preAxios.get('/SigningRequests');
    return response.data;
  }

  // ============ Projects ============

  async listProjects(): Promise<ProjectData[]> {
    let response = await this.axios.get('/Projects');
    return response.data;
  }

  async getProject(projectSlug: string): Promise<ProjectData> {
    let response = await this.axios.get(`/Projects/${projectSlug}`);
    return response.data;
  }

  // ============ Certificates ============

  async listCertificates(): Promise<CertificateData[]> {
    let response = await this.axios.get('/Certificates');
    return response.data;
  }

  async getCertificate(certificateSlug: string): Promise<CertificateData> {
    let response = await this.axios.get(`/Certificates/${certificateSlug}`);
    return response.data;
  }

  async getCertificateForSigningPolicy(
    projectSlug: string,
    signingPolicySlug: string
  ): Promise<CertificateInfo> {
    let response = await this.axios.get(
      `/Projects/${projectSlug}/SigningPolicies/${signingPolicySlug}/Certificate`
    );
    return response.data;
  }

  // ============ Signing Policies ============

  async getSigningPolicies(params?: {
    projectSlug?: string;
    signingPolicySlug?: string;
  }): Promise<SigningPolicyInfo[]> {
    let queryParams: Record<string, string> = {};
    if (params?.projectSlug) queryParams.projectSlug = params.projectSlug;
    if (params?.signingPolicySlug) queryParams.signingPolicySlug = params.signingPolicySlug;

    let response = await this.axios.get('/Cryptoki/MySigningPolicies', {
      params: queryParams
    });
    return Array.isArray(response.data) ? response.data : [response.data];
  }

  // ============ Audit Log ============

  async getAuditLogEvents(): Promise<AuditLogEvent[]> {
    let response = await this.preAxios.get('/AuditLog/Events');
    return response.data;
  }

  async getSigningRequestAuditLog(): Promise<AuditLogEvent[]> {
    let response = await this.preAxios.get('/AuditLog/SigningRequestEvents');
    return response.data;
  }
}

// ============ Type Definitions ============

export interface SigningRequestData {
  status: string;
  workflowStatus: string;
  isFinalStatus: boolean;
  description: string;
  projectSlug: string;
  projectName: string;
  artifactConfigurationSlug: string;
  artifactConfigurationName: string;
  signingPolicySlug: string;
  signingPolicyName: string;
  unsignedArtifactLink: string;
  signedArtifactLink: string;
  createdDate: string;
  parameters: Record<string, string>;
  origin: Record<string, unknown>;
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
  description: string;
  isActive: boolean;
  signingPolicies: Array<{
    slug: string;
    name: string;
    isActive: boolean;
    [key: string]: unknown;
  }>;
  artifactConfigurations: Array<{
    slug: string;
    name: string;
    isActive: boolean;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface CertificateData {
  slug: string;
  name: string;
  thumbprint: string;
  isActive: boolean;
  x509CertificateChain: string;
  [key: string]: unknown;
}

export interface CertificateInfo {
  thumbprint: string;
  commonName: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  [key: string]: unknown;
}

export interface SigningPolicyInfo {
  projectSlug: string;
  signingPolicySlug: string;
  certificate: {
    thumbprint: string;
    commonName: string;
    [key: string]: unknown;
  };
  rsaKeyParameters?: {
    modulusLengthInBits: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface AuditLogEvent {
  eventType: string;
  timestamp: string;
  metadata: {
    actor: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
