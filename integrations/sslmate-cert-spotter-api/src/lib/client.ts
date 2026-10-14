import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface IssuanceQuery {
  domain: string;
  includeSubdomains?: boolean;
  matchWildcards?: boolean;
  after?: string;
  expand?: string[];
}

export interface Issuance {
  id: string;
  tbs_sha256: string;
  cert_sha256: string;
  dns_names?: string[];
  pubkey_sha256: string;
  not_before: string;
  not_after: string;
  revoked: boolean | null;
  issuer?: IssuerInfo;
  revocation?: RevocationInfo;
  problem_reporting?: string | null;
  pubkey_der?: string;
  pubkey?: PubkeyInfo;
  cert_der?: string;
}

export interface IssuerInfo {
  friendly_name: string;
  website?: string | null;
  caa_domains?: string[] | null;
  operator?: OperatorInfo | null;
  name: string;
  pubkey_sha256: string;
}

export interface OperatorInfo {
  name: string;
  website?: string | null;
}

export interface RevocationInfo {
  time: string | null;
  reason: number | null;
  checked_at: string | null;
}

export interface PubkeyInfo {
  type: string;
  bit_length?: number;
  curve?: string;
}

export interface MonitoredDomain {
  name: string;
  enabled: boolean;
}

export class CertSpotterClient {
  private ctSearchApi: ReturnType<typeof createAuthenticatedAxios>;
  private monitoringApi: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    let token = config.token.trim();
    if (!token) {
      throw createApiServiceError('Connect an SSLMate account with an API key.');
    }
    let errorAdapter = (error: unknown) =>
      buildApiServiceError(error, {
        providerLabel: 'Cert Spotter',
        reason: 'cert_spotter_api_error',
        nestedKeys: ['sub_errors'],
        extractResponse: (failure, helpers) => {
          let response = helpers.getResponse(failure);
          if (
            helpers.isRecord(failure) &&
            failure.name === 'SlateError' &&
            helpers.isRecord(failure.data) &&
            helpers.isRecord(failure.data.baggage) &&
            failure.data.baggage.response !== undefined
          ) {
            return { ...response, data: failure.data.baggage.response };
          }
          return response;
        },
        extractUpstreamCode: (_failure, response, helpers) =>
          helpers.isRecord(response?.data) && typeof response.data.code === 'string'
            ? response.data.code
            : undefined
      });

    this.ctSearchApi = createAuthenticatedAxios({
      baseURL: 'https://api.certspotter.com/v1',
      authHeader: { value: `Bearer ${token}` },
      errorAdapter
    });
    this.monitoringApi = createAuthenticatedAxios({
      baseURL: 'https://sslmate.com/api/v3/monitoring',
      authHeader: { value: `Bearer ${token}` },
      errorAdapter
    });
  }

  // --- CT Search API ---

  async searchIssuances(query: IssuanceQuery): Promise<Issuance[]> {
    if (!query.domain.trim()) {
      throw createApiServiceError('Provide a domain name to search.');
    }
    let params = new URLSearchParams({ domain: query.domain });

    if (query.includeSubdomains) {
      params.set('include_subdomains', 'true');
    }
    if (query.matchWildcards) {
      params.set('match_wildcards', 'true');
    }
    if (query.after) {
      params.set('after', query.after);
    }

    let expansions = new Set(query.expand ?? []);
    if ([...expansions].some(field => field.startsWith('issuer.'))) {
      expansions.add('issuer');
    }
    for (let field of expansions) {
      params.append('expand', field);
    }

    let response = await this.ctSearchApi.get<Issuance[]>(`/issuances?${params}`);
    return response.data;
  }

  // --- Monitored Domains API ---

  async listMonitoredDomains(): Promise<MonitoredDomain[]> {
    let response = await this.monitoringApi.get<MonitoredDomain[]>('/monitored_domains');
    return response.data;
  }

  async getMonitoredDomain(name: string): Promise<MonitoredDomain> {
    let response = await this.monitoringApi.get<MonitoredDomain>(
      this.monitoredDomainPath(name)
    );
    return response.data;
  }

  async upsertMonitoredDomain(
    name: string,
    settings: { enabled?: boolean }
  ): Promise<MonitoredDomain> {
    let response = await this.monitoringApi.post<MonitoredDomain>(
      this.monitoredDomainPath(name),
      settings,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }

  async deleteMonitoredDomain(name: string): Promise<void> {
    await this.monitoringApi.delete(this.monitoredDomainPath(name));
  }

  private monitoredDomainPath(name: string) {
    if (!name.trim()) {
      throw createApiServiceError('Provide a monitored domain name.');
    }
    return `/monitored_domains/${encodeURIComponent(name)}`;
  }

  // --- Authorization API ---

  async authorizeCertificate(pemCertificate: string): Promise<void> {
    await this.monitoringApi.post('/known_certs', pemCertificate, {
      headers: {
        'Content-Type': 'application/x-pem-file'
      }
    });
  }

  async authorizePublicKeyByCSR(pemCSR: string): Promise<void> {
    await this.monitoringApi.post('/known_keys', pemCSR, {
      headers: {
        'Content-Type': 'application/x-pem-file'
      }
    });
  }

  async authorizePublicKeyByHash(pubkeySha256: string, dnsNames: string[]): Promise<void> {
    await this.monitoringApi.post(
      '/known_keys',
      {
        pubkey_sha256: pubkeySha256,
        dns_names: dnsNames
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
