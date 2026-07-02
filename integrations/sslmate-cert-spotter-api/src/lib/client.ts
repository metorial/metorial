import { createAxios } from 'slates';

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
  private token: string;
  private ctSearchApi: ReturnType<typeof createAxios>;
  private monitoringApi: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.token = config.token;
    this.ctSearchApi = createAxios({
      baseURL: 'https://api.certspotter.com/v1',
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
    this.monitoringApi = createAxios({
      baseURL: 'https://sslmate.com/api/v3/monitoring',
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  // --- CT Search API ---

  async searchIssuances(query: IssuanceQuery): Promise<Issuance[]> {
    let params: Record<string, string> = {
      domain: query.domain
    };

    if (query.includeSubdomains) {
      params.include_subdomains = 'true';
    }
    if (query.matchWildcards) {
      params.match_wildcards = 'true';
    }
    if (query.after) {
      params.after = query.after;
    }

    let expandParams = '';
    if (query.expand && query.expand.length > 0) {
      expandParams = query.expand.map(e => `&expand=${encodeURIComponent(e)}`).join('');
    }

    let queryString = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');

    let response = await this.ctSearchApi.get<Issuance[]>(
      `/issuances?${queryString}${expandParams}`
    );
    return response.data;
  }

  // --- Monitored Domains API ---

  async listMonitoredDomains(): Promise<MonitoredDomain[]> {
    let response = await this.monitoringApi.get<MonitoredDomain[]>('/monitored_domains');
    return response.data;
  }

  async getMonitoredDomain(name: string): Promise<MonitoredDomain> {
    let response = await this.monitoringApi.get<MonitoredDomain>(
      `/monitored_domains/${encodeURIComponent(name)}`
    );
    return response.data;
  }

  async upsertMonitoredDomain(
    name: string,
    settings: { enabled?: boolean }
  ): Promise<MonitoredDomain> {
    let response = await this.monitoringApi.post<MonitoredDomain>(
      `/monitored_domains/${encodeURIComponent(name)}`,
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
    await this.monitoringApi.delete(`/monitored_domains/${encodeURIComponent(name)}`);
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
