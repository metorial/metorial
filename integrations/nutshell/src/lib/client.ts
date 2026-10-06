import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  isApiErrorRecord,
  pickDefined,
  requestAxiosData
} from 'slates';
import {
  invalid,
  type JsonRecord,
  malformed,
  type NutshellRecord,
  normalizeRecord,
  positiveId,
  preparePayload,
  providerId,
  type RecordType,
  revision,
  text
} from './contracts';

export interface NutshellEntityRef {
  entityType: string;
  id: number;
}
export interface FindParams {
  query?: JsonRecord;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  limit?: number;
  page?: number;
  stubResponses?: boolean;
}

export let httpError = (error: unknown, operation: string) => {
  let rawStatus = getApiErrorStatus(error);
  let status =
    typeof rawStatus === 'number' && Number.isInteger(rawStatus)
      ? rawStatus
      : typeof rawStatus === 'string' && /^\d{3}$/.test(rawStatus)
        ? Number(rawStatus)
        : undefined;
  if (status !== undefined && (status < 100 || status > 599)) status = undefined;
  return buildApiServiceError(error, {
    providerLabel: 'Nutshell',
    reason: 'nutshell_api_error',
    operation,
    extractResponse: () => ({ status }),
    extractMessage: () => {
      return status === 401 || status === 403
        ? 'Check the API key, impersonation settings, and user permissions.'
        : status === 409
          ? 'The revision changed. Read the record again before retrying.'
          : status === 404
            ? 'The record was not found.'
            : 'The request could not be confirmed. Read back before retrying a mutation.';
    },
    // A null parent falls back to the original transport error in the shared helper.
    parent: {}
  });
};

let methods: Record<RecordType, { singular: string; id: string }> = {
  Contacts: { singular: 'Contact', id: 'contactId' },
  Accounts: { singular: 'Account', id: 'accountId' },
  Leads: { singular: 'Lead', id: 'leadId' },
  Activities: { singular: 'Activity', id: 'activityId' },
  Tasks: { singular: 'Task', id: 'taskId' },
  Notes: { singular: 'Note', id: 'noteId' }
};

export class NutshellClient {
  private axios;
  private requestCounter = 0;

  constructor(credentials: { username: string; token: string }) {
    text(credentials.username, 'Nutshell username');
    text(credentials.token, 'Nutshell API key');
    if (credentials.username.includes(':') || /[\r\n]/.test(credentials.username))
      throw invalid('Use your Nutshell user email or company domain as the username.');
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://app.nutshell.com',
      timeout: 30_000,
      maxRedirects: 0,
      authHeader: {
        value: `Basic ${Buffer.from(`${credentials.username}:${credentials.token}`).toString('base64')}`
      }
    });
  }

  private async rpc(method: string, params: JsonRecord = {}): Promise<unknown> {
    let id = `req-${++this.requestCounter}-${Date.now()}`;
    let data = await requestAxiosData<unknown>(
      method,
      () => this.axios.post('/api/v1/json', { id, method, params: pickDefined(params) }),
      httpError
    );
    if (!isApiErrorRecord(data)) throw malformed();
    if (data.error !== undefined && data.error !== null) {
      let rawCode = isApiErrorRecord(data.error) ? data.error.code : undefined;
      let code =
        typeof rawCode === 'number' && Number.isSafeInteger(rawCode)
          ? rawCode
          : typeof rawCode === 'string' && /^-?\d{1,8}$/.test(rawCode)
            ? Number(rawCode)
            : undefined;
      let hint =
        code === 409
          ? 'The revision changed. Read the record again.'
          : code === 404
            ? 'The record was not found.'
            : code === 401 || code === 403
              ? 'Check API key and user permissions.'
              : 'Check the input and permissions. Read back before retrying a mutation.';
      throw createApiServiceError(
        `Nutshell ${method} failed${code === undefined ? '' : ` (code ${code})`}. ${hint}`,
        {
          reason: 'nutshell_api_error',
          upstreamCode: code === undefined ? undefined : String(code),
          upstreamStatus: code !== undefined && code >= 400 && code <= 599 ? code : undefined
        }
      );
    }
    if (data.id !== id || !Object.hasOwn(data, 'result')) throw malformed();
    return data.result;
  }

  private findParams(params: FindParams): JsonRecord {
    for (let key of ['limit', 'page'] as const)
      if (params[key] !== undefined) positiveId(params[key], key);
    if (params.stubResponses === false && (params.limit ?? 50) > 100)
      throw invalid(
        'Full-record pages support at most 100 results. Reduce limit or request stubs.'
      );
    return pickDefined({ ...params });
  }

  private async list(
    method: string,
    type: string,
    params: FindParams = {}
  ): Promise<NutshellRecord[]> {
    if (
      ['findAccounts', 'findContacts', 'findActivities'].includes(method) &&
      (params.limit ?? 50) > 100
    )
      throw invalid('This record list supports at most 100 results per page.');
    let data = await this.rpc(method, this.findParams(params));
    if (!Array.isArray(data)) throw malformed();
    return data.map(record => normalizeRecord(record, type));
  }

  async getRecord(type: RecordType, id: number): Promise<NutshellRecord> {
    let method = methods[type];
    positiveId(id);
    let record = normalizeRecord(
      await this.rpc(`get${method.singular}`, { [method.id]: id }),
      type,
      true
    );
    if (record.id !== id) throw malformed();
    return record;
  }

  private async create(type: RecordType, payload: JsonRecord): Promise<NutshellRecord> {
    let method = methods[type];
    return normalizeRecord(
      await this.rpc(`new${method.singular}`, {
        [method.singular.toLowerCase()]: preparePayload(type, payload)
      }),
      type,
      true
    );
  }

  private async edit(
    type: RecordType,
    id: number,
    rev: string,
    payload: JsonRecord
  ): Promise<NutshellRecord> {
    let method = methods[type];
    positiveId(id);
    revision(rev);
    if (!Object.keys(payload).length) throw invalid('Provide at least one field to update.');
    let record = normalizeRecord(
      await this.rpc(`edit${method.singular}`, {
        [method.id]: id,
        rev,
        [method.singular.toLowerCase()]: preparePayload(type, payload)
      }),
      type,
      true
    );
    if (record.id !== id) throw malformed();
    return record;
  }

  async deleteRecord(type: RecordType, id: number, rev: string): Promise<boolean> {
    positiveId(id);
    revision(rev, false);
    let current = await this.getRecord(type, id);
    if (current.rev !== rev)
      throw invalid('The revision changed. Read the record again before deleting it.');
    let method = methods[type];
    let result = await this.rpc(`delete${method.singular}`, { [method.id]: id, rev });
    if (result !== true)
      throw createApiServiceError(
        'Nutshell did not confirm deletion. Read the record again before retrying.',
        { reason: 'nutshell_unconfirmed_delete' }
      );
    return true;
  }

  getContact(id: number) {
    return this.getRecord('Contacts', id);
  }
  newContact(payload: JsonRecord) {
    return this.create('Contacts', payload);
  }
  editContact(id: number, rev: string, payload: JsonRecord) {
    return this.edit('Contacts', id, rev, payload);
  }
  findContacts(params: FindParams = {}) {
    return this.list('findContacts', 'Contacts', params);
  }
  getAccount(id: number) {
    return this.getRecord('Accounts', id);
  }
  newAccount(payload: JsonRecord) {
    return this.create('Accounts', payload);
  }
  editAccount(id: number, rev: string, payload: JsonRecord) {
    return this.edit('Accounts', id, rev, payload);
  }
  findAccounts(params: FindParams = {}) {
    return this.list('findAccounts', 'Accounts', params);
  }
  async getLead(id: number) {
    let record = await this.getRecord('Leads', id);
    return {
      ...record,
      status: typeof record.status === 'string' ? record.status : undefined
    };
  }
  async newLead(payload: JsonRecord) {
    let record = await this.create('Leads', {
      ...payload,
      note: typeof payload.note === 'string' ? [payload.note] : payload.note
    });
    return {
      ...record,
      status: typeof record.status === 'string' ? record.status : undefined
    };
  }
  async editLead(id: number, rev: string, payload: JsonRecord) {
    let data = { ...payload };
    if (data.status !== undefined) {
      if (![0, 1, 10, 11, 12].includes(Number(data.status)))
        throw invalid(
          'Lead status must be 0 (open), 1 (pending), 10 (won), 11 (lost), or 12 (canceled).'
        );
      if (data.status === 0 || data.status === 1) {
        data.isPending = data.status === 1;
        data.status = 0;
      } else {
        let candidates: NutshellRecord[] = [];
        let complete = false;
        for (let page = 1; page <= 20; page++) {
          let outcomes = await this.list('findLead_Outcomes', 'Lead_Outcomes', {
            limit: 100,
            page
          });
          candidates.push(...outcomes.filter(outcome => outcome.type === data.status));
          if (outcomes.length < 100) {
            complete = true;
            break;
          }
        }
        if (!complete)
          throw invalid(
            'Outcome discovery exceeded its page bound. Choose an outcome in Nutshell before retrying.'
          );
        let selected =
          data.outcomeId === undefined
            ? candidates.length === 1
              ? candidates[0]
              : undefined
            : candidates.find(
                outcome => outcome.id === positiveId(data.outcomeId, 'Outcome ID')
              );
        if (!selected)
          throw invalid(
            'Provide outcomeId matching the requested won, lost, or canceled status. Multiple configured outcomes cannot be selected automatically.'
          );
        data.outcome = {
          id: selected.id,
          entityType: 'Lead_Outcomes',
          rev: selected.rev,
          type: selected.type
        };
        data.status = undefined;
      }
    } else if (data.outcomeId !== undefined)
      throw invalid('Provide a closing status with outcomeId.');
    data.outcomeId = undefined;
    let record = await this.edit('Leads', id, rev, data);
    return {
      ...record,
      status: typeof record.status === 'string' ? record.status : undefined
    };
  }
  async findLeads(params: FindParams = {}) {
    return (
      await this.list('findLeads', 'Leads', { ...params, query: params.query ?? {} })
    ).map(record => ({
      ...record,
      status: typeof record.status === 'string' ? record.status : undefined
    }));
  }
  newActivity(payload: JsonRecord) {
    return this.create('Activities', payload);
  }
  findActivities(params: FindParams = {}) {
    return this.list('findActivities', 'Activities', { ...params, query: params.query ?? {} });
  }
  newTask(payload: JsonRecord) {
    return this.create('Tasks', payload);
  }
  async newNote(entity: NutshellEntityRef, note: string) {
    positiveId(entity.id);
    text(note, 'Note');
    return normalizeRecord(await this.rpc('newNote', { entity, note }), 'Notes', true);
  }
  findProducts(params: FindParams = {}) {
    return this.list('findProducts', 'Products', params);
  }
  findMilestones(params: FindParams = {}) {
    return this.list('findMilestones', 'Milestones', params);
  }
  findStagesets(params: FindParams = {}) {
    return this.list('findStagesets', 'Stagesets', params);
  }
  findLeadOutcomes(params: FindParams = {}) {
    return this.list('findLead_Outcomes', 'Lead_Outcomes', params);
  }
  findUsers(params: FindParams = {}) {
    return this.list('findUsers', 'Users', params);
  }
  findTeams(params: FindParams = {}) {
    return this.list('findTeams', 'Teams', params);
  }
  async getUser() {
    return normalizeRecord(await this.rpc('getUser'), 'Users', true);
  }
  async instanceData() {
    let data = await this.rpc('instanceData');
    if (!isApiErrorRecord(data)) throw malformed();
    return { id: String(providerId(data.id)) };
  }
  findSources(params: FindParams = {}) {
    return this.list('findSources', 'Sources', params);
  }
  findActivityTypes(params: FindParams = {}) {
    return this.list('findActivityTypes', 'Activity_Types', params);
  }
  private async search(
    method: string,
    type: string,
    query: string,
    limit?: number,
    page?: number
  ) {
    text(query, 'Search query');
    if (limit !== undefined) positiveId(limit, 'limit');
    if (page !== undefined && page !== 1)
      throw invalid(
        'Name search has no page parameter. Omit page or use list mode for pagination.'
      );
    let data = await this.rpc(method, pickDefined({ string: query, limit }));
    if (!Array.isArray(data)) throw malformed();
    return data.map(record => normalizeRecord(record, type));
  }
  searchProducts(query: string, limit?: number, page?: number) {
    return this.search('searchProducts', 'Products', query, limit, page);
  }
  searchSources(query: string, limit?: number, page?: number) {
    return this.search('searchSources', 'Sources', query, limit, page);
  }
  async searchUniversal(query: string) {
    text(query, 'Search query');
    let data = await this.rpc('searchUniversal', { string: query });
    if (!isApiErrorRecord(data)) throw malformed();
    return (['contacts', 'accounts', 'leads'] as const).flatMap(key => {
      if (!Array.isArray(data[key])) throw malformed();
      let type = { contacts: 'Contacts', accounts: 'Accounts', leads: 'Leads' }[key];
      return data[key].map(record => normalizeRecord(record, type));
    });
  }
  async findTimeline(entity: NutshellEntityRef, params: FindParams = {}) {
    positiveId(entity.id);
    let data = await this.rpc('findTimeline', { ...this.findParams(params), query: entity });
    if (!Array.isArray(data)) throw malformed();
    return data.map(record =>
      normalizeRecord(
        record,
        isApiErrorRecord(record) &&
          record.entityType === undefined &&
          (typeof record.note === 'string' || typeof record.noteMarkup === 'string')
          ? 'Notes'
          : undefined
      )
    );
  }
  async listCustomFields(type: 'Contacts' | 'Accounts' | 'Leads') {
    let data = await requestAxiosData<unknown>(
      'custom field discovery',
      () => this.axios.get(`/rest/${type.toLowerCase()}/customfields/attributes`),
      httpError
    );
    let fields = type === 'Accounts' && isApiErrorRecord(data) ? data.customFields : data;
    if (!Array.isArray(fields)) throw malformed();
    return fields.map(field => {
      if (!isApiErrorRecord(field) || typeof field.id !== 'string' || !field.id.trim())
        throw malformed();
      return {
        id: field.id,
        name: typeof field.name === 'string' ? field.name : undefined,
        title: typeof field.title === 'string' ? field.title : undefined,
        type: typeof field.type === 'string' ? field.type : undefined,
        isMultiple: typeof field.isMultiple === 'boolean' ? field.isMultiple : undefined,
        choices: Array.isArray(field.choices)
          ? field.choices.filter(choice => typeof choice === 'string')
          : undefined
      };
    });
  }
}
