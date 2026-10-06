import { createAuthenticatedAxios, pickDefined, requestAxios } from 'slates';
import { z } from 'zod';
import {
  credential,
  domain,
  hash,
  ip,
  type NativeObject,
  nativeJson,
  objectSchema,
  opaqueId,
  pageLimit,
  requireValue,
  resourceId,
  safeJson,
  segment,
  text,
  upstream,
  urlId,
  webUrl
} from './contracts';

export type VirusTotalAuth = { token: string; username?: string; userId?: string };
export class Client {
  private readonly http;
  private readonly token: string;
  constructor(private readonly auth: VirusTotalAuth) {
    this.token = credential(auth.token);
    if (auth.username !== undefined) opaqueId(auth.username, 'Username');
    if (auth.userId !== undefined) opaqueId(auth.userId, 'Bound user ID');
    this.http = createAuthenticatedAxios({
      baseURL: 'https://www.virustotal.com/api/v3',
      authHeader: { name: 'x-apikey', value: this.token },
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 4 * 1024 * 1024,
      maxBodyLength: 2 * 1024 * 1024,
      errorMapping: {
        mapAxiosError: () => ({
          message: 'VirusTotal request failed. Check key privileges and quota.'
        })
      }
    });
  }
  private responseMetadata(response: {
    status: number;
    statusText: string;
    headers: unknown;
  }) {
    safeJson(
      {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(Object.entries(response.headers ?? {}))
      },
      [this.token]
    );
  }
  private async request(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    data?: unknown,
    params?: Record<string, unknown>,
    owner = false
  ) {
    requireValue(
      path.startsWith('/') &&
        !path.startsWith('//') &&
        !path.includes('?') &&
        !path.includes('#'),
      'An exact VirusTotal API path is required.'
    );
    safeJson({ path, data, params }, [this.token]);
    const response = await requestAxios(
      method === 'get' ? 'read' : 'change resource',
      () => this.http.request({ method, url: path, data, params }),
      error => upstream(error, method)
    );
    this.responseMetadata(response);
    requireValue(
      response.status === 200,
      'VirusTotal returned an unexpected status; reconcile possible effects before retrying.'
    );
    if (
      method === 'delete' &&
      (response.data === '' || response.data === null || response.data === undefined)
    )
      return undefined;
    const value = nativeJson(response.data);
    if (owner) {
      const user = this.object(value, 'user');
      requireValue(
        user.attributes?.apikey === this.token,
        'VirusTotal did not prove that this username owns the API key. Reconnect with the exact account username.'
      );
      requireValue(
        this.auth.userId === undefined || user.id === this.auth.userId,
        'VirusTotal account binding changed. Reconnect with the intended account.'
      );
      const clean = { ...user, attributes: { ...user.attributes } };
      clean.attributes.apikey = undefined;
      const envelope = value as Record<string, unknown>;
      const native = envelope.data as Record<string, unknown>;
      safeJson(
        {
          ...envelope,
          data: {
            ...native,
            attributes: {
              ...(native.attributes as Record<string, unknown>),
              apikey: undefined
            }
          }
        },
        [this.token]
      );
      return { data: clean };
    }
    safeJson(value, [this.token]);
    return value;
  }
  private object(value: unknown, type: string, expectedId?: string): NativeObject {
    const envelope = z.object({ data: objectSchema }).safeParse(value);
    requireValue(
      envelope.success,
      'VirusTotal returned an invalid object receipt; reconcile uncertain effects before retrying.'
    );
    const result = envelope.data.data;
    requireValue(
      result.type === type && !result.error,
      'VirusTotal returned an unexpected object type or unavailable object.'
    );
    requireValue(
      expectedId === undefined || result.id === expectedId,
      'VirusTotal returned a different resource; the result was withheld.'
    );
    if (result.links?.self) {
      let link: URL | undefined;
      try {
        link = new URL(result.links.self);
      } catch {
        /* Native link validation below. */
      }
      requireValue(
        link &&
          link.origin === 'https://www.virustotal.com' &&
          !link.username &&
          !link.password,
        'VirusTotal returned an invalid provider link.'
      );
    }
    return result;
  }
  private page(
    value: unknown,
    limit: number,
    cursor?: string,
    type?: string,
    singular = false
  ) {
    const result = z
      .object({
        data: singular
          ? z.union([objectSchema, z.array(objectSchema)])
          : z.array(objectSchema),
        meta: z
          .object({ cursor: z.string().min(1).optional() })
          .passthrough()
          .optional(),
        links: z
          .object({ self: z.string().optional(), next: z.string().optional() })
          .passthrough()
          .optional()
      })
      .safeParse(value);
    requireValue(result.success, 'VirusTotal returned an invalid collection.');
    const rows = Array.isArray(result.data.data) ? result.data.data : [result.data.data];
    requireValue(
      rows.length <= limit &&
        new Set(rows.map(row => `${row.type}:${row.id}`)).size === rows.length,
      'VirusTotal returned duplicate objects or ignored the requested page limit.'
    );
    if (type)
      requireValue(
        rows.every(row => row.type === type),
        'VirusTotal returned unrelated collection object types.'
      );
    const next = result.data.meta?.cursor;
    requireValue(
      !next || next !== cursor,
      'VirusTotal repeated a continuation cursor; stop paging and retry later.'
    );
    requireValue(
      !result.data.links?.next || next,
      'VirusTotal supplied a next page without its continuation cursor.'
    );
    return { ...result.data, data: rows };
  }
  private paging(limit: number, cursor?: string) {
    pageLimit(limit);
    if (cursor !== undefined) text(cursor, 'Continuation cursor', 32768);
    return pickDefined({ limit, cursor });
  }
  async getConnectionContext() {
    requireValue(
      this.auth.username,
      'Reconnect with your VirusTotal account username to verify user context. Existing token-only connections can still use report actions.'
    );
    return this.object(
      await this.request(
        'get',
        `/users/${segment(this.auth.username, 'Username')}`,
        undefined,
        undefined,
        true
      ),
      'user',
      this.auth.userId
    );
  }
  async getFileReport(fileHash: string) {
    const selector = hash(fileHash),
      object = this.object(await this.request('get', `/files/${segment(selector)}`), 'file');
    requireValue(
      /^[a-f0-9]{64}$/.test(object.id) &&
        (selector.length === 64
          ? object.id === selector
          : object.attributes?.[selector.length === 32 ? 'md5' : 'sha1'] === selector),
      'VirusTotal could not bind the returned file to the requested hash.'
    );
    if (object.attributes?.sha256 !== undefined)
      requireValue(
        object.attributes.sha256 === object.id,
        'VirusTotal returned inconsistent file hashes.'
      );
    return object;
  }
  async rescanFile(fileHash: string) {
    return this.object(
      await this.request('post', `/files/${segment(hash(fileHash))}/analyse`),
      'analysis'
    );
  }
  async scanUrl(url: string) {
    webUrl(url);
    safeJson(url, [this.token]);
    const response = await requestAxios(
      'submit URL',
      () =>
        this.http.post('/urls', new URLSearchParams({ url }).toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }),
      error => upstream(error, 'submit URL')
    );
    this.responseMetadata(response);
    requireValue(
      response.status === 200,
      'VirusTotal did not return the documented analysis receipt; submission may already have occurred.'
    );
    const value = nativeJson(response.data);
    safeJson(value, [this.token]);
    return this.object(value, 'analysis');
  }
  async getUrlReport(identifier: string) {
    const selector = urlId(identifier),
      result = this.object(await this.request('get', `/urls/${segment(selector)}`), 'url');
    requireValue(
      /^[a-f0-9]{64}$/.test(result.id),
      'VirusTotal returned an invalid native URL identifier.'
    );
    if (/^[a-f0-9]{64}$/.test(selector))
      requireValue(result.id === selector, 'VirusTotal returned another URL.');
    // Native canonicalization is server-side; a base64 selector is not the returned SHA-256 ID.
    return result;
  }
  async getDomainReport(value: string) {
    const selector = domain(value);
    return this.object(
      await this.request('get', `/domains/${segment(selector)}`),
      'domain',
      selector
    );
  }
  async getIpReport(value: string) {
    const selector = ip(value);
    const result = this.object(
      await this.request('get', `/ip_addresses/${segment(selector)}`),
      'ip_address'
    );
    requireValue(ip(result.id) === selector, 'VirusTotal returned another IP address.');
    return result;
  }
  async getAnalysis(id: string) {
    opaqueId(id, 'Analysis ID');
    const result = this.object(
      await this.request('get', `/analyses/${segment(id)}`),
      'analysis',
      id
    );
    requireValue(
      ['queued', 'in-progress', 'completed'].includes(result.attributes?.status ?? ''),
      'VirusTotal returned an invalid analysis status.'
    );
    return result;
  }
  async getComments(collection: string, id: string, limit = 10, cursor?: string) {
    return this.page(
      await this.request(
        'get',
        `/${collection}/${segment(resourceId(collection, id))}/comments`,
        undefined,
        this.paging(limit, cursor)
      ),
      limit,
      cursor,
      'comment'
    );
  }
  async addComment(collection: string, id: string, comment: string) {
    text(comment, 'Comment', 65536);
    const result = this.object(
      await this.request(
        'post',
        `/${collection}/${segment(resourceId(collection, id))}/comments`,
        { data: { type: 'comment', attributes: { text: comment } } }
      ),
      'comment'
    );
    requireValue(
      result.attributes?.text === comment,
      'VirusTotal returned an unconfirmed comment receipt; reconcile before retrying.'
    );
    return result;
  }
  async addVote(collection: string, id: string, verdict: 'malicious' | 'harmless') {
    requireValue(['malicious', 'harmless'].includes(verdict), 'Choose malicious or harmless.');
    const result = this.object(
      await this.request(
        'post',
        `/${collection}/${segment(resourceId(collection, id))}/votes`,
        { data: { type: 'vote', attributes: { verdict } } }
      ),
      'vote'
    );
    requireValue(
      result.attributes?.verdict === verdict,
      'VirusTotal returned an unconfirmed vote receipt; reconcile before retrying.'
    );
    return result;
  }
  private async relationship(
    collection: string,
    id: string,
    relation: string,
    limit: number,
    cursor?: string
  ) {
    requireValue(
      /^[a-z][a-z0-9_]{0,127}$/.test(relation),
      'Use a documented relationship name for this indicator type.'
    );
    return this.page(
      await this.request(
        'get',
        `/${collection}/${segment(resourceId(collection, id))}/${relation}`,
        undefined,
        this.paging(limit, cursor)
      ),
      limit,
      cursor,
      undefined,
      true
    );
  }
  async getFileRelationships(id: string, relation: string, limit = 10, cursor?: string) {
    return this.relationship('files', id, relation, limit, cursor);
  }
  async getUrlRelationships(id: string, relation: string, limit = 10, cursor?: string) {
    return this.relationship('urls', id, relation, limit, cursor);
  }
  async getDomainRelationships(id: string, relation: string, limit = 10, cursor?: string) {
    return this.relationship('domains', id, relation, limit, cursor);
  }
  async getIpRelationships(id: string, relation: string, limit = 10, cursor?: string) {
    return this.relationship('ip_addresses', id, relation, limit, cursor);
  }
  async searchIntelligence(
    query: string,
    limit = 10,
    cursor?: string,
    order?: string,
    descriptorsOnly?: boolean
  ) {
    text(query, 'Intelligence query', 16384);
    requireValue(limit <= 300, 'Intelligence search supports at most 300 results per page.');
    if (order !== undefined) text(order, 'Sort order', 256);
    return this.page(
      await this.request('get', '/intelligence/search', undefined, {
        ...this.paging(limit, cursor),
        ...pickDefined({ query, order, descriptors_only: descriptorsOnly })
      }),
      limit,
      cursor
    );
  }
  async getLivehuntRulesets(limit = 10, cursor?: string) {
    return this.page(
      await this.request(
        'get',
        '/intelligence/hunting_rulesets',
        undefined,
        this.paging(limit, cursor)
      ),
      limit,
      cursor,
      'hunting_ruleset'
    );
  }
  async getLivehuntRuleset(id: string) {
    return this.object(
      await this.request('get', `/intelligence/hunting_rulesets/${segment(id)}`),
      'hunting_ruleset',
      id
    );
  }
  private huntAttributes(updates: {
    name?: string;
    rules?: string;
    enabled?: boolean;
    limit?: number;
    notificationEmails?: string[];
  }) {
    if (updates.name !== undefined) text(updates.name, 'Ruleset name', 1024);
    if (updates.rules !== undefined) text(updates.rules, 'YARA rules', 1024 * 1024);
    if (updates.limit !== undefined)
      requireValue(
        Number.isSafeInteger(updates.limit) && updates.limit >= 0,
        'Notification limit must be a nonnegative safe integer.'
      );
    if (updates.notificationEmails !== undefined)
      requireValue(
        updates.notificationEmails.length <= 100 &&
          updates.notificationEmails.every(email => z.email().safeParse(email).success),
        'Provide valid notification email addresses.'
      );
    return pickDefined({
      name: updates.name,
      rules: updates.rules,
      enabled: updates.enabled,
      limit: updates.limit,
      notification_emails: updates.notificationEmails
    });
  }
  private huntReceipt(value: unknown, expected: Record<string, unknown>, id?: string) {
    const result = this.object(value, 'hunting_ruleset', id);
    for (const [key, value] of Object.entries(expected)) {
      const actual = result.attributes?.[key];
      requireValue(
        Array.isArray(value)
          ? Array.isArray(actual) &&
              actual.length === value.length &&
              value.every(v => actual.includes(v))
          : actual === value,
        'VirusTotal did not confirm all requested ruleset fields; reconcile the native ruleset before retrying.'
      );
    }
    return result;
  }
  async createLivehuntRuleset(
    name: string,
    rules: string,
    enabled: boolean,
    limit?: number,
    notificationEmails?: string[]
  ) {
    const attributes = this.huntAttributes({
      name,
      rules,
      enabled,
      limit,
      notificationEmails
    });
    return this.huntReceipt(
      await this.request('post', '/intelligence/hunting_rulesets', {
        data: { type: 'hunting_ruleset', attributes }
      }),
      attributes
    );
  }
  async updateLivehuntRuleset(
    id: string,
    updates: {
      name?: string;
      rules?: string;
      enabled?: boolean;
      limit?: number;
      notificationEmails?: string[];
    }
  ) {
    const attributes = this.huntAttributes(updates);
    requireValue(
      Object.keys(attributes).length > 0,
      'Provide at least one ruleset field to update.'
    );
    return this.huntReceipt(
      await this.request('patch', `/intelligence/hunting_rulesets/${segment(id)}`, {
        data: { type: 'hunting_ruleset', id, attributes }
      }),
      attributes,
      id
    );
  }
  async deleteLivehuntRuleset(id: string) {
    await this.request('delete', `/intelligence/hunting_rulesets/${segment(id)}`);
  }
  async createRetrohuntJob(rules: string, corpus?: string, notificationEmail?: string) {
    text(rules, 'YARA rules', 1024 * 1024);
    if (corpus !== undefined)
      requireValue(
        ['main', 'goodware'].includes(corpus),
        'Retrohunt corpus must be main or goodware.'
      );
    if (notificationEmail !== undefined)
      requireValue(
        z.email().safeParse(notificationEmail).success,
        'Provide a valid completion notification email.'
      );
    const attributes = pickDefined({ rules, corpus, notification_email: notificationEmail });
    const result = this.object(
      await this.request('post', '/intelligence/retrohunt_jobs', {
        data: { type: 'retrohunt_job', attributes }
      }),
      'retrohunt_job'
    );
    requireValue(
      result.attributes?.rules === rules &&
        (corpus === undefined || result.attributes?.corpus === corpus) &&
        (notificationEmail === undefined ||
          result.attributes?.notification_email === notificationEmail),
      'VirusTotal did not confirm the requested Retrohunt job; reconcile before retrying.'
    );
    return this.retrohuntStatus(result);
  }
  private retrohuntStatus(result: NativeObject) {
    requireValue(
      result.attributes?.status === undefined ||
        ['starting', 'running', 'aborting', 'aborted', 'finished'].includes(
          String(result.attributes.status)
        ),
      'VirusTotal returned an unknown Retrohunt status; no execution state could be confirmed.'
    );
    return result;
  }
  async getRetrohuntJob(id: string) {
    return this.retrohuntStatus(
      this.object(
        await this.request('get', `/intelligence/retrohunt_jobs/${segment(id)}`),
        'retrohunt_job',
        id
      )
    );
  }
  async getRetrohuntJobs(limit = 10, cursor?: string) {
    const result = this.page(
      await this.request(
        'get',
        '/intelligence/retrohunt_jobs',
        undefined,
        this.paging(limit, cursor)
      ),
      limit,
      cursor,
      'retrohunt_job'
    );
    for (const row of result.data) this.retrohuntStatus(row);
    return result;
  }
  async getRetrohuntJobMatchingFiles(id: string, limit = 10, cursor?: string) {
    return this.page(
      await this.request(
        'get',
        `/intelligence/retrohunt_jobs/${segment(id)}/matching_files`,
        undefined,
        this.paging(limit, cursor)
      ),
      limit,
      cursor,
      'file'
    );
  }
}
