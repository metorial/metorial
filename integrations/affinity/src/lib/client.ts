import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  pickDefined,
  requestAxios
} from 'slates';
import { z } from 'zod';
import {
  changeSchema,
  deletedSchema,
  entrySchema,
  fieldSchema,
  fieldValueSchema,
  fileSchema,
  identifier,
  interactionSchema,
  listSchema,
  noteSchema,
  opportunitySchema,
  organizationSchema,
  pagination,
  personSchema,
  reminderSchema,
  whoamiSchema
} from './api-schemas';

type Page = { pageSize?: number; pageToken?: string };
type EntityFilter = { personId?: number; organizationId?: number; opportunityId?: number };
type ReminderInput = EntityFilter & {
  content?: string;
  dueDate?: string;
  type?: number;
  resetType?: number;
  reminderDays?: number;
  isCompleted?: boolean;
};

export class AffinityClient {
  private readonly axios: ReturnType<typeof createAuthenticatedAxios>;
  constructor(token: string) {
    if (!token.trim()) throw createApiServiceError('An Affinity API key is required.');
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.affinity.co',
      authHeader: { value: `Bearer ${token}` },
      timeout: 30000,
      maxRedirects: 0,
      validateStatus: () => true
    });
  }
  private id(value: number) {
    if (!identifier.safeParse(value).success)
      throw createApiServiceError('Affinity IDs must be positive safe integers.');
    return value;
  }
  private page(params?: Page, maximum = 500) {
    if (
      params?.pageSize !== undefined &&
      (!Number.isSafeInteger(params.pageSize) ||
        params.pageSize < 1 ||
        params.pageSize > maximum)
    )
      throw createApiServiceError(`Page size must be an integer from 1 to ${maximum}.`);
    return { page_size: params?.pageSize, page_token: params?.pageToken };
  }
  private selectors(params: EntityFilter & { listEntryId?: number }, minimum = 0) {
    const selected = [
      params.personId,
      params.organizationId,
      params.opportunityId,
      params.listEntryId
    ].filter(value => value !== undefined);
    if (selected.length < minimum || selected.length > 1)
      throw createApiServiceError(
        minimum
          ? 'Provide exactly one personId, organizationId, opportunityId or listEntryId.'
          : 'Provide at most one entity filter.'
      );
    for (const id of selected) this.id(id);
    return {
      person_id: params.personId,
      organization_id: params.organizationId,
      opportunity_id: params.opportunityId,
      list_entry_id: params.listEntryId
    };
  }
  private async request<S extends z.ZodType>(
    operation: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    schema: S,
    options: { data?: Record<string, unknown>; params?: Record<string, unknown> } = {}
  ): Promise<z.output<S>> {
    for (const data of [options.data, options.params])
      for (const [key, value] of Object.entries(data ?? {})) {
        if (key.endsWith('_id') && value !== undefined) this.id(Number(value));
        if (key.endsWith('_ids') && Array.isArray(value))
          for (const id of value) this.id(Number(id));
      }
    const fail = (error: unknown) => {
      const rawStatus = getApiErrorStatus(error);
      const status =
        typeof rawStatus === 'number' &&
        Number.isInteger(rawStatus) &&
        rawStatus >= 100 &&
        rawStatus <= 599
          ? rawStatus
          : undefined;
      return buildApiServiceError(
        { response: { status } },
        {
          providerLabel: 'Affinity',
          operation,
          reason: 'affinity_api_error',
          parent: {},
          formatMessage: ({ status }) =>
            `Affinity ${operation} failed${status ? ` (HTTP ${status})` : ''}. ${status === 401 ? 'Check the API key and IP allowlist.' : status === 403 ? 'Check the key owner’s in-product permissions and API plan.' : status === 429 ? 'The user or account API quota is exhausted; retry after the rate limit resets.' : 'Check the identifiers and request parameters, then retry when appropriate.'}`
        }
      );
    };
    const response = await requestAxios(
      operation,
      () =>
        this.axios.request<unknown>({
          method,
          url: path,
          data: options.data ? pickDefined(options.data) : undefined,
          params: options.params ? pickDefined(options.params) : undefined
        }),
      fail
    );
    if (response.status < 200 || response.status >= 300)
      throw fail({ response: { status: response.status } });
    const parsed = schema.safeParse(response.data);
    if (!parsed.success)
      throw createApiServiceError(`Affinity returned an invalid response for ${operation}.`);
    return parsed.data;
  }
  async whoAmI() {
    return this.request('get current user', 'GET', '/auth/whoami', whoamiSchema);
  }
  async listPersons(params?: Page & { term?: string; withInteractionDates?: boolean }) {
    const page = await this.request(
      'search persons',
      'GET',
      '/persons',
      pagination(personSchema, 'persons'),
      {
        params: {
          term: params?.term,
          with_interaction_dates: params?.withInteractionDates,
          ...this.page(params)
        }
      }
    );
    // V1 search omits associations; fetch details rather than inventing an empty relationship list.
    const persons: z.output<typeof personSchema>[] = [];
    for (const person of page.items) {
      const detail =
        person.organization_ids === undefined ? await this.getPerson(person.id) : person;
      persons.push({ ...detail, ...person, organization_ids: detail.organization_ids });
    }
    return { persons, next_page_token: page.next_page_token };
  }
  async getPerson(personId: number, params?: { withInteractionDates?: boolean }) {
    return this.request(
      'get person',
      'GET',
      `/persons/${this.id(personId)}`,
      personSchema.extend({ organization_ids: z.array(identifier) }),
      {
        params: { with_interaction_dates: params?.withInteractionDates }
      }
    );
  }
  async createPerson(data: {
    firstName: string;
    lastName: string;
    emails?: string[];
    organization_ids?: number[];
  }) {
    const created = await this.request('create person', 'POST', '/persons', personSchema, {
      data: {
        first_name: data.firstName,
        last_name: data.lastName,
        emails: data.emails ?? [],
        organization_ids: data.organization_ids
      }
    });
    return created.organization_ids === undefined ? this.getPerson(created.id) : created;
  }
  async updatePerson(
    personId: number,
    data: {
      firstName?: string;
      lastName?: string;
      emails?: string[];
      organization_ids?: number[];
    }
  ) {
    const updated = await this.request(
      'update person',
      'PUT',
      `/persons/${this.id(personId)}`,
      personSchema,
      {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          emails: data.emails,
          organization_ids: data.organization_ids
        }
      }
    );
    return updated.organization_ids === undefined ? this.getPerson(updated.id) : updated;
  }
  async deletePerson(personId: number) {
    return this.request(
      'delete person',
      'DELETE',
      `/persons/${this.id(personId)}`,
      deletedSchema
    );
  }
  async listOrganizations(params?: Page & { term?: string; withInteractionDates?: boolean }) {
    const page = await this.request(
      'search organizations',
      'GET',
      '/organizations',
      pagination(organizationSchema, 'organizations'),
      {
        params: {
          term: params?.term,
          with_interaction_dates: params?.withInteractionDates,
          ...this.page(params)
        }
      }
    );
    const organizations: z.output<typeof organizationSchema>[] = [];
    for (const organization of page.items) {
      const detail =
        organization.person_ids === undefined
          ? await this.getOrganization(organization.id)
          : organization;
      organizations.push({ ...detail, ...organization, person_ids: detail.person_ids });
    }
    return { organizations, next_page_token: page.next_page_token };
  }
  async getOrganization(organizationId: number, params?: { withInteractionDates?: boolean }) {
    return this.request(
      'get organization',
      'GET',
      `/organizations/${this.id(organizationId)}`,
      organizationSchema.extend({ person_ids: z.array(identifier) }),
      { params: { with_interaction_dates: params?.withInteractionDates } }
    );
  }
  async createOrganization(data: { name: string; domain?: string; person_ids?: number[] }) {
    const created = await this.request(
      'create organization',
      'POST',
      '/organizations',
      organizationSchema,
      {
        data
      }
    );
    return created.person_ids === undefined ? this.getOrganization(created.id) : created;
  }
  async updateOrganization(
    organizationId: number,
    data: { name?: string; domain?: string; person_ids?: number[] }
  ) {
    if (data.name !== undefined && (await this.getOrganization(organizationId)).global)
      throw createApiServiceError('Global organizations cannot be renamed.');
    const updated = await this.request(
      'update organization',
      'PUT',
      `/organizations/${this.id(organizationId)}`,
      organizationSchema,
      { data }
    );
    return updated.person_ids === undefined ? this.getOrganization(updated.id) : updated;
  }
  async deleteOrganization(organizationId: number) {
    if ((await this.getOrganization(organizationId)).global)
      throw createApiServiceError('Global organizations cannot be deleted.');
    return this.request(
      'delete organization',
      'DELETE',
      `/organizations/${this.id(organizationId)}`,
      deletedSchema
    );
  }
  private opportunity(data: z.output<typeof opportunitySchema>) {
    const listIds = [...new Set((data.list_entries ?? []).map(entry => entry.list_id))];
    const listId = data.list_id ?? (listIds.length === 1 ? listIds[0] : undefined);
    if (listId === undefined)
      throw createApiServiceError(
        'Affinity did not expose the opportunity list. Check access to its list.'
      );
    return { ...data, list_id: listId };
  }
  async listOpportunities(params?: Page & { term?: string; listId?: number }) {
    if (params?.listId !== undefined) this.id(params.listId);
    const page = await this.request(
      'search opportunities',
      'GET',
      '/opportunities',
      pagination(opportunitySchema, 'opportunities'),
      { params: { term: params?.term, ...this.page(params) } }
    );
    const opportunities: (z.output<typeof opportunitySchema> & { list_id: number })[] = [];
    for (const item of page.items) {
      opportunities.push(
        item.person_ids === undefined ||
          item.organization_ids === undefined ||
          (item.list_id === undefined && item.list_entries === undefined)
          ? await this.getOpportunity(item.id)
          : this.opportunity(item)
      );
    }
    return {
      opportunities: opportunities.filter(
        item => params?.listId === undefined || item.list_id === params.listId
      ),
      next_page_token: page.next_page_token
    };
  }
  async getOpportunity(opportunityId: number) {
    return this.opportunity(
      await this.request(
        'get opportunity',
        'GET',
        `/opportunities/${this.id(opportunityId)}`,
        opportunitySchema.extend({
          person_ids: z.array(identifier),
          organization_ids: z.array(identifier)
        })
      )
    );
  }
  async createOpportunity(data: {
    name: string;
    listId: number;
    person_ids?: number[];
    organization_ids?: number[];
  }) {
    const created = await this.request(
      'create opportunity',
      'POST',
      '/opportunities',
      opportunitySchema,
      {
        data: {
          name: data.name,
          list_id: data.listId,
          person_ids: data.person_ids,
          organization_ids: data.organization_ids
        }
      }
    );
    return this.getOpportunity(created.id);
  }
  async updateOpportunity(
    opportunityId: number,
    data: { name?: string; person_ids?: number[]; organization_ids?: number[] }
  ) {
    const updated = await this.request(
      'update opportunity',
      'PUT',
      `/opportunities/${this.id(opportunityId)}`,
      opportunitySchema,
      { data }
    );
    return updated.person_ids === undefined || updated.organization_ids === undefined
      ? this.getOpportunity(updated.id)
      : this.opportunity(updated);
  }
  async deleteOpportunity(opportunityId: number) {
    return this.request(
      'delete opportunity',
      'DELETE',
      `/opportunities/${this.id(opportunityId)}`,
      deletedSchema
    );
  }
  async getLists() {
    return this.request('get lists', 'GET', '/lists', z.array(listSchema));
  }
  async getList(listId: number) {
    return this.request('get list', 'GET', `/lists/${this.id(listId)}`, listSchema);
  }
  private entry(entry: z.output<typeof entrySchema>, listType?: number) {
    const entityType = entry.entity_type ?? entry.entity?.type ?? listType;
    if (entry.entity_id === undefined || entityType === undefined)
      throw createApiServiceError('Affinity did not expose the list entry entity ID or type.');
    return { ...entry, entity_id: entry.entity_id, entity_type: entityType };
  }
  async getListEntries(listId: number, params?: Page) {
    const page = await this.request(
      'get list entries',
      'GET',
      `/lists/${this.id(listId)}/list-entries`,
      pagination(entrySchema, 'list_entries'),
      { params: this.page(params) }
    );
    const listType = page.items.some(
      entry => entry.entity_type === undefined && entry.entity?.type === undefined
    )
      ? (await this.getList(listId)).type
      : undefined;
    return {
      list_entries: page.items.map(entry => this.entry(entry, listType)),
      next_page_token: page.next_page_token
    };
  }
  async getListEntry(listId: number, listEntryId: number) {
    return this.request(
      'get list entry',
      'GET',
      `/lists/${this.id(listId)}/list-entries/${this.id(listEntryId)}`,
      entrySchema
    );
  }
  async createListEntry(listId: number, data: { entityId: number; creator_id?: number }) {
    const list = await this.getList(listId);
    if (list.type === 8)
      throw createApiServiceError(
        'Use create_opportunity to create an entry on an opportunity list.'
      );
    const entry = await this.request(
      'add list entry',
      'POST',
      `/lists/${this.id(listId)}/list-entries`,
      entrySchema,
      { data: { entity_id: data.entityId, creator_id: data.creator_id } }
    );
    return this.entry(entry, list.type);
  }
  async deleteListEntry(listId: number, listEntryId: number) {
    return this.request(
      'remove list entry',
      'DELETE',
      `/lists/${this.id(listId)}/list-entries/${this.id(listEntryId)}`,
      deletedSchema
    );
  }
  async getFields(params?: {
    listId?: number;
    entityType?: number;
    withModifiedNames?: boolean;
  }) {
    return this.request('get fields', 'GET', '/fields', z.array(fieldSchema), {
      params: {
        list_id: params?.listId,
        entity_type: params?.entityType,
        with_modified_names: params?.withModifiedNames
      }
    });
  }
  async getFieldValues(params: EntityFilter & { listEntryId?: number; fieldId?: number }) {
    if (params.fieldId !== undefined) this.id(params.fieldId);
    const values = await this.request(
      'get field values',
      'GET',
      '/field-values',
      z.array(fieldValueSchema),
      { params: this.selectors(params, 1) }
    );
    return values.filter(
      value => params.fieldId === undefined || value.field_id === params.fieldId
    );
  }
  async createFieldValue(data: {
    fieldId: number;
    entityId: number;
    value: unknown;
    listEntryId?: number;
  }) {
    return this.request('set field value', 'POST', '/field-values', fieldValueSchema, {
      data: {
        field_id: data.fieldId,
        entity_id: data.entityId,
        value: data.value,
        list_entry_id: data.listEntryId
      }
    });
  }
  async updateFieldValue(fieldValueId: number, data: { value: unknown }) {
    return this.request(
      'update field value',
      'PUT',
      `/field-values/${this.id(fieldValueId)}`,
      fieldValueSchema,
      { data }
    );
  }
  async deleteFieldValue(fieldValueId: number) {
    return this.request(
      'delete field value',
      'DELETE',
      `/field-values/${this.id(fieldValueId)}`,
      deletedSchema
    );
  }
  async getFieldValueChanges(
    params: EntityFilter & {
      fieldId: number;
      listEntryId?: number;
      entityId?: number;
      entityType?: number;
      action_type?: number;
      changedAfter?: string;
      orderBy?: 'asc' | 'desc';
      afterId?: number;
      limit?: number;
    }
  ) {
    const filters: EntityFilter & { listEntryId?: number } = { ...params };
    if (params.entityId !== undefined) {
      if (
        [
          params.personId,
          params.organizationId,
          params.opportunityId,
          params.listEntryId
        ].some(value => value !== undefined)
      )
        throw createApiServiceError(
          'Use entityId with entityType, or one explicit entity filter, not both.'
        );
      if (params.entityType === 0) filters.personId = params.entityId;
      else if (params.entityType === 1) filters.organizationId = params.entityId;
      else if (params.entityType === 8) filters.opportunityId = params.entityId;
      else
        throw createApiServiceError(
          'entityId requires entityType (0=person, 1=organization, 8=opportunity).'
        );
    }
    if (params.action_type !== undefined && ![0, 1, 2].includes(params.action_type))
      throw createApiServiceError('Action type must be 0=create, 1=delete or 2=update.');
    if (params.afterId !== undefined && (!params.changedAfter || params.orderBy !== 'asc'))
      throw createApiServiceError(
        'afterId requires changedAfter and orderBy=asc. Preserve the returned changedAt timestamp exactly.'
      );
    if (
      params.limit !== undefined &&
      (!Number.isSafeInteger(params.limit) || params.limit < 1)
    )
      throw createApiServiceError('Limit must be a positive integer.');
    if (params.changedAfter !== undefined && !Number.isFinite(Date.parse(params.changedAfter)))
      throw createApiServiceError('changedAfter must be an ISO 8601 timestamp.');
    return this.request(
      'get field value changes',
      'GET',
      '/field-value-changes',
      z.array(changeSchema),
      {
        params: {
          field_id: params.fieldId,
          ...this.selectors(filters),
          action_type: params.action_type,
          changed_after: params.changedAfter,
          order_by: params.orderBy,
          after_id: params.afterId,
          limit: params.limit
        }
      }
    );
  }
  async listNotes(params?: Page & EntityFilter & { creatorId?: number }) {
    return this.request('list notes', 'GET', '/notes', pagination(noteSchema, 'notes'), {
      params: {
        ...this.selectors(params ?? {}),
        creator_id: params?.creatorId,
        ...this.page(params)
      }
    }).then(page => ({ notes: page.items, next_page_token: page.next_page_token }));
  }
  async getNote(noteId: number) {
    return this.request('get note', 'GET', `/notes/${this.id(noteId)}`, noteSchema);
  }
  async createNote(data: {
    personIds?: number[];
    organizationIds?: number[];
    opportunityIds?: number[];
    content: string;
    creatorId?: number;
    createdAt?: string;
  }) {
    if (![data.personIds, data.organizationIds, data.opportunityIds].some(ids => ids?.length))
      throw createApiServiceError(
        'A note requires at least one associated person, organization or opportunity.'
      );
    return this.request('create note', 'POST', '/notes', noteSchema, {
      data: {
        person_ids: data.personIds,
        organization_ids: data.organizationIds,
        opportunity_ids: data.opportunityIds,
        content: data.content,
        creator_id: data.creatorId,
        created_at: data.createdAt
      }
    });
  }
  async updateNote(noteId: number, data: { content?: string }) {
    return this.request('update note', 'PUT', `/notes/${this.id(noteId)}`, noteSchema, {
      data
    });
  }
  async deleteNote(noteId: number) {
    return this.request('delete note', 'DELETE', `/notes/${this.id(noteId)}`, deletedSchema);
  }
  async getInteractions(
    params?: Page & EntityFilter & { type?: number; startTime?: string; endTime?: string }
  ) {
    if (params?.type === undefined || ![0, 1, 2, 3].includes(params.type))
      throw createApiServiceError('Provide type (0=meeting, 1=call, 2=chat, 3=email).');
    const start = Date.parse(params.startTime ?? ''),
      end = Date.parse(params.endTime ?? '');
    const anniversary = new Date(start);
    anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1);
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start >= end ||
      end > anniversary.getTime()
    )
      throw createApiServiceError(
        'Provide startTime and endTime in ISO 8601, ordered and no more than one year apart.'
      );
    const data = await this.request(
      'get interactions',
      'GET',
      '/interactions',
      z.union([z.array(interactionSchema), z.record(z.string(), z.unknown())]),
      {
        params: {
          ...this.selectors(params, 1),
          type: params.type,
          start_time: params.startTime,
          end_time: params.endTime,
          ...this.page(params, 100)
        }
      }
    );
    const arrays = Array.isArray(data) ? [data] : Object.values(data).filter(Array.isArray);
    if (arrays.length !== 1)
      throw createApiServiceError('Affinity returned an invalid interaction collection.');
    const parsed = z.array(interactionSchema).safeParse(arrays[0]);
    const token = Array.isArray(data) ? undefined : data.next_page_token;
    if (
      !parsed.success ||
      parsed.data.some(item => item.type !== params.type) ||
      (token != null && typeof token !== 'string')
    )
      throw createApiServiceError('Affinity returned an invalid interaction response.');
    return {
      interactions: parsed.data,
      next_page_token: typeof token === 'string' ? token : null
    };
  }
  async getRelationshipStrengths(params: { externalId: number; internalId?: number }) {
    return this.request(
      'get relationship strengths',
      'GET',
      '/relationships-strengths',
      z.array(
        z.object({ internal_id: identifier, external_id: identifier, strength: z.number() })
      ),
      { params: { external_id: params.externalId, internal_id: params.internalId } }
    );
  }
  async listReminders(params?: Page & EntityFilter & { ownerId?: number }) {
    return this.request(
      'list reminders',
      'GET',
      '/reminders',
      pagination(reminderSchema, 'reminders'),
      {
        params: {
          ...this.selectors(params ?? {}),
          owner_id: params?.ownerId,
          ...this.page(params)
        }
      }
    ).then(page => ({ reminders: page.items, next_page_token: page.next_page_token }));
  }
  async getReminder(reminderId: number) {
    return this.request(
      'get reminder',
      'GET',
      `/reminders/${this.id(reminderId)}`,
      reminderSchema
    );
  }
  private reminder(data: ReminderInput) {
    if (data.type !== undefined && ![0, 1].includes(data.type))
      throw createApiServiceError('Reminder type must be 0=one-time or 1=recurring.');
    if (data.resetType !== undefined && ![0, 1, 2].includes(data.resetType))
      throw createApiServiceError('Reset type must be 0=interaction, 1=email or 2=meeting.');
    if (
      data.type === 1 &&
      (data.resetType === undefined ||
        !Number.isSafeInteger(data.reminderDays) ||
        (data.reminderDays ?? 0) < 1)
    )
      throw createApiServiceError(
        'Recurring reminders require resetType and positive integer reminderDays.'
      );
    if (data.dueDate !== undefined && !Number.isFinite(Date.parse(data.dueDate)))
      throw createApiServiceError('dueDate must be an ISO 8601 date.');
    return {
      ...this.selectors(data),
      content: data.content,
      due_date: data.dueDate,
      type: data.type,
      reset_type: data.resetType,
      reminder_days: data.reminderDays,
      is_completed: data.isCompleted === undefined ? undefined : Number(data.isCompleted)
    };
  }
  async createReminder(
    data: ReminderInput & { ownerId: number; content: string; dueDate: string }
  ) {
    return this.request('create reminder', 'POST', '/reminders', reminderSchema, {
      data: { ...this.reminder({ ...data, type: data.type ?? 0 }), owner_id: data.ownerId }
    });
  }
  async updateReminder(reminderId: number, data: ReminderInput & { status?: number }) {
    if (data.status !== undefined && ![0, 1].includes(data.status))
      throw createApiServiceError(
        'Use status 0=completed or 1=active. Overdue status 2 is calculated from dueDate.'
      );
    if (
      data.status !== undefined &&
      data.isCompleted !== undefined &&
      data.isCompleted !== (data.status === 0)
    )
      throw createApiServiceError('status and isCompleted disagree.');
    return this.request(
      'update reminder',
      'PUT',
      `/reminders/${this.id(reminderId)}`,
      reminderSchema,
      {
        data: this.reminder({
          ...data,
          isCompleted:
            data.isCompleted ?? (data.status === undefined ? undefined : data.status === 0)
        })
      }
    );
  }
  async deleteReminder(reminderId: number) {
    return this.request(
      'delete reminder',
      'DELETE',
      `/reminders/${this.id(reminderId)}`,
      deletedSchema
    );
  }
  async listEntityFiles(params: Page & EntityFilter) {
    return this.request(
      'get entity files',
      'GET',
      '/entity-files',
      pagination(fileSchema, 'entity_files'),
      { params: { ...this.selectors(params), ...this.page(params) } }
    ).then(page => ({ entity_files: page.items, next_page_token: page.next_page_token }));
  }
  async getEntityFile(entityFileId: number) {
    return this.request(
      'get entity file',
      'GET',
      `/entity-files/${this.id(entityFileId)}`,
      fileSchema
    );
  }
  downloadEntityFileUrl(entityFileId: number) {
    return `https://api.affinity.co/entity-files/download/${this.id(entityFileId)}`;
  }
}
