import { createApiServiceError, createAuthenticatedAxios } from 'slates';
import { npmApiError } from './errors';
import { record } from './response';

export class NpmRegistryClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  private secrets: (string | undefined)[] = [];

  constructor(config: { token?: string }) {
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (config.token) {
      headers.Authorization = `Bearer ${config.token}`;
    }

    this.secrets = [config.token];
    this.http = createAuthenticatedAxios({
      baseURL: 'https://registry.npmjs.org',
      headers,
      errorAdapter: error => npmApiError(error, this.secrets)
    });
  }

  // --- Package Metadata ---

  async getPackageMetadata(
    packageName: string,
    options?: { abbreviated?: boolean; write?: boolean }
  ): Promise<unknown> {
    let headers: Record<string, string> = {};
    if (options?.abbreviated) {
      headers.Accept = 'application/vnd.npm.install-v1+json';
    }
    let res = await this.http.get(`/${encodePackageName(packageName)}`, {
      headers,
      params: options?.write ? { write: true } : undefined
    });
    return res.data;
  }

  async getPackageVersion(packageName: string, version: string): Promise<unknown> {
    let res = await this.http.get(
      `/${encodePackageName(packageName)}/${encodeURIComponent(version)}`
    );
    return res.data;
  }

  // --- Package Search ---

  async searchPackages(params: {
    text: string;
    size?: number;
    from?: number;
    quality?: number;
    popularity?: number;
    maintenance?: number;
  }): Promise<unknown> {
    let query: Record<string, string | number> = { text: params.text };
    if (params.size !== undefined) query.size = params.size;
    if (params.from !== undefined) query.from = params.from;
    if (params.quality !== undefined) query.quality = params.quality;
    if (params.popularity !== undefined) query.popularity = params.popularity;
    if (params.maintenance !== undefined) query.maintenance = params.maintenance;

    let res = await this.http.get('/-/v1/search', { params: query });
    return res.data;
  }

  // --- Dist-Tags ---

  async getDistTags(packageName: string): Promise<Record<string, string>> {
    let res = await this.http.get(`/-/package/${encodePackageName(packageName)}/dist-tags`);
    return res.data;
  }

  async addDistTag(
    packageName: string,
    tag: string,
    version: string,
    otp?: string
  ): Promise<void> {
    this.requireAuthentication();
    await this.http.put(
      `/-/package/${encodePackageName(packageName)}/dist-tags/${encodeURIComponent(tag)}`,
      JSON.stringify(version),
      { headers: this.otpHeaders(otp) }
    );
  }

  async removeDistTag(packageName: string, tag: string, otp?: string): Promise<void> {
    this.requireAuthentication();
    await this.http.delete(
      `/-/package/${encodePackageName(packageName)}/dist-tags/${encodeURIComponent(tag)}`,
      { headers: this.otpHeaders(otp) }
    );
  }

  // --- Deprecate ---

  async deprecatePackageVersion(
    packageName: string,
    version: string,
    message: string,
    otp?: string
  ): Promise<void> {
    this.requireAuthentication();
    let metadata = record(
      await this.getPackageMetadata(packageName, { write: true }),
      'package metadata'
    );
    let versions = record(metadata.versions, 'package versions');
    if (!Object.hasOwn(versions, version)) {
      throw createApiServiceError(
        `Version ${version} was not found for package ${packageName}.`
      );
    }
    let versionData = record(versions[version], 'package version');
    await this.http.put(
      `/${encodePackageName(packageName)}`,
      {
        ...metadata,
        versions: { ...versions, [version]: { ...versionData, deprecated: message } }
      },
      { headers: this.otpHeaders(otp) }
    );
  }

  private requireAuthentication() {
    if (!this.secrets[0])
      throw createApiServiceError(
        'Connect an npm account with a valid token to use this operation.'
      );
  }

  private otpHeaders(otp?: string): Record<string, string> {
    this.secrets.push(otp);
    return otp ? { 'npm-otp': otp } : {};
  }

  // --- Token Management ---

  async listTokens(page?: number, perPage?: number): Promise<unknown> {
    this.requireAuthentication();
    let params: Record<string, number> = {};
    if (page !== undefined) params.page = page;
    if (perPage !== undefined) params.perPage = perPage;

    let res = await this.http.get('/-/npm/v1/tokens', { params });
    return res.data;
  }

  async createToken(params: {
    password: string;
    name?: string;
    description?: string;
    expires?: string;
    cidrWhitelist?: string[];
    packages?: string[];
    scopes?: string[];
    orgs?: string[];
    permission?: 'read-only' | 'read-write';
    orgPermission?: 'read-only' | 'read-write' | 'no-access';
    bypass2fa?: boolean;
    otp?: string;
  }): Promise<unknown> {
    this.requireAuthentication();
    this.secrets.push(params.password, params.otp);
    let headers = this.otpHeaders(params.otp);

    let body: Record<string, unknown> = {
      password: params.password
    };
    if (params.name) body.name = params.name;
    if (params.description) body.token_description = params.description;
    if (params.expires) {
      let days = /^(\d+)d$/.exec(params.expires);
      body.expires = days ? Number(days[1]) : params.expires;
    }
    if (params.cidrWhitelist) body.cidr = params.cidrWhitelist;
    if (params.packages) body.packages = params.packages;
    if (params.scopes) body.scopes = params.scopes;
    if (params.orgs) body.orgs = params.orgs;
    if (params.permission) body.packages_and_scopes_permission = params.permission;
    if (params.orgPermission) body.orgs_permission = params.orgPermission;
    if (params.bypass2fa !== undefined) body.bypass_2fa = params.bypass2fa;

    let res = await this.http.post('/-/npm/v1/tokens', body, { headers });
    return res.data;
  }

  async deleteToken(tokenKey: string, otp?: string): Promise<void> {
    this.requireAuthentication();
    let headers = this.otpHeaders(otp);
    this.secrets.push(tokenKey);
    await this.http.delete(`/-/npm/v1/tokens/token/${encodeURIComponent(tokenKey)}`, {
      headers
    });
  }

  // --- Trusted Publishers ---

  async getTrustedPublishers(packageName: string, otp?: string): Promise<unknown> {
    this.requireAuthentication();
    let headers = this.otpHeaders(otp);
    let res = await this.http.get(`/-/package/${encodePackageName(packageName)}/trust`, {
      headers
    });
    return res.data;
  }

  async addTrustedPublisher(
    packageName: string,
    configurations: Record<string, unknown>[],
    otp?: string
  ): Promise<unknown> {
    this.requireAuthentication();
    let headers = this.otpHeaders(otp);
    let res = await this.http.post(
      `/-/package/${encodePackageName(packageName)}/trust`,
      configurations,
      { headers }
    );
    return res.data;
  }

  async deleteTrustedPublisher(
    packageName: string,
    configurationId: string,
    otp?: string
  ): Promise<void> {
    this.requireAuthentication();
    let headers = this.otpHeaders(otp);
    await this.http.delete(
      `/-/package/${encodePackageName(packageName)}/trust/${encodeURIComponent(configurationId)}`,
      { headers }
    );
  }

  async getSecurityAdvisories(packages: Record<string, string[]>): Promise<unknown> {
    let res = await this.http.post('/-/npm/v1/security/advisories/bulk', packages);
    return res.data;
  }

  // --- User Profile ---

  async getUserProfile(): Promise<unknown> {
    this.requireAuthentication();
    let res = await this.http.get('/-/npm/v1/user');
    return res.data;
  }
}

export class NpmDownloadsClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor() {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.npmjs.org',
      errorAdapter: error => npmApiError(error)
    });
  }

  async getPointDownloads(period: string, packageName?: string): Promise<unknown> {
    let path = packageName
      ? `/downloads/point/${encodeURIComponent(period)}/${encodePackageName(packageName)}`
      : `/downloads/point/${encodeURIComponent(period)}`;
    let res = await this.http.get(path);
    return res.data;
  }

  async getRangeDownloads(period: string, packageName?: string): Promise<unknown> {
    let path = packageName
      ? `/downloads/range/${encodeURIComponent(period)}/${encodePackageName(packageName)}`
      : `/downloads/range/${encodeURIComponent(period)}`;
    let res = await this.http.get(path);
    return res.data;
  }

  async getBulkPointDownloads(period: string, packages: string[]): Promise<unknown> {
    let joined = packages.map(encodePackageName).join(',');
    let res = await this.http.get(`/downloads/point/${encodeURIComponent(period)}/${joined}`);
    return res.data;
  }

  async getBulkRangeDownloads(period: string, packages: string[]): Promise<unknown> {
    let joined = packages.map(encodePackageName).join(',');
    let res = await this.http.get(`/downloads/range/${encodeURIComponent(period)}/${joined}`);
    return res.data;
  }

  async getVersionDownloads(packageName: string): Promise<unknown> {
    let res = await this.http.get(`/versions/${encodePackageName(packageName)}/last-week`);
    return res.data;
  }
}

/**
 * Encode scoped package names for use in URL paths.
 * Scoped packages like @scope/name need the / encoded.
 */
export let encodePackageName = (name: string): string => {
  if (name.startsWith('@')) {
    return `@${encodeURIComponent(name.slice(1))}`;
  }
  return encodeURIComponent(name);
};
