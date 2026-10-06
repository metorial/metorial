import {
  AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX,
  AuthConfigSecretRedactor,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined,
  requestAxios
} from 'slates';
import { z } from 'zod';
import {
  apiFailure,
  contactDto,
  liveFeedDto,
  meetingInviteDto,
  meetingTypeDto,
  messageDto,
  pageDto,
  parseResponse,
  pollDto,
  recipientDto,
  recordDto,
  reportDto,
  resourceId,
  ruleDto,
  sequenceDto,
  snippetDto,
  taskDto,
  teamDto,
  teamMemberDto,
  unsubscribeDto,
  userDto,
  validateEmail,
  validatePaging
} from './contracts';

type Fields = Record<string, unknown>;
type Page = { next?: string; limit?: number };
type Recipient = { email: string; name?: string };

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  private redactor: AuthConfigSecretRedactor;

  constructor(config: { token: string }) {
    if (!config.token.trim()) throw createApiServiceError('Connect a valid Mixmax API token.');
    this.redactor = new AuthConfigSecretRedactor(config);
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.mixmax.com/v1',
      authHeader: { name: 'X-API-Token', value: config.token },
      timeout: 30000,
      maxRedirects: 0,
      validateStatus: () => true
    });
  }

  private publicData(value: unknown): unknown {
    if (typeof value === 'string') {
      if (/^https?:\/\//i.test(value)) {
        try {
          let url = new URL(value);
          if (
            url.username ||
            url.password ||
            [...url.searchParams.keys()].some(key =>
              /token|secret|credential|password|signature|api.?key|^sig$|^x-amz-|^x-goog-/i.test(
                key
              )
            )
          )
            return undefined;
        } catch {
          /* Literal values are still redacted below. */
        }
      }
      return this.redactor
        .redactEmbedded(value)
        .split(`${AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX}token$$`)
        .join('[redacted]')
        .split(`${AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX}token`)
        .join('[redacted]');
    }
    if (Array.isArray(value)) return value.map(item => this.publicData(item));
    if (isApiErrorRecord(value)) {
      let result: Fields = {};
      for (let [key, item] of Object.entries(value)) {
        if (
          /^(?:token|apitoken|accesstoken|refreshtoken|idtoken|authorization|password|clientsecret|secret|credentials?|apikey|privatekey)$/i.test(
            key.replace(/[^a-z0-9]/gi, '')
          ) ||
          this.redactor.redactEmbedded(key) !== key
        )
          continue;
        let cleaned = this.publicData(item);
        if (cleaned !== undefined) result[key] = cleaned;
      }
      return result;
    }
    return value;
  }

  private async request(
    method: 'get' | 'post' | 'patch' | 'put' | 'delete',
    path: string,
    body?: unknown,
    params?: Fields
  ) {
    let response = await requestAxios(
      'request',
      () =>
        this.http.request<unknown>({
          method,
          url: path,
          data: body,
          params: params ? pickDefined(params) : undefined,
          paramsSerializer: { indexes: false }
        }),
      apiFailure
    );
    if (response.status < 200 || response.status >= 300)
      throw apiFailure({ response: { status: response.status } }, 'request');
    return this.publicData(response.data);
  }

  private async page<T extends z.ZodType>(
    path: string,
    schema: T,
    params: Fields & { limit?: number; offset?: number } = {},
    max = 300
  ) {
    validatePaging(params, max);
    return parseResponse(pageDto(schema), await this.request('get', path, undefined, params));
  }

  async listSequences(params: Page & { name?: string } = {}) {
    let page = await this.page('/sequences', sequenceDto, params);
    return {
      ...page,
      results: page.results.map(sequence => ({
        ...sequence,
        numStages: sequence.stages?.length
      }))
    };
  }

  async searchSequenceRecipients(params: {
    query?: string;
    recipients?: string[];
    sequenceId?: string;
    offset?: number;
    limit?: number;
  }) {
    validatePaging(params, 50);
    if (!params.query?.trim() && !params.recipients?.length)
      throw createApiServiceError(
        'Provide query or recipients to search sequence recipients.'
      );
    params.recipients?.forEach(validateEmail);
    if (params.sequenceId) resourceId(params.sequenceId);
    return parseResponse(
      pageDto(recipientDto.omit({ createdAt: true })).extend({ total: z.number().optional() }),
      await this.request('get', '/sequences/search', undefined, params)
    );
  }

  async getSequenceRecipients(
    sequenceId: string,
    params: { limit?: number; offset?: number } = {}
  ) {
    validatePaging(params, 50);
    if ((params.offset ?? 0) + (params.limit ?? 50) > 10000)
      throw createApiServiceError(
        'Sequence recipient paging must remain within the first 10,000 records.'
      );
    let results = parseResponse(
      z.array(recipientDto),
      await this.request('get', `/sequences/${resourceId(sequenceId)}/recipients`, undefined, {
        ...params,
        includeVariables: true
      })
    );
    return results.map(recipient => ({ ...recipient, status: recipient.state }));
  }

  async addRecipientsToSequence(
    sequenceId: string,
    recipients: Array<{ email: string; variables?: Record<string, string> }>,
    scheduledAt?: number | false
  ) {
    if (
      scheduledAt !== undefined &&
      scheduledAt !== false &&
      (!Number.isSafeInteger(scheduledAt) || scheduledAt < 0)
    )
      throw createApiServiceError(
        'scheduledAt must be false for draft recipients or a nonnegative Unix timestamp in milliseconds.'
      );
    if (new Set(recipients.map(item => item.email)).size !== recipients.length)
      throw createApiServiceError('Provide each recipient email only once in a request.');
    let mapped = recipients.map(recipient => {
      validateEmail(recipient.email);
      let variables = { ...recipient.variables };
      if (
        (variables.email !== undefined && variables.email !== recipient.email) ||
        (variables.Email !== undefined && variables.Email !== recipient.email)
      )
        throw createApiServiceError(
          'The email personalization variable must match its recipient email.'
        );
      if (variables.email === undefined && variables.Email === undefined)
        variables.email = recipient.email;
      return { ...recipient, variables };
    });
    let result = parseResponse(
      z.array(z.object({ email: z.string(), status: z.string() })),
      await this.request(
        'post',
        `/sequences/${resourceId(sequenceId)}/recipients`,
        pickDefined({ recipients: mapped, scheduledAt })
      )
    );
    let requested = new Set(recipients.map(item => item.email));
    let returned = new Set(result.map(item => item.email));
    if (
      result.length !== recipients.length ||
      returned.size !== result.length ||
      result.some(item => item.status !== 'success' || !requested.has(item.email))
    ) {
      throw createApiServiceError(
        'Mixmax did not accept every recipient for sequence ' +
          sequenceId +
          '. Some recipients may already have been added; read their state before retrying. Reported recipient outcomes: ' +
          result.map(item => `${item.email}: ${item.status}`).join(', '),
        { reason: 'partial_recipient_failure' }
      );
    }
    return result;
  }

  async cancelSequence(sequenceId: string, recipientEmail?: string) {
    if (recipientEmail !== undefined) validateEmail(recipientEmail);
    return parseResponse(
      z.object({ recipients: z.array(z.string()) }),
      await this.request(
        'post',
        `/sequences/${resourceId(sequenceId)}/cancel`,
        recipientEmail === undefined ? {} : { emails: [recipientEmail] }
      )
    );
  }

  async bulkCancelSequences(body: { emails?: string[]; sequenceIds?: string[] }) {
    if (body.sequenceIds !== undefined)
      throw createApiServiceError(
        'Bulk cancellation by sequenceIds is not documented. Use sequenceId for one sequence, or emails for recipients across sequences.'
      );
    if (!body.emails?.length)
      throw createApiServiceError(
        'Provide recipient emails or a sequenceId; empty input would cancel every active sequence.'
      );
    body.emails.forEach(validateEmail);
    return parseResponse(
      z.object({ recipients: z.array(z.string()) }),
      await this.request('post', '/sequences/cancel', { emails: body.emails })
    );
  }

  async listMessages(params: Page = {}) {
    return this.page('/messages', messageDto, params);
  }
  async getMessage(id: string) {
    return parseResponse(messageDto, await this.request('get', `/messages/${resourceId(id)}`));
  }
  async createMessage(message: {
    to?: Recipient[];
    cc?: Recipient[];
    bcc?: Recipient[];
    subject?: string;
    body?: string;
    trackingEnabled?: boolean;
    linkTrackingEnabled?: boolean;
    inReplyTo?: string;
  }) {
    for (let recipient of [
      ...(message.to ?? []),
      ...(message.cc ?? []),
      ...(message.bcc ?? [])
    ])
      validateEmail(recipient.email);
    return parseResponse(
      messageDto,
      await this.request('post', '/messages', pickDefined(message))
    );
  }
  async sendMessage(id: string) {
    await this.request('post', `/messages/${resourceId(id)}/send`);
  }
  async sendEmail(message: {
    to: Recipient[];
    cc?: Recipient[];
    bcc?: Recipient[];
    subject: string;
    body: string;
    trackingEnabled?: boolean;
    linkTrackingEnabled?: boolean;
  }) {
    if (message.trackingEnabled || message.linkTrackingEnabled)
      throw createApiServiceError(
        'The direct-send API does not support tracking. Create a draft message with tracking enabled and send that draft instead.'
      );
    for (let recipient of [...message.to, ...(message.cc ?? []), ...(message.bcc ?? [])])
      validateEmail(recipient.email);
    let result = await this.request(
      'post',
      '/send',
      pickDefined({
        to: message.to,
        cc: message.cc,
        bcc: message.bcc,
        subject: message.subject,
        body: message.body
      })
    );
    return parseResponse(
      z.object({ _id: z.string().optional() }),
      result === '' || result === undefined ? {} : result
    );
  }

  async listSnippets(params: Page & { search?: string; deletedOnly?: boolean } = {}) {
    let page = await this.page('/snippets', snippetDto, params);
    return {
      ...page,
      results: page.results.map(snippet => ({
        ...snippet,
        subject: snippet.title,
        body: snippet.source
      }))
    };
  }
  async getSnippet(id: string) {
    let snippet = parseResponse(
      snippetDto,
      await this.request('get', `/snippets/${resourceId(id)}`)
    );
    return { ...snippet, subject: snippet.title, body: snippet.source };
  }
  async updateSnippet(id: string, updates: Fields) {
    if (!Object.keys(updates).length)
      throw createApiServiceError('Provide at least one template field to update.');
    await this.request(
      'patch',
      `/snippets/${resourceId(id)}`,
      pickDefined({ name: updates.name, title: updates.subject, source: updates.body })
    );
    return this.getSnippet(id);
  }
  async deleteSnippet(id: string) {
    await this.request('delete', `/snippets/${resourceId(id)}`);
  }
  async sendSnippet(
    id: string,
    data: {
      to: Recipient[];
      cc?: Recipient[];
      bcc?: Recipient[];
      variables?: Record<string, string>;
    }
  ) {
    for (let recipient of [...data.to, ...(data.cc ?? []), ...(data.bcc ?? [])])
      validateEmail(recipient.email);
    await this.request('post', `/snippets/${resourceId(id)}/send`, pickDefined(data));
  }

  async listContacts(
    params: Page & {
      search?: string;
      sort?: string;
      sortAscending?: boolean;
      includeShared?: boolean;
    } = {}
  ) {
    if (params.includeShared && !params.search?.trim())
      throw createApiServiceError('includeShared requires a contact search query.');
    return this.page('/contacts', contactDto, params);
  }
  async getContact(id: string) {
    return parseResponse(
      contactDto,
      await this.request('get', `/contacts/${resourceId(id)}`, undefined, {
        expand: 'firstName,lastName'
      })
    );
  }
  async createContact(contact: {
    email: string;
    name?: string;
    groups?: string[];
    meta?: Fields;
    enrich?: boolean;
  }) {
    validateEmail(contact.email);
    await this.request('post', '/contacts', pickDefined(contact));
    let page = await this.listContacts({ search: `email:${contact.email}`, limit: 50 });
    let matches = page.results.filter(
      item => item.email?.toLowerCase() === contact.email.toLowerCase()
    );
    if (matches.length !== 1)
      throw createApiServiceError(
        'The contact write succeeded but its unique ID could not be confirmed. Search by email before retrying; creation can merge an existing record.'
      );
    return matches[0]!;
  }
  async updateContact(id: string, updates: Fields) {
    if (updates.groups !== undefined)
      throw createApiServiceError(
        'Updating contact groups through this endpoint is not documented. Manage contact groups in Mixmax.'
      );
    if (!Object.keys(updates).length)
      throw createApiServiceError('Provide at least one contact field to update.');
    if (typeof updates.email === 'string') validateEmail(updates.email);
    await this.request('patch', `/contacts/${resourceId(id)}`, { contact: updates });
    return this.getContact(id);
  }
  async deleteContact(id: string) {
    await this.request('delete', `/contacts/${resourceId(id)}`);
  }

  async listMeetingTypes(params: Page = {}) {
    return this.page('/meetingtypes', meetingTypeDto, params);
  }
  async getMeetingType(id: string) {
    return parseResponse(
      meetingTypeDto,
      await this.request('get', `/meetingtypes/${resourceId(id)}`)
    );
  }
  private meetingTypeBody(body: Fields) {
    if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim()))
      throw createApiServiceError('Provide a nonempty meeting type name.');
    if (
      body.durationMin !== undefined &&
      (typeof body.durationMin !== 'number' ||
        !Number.isSafeInteger(body.durationMin) ||
        body.durationMin < 1)
    )
      throw createApiServiceError('durationMin must be a positive integer.');
    if (
      body.buffer !== undefined &&
      (typeof body.buffer !== 'number' ||
        !Number.isSafeInteger(body.buffer) ||
        body.buffer < 0 ||
        body.buffer > 60)
    )
      throw createApiServiceError('buffer must be an integer from 0 to 60.');
    return body;
  }
  async createMeetingType(body: Fields) {
    return parseResponse(
      z.object({ _id: z.string().min(1) }),
      await this.request('post', '/meetingtypes', this.meetingTypeBody(body))
    );
  }
  async updateMeetingType(id: string, body: Fields) {
    if (!Object.keys(body).length)
      throw createApiServiceError('Provide at least one meeting-type field to update.');
    await this.request('patch', `/meetingtypes/${resourceId(id)}`, this.meetingTypeBody(body));
  }
  async deleteMeetingType(id: string) {
    await this.request('delete', `/meetingtypes/${resourceId(id)}`);
  }
  async listMeetingInvites(params: Page = {}) {
    let page = await this.page('/meetinginvites', meetingInviteDto, params);
    return {
      ...page,
      results: page.results.map(invite => ({ ...invite, createdAt: invite.creationDate }))
    };
  }

  private ruleBody(body: Fields) {
    if (body.actions !== undefined)
      throw createApiServiceError(
        'Rule actions require the separate rule-actions API or Rules Dashboard. This tool cannot safely set them inline.'
      );
    if (body.trigger !== undefined) {
      let trigger = parseResponse(
        z.object({
          type: z.enum(['event', 'recurring']),
          eventName: z.string().optional(),
          rrule: z.string().optional()
        }),
        body.trigger
      );
      if (
        (trigger.type === 'event' && !trigger.eventName?.trim()) ||
        (trigger.type === 'recurring' && !trigger.rrule?.trim())
      )
        throw createApiServiceError(
          'Provide eventName for an event trigger, or rrule for a recurring trigger.'
        );
    }
    let filter = body.filter;
    if (filter !== undefined && typeof filter !== 'string') filter = JSON.stringify(filter);
    if (typeof filter === 'string') {
      try {
        JSON.parse(filter);
      } catch {
        throw createApiServiceError('Provide a JSON-serialized Sift filter or JSON object.');
      }
    }
    return pickDefined({
      name: body.name,
      trigger: body.trigger,
      filter,
      isPaused: typeof body.enabled === 'boolean' ? !body.enabled : undefined
    });
  }
  private mapRule(rule: z.infer<typeof ruleDto>) {
    return {
      ...rule,
      enabled: rule.isPaused === undefined ? undefined : !rule.isPaused,
      updatedAt: rule.modifiedAt
    };
  }
  async listRules(params: Page = {}) {
    let page = await this.page('/rules', ruleDto, { ...params, expand: 'actions' });
    return { ...page, results: page.results.map(rule => this.mapRule(rule)) };
  }
  async getRule(id: string) {
    return this.mapRule(
      parseResponse(
        ruleDto,
        await this.request('get', `/rules/${resourceId(id)}`, undefined, { expand: 'actions' })
      )
    );
  }
  async createRule(body: Fields) {
    return this.mapRule(
      parseResponse(ruleDto, await this.request('post', '/rules', this.ruleBody(body)))
    );
  }
  async updateRule(id: string, body: Fields) {
    if (!Object.keys(body).length)
      throw createApiServiceError('Provide at least one rule field to update.');
    await this.request('patch', `/rules/${resourceId(id)}`, this.ruleBody(body));
    return this.getRule(id);
  }
  async deleteRule(id: string) {
    await this.request('delete', `/rules/${resourceId(id)}`);
  }

  async listUnsubscribes(params: Page = {}) {
    return this.page('/unsubscribes', unsubscribeDto, params);
  }
  async addUnsubscribe(email: string, name?: string) {
    await this.request('post', '/unsubscribes', {
      email: validateEmail(email),
      name: name ?? email
    });
  }
  async removeUnsubscribe(email: string) {
    await this.request('delete', '/unsubscribes', { email: validateEmail(email) });
  }
  async getLiveFeed(
    params: { query?: string; timezone?: string; limit?: number; offset?: number } = {}
  ) {
    validatePaging(params, 10000);
    return parseResponse(
      pageDto(liveFeedDto).extend({ stats: z.unknown().optional() }),
      await this.request('get', '/livefeed', undefined, params)
    );
  }
  async getReportData(body: {
    type: string;
    groupBy?: string;
    query?: string;
    fields?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortDesc?: boolean;
    timezone?: string;
  }) {
    validatePaging(body, 10000);
    return parseResponse(
      reportDto,
      await this.request('post', '/reports/data/table', pickDefined(body))
    );
  }
  async listPolls(params: Page = {}) {
    return this.page('/polls', pollDto, params);
  }
  async getPoll(id: string) {
    return parseResponse(pollDto, await this.request('get', `/polls/${resourceId(id)}`));
  }

  async listTeams(params: Page = {}) {
    return this.page('/teams', teamDto, params);
  }
  async getTeam(id: string) {
    return parseResponse(teamDto, await this.request('get', `/teams/${resourceId(id)}`));
  }
  async createTeam(body: { name: string }) {
    if (!body.name.trim()) throw createApiServiceError('Provide a nonempty team name.');
    return parseResponse(
      z.object({ _id: z.string().min(1) }),
      await this.request('post', '/teams', body)
    );
  }
  async updateTeam(id: string, body: Fields) {
    if (typeof body.name !== 'string' || !body.name.trim())
      throw createApiServiceError('Provide a nonempty team name to update.');
    await this.request('patch', `/teams/${resourceId(id)}`, body);
  }
  async deleteTeam(id: string) {
    await this.request('delete', `/teams/${resourceId(id)}`);
  }
  async listTeamMembers(id: string) {
    let page = await this.page(`/teams/${resourceId(id)}/members`, teamMemberDto);
    return {
      ...page,
      results: page.results.map(member => ({
        _id: member.memberId,
        userId: typeof member.userId === 'string' ? member.userId : member.userId?._id,
        email:
          member.email ??
          (typeof member.userId === 'object' ? member.userId.email : undefined),
        name:
          member.name ?? (typeof member.userId === 'object' ? member.userId.name : undefined)
      }))
    };
  }
  async addTeamMember(id: string, member: { email?: string; userId?: string }) {
    if (member.userId !== undefined)
      throw createApiServiceError(
        'The team invitation endpoint requires an email, not userId. Provide the member email.'
      );
    if (!member.email)
      throw createApiServiceError(
        'Provide an email to invite a team member. This sends an invitation email.'
      );
    await this.request('post', `/teams/${resourceId(id)}/members`, {
      members: [{ email: validateEmail(member.email) }]
    });
  }
  async removeTeamMember(id: string, memberId: string) {
    await this.request('delete', `/teams/${resourceId(id)}/members/${resourceId(memberId)}`);
  }
  async getCurrentUser() {
    return parseResponse(userDto, await this.request('get', '/users/me'));
  }
  async getUserPreferences() {
    return parseResponse(recordDto, await this.request('get', '/userpreferences/me'));
  }
  async searchSalesforce(query: string) {
    return parseResponse(
      z.array(recordDto),
      await this.request('get', '/salesforce/search', undefined, { q: query })
    );
  }
  async getSalesforceContactOrLead(email: string) {
    return parseResponse(
      recordDto,
      await this.request('get', '/salesforce/contactOrLead', undefined, {
        email: validateEmail(email)
      })
    );
  }
  private async salesforceWrite(method: 'post' | 'put', path: string, body: Fields) {
    let result = parseResponse(
      z.object({
        id: z.string().optional(),
        success: z.boolean(),
        errors: z.array(z.unknown()).optional()
      }),
      await this.request(method, path, body)
    );
    if (!result.success || result.errors?.length)
      throw createApiServiceError(
        'Salesforce did not confirm the record write. Check the connected permissions and required fields.'
      );
    return { ...result, _id: result.id };
  }
  async createSalesforceRecord(objectType: string, body: Fields) {
    return this.salesforceWrite('post', `/salesforce/${resourceId(objectType)}`, body);
  }
  async updateSalesforceRecord(objectType: string, id: string, body: Fields) {
    if (body.Id !== undefined && body.Id !== id)
      throw createApiServiceError('fields.Id must match recordId.');
    return this.salesforceWrite(
      'put',
      `/salesforce/${resourceId(objectType)}/${resourceId(id)}`,
      { ...body, Id: id }
    );
  }
  async listTasks(params: Page & { query?: string; timezone?: string } = {}) {
    return this.page(
      '/tasks',
      taskDto,
      pickDefined({
        search: 'all',
        query: params.query,
        next: params.next,
        limit: params.limit,
        tz: params.timezone
      }),
      500
    );
  }
}
