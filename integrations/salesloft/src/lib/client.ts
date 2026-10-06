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
  accountSchema,
  cadenceSchema,
  callSchema,
  emailSchema,
  id,
  membershipSchema,
  noteSchema,
  pagingSchema,
  personSchema,
  taskSchema,
  templateSchema,
  userSchema
} from './api-schemas';
import { apiFailure } from './errors';
export interface PaginationParams {
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}
type Data = Record<string, unknown>;
export class Client {
  private readonly axios: ReturnType<typeof createAuthenticatedAxios>;
  private readonly redactor: AuthConfigSecretRedactor;
  constructor(config: { token: string }) {
    if (!config.token.trim())
      throw createApiServiceError('A Salesloft access token or API key is required.');
    this.redactor = new AuthConfigSecretRedactor(config);
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.salesloft.com/v2',
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 30000,
      maxRedirects: 0,
      validateStatus: () => true
    });
  }
  private publicMetadata(value: unknown): unknown {
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
            return undefined;
        } catch {
          // Malformed provider text still passes through credential-value redaction.
        }
      }
      return this.redactor
        .redactEmbedded(value)
        .replaceAll(`${AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX}token$$`, '[redacted]')
        .replaceAll(`${AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX}token`, '[redacted]');
    }
    if (Array.isArray(value)) return value.map(item => this.publicMetadata(item));
    if (isApiErrorRecord(value)) {
      const credentialKeys = new Set([
        'token',
        'accesstoken',
        'refreshtoken',
        'idtoken',
        'authtoken',
        'apikey',
        'authorization',
        'password',
        'passphrase',
        'clientsecret',
        'secret',
        'credential',
        'credentials',
        'privatekey'
      ]);
      return Object.fromEntries(
        Object.entries(value)
          .filter(
            ([key]) =>
              !credentialKeys.has(key.replace(/[\s_-]/g, '').toLowerCase()) &&
              this.redactor.redactEmbedded(key) === key
          )
          .map(([key, item]) => [key, this.publicMetadata(item)])
      );
    }
    return value;
  }
  private identifier(value: number) {
    if (!id.safeParse(value).success)
      throw createApiServiceError('Salesloft IDs must be positive safe integers.');
    return value;
  }
  private page(params?: PaginationParams, sorts?: string[]) {
    if (params?.page !== undefined && (!Number.isSafeInteger(params.page) || params.page < 1))
      throw createApiServiceError('Page must be a positive integer.');
    if (
      params?.perPage !== undefined &&
      (!Number.isSafeInteger(params.perPage) || params.perPage < 1 || params.perPage > 100)
    )
      throw createApiServiceError('perPage must be an integer from 1 to 100.');
    if (params?.sortBy !== undefined && sorts && !sorts.includes(params.sortBy))
      throw createApiServiceError(`sortBy must be one of: ${sorts.join(', ')}.`);
    return {
      page: params?.page,
      per_page: params?.perPage,
      sort_by: params?.sortBy,
      sort_direction: params?.sortDirection
    };
  }
  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    options: { data?: Data; params?: Data } = {}
  ) {
    for (const source of [options.data, options.params])
      for (const [key, value] of Object.entries(source ?? {}))
        if (key.endsWith('_id') && value !== undefined) {
          for (const item of Array.isArray(value) ? value : [value])
            this.identifier(Number(item));
        }
    const response = await requestAxios(
      'Salesloft API request',
      () =>
        this.axios.request<unknown>({
          method,
          url: path,
          data: options.data ? pickDefined(options.data) : undefined,
          params: options.params ? pickDefined(options.params) : undefined,
          paramsSerializer: { indexes: false }
        }),
      error => apiFailure('API request', error)
    );
    if (response.status < 200 || response.status >= 300)
      throw apiFailure('API request', { response: { status: response.status } });
    if (method === 'DELETE') {
      if (response.status !== 204)
        throw createApiServiceError(
          'Salesloft did not confirm deletion with HTTP 204; verify the resource before retrying.'
        );
      return undefined;
    }
    return this.publicMetadata(response.data);
  }
  private async one<S extends z.ZodType>(
    schema: S,
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    options: { data?: Data; params?: Data } = {}
  ): Promise<z.output<S>> {
    const raw = await this.request(method, path, options);
    const envelope = z.object({ data: z.unknown() }).safeParse(raw);
    const result = schema.safeParse(envelope.success ? envelope.data.data : undefined);
    if (!envelope.success || !result.success)
      throw createApiServiceError(
        'Salesloft returned an invalid resource response. Reconcile uncertain writes before retrying.'
      );
    return result.data;
  }
  private async list<S extends z.ZodType>(schema: S, path: string, params: Data) {
    const raw = await this.request('GET', path, { params }),
      result = z
        .object({ data: z.array(schema), metadata: z.object({ paging: pagingSchema }) })
        .safeParse(raw);
    if (!result.success)
      throw createApiServiceError('Salesloft returned an invalid paginated response.');
    const p = result.data.metadata.paging;
    return {
      data: result.data.data,
      metadata: {
        paging: {
          perPage: p.per_page,
          currentPage: p.current_page,
          nextPage: p.next_page,
          prevPage: p.prev_page
        }
      }
    };
  }
  listPeople(
    p?: PaginationParams & {
      emailAddresses?: string[];
      tagId?: number;
      cadenceId?: number;
      accountId?: number;
      ownerId?: number;
      updatedAtGte?: string;
    }
  ) {
    return this.list(personSchema, '/people', {
      ...this.page(p, [
        'created_at',
        'updated_at',
        'last_contacted_at',
        'name',
        'title',
        'job_seniority',
        'call_count',
        'sent_emails',
        'clicked_emails',
        'replied_emails',
        'viewed_emails',
        'account',
        'cadence_stage_name'
      ]),
      email_addresses: p?.emailAddresses,
      tag_id: p?.tagId === undefined ? undefined : [p.tagId],
      cadence_id: p?.cadenceId === undefined ? undefined : [p.cadenceId],
      account_id: p?.accountId === undefined ? undefined : [p.accountId],
      owner_id: p?.ownerId === undefined ? undefined : [p.ownerId],
      'updated_at[gte]': p?.updatedAtGte
    });
  }
  getPerson(value: number) {
    return this.one(personSchema, 'GET', `/people/${this.identifier(value)}`);
  }
  createPerson(data: Data) {
    if (!data.email_address && !(data.phone && data.last_name))
      throw createApiServiceError('Provide emailAddress or both phone and lastName.');
    return this.one(personSchema, 'POST', '/people', { data });
  }
  updatePerson(value: number, data: Data) {
    return this.one(personSchema, 'PUT', `/people/${this.identifier(value)}`, { data });
  }
  deletePerson(value: number) {
    return this.request('DELETE', `/people/${this.identifier(value)}`);
  }
  listAccounts(
    p?: PaginationParams & { domain?: string; name?: string; updatedAtGte?: string }
  ) {
    return this.list(accountSchema, '/accounts', {
      ...this.page(p, [
        'created_at',
        'updated_at',
        'last_contacted_at',
        'account_stage',
        'account_stage_name',
        'account_tier',
        'account_tier_name',
        'name',
        'counts_people',
        'prospector_engagement_score'
      ]),
      domain: p?.domain,
      name: p?.name,
      'updated_at[gte]': p?.updatedAtGte
    });
  }
  getAccount(value: number) {
    return this.one(accountSchema, 'GET', `/accounts/${this.identifier(value)}`);
  }
  createAccount(data: Data) {
    return this.one(accountSchema, 'POST', '/accounts', { data });
  }
  updateAccount(value: number, data: Data) {
    return this.one(accountSchema, 'PUT', `/accounts/${this.identifier(value)}`, { data });
  }
  deleteAccount(value: number) {
    return this.request('DELETE', `/accounts/${this.identifier(value)}`);
  }
  listCadences(p?: PaginationParams & { teamCadence?: boolean; updatedAtGte?: string }) {
    return this.list(cadenceSchema, '/cadences', {
      ...this.page(p, ['created_at', 'updated_at', 'name']),
      team_cadence: p?.teamCadence,
      'updated_at[gte]': p?.updatedAtGte
    });
  }
  getCadence(value: number) {
    return this.one(cadenceSchema, 'GET', `/cadences/${this.identifier(value)}`);
  }
  addPersonToCadence(personId: number, cadenceId: number, userId?: number) {
    return this.one(membershipSchema, 'POST', '/cadence_memberships', {
      params: { person_id: personId, cadence_id: cadenceId, user_id: userId }
    });
  }
  removeCadenceMembership(value: number) {
    return this.request('DELETE', `/cadence_memberships/${this.identifier(value)}`);
  }
  listCadenceMemberships(
    p?: PaginationParams & {
      personId?: number;
      cadenceId?: number;
      currentlyOnCadence?: boolean;
    }
  ) {
    return this.list(membershipSchema, '/cadence_memberships', {
      ...this.page(p, ['updated_at', 'added_at']),
      person_id: p?.personId,
      cadence_id: p?.cadenceId,
      currently_on_cadence: p?.currentlyOnCadence
    });
  }
  listEmailActivities(
    p?: PaginationParams & {
      updatedAtGte?: string;
      personId?: number;
      includeSubject?: boolean;
    }
  ) {
    return this.list(emailSchema, '/activities/emails', {
      ...this.page(p, [
        'updated_at',
        'recipient',
        'send_time',
        'account',
        'subject',
        'views',
        'clicks',
        'replies'
      ]),
      person_id: p?.personId === undefined ? undefined : [p.personId],
      scoped_fields: p?.includeSubject ? ['subject'] : undefined,
      'updated_at[gte]': p?.updatedAtGte
    });
  }
  async listCallActivities(
    p?: PaginationParams & { updatedAtGte?: string; personId?: number }
  ) {
    const result = await this.list(callSchema, '/activities/calls', {
      ...this.page(p, ['created_at', 'updated_at']),
      person_id: p?.personId === undefined ? undefined : [p.personId],
      'updated_at[gte]': p?.updatedAtGte
    });
    const data: Awaited<ReturnType<Client['callNote']>>[] = [];
    for (const value of result.data) data.push(await this.callNote(value));
    return { ...result, data };
  }
  private async callNote(value: z.output<typeof callSchema>) {
    return {
      ...value,
      note_content: value.note ? (await this.getNote(value.note.id)).content : null
    };
  }
  async createCall(data: Data) {
    if (
      data.duration !== undefined &&
      (typeof data.duration !== 'number' ||
        !Number.isSafeInteger(data.duration) ||
        data.duration < 0)
    )
      throw createApiServiceError('Call duration must be a nonnegative integer.');
    const body = {
      ...data,
      notes: data.note,
      note: undefined,
      user_id: undefined,
      user_guid:
        data.user_id !== undefined
          ? (await this.getUser(this.identifier(Number(data.user_id)))).guid
          : undefined
    };
    if (data.user_id !== undefined && !body.user_guid)
      throw createApiServiceError(
        'The selected call user has no GUID. Call list_users to select a user.'
      );
    const created = await this.one(callSchema, 'POST', '/activities/calls', { data: body });
    try {
      return await this.callNote(created);
    } catch {
      throw createApiServiceError(
        `Salesloft recorded call ${created.id}, but its note could not be read. Do not log the call again; verify it with list_call_activities and check note-read access.`
      );
    }
  }
  async listEmailTemplates(
    p?: PaginationParams & { searchTitle?: string; searchSubject?: string }
  ) {
    const result = await this.list(templateSchema, '/email_templates', {
      ...this.page(p, ['created_at', 'updated_at', 'last_used_at']),
      search: p?.searchTitle ?? p?.searchSubject
    });
    return {
      ...result,
      data: result.data.filter(
        value =>
          (p?.searchTitle === undefined ||
            value.title?.toLowerCase().startsWith(p.searchTitle.toLowerCase())) &&
          (p?.searchSubject === undefined ||
            value.subject?.toLowerCase().startsWith(p.searchSubject.toLowerCase()))
      )
    };
  }
  getEmailTemplate(value: number) {
    return this.one(templateSchema, 'GET', `/email_templates/${this.identifier(value)}`);
  }
  async listTasks(
    p?: PaginationParams & {
      personId?: number;
      currentUser?: boolean;
      taskType?: string;
      updatedAtGte?: string;
    }
  ) {
    return this.list(taskSchema, '/tasks', {
      ...this.page(p, [
        'due_date',
        'due_at',
        'utc_offset',
        'company',
        'updated_at',
        'completed_at',
        'salesloft.prioritizers/rhythm'
      ]),
      person_id: p?.personId === undefined ? undefined : [p.personId],
      user_id: p?.currentUser ? [(await this.getMe()).id] : undefined,
      task_type: p?.taskType === undefined ? undefined : [p.taskType],
      'updated_at[gte]': p?.updatedAtGte
    });
  }
  getTask(value: number) {
    return this.one(taskSchema, 'GET', `/tasks/${this.identifier(value)}`);
  }
  listNotes(
    p?: PaginationParams & { personId?: number; accountId?: number; updatedAtGte?: string }
  ) {
    if (p?.personId !== undefined && p.accountId !== undefined)
      throw createApiServiceError('Provide one personId or accountId note filter.');
    return this.list(noteSchema, '/notes', {
      ...this.page(p, ['created_at', 'updated_at']),
      associated_with_type:
        p?.personId !== undefined
          ? 'person'
          : p?.accountId !== undefined
            ? 'account'
            : undefined,
      associated_with_id: p?.personId ?? p?.accountId,
      'updated_at[gte]': p?.updatedAtGte
    });
  }
  getNote(value: number) {
    return this.one(noteSchema, 'GET', `/notes/${this.identifier(value)}`);
  }
  createNote(data: Data) {
    return this.one(noteSchema, 'POST', '/notes', { data });
  }
  async updateNote(value: number, data: Data) {
    await this.request('PUT', `/notes/${this.identifier(value)}`, { data });
    return this.getNote(value);
  }
  deleteNote(value: number) {
    return this.request('DELETE', `/notes/${this.identifier(value)}`);
  }
  listUsers(p?: PaginationParams) {
    return this.list(
      userSchema,
      '/users',
      this.page({ ...p, page: p?.page ?? 1 }, [
        'id',
        'seat_package',
        'email',
        'name',
        'group',
        'last_login',
        'role'
      ])
    );
  }
  getUser(value: number) {
    return this.one(userSchema, 'GET', `/users/${this.identifier(value)}`);
  }
  getMe() {
    return this.one(userSchema, 'GET', '/me');
  }
}
