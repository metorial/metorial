import {
  AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX,
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  isApiErrorRecord,
  pickDefined,
  requestAxios
} from 'slates';
import { z } from 'zod';
import {
  allStatsSchema,
  contactListSchema,
  contactSchema,
  emailAccountSchema,
  emailStatsSchema,
  membershipSchema,
  scheduleSchema,
  sequenceSchema,
  statsSchema,
  stepSchema,
  taskListSchema,
  taskSchema,
  teamReportSchema,
  templateSchema
} from './api-schemas';
export interface Credentials {
  token: string;
  userId?: number;
  userEmail?: string;
  teamId?: number;
}
export interface SequenceListParams {
  top?: number;
  skip?: number;
  name?: string;
  status?: 'Active' | 'Paused' | 'New' | 'Archived';
}
export interface ContactListParams {
  top?: number;
  skip?: number;
  email?: string;
  linkedIn?: string;
}
export interface ContactData {
  firstName?: string;
  email?: string;
  lastName?: string;
  phone?: string;
  title?: string;
  company?: string;
  companySize?: string;
  industry?: string;
  linkedInProfile?: string;
  linkedInSalesNavigator?: string;
  linkedInRecruiter?: string;
  city?: string;
  state?: string;
  country?: string;
  timeZone?: string;
  notes?: string;
  customFields?: Array<{ key: string; value: string }>;
}
type Data = Record<string, unknown>;
const creationPaths = new Set([
  '/v3/sequences',
  '/v3/contacts',
  '/v3/contact-lists',
  '/v3/email-templates',
  '/v3/contact-blacklist-rules/domains',
  '/v3/contact-blacklist-rules/emails',
  '/v3/tasks'
]);
export const requireId = (value: unknown, field = 'ID'): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1)
    throw createApiServiceError(`${field} must be a positive safe integer.`);
  return value;
};
export const requireString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim())
    throw createApiServiceError(`${field} is required.`);
  return value;
};
const ruleSchema = z.object({
  id: z.number().int().positive().safe(),
  pattern: z.string(),
  isGlobal: z.boolean().optional()
});
const identitySchema = z.object({
  userId: z.number().int().positive().safe(),
  username: z.string().optional(),
  teamId: z.number().int().positive().safe().optional()
});
export class Client {
  private readonly http: ReturnType<typeof createAuthenticatedAxios>;
  private readonly legacyHttp: ReturnType<typeof createAuthenticatedAxios>;
  private readonly redactor: AuthConfigSecretRedactor;
  private readonly credentials: Credentials;
  constructor(config: Credentials) {
    requireString(config.token, 'Reply.io API key');
    if (/[\r\n]/.test(config.token))
      throw createApiServiceError('Reply.io API key must not contain line breaks.');
    if (config.userId !== undefined) requireId(config.userId, 'userId');
    if (config.teamId !== undefined) requireId(config.teamId, 'teamId');
    if (config.userId !== undefined && config.userEmail !== undefined)
      throw createApiServiceError('Choose userId or userEmail, not both.');
    if (config.userEmail !== undefined && !z.email().safeParse(config.userEmail).success)
      throw createApiServiceError('userEmail must be an email address.');
    if (config.teamId !== undefined && config.userEmail === undefined)
      throw createApiServiceError(
        'teamId is used with userEmail for organization-key impersonation.'
      );
    this.credentials = config;
    this.redactor = new AuthConfigSecretRedactor({ token: config.token });
    this.legacyHttp = createAuthenticatedAxios({
      baseURL: 'https://api.reply.io',
      authHeader: { name: 'X-API-Key', value: config.token },
      timeout: 30000,
      maxRedirects: 0,
      validateStatus: () => true
    });
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.reply.io',
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 30000,
      maxRedirects: 0,
      validateStatus: () => true
    });
  }
  private failure(error: unknown) {
    const raw = getApiErrorStatus(error);
    const status =
      typeof raw === 'number' && Number.isInteger(raw) && raw >= 100 && raw <= 599
        ? raw
        : undefined;
    return buildApiServiceError(
      { response: { status } },
      {
        providerLabel: 'Reply.io',
        operation: 'request',
        reason: 'replyio_api_error',
        parent: {},
        formatMessage: () =>
          `Reply.io request failed${status ? ` (HTTP ${status})` : ''}. ${status === 401 ? 'Check the API key and resolved user.' : status === 403 ? 'Check domain scopes, user permissions and team or organization impersonation.' : status === 429 ? 'Wait for the API rate limit to reset.' : 'Check identifiers and parameters. Reconcile uncertain writes before retrying.'}`
      }
    );
  }
  private sanitize(value: unknown): unknown {
    if (typeof value === 'string') {
      if (/^https?:\/\//i.test(value)) {
        try {
          const url = new URL(value);
          if (
            url.username ||
            url.password ||
            [...url.searchParams.keys()].some(key =>
              /token|credential|signature|secret|password|^(?:api[_-]?key|sig)$|^x-amz-|^x-goog-/i.test(
                key
              )
            )
          )
            return '[redacted URL]';
        } catch {
          /* Provider text still receives credential-value redaction. */
        }
      }
      return this.redactor
        .redactEmbedded(value)
        .replaceAll(`${AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX}token$$`, '[redacted]')
        .replaceAll(`${AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX}token`, '[redacted]');
    }
    if (Array.isArray(value)) return value.map(item => this.sanitize(item));
    if (isApiErrorRecord(value))
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, this.sanitize(item)])
      );
    return value;
  }
  private async request<T extends z.ZodType>(
    method: string,
    url: string,
    schema: T,
    data?: unknown,
    params?: Data,
    options: { legacy?: boolean; preserveForUpdate?: boolean } = {}
  ): Promise<z.output<T>> {
    const headers: Record<string, string> = {};
    if (this.credentials.userId !== undefined)
      headers['X-User-Id'] = String(this.credentials.userId);
    if (this.credentials.userEmail !== undefined)
      headers['X-User-Email'] = this.credentials.userEmail;
    if (this.credentials.teamId !== undefined)
      headers['X-Team-Id'] = String(this.credentials.teamId);
    const response = await requestAxios(
      'Reply.io request',
      () =>
        (options.legacy ? this.legacyHttp : this.http).request({
          method,
          url,
          data,
          params: params ? pickDefined(params) : undefined,
          headers
        }),
      error => this.failure(error)
    );
    if (response.status < 200 || response.status >= 300)
      throw this.failure({ response: { status: response.status } });
    const completedStatus = options.legacy
      ? 200
      : method === 'DELETE'
        ? 204
        : method === 'POST' && creationPaths.has(url)
          ? 201
          : 200;
    if (response.status !== completedStatus)
      throw createApiServiceError(
        'Reply.io did not return the documented synchronous completion status. Reconcile the operation before retrying; deletion or completion is not confirmed.',
        { parent: {} }
      );
    const parsed = schema.safeParse(response.data);
    if (!parsed.success)
      throw createApiServiceError(
        'Reply.io returned an unexpected response. Reconcile any write using its identifier before retrying.'
      );
    return options.preserveForUpdate ? parsed.data : schema.parse(this.sanitize(parsed.data));
  }
  private page(params?: { top?: number; skip?: number }, max = 1000) {
    const top = params?.top ?? 25;
    const skip = params?.skip ?? 0;
    if (
      !Number.isSafeInteger(top) ||
      top < 1 ||
      top > max ||
      !Number.isSafeInteger(skip) ||
      skip < 0
    )
      throw createApiServiceError(
        `top must be 1–${max} and skip must be a nonnegative integer.`
      );
    return { top, skip };
  }
  private async all<T extends z.ZodType>(url: string, item: T) {
    const items: z.output<T>[] = [];
    for (let page = 0; page < 100; page++) {
      const result = await this.request(
        'GET',
        url,
        z.object({ items: z.array(item), hasMore: z.boolean() }),
        undefined,
        { top: 100, skip: items.length }
      );
      items.push(...result.items);
      if (!result.hasMore) return items;
      if (!result.items.length)
        throw createApiServiceError('Reply.io returned an empty page with hasMore=true.');
    }
    throw createApiServiceError(
      'Reply.io listing exceeded the 10,000-item safety limit; use paginated inputs where available.'
    );
  }
  getCurrentUser() {
    return this.request('GET', '/v3/whoami', identitySchema);
  }
  listSequences(params?: SequenceListParams) {
    return this.request(
      'GET',
      '/v3/sequences',
      z.object({ items: z.array(sequenceSchema), hasMore: z.boolean() }),
      undefined,
      {
        ...this.page(params),
        name: params?.name,
        status: params?.status === 'Archived' ? undefined : params?.status?.toLowerCase(),
        isArchived: params?.status === 'Archived' ? true : undefined
      }
    );
  }
  getSequence(id: number) {
    return this.request('GET', `/v3/sequences/${requireId(id)}`, sequenceSchema);
  }
  private settings(data: Data) {
    if (!isApiErrorRecord(data.settings)) return data;
    const settings = { ...data.settings };
    if (settings.repliesHandlingType === 'MarkAsFinished')
      settings.repliesHandlingType = 'markAsFinished';
    if (settings.repliesHandlingType === 'ContinueSending')
      settings.repliesHandlingType = 'continueSending';
    return { ...data, settings };
  }
  createSequence(data: Data) {
    if (!Array.isArray(data.steps) || !data.steps.length)
      throw createApiServiceError(
        'Current Reply.io sequence creation requires steps. Supply at least one documented step; new sequences are not started automatically.'
      );
    requireString(data.name, 'name');
    if (data.scheduleId !== undefined) requireId(data.scheduleId, 'scheduleId');
    if (Array.isArray(data.emailAccounts))
      for (const id of data.emailAccounts) requireId(id, 'email account ID');
    if (
      isApiErrorRecord(data.settings) &&
      [
        'emailsCountPerDay',
        'daysToFinishProspect',
        'emailSendingDelaySeconds',
        'dailyThrottling',
        'disableOpensTracking',
        'repliesHandlingType',
        'enableLinksTracking'
      ].some(
        key =>
          data.settings && isApiErrorRecord(data.settings) && data.settings[key] === undefined
      )
    )
      throw createApiServiceError(
        'When creating a sequence with settings, supply all seven documented settings; omit settings to use provider defaults. Partial settings are supported for update.'
      );
    return this.request('POST', '/v3/sequences', sequenceSchema, this.settings(data));
  }
  async updateSequence(id: number, data: Data) {
    if (isApiErrorRecord(data.settings)) {
      const existing = await this.request(
        'GET',
        `/v3/sequences/${requireId(id)}`,
        sequenceSchema,
        undefined,
        undefined,
        { preserveForUpdate: true }
      );
      data = { ...data, settings: { ...existing.settings, ...data.settings } };
    }
    return this.request(
      'PATCH',
      `/v3/sequences/${requireId(id)}`,
      sequenceSchema,
      this.settings(data)
    );
  }
  deleteSequence(id: number) {
    return this.request('DELETE', `/v3/sequences/${requireId(id)}`, z.unknown());
  }
  startSequence(id: number) {
    return this.request('POST', `/v3/sequences/${requireId(id)}/start`, sequenceSchema, {});
  }
  pauseSequence(id: number) {
    return this.request('POST', `/v3/sequences/${requireId(id)}/pause`, sequenceSchema, {});
  }
  archiveSequence(id: number) {
    return this.request('POST', `/v3/sequences/${requireId(id)}/archive`, sequenceSchema, {});
  }
  listSequenceSteps(id: number) {
    return this.request('GET', `/v3/sequences/${requireId(id)}/steps`, z.array(stepSchema));
  }
  listSequenceContacts(
    id: number,
    params?: { top?: number; skip?: number; additionalColumns?: string }
  ) {
    return this.request(
      'GET',
      `/v3/sequences/${requireId(id)}/contacts/state`,
      z.object({ items: z.array(membershipSchema), hasMore: z.boolean() }),
      undefined,
      { ...this.page(params, 100), additionalColumns: params?.additionalColumns }
    );
  }
  async addContactToSequence(
    id: number,
    data: { contactId: number; forcePush?: boolean; startStepId?: number }
  ) {
    requireId(data.contactId, 'contactId');
    if (data.startStepId !== undefined) requireId(data.startStepId, 'startStepId');
    const result = await this.request(
      'POST',
      `/v3/sequences/${requireId(id)}/contact-links/bulk`,
      z.object({
        added: z.array(z.number().int().safe()),
        notProcessed: z
          .record(
            z.string(),
            z.object({ error: z.string(), errorDetails: z.string().nullable().optional() })
          )
          .optional()
      }),
      pickDefined({
        contactIds: [data.contactId],
        removeFromExisting: data.forcePush,
        startStepId: data.startStepId
      })
    );
    if (
      !result.added.includes(data.contactId) ||
      result.notProcessed?.[String(data.contactId)]
    )
      throw createApiServiceError(
        `Reply.io did not enroll contact ${data.contactId} in sequence ${id}. Check membership, permissions and plan limits; a separately created contact is retained.`
      );
    return { contactId: data.contactId, sequenceId: id, added: true };
  }
  removeContactFromSequence(id: number, contactId: number) {
    return this.request(
      'DELETE',
      `/v3/sequences/${requireId(id)}/contact-links/${requireId(contactId, 'contactId')}`,
      z.unknown()
    );
  }
  listContacts(params?: ContactListParams) {
    return this.request(
      'GET',
      '/v3/contacts',
      z.object({ items: z.array(contactSchema), hasMore: z.boolean() }),
      undefined,
      { ...this.page(params), email: params?.email, linkedIn: params?.linkedIn }
    );
  }
  getContact(id: number) {
    return this.request('GET', `/v3/contacts/${requireId(id)}`, contactSchema);
  }
  async searchContacts(email: string) {
    requireString(email, 'email');
    const result = await this.listContacts({ email, top: 1000 });
    if (result.hasMore)
      throw createApiServiceError(
        'Exact-email search exceeded one page; use list_contacts with skip to continue.'
      );
    return result.items.filter(
      contact => contact.email?.toLowerCase() === email.toLowerCase()
    );
  }
  private contactData(data: ContactData, update = false) {
    const mapped: Data = { ...data };
    for (const [old, key] of [
      ['linkedInProfile', 'linkedInUrl'],
      ['linkedInSalesNavigator', 'linkedInSalesNavigatorUrl'],
      ['linkedInRecruiter', 'linkedInRecruiterUrl'],
      ['timeZone', 'timeZoneId']
    ] as const)
      if (mapped[old] !== undefined) {
        mapped[key] = mapped[old];
        delete mapped[old];
      }
    if (update && data.customFields)
      mapped.customFields = data.customFields.map(field => ({
        name: field.key,
        value: field.value
      }));
    return mapped;
  }
  createContact(data: ContactData) {
    return this.request('POST', '/v3/contacts', contactSchema, this.contactData(data));
  }
  updateContact(id: number, data: ContactData) {
    return this.request(
      'PATCH',
      `/v3/contacts/${requireId(id)}`,
      contactSchema,
      this.contactData(data, true)
    );
  }
  deleteContact(id: number) {
    return this.request('DELETE', `/v3/contacts/${requireId(id)}`, z.unknown());
  }
  listContactLists() {
    return this.all('/v3/contact-lists', contactListSchema);
  }
  getContactList(id: number) {
    return this.request('GET', `/v3/contact-lists/${requireId(id)}`, contactListSchema);
  }
  createContactList(name: string) {
    return this.request('POST', '/v3/contact-lists', contactListSchema, {
      name: requireString(name, 'name'),
      isShared: false
    });
  }
  async updateContactList(id: number, name: string) {
    const existing = await this.getContactList(id);
    if (typeof existing.isShared !== 'boolean')
      throw createApiServiceError(
        'Reply.io omitted the existing list visibility. No rename was submitted because visibility cannot be preserved.'
      );
    return this.request('PUT', `/v3/contact-lists/${requireId(id)}`, contactListSchema, {
      name: requireString(name, 'name'),
      isShared: existing.isShared
    });
  }
  deleteContactList(id: number) {
    return this.request('DELETE', `/v3/contact-lists/${requireId(id)}`, z.unknown());
  }
  listTemplates() {
    return this.all('/v3/email-templates', templateSchema);
  }
  getTemplate(id: number) {
    return this.request('GET', `/v3/email-templates/${requireId(id)}`, templateSchema);
  }
  createTemplate(data: {
    name: string;
    subject?: string;
    body?: string;
    categoryId?: number;
    folderId?: number;
    folderType?: 'personal' | 'team';
  }) {
    if (data.categoryId !== undefined)
      throw createApiServiceError(
        'categoryId has no documented current equivalent. Use folderId and folderType for current template folders.'
      );
    return this.request('POST', '/v3/email-templates', templateSchema, {
      name: requireString(data.name, 'name'),
      subject: data.subject,
      body: typeof data.body === 'string' ? data.body : requireString(data.body, 'body'),
      folderType: data.folderType ?? 'personal',
      folderId: data.folderId === undefined ? undefined : requireId(data.folderId, 'folderId')
    });
  }
  async updateTemplate(
    id: number,
    data: { name?: string; subject?: string; body?: string; categoryId?: number }
  ) {
    if (data.categoryId !== undefined)
      throw createApiServiceError(
        'Current Reply.io template update cannot move a folder. categoryId has no documented current equivalent; move an existing template in Reply.io.'
      );
    const current = await this.request(
      'GET',
      `/v3/email-templates/${requireId(id)}`,
      templateSchema,
      undefined,
      undefined,
      { preserveForUpdate: true }
    );
    if (!Array.isArray(current.attachments))
      throw createApiServiceError(
        'Reply.io omitted the existing template attachments. No update was submitted because attachments cannot be preserved.'
      );
    return this.request('PUT', `/v3/email-templates/${requireId(id)}`, templateSchema, {
      name: data.name ?? current.name,
      subject: data.subject ?? current.subject,
      body: data.body ?? current.body,
      attachmentIds: current.attachments.map(item =>
        requireId(item.id, 'existing template attachment ID')
      )
    });
  }
  deleteTemplate(id: number) {
    return this.request('DELETE', `/v3/email-templates/${requireId(id)}`, z.unknown());
  }
  async listEmailAccounts(disconnectedOnly = false) {
    const items = await this.all('/v3/email-accounts', emailAccountSchema);
    return disconnectedOnly
      ? items.filter(item => item.connectionStatus === 'disconnected')
      : items;
  }
  async listBlacklist(type?: 'domain' | 'email') {
    return {
      domains:
        type === 'email'
          ? []
          : await this.all('/v3/contact-blacklist-rules/domains', ruleSchema),
      emails:
        type === 'domain'
          ? []
          : await this.all('/v3/contact-blacklist-rules/emails', ruleSchema)
    };
  }
  async addToBlacklist(data: { domains?: string[]; emails?: string[] }) {
    if (!(data.domains?.length || data.emails?.length))
      throw createApiServiceError('Supply at least one domain or email.');
    const result: { id: number; pattern: string; type: string }[] = [];
    for (const [type, patterns] of [
      ['domains', data.domains],
      ['emails', data.emails]
    ] as const)
      for (const pattern of patterns ?? []) {
        try {
          const rule = await this.request(
            'POST',
            `/v3/contact-blacklist-rules/${type}`,
            ruleSchema,
            { pattern: requireString(pattern, type) }
          );
          result.push({ id: rule.id, pattern: rule.pattern, type });
        } catch {
          throw createApiServiceError(
            `Blacklist addition was not fully confirmed. Previously created rule IDs: ${result.map(rule => rule.id).join(', ') || 'none confirmed'}. Reconcile every requested pattern before retrying.`,
            { parent: {} }
          );
        }
      }
    return { rules: result };
  }
  async removeFromBlacklist(data: { domains?: string[]; emails?: string[] }) {
    if (!(data.domains?.length || data.emails?.length))
      throw createApiServiceError('Supply at least one domain or email.');
    for (const [type, patterns] of [
      ['domains', data.domains],
      ['emails', data.emails]
    ] as const) {
      if (!patterns?.length) continue;
      const rules = await this.all(`/v3/contact-blacklist-rules/${type}`, ruleSchema);
      for (const pattern of patterns) {
        const matches = rules.filter(
          rule => rule.pattern.toLowerCase() === pattern.toLowerCase()
        );
        if (matches.length !== 1)
          throw createApiServiceError(
            'Blacklist removal needs exactly one matching rule. Inspect the blacklist before retrying.'
          );
        await this.request(
          'DELETE',
          `/v3/contact-blacklist-rules/${type}/${matches[0]!.id}`,
          z.unknown()
        );
      }
    }
  }
  private taskId(id: string) {
    if (!/^[1-9]\d*$/.test(id))
      throw createApiServiceError(
        'Current Reply.io task IDs are numeric. Pass the returned numeric ID as a string; client-assigned ULIDs are not supported.'
      );
    return requireId(Number(id), 'taskId');
  }
  async listTasks(params?: {
    status?: string;
    taskType?: string;
    dueDate?: string;
    top?: number;
    skip?: number;
  }) {
    if (params?.dueDate !== undefined)
      throw createApiServiceError(
        'Current task filtering uses a start-time range, not a dueDate filter. List tasks and inspect dueTo instead.'
      );
    const types: Record<string, string> = {
      email_manual: 'manualEmail',
      call: 'call',
      linkedin: 'linkedIn',
      custom: 'toDo'
    };
    if (params?.taskType === 'email_auto')
      throw createApiServiceError(
        'Current Reply.io task API does not expose automatic email tasks.'
      );
    if (params?.status === 'skipped')
      throw createApiServiceError(
        'Legacy skipped status has no exact current task filter equivalent; inspect the current status on list results.'
      );
    const statuses: Record<string, string> = {
      pending: 'new',
      completed: 'finished',
      skipped: 'cancelled'
    };
    return this.request(
      'POST',
      '/v3/tasks/filter',
      z.object({ items: z.array(taskListSchema), hasMore: z.boolean() }),
      pickDefined({
        status: params?.status ? (statuses[params.status] ?? params.status) : undefined,
        taskType: params?.taskType ? (types[params.taskType] ?? params.taskType) : undefined
      }),
      this.page(params)
    );
  }
  getTask(id: string) {
    return this.request('GET', `/v3/tasks/${this.taskId(id)}`, taskSchema);
  }
  createTask(data: Data) {
    return this.request('POST', '/v3/tasks', taskSchema, data);
  }
  async updateTask(id: string, data: Data) {
    const current = await this.request(
      'GET',
      `/v3/tasks/${this.taskId(id)}`,
      taskSchema,
      undefined,
      undefined,
      { preserveForUpdate: true }
    );
    return this.request('PUT', `/v3/tasks/${this.taskId(id)}`, taskSchema, {
      taskType: current.taskType,
      startAt: current.startAt,
      dueTo: current.dueTo,
      contactId: current.contactId,
      linkedInTaskType: current.linkedInTaskType,
      ...data,
      template: isApiErrorRecord(data.template)
        ? { ...current.template, ...data.template }
        : (data.template ?? current.template)
    });
  }
  deleteTask(id: string) {
    return this.request('DELETE', `/v3/tasks/${this.taskId(id)}`, z.unknown());
  }
  assignTask(id: string, userId: number) {
    return this.request('PUT', `/v3/tasks/${this.taskId(id)}/assigned-user`, taskSchema, {
      userId: requireId(userId, 'ownerId')
    });
  }
  async getSequenceStatistics(params?: { sequenceId?: number }) {
    if (params?.sequenceId !== undefined)
      return this.request(
        'POST',
        `/v3/sequences/${requireId(params.sequenceId)}/stats`,
        statsSchema,
        {}
      );
    return {
      items: await this.request('POST', '/v3/sequences/stats', z.array(allStatsSchema), {})
    };
  }
  async getSequenceEmailStatistics(params?: { sequenceId?: number }) {
    if (params?.sequenceId !== undefined)
      return this.request(
        'POST',
        `/v3/sequences/${requireId(params.sequenceId)}/stats/emails`,
        emailStatsSchema,
        {}
      );
    return {
      items: (
        await this.request('POST', '/v3/sequences/stats', z.array(allStatsSchema), {})
      ).map(item => ({
        sequenceId: item.sequenceId,
        name: item.name,
        emailOverview: item.emailOverview
      }))
    };
  }
  getSequenceContactStatistics(params?: { sequenceId?: number }) {
    return this.request(
      'GET',
      `/v3/sequences/${requireId(params?.sequenceId, 'sequenceId for contact count')}/contacts/count`,
      z.object({ count: z.number().int().nonnegative().safe() })
    );
  }
  getTeamPerformance(params: { from: string; to?: string }) {
    const to = params.to ?? new Date().toISOString();
    if (
      !Number.isFinite(Date.parse(params.from)) ||
      !Number.isFinite(Date.parse(to)) ||
      Date.parse(params.from) > Date.parse(to)
    )
      throw createApiServiceError('from and to must define a valid chronological date range.');
    return this.request('POST', '/v3/reporting/team-performance/overview', teamReportSchema, {
      filters: { from: params.from, to }
    });
  }
  async listSchedules(params?: { name?: string; isDefault?: boolean; sequenceId?: string }) {
    let items = await this.request('GET', '/v3/schedules', z.array(scheduleSchema));
    if (params?.name !== undefined)
      items = items.filter(item =>
        item.name?.toLowerCase().includes(params.name!.toLowerCase())
      );
    if (params?.isDefault !== undefined)
      items = items.filter(item => item.isDefault === params.isDefault);
    if (params?.sequenceId !== undefined) {
      if (!/^[1-9]\d*$/.test(params.sequenceId))
        throw createApiServiceError('sequenceId must be a positive numeric ID as a string.');
      const sequence = await this.getSequence(requireId(Number(params.sequenceId)));
      items = items.filter(item => item.id === sequence.scheduleId);
    }
    return items;
  }
  private async legacyAction(action: string, data: Data) {
    await this.request('POST', `/v1/actions/${action}`, z.unknown(), data, undefined, {
      legacy: true
    });
    return { accepted: true };
  }
  addAndPushToCampaign(data: Data) {
    requireId(data.campaignId, 'campaignId');
    return this.legacyAction('addandpushtocampaign', data);
  }
  markAsReplied(data: { email: string; campaignId?: number }) {
    if (data.campaignId !== undefined)
      throw createApiServiceError(
        'Legacy markReplied affects all campaigns and does not support campaignId scoping. Omit campaignId only if this broader effect is intended.'
      );
    return this.legacyAction('markasreplied', { email: data.email });
  }
  markAsFinished(data: { email: string; campaignId?: number }) {
    if (data.campaignId !== undefined)
      throw createApiServiceError(
        'Legacy markFinished affects all campaigns and does not support campaignId scoping. Omit campaignId only if this broader effect is intended.'
      );
    return this.legacyAction('markasfinished', { email: data.email });
  }
}
