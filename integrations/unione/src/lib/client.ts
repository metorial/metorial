import { createApiServiceError, createAuthenticatedAxios, isApiErrorRecord } from 'slates';
import { toUniOneDateTime } from './datetime';
import { toUniOneError } from './errors';
import type {
  UniOneConfirmedEmail,
  UniOneDomainInfo,
  UniOneDomainResponse,
  UniOneEmailMessage,
  UniOneEventDump,
  UniOneEventDumpResponse,
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
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string; datacenter?: string }) {
    let baseURL = BASE_URLS[config.datacenter ?? 'auto'] ?? BASE_URLS.auto;

    this.axios = createAuthenticatedAxios({
      baseURL,
      timeout: 30000,
      authHeader: { name: 'X-API-KEY', value: config.token },
      errorAdapter: toUniOneError
    });
    this.axios.interceptors.response.use(response => {
      if (isApiErrorRecord(response.data) && response.data.status === 'error') {
        throw toUniOneError({ response });
      }
      return response;
    });
  }

  // ── Email ────────────────────────────────────────

  async sendEmail(message: UniOneEmailMessage): Promise<UniOneSendResponse> {
    let response = await this.axios.post('/email/send.json', {
      message: {
        ...message,
        ...(message.options?.send_at !== undefined
          ? {
              options: {
                ...message.options,
                send_at: toUniOneDateTime(message.options.send_at)
              }
            }
          : {})
      }
    });
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
    let response = await this.axios.post<
      Omit<UniOneValidationResult, 'validity'> & { result?: string; validity: string | number }
    >('/email-validation/single.json', {
      email
    });
    let data = response.data;
    let validity =
      data.result ?? (typeof data.validity === 'string' ? data.validity : undefined);
    if (!validity)
      throw createApiServiceError('UniOne did not return an email validation result.');
    return {
      ...data,
      validity,
      validity_score:
        data.validity_score ?? (typeof data.validity === 'number' ? data.validity : undefined)
    };
  }

  async createConfirmedEmail(email: string): Promise<{
    status: string;
    confirmed_email: UniOneConfirmedEmail;
  }> {
    let response = await this.axios.post('/confirmed-email/create.json', { email });
    return response.data;
  }

  async listConfirmedEmails(): Promise<{
    status: string;
    confirmed_emails: UniOneConfirmedEmail[];
  }> {
    let response = await this.axios.post('/confirmed-email/list.json', {});
    return response.data;
  }

  async deleteConfirmedEmail(email: string): Promise<{ status: string }> {
    let response = await this.axios.post('/confirmed-email/delete.json', { email });
    return response.data;
  }

  // ── Templates ───────────────────────────────────

  async setTemplate(
    template: UniOneTemplate
  ): Promise<{ status: string; template: UniOneTemplate }> {
    let resolvedTemplate = { ...template };
    if (
      resolvedTemplate.id &&
      (resolvedTemplate.name === undefined || resolvedTemplate.from_email === undefined)
    ) {
      let existing = await this.getTemplate(resolvedTemplate.id);
      resolvedTemplate.name ??= existing.template?.name;
      resolvedTemplate.from_email ??= existing.template?.from_email;
    }
    if (!resolvedTemplate.name?.trim()) {
      throw createApiServiceError(
        'A template name is required. Provide name when creating a template, or verify templateId with list_templates when updating.'
      );
    }
    if (!resolvedTemplate.from_email?.trim()) {
      throw createApiServiceError(
        'A sender email address is required. Provide fromEmail when creating a template, or verify the existing sender with get_template when updating.'
      );
    }
    let response = await this.axios.post('/template/set.json', {
      template: resolvedTemplate
    });
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
    let response = await this.axios.post('/suppression/set.json', {
      ...params,
      ...(params.created !== undefined ? { created: toUniOneDateTime(params.created) } : {})
    });
    return response.data;
  }

  async getSuppression(params: {
    email: string;
    allProjects?: boolean;
  }): Promise<{ status: string; suppressions: UniOneSuppressionEntry[] }> {
    let body: Record<string, unknown> = { email: params.email };
    if (params.allProjects !== undefined) {
      body.all_projects = params.allProjects;
    }
    let response = await this.axios.post('/suppression/get.json', body);
    return {
      ...response.data,
      suppressions: (response.data.suppressions ?? []).map(
        (entry: UniOneSuppressionEntry) => ({
          ...entry,
          email: entry.email ?? response.data.email ?? params.email
        })
      )
    };
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
    if (params?.startTime) body.start_time = toUniOneDateTime(params.startTime);
    if (params?.cursor) body.cursor = params.cursor;
    if (params?.limit !== undefined) body.limit = params.limit;
    let response = await this.axios.post('/suppression/list.json', body);
    return response.data;
  }

  async deleteSuppression(params: { email: string }): Promise<{ status: string }> {
    let response = await this.axios.post('/suppression/delete.json', params);
    return response.data;
  }

  // ── Domains ─────────────────────────────────────

  async getDomainDnsRecords(domain: string): Promise<UniOneDomainInfo> {
    let response = await this.axios.post<UniOneDomainResponse>(
      '/domain/get-dns-records.json',
      { domain }
    );
    return this.normalizeDomain(response.data);
  }

  private normalizeDomain(domain: UniOneDomainResponse): UniOneDomainInfo {
    let verification = domain['verification-record'] ?? domain.verification_record;
    let dkim = domain.dkim;
    return {
      ...domain,
      verification_record:
        typeof verification === 'string' ? { value: verification } : verification,
      dkim:
        typeof dkim === 'string'
          ? { value: dkim }
          : dkim
            ? { ...dkim, value: dkim.value ?? dkim.key }
            : undefined
    };
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

  async listDomains(params?: {
    domain?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ status: string; domains: UniOneDomainInfo[] }> {
    let response = await this.axios.post<{ status: string; domains: UniOneDomainResponse[] }>(
      '/domain/list.json',
      params ?? {}
    );
    return {
      ...response.data,
      domains: response.data.domains.map(domain => this.normalizeDomain(domain))
    };
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
  }): Promise<{ status: string; dump_id: number | string }> {
    let body: Record<string, unknown> = {
      start_time: toUniOneDateTime(params.startTime),
      end_time: toUniOneDateTime(params.endTime)
    };
    if (params.limit !== undefined) body.limit = params.limit;
    if (params.allEvents !== undefined) body.all_events = params.allEvents ? 1 : 0;
    if (params.filter) body.filter = params.filter;
    let response = await this.axios.post('/event-dump/create.json', body);
    return response.data;
  }

  async getEventDump(dumpId: number | string): Promise<{ status: string } & UniOneEventDump> {
    let response = await this.axios.post('/event-dump/get.json', { dump_id: dumpId });
    return {
      status: response.data.status,
      ...this.normalizeDump(response.data.event_dump ?? response.data)
    };
  }

  private normalizeDump(dump: UniOneEventDumpResponse): UniOneEventDump {
    return {
      ...dump,
      files: dump.files?.map(file => (typeof file === 'string' ? file : file.url))
    };
  }

  async listEventDumps(): Promise<{ status: string; list: UniOneEventDump[] }> {
    let response = await this.axios.post('/event-dump/list.json', {});
    return {
      status: response.data.status,
      list: (response.data.event_dumps ?? response.data.list ?? []).map(
        (dump: UniOneEventDumpResponse) => this.normalizeDump(dump)
      )
    };
  }

  async deleteEventDump(dumpId: number | string): Promise<{ status: string }> {
    let response = await this.axios.post('/event-dump/delete.json', { dump_id: dumpId });
    return response.data;
  }

  // ── Tags ────────────────────────────────────────

  async listTags(): Promise<{ status: string; tags: UniOneTag[] }> {
    let response = await this.axios.post('/tag/list.json', {});
    return response.data;
  }

  async deleteTag(tag: string): Promise<{ status: string }> {
    let tags = await this.listTags();
    let match = tags.tags.find(entry => entry.tag === tag);
    if (match?.tag_id === undefined) {
      throw createApiServiceError(
        `UniOne tag "${tag}" was not found. Call list_tags to discover existing tags.`
      );
    }
    let response = await this.axios.post('/tag/delete.json', { tag_id: match.tag_id });
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
    if (params.backendId !== undefined) body.backend_domain_id = params.backendId;
    let response = await this.axios.post('/project/create.json', { project: body });
    return {
      status: response.data.status,
      project: response.data.project ?? {
        id: response.data.project_id,
        api_key: response.data.project_api_key,
        name: params.name,
        country: params.country,
        send_enabled: params.sendEnabled,
        custom_unsubscribe_url_enabled: params.customUnsubscribeUrlEnabled
      }
    };
  }

  async updateProject(params: {
    projectId: string;
    name?: string;
    country?: string;
    sendEnabled?: boolean;
    customUnsubscribeUrlEnabled?: boolean;
    backendId?: number;
  }): Promise<{ status: string }> {
    let name = params.name;
    if (name === undefined) {
      let projects = await this.listProjects();
      name = (projects.projects ?? []).find(project => project.id === params.projectId)?.name;
    }
    if (!name?.trim()) {
      throw createApiServiceError(
        'A project name is required. Provide name or verify projectId using list_projects before updating.'
      );
    }
    let body: Record<string, unknown> = { name };
    if (params.country !== undefined) body.country = params.country;
    if (params.sendEnabled !== undefined) body.send_enabled = params.sendEnabled;
    if (params.customUnsubscribeUrlEnabled !== undefined)
      body.custom_unsubscribe_url_enabled = params.customUnsubscribeUrlEnabled;
    if (params.backendId !== undefined) body.backend_domain_id = params.backendId;
    let response = await this.axios.post('/project/update.json', {
      project_id: params.projectId,
      project: body
    });
    return response.data;
  }

  async listProjects(): Promise<{ status: string; projects: UniOneProject[] }> {
    let response = await this.axios.post('/project/list.json', {});
    return response.data;
  }

  async deleteProject(projectId: string): Promise<{ status: string }> {
    let response = await this.axios.post('/project/delete.json', { project_id: projectId });
    return response.data;
  }

  // ── System ──────────────────────────────────────

  async getSystemInfo(): Promise<UniOneSystemInfo> {
    let response = await this.axios.post('/system/info.json', {});
    return response.data;
  }
}
