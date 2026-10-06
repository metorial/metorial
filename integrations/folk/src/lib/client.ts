import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { z } from 'zod';
import {
  companySchema,
  customFieldSchema,
  dealSchema,
  groupSchema,
  noteSchema,
  personSchema,
  reminderSchema,
  taskSchema,
  userSchema
} from './schemas';

export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    nextLink: string | null;
  };
}

export interface FolkUser {
  id: string;
  fullName: string;
  email: string;
}

export interface PersonData {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  description: string;
  birthday: string | null;
  jobTitle: string;
  createdAt: string | null;
  createdBy: FolkUser;
  groups: Array<{ id: string; name: string }>;
  companies: Array<{ id: string; name: string }>;
  addresses: string[];
  emails: string[];
  phones: string[];
  urls: string[];
  customFieldValues: Record<string, unknown>;
  interactionMetadata: unknown;
  strongestConnection: unknown;
}

export interface CompanyData {
  id: string;
  name: string;
  description: string;
  fundingRaised: string | null;
  lastFundingDate: string | null;
  industry: string | null;
  foundationYear: string | null;
  employeeRange: string | null;
  createdAt: string | null;
  createdBy: FolkUser;
  groups: Array<{ id: string; name: string }>;
  addresses: string[];
  emails: string[];
  phones: string[];
  urls: string[];
  customFieldValues: Record<string, unknown>;
}

export interface DealData {
  id: string;
  name: string;
  companies: Array<{ id: string; name: string }>;
  people: Array<{ id: string; fullName: string }>;
  createdAt: string;
  createdBy: FolkUser;
  customFieldValues: Record<string, unknown>;
}

export interface GroupData {
  id: string;
  name: string;
}

export interface CustomFieldData {
  name: string;
  type: string;
  options?: Array<{ label: string; color: string }>;
  config?: { format?: string; currency?: string };
}

export interface NoteData {
  id: string;
  entity: { id: string; entityType: string; fullName: string };
  content: string;
  visibility: string;
  author: { type: string; id: string; fullName: string; email: string; deleted: boolean };
  createdAt: string;
  parentNote: { id: string } | null;
}

export interface ReminderData {
  id: string;
  name: string;
  entity: { id: string; entityType: string; fullName: string };
  recurrenceRule: string;
  visibility: string;
  assignedUsers: FolkUser[];
  nextTriggerTime: string | null;
  lastTriggerTime: string | null;
  createdBy: FolkUser;
  createdAt: string | null;
}

export interface CreatePersonInput {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  description?: string;
  birthday?: string | null;
  jobTitle?: string;
  groups?: Array<{ id: string }>;
  companies?: Array<{ name?: string; id?: string }>;
  addresses?: string[];
  emails?: string[];
  phones?: string[];
  urls?: string[];
  customFieldValues?: Record<string, unknown>;
}

export interface UpdatePersonInput {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  description?: string;
  birthday?: string | null;
  jobTitle?: string;
  groups?: Array<{ id: string }>;
  companies?: Array<{ name?: string; id?: string }>;
  addresses?: string[];
  emails?: string[];
  phones?: string[];
  urls?: string[];
  customFieldValues?: Record<string, unknown>;
}

export interface CreateCompanyInput {
  name?: string;
  description?: string;
  fundingRaised?: number | string | null;
  lastFundingDate?: string | null;
  industry?: string | null;
  foundationYear?: string | number | null;
  employeeRange?: string | null;
  groups?: Array<{ id: string }>;
  addresses?: string[];
  emails?: string[];
  phones?: string[];
  urls?: string[];
  customFieldValues?: Record<string, unknown>;
}

export interface UpdateCompanyInput {
  name?: string;
  description?: string;
  fundingRaised?: number | string | null;
  lastFundingDate?: string | null;
  industry?: string | null;
  foundationYear?: string | number | null;
  employeeRange?: string | null;
  groups?: Array<{ id: string }>;
  addresses?: string[];
  emails?: string[];
  phones?: string[];
  urls?: string[];
  customFieldValues?: Record<string, unknown>;
}

export interface CreateDealInput {
  name?: string;
  companies?: Array<{ id: string }>;
  people?: Array<{ id: string }>;
  customFieldValues?: Record<string, unknown>;
}

export interface UpdateDealInput {
  name?: string;
  companies?: Array<{ id: string }>;
  people?: Array<{ id: string }>;
  customFieldValues?: Record<string, unknown>;
}

export interface CreateNoteInput {
  entity: { id: string };
  visibility: 'public' | 'private';
  content: string;
  parentNote?: { id: string };
}

export interface UpdateNoteInput {
  visibility?: 'public' | 'private';
  content?: string;
}

export interface CreateReminderInput {
  entity: { id: string };
  name: string;
  recurrenceRule: string;
  visibility: 'public' | 'private';
  assignedUsers?: Array<{ id?: string; email?: string }>;
}

export interface FilterParams {
  combinator?: 'and' | 'or';
  filter?: Record<string, Record<string, unknown>>;
}

export interface TaskInput {
  entity?: { id: string };
  title?: string;
  dueAt?: string;
  dueTime?: string | null;
  description?: string | null;
  recurrenceFrequency?:
    | 'weekday'
    | 'weekly'
    | 'biweekly'
    | 'monthly'
    | 'quarterly'
    | 'yearly'
    | null;
  completedAt?: string | null;
  assignedUsers?: Array<{ id?: string; email?: string }>;
  isPublic?: boolean;
}
export type TaskData = z.infer<typeof taskSchema>;

export const resourceSegment = (value: string) => {
  if (!value || value !== value.trim() || value === '.' || value === '..')
    throw createApiServiceError(
      'Provide a nonempty resource identifier without surrounding whitespace.'
    );
  try {
    return encodeURIComponent(value);
  } catch {
    throw createApiServiceError('The resource identifier contains invalid characters.');
  }
};
const requireUpdate = (input: object) => {
  if (!Object.values(input).some(value => value !== undefined))
    throw createApiServiceError('Provide at least one field to update.');
};
const companyBody = (input: CreateCompanyInput | UpdateCompanyInput) => {
  const funding = input.fundingRaised;
  const amount = typeof funding === 'string' ? Number(funding) : funding;
  if (
    funding !== undefined &&
    funding !== null &&
    ((typeof funding === 'string' &&
      !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(funding.trim())) ||
      typeof amount !== 'number' ||
      !Number.isFinite(amount))
  )
    throw createApiServiceError('Provide fundingRaised as a finite numeric USD amount.');
  return pickDefined({ ...input, fundingRaised: amount });
};
const validateReferences = (input: {
  groups?: Array<{ id: string }>;
  companies?: Array<{ id?: string; name?: string }>;
  people?: Array<{ id: string }>;
}) => {
  for (const reference of [...(input.groups ?? []), ...(input.people ?? [])])
    resourceSegment(reference.id);
  for (const company of input.companies ?? []) {
    if (Boolean(company.id) === Boolean(company.name))
      throw createApiServiceError(
        'Provide exactly one company ID or company name for each association.'
      );
    if (company.id) resourceSegment(company.id);
    if (company.name !== undefined && !company.name.trim())
      throw createApiServiceError('Provide a nonempty associated company name.');
  }
};
const validateAssignees = (users?: Array<{ id?: string; email?: string }>) => {
  for (const user of users ?? []) {
    if (Boolean(user.id) === Boolean(user.email))
      throw createApiServiceError(
        'Provide exactly one user ID or email for each assigned user.'
      );
    if (user.id) resourceSegment(user.id);
    if (user.email !== undefined && !z.email().safeParse(user.email).success)
      throw createApiServiceError('Provide a valid assigned-user email address.');
  }
};
const filterOperators = new Set([
  'eq',
  'not_eq',
  'gt',
  'lt',
  'like',
  'not_like',
  'all',
  'in',
  'not_in',
  'empty',
  'not_empty'
]);
const listQuery = (params?: PaginationParams & FilterParams & Record<string, unknown>) => {
  if (
    params?.limit !== undefined &&
    (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100)
  )
    throw createApiServiceError('limit must be a whole number from 1 to 100.');
  if (params?.cursor !== undefined && (!params.cursor || params.cursor.length > 512))
    throw createApiServiceError(
      'Provide a nonempty pagination cursor of at most 512 characters.'
    );
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || key === 'filter') continue;
    if (
      ![
        'limit',
        'cursor',
        'combinator',
        'entity.id',
        'query',
        'createdAfter',
        'createdBefore',
        'onlyAssignedToMe'
      ].includes(key)
    )
      throw createApiServiceError('Unsupported list parameter.');
    query.set(key, String(value));
  }
  if (params?.combinator !== undefined && !['and', 'or'].includes(params.combinator))
    throw createApiServiceError('Use and or or to combine filters.');
  for (const [field, operators] of Object.entries(params?.filter ?? {})) {
    if (
      !field ||
      /[[\]]/.test(field) ||
      [...field].some(character => character.charCodeAt(0) < 32) ||
      !operators ||
      typeof operators !== 'object' ||
      Array.isArray(operators)
    )
      throw createApiServiceError('Provide filter fields and their documented operators.');
    for (const [operator, value] of Object.entries(operators)) {
      if (!filterOperators.has(operator))
        throw createApiServiceError('Unsupported filter operator.');
      const key = `filter[${field}][${operator}]`;
      const values = Array.isArray(value) ? value : [value];
      if (['empty', 'not_empty'].includes(operator)) {
        query.append(key, '');
        continue;
      }
      if (values.length === 0) throw createApiServiceError('Provide a nonempty filter value.');
      for (const item of values) {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const reference = z
            .object({ id: z.string().optional(), email: z.string().optional() })
            .strict()
            .safeParse(item);
          if (
            !reference.success ||
            Boolean(reference.data.id) === Boolean(reference.data.email)
          )
            throw createApiServiceError('Reference filters require exactly one ID or email.');
          const [referenceKey, referenceValue] = reference.data.id
            ? ['id', reference.data.id]
            : ['email', reference.data.email];
          query.append(`${key}[${referenceKey}]`, String(referenceValue));
        } else if (
          typeof item === 'string' ||
          typeof item === 'number' ||
          typeof item === 'boolean'
        )
          query.append(key, String(item));
        else throw createApiServiceError('Provide a scalar or reference filter value.');
      }
    }
  }
  return query;
};
export const companyAssociations = (
  companies: Array<{ companyId?: string; companyName?: string }>
) =>
  companies.map(company => {
    if ((company.companyId === undefined) === (company.companyName === undefined))
      throw createApiServiceError(
        'Provide exactly one company ID or name for each association.'
      );
    return company.companyId !== undefined
      ? { id: company.companyId }
      : { name: company.companyName };
  });
export const assignedUserReferences = (
  users: Array<{ userId?: string; userEmail?: string }>
) =>
  users.map(user => {
    if ((user.userId === undefined) === (user.userEmail === undefined))
      throw createApiServiceError('Provide exactly one user ID or email for each assignee.');
    return user.userId !== undefined ? { id: user.userId } : { email: user.userEmail };
  });
export const nextCursorFrom = (link?: string | null) => {
  if (!link) return null;
  try {
    const url = new URL(link);
    const cursor = url.searchParams.get('cursor');
    if (url.origin !== 'https://api.folk.app' || url.username || url.password || !cursor)
      throw createApiServiceError('Folk returned an invalid pagination link.');
    return cursor;
  } catch {
    throw createApiServiceError('Folk returned an invalid pagination link.');
  }
};

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  constructor(config: { token: string }) {
    if (
      typeof config.token !== 'string' ||
      !config.token.trim() ||
      [...config.token].some(character => character.charCodeAt(0) < 32)
    )
      throw createApiServiceError(
        'Provide a nonempty Folk API key without control characters.'
      );
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.folk.app/v1',
      authHeader: { value: `Bearer ${config.token.trim()}` },
      headers: { Accept: 'application/json', 'X-API-Version': '2025-06-09' },
      timeout: 30000,
      maxRedirects: 0,
      errorMapping: {
        mapAxiosError: error => ({
          baggage: {
            retryAfter: getResponseHeaderValue(error.response?.headers, 'retry-after')
          }
        })
      },
      errorAdapter: error => {
        const failure = buildApiServiceError(error, {
          providerLabel: 'Folk',
          reason: 'folk_api_error',
          parent: {},
          extractMessage: () =>
            'Check the API key, resource identifiers, permissions, and request fields.'
        });
        const retryAfter =
          isApiErrorRecord(error) &&
          isApiErrorRecord(error.data) &&
          isApiErrorRecord(error.data.baggage)
            ? error.data.baggage.retryAfter
            : undefined;
        if (typeof retryAfter === 'string' && /^\d{1,10}$/.test(retryAfter))
          failure.data.retryAfter = retryAfter;
        return failure;
      }
    });
  }
  private async request<S extends z.ZodType>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    schema: S,
    body?: object,
    params?: URLSearchParams,
    idempotencyKey?: string
  ): Promise<z.infer<S>> {
    if (
      idempotencyKey !== undefined &&
      (!idempotencyKey.trim() ||
        idempotencyKey.length > 255 ||
        [...idempotencyKey].some(char => char.charCodeAt(0) < 32))
    )
      throw createApiServiceError(
        'Provide a nonempty idempotency key of at most 255 characters.'
      );
    const response = await this.http.request<unknown>({
      method,
      url: path,
      data: body,
      params,
      headers: idempotencyKey === undefined ? undefined : { 'Idempotency-Key': idempotencyKey }
    });
    if (response.status !== 200)
      throw createApiServiceError(
        'Folk did not confirm the operation. Inspect the resource before retrying a write.'
      );
    const envelope = z.object({ data: z.unknown() }).safeParse(response.data);
    const parsed = envelope.success ? schema.safeParse(envelope.data.data) : undefined;
    if (!parsed?.success)
      throw createApiServiceError('Folk returned an unexpected response shape.', {
        reason: 'folk_invalid_response'
      });
    return parsed.data;
  }
  private async list<S extends z.ZodType>(
    path: string,
    schema: S,
    params?: PaginationParams & FilterParams & Record<string, unknown>
  ) {
    const result = await this.request(
      'GET',
      path,
      z.object({
        items: z.array(schema),
        pagination: z.object({ nextLink: z.string().nullish() })
      }),
      undefined,
      listQuery(params)
    );
    if (result.pagination.nextLink) {
      let url: URL;
      try {
        url = new URL(result.pagination.nextLink);
      } catch {
        throw createApiServiceError('Folk returned an invalid pagination link.');
      }
      if (
        url.origin !== 'https://api.folk.app' ||
        url.pathname !== `/v1${path}` ||
        url.username ||
        url.password ||
        url.hash
      )
        throw createApiServiceError(
          'Folk returned a pagination link outside the requested resource.'
        );
      nextCursorFrom(result.pagination.nextLink);
    }
    return {
      items: result.items,
      pagination: { nextLink: result.pagination.nextLink ?? null }
    };
  }
  listPeople(params?: PaginationParams & FilterParams) {
    return this.list('/people', personSchema, { ...params });
  }
  getPerson(id: string) {
    return this.request('GET', `/people/${resourceSegment(id)}`, personSchema);
  }
  createPerson(input: CreatePersonInput, idempotencyKey?: string) {
    validateReferences(input);
    return this.request(
      'POST',
      '/people',
      personSchema,
      pickDefined(input),
      undefined,
      idempotencyKey
    );
  }
  updatePerson(id: string, input: UpdatePersonInput) {
    requireUpdate(input);
    validateReferences(input);
    return this.request(
      'PATCH',
      `/people/${resourceSegment(id)}`,
      personSchema,
      pickDefined(input)
    );
  }
  deletePerson(id: string) {
    return this.remove(`/people/${resourceSegment(id)}`, id);
  }
  listCompanies(params?: PaginationParams & FilterParams) {
    return this.list('/companies', companySchema, { ...params });
  }
  getCompany(id: string) {
    return this.request('GET', `/companies/${resourceSegment(id)}`, companySchema);
  }
  createCompany(input: CreateCompanyInput, idempotencyKey?: string) {
    validateReferences(input);
    return this.request(
      'POST',
      '/companies',
      companySchema,
      companyBody(input),
      undefined,
      idempotencyKey
    );
  }
  updateCompany(id: string, input: UpdateCompanyInput) {
    requireUpdate(input);
    validateReferences(input);
    return this.request(
      'PATCH',
      `/companies/${resourceSegment(id)}`,
      companySchema,
      companyBody(input)
    );
  }
  deleteCompany(id: string) {
    return this.remove(`/companies/${resourceSegment(id)}`, id);
  }
  private dealPath(groupId: string, objectType: string, id?: string) {
    return `/groups/${resourceSegment(groupId)}/${resourceSegment(objectType)}${id === undefined ? '' : `/${resourceSegment(id)}`}`;
  }
  listDeals(groupId: string, objectType: string, params?: PaginationParams & FilterParams) {
    return this.list(this.dealPath(groupId, objectType), dealSchema, { ...params });
  }
  getDeal(groupId: string, objectType: string, id: string) {
    return this.request('GET', this.dealPath(groupId, objectType, id), dealSchema);
  }
  createDeal(
    groupId: string,
    objectType: string,
    input: CreateDealInput,
    idempotencyKey?: string
  ) {
    validateReferences(input);
    return this.request(
      'POST',
      this.dealPath(groupId, objectType),
      dealSchema,
      pickDefined(input),
      undefined,
      idempotencyKey
    );
  }
  updateDeal(groupId: string, objectType: string, id: string, input: UpdateDealInput) {
    requireUpdate(input);
    validateReferences(input);
    return this.request(
      'PATCH',
      this.dealPath(groupId, objectType, id),
      dealSchema,
      pickDefined(input)
    );
  }
  deleteDeal(groupId: string, objectType: string, id: string) {
    return this.remove(this.dealPath(groupId, objectType, id), id);
  }
  listGroups(params?: PaginationParams) {
    return this.list('/groups', groupSchema, { ...params });
  }
  listGroupCustomFields(groupId: string, entityType: string, params?: PaginationParams) {
    return this.list(
      `/groups/${resourceSegment(groupId)}/custom-fields/${resourceSegment(entityType)}`,
      customFieldSchema,
      { ...params }
    );
  }
  listNotes(
    entityId: string,
    params?: PaginationParams & {
      query?: string;
      createdAfter?: string;
      createdBefore?: string;
    }
  ) {
    resourceSegment(entityId);
    return this.list('/notes', noteSchema, { ...params, 'entity.id': entityId });
  }
  getNote(id: string) {
    return this.request('GET', `/notes/${resourceSegment(id)}`, noteSchema);
  }
  createNote(input: CreateNoteInput, idempotencyKey?: string) {
    resourceSegment(input.entity.id);
    if (input.parentNote !== undefined) resourceSegment(input.parentNote.id);
    return this.request('POST', '/notes', noteSchema, input, undefined, idempotencyKey);
  }
  updateNote(id: string, input: UpdateNoteInput) {
    requireUpdate(input);
    return this.request(
      'PATCH',
      `/notes/${resourceSegment(id)}`,
      noteSchema,
      pickDefined(input)
    );
  }
  deleteNote(id: string) {
    return this.remove(`/notes/${resourceSegment(id)}`, id);
  }
  listReminders(entityId: string, params?: PaginationParams) {
    resourceSegment(entityId);
    return this.list('/reminders', reminderSchema, { ...params, 'entity.id': entityId });
  }
  getReminder(id: string) {
    return this.request('GET', `/reminders/${resourceSegment(id)}`, reminderSchema);
  }
  createReminder(input: CreateReminderInput) {
    resourceSegment(input.entity.id);
    validateAssignees(input.assignedUsers);
    if (!input.name.trim() || !input.recurrenceRule.trim())
      throw createApiServiceError('Provide a reminder name and recurrence rule.');
    if (input.visibility === 'public' && !input.assignedUsers?.length)
      throw createApiServiceError('Public reminders require at least one assigned user.');
    if (input.visibility === 'private' && input.assignedUsers !== undefined)
      throw createApiServiceError(
        'Omit assignedUsers for a private reminder; Folk notifies the API key owner.'
      );
    if (input.assignedUsers !== undefined && input.assignedUsers.length > 50)
      throw createApiServiceError('A public reminder accepts at most 50 assigned users.');
    return this.request('POST', '/reminders', reminderSchema, input);
  }
  deleteReminder(id: string) {
    return this.remove(`/reminders/${resourceSegment(id)}`, id);
  }
  getCurrentUser() {
    return this.request('GET', '/users/me', userSchema);
  }
  listTasks(params?: PaginationParams & FilterParams & { onlyAssignedToMe?: boolean }) {
    return this.list('/tasks', taskSchema, { ...params });
  }
  getTask(id: string) {
    return this.request('GET', `/tasks/${resourceSegment(id)}`, taskSchema);
  }
  createTask(input: TaskInput, idempotencyKey?: string) {
    if (!input.entity || !input.title?.trim() || !input.dueAt)
      throw createApiServiceError('Creating a task requires entityId, title, and dueAt.');
    if (input.description === null)
      throw createApiServiceError('Provide a string task description when creating a task.');
    return this.request(
      'POST',
      '/tasks',
      taskSchema,
      this.taskBody(input),
      undefined,
      idempotencyKey
    );
  }
  updateTask(id: string, input: TaskInput, idempotencyKey?: string) {
    requireUpdate(input);
    if (input.completedAt !== undefined)
      throw createApiServiceError('Use mark_done or mark_to_do to change task completion.');
    return this.request(
      'PATCH',
      `/tasks/${resourceSegment(id)}`,
      taskSchema,
      this.taskBody(input),
      undefined,
      idempotencyKey
    );
  }
  markTaskDone(id: string, completedAt: string, idempotencyKey?: string) {
    if (!z.iso.datetime({ offset: true }).safeParse(completedAt).success)
      throw createApiServiceError('Provide completedAt as an ISO 8601 timestamp.');
    return this.request(
      'POST',
      `/tasks/${resourceSegment(id)}/mark-as-done`,
      taskSchema,
      { completedAt },
      undefined,
      idempotencyKey
    );
  }
  markTaskToDo(id: string, idempotencyKey?: string) {
    return this.request(
      'POST',
      `/tasks/${resourceSegment(id)}/mark-as-to-do`,
      taskSchema,
      undefined,
      undefined,
      idempotencyKey
    );
  }
  deleteTask(id: string) {
    return this.remove(`/tasks/${resourceSegment(id)}`, id);
  }
  private taskBody(input: TaskInput) {
    if (input.entity) resourceSegment(input.entity.id);
    validateAssignees(input.assignedUsers);
    if (input.assignedUsers !== undefined && input.assignedUsers.length > 50)
      throw createApiServiceError('A task accepts at most 50 assigned users.');
    if (input.title !== undefined && (!input.title.trim() || input.title.length > 255))
      throw createApiServiceError('Provide a nonempty task title of at most 255 characters.');
    if (input.dueAt !== undefined && !z.iso.date().safeParse(input.dueAt).success)
      throw createApiServiceError('Provide dueAt as a YYYY-MM-DD calendar date.');
    if (
      input.dueTime !== undefined &&
      input.dueTime !== null &&
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.dueTime)
    )
      throw createApiServiceError('Provide dueTime as HH:mm or null.');
    if (
      input.completedAt !== undefined &&
      input.completedAt !== null &&
      !z.iso.datetime({ offset: true }).safeParse(input.completedAt).success
    )
      throw createApiServiceError('Provide completedAt as an ISO 8601 timestamp or null.');
    return pickDefined(input);
  }
  private async remove(path: string, id: string) {
    const result = await this.request('DELETE', path, z.object({ id: z.string().min(1) }));
    if (result.id !== id)
      throw createApiServiceError(
        'Folk acknowledged a different resource identifier for deletion.'
      );
    return result;
  }
}
