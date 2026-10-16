import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';

const named = z.object({ uuid: z.string(), name: z.string() }).passthrough();
const contactRef = z.object({ uuid: z.string(), name: z.string().nullable() }).passthrough();
const contactSchema = z
  .object({
    uuid: z.string(),
    name: z.string().nullable(),
    status: z.string(),
    language: z.string().nullable(),
    urns: z.array(z.string()),
    groups: z.array(named),
    fields: z.record(z.string(), z.string().nullable()),
    created_on: z.string(),
    modified_on: z.string(),
    last_seen_on: z.string().nullable()
  })
  .passthrough();
const groupSchema = z
  .object({
    uuid: z.string(),
    name: z.string(),
    query: z.string().nullable(),
    count: z.number(),
    status: z.string().optional(),
    system: z.boolean().optional()
  })
  .passthrough();
const fieldSchema = z
  .object({ key: z.string(), name: z.string(), type: z.string() })
  .passthrough();
const messageSchema = z
  .object({
    uuid: z.string(),
    contact: contactRef,
    urn: z.string(),
    direction: z.enum(['incoming', 'outgoing', 'in', 'out']),
    type: z.string(),
    status: z.string(),
    text: z.string(),
    attachments: z.array(
      z.union([
        z.string(),
        z.object({ url: z.string(), content_type: z.string().optional() }).passthrough()
      ])
    ),
    labels: z.array(named),
    created_on: z.string(),
    sent_on: z.string().nullable()
  })
  .passthrough();
const sentMessageSchema = z
  .object({
    uuid: z.string(),
    contact: contactRef,
    text: z.string(),
    status: z.string(),
    created_on: z.string()
  })
  .passthrough();
const broadcastSchema = z
  .object({ uuid: z.string(), status: z.string(), created_on: z.string() })
  .passthrough();
const flowSchema = z
  .object({
    uuid: z.string(),
    name: z.string(),
    type: z.string(),
    archived: z.boolean(),
    expires: z.number(),
    runs: z
      .object({
        active: z.number(),
        completed: z.number(),
        interrupted: z.number(),
        expired: z.number()
      })
      .passthrough(),
    results: z.array(
      z
        .object({ key: z.string(), name: z.string(), categories: z.array(z.string()) })
        .passthrough()
    ),
    created_on: z.string(),
    modified_on: z.string()
  })
  .passthrough();
const flowStartSchema = z
  .object({ uuid: z.string(), flow: named, status: z.string(), created_on: z.string() })
  .passthrough();
const runSchema = z
  .object({
    uuid: z.string(),
    flow: named,
    contact: z.object({ uuid: z.string(), name: z.string(), urn: z.string() }).passthrough(),
    responded: z.boolean(),
    values: z.record(
      z.string(),
      z
        .object({
          value: z.string(),
          category: z.string(),
          name: z.string(),
          time: z.string()
        })
        .passthrough()
    ),
    created_on: z.string(),
    modified_on: z.string(),
    exited_on: z.string().nullable(),
    exit_type: z.string().nullable()
  })
  .passthrough();
const campaignSchema = z
  .object({
    uuid: z.string(),
    name: z.string(),
    archived: z.boolean(),
    group: named,
    created_on: z.string()
  })
  .passthrough();
const campaignEventSchema = z
  .object({
    uuid: z.string(),
    campaign: named,
    relative_to: z.object({ key: z.string(), name: z.string() }).passthrough(),
    offset: z.number(),
    unit: z.string(),
    delivery_hour: z.number(),
    message: z.record(z.string(), z.string()).nullable(),
    flow: named.nullable(),
    created_on: z.string()
  })
  .passthrough();
const channelSchema = z
  .object({
    uuid: z.string(),
    name: z.string(),
    address: z.string(),
    country: z.string().nullable(),
    last_seen: z.string().nullable(),
    created_on: z.string()
  })
  .passthrough();
const labelSchema = z
  .object({ uuid: z.string(), name: z.string(), count: z.number() })
  .passthrough();
const ticketSchema = z
  .object({
    uuid: z.string(),
    contact: contactRef,
    status: z.enum(['open', 'closed']),
    topic: named.nullable(),
    assignee: z.object({ email: z.string(), name: z.string() }).passthrough().nullable(),
    opened_on: z.string(),
    modified_on: z.string(),
    closed_on: z.string().nullable()
  })
  .passthrough();
const topicSchema = z
  .object({
    uuid: z.string(),
    name: z.string(),
    counts: z.object({ open: z.number(), closed: z.number() }).passthrough(),
    system: z.boolean(),
    created_on: z.string()
  })
  .passthrough();
const workspaceSchema = z
  .object({
    uuid: z.string(),
    name: z.string(),
    country: z.string(),
    languages: z.array(z.string()),
    timezone: z.string(),
    date_style: z.string(),
    anon: z.boolean()
  })
  .passthrough();
const globalSchema = z
  .object({ key: z.string(), name: z.string(), value: z.string(), modified_on: z.string() })
  .passthrough();
const userSchema = z
  .object({
    email: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    role: z.string(),
    created_on: z.string()
  })
  .passthrough();

export type Contact = z.infer<typeof contactSchema>;
export type QuickReply = {
  type?: 'text' | 'form' | 'url' | 'location';
  text: string;
  extra?: string;
};
export interface PaginatedResponse<T> {
  next: string | null;
  previous: string | null;
  results: T[];
}
type PageParams = { cursor?: string };
type ContactData = {
  name?: string;
  language?: string;
  urns?: string[];
  groups?: string[];
  fields?: Record<string, string>;
};
type EventData = {
  relative_to?: string;
  offset?: number;
  unit?: string;
  delivery_hour?: number;
  message?: Record<string, string>;
  flow?: string;
};

export function requireText(
  value: string | undefined,
  field: string
): asserts value is string {
  if (!value?.trim())
    throw createApiServiceError(`${field} is required.`, { reason: 'textit_invalid_input' });
}
export function validateList(values: string[] | undefined, field: string, max = 100): void {
  if (values && (values.length > max || values.some(v => !v.trim())))
    throw createApiServiceError(`${field} must contain at most ${max} non-empty values.`, {
      reason: 'textit_invalid_input'
    });
}
export function validateRecipients(data: {
  contacts?: string[];
  groups?: string[];
  urns?: string[];
}): void {
  for (const [key, values] of Object.entries(data)) validateList(values, key);
  if (![data.contacts, data.groups, data.urns].some(v => v && v.length > 0))
    throw createApiServiceError('Provide at least one contact, group, or URN.', {
      reason: 'textit_invalid_input'
    });
}
function validateReply(reply: QuickReply): void {
  requireText(reply.text, 'Quick reply text');
  if (reply.text.length > 64 || (reply.extra?.length ?? 0) > 1000)
    throw createApiServiceError(
      'Quick reply text must be at most 64 characters and extra at most 1000 characters.'
    );
}

export class Client {
  private axios;
  constructor(private token: string) {
    requireText(token, 'API token');
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://textit.com/api/v2',
      authHeader: { value: `Token ${token}` },
      timeout: 30000,
      maxRedirects: 0,
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'TextIt',
          reason: 'textit_api_error',
          extractResponse: (value, helpers) => {
            const response = helpers.getResponseWithBody(value);
            return response ? { ...response, data: this.redact(response.data) } : undefined;
          },
          extractMessage: (value, helpers) => {
            const response = helpers.getResponseWithBody(value);
            if (response?.data === undefined) return undefined;
            const details: string[] = [];
            const visit = (item: unknown, path: string, depth: number): void => {
              if (depth > 5 || details.length >= 5) return;
              if (Array.isArray(item)) {
                item.forEach((entry, index) => visit(entry, `${path}[${index}]`, depth + 1));
                return;
              }
              if (item && typeof item === 'object') {
                Object.entries(item).forEach(([key, entry]) => {
                  const field = this.redact(key).slice(0, 80);
                  const segment = /^[A-Za-z_][A-Za-z0-9_]*$/.test(field)
                    ? `${path ? '.' : ''}${field}`
                    : `[${JSON.stringify(field)}]`;
                  visit(entry, `${path}${segment}`.slice(0, 240), depth + 1);
                });
                return;
              }
              const messages: string[] = [];
              helpers.collectDetails(item, messages, { includeNumbers: false });
              for (const message of messages) {
                const detail = path ? `${path}: ${message}` : message;
                if (!details.includes(detail)) details.push(detail);
              }
            };
            visit(this.redact(response.data), '', 0);
            return details.length ? details.join('; ').slice(0, 1000) : undefined;
          },
          extractUpstreamCode: (value, _response, helpers) => {
            const body = helpers.getResponseWithBody(value)?.data;
            const code = helpers.isRecord(body) ? body.code : undefined;
            return typeof code === 'string' || typeof code === 'number'
              ? this.redact(String(code))
              : undefined;
          },
          formatMessage: parts =>
            this.redact(`TextIt API request failed: ${parts.statusLabel}${parts.message}`),
          parent: {}
        })
    });
  }
  redact<T>(value: T): T {
    const clean = (item: unknown): unknown => {
      if (typeof item === 'string') {
        if (this.revealsToken(item)) return '[REDACTED]';
        return item.replace(
          /([?&](?:api[_-]?key|token|access_token|refresh_token|api[_-]?token|auth|authorization|password|secret)=)[^&#\s]*/gi,
          '$1[REDACTED]'
        );
      }
      if (Array.isArray(item)) return item.map(clean);
      if (item && typeof item === 'object')
        return Object.fromEntries(
          Object.entries(item).map(([key, entry]) => [clean(key), clean(entry)])
        );
      return item;
    };
    return clean(value) as T;
  }
  private revealsToken(value: string): boolean {
    let candidate = value;
    // Inspect each complete decoding representation before decoding again.
    // Every changing pass removes at least two characters, so nesting is
    // bounded by the original input length rather than a fail-open cutoff.
    while (true) {
      const normalized = candidate.replace(/[\t\n\r]/g, '');
      if (candidate.includes(this.token) || normalized.includes(this.token)) return true;
      const urls = normalized.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
      for (const possibleUrl of [normalized, ...urls]) {
        let url: URL;
        try {
          url = new URL(possibleUrl);
        } catch {
          continue;
        }
        if (url.href.includes(this.token) || url.hostname.includes(this.token.toLowerCase()))
          return true;
        const components = [url.username, url.password, url.pathname, url.hash];
        for (const [key, entry] of url.searchParams) components.push(key, entry);
        if (components.some(part => part.replace(/[\t\n\r]/g, '').includes(this.token)))
          return true;
      }
      const decoded = candidate.replace(/(?:%[0-9a-f]{2})+/gi, encoded =>
        Buffer.from(encoded.replaceAll('%', ''), 'hex').toString('utf8')
      );
      if (decoded === candidate) return false;
      candidate = decoded;
    }
  }
  private parse<S extends z.ZodType>(schema: S, value: unknown): z.infer<S> {
    const parsed = schema.safeParse(this.redact(value));
    if (!parsed.success)
      throw createApiServiceError(
        this.redact(
          `TextIt returned an invalid response (${parsed.error.issues.map(issue => issue.path.join('.')).join(', ')}).`
        ),
        { reason: 'textit_invalid_response' }
      );
    return parsed.data;
  }
  private async read<S extends z.ZodType>(
    path: string,
    schema: S,
    params?: Record<string, unknown>
  ): Promise<z.infer<S>> {
    return this.parse(
      schema,
      (await this.axios.get(path, { params: pickDefined(params ?? {}) })).data
    );
  }
  private async write<S extends z.ZodType>(
    path: string,
    data: object,
    schema: S,
    params?: Record<string, unknown>
  ): Promise<z.infer<S>> {
    return this.parse(
      schema,
      (await this.axios.post(path, pickDefined(data), { params })).data
    );
  }
  private async page<S extends z.ZodType>(
    path: string,
    schema: S,
    params: Record<string, unknown> = {}
  ): Promise<PaginatedResponse<z.infer<S>>> {
    const { cursor, ...filters } = params;
    if (
      cursor !== undefined &&
      (typeof cursor !== 'string' ||
        !cursor.trim() ||
        /^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(cursor))
    )
      throw createApiServiceError(
        'cursor must be the opaque nextCursor value returned by this tool.'
      );
    const result = await this.read(
      path,
      z
        .object({
          next: z.string().nullable(),
          previous: z.string().nullable(),
          results: z.array(schema)
        })
        .passthrough(),
      { ...filters, cursor }
    );
    for (const link of [result.next, result.previous])
      if (link !== null) {
        let url: URL;
        try {
          url = new URL(link, 'https://textit.com');
        } catch {
          throw createApiServiceError('TextIt returned an invalid pagination link.');
        }
        if (
          url.origin !== 'https://textit.com' ||
          url.username ||
          url.password ||
          url.pathname !== `/api/v2${path}` ||
          url.hash ||
          !url.searchParams.get('cursor') ||
          [...url.searchParams.keys()].some(key =>
            /^(?:token|api[_-]?key|api[_-]?token|authorization|access_token|refresh_token|secret|password|auth)$/i.test(
              key
            )
          )
        )
          throw createApiServiceError('TextIt returned an unsafe pagination link.');
      }
    return result;
  }
  nextCursor(page: { next: string | null }): string | null {
    return page.next === null
      ? null
      : new URL(page.next, 'https://textit.com').searchParams.get('cursor');
  }

  listContacts(
    params?: PageParams & {
      uuid?: string;
      urn?: string;
      group?: string;
      before?: string;
      after?: string;
    }
  ) {
    return this.page('/contacts.json', contactSchema, params);
  }
  createContact(data: ContactData) {
    validateList(data.urns, 'urns');
    validateList(data.groups, 'groups');
    return this.write('/contacts.json', data, contactSchema);
  }
  updateContact(identifier: { uuid?: string; urn?: string }, data: ContactData) {
    this.contactIdentifier(identifier);
    if (!identifier.uuid && identifier.urn && data.urns !== undefined)
      throw createApiServiceError(
        'Use contactUuid when changing URNs; contactUrn cannot be combined with urns.'
      );
    validateList(data.urns, 'urns');
    validateList(data.groups, 'groups');
    return this.write('/contacts.json', data, contactSchema, pickDefined(identifier));
  }
  async deleteContact(identifier: { uuid?: string; urn?: string }) {
    this.contactIdentifier(identifier);
    await this.axios.delete('/contacts.json', { params: pickDefined(identifier) });
  }
  private contactIdentifier(identifier: { uuid?: string; urn?: string }) {
    if (Boolean(identifier.uuid) === Boolean(identifier.urn))
      throw createApiServiceError('Provide exactly one of contactUuid or contactUrn.');
  }
  async performContactAction(data: {
    contacts: string[];
    action:
      | 'add'
      | 'remove'
      | 'block'
      | 'unblock'
      | 'archive'
      | 'restore'
      | 'interrupt'
      | 'delete';
    group?: string;
  }) {
    validateList(data.contacts, 'contactUuids');
    if (!data.contacts.length)
      throw createApiServiceError('Provide at least one contact UUID.');
    if (['add', 'remove'].includes(data.action)) requireText(data.group, 'groupUuid');
    else if (data.group !== undefined)
      throw createApiServiceError('groupUuid is only used by add and remove.');
    await this.axios.post('/contact_actions.json', pickDefined(data));
  }
  listGroups(params?: PageParams & { uuid?: string; name?: string; manual_only?: number }) {
    return this.page(
      '/groups.json',
      groupSchema.extend({ status: z.string(), system: z.boolean() }),
      params
    );
  }
  createGroup(data: { name: string }) {
    requireText(data.name, 'name');
    return this.write('/groups.json', data, groupSchema);
  }
  updateGroup(uuid: string, data: { name: string }) {
    requireText(uuid, 'groupUuid');
    requireText(data.name, 'name');
    return this.write('/groups.json', data, groupSchema, { uuid });
  }
  async deleteGroup(uuid: string) {
    requireText(uuid, 'groupUuid');
    await this.axios.delete('/groups.json', { params: { uuid } });
  }
  listFields(params?: PageParams & { key?: string }) {
    return this.page('/fields.json', fieldSchema, params);
  }
  createField(data: { name: string; type: string }) {
    requireText(data.name, 'name');
    return this.write('/fields.json', data, fieldSchema);
  }
  updateField(key: string, data: { name: string; type: string }) {
    requireText(key, 'fieldKey');
    requireText(data.name, 'name');
    return this.write('/fields.json', data, fieldSchema, { key });
  }
  listMessages(
    params?: PageParams & {
      uuid?: string;
      folder?: string;
      before?: string;
      after?: string;
      contact?: string;
      label?: string;
    }
  ) {
    return this.page('/messages.json', messageSchema, params);
  }
  sendMessage(data: {
    contact: string;
    text: string;
    attachments?: string[];
    quick_replies?: QuickReply[];
  }) {
    requireText(data.contact, 'contactUuid');
    validateList(data.attachments, 'attachments', 10);
    if ((data.quick_replies?.length ?? 0) > 10)
      throw createApiServiceError('Provide at most 10 quick replies.');
    data.quick_replies?.forEach(validateReply);
    return this.write('/messages.json', data, sentMessageSchema);
  }
  listBroadcasts(params?: PageParams & { uuid?: string; before?: string; after?: string }) {
    return this.page('/broadcasts.json', broadcastSchema, params);
  }
  sendBroadcast(data: {
    text: Record<string, string>;
    urns?: string[];
    contacts?: string[];
    groups?: string[];
    base_language?: string;
    attachments?: Record<string, string[]>;
    quick_replies?: Record<string, QuickReply[]>;
  }) {
    validateRecipients({ urns: data.urns, contacts: data.contacts, groups: data.groups });
    if (!Object.keys(data.text).length)
      throw createApiServiceError('Provide at least one text translation.');
    if (data.base_language && !(data.base_language in data.text))
      throw createApiServiceError('baseLanguage must have a text translation.');
    for (const values of Object.values(data.attachments ?? {}))
      validateList(values, 'attachments', 10);
    for (const values of Object.values(data.quick_replies ?? {})) {
      if (values.length > 10)
        throw createApiServiceError('Provide at most 10 quick replies per language.');
      values.forEach(validateReply);
    }
    return this.write('/broadcasts.json', data, broadcastSchema);
  }
  listFlows(
    params?: PageParams & {
      uuid?: string;
      type?: string;
      archived?: boolean;
      before?: string;
      after?: string;
    }
  ) {
    return this.page('/flows.json', flowSchema, params);
  }
  listFlowStarts(params?: PageParams & { uuid?: string }) {
    return this.page('/flow_starts.json', flowStartSchema, params);
  }
  startFlow(data: {
    flow: string;
    groups?: string[];
    contacts?: string[];
    urns?: string[];
    restart_participants?: boolean;
    exclude_active?: boolean;
    params?: Record<string, unknown>;
  }) {
    requireText(data.flow, 'flowUuid');
    validateRecipients({ groups: data.groups, contacts: data.contacts, urns: data.urns });
    if (data.params) {
      let serialized: string;
      try {
        serialized = JSON.stringify(data.params);
      } catch {
        throw createApiServiceError('Flow params must be JSON serializable.');
      }
      if (serialized.length > 10240)
        throw createApiServiceError('Flow params must not exceed 10KB.');
    }
    return this.write('/flow_starts.json', data, flowStartSchema);
  }
  listRuns(
    params?: PageParams & {
      uuid?: string;
      flow?: string;
      contact?: string;
      responded?: boolean;
      before?: string;
      after?: string;
    }
  ) {
    if (params?.flow && params?.contact)
      throw createApiServiceError('Filter runs by either flowUuid or contactUuid, not both.');
    return this.page('/runs.json', runSchema, params);
  }
  listCampaigns(params?: PageParams & { uuid?: string; before?: string; after?: string }) {
    return this.page('/campaigns.json', campaignSchema, params);
  }
  createCampaign(data: { name: string; group: string }) {
    requireText(data.name, 'name');
    requireText(data.group, 'groupUuid');
    return this.write('/campaigns.json', data, campaignSchema);
  }
  async updateCampaign(uuid: string, data: { name?: string; group?: string }) {
    requireText(uuid, 'campaignUuid');
    const existing =
      data.name === undefined || data.group === undefined
        ? (await this.listCampaigns({ uuid })).results.find(item => item.uuid === uuid)
        : undefined;
    if ((data.name === undefined || data.group === undefined) && !existing)
      throw createApiServiceError('Campaign was not found.');
    const complete = {
      name: data.name ?? existing?.name,
      group: data.group ?? existing?.group.uuid
    };
    requireText(complete.name, 'name');
    requireText(complete.group, 'groupUuid');
    return this.write('/campaigns.json', complete, campaignSchema, { uuid });
  }
  listCampaignEvents(params?: PageParams & { uuid?: string; campaign?: string }) {
    return this.page('/campaign_events.json', campaignEventSchema, params);
  }
  private validateEvent(data: EventData, create: boolean) {
    if (create) {
      requireText(data.relative_to, 'relativeTo');
      requireText(data.unit, 'unit');
      if (
        data.offset === undefined ||
        data.delivery_hour === undefined ||
        (!data.message && !data.flow)
      )
        throw createApiServiceError(
          'Creation requires offset, deliveryHour, and exactly one of message or flowUuid.'
        );
    }
    if (data.message !== undefined && data.flow !== undefined)
      throw createApiServiceError('Provide either message or flowUuid, not both.');
    if (data.offset !== undefined && !Number.isInteger(data.offset))
      throw createApiServiceError('offset must be an integer.');
    if (
      data.delivery_hour !== undefined &&
      (!Number.isInteger(data.delivery_hour) ||
        data.delivery_hour < -1 ||
        data.delivery_hour > 24)
    )
      throw createApiServiceError('deliveryHour must be an integer from -1 to 24.');
  }
  createCampaignEvent(
    data: EventData & {
      campaign: string;
      relative_to: string;
      offset: number;
      unit: string;
      delivery_hour: number;
    }
  ) {
    requireText(data.campaign, 'campaignUuid');
    this.validateEvent(data, true);
    return this.write('/campaign_events.json', data, campaignEventSchema);
  }
  async updateCampaignEvent(uuid: string, data: EventData) {
    requireText(uuid, 'eventUuid');
    this.validateEvent(data, false);
    const existing = (await this.listCampaignEvents({ uuid })).results.find(
      item => item.uuid === uuid
    );
    if (!existing) throw createApiServiceError('Campaign event was not found.');
    const complete = {
      campaign: existing.campaign.uuid,
      relative_to: data.relative_to ?? existing.relative_to.key,
      offset: data.offset ?? existing.offset,
      unit: data.unit ?? existing.unit,
      delivery_hour: data.delivery_hour ?? existing.delivery_hour,
      ...(data.message !== undefined
        ? { message: data.message }
        : data.flow !== undefined
          ? { flow: data.flow }
          : existing.message !== null
            ? { message: existing.message }
            : { flow: existing.flow?.uuid })
    };
    this.validateEvent(complete, true);
    return this.write('/campaign_events.json', complete, campaignEventSchema, { uuid });
  }
  async deleteCampaignEvent(uuid: string) {
    requireText(uuid, 'eventUuid');
    await this.axios.delete('/campaign_events.json', { params: { uuid } });
  }
  listChannels(params?: PageParams & { uuid?: string; address?: string }) {
    return this.page('/channels.json', channelSchema, params);
  }
  listLabels(params?: PageParams & { uuid?: string; name?: string }) {
    return this.page('/labels.json', labelSchema, params);
  }
  createLabel(data: { name: string }) {
    requireText(data.name, 'name');
    return this.write('/labels.json', data, labelSchema);
  }
  updateLabel(uuid: string, data: { name: string }) {
    requireText(uuid, 'labelUuid');
    requireText(data.name, 'name');
    return this.write('/labels.json', data, labelSchema, { uuid });
  }
  async deleteLabel(uuid: string) {
    requireText(uuid, 'labelUuid');
    await this.axios.delete('/labels.json', { params: { uuid } });
  }
  listTickets(params?: PageParams & { uuid?: string; contact?: string }) {
    return this.page('/tickets.json', ticketSchema, params);
  }
  async performTicketAction(data: {
    tickets: string[];
    action: 'assign' | 'note' | 'close' | 'reopen';
    assignee?: string;
    note?: string;
  }) {
    validateList(data.tickets, 'ticketUuids');
    if (!data.tickets.length) throw createApiServiceError('Provide at least one ticket UUID.');
    if (data.action === 'assign') requireText(data.assignee, 'assigneeEmail');
    if (data.action === 'note') requireText(data.note, 'noteText');
    await this.axios.post(
      '/ticket_actions.json',
      pickDefined({ ...data, action: data.action === 'note' ? 'add_note' : data.action })
    );
  }
  listTopics(params?: PageParams) {
    return this.page('/topics.json', topicSchema, params);
  }
  createTopic(data: { name: string }) {
    requireText(data.name, 'name');
    return this.write('/topics.json', data, topicSchema);
  }
  listUsers(params?: PageParams & { uuid?: string }) {
    return this.page('/users.json', userSchema, params);
  }
  getWorkspaceIdentity() {
    return this.read(
      '/workspace.json',
      workspaceSchema.pick({ uuid: true, name: true }).passthrough()
    );
  }
  getWorkspace() {
    return this.read('/workspace.json', workspaceSchema);
  }
  listGlobals(params?: PageParams) {
    return this.page('/globals.json', globalSchema, params);
  }
  createGlobal(data: { name: string; value: string }) {
    requireText(data.name, 'name');
    return this.write('/globals.json', data, globalSchema);
  }
  updateGlobal(key: string, data: { name?: string; value?: string }) {
    requireText(key, 'globalKey');
    return this.write('/globals.json', data, globalSchema, { key });
  }
}
