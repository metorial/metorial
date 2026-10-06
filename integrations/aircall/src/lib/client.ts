import { createAuthenticatedAxios } from 'slates';
import {
  absent,
  email,
  exactId,
  fail,
  id,
  integer,
  json,
  native,
  nativeCallId,
  parseNativeJson,
  phone,
  pickDefined,
  type Row,
  row,
  same,
  text,
  upstream
} from './contracts';
import { protectedAdapter, secretGuard } from './transport';
export interface AircallAuth {
  token: string;
  authType: 'bearer' | 'basic';
  apiId?: string;
}
export interface PaginationParams {
  page?: number;
  perPage?: number;
}
export interface PaginatedResponse {
  items: Row[];
  meta: {
    count: number;
    total: number;
    currentPage: number;
    perPage: number;
    nextPageLink: string | null;
    previousPageLink: string | null;
  };
}
export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  constructor(readonly auth: AircallAuth) {
    const token = text(auth.token, 'Connection token', 8192);
    if (!['basic', 'bearer'].includes(auth.authType) || /\s/.test(token))
      fail('Reconnect using a valid Aircall Basic or OAuth connection.');
    if (auth.authType === 'basic') {
      const decoded = Buffer.from(token, 'base64').toString('utf8'),
        colon = decoded.indexOf(':');
      if (
        colon < 1 ||
        !decoded.slice(colon + 1) ||
        (auth.apiId !== undefined && decoded.slice(0, colon) !== auth.apiId)
      )
        fail(
          'Basic connection credentials do not match the configured API-key settings. Reconnect.'
        );
    }
    this.http = createAuthenticatedAxios({
      adapter: protectedAdapter(auth),
      baseURL: 'https://api.aircall.io/v1',
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 8 * 1024 * 1024,
      maxBodyLength: 1024 * 1024,
      authHeader: { value: `${auth.authType === 'basic' ? 'Basic' : 'Bearer'} ${token}` },
      transformResponse: [parseNativeJson]
    });
  }
  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    data?: unknown,
    params?: Row,
    statuses = [200]
  ): Promise<unknown> {
    if (!path.startsWith('/') || path.includes('?') || path.includes('#'))
      fail('Invalid Aircall API path.');
    json({ data, params });
    const guard = secretGuard(this.auth);
    if (
      JSON.stringify(guard.visit({ path, data, params })) !==
      JSON.stringify({ path, data, params })
    )
      fail(
        'Do not include connection credentials in resource IDs, tool fields or request content.'
      );
    try {
      const res = await this.http.request<unknown>({
        method,
        url: path,
        data,
        params: params ? pickDefined(params) : undefined
      });
      if (!statuses.includes(res.status))
        fail(
          `Aircall returned unexpected HTTP ${res.status}. Reconcile possible effects before retrying.`,
          'aircall_receipt'
        );
      return res.data;
    } catch (error) {
      throw upstream(error, `${method} ${path}`);
    }
  }
  private params(
    p: PaginationParams & { from?: number; to?: number; order?: string } = {}
  ): Row {
    const page = integer(p.page ?? 1, 'page', 1),
      per_page = integer(p.perPage ?? 20, 'perPage', 1, 50);
    if (p.from !== undefined) integer(p.from, 'from');
    if (p.to !== undefined) integer(p.to, 'to');
    if (p.from !== undefined && p.to !== undefined && p.from > p.to)
      fail('from must not be after to.');
    if (p.order !== undefined && !['asc', 'desc'].includes(p.order))
      fail('order must be asc or desc.');
    return pickDefined({ page, per_page, from: p.from, to: p.to, order: p.order });
  }
  private async page(path: string, key: string, params: Row): Promise<PaginatedResponse> {
    const data = row(await this.request('GET', path, undefined, params)),
      meta = row(data.meta, 'pagination'),
      items = data[key];
    if (!Array.isArray(items) || items.length > 50)
      fail('Aircall returned an invalid page.', 'aircall_receipt');
    const count = integer(meta.count, 'Native count'),
      total = integer(meta.total, 'Native total'),
      currentPage = integer(meta.current_page, 'Native page', 1),
      perPage = integer(meta.per_page, 'Native page size', 1, 50);
    if (
      count !== items.length ||
      total < count ||
      currentPage !== params.page ||
      perPage !== params.per_page
    )
      fail(
        'Aircall returned inconsistent pagination. Narrow the time window and retry.',
        'aircall_receipt'
      );
    const link = (v: unknown): string | null => {
      if (v === null) return null;
      const candidate = text(v, 'Native continuation URL');
      let u: URL;
      try {
        u = new URL(candidate);
      } catch {
        return fail('Aircall returned an invalid continuation URL.', 'aircall_receipt');
      }
      if (
        u.origin !== 'https://api.aircall.io' ||
        u.pathname !== `/v1${path}` ||
        u.username ||
        u.password ||
        u.hash
      )
        fail('Aircall returned an unrelated continuation URL.', 'aircall_receipt');
      return candidate;
    };
    const mapped = items.map(v => row(v));
    if (new Set(mapped.map(v => String(v.id))).size !== mapped.length)
      fail('Aircall returned duplicate IDs in a page.', 'aircall_receipt');
    return {
      items: mapped,
      meta: {
        count,
        total,
        currentPage,
        perPage,
        nextPageLink: link(meta.next_page_link),
        previousPageLink: link(meta.previous_page_link)
      }
    };
  }
  async getCompany() {
    const c = row(row(await this.request('GET', '/company')).company, 'company');
    text(c.name, 'Native company name');
    integer(c.users_count, 'Native user count');
    integer(c.numbers_count, 'Native number count');
    return c;
  }
  async getIntegration() {
    if (this.auth.authType !== 'bearer')
      fail(
        'Integration account details require OAuth; Basic authentication exposes company summary only.'
      );
    const v = native(
      row(await this.request('GET', '/integrations/me')).integration,
      'integration'
    );
    id(v.company_id, 'Native company ID');
    return v;
  }
  async listCalls(
    p: PaginationParams & {
      from?: number;
      to?: number;
      order?: 'asc' | 'desc';
      fetchContact?: boolean;
    } = {}
  ) {
    return this.page('/calls', 'calls', { ...this.params(p), fetch_contact: p.fetchContact });
  }
  async searchCalls(
    p: PaginationParams & {
      userId?: number;
      phoneNumber?: string;
      tags?: string[];
      contactId?: number;
      direction?: 'inbound' | 'outbound';
      from?: number;
      to?: number;
      order?: 'asc' | 'desc';
      fetchContact?: boolean;
    }
  ) {
    if (p.contactId !== undefined)
      fail(
        'Aircall does not document contactId call filtering. Use get_contact to select a phone number, then supply phoneNumber.'
      );
    if (
      p.tags !== undefined &&
      (!p.tags.length ||
        p.tags.length > 50 ||
        p.tags.some(v => !/^[1-9]\d*$/.test(v) || !Number.isSafeInteger(Number(v))))
    )
      fail('tags must contain decimal tag ID strings from list_tags, not tag names.');
    return this.page('/calls/search', 'calls', {
      ...this.params(p),
      user_id: p.userId === undefined ? undefined : id(p.userId),
      phone_number: p.phoneNumber === undefined ? undefined : phone(p.phoneNumber),
      tags: p.tags,
      direction: p.direction,
      fetch_contact: p.fetchContact
    });
  }
  async getCall(callId: number | string, options?: { fetchContact?: boolean }) {
    const exact = typeof callId === 'string' ? exactId(undefined, callId) : exactId(callId),
      c = row(
        row(
          await this.request('GET', `/calls/${exact}`, undefined, {
            fetch_contact: options?.fetchContact
          })
        ).call,
        'call'
      );
    if (nativeCallId(c.id) !== exact)
      fail('Aircall returned a different call ID.', 'aircall_receipt');
    return c;
  }
  async transferCall(
    callId: string,
    target: { userId?: number; teamId?: number; number?: string; dispatchingStrategy?: string }
  ) {
    if (
      [target.userId, target.teamId, target.number].filter(v => v !== undefined).length !== 1
    )
      fail('Supply exactly one transfer target.');
    if (target.dispatchingStrategy !== undefined && target.teamId === undefined)
      fail('dispatchingStrategy is available only for team transfers.');
    return this.request(
      'POST',
      `/calls/${exactId(undefined, callId)}/transfers`,
      pickDefined({
        user_id: target.userId === undefined ? undefined : id(target.userId),
        team_id: target.teamId === undefined ? undefined : id(target.teamId),
        number: target.number === undefined ? undefined : phone(target.number),
        dispatching_strategy: target.dispatchingStrategy
      }),
      undefined,
      [204]
    );
  }
  async commentOnCall(callId: string, content: string) {
    return this.request(
      'POST',
      `/calls/${exactId(undefined, callId)}/comments`,
      { content: text(content, 'commentContent') },
      undefined,
      [201]
    );
  }
  async tagCall(callId: string, tagId: number) {
    return this.request(
      'POST',
      `/calls/${exactId(undefined, callId)}/tags`,
      { tags: [id(tagId, 'tagId')] },
      undefined,
      [201]
    );
  }
  async archiveCall(callId: string) {
    return row(
      row(await this.request('PUT', `/calls/${exactId(undefined, callId)}/archive`)).call,
      'call'
    );
  }
  async unarchiveCall(callId: string) {
    return row(
      row(await this.request('PUT', `/calls/${exactId(undefined, callId)}/unarchive`)).call,
      'call'
    );
  }
  async pauseRecording(callId: string) {
    return this.request(
      'POST',
      `/calls/${exactId(undefined, callId)}/pause_recording`,
      undefined,
      undefined,
      [204]
    );
  }
  async resumeRecording(callId: string) {
    return this.request(
      'POST',
      `/calls/${exactId(undefined, callId)}/resume_recording`,
      undefined,
      undefined,
      [204]
    );
  }
  async deleteRecording(callId: string) {
    return this.request('DELETE', `/calls/${exactId(undefined, callId)}/recording`);
  }
  async deleteVoicemail(callId: string) {
    return this.request('DELETE', `/calls/${exactId(undefined, callId)}/voicemail`);
  }
  async createInsightCard(
    callId: string,
    contents: Array<{
      type: 'title' | 'shortText';
      text: string;
      label?: string;
      link?: string;
    }>
  ) {
    if (!contents.length || Buffer.byteLength(JSON.stringify({ contents })) >= 10000)
      fail('Supply nonempty insight-card contents with complete JSON smaller than 10 KB.');
    for (const c of contents) {
      text(c.text, 'Card text');
      if (c.label !== undefined) text(c.label, 'Card label');
      if (c.link !== undefined) {
        let u: URL;
        try {
          u = new URL(text(c.link, 'Card link'));
        } catch {
          return fail('Card links must be valid HTTPS URLs.');
        }
        if (u.protocol !== 'https:' || u.username || u.password)
          fail('Card links must be HTTPS without embedded credentials.');
      }
    }
    return this.request(
      'POST',
      `/calls/${exactId(undefined, callId)}/insight_cards`,
      { contents },
      undefined,
      [201]
    );
  }
  async listUsers(
    p: PaginationParams & { from?: number; to?: number; order?: 'asc' | 'desc' } = {}
  ) {
    return this.page('/users', 'users', this.params(p));
  }
  async getUser(userId: number) {
    return same(
      native(row(await this.request('GET', `/users/${id(userId)}`)).user, 'user'),
      userId
    );
  }
  async getUserAvailability(userId: number) {
    const v = row(await this.request('GET', `/users/${id(userId)}/availability`));
    text(v.availability, 'Native availability');
    return v;
  }
  async createUser(data: Row) {
    const user = native(
      row(await this.request('POST', '/users', data, undefined, [201])).user,
      'user'
    );
    if (user.email !== data.email)
      fail(
        'Aircall acknowledged user creation but returned a different email. An invitation may already have been sent; reconcile before retrying.',
        'aircall_receipt'
      );
    this.creationFields(user, data, ['first_name', 'last_name']);
    return user;
  }
  async updateUser(userId: number, data: Row) {
    return same(
      native(row(await this.request('PUT', `/users/${id(userId)}`, data)).user, 'user'),
      userId
    );
  }
  async deleteUser(userId: number) {
    await this.getUser(userId);
    await this.request('DELETE', `/users/${id(userId)}`, undefined, undefined, [204]);
    return { accepted: true, deleted: false, pending: true };
  }
  async startOutboundCall(userId: number, numberId: number, to: string) {
    await this.request(
      'POST',
      `/users/${id(userId)}/calls`,
      { number_id: id(numberId), to: phone(to) },
      undefined,
      [204]
    );
  }
  async listContacts(
    p: PaginationParams & { from?: number; to?: number; order?: 'asc' | 'desc' } = {}
  ) {
    return this.page('/contacts', 'contacts', this.params(p));
  }
  async searchContacts(
    p: PaginationParams & {
      phoneNumber?: string;
      email?: string;
      from?: number;
      to?: number;
      order?: 'asc' | 'desc';
    }
  ) {
    return this.page('/contacts/search', 'contacts', {
      ...this.params(p),
      phone_number: p.phoneNumber === undefined ? undefined : phone(p.phoneNumber),
      email: p.email === undefined ? undefined : email(p.email)
    });
  }
  async getContact(contactId: number) {
    return same(
      native(row(await this.request('GET', `/contacts/${id(contactId)}`)).contact, 'contact'),
      contactId
    );
  }
  async createContact(data: Row) {
    const contact = native(
      row(await this.request('POST', '/contacts', data, undefined, [201])).contact,
      'contact'
    );
    this.creationFields(contact, data, [
      'first_name',
      'last_name',
      'company_name',
      'information'
    ]);
    return contact;
  }
  private creationFields(resource: Row, requested: Row, fields: string[]) {
    for (const field of fields)
      if (
        requested[field] !== undefined &&
        resource[field] !== undefined &&
        resource[field] !== requested[field]
      )
        fail(
          'Aircall acknowledged creation but returned different requested fields. Save any native ID and reconcile possible effects before retrying.',
          'aircall_receipt'
        );
  }
  async updateContact(contactId: number, data: Row) {
    return same(
      native(
        row(await this.request('POST', `/contacts/${id(contactId)}`, data)).contact,
        'contact'
      ),
      contactId
    );
  }
  private async deleteExact(kind: 'contacts' | 'teams', resourceId: number) {
    if (kind === 'contacts') await this.getContact(resourceId);
    else await this.getTeam(resourceId);
    await this.request(
      'DELETE',
      `/${kind}/${id(resourceId)}`,
      undefined,
      undefined,
      kind === 'teams' ? [200, 204] : [204]
    );
    try {
      if (kind === 'contacts') await this.getContact(resourceId);
      else await this.getTeam(resourceId);
    } catch (error) {
      if (!absent(error)) throw error;
      await this.getCompany();
      return;
    }
    fail(
      'Aircall acknowledged deletion but the exact resource remains readable. Reconcile before retrying.',
      'aircall_pending'
    );
  }
  async deleteContact(contactId: number) {
    await this.deleteExact('contacts', contactId);
  }
  async listNumbers(p: PaginationParams = {}) {
    return this.page('/numbers', 'numbers', this.params(p));
  }
  async getNumber(numberId: number) {
    return same(
      native(row(await this.request('GET', `/numbers/${id(numberId)}`)).number, 'number'),
      numberId
    );
  }
  async listTeams(p: PaginationParams = {}) {
    return this.page('/teams', 'teams', this.params(p));
  }
  async getTeam(teamId: number) {
    return same(
      native(row(await this.request('GET', `/teams/${id(teamId)}`)).team, 'team'),
      teamId
    );
  }
  async createTeam(name: string) {
    const team = native(
      row(
        await this.request(
          'POST',
          '/teams',
          { name: text(name, 'teamName', 63) },
          undefined,
          [201]
        )
      ).team,
      'team'
    );
    if (team.name !== name)
      fail(
        'Aircall acknowledged team creation but returned a different name. Reconcile possible routing effects before retrying.',
        'aircall_receipt'
      );
    return team;
  }
  async deleteTeam(teamId: number) {
    await this.deleteExact('teams', teamId);
  }
  async addUserToTeam(teamId: number, userId: number) {
    return same(
      native(
        row(
          await this.request(
            'POST',
            `/teams/${id(teamId)}/users/${id(userId)}`,
            undefined,
            undefined,
            [201]
          )
        ).team,
        'team'
      ),
      teamId
    );
  }
  async removeUserFromTeam(teamId: number, userId: number) {
    return same(
      native(
        row(await this.request('DELETE', `/teams/${id(teamId)}/users/${id(userId)}`)).team,
        'team'
      ),
      teamId
    );
  }
  async listTags(p: PaginationParams = {}) {
    return this.page('/tags', 'tags', this.params(p));
  }
  async contactDetail(
    contactId: number,
    kind: 'phone' | 'email',
    action: 'add' | 'update' | 'delete',
    detailId?: number,
    label?: string,
    value?: string
  ) {
    const prefix = `/contacts/${id(contactId)}/${kind}_details`,
      path = action === 'add' ? prefix : `${prefix}/${id(detailId, `${kind} detail ID`)}`,
      method = action === 'add' ? 'POST' : action === 'update' ? 'PUT' : 'DELETE',
      data =
        action === 'delete'
          ? undefined
          : pickDefined({
              label: label === undefined ? undefined : text(label, 'label'),
              value: kind === 'phone' ? text(value, 'Contact phone value', 255) : email(value)
            });
    const receipt = await this.request(method, path, data, undefined, [
      action === 'add' ? 201 : action === 'update' ? 202 : 204
    ]);
    if (action !== 'delete') {
      const detail = native(row(receipt)[`${kind}_detail`], `${kind} detail`);
      if (detailId !== undefined) same(detail, detailId);
    }
    return this.getContact(contactId);
  }
  async sendMessage(numberId: number, to: string, content: string) {
    const v = row(
      await this.request('POST', `/numbers/${id(numberId)}/messages/send`, {
        to: phone(to),
        body: text(content, 'content', 1600)
      }),
      'message'
    );
    text(v.id, 'Native message ID');
    text(v.status, 'Native message status');
    if (v.direction !== 'outbound')
      fail(
        'Aircall returned an unexpected message direction. Reconcile before resending.',
        'aircall_receipt'
      );
    return v;
  }
}
