import { createAxios } from 'slates';
import type {
  UniOneDomainInfo,
  UniOneEmailMessage,
  UniOneEventDump,
  UniOneProject,
  UniOneSendResponse,
  UniOneSuppressionEntry,
  UniOneSystemInfo,
  UniOneTag,
  UniOneTemplate,
  UniOneTemplateListItem,
  UniOneValidationResult,
  UniOneWebhookConfig,
  UniOneWebhookInfo
} from './types';

let BASE_URLS: Record<string, string> = {
  auto: 'https://api.unione.io/en/transactional/api/v1',
  eu1: 'https://eu1.unione.io/en/transactional/api/v1',
  us1: 'https://us1.unione.io/en/transactional/api/v1'
};

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; datacenter?: string }) {
    let baseURL = BASE_URLS[config.datacenter ?? 'auto'] ?? BASE_URLS.auto;

    this.axios = createAxios({
      baseURL
    });

    this.axios.defaults.headers.common['X-API-KEY'] = config.token;
    this.axios.defaults.headers.common['Content-Type'] = 'application/json';
  }

  // ── Email ────────────────────────────────────────

  async sendEmail(message: UniOneEmailMessage): Promise<UniOneSendResponse> {
    let response = await this.axios.post('/email/send.json', { message });
    return response.data;
  }

  async subscribeEmail(params: {
    fromEmail: string;
    fromName: string;
    toEmail: string;
  }): Promise<{ status: string }> {
    let response = await this.axios.post('/email/subscribe.json', {
      from_email: params.fromEmail,
      from_name: params.fromName,
      to_email: params.toEmail
    });
    return response.data;
  }

  // ── Email Validation ────────────────────────────

  async validateEmail(email: string): Promise<UniOneValidationResult> {
    let response = await this.axios.post('/email-validation/single.json', {
      email
    });
    return response.data;
  }

  // ── Templates ───────────────────────────────────

  async setTemplate(
    template: UniOneTemplate
  ): Promise<{ status: string; template: UniOneTemplate }> {
    let response = await this.axios.post('/template/set.json', { template });
    return response.data;
  }

  async getTemplate(
    templateId: string
  ): Promise<{ status: string; template: UniOneTemplate }> {
    let response = await this.axios.post('/template/get.json', { id: templateId });
    return response.data;
  }

  async listTemplates(params?: {
    limit?: number;
    offset?: number;
  }): Promise<{ status: string; templates: UniOneTemplateListItem[] }> {
    let response = await this.axios.post('/template/list.json', params ?? {});
    return response.data;
  }

  async deleteTemplate(templateId: string): Promise<{ status: string }> {
    let response = await this.axios.post('/template/delete.json', { id: templateId });
    return response.data;
  }

  // ── Suppression ─────────────────────────────────

  async setSuppression(params: {
    email: string;
    cause: string;
    created?: string;
  }): Promise<{ status: string }> {
    let response = await this.axios.post('/suppression/set.json', params);
    return response.data;
  }

  async getSuppression(params: {
    email: string;
    allProjects?: boolean;
  }): Promise<{ status: string; suppressions: UniOneSuppressionEntry[] }> {
    let body: Record<string, unknown> = { email: params.email };
    if (params.allProjects !== undefined) {
      body.all_projects = params.allProjects ? 1 : 0;
    }
    let response = await this.axios.post('/suppression/get.json', body);
    return response.data;
  }

  async listSuppressions(params?: {
    cause?: string;
    source?: string;
    startTime?: string;
    cursor?: string;
    limit?: number;
  }): Promise<{ status: string; suppressions: UniOneSuppressionEntry[]; cursor?: string }> {
    let body: Record<string, unknown> = {};
    if (params?.cause) body.cause = params.cause;
    if (params?.source) body.source = params.source;
    if (params?.startTime) body.start_time = params.startTime;
    if (params?.cursor) body.cursor = params.cursor;
    if (params?.limit) body.limit = params.limit;
    let response = await this.axios.post('/suppression/list.json', body);
    return response.data;
  }

  async deleteSuppression(params: { email: string }): Promise<{ status: string }> {
    let response = await this.axios.post('/suppression/delete.json', params);
    return response.data;
  }

  // ── Domains ─────────────────────────────────────

  async getDomainDnsRecords(domain: string): Promise<UniOneDomainInfo> {
    let response = await this.axios.post('/domain/get-dns-records.json', { domain });
    return response.data;
  }

  async validateVerificationRecord(domain: string): Promise<{ status: string }> {
    let response = await this.axios.post('/domain/validate-verification-record.json', {
      domain
    });
    return response.data;
  }

  async validateDkim(domain: string): Promise<{ status: string }> {
    let response = await this.axios.post('/domain/validate-dkim.json', { domain });
    return response.data;
  }

  async listDomains(): Promise<{ status: string; domains: UniOneDomainInfo[] }> {
    let response = await this.axios.post('/domain/list.json', {});
    return response.data;
  }

  async deleteDomain(domain: string): Promise<{ status: string }> {
    let response = await this.axios.post('/domain/delete.json', { domain });
    return response.data;
  }

  // ── Webhooks ────────────────────────────────────

  async setWebhook(
    webhook: UniOneWebhookConfig
  ): Promise<{ status: string; object: UniOneWebhookInfo }> {
    let response = await this.axios.post('/webhook/set.json', webhook);
    return response.data;
  }

  async getWebhook(
    webhookUrl: string
  ): Promise<{ status: string; object: UniOneWebhookInfo }> {
    let response = await this.axios.post('/webhook/get.json', { url: webhookUrl });
    return response.data;
  }

  async listWebhooks(): Promise<{ status: string; objects: UniOneWebhookInfo[] }> {
    let response = await this.axios.post('/webhook/list.json', {});
    return response.data;
  }

  async deleteWebhook(webhookUrl: string): Promise<{ status: string }> {
    let response = await this.axios.post('/webhook/delete.json', { url: webhookUrl });
    return response.data;
  }

  // ── Event Dumps ─────────────────────────────────

  async createEventDump(params: {
    startTime: string;
    endTime: string;
    limit?: number;
    allEvents?: boolean;
    filter?: Record<string, string>;
  }): Promise<{ status: string; dump_id: number }> {
    let body: Record<string, unknown> = {
      start_time: params.startTime,
      end_time: params.endTime
    };
    if (params.limit !== undefined) body.limit = params.limit;
    if (params.allEvents !== undefined) body.all_events = params.allEvents ? 1 : 0;
    if (params.filter) body.filter = params.filter;
    let response = await this.axios.post('/event-dump/create.json', body);
    return response.data;
  }

  async getEventDump(dumpId: number): Promise<{ status: string } & UniOneEventDump> {
    let response = await this.axios.post('/event-dump/get.json', { dump_id: dumpId });
    return response.data;
  }

  async listEventDumps(): Promise<{ status: string; list: UniOneEventDump[] }> {
    let response = await this.axios.post('/event-dump/list.json', {});
    return response.data;
  }

  async deleteEventDump(dumpId: number): Promise<{ status: string }> {
    let response = await this.axios.post('/event-dump/delete.json', { dump_id: dumpId });
    return response.data;
  }

  // ── Tags ────────────────────────────────────────

  async listTags(): Promise<{ status: string; tags: UniOneTag[] }> {
    let response = await this.axios.post('/tag/list.json', {});
    return response.data;
  }

  async deleteTag(tag: string): Promise<{ status: string }> {
    let response = await this.axios.post('/tag/delete.json', { tag });
    return response.data;
  }

  // ── Projects ────────────────────────────────────

  async createProject(params: {
    name: string;
    country?: string;
    sendEnabled?: boolean;
    customUnsubscribeUrlEnabled?: boolean;
    backendId?: number;
  }): Promise<{ status: string; project: UniOneProject }> {
    let body: Record<string, unknown> = { name: params.name };
    if (params.country) body.country = params.country;
    if (params.sendEnabled !== undefined) body.send_enabled = params.sendEnabled;
    if (params.customUnsubscribeUrlEnabled !== undefined)
      body.custom_unsubscribe_url_enabled = params.customUnsubscribeUrlEnabled;
    if (params.backendId !== undefined) body.backend_id = params.backendId;
    let response = await this.axios.post('/project/create.json', body);
    return response.data;
  }

  async updateProject(params: {
    projectId: string;
    name?: string;
    country?: string;
    sendEnabled?: boolean;
    customUnsubscribeUrlEnabled?: boolean;
    backendId?: number;
  }): Promise<{ status: string }> {
    let body: Record<string, unknown> = { id: params.projectId };
    if (params.name) body.name = params.name;
    if (params.country) body.country = params.country;
    if (params.sendEnabled !== undefined) body.send_enabled = params.sendEnabled;
    if (params.customUnsubscribeUrlEnabled !== undefined)
      body.custom_unsubscribe_url_enabled = params.customUnsubscribeUrlEnabled;
    if (params.backendId !== undefined) body.backend_id = params.backendId;
    let response = await this.axios.post('/project/update.json', body);
    return response.data;
  }

  async listProjects(): Promise<{ status: string; projects: UniOneProject[] }> {
    let response = await this.axios.post('/project/list.json', {});
    return response.data;
  }

  async deleteProject(projectId: string): Promise<{ status: string }> {
    let response = await this.axios.post('/project/delete.json', { id: projectId });
    return response.data;
  }

  // ── System ──────────────────────────────────────

  async getSystemInfo(): Promise<UniOneSystemInfo> {
    let response = await this.axios.post('/system/info.json', {});
    return response.data;
  }
}
