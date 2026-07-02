import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://www.virustotal.com/api/v3'
});

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return { 'x-apikey': this.token };
  }

  // ── Files ──

  async uploadFile(fileName: string, fileContent: Uint8Array) {
    let formData = new FormData();
    let blob = new Blob([fileContent]);
    formData.append('file', blob, fileName);

    let response = await http.post('/files', formData, {
      headers: {
        ...this.headers(),
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data?.data;
  }

  async getUploadUrl() {
    let response = await http.get('/files/upload_url', {
      headers: this.headers()
    });
    return response.data?.data as string;
  }

  async getFileReport(fileHash: string) {
    let response = await http.get(`/files/${fileHash}`, {
      headers: this.headers()
    });
    return response.data?.data;
  }

  async rescanFile(fileHash: string) {
    let response = await http.post(`/files/${fileHash}/analyse`, null, {
      headers: this.headers()
    });
    return response.data?.data;
  }

  // ── URLs ──

  async scanUrl(url: string) {
    let response = await http.post('/urls', `url=${encodeURIComponent(url)}`, {
      headers: {
        ...this.headers(),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data?.data;
  }

  async getUrlReport(urlId: string) {
    let response = await http.get(`/urls/${urlId}`, {
      headers: this.headers()
    });
    return response.data?.data;
  }

  // ── Domains ──

  async getDomainReport(domain: string) {
    let response = await http.get(`/domains/${domain}`, {
      headers: this.headers()
    });
    return response.data?.data;
  }

  async getDomainRelationships(
    domain: string,
    relationship: string,
    limit: number = 10,
    cursor?: string
  ) {
    let params: Record<string, string | number> = { limit };
    if (cursor) params.cursor = cursor;
    let response = await http.get(`/domains/${domain}/${relationship}`, {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  // ── IP Addresses ──

  async getIpReport(ip: string) {
    let response = await http.get(`/ip_addresses/${ip}`, {
      headers: this.headers()
    });
    return response.data?.data;
  }

  async getIpRelationships(
    ip: string,
    relationship: string,
    limit: number = 10,
    cursor?: string
  ) {
    let params: Record<string, string | number> = { limit };
    if (cursor) params.cursor = cursor;
    let response = await http.get(`/ip_addresses/${ip}/${relationship}`, {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  // ── Analysis ──

  async getAnalysis(analysisId: string) {
    let response = await http.get(`/analyses/${analysisId}`, {
      headers: this.headers()
    });
    return response.data?.data;
  }

  // ── Comments ──

  async getComments(
    resourceType: string,
    resourceId: string,
    limit: number = 10,
    cursor?: string
  ) {
    let params: Record<string, string | number> = { limit };
    if (cursor) params.cursor = cursor;
    let response = await http.get(`/${resourceType}/${resourceId}/comments`, {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async addComment(resourceType: string, resourceId: string, text: string) {
    let response = await http.post(
      `/${resourceType}/${resourceId}/comments`,
      {
        data: {
          type: 'comment',
          attributes: { text }
        }
      },
      {
        headers: this.headers()
      }
    );
    return response.data?.data;
  }

  // ── Votes ──

  async addVote(resourceType: string, resourceId: string, verdict: 'malicious' | 'harmless') {
    let response = await http.post(
      `/${resourceType}/${resourceId}/votes`,
      {
        data: {
          type: 'vote',
          attributes: { verdict }
        }
      },
      {
        headers: this.headers()
      }
    );
    return response.data?.data;
  }

  async getVotes(resourceType: string, resourceId: string, limit: number = 10) {
    let response = await http.get(`/${resourceType}/${resourceId}/votes`, {
      headers: this.headers(),
      params: { limit }
    });
    return response.data;
  }

  // ── Relationships (generic) ──

  async getFileRelationships(
    fileHash: string,
    relationship: string,
    limit: number = 10,
    cursor?: string
  ) {
    let params: Record<string, string | number> = { limit };
    if (cursor) params.cursor = cursor;
    let response = await http.get(`/files/${fileHash}/${relationship}`, {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getUrlRelationships(
    urlId: string,
    relationship: string,
    limit: number = 10,
    cursor?: string
  ) {
    let params: Record<string, string | number> = { limit };
    if (cursor) params.cursor = cursor;
    let response = await http.get(`/urls/${urlId}/${relationship}`, {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  // ── Intelligence Search (Premium) ──

  async searchIntelligence(
    query: string,
    limit: number = 10,
    cursor?: string,
    order?: string,
    descriptorsOnly?: boolean
  ) {
    let params: Record<string, string | number | boolean> = { query, limit };
    if (cursor) params.cursor = cursor;
    if (order) params.order = order;
    if (descriptorsOnly !== undefined) params.descriptors_only = descriptorsOnly;
    let response = await http.get('/intelligence/search', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  // ── Livehunt (Premium) ──

  async getLivehuntRulesets(limit: number = 10, cursor?: string) {
    let params: Record<string, string | number> = { limit };
    if (cursor) params.cursor = cursor;
    let response = await http.get('/intelligence/hunting_rulesets', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getLivehuntRuleset(rulesetId: string) {
    let response = await http.get(`/intelligence/hunting_rulesets/${rulesetId}`, {
      headers: this.headers()
    });
    return response.data?.data;
  }

  async createLivehuntRuleset(
    name: string,
    rules: string,
    enabled: boolean,
    limit?: number,
    notificationEmails?: string[]
  ) {
    let attributes: Record<string, unknown> = { name, rules, enabled };
    if (limit !== undefined) attributes.limit = limit;
    if (notificationEmails) attributes.notification_emails = notificationEmails;
    let response = await http.post(
      '/intelligence/hunting_rulesets',
      {
        data: {
          type: 'hunting_ruleset',
          attributes
        }
      },
      {
        headers: this.headers()
      }
    );
    return response.data?.data;
  }

  async updateLivehuntRuleset(
    rulesetId: string,
    updates: {
      name?: string;
      rules?: string;
      enabled?: boolean;
      limit?: number;
      notificationEmails?: string[];
    }
  ) {
    let attributes: Record<string, unknown> = {};
    if (updates.name !== undefined) attributes.name = updates.name;
    if (updates.rules !== undefined) attributes.rules = updates.rules;
    if (updates.enabled !== undefined) attributes.enabled = updates.enabled;
    if (updates.limit !== undefined) attributes.limit = updates.limit;
    if (updates.notificationEmails !== undefined)
      attributes.notification_emails = updates.notificationEmails;
    let response = await http.patch(
      `/intelligence/hunting_rulesets/${rulesetId}`,
      {
        data: {
          type: 'hunting_ruleset',
          attributes
        }
      },
      {
        headers: this.headers()
      }
    );
    return response.data?.data;
  }

  async deleteLivehuntRuleset(rulesetId: string) {
    await http.delete(`/intelligence/hunting_rulesets/${rulesetId}`, {
      headers: this.headers()
    });
  }

  // ── Retrohunt (Premium) ──

  async createRetrohuntJob(rules: string, corpus?: string, notificationEmail?: string) {
    let attributes: Record<string, unknown> = { rules };
    if (corpus) attributes.corpus = corpus;
    if (notificationEmail) attributes.notification_email = notificationEmail;
    let response = await http.post(
      '/intelligence/retrohunt_jobs',
      {
        data: {
          type: 'retrohunt_job',
          attributes
        }
      },
      {
        headers: this.headers()
      }
    );
    return response.data?.data;
  }

  async getRetrohuntJob(jobId: string) {
    let response = await http.get(`/intelligence/retrohunt_jobs/${jobId}`, {
      headers: this.headers()
    });
    return response.data?.data;
  }

  async getRetrohuntJobs(limit: number = 10, cursor?: string) {
    let params: Record<string, string | number> = { limit };
    if (cursor) params.cursor = cursor;
    let response = await http.get('/intelligence/retrohunt_jobs', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getRetrohuntJobMatchingFiles(jobId: string, limit: number = 10, cursor?: string) {
    let params: Record<string, string | number> = { limit };
    if (cursor) params.cursor = cursor;
    let response = await http.get(`/intelligence/retrohunt_jobs/${jobId}/matching_files`, {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  // ── IOC Stream / Feed (Premium) ──

  async getIocStream(filter?: string, limit: number = 10, cursor?: string) {
    let params: Record<string, string | number> = { limit };
    if (filter) params.filter = filter;
    if (cursor) params.cursor = cursor;
    let response = await http.get('/ioc_stream', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getIocStreamNotifications(filter?: string, limit: number = 10, cursor?: string) {
    let params: Record<string, string | number> = { limit };
    if (filter) params.filter = filter;
    if (cursor) params.cursor = cursor;
    let response = await http.get('/ioc_stream_notifications', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  // ── File Feed (Premium) ──

  async getFileFeed(time: string) {
    let response = await http.get(`/feeds/files/${time}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ── Graphs ──

  async getGraphs(limit: number = 10, cursor?: string) {
    let params: Record<string, string | number> = { limit };
    if (cursor) params.cursor = cursor;
    let response = await http.get('/graphs', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getGraph(graphId: string) {
    let response = await http.get(`/graphs/${graphId}`, {
      headers: this.headers()
    });
    return response.data?.data;
  }
}
