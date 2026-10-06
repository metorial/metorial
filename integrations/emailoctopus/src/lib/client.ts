import { createHash } from 'node:crypto';
import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  getResponseHeaderValue,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export type Row = Record<string, unknown>;
export type FieldValue = string | number | null;
export interface FieldInfo {
  tag: string;
  type: string;
  label: string;
  fallback: string;
  fallbackValue?: string | null;
}
export interface ListSummary {
  listId: string;
  name: string;
  doubleOptIn: boolean;
  fields: FieldInfo[];
  tags: string[];
  counts: { pending: number; subscribed: number; unsubscribed: number };
  createdAt: string;
}
export interface Contact {
  contactId: string;
  emailAddress: string;
  fields: Record<string, string>;
  fieldValues: Record<string, FieldValue>;
  tags: string[];
  status: string;
  createdAt: string;
  lastUpdatedAt: string;
}
export interface Campaign {
  campaignId: string;
  status: string;
  name: string;
  subject: string;
  to: string[];
  from: { name: string; emailAddress: string };
  content: { html: string; plainText: string };
  createdAt: string;
  sentAt: string | null;
}
export interface CampaignSummaryReport {
  campaignId: string;
  sent: number;
  bounced: { hard: number; soft: number };
  opened: { total: number; unique: number };
  clicked: { total: number; unique: number };
  complained: number;
  unsubscribed: number;
}
export interface LinkReport {
  url: string;
  clickedTotal: number;
  clickedUnique: number;
}
export interface ContactReport {
  contact: {
    contactId: string;
    emailAddress?: string;
    fields?: Record<string, string>;
    fieldValues?: Record<string, FieldValue>;
    tags?: string[];
    status?: string;
    createdAt?: string;
    lastUpdatedAt?: string;
    deleted?: boolean;
  };
  occurredAt?: string;
  type?: string;
}
export interface PaginatedResponse<T> {
  data: T[];
  pagingNext: string | null;
}
export interface ContactWrite {
  emailAddress?: string;
  fields?: Record<string, string>;
  fieldValues?: Record<string, FieldValue>;
  tags?: Record<string, boolean>;
  status?: string;
}

export let invalid = (message: string) =>
  createApiServiceError(message, { reason: 'invalid_input' });
export let row = (value: unknown): Row => {
  if (!isApiErrorRecord(value) || Array.isArray(value))
    throw invalid('EmailOctopus returned an invalid object.');
  return value;
};
let array = (value: unknown): unknown[] => {
  if (!Array.isArray(value)) throw invalid('EmailOctopus returned an invalid collection.');
  return value;
};
let string = (value: unknown): string => {
  if (typeof value !== 'string') throw invalid('EmailOctopus returned an invalid text field.');
  return value;
};
let identifier = (value: unknown): string => {
  let result = string(value);
  if (!result.trim()) throw invalid('A nonempty resource identifier is required.');
  return result;
};
let path = (value: string) => encodeURIComponent(identifier(value));
let uuid = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
let canonicalId = (value: string) => (uuid.test(value) ? value.toLowerCase() : value);
let sameId = (left: string, right: string) => canonicalId(left) === canonicalId(right);
let emailHash = (email: string) => createHash('md5').update(email.toLowerCase()).digest('hex');
let isEmailHash = (value: string) => /^[a-f\d]{32}$/i.test(value);
let sameEmail = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();
let number = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    throw invalid('EmailOctopus returned an invalid count.');
  return value;
};
let strings = (value: unknown) => array(value).map(string);
let lower = (value: string | undefined) =>
  value === undefined ? undefined : value.toLowerCase();
let limitParams = (startingAfter?: string, limit?: number) => {
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 100))
    throw invalid('limit must be an integer between 1 and 100.');
  return pickDefined({ starting_after: startingAfter, limit });
};
export let emailOctopusError = (error: unknown) => {
  let headers =
    isApiErrorRecord(error) && isApiErrorRecord(error.response)
      ? error.response.headers
      : undefined;
  let adapted =
    isApiErrorRecord(error) && isApiErrorRecord(error.data)
      ? error.data.upstreamStatus
      : undefined;
  let rawStatus = getApiErrorStatus(error) ?? adapted;
  let candidate =
    typeof rawStatus === 'string' && /^\d{3}$/.test(rawStatus) ? Number(rawStatus) : rawStatus;
  let status =
    typeof candidate === 'number' &&
    Number.isInteger(candidate) &&
    candidate >= 100 &&
    candidate <= 599
      ? candidate
      : undefined;
  let retry =
    getResponseHeaderValue(headers, 'x-ratelimit-retry-after') ??
    getResponseHeaderValue(headers, 'retry-after');
  let safe = { response: { status, data: {} } };
  let result = buildApiServiceError(safe, {
    providerLabel: 'EmailOctopus',
    reason: 'api_error',
    parent: {},
    extractMessage: () =>
      status === 401
        ? 'Use a current API v2 key; legacy-only keys are not accepted.'
        : status === 429
          ? 'Rate limit exceeded; retry after the provider delay.'
          : 'Check the requested resource, permissions and input values.'
  });
  let seconds = typeof retry === 'string' ? Number(retry) : retry;
  if (
    typeof seconds === 'number' &&
    Number.isFinite(seconds) &&
    seconds >= 0 &&
    seconds <= 3600
  )
    result.data.retryAfter = seconds;
  return result;
};
let cursor = (raw: Row): string | null => {
  if (raw.paging === undefined || raw.paging === null) return null;
  let paging = row(raw.paging);
  if (paging.next === undefined || paging.next === null) return null;
  return identifier(row(paging.next).starting_after);
};
let mapField = (raw: unknown): FieldInfo => {
  let value = row(raw);
  return {
    tag: identifier(value.tag),
    type: identifier(value.type),
    label: string(value.label),
    fallback: value.fallback == null ? '' : string(value.fallback),
    ...pickDefined({
      fallbackValue:
        value.fallback === undefined
          ? undefined
          : value.fallback === null
            ? null
            : string(value.fallback)
    })
  };
};
let mapList = (raw: unknown): ListSummary => {
  let value = row(raw);
  let counts = Array.isArray(value.counts)
    ? value.counts.length === 1
      ? row(value.counts[0])
      : undefined
    : row(value.counts);
  if (!counts || typeof value.double_opt_in !== 'boolean')
    throw invalid('EmailOctopus returned invalid list counts or opt-in settings.');
  return {
    listId: identifier(value.id),
    name: string(value.name),
    doubleOptIn: value.double_opt_in,
    fields: array(value.fields).map(mapField),
    tags: strings(value.tags),
    counts: {
      pending: number(counts.pending),
      subscribed: number(counts.subscribed),
      unsubscribed: number(counts.unsubscribed)
    },
    createdAt: string(value.created_at)
  };
};
let mapContact = (raw: unknown): Contact => {
  let value = row(raw),
    fieldValues: Record<string, FieldValue> = {},
    fields: Record<string, string> = {};
  for (let [key, item] of Object.entries(row(value.fields))) {
    if (
      item !== null &&
      typeof item !== 'string' &&
      (typeof item !== 'number' || !Number.isFinite(item))
    )
      throw invalid('EmailOctopus returned an unsupported contact field value.');
    fieldValues[key] = item as FieldValue;
    fields[key] = item === null ? '' : String(item);
  }
  return {
    contactId: identifier(value.id),
    emailAddress: string(value.email_address),
    fields,
    fieldValues,
    tags: strings(value.tags),
    status: identifier(value.status),
    createdAt: string(value.created_at),
    lastUpdatedAt: string(value.last_updated_at)
  };
};
let mapCampaign = (raw: unknown): Campaign => {
  let value = row(raw),
    sender = row(value.from),
    content = row(value.content);
  return {
    campaignId: identifier(value.id),
    status: identifier(value.status),
    name: string(value.name),
    subject: string(value.subject),
    to: array(value.to).flatMap(item =>
      Array.isArray(item) ? item.map(identifier) : [identifier(item)]
    ),
    from: { name: string(sender.name), emailAddress: string(sender.email_address) },
    content: {
      html: string(content.html),
      plainText: content.plain_text == null ? '' : string(content.plain_text)
    },
    createdAt: string(value.created_at),
    sentAt: value.sent_at == null ? null : string(value.sent_at)
  };
};
let contactBody = (data: ContactWrite) => {
  let fields = { ...data.fields, ...data.fieldValues };
  for (let key of Object.keys(data.fields ?? {})) {
    if (
      data.fieldValues &&
      key in data.fieldValues &&
      data.fields?.[key] !== data.fieldValues[key]
    )
      throw invalid(
        'Do not supply conflicting fields and fieldValues for the same field tag.'
      );
  }
  return pickDefined({
    email_address: data.emailAddress,
    fields: data.fields === undefined && data.fieldValues === undefined ? undefined : fields,
    tags: data.tags,
    status: lower(data.status)
  });
};

export class Client {
  private axios;
  private redactor;
  constructor(config: { token: string }) {
    if (!config.token.trim() || /[\r\n]/.test(config.token))
      throw invalid('A current EmailOctopus API v2 key is required.');
    this.redactor = new AuthConfigSecretRedactor({ token: config.token });
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.emailoctopus.com',
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: emailOctopusError
    });
  }
  private safe<T>(value: T): T {
    // Shared redaction covers values; provider-defined field tags can also contain secrets.
    const keys = (item: unknown): unknown => {
      if (Array.isArray(item)) return item.map(keys);
      if (isApiErrorRecord(item))
        return Object.fromEntries(
          Object.entries(item).map(([key, nested]) => [
            this.redactor.redactEmbedded(key),
            keys(nested)
          ])
        );
      return item;
    };
    return keys(this.redactor.redactEmbedded(value)) as T;
  }
  public safeText(value: string): string {
    return this.redactor.redactEmbedded(value);
  }
  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: unknown,
    params?: Row
  ): Promise<unknown> {
    let response = await this.axios.request<unknown>({ method, url, data, params });
    if (method === 'DELETE' || url.startsWith('/automations/')) {
      if (response.status !== 204)
        throw invalid(
          'EmailOctopus did not confirm the operation with the documented response.'
        );
      return undefined;
    }
    return response.data;
  }
  async getLists(
    startingAfter?: string,
    limit?: number
  ): Promise<PaginatedResponse<ListSummary>> {
    let result = row(
      await this.request('GET', '/lists', undefined, limitParams(startingAfter, limit))
    );
    return this.safe({ data: array(result.data).map(mapList), pagingNext: cursor(result) });
  }
  async getList(listId: string): Promise<ListSummary> {
    let result = mapList(await this.request('GET', `/lists/${path(listId)}`));
    if (!sameId(result.listId, listId))
      throw invalid('EmailOctopus returned a different list.');
    return this.safe(result);
  }
  async createList(name: string): Promise<ListSummary> {
    if (!name.trim() || name.length > 255)
      throw invalid('List name must contain 1–255 characters.');
    return this.safe(mapList(await this.request('POST', '/lists', { name })));
  }
  async updateList(listId: string, name: string): Promise<ListSummary> {
    if (!name.trim() || name.length > 255)
      throw invalid('List name must contain 1–255 characters.');
    let result = mapList(await this.request('PUT', `/lists/${path(listId)}`, { name }));
    if (!sameId(result.listId, listId))
      throw invalid('EmailOctopus returned a different list.');
    return this.safe(result);
  }
  async deleteList(listId: string): Promise<void> {
    await this.request('DELETE', `/lists/${path(listId)}`);
  }
  async getContacts(
    listId: string,
    options?: {
      status?: string;
      tag?: string;
      createdBefore?: string;
      createdAfter?: string;
      updatedBefore?: string;
      updatedAfter?: string;
      startingAfter?: string;
      limit?: number;
    }
  ): Promise<PaginatedResponse<Contact>> {
    let params = {
      ...limitParams(options?.startingAfter, options?.limit),
      ...pickDefined({
        status: lower(options?.status),
        tag: options?.tag,
        'created_at.lte': options?.createdBefore,
        'created_at.gte': options?.createdAfter,
        'last_updated_at.lte': options?.updatedBefore,
        'last_updated_at.gte': options?.updatedAfter
      })
    };
    let result = row(
      await this.request('GET', `/lists/${path(listId)}/contacts`, undefined, params)
    );
    return this.safe({ data: array(result.data).map(mapContact), pagingNext: cursor(result) });
  }
  async getContact(listId: string, contactId: string): Promise<Contact> {
    let result = mapContact(
      await this.request('GET', `/lists/${path(listId)}/contacts/${path(contactId)}`)
    );
    if (
      isEmailHash(contactId)
        ? emailHash(result.emailAddress) !== contactId.toLowerCase()
        : !sameId(result.contactId, contactId)
    )
      throw invalid('EmailOctopus returned a different contact.');
    return this.safe(result);
  }
  async createContact(
    listId: string,
    data: Omit<ContactWrite, 'tags'> & { emailAddress: string; tags?: string[] }
  ): Promise<Contact> {
    let body = {
      ...contactBody({ ...data, tags: undefined }),
      ...pickDefined({ tags: data.tags })
    };
    let result = mapContact(
      await this.request('POST', `/lists/${path(listId)}/contacts`, body)
    );
    if (!sameEmail(result.emailAddress, data.emailAddress))
      throw invalid('EmailOctopus returned a different contact email address.');
    return this.safe(result);
  }
  async updateContact(
    listId: string,
    contactId: string,
    data: ContactWrite
  ): Promise<Contact> {
    let body = contactBody(data);
    if (!Object.keys(body).length)
      throw invalid('Provide at least one contact field to update.');
    let resolvedId = isEmailHash(contactId)
      ? (await this.getContact(listId, contactId)).contactId
      : contactId;
    let result = mapContact(
      await this.request('PUT', `/lists/${path(listId)}/contacts/${path(resolvedId)}`, body)
    );
    if (
      !sameId(result.contactId, resolvedId) ||
      (data.emailAddress !== undefined && !sameEmail(result.emailAddress, data.emailAddress))
    )
      throw invalid('EmailOctopus returned a different contact.');
    return this.safe(result);
  }
  async upsertContact(
    listId: string,
    data: Omit<ContactWrite, 'tags'> & {
      emailAddress: string;
      tags?: string[];
      tagUpdates?: Record<string, boolean>;
    }
  ): Promise<Contact> {
    let tags = {
      ...Object.fromEntries((data.tags ?? []).map(tag => [tag, true])),
      ...data.tagUpdates
    };
    for (let tag of data.tags ?? [])
      if (data.tagUpdates?.[tag] === false)
        throw invalid('Do not add and remove the same tag in one upsert.');
    let body = contactBody({
      ...data,
      tags: data.tags === undefined && data.tagUpdates === undefined ? undefined : tags
    });
    let result = mapContact(
      await this.request('PUT', `/lists/${path(listId)}/contacts`, body)
    );
    if (!sameEmail(result.emailAddress, data.emailAddress))
      throw invalid('EmailOctopus returned a different contact email address.');
    return this.safe(result);
  }
  async deleteContact(listId: string, contactId: string): Promise<void> {
    await this.request('DELETE', `/lists/${path(listId)}/contacts/${path(contactId)}`);
  }
  async batchUpdateContacts(
    listId: string,
    contacts: Array<ContactWrite & { contactId: string }>
  ): Promise<{ succeeded: Row[]; failed: Row[] }> {
    if (contacts.length < 1 || contacts.length > 100)
      throw invalid('Provide between 1 and 100 contact updates.');
    let updates: Array<ContactWrite & { contactId: string }> = [];
    for (let contact of contacts) {
      let id = identifier(contact.contactId);
      if (isEmailHash(id)) id = (await this.getContact(listId, id)).contactId;
      updates.push({ ...contact, contactId: id });
    }
    let expected = new Map(updates.map(contact => [canonicalId(contact.contactId), contact]));
    if (expected.size !== updates.length)
      throw invalid('Each batch update must target a different contact.');
    let result = row(
      await this.request('PUT', `/lists/${path(listId)}/contacts/batch`, {
        contacts: updates.map(contact => ({ id: contact.contactId, ...contactBody(contact) }))
      })
    );
    let seen = new Set<string>();
    let accept = (id: string) => {
      let key = canonicalId(id),
        input = expected.get(key);
      if (!input || seen.has(key))
        throw invalid(
          'EmailOctopus returned an unrelated or duplicate batch receipt; verify every contact before retrying.'
        );
      seen.add(key);
      return input;
    };
    let succeeded = array(result.success).map(item => {
      let receipt = row(item);
      if (receipt.success !== true)
        throw invalid('EmailOctopus returned an invalid successful batch receipt.');
      let data = mapContact(receipt.data),
        input = accept(data.contactId);
      if (
        input.emailAddress !== undefined &&
        !sameEmail(data.emailAddress, input.emailAddress)
      )
        throw invalid('EmailOctopus returned a different contact email address.');
      return { success: true, data };
    });
    let failed = array(result.errors).map(item => {
      let receipt = row(item);
      if (receipt.success !== false)
        throw invalid('EmailOctopus returned an invalid failed batch receipt.');
      let id = identifier(receipt.id);
      accept(id);
      return pickDefined({
        success: false,
        id,
        status: typeof receipt.status === 'number' ? receipt.status : undefined,
        message: 'Contact update failed; check the contact and field values.'
      });
    });
    if (seen.size !== expected.size)
      throw invalid(
        'EmailOctopus returned an incomplete batch result; verify every contact before retrying.'
      );
    return this.safe({ succeeded, failed });
  }
  async createField(
    listId: string,
    data: { label: string; tag: string; type: string; fallback?: string | null }
  ): Promise<FieldInfo> {
    return this.safe(
      mapField(
        await this.request('POST', `/lists/${path(listId)}/fields`, {
          ...data,
          type: lower(data.type)
        })
      )
    );
  }
  async updateField(
    listId: string,
    fieldTag: string,
    data: { label?: string; type?: string; fallback?: string | null }
  ): Promise<FieldInfo> {
    let field = (await this.getList(listId)).fields.find(item => item.tag === fieldTag);
    if (!field) throw invalid('Field was not found on the requested list.');
    let type = (data.type ?? field.type).toLowerCase();
    if (!['text', 'number', 'date'].includes(type))
      throw invalid(
        'This field type cannot be updated by this tool; edit it in the dashboard.'
      );
    let result = mapField(
      await this.request('PUT', `/lists/${path(listId)}/fields/${path(fieldTag)}`, {
        tag: fieldTag,
        type,
        label: data.label ?? field.label,
        ...pickDefined({
          fallback: data.fallback !== undefined ? data.fallback : field.fallbackValue
        })
      })
    );
    if (result.tag !== fieldTag) throw invalid('EmailOctopus returned a different field.');
    if (result.type.toLowerCase() !== type)
      throw invalid(
        'EmailOctopus did not confirm the requested field type; read back the field before retrying.'
      );
    return this.safe(result);
  }
  async deleteField(listId: string, fieldTag: string): Promise<void> {
    await this.request('DELETE', `/lists/${path(listId)}/fields/${path(fieldTag)}`);
  }
  async getTags(
    listId: string,
    startingAfter?: string,
    limit?: number
  ): Promise<PaginatedResponse<string>> {
    let result = row(
      await this.request(
        'GET',
        `/lists/${path(listId)}/tags`,
        undefined,
        limitParams(startingAfter, limit)
      )
    );
    return this.safe({
      data: array(result.data).map(item => identifier(row(item).tag)),
      pagingNext: cursor(result)
    });
  }
  async createTag(listId: string, tag: string): Promise<string> {
    return this.safe(
      identifier(row(await this.request('POST', `/lists/${path(listId)}/tags`, { tag })).tag)
    );
  }
  async updateTag(listId: string, oldTag: string, newTag: string): Promise<string> {
    return this.safe(
      identifier(
        row(
          await this.request('PUT', `/lists/${path(listId)}/tags/${path(oldTag)}`, {
            tag: newTag
          })
        ).tag
      )
    );
  }
  async deleteTag(listId: string, tag: string): Promise<void> {
    await this.request('DELETE', `/lists/${path(listId)}/tags/${path(tag)}`);
  }
  async getCampaigns(
    startingAfter?: string,
    limit?: number
  ): Promise<PaginatedResponse<Campaign>> {
    let result = row(
      await this.request('GET', '/campaigns', undefined, limitParams(startingAfter, limit))
    );
    return this.safe({
      data: array(result.data).map(mapCampaign),
      pagingNext: cursor(result)
    });
  }
  async getCampaign(campaignId: string): Promise<Campaign> {
    let result = mapCampaign(await this.request('GET', `/campaigns/${path(campaignId)}`));
    if (!sameId(result.campaignId, campaignId))
      throw invalid('EmailOctopus returned a different campaign.');
    return this.safe(result);
  }
  async getCampaignSummaryReport(campaignId: string): Promise<CampaignSummaryReport> {
    let result = row(
      await this.request('GET', `/campaigns/${path(campaignId)}/reports/summary`)
    );
    if (!sameId(identifier(result.id), campaignId))
      throw invalid('EmailOctopus returned a different campaign report.');
    let bounced = row(result.bounced),
      opened = row(result.opened),
      clicked = row(result.clicked);
    return this.safe({
      campaignId,
      sent: number(result.sent),
      bounced: { hard: number(bounced.hard), soft: number(bounced.soft) },
      opened: { total: number(opened.total), unique: number(opened.unique) },
      clicked: { total: number(clicked.total), unique: number(clicked.unique) },
      complained: number(result.complained),
      unsubscribed: number(result.unsubscribed)
    });
  }
  async getCampaignLinkReports(
    campaignId: string,
    _startingAfter?: string
  ): Promise<PaginatedResponse<LinkReport>> {
    let result = row(
      await this.request('GET', `/campaigns/${path(campaignId)}/reports/links`)
    );
    return this.safe({
      data: array(result.data).map(item => {
        let link = row(item);
        return {
          url: string(link.url),
          clickedTotal: number(link.clicked_total),
          clickedUnique: number(link.clicked_unique)
        };
      }),
      pagingNext: null
    });
  }
  async getCampaignContactReports(
    campaignId: string,
    status: string,
    startingAfter?: string,
    limit?: number
  ): Promise<PaginatedResponse<ContactReport>> {
    let result = row(
      await this.request('GET', `/campaigns/${path(campaignId)}/reports`, undefined, {
        status,
        ...limitParams(startingAfter, limit)
      })
    );
    if (result.status !== status)
      throw invalid('EmailOctopus returned a different campaign report status.');
    return this.safe({
      data: array(result.data).map(item => {
        let report = row(item);
        return {
          contact: {
            contactId: identifier(report.contact_id),
            ...pickDefined({
              emailAddress:
                report.contact_email_address == null
                  ? undefined
                  : string(report.contact_email_address)
            })
          },
          ...pickDefined({
            occurredAt:
              report.occurred_at === undefined ? undefined : string(report.occurred_at)
          })
        };
      }),
      pagingNext: cursor(result)
    });
  }

  async triggerAutomation(automationId: string, contactId: string): Promise<void> {
    await this.request('POST', `/automations/${path(automationId)}/queue`, {
      contact_id: identifier(contactId)
    });
  }
}
