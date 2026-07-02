import { createAxios } from 'slates';

export class NpmRegistryClient {
  private http;

  constructor(config: { token?: string }) {
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (config.token) {
      headers.Authorization = `Bearer ${config.token}`;
    }

    this.http = createAxios({
      baseURL: 'https://registry.npmjs.org',
      headers
    });
  }

  // --- Package Metadata ---

  async getPackageMetadata(
    packageName: string,
    options?: { abbreviated?: boolean }
  ): Promise<any> {
    let headers: Record<string, string> = {};
    if (options?.abbreviated) {
      headers.Accept = 'application/vnd.npm.install-v1+json';
    }
    let res = await this.http.get(`/${encodePackageName(packageName)}`, { headers });
    return res.data;
  }

  async getPackageVersion(packageName: string, version: string): Promise<any> {
    let res = await this.http.get(`/${encodePackageName(packageName)}/${version}`);
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
  }): Promise<any> {
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

  async addDistTag(packageName: string, tag: string, version: string): Promise<void> {
    await this.http.put(
      `/-/package/${encodePackageName(packageName)}/dist-tags/${encodeURIComponent(tag)}`,
      JSON.stringify(version),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  async removeDistTag(packageName: string, tag: string): Promise<void> {
    await this.http.delete(
      `/-/package/${encodePackageName(packageName)}/dist-tags/${encodeURIComponent(tag)}`
    );
  }

  // --- Deprecate ---

  async deprecatePackageVersion(
    packageName: string,
    version: string,
    message: string
  ): Promise<void> {
    let metadata = await this.getPackageMetadata(packageName);
    let versionData = metadata.versions?.[version];
    if (!versionData) {
      throw new Error(`Version ${version} not found for package ${packageName}`);
    }
    versionData.deprecated = message;

    await this.http.put(`/${encodePackageName(packageName)}`, {
      _id: metadata._id,
      _rev: metadata._rev,
      name: metadata.name,
      versions: {
        [version]: versionData
      }
    });
  }

  // --- Token Management ---

  async listTokens(page?: number, perPage?: number): Promise<any> {
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
    bypass2fa?: boolean;
    otp?: string;
  }): Promise<any> {
    let headers: Record<string, string> = {};
    if (params.otp) {
      headers['npm-otp'] = params.otp;
    }

    let body: Record<string, any> = {
      password: params.password
    };
    if (params.name) body.name = params.name;
    if (params.description) body.token_description = params.description;
    if (params.expires) body.expires = params.expires;
    if (params.cidrWhitelist) body.cidr_whitelist = params.cidrWhitelist;
    if (params.packages) body.packages = params.packages;
    if (params.scopes) body.scopes = params.scopes;
    if (params.orgs) body.orgs = params.orgs;
    if (params.permission) body.permission = params.permission;
    if (params.bypass2fa !== undefined) body.bypass_2fa = params.bypass2fa;

    let res = await this.http.post('/-/npm/v1/tokens', body, { headers });
    return res.data;
  }

  async deleteToken(tokenKey: string, otp?: string): Promise<void> {
    let headers: Record<string, string> = {};
    if (otp) {
      headers['npm-otp'] = otp;
    }
    await this.http.delete(`/-/npm/v1/tokens/token/${tokenKey}`, { headers });
  }

  // --- Trusted Publishers ---

  async getTrustedPublishers(packageName: string, otp?: string): Promise<any> {
    let headers: Record<string, string> = {};
    if (otp) {
      headers['npm-otp'] = otp;
    }
    let res = await this.http.get(`/-/package/${encodePackageName(packageName)}/trust`, {
      headers
    });
    return res.data;
  }

  async addTrustedPublisher(
    packageName: string,
    configurations: any[],
    otp?: string
  ): Promise<any> {
    let headers: Record<string, string> = {};
    if (otp) {
      headers['npm-otp'] = otp;
    }
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
    let headers: Record<string, string> = {};
    if (otp) {
      headers['npm-otp'] = otp;
    }
    await this.http.delete(
      `/-/package/${encodePackageName(packageName)}/trust/${configurationId}`,
      { headers }
    );
  }

  // --- User Profile ---

  async getUserProfile(): Promise<any> {
    let res = await this.http.get('/-/npm/v1/user');
    return res.data;
  }
}

export class NpmDownloadsClient {
  private http;

  constructor() {
    this.http = createAxios({
      baseURL: 'https://api.npmjs.org'
    });
  }

  async getPointDownloads(period: string, packageName?: string): Promise<any> {
    let path = packageName
      ? `/downloads/point/${period}/${encodePackageName(packageName)}`
      : `/downloads/point/${period}`;
    let res = await this.http.get(path);
    return res.data;
  }

  async getRangeDownloads(period: string, packageName?: string): Promise<any> {
    let path = packageName
      ? `/downloads/range/${period}/${encodePackageName(packageName)}`
      : `/downloads/range/${period}`;
    let res = await this.http.get(path);
    return res.data;
  }

  async getBulkPointDownloads(period: string, packages: string[]): Promise<any> {
    let joined = packages.join(',');
    let res = await this.http.get(`/downloads/point/${period}/${joined}`);
    return res.data;
  }

  async getBulkRangeDownloads(period: string, packages: string[]): Promise<any> {
    let joined = packages.join(',');
    let res = await this.http.get(`/downloads/range/${period}/${joined}`);
    return res.data;
  }

  async getVersionDownloads(packageName: string): Promise<any> {
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
