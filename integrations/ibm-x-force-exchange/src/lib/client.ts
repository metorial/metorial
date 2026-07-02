import { createAxios } from 'slates';

export class XForceClient {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string; password: string }) {
    this.http = createAxios({
      baseURL: 'https://api.xforce.ibmcloud.com',
      auth: {
        username: config.token,
        password: config.password
      },
      headers: {
        Accept: 'application/json'
      }
    });
  }

  // ---- IP Reputation ----

  async getIpReport(ip: string): Promise<any> {
    let res = await this.http.get(`/ipr/${encodeURIComponent(ip)}`);
    return res.data;
  }

  async getIpHistory(ip: string): Promise<any> {
    let res = await this.http.get(`/ipr/history/${encodeURIComponent(ip)}`);
    return res.data;
  }

  async getIpMalware(ip: string): Promise<any> {
    let res = await this.http.get(`/ipr/malware/${encodeURIComponent(ip)}`);
    return res.data;
  }

  // ---- URL Reputation ----

  async getUrlReport(url: string): Promise<any> {
    let res = await this.http.get(`/url/${encodeURIComponent(url)}`);
    return res.data;
  }

  async getUrlHistory(url: string): Promise<any> {
    let res = await this.http.get(`/url/history/${encodeURIComponent(url)}`);
    return res.data;
  }

  async getUrlMalware(url: string): Promise<any> {
    let res = await this.http.get(`/url/malware/${encodeURIComponent(url)}`);
    return res.data;
  }

  // ---- Malware ----

  async getMalwareByHash(hash: string): Promise<any> {
    let res = await this.http.get(`/malware/${encodeURIComponent(hash)}`);
    return res.data;
  }

  async getMalwareFamily(family: string): Promise<any> {
    let res = await this.http.get(`/malware/family/${encodeURIComponent(family)}`);
    return res.data;
  }

  async searchMalwareFamily(query: string): Promise<any> {
    let res = await this.http.get(`/malware/familyext/${encodeURIComponent(query)}`);
    return res.data;
  }

  // ---- Vulnerabilities ----

  async getVulnerabilityByXfid(xfid: string): Promise<any> {
    let res = await this.http.get(`/vulnerabilities/${encodeURIComponent(xfid)}`);
    return res.data;
  }

  async searchVulnerabilities(query: string): Promise<any> {
    let res = await this.http.get(`/vulnerabilities/fulltext`, {
      params: { q: query }
    });
    return res.data;
  }

  async getRecentVulnerabilities(
    startDate?: string,
    endDate?: string,
    limit?: number
  ): Promise<any> {
    let params: Record<string, string | number> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (limit) params.limit = limit;
    let res = await this.http.get(`/vulnerabilities`, { params });
    return res.data;
  }

  // ---- DNS & WHOIS ----

  async getDnsRecords(query: string): Promise<any> {
    let res = await this.http.get(`/resolve/${encodeURIComponent(query)}`);
    return res.data;
  }

  async getWhois(query: string): Promise<any> {
    let res = await this.http.get(`/whois/${encodeURIComponent(query)}`);
    return res.data;
  }

  // ---- Collections (Case Files) ----

  async searchCollections(query: string): Promise<any> {
    let res = await this.http.get(`/casefiles/fulltext`, {
      params: { q: query }
    });
    return res.data;
  }

  async getCollection(casefileId: string): Promise<any> {
    let res = await this.http.get(`/casefiles/${encodeURIComponent(casefileId)}`);
    return res.data;
  }

  async getPublicCollections(): Promise<any> {
    let res = await this.http.get(`/casefiles/public`);
    return res.data;
  }

  async getMyCollections(): Promise<any> {
    let res = await this.http.get(`/casefiles`);
    return res.data;
  }

  async createCollection(collection: {
    title: string;
    description?: string;
    tlp?: string;
    tags?: string[];
  }): Promise<any> {
    let res = await this.http.post(`/casefiles`, {
      title: collection.title,
      description: collection.description,
      tlp: collection.tlp,
      tags: collection.tags
    });
    return res.data;
  }

  // ---- Internet Application Profiles ----

  async getAppProfile(appName: string): Promise<any> {
    let res = await this.http.get(`/app/${encodeURIComponent(appName)}`);
    return res.data;
  }

  async searchAppProfiles(query: string): Promise<any> {
    let res = await this.http.get(`/app/fulltext`, {
      params: { q: query }
    });
    return res.data;
  }

  // ---- Threat Reports ----

  async getThreatReports(params?: {
    type?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<any> {
    let queryParams: Record<string, string | number> = {};
    if (params?.type) queryParams.type = params.type;
    if (params?.startDate) queryParams.startDate = params.startDate;
    if (params?.endDate) queryParams.endDate = params.endDate;
    if (params?.limit) queryParams.limit = params.limit;
    let res = await this.http.get(`/report`, { params: queryParams });
    return res.data;
  }

  async getThreatReport(reportId: string): Promise<any> {
    let res = await this.http.get(`/report/${encodeURIComponent(reportId)}`);
    return res.data;
  }

  // ---- API Usage ----

  async getApiUsage(): Promise<any> {
    let res = await this.http.get(`/api/usage`);
    return res.data;
  }
}
