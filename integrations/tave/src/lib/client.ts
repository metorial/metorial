import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined,
  requestAxiosData
} from 'slates';

export type TaveRecord = Record<string, unknown>;
export type TaveCollection = {
  items: TaveRecord[];
  meta: { totalItems: number; currentPage: number; totalPages: number };
};

export let textField = (record: TaveRecord, ...keys: string[]) => {
  for (let key of keys) {
    if (typeof record[key] === 'string') return record[key];
  }
  return undefined;
};

export let numberField = (record: TaveRecord, ...keys: string[]) => {
  for (let key of keys) {
    if (typeof record[key] === 'number') return record[key];
  }
  return undefined;
};

export let contactKind = (value: string) => {
  let aliases: Record<string, string> = { individual: 'person', business: 'company' };
  let kind = aliases[value] ?? value;
  if (!['person', 'company', 'location', 'employee'].includes(kind)) {
    throw createApiServiceError(
      'Contact kind must be person, company, location, employee, individual, or business.'
    );
  }
  return kind;
};

export let phoneValue = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (isApiErrorRecord(value)) return textField(value, 'e164', 'formatted', 'telUri');
  return undefined;
};

let taveError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'Tave',
    reason: 'tave_api_error',
    operation,
    extractResponse: (error, helpers) => {
      let response = helpers.getResponse(error);
      if (helpers.isRecord(error) && helpers.isRecord(error.data)) {
        let baggage = error.data.baggage;
        if (helpers.isRecord(baggage)) return { ...response, data: baggage.response };
      }
      return response;
    },
    extractMessage: (error, helpers) => {
      let body: unknown = helpers.getResponse(error)?.data;
      if (helpers.isRecord(error) && helpers.isRecord(error.data)) {
        let baggage = error.data.baggage;
        if (helpers.isRecord(baggage)) body = baggage.response;
      }
      if (!helpers.isRecord(body)) return undefined;
      let parts = [body.title, body.detail].filter(
        (value): value is string => typeof value === 'string' && value.length > 0
      );
      if (helpers.isRecord(body.detail)) {
        for (let [field, value] of Object.entries(body.detail)) {
          let details: string[] = [];
          helpers.collectDetails(value, details);
          if (details.length) parts.push(`${field}: ${details.join(', ')}`);
        }
      }
      return parts.length ? parts.join(' - ') : undefined;
    },
    extractUpstreamCode: (error, response, helpers) => {
      if (helpers.isRecord(response?.data) && typeof response.data.type === 'string')
        return response.data.type;
      if (helpers.isRecord(error) && helpers.isRecord(error.data)) {
        let upstream = error.data.upstream;
        if (helpers.isRecord(upstream) && typeof upstream.code === 'string')
          return upstream.code;
      }
      return undefined;
    }
  });

export let pagination = (params?: { page?: number; perPage?: number }, minimum = 10) => {
  let page = params?.page ?? 1;
  let perPage = params?.perPage ?? 100;
  if (!Number.isInteger(page) || page < 1)
    throw createApiServiceError('Page must be a whole number of at least 1.');
  if (!Number.isInteger(perPage) || perPage < minimum || perPage > 100) {
    throw createApiServiceError(
      `Results per page must be a whole number from ${minimum} to 100.`
    );
  }
  return { page, pageSize: perPage };
};

let collectionItems = (value: unknown): TaveRecord[] => {
  if (!isApiErrorRecord(value) || !Array.isArray(value.items))
    throw createApiServiceError('Tave returned an invalid collection response.');
  let items = value.items;
  if (!items.every(isApiErrorRecord))
    throw createApiServiceError('Tave returned an invalid record in a collection.');
  return items;
};

let collection = (value: TaveRecord, path: string, requestedPage: number): TaveCollection => {
  let items = collectionItems(value);
  let meta = isApiErrorRecord(value.meta) ? value.meta : {};
  let totalItems = numberField(meta, 'totalItems');
  let currentPage = numberField(meta, 'currentPage');
  let totalPages = numberField(meta, 'totalPages');
  if (
    typeof totalItems !== 'number' ||
    !Number.isSafeInteger(totalItems) ||
    totalItems < 0 ||
    typeof currentPage !== 'number' ||
    !Number.isSafeInteger(currentPage) ||
    currentPage !== requestedPage ||
    typeof totalPages !== 'number' ||
    !Number.isSafeInteger(totalPages) ||
    totalPages < 0 ||
    (totalItems > 0 && totalPages === 0) ||
    items.length > totalItems
  ) {
    throw createApiServiceError(
      `Tave returned missing or invalid pagination metadata for ${path}. Retry the request; a complete result set cannot be confirmed.`
    );
  }
  return {
    items,
    meta: { totalItems, currentPage, totalPages }
  };
};

let paginateItems = (items: TaveRecord[], params?: { page?: number; perPage?: number }) => {
  let { page, pageSize } = pagination(params, 1);
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    meta: {
      totalItems: items.length,
      currentPage: page,
      totalPages: Math.ceil(items.length / pageSize)
    }
  };
};

type NamedResource = '/brand' | '/job-type' | '/job-role' | '/event-type' | '/lead-source';
type ListParams = { page?: number; perPage?: number };

export class TavePublicClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(auth: { token: string; secretKey?: string }) {
    if (!auth.token || auth.secretKey)
      throw createApiServiceError(
        'This tool requires the API Key (Public API V2) authentication method.'
      );
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://workspace.vsco.co/api/v2',
      authHeader: { name: 'X-API-KEY', value: auth.token },
      headers: { Accept: 'application/json' },
      timeout: 30000
    });
  }

  private async get(path: string, params?: TaveRecord): Promise<TaveRecord> {
    let result = await requestAxiosData<unknown>(
      `GET ${path}`,
      () => this.axios.get(path, { params: pickDefined(params ?? {}) }),
      taveError
    );
    if (!isApiErrorRecord(result))
      throw createApiServiceError('Tave returned an invalid resource response.');
    return result;
  }

  private async post(path: string, data: TaveRecord): Promise<TaveRecord> {
    let result = await requestAxiosData<unknown>(
      `POST ${path}`,
      () => this.axios.post(path, data),
      taveError
    );
    if (!isApiErrorRecord(result) || !textField(result, 'id')) {
      throw createApiServiceError(
        'Tave returned a creation response without a resource ID. Check the account before retrying.'
      );
    }
    return result;
  }

  private async list(path: string, params: TaveRecord = {}) {
    return collection(await this.get(path, params), path, numberField(params, 'page') ?? 1);
  }

  private async listAll(path: string, params: TaveRecord = {}) {
    let items: TaveRecord[] = [];
    for (let page = 1; ; page++) {
      let result = await this.list(path, { ...params, page, pageSize: 100 });
      items.push(...result.items);
      if (page >= result.meta.totalPages) {
        if (items.length !== result.meta.totalItems) {
          throw createApiServiceError(
            `Tave returned an incomplete collection for ${path}. Retry the request; the received records do not match the reported total.`
          );
        }
        return items;
      }
      if (result.items.length === 0) {
        throw createApiServiceError(
          `Tave returned an empty page before the end of ${path}. Retry the request; a complete result set cannot be confirmed.`
        );
      }
    }
  }

  async resolveNamedId(path: NamedResource, value: string, label: string) {
    let records = await this.listAll(path, { includeHidden: true });
    let exactId = records.find(record => record.id === value);
    if (exactId) return String(exactId.id);
    let matches = records.filter(
      record => record.name === value || (path === '/brand' && record.alias === value)
    );
    let match = matches[0];
    if (matches.length !== 1 || !match || !textField(match, 'id')) {
      throw createApiServiceError(
        matches.length > 1
          ? `${label} "${value}" is ambiguous. Use its resource ID.`
          : `${label} "${value}" was not found in this Tave account. Use an exact configured name or resource ID.`
      );
    }
    return String(match.id);
  }

  async customFields(values: Record<string, string>, appliesTo: 'Contact' | 'Job') {
    let fields = collectionItems(
      await this.get('/custom-field', { canApplyTo: appliesTo.toLowerCase() })
    );
    return Object.entries(values).map(([key, value]) => {
      let candidates = fields.filter(field => field.canApplyTo === appliesTo);
      let matches = candidates.filter(field => field.id === key);
      if (!matches.length)
        matches = candidates.filter(field => field.name === key || field.token === key);
      let match = matches[0];
      if (matches.length !== 1 || !match || !textField(match, 'id'))
        throw createApiServiceError(
          `Custom field "${key}" must identify exactly one ${appliesTo.toLowerCase()} field by ID, name, or token.`
        );
      return { fieldId: String(match.id), value };
    });
  }

  async listContacts(
    params?: ListParams & { contactKind?: string; brand?: string; query?: string }
  ) {
    let kind = params?.contactKind ? contactKind(params.contactKind) : undefined;
    let brandId = params?.brand
      ? await this.resolveNamedId('/brand', params.brand, 'Brand')
      : undefined;
    pagination(params, params?.query || kind || brandId ? 1 : 10);
    let items: TaveRecord[];
    if (params?.query) {
      if (!params.query.trim()) throw createApiServiceError('Search query must not be blank.');
      let hits = await this.listAll('/search', { q: params.query, scope: 'contact' });
      items = [];
      for (let hit of hits) {
        let id = textField(hit, 'id');
        if (!id)
          throw createApiServiceError('Tave returned a search result without a contact ID.');
        items.push(await this.getContact(id));
      }
    } else if (kind || brandId) {
      items = await this.listAll('/address-book');
    } else {
      return this.list('/address-book', pagination(params));
    }
    return paginateItems(
      items.filter(
        item => (!kind || item.kind === kind) && (!brandId || item.brandId === brandId)
      ),
      params
    );
  }

  getContact(contactId: string) {
    return this.get(`/address-book/${encodeURIComponent(contactId)}`);
  }
  createContact(data: TaveRecord) {
    return this.post('/address-book', data);
  }
  listJobs(params?: ListParams & { includeClosed?: boolean; externalMappingId?: string }) {
    return this.list('/job', {
      ...pagination(params),
      includeClosed: params?.includeClosed,
      externalMappingId: params?.externalMappingId
    });
  }
  getJob(jobId: string) {
    return this.get(`/job/${encodeURIComponent(jobId)}`);
  }
  createJob(data: TaveRecord) {
    return this.post('/job', data);
  }
  createJobContact(data: TaveRecord) {
    return this.post('/job-contact', data);
  }
  createEvent(data: TaveRecord) {
    return this.post('/event', data);
  }

  private async listFinancial(
    path: '/order' | '/payment',
    params?: ListParams & { brand?: string; jobType?: string }
  ) {
    pagination(params, params?.brand || params?.jobType ? 1 : 10);
    if (!params?.brand && !params?.jobType) return this.list(path, pagination(params));
    let brandId = params.brand
      ? await this.resolveNamedId('/brand', params.brand, 'Brand')
      : undefined;
    let jobTypeId = params.jobType
      ? await this.resolveNamedId('/job-type', params.jobType, 'Job type')
      : undefined;
    let jobs = await this.listAll('/job', { includeClosed: true });
    let matchingIds = new Set(
      jobs
        .filter(
          job =>
            (!brandId || job.brandId === brandId) &&
            (!jobTypeId || job.jobTypeId === jobTypeId)
        )
        .map(job => job.id)
    );
    let items = await this.listAll(path);
    return paginateItems(
      items.filter(item => matchingIds.has(item.jobId)),
      params
    );
  }

  listOrders(params?: ListParams & { brand?: string; jobType?: string }) {
    return this.listFinancial('/order', params);
  }
  listPayments(params?: ListParams & { brand?: string; jobType?: string }) {
    return this.listFinancial('/payment', params);
  }
  listBrands() {
    return this.listAll('/brand');
  }
  listJobTypes(params?: ListParams & { includeHidden?: boolean; externalMappingId?: string }) {
    return this.list('/job-type', {
      ...pagination(params),
      includeHidden: params?.includeHidden,
      externalMappingId: params?.externalMappingId
    });
  }
  getStudio() {
    return this.get('/studio/me');
  }
}

export class TaveLeadClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(
    private secretKey: string,
    private studioId: string
  ) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://workspace.vsco.co/webservice',
      contentType: 'application/x-www-form-urlencoded',
      timeout: 30000
    });
  }

  async createLead(data: Record<string, string>, suppressEmailNotification?: boolean) {
    let response = await requestAxiosData<unknown>(
      'create lead',
      () =>
        this.axios.post(
          `/create-lead/${encodeURIComponent(this.studioId)}`,
          new URLSearchParams({ ...data, SecretKey: this.secretKey }).toString(),
          {
            headers: suppressEmailNotification
              ? { 'X-Tave-No-Email-Notification': 'true' }
              : {}
          }
        ),
      taveError
    );
    if (typeof response !== 'string' || response.trim() !== 'OK') {
      throw createApiServiceError(
        'Tave did not confirm that the lead was created. Check the account before retrying.'
      );
    }
    return response;
  }
}
