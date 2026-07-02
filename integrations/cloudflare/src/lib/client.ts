import { createAxios } from 'slates';
import {
  cloudflareApiError,
  cloudflareApiResponseError,
  cloudflareServiceError,
  isCloudflareNotFoundError
} from './errors';

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let isCloudflareEnvelopeFailure = (value: unknown) =>
  isRecord(value) && value.success === false;

let encodePathSegment = (value: string) => encodeURIComponent(value);

export interface CloudflareAuthConfig {
  token: string;
  email?: string;
  authType: 'api_token' | 'global_api_key';
}

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface CloudflareResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: Array<{ code: number; message: string }>;
  result: T;
  result_info?: {
    page: number;
    per_page: number;
    total_pages: number;
    count: number;
    total_count: number;
  };
}

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(authConfig: CloudflareAuthConfig) {
    let headers: Record<string, string> = {};

    if (authConfig.authType === 'api_token') {
      headers.Authorization = `Bearer ${authConfig.token}`;
    } else {
      headers['X-Auth-Email'] = authConfig.email!;
      headers['X-Auth-Key'] = authConfig.token;
    }

    this.http = createAxios({
      baseURL: 'https://api.cloudflare.com/client/v4',
      headers
    });

    this.http.interceptors.response.use(
      response => {
        if (isCloudflareEnvelopeFailure(response.data)) {
          throw cloudflareApiResponseError(response);
        }

        return response;
      },
      error => Promise.reject(cloudflareApiError(error))
    );
  }

  // ─── DNS Records ───────────────────────────────────────────────

  async listDnsRecords(
    zoneId: string,
    params?: {
      type?: string;
      name?: string;
      content?: string;
      page?: number;
      perPage?: number;
    }
  ) {
    let response = await this.http.get(`/zones/${zoneId}/dns_records`, {
      params: {
        type: params?.type,
        name: params?.name,
        content: params?.content,
        page: params?.page || 1,
        per_page: params?.perPage || 100
      }
    });
    return response.data as CloudflareResponse<any[]>;
  }

  async getDnsRecord(zoneId: string, recordId: string) {
    let response = await this.http.get(`/zones/${zoneId}/dns_records/${recordId}`);
    return response.data as CloudflareResponse<any>;
  }

  async createDnsRecord(
    zoneId: string,
    record: {
      type: string;
      name: string;
      content: string;
      ttl?: number;
      proxied?: boolean;
      priority?: number;
      comment?: string;
    }
  ) {
    let response = await this.http.post(`/zones/${zoneId}/dns_records`, record);
    return response.data as CloudflareResponse<any>;
  }

  async updateDnsRecord(
    zoneId: string,
    recordId: string,
    record: {
      type?: string;
      name?: string;
      content?: string;
      ttl?: number;
      proxied?: boolean;
      priority?: number;
      comment?: string;
    }
  ) {
    let response = await this.http.patch(`/zones/${zoneId}/dns_records/${recordId}`, record);
    return response.data as CloudflareResponse<any>;
  }

  async deleteDnsRecord(zoneId: string, recordId: string) {
    let response = await this.http.delete(`/zones/${zoneId}/dns_records/${recordId}`);
    return response.data as CloudflareResponse<{ id: string }>;
  }

  async exportDnsRecords(zoneId: string) {
    let response = await this.http.get(`/zones/${zoneId}/dns_records/export`);
    return response.data as string;
  }

  // ─── Zones ─────────────────────────────────────────────────────

  async listZones(params?: {
    name?: string;
    status?: string;
    accountId?: string;
    page?: number;
    perPage?: number;
  }) {
    let response = await this.http.get('/zones', {
      params: {
        name: params?.name,
        status: params?.status,
        'account.id': params?.accountId,
        page: params?.page || 1,
        per_page: params?.perPage || 50
      }
    });
    return response.data as CloudflareResponse<any[]>;
  }

  async getZone(zoneId: string) {
    let response = await this.http.get(`/zones/${zoneId}`);
    return response.data as CloudflareResponse<any>;
  }

  async createZone(data: {
    name: string;
    accountId: string;
    type?: string;
    jumpStart?: boolean;
  }) {
    let response = await this.http.post('/zones', {
      name: data.name,
      account: { id: data.accountId },
      type: data.type || 'full',
      jump_start: data.jumpStart ?? true
    });
    return response.data as CloudflareResponse<any>;
  }

  async deleteZone(zoneId: string) {
    let response = await this.http.delete(`/zones/${zoneId}`);
    return response.data as CloudflareResponse<{ id: string }>;
  }

  async getZoneSettings(zoneId: string) {
    let response = await this.http.get(`/zones/${zoneId}/settings`);
    return response.data as CloudflareResponse<any[]>;
  }

  async updateZoneSetting(zoneId: string, settingId: string, value: any) {
    let response = await this.http.patch(`/zones/${zoneId}/settings/${settingId}`, { value });
    return response.data as CloudflareResponse<any>;
  }

  async purgeAllCache(zoneId: string) {
    let response = await this.http.post(`/zones/${zoneId}/purge_cache`, {
      purge_everything: true
    });
    return response.data as CloudflareResponse<{ id: string }>;
  }

  async purgeFilesByUrl(zoneId: string, files: string[]) {
    let response = await this.http.post(`/zones/${zoneId}/purge_cache`, { files });
    return response.data as CloudflareResponse<{ id: string }>;
  }

  async purgeFilesByTags(zoneId: string, tags: string[]) {
    let response = await this.http.post(`/zones/${zoneId}/purge_cache`, { tags });
    return response.data as CloudflareResponse<{ id: string }>;
  }

  async purgeFilesByHosts(zoneId: string, hosts: string[]) {
    let response = await this.http.post(`/zones/${zoneId}/purge_cache`, { hosts });
    return response.data as CloudflareResponse<{ id: string }>;
  }

  async purgeFilesByPrefixes(zoneId: string, prefixes: string[]) {
    let response = await this.http.post(`/zones/${zoneId}/purge_cache`, { prefixes });
    return response.data as CloudflareResponse<{ id: string }>;
  }

  async setDevelopmentMode(zoneId: string, value: 'on' | 'off') {
    return this.updateZoneSetting(zoneId, 'development_mode', value);
  }

  // ─── Firewall & Security ──────────────────────────────────────

  async listFirewallRules(zoneId: string, params?: PaginationParams) {
    let response = await this.http.get(`/zones/${zoneId}/firewall/rules`, {
      params: { page: params?.page || 1, per_page: params?.perPage || 50 }
    });
    return response.data as CloudflareResponse<any[]>;
  }

  async createFirewallRules(
    zoneId: string,
    rules: Array<{
      filter: { expression: string };
      action: string;
      description?: string;
      priority?: number;
      paused?: boolean;
    }>
  ) {
    let response = await this.http.post(`/zones/${zoneId}/firewall/rules`, rules);
    return response.data as CloudflareResponse<any[]>;
  }

  async deleteFirewallRule(zoneId: string, ruleId: string) {
    let response = await this.http.delete(`/zones/${zoneId}/firewall/rules/${ruleId}`);
    return response.data as CloudflareResponse<any>;
  }

  async listWafRulesets(zoneId: string) {
    let response = await this.http.get(`/zones/${zoneId}/rulesets`);
    return response.data as CloudflareResponse<any[]>;
  }

  async getRuleset(zoneId: string, rulesetId: string) {
    let response = await this.http.get(`/zones/${zoneId}/rulesets/${rulesetId}`);
    return response.data as CloudflareResponse<any>;
  }

  async listIpAccessRules(zoneId: string, params?: PaginationParams) {
    let response = await this.http.get(`/zones/${zoneId}/firewall/access_rules/rules`, {
      params: { page: params?.page || 1, per_page: params?.perPage || 50 }
    });
    return response.data as CloudflareResponse<any[]>;
  }

  async createIpAccessRule(
    zoneId: string,
    rule: {
      mode: string;
      configuration: { target: string; value: string };
      notes?: string;
    }
  ) {
    let response = await this.http.post(`/zones/${zoneId}/firewall/access_rules/rules`, rule);
    return response.data as CloudflareResponse<any>;
  }

  async deleteIpAccessRule(zoneId: string, ruleId: string) {
    let response = await this.http.delete(
      `/zones/${zoneId}/firewall/access_rules/rules/${ruleId}`
    );
    return response.data as CloudflareResponse<any>;
  }

  // ─── Custom Rules (WAF) ───────────────────────────────────────

  async listCustomRules(zoneId: string) {
    try {
      let response = await this.http.get(
        `/zones/${zoneId}/rulesets/phases/http_request_firewall_custom/entrypoint`
      );
      return response.data as CloudflareResponse<any>;
    } catch (error) {
      if (isCloudflareNotFoundError(error)) {
        return {
          success: true,
          errors: [],
          messages: [],
          result: { rules: [] }
        };
      }

      throw error;
    }
  }

  async createCustomRule(
    zoneId: string,
    rule: {
      expression: string;
      action: string;
      description?: string;
      enabled?: boolean;
    }
  ) {
    let entrypoint = await this.listCustomRules(zoneId);
    let rulesetId = entrypoint.result?.id;

    if (rulesetId) {
      let response = await this.http.post(`/zones/${zoneId}/rulesets/${rulesetId}/rules`, {
        expression: rule.expression,
        action: rule.action,
        description: rule.description,
        enabled: rule.enabled ?? true
      });
      return response.data as CloudflareResponse<any>;
    } else {
      let response = await this.http.post(`/zones/${zoneId}/rulesets`, {
        name: 'Custom Rules',
        kind: 'zone',
        phase: 'http_request_firewall_custom',
        rules: [
          {
            expression: rule.expression,
            action: rule.action,
            description: rule.description,
            enabled: rule.enabled ?? true
          }
        ]
      });
      return response.data as CloudflareResponse<any>;
    }
  }

  async deleteCustomRule(zoneId: string, ruleId: string) {
    let entrypoint = await this.listCustomRules(zoneId);
    let rulesetId = entrypoint.result?.id;

    if (!rulesetId) {
      throw cloudflareServiceError('No custom WAF ruleset exists for this zone.');
    }

    let response = await this.http.delete(
      `/zones/${zoneId}/rulesets/${rulesetId}/rules/${ruleId}`
    );
    return response.data as CloudflareResponse<any>;
  }

  // ─── Workers ───────────────────────────────────────────────────

  async listWorkers(accountId: string) {
    let response = await this.http.get(`/accounts/${accountId}/workers/scripts`);
    return response.data as CloudflareResponse<any[]>;
  }

  async getWorker(accountId: string, scriptName: string) {
    let response = await this.http.get(
      `/accounts/${accountId}/workers/scripts/${scriptName}`,
      {
        headers: { Accept: 'application/javascript' }
      }
    );
    return response.data;
  }

  async getWorkerSettings(accountId: string, scriptName: string) {
    let response = await this.http.get(
      `/accounts/${accountId}/workers/scripts/${scriptName}/settings`
    );
    return response.data as CloudflareResponse<any>;
  }

  async deleteWorker(accountId: string, scriptName: string) {
    let response = await this.http.delete(
      `/accounts/${accountId}/workers/scripts/${scriptName}`
    );
    return response.data;
  }

  async listWorkerRoutes(zoneId: string) {
    let response = await this.http.get(`/zones/${zoneId}/workers/routes`);
    return response.data as CloudflareResponse<any[]>;
  }

  async createWorkerRoute(
    zoneId: string,
    route: {
      pattern: string;
      script: string;
    }
  ) {
    let response = await this.http.post(`/zones/${zoneId}/workers/routes`, route);
    return response.data as CloudflareResponse<any>;
  }

  async deleteWorkerRoute(zoneId: string, routeId: string) {
    let response = await this.http.delete(`/zones/${zoneId}/workers/routes/${routeId}`);
    return response.data as CloudflareResponse<any>;
  }

  // ─── Workers KV ────────────────────────────────────────────────

  async listKvNamespaces(accountId: string, params?: PaginationParams) {
    let response = await this.http.get(`/accounts/${accountId}/storage/kv/namespaces`, {
      params: { page: params?.page || 1, per_page: params?.perPage || 50 }
    });
    return response.data as CloudflareResponse<any[]>;
  }

  async createKvNamespace(accountId: string, title: string) {
    let response = await this.http.post(`/accounts/${accountId}/storage/kv/namespaces`, {
      title
    });
    return response.data as CloudflareResponse<any>;
  }

  async getKvNamespace(accountId: string, namespaceId: string) {
    let response = await this.http.get(
      `/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`
    );
    return response.data as CloudflareResponse<any>;
  }

  async renameKvNamespace(accountId: string, namespaceId: string, title: string) {
    let response = await this.http.put(
      `/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`,
      { title }
    );
    return response.data as CloudflareResponse<any>;
  }

  async deleteKvNamespace(accountId: string, namespaceId: string) {
    let response = await this.http.delete(
      `/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`
    );
    return response.data as CloudflareResponse<any>;
  }

  async listKvKeys(
    accountId: string,
    namespaceId: string,
    params?: {
      prefix?: string;
      limit?: number;
      cursor?: string;
    }
  ) {
    let response = await this.http.get(
      `/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/keys`,
      {
        params: {
          prefix: params?.prefix,
          limit: params?.limit || 1000,
          cursor: params?.cursor
        }
      }
    );
    return response.data as CloudflareResponse<any[]>;
  }

  async getKvValue(accountId: string, namespaceId: string, key: string) {
    let response = await this.http.get(
      `/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodePathSegment(key)}`
    );
    return response.data;
  }

  async putKvValue(
    accountId: string,
    namespaceId: string,
    key: string,
    value: string,
    _metadata?: any
  ) {
    let response = await this.http.put(
      `/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodePathSegment(key)}`,
      value,
      {
        headers: { 'Content-Type': 'text/plain' }
      }
    );
    return response.data as CloudflareResponse<any>;
  }

  async deleteKvKey(accountId: string, namespaceId: string, key: string) {
    let response = await this.http.delete(
      `/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodePathSegment(key)}`
    );
    return response.data as CloudflareResponse<any>;
  }

  // ─── R2 Object Storage ────────────────────────────────────────

  async listR2Buckets(accountId: string) {
    let response = await this.http.get(`/accounts/${accountId}/r2/buckets`);
    return response.data as CloudflareResponse<any>;
  }

  async createR2Bucket(
    accountId: string,
    data: {
      name: string;
      locationHint?: string;
      storageClass?: string;
      jurisdiction?: string;
    }
  ) {
    let body: any = { name: data.name };
    if (data.locationHint) body.locationHint = data.locationHint;
    if (data.storageClass) body.storageClass = data.storageClass;

    let response = await this.http.post(`/accounts/${accountId}/r2/buckets`, body, {
      headers: data.jurisdiction ? { 'cf-r2-jurisdiction': data.jurisdiction } : undefined
    });
    return response.data as CloudflareResponse<any>;
  }

  async getR2Bucket(accountId: string, bucketName: string) {
    let response = await this.http.get(`/accounts/${accountId}/r2/buckets/${bucketName}`);
    return response.data as CloudflareResponse<any>;
  }

  async deleteR2Bucket(accountId: string, bucketName: string) {
    let response = await this.http.delete(`/accounts/${accountId}/r2/buckets/${bucketName}`);
    return response.data as CloudflareResponse<any>;
  }

  // ─── Load Balancing ───────────────────────────────────────────

  async listLoadBalancers(zoneId: string) {
    let response = await this.http.get(`/zones/${zoneId}/load_balancers`);
    return response.data as CloudflareResponse<any[]>;
  }

  async getLoadBalancer(zoneId: string, loadBalancerId: string) {
    let response = await this.http.get(`/zones/${zoneId}/load_balancers/${loadBalancerId}`);
    return response.data as CloudflareResponse<any>;
  }

  async createLoadBalancer(
    zoneId: string,
    data: {
      name: string;
      fallbackPool: string;
      defaultPools: string[];
      description?: string;
      proxied?: boolean;
      steeringPolicy?: string;
      sessionAffinity?: string;
      ttl?: number;
    }
  ) {
    let response = await this.http.post(`/zones/${zoneId}/load_balancers`, {
      name: data.name,
      fallback_pool: data.fallbackPool,
      default_pools: data.defaultPools,
      description: data.description,
      proxied: data.proxied,
      steering_policy: data.steeringPolicy,
      session_affinity: data.sessionAffinity,
      ttl: data.ttl
    });
    return response.data as CloudflareResponse<any>;
  }

  async deleteLoadBalancer(zoneId: string, loadBalancerId: string) {
    let response = await this.http.delete(`/zones/${zoneId}/load_balancers/${loadBalancerId}`);
    return response.data as CloudflareResponse<any>;
  }

  async listPools(accountId: string) {
    let response = await this.http.get(`/accounts/${accountId}/load_balancers/pools`);
    return response.data as CloudflareResponse<any[]>;
  }

  async createPool(
    accountId: string,
    data: {
      name: string;
      origins: Array<{ name: string; address: string; enabled?: boolean; weight?: number }>;
      description?: string;
      enabled?: boolean;
      monitor?: string;
      notificationEmail?: string;
    }
  ) {
    let response = await this.http.post(`/accounts/${accountId}/load_balancers/pools`, {
      name: data.name,
      origins: data.origins,
      description: data.description,
      enabled: data.enabled ?? true,
      monitor: data.monitor,
      notification_email: data.notificationEmail
    });
    return response.data as CloudflareResponse<any>;
  }

  async deletePool(accountId: string, poolId: string) {
    let response = await this.http.delete(
      `/accounts/${accountId}/load_balancers/pools/${poolId}`
    );
    return response.data as CloudflareResponse<any>;
  }

  async listMonitors(accountId: string) {
    let response = await this.http.get(`/accounts/${accountId}/load_balancers/monitors`);
    return response.data as CloudflareResponse<any[]>;
  }

  async createMonitor(
    accountId: string,
    data: {
      type?: string;
      description?: string;
      method?: string;
      path?: string;
      expectedBody?: string;
      expectedCodes?: string;
      timeout?: number;
      retries?: number;
      interval?: number;
    }
  ) {
    let response = await this.http.post(`/accounts/${accountId}/load_balancers/monitors`, {
      type: data.type || 'https',
      description: data.description,
      method: data.method || 'GET',
      path: data.path || '/',
      expected_body: data.expectedBody,
      expected_codes: data.expectedCodes || '2xx',
      timeout: data.timeout || 5,
      retries: data.retries || 2,
      interval: data.interval || 60
    });
    return response.data as CloudflareResponse<any>;
  }

  // ─── Pages ─────────────────────────────────────────────────────

  async listPagesProjects(accountId: string) {
    let response = await this.http.get(`/accounts/${accountId}/pages/projects`);
    return response.data as CloudflareResponse<any[]>;
  }

  async getPagesProject(accountId: string, projectName: string) {
    let response = await this.http.get(`/accounts/${accountId}/pages/projects/${projectName}`);
    return response.data as CloudflareResponse<any>;
  }

  async deletePagesProject(accountId: string, projectName: string) {
    let response = await this.http.delete(
      `/accounts/${accountId}/pages/projects/${projectName}`
    );
    return response.data as CloudflareResponse<any>;
  }

  async listPagesDeployments(accountId: string, projectName: string) {
    let response = await this.http.get(
      `/accounts/${accountId}/pages/projects/${projectName}/deployments`
    );
    return response.data as CloudflareResponse<any[]>;
  }

  async getPagesDeployment(accountId: string, projectName: string, deploymentId: string) {
    let response = await this.http.get(
      `/accounts/${accountId}/pages/projects/${projectName}/deployments/${deploymentId}`
    );
    return response.data as CloudflareResponse<any>;
  }

  async rollbackPagesDeployment(accountId: string, projectName: string, deploymentId: string) {
    let response = await this.http.post(
      `/accounts/${accountId}/pages/projects/${projectName}/deployments/${deploymentId}/rollback`
    );
    return response.data as CloudflareResponse<any>;
  }

  async deletePagesDeployment(accountId: string, projectName: string, deploymentId: string) {
    let response = await this.http.delete(
      `/accounts/${accountId}/pages/projects/${projectName}/deployments/${deploymentId}`
    );
    return response.data as CloudflareResponse<any>;
  }

  // ─── SSL/TLS Certificates ─────────────────────────────────────

  async listCertificatePacks(zoneId: string) {
    let response = await this.http.get(`/zones/${zoneId}/ssl/certificate_packs`);
    return response.data as CloudflareResponse<any[]>;
  }

  async listCustomCertificates(zoneId: string) {
    let response = await this.http.get(`/zones/${zoneId}/custom_certificates`);
    return response.data as CloudflareResponse<any[]>;
  }

  async getSslSetting(zoneId: string) {
    let response = await this.http.get(`/zones/${zoneId}/settings/ssl`);
    return response.data as CloudflareResponse<any>;
  }

  async updateSslSetting(zoneId: string, value: string) {
    return this.updateZoneSetting(zoneId, 'ssl', value);
  }

  async listOriginCaCertificates(zoneId: string) {
    let response = await this.http.get('/certificates', {
      params: { zone_id: zoneId }
    });
    return response.data as CloudflareResponse<any[]>;
  }

  async createOriginCaCertificate(data: {
    hostnames: string[];
    requestedValidity?: number;
    requestType?: string;
    csr?: string;
  }) {
    let response = await this.http.post('/certificates', {
      hostnames: data.hostnames,
      requested_validity: data.requestedValidity || 5475,
      request_type: data.requestType || 'origin-rsa',
      csr: data.csr
    });
    return response.data as CloudflareResponse<any>;
  }

  async revokeOriginCaCertificate(certificateId: string) {
    let response = await this.http.delete(`/certificates/${certificateId}`);
    return response.data as CloudflareResponse<any>;
  }

  // ─── Account & User Management ────────────────────────────────

  async getUser() {
    let response = await this.http.get('/user');
    return response.data as CloudflareResponse<any>;
  }

  async listAccounts(params?: PaginationParams) {
    let response = await this.http.get('/accounts', {
      params: { page: params?.page || 1, per_page: params?.perPage || 50 }
    });
    return response.data as CloudflareResponse<any[]>;
  }

  async getAccount(accountId: string) {
    let response = await this.http.get(`/accounts/${accountId}`);
    return response.data as CloudflareResponse<any>;
  }

  async listAccountMembers(accountId: string, params?: PaginationParams) {
    let response = await this.http.get(`/accounts/${accountId}/members`, {
      params: { page: params?.page || 1, per_page: params?.perPage || 50 }
    });
    return response.data as CloudflareResponse<any[]>;
  }

  async addAccountMember(accountId: string, email: string, roles: string[]) {
    let response = await this.http.post(`/accounts/${accountId}/members`, {
      email,
      roles
    });
    return response.data as CloudflareResponse<any>;
  }

  async removeAccountMember(accountId: string, memberId: string) {
    let response = await this.http.delete(`/accounts/${accountId}/members/${memberId}`);
    return response.data as CloudflareResponse<any>;
  }

  async listAccountRoles(accountId: string) {
    let response = await this.http.get(`/accounts/${accountId}/roles`);
    return response.data as CloudflareResponse<any[]>;
  }

  async getAuditLogs(
    accountId: string,
    params?: {
      since?: string;
      before?: string;
      page?: number;
      perPage?: number;
      actorEmail?: string;
      actorIp?: string;
    }
  ) {
    let response = await this.http.get(`/accounts/${accountId}/audit_logs`, {
      params: {
        since: params?.since,
        before: params?.before,
        page: params?.page || 1,
        per_page: params?.perPage || 50,
        'actor.email': params?.actorEmail,
        'actor.ip': params?.actorIp
      }
    });
    return response.data as CloudflareResponse<any[]>;
  }

  // ─── Notifications / Alerting ─────────────────────────────────

  async listNotificationPolicies(accountId: string) {
    let response = await this.http.get(`/accounts/${accountId}/alerting/v3/policies`);
    return response.data as CloudflareResponse<any[]>;
  }

  async getNotificationPolicy(accountId: string, policyId: string) {
    let response = await this.http.get(
      `/accounts/${accountId}/alerting/v3/policies/${policyId}`
    );
    return response.data as CloudflareResponse<any>;
  }

  async createNotificationPolicy(
    accountId: string,
    data: {
      name: string;
      alertType: string;
      enabled?: boolean;
      description?: string;
      mechanisms: Record<string, Array<{ id: string }>>;
      filters?: Record<string, string[]>;
    }
  ) {
    let response = await this.http.post(`/accounts/${accountId}/alerting/v3/policies`, {
      name: data.name,
      alert_type: data.alertType,
      enabled: data.enabled ?? true,
      description: data.description,
      mechanisms: data.mechanisms,
      filters: data.filters
    });
    return response.data as CloudflareResponse<any>;
  }

  async deleteNotificationPolicy(accountId: string, policyId: string) {
    let response = await this.http.delete(
      `/accounts/${accountId}/alerting/v3/policies/${policyId}`
    );
    return response.data as CloudflareResponse<any>;
  }

  async listNotificationWebhooks(accountId: string) {
    let response = await this.http.get(
      `/accounts/${accountId}/alerting/v3/destinations/webhooks`
    );
    return response.data as CloudflareResponse<any[]>;
  }

  async createNotificationWebhook(
    accountId: string,
    data: {
      name: string;
      url: string;
      secret?: string;
    }
  ) {
    let response = await this.http.post(
      `/accounts/${accountId}/alerting/v3/destinations/webhooks`,
      data
    );
    return response.data as CloudflareResponse<any>;
  }

  async deleteNotificationWebhook(accountId: string, webhookId: string) {
    let response = await this.http.delete(
      `/accounts/${accountId}/alerting/v3/destinations/webhooks/${webhookId}`
    );
    return response.data as CloudflareResponse<any>;
  }

  async listNotificationHistory(
    accountId: string,
    params?: {
      since?: string;
      before?: string;
      page?: number;
      perPage?: number;
    }
  ) {
    let response = await this.http.get(`/accounts/${accountId}/alerting/v3/history`, {
      params: {
        since: params?.since,
        before: params?.before,
        page: params?.page || 1,
        per_page: params?.perPage || 25
      }
    });
    return response.data as CloudflareResponse<any[]>;
  }

  // ─── Domain Registration ──────────────────────────────────────

  async listDomains(accountId: string) {
    let response = await this.http.get(`/accounts/${accountId}/registrar/domains`);
    return response.data as CloudflareResponse<any[]>;
  }

  async getDomain(accountId: string, domainName: string) {
    let response = await this.http.get(
      `/accounts/${accountId}/registrar/domains/${domainName}`
    );
    return response.data as CloudflareResponse<any>;
  }

  async updateDomain(
    accountId: string,
    domainName: string,
    data: {
      autoRenew?: boolean;
      locked?: boolean;
      privacy?: boolean;
    }
  ) {
    let response = await this.http.put(
      `/accounts/${accountId}/registrar/domains/${domainName}`,
      {
        auto_renew: data.autoRenew,
        locked: data.locked,
        privacy: data.privacy
      }
    );
    return response.data as CloudflareResponse<any>;
  }

  // ─── Analytics (GraphQL) ──────────────────────────────────────

  async queryAnalytics(query: string, variables?: Record<string, any>) {
    let response = await this.http.post('/graphql', {
      query,
      variables: variables || {}
    });
    return response.data;
  }

  // ─── Stream (Video) ───────────────────────────────────────────

  async listStreamVideos(accountId: string) {
    let response = await this.http.get(`/accounts/${accountId}/stream`);
    return response.data as CloudflareResponse<any[]>;
  }

  async getStreamVideo(accountId: string, videoId: string) {
    let response = await this.http.get(`/accounts/${accountId}/stream/${videoId}`);
    return response.data as CloudflareResponse<any>;
  }

  async deleteStreamVideo(accountId: string, videoId: string) {
    let response = await this.http.delete(`/accounts/${accountId}/stream/${videoId}`);
    return response.data as CloudflareResponse<any>;
  }

  async listStreamLiveInputs(accountId: string) {
    let response = await this.http.get(`/accounts/${accountId}/stream/live_inputs`);
    return response.data as CloudflareResponse<{
      liveInputs?: any[];
      range?: number;
      total?: number;
    }>;
  }

  async createStreamLiveInput(
    accountId: string,
    data: {
      meta?: Record<string, string>;
      recording?: { mode?: 'off' | 'automatic'; timeoutSeconds?: number };
    }
  ) {
    let response = await this.http.post(`/accounts/${accountId}/stream/live_inputs`, {
      meta: data.meta,
      recording: data.recording
        ? {
            mode: data.recording.mode || 'automatic',
            timeoutSeconds: data.recording.timeoutSeconds || 0
          }
        : undefined
    });
    return response.data as CloudflareResponse<any>;
  }

  async deleteStreamLiveInput(accountId: string, liveInputId: string) {
    let response = await this.http.delete(
      `/accounts/${accountId}/stream/live_inputs/${liveInputId}`
    );
    return response.data as CloudflareResponse<any>;
  }
}
