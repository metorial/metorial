import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

type ProviderRecord = Record<string, unknown>;
type Query = Record<string, string | number | undefined>;

export interface EveniumEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  creationDate?: string;
  status?: string;
  url?: string;
  raw: ProviderRecord;
}

export interface EveniumContact {
  id: string;
  customId?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  email?: string;
  company?: string;
  raw: ProviderRecord;
}

export interface EveniumGuest {
  contactId: string;
  eventId: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  email?: string;
  company?: string;
  lastUpdate?: string;
  status?: string;
  categoryLabel?: string;
  raw: ProviderRecord;
}

export interface Page<T> {
  items: T[];
  totalCount: string;
  more?: boolean;
  firstResult?: string;
  maxResults?: string;
  next?: string;
  raw: unknown;
}

export interface CreateContactParams {
  customId?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  email?: string;
  company?: string;
  fields?: Array<{ name: string; value: string }>;
}

export interface GuestParams extends CreateContactParams {
  contactId?: string;
  status?: string;
  lastUpdate?: string;
  category?: { id: string };
}

let scalar = (value: unknown): string | undefined =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;

let required = (value: unknown, label: string): string => {
  let result = scalar(value);
  if (!result) {
    throw createApiServiceError(`Evenium returned a response without ${label}.`, {
      reason: 'evenium_invalid_response'
    });
  }
  return result;
};

let record = (value: unknown): ProviderRecord => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError('Evenium returned an unexpected response format.', {
      reason: 'evenium_invalid_response'
    });
  }
  return value;
};

let unwrap = (value: unknown, keys: string[]): ProviderRecord => {
  let data = record(value);
  for (let key of keys) {
    if (isApiErrorRecord(data[key])) return data[key];
    if (Array.isArray(data[key]) && data[key].length === 1) return record(data[key][0]);
  }
  return data;
};

export let mapEvent = (raw: ProviderRecord): EveniumEvent => ({
  id: required(raw.id, 'an event ID'),
  title: required(raw.title, 'an event title'),
  description: scalar(raw.description),
  startDate: required(raw.startDate, 'an event start date'),
  endDate: scalar(raw.endDate),
  creationDate: scalar(raw.creationDate),
  status: scalar(raw.status),
  url: scalar(raw.url),
  raw
});

export let mapContact = (raw: ProviderRecord): EveniumContact => ({
  id: required(raw.id, 'a contact ID'),
  customId: scalar(raw.customId),
  firstName: scalar(raw.firstName),
  lastName: scalar(raw.lastName),
  gender: scalar(raw.gender),
  email: scalar(raw.email),
  company: scalar(raw.company),
  raw
});

export let mapGuest = (
  raw: ProviderRecord,
  eventId?: string,
  contactId?: string
): EveniumGuest => ({
  contactId: required(raw.contactId ?? contactId, 'a participant contact ID'),
  eventId: required(raw.eventId ?? eventId, 'a participant event ID'),
  firstName: scalar(raw.firstName),
  lastName: scalar(raw.lastName),
  gender: scalar(raw.gender),
  email: scalar(raw.email),
  company: scalar(raw.company),
  lastUpdate: scalar(raw.lastUpdate),
  status: scalar(raw.status),
  categoryLabel:
    scalar(raw.categoryLabel) ??
    (isApiErrorRecord(raw.category) ? scalar(raw.category.label) : undefined),
  raw
});

let page = <T>(data: unknown, keys: string[], map: (item: ProviderRecord) => T): Page<T> => {
  let envelope = Array.isArray(data) ? {} : record(data);
  let values: unknown = Array.isArray(data) ? data : undefined;
  for (let key of keys) {
    if (envelope[key] !== undefined && envelope[key] !== null) {
      values = envelope[key];
      break;
    }
  }
  let entries =
    values === undefined || values === null ? [] : Array.isArray(values) ? values : [values];
  return {
    items: entries.map(item => map(record(item))),
    totalCount: scalar(envelope.nbrResults) ?? String(entries.length),
    more:
      typeof envelope.more === 'boolean'
        ? envelope.more
        : envelope.more === 'true'
          ? true
          : envelope.more === 'false'
            ? false
            : undefined,
    firstResult: scalar(envelope.firstResult),
    maxResults: scalar(envelope.maxResults),
    next: scalar(envelope.next),
    raw: data
  };
};

let validatePage = (params: Query) => {
  for (let key of ['firstResult', 'maxResults']) {
    let value = params[key];
    if (
      value !== undefined &&
      (typeof value !== 'number' || !Number.isInteger(value) || value < 0)
    ) {
      throw createApiServiceError(`${key} must be a non-negative integer.`, {
        reason: 'evenium_invalid_pagination'
      });
    }
  }
};

let pathId = (value: string) => {
  if (!value.trim()) throw createApiServiceError('A non-empty resource ID is required.');
  return encodeURIComponent(value);
};

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(token: string) {
    if (!token.trim()) throw createApiServiceError('An Evenium API key is required.');
    this.http = createAuthenticatedAxios({
      baseURL: 'https://secure.evenium.com/api',
      authHeader: { name: 'X-Evenium-Token', value: token },
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Evenium',
          reason: 'evenium_api_error',
          extractResponse: (source, helpers) => helpers.getResponseWithBody(source),
          extractMessage: (source, helpers) => {
            let body = helpers.getResponseWithBody(source)?.data;
            let details: string[] = [];
            helpers.collectDetails(body, details, {
              detailKeys: ['message', 'detail', 'details', 'error', 'code'],
              nestedKeys: ['errors', 'messages']
            });
            return details.length ? details.join(' - ') : undefined;
          },
          extractUpstreamCode: (_source, response) =>
            isApiErrorRecord(response?.data) ? scalar(response.data.code) : undefined
        })
    });
  }

  async listEvents(params: Query = {}) {
    validatePage(params);
    let { data } = await this.http.get('/1/events', { params: pickDefined(params) });
    let result = page(data, ['events', 'event'], mapEvent);
    return { ...result, events: result.items };
  }

  async getEvent(eventId: string): Promise<EveniumEvent> {
    let { data } = await this.http.get(`/1/events/${pathId(eventId)}`);
    return mapEvent(unwrap(data, ['events', 'event']));
  }

  async createEvent(params: {
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    location?: { name?: string; street?: string; city?: string; countryCode?: string };
    moduleConfigs?: string[];
  }): Promise<EveniumEvent> {
    let { data } = await this.http.post('/2/member/events', pickDefined(params));
    return mapEvent(unwrap(data, ['events', 'event']));
  }

  async listGuests(eventId: string, params: Query = {}) {
    validatePage(params);
    let { data } = await this.http.get(`/1/events/${pathId(eventId)}/guests`, {
      params: pickDefined(params)
    });
    let result = page(data, ['guests', 'guest'], item => mapGuest(item, eventId));
    return { ...result, guests: result.items };
  }

  async getGuest(
    eventId: string,
    contactId: string,
    fields?: string[]
  ): Promise<EveniumGuest> {
    let { data } = await this.http.get(
      `/1/events/${pathId(eventId)}/guests/${pathId(contactId)}`,
      {
        params: pickDefined({ fields: fields?.join(',') })
      }
    );
    return mapGuest(unwrap(data, ['guests', 'guest']), eventId, contactId);
  }

  async addGuest(eventId: string, params: GuestParams): Promise<EveniumGuest> {
    let { data } = await this.http.post(
      `/1/events/${pathId(eventId)}/guests`,
      pickDefined(params)
    );
    return mapGuest(unwrap(data, ['guests', 'guest']), eventId, params.contactId);
  }

  async updateGuest(
    eventId: string,
    contactId: string,
    params: GuestParams
  ): Promise<EveniumGuest> {
    let { data } = await this.http.put(
      `/1/events/${pathId(eventId)}/guests/${pathId(contactId)}`,
      pickDefined(params)
    );
    if (!data) return this.getGuest(eventId, contactId);
    return mapGuest(unwrap(data, ['guests', 'guest']), eventId, contactId);
  }

  async updateGuestStatus(eventId: string, contactId: string, status: string) {
    let { data } = await this.http.put(
      `/1/events/${pathId(eventId)}/guests/${pathId(contactId)}/status`,
      new URLSearchParams({ status }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    let raw = isApiErrorRecord(data) ? data : {};
    return { status: scalar(raw.status) ?? status, raw: data ?? null };
  }

  async listContacts(params: Query = {}) {
    validatePage(params);
    let { data } = await this.http.get('/1/contacts', { params: pickDefined(params) });
    let result = page(data, ['contacts', 'contact'], mapContact);
    return { ...result, contacts: result.items };
  }

  async getContact(contactId: string): Promise<EveniumContact> {
    let { data } = await this.http.get(`/1/contacts/${pathId(contactId)}`);
    return mapContact(unwrap(data, ['contacts', 'contact']));
  }

  async createContact(params: CreateContactParams): Promise<EveniumContact> {
    let { data } = await this.http.post('/1/contacts', pickDefined(params));
    return mapContact(unwrap(data, ['contacts', 'contact']));
  }

  async updateContact(
    contactId: string,
    params: CreateContactParams
  ): Promise<EveniumContact> {
    let { data } = await this.http.put(
      `/1/contacts/${pathId(contactId)}`,
      pickDefined(params)
    );
    if (!data) return this.getContact(contactId);
    return mapContact(unwrap(data, ['contacts', 'contact']));
  }

  async getContactEvents(contactId: string, params: Query = {}) {
    let { data } = await this.http.get(`/1/contacts/${pathId(contactId)}/events`, {
      params: pickDefined(params)
    });
    return page(data, ['events', 'event'], mapEvent);
  }

  async listEventParts(eventId: string, params: Query = {}) {
    validatePage(params);
    let { data } = await this.http.get(`/1/events/${pathId(eventId)}/eventParts`, {
      params: pickDefined(params)
    });
    return page(data, ['eventParts', 'eventPart'], item => ({
      id: required(item.id, 'a session ID'),
      eventId: scalar(item.eventId) ?? eventId,
      title: scalar(item.title),
      startDate: scalar(item.startDate),
      endDate: scalar(item.endDate),
      lastUpdate: scalar(item.lastUpdate),
      raw: item
    }));
  }
}
