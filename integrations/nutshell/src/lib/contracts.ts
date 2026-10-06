import { createApiServiceError, isApiErrorRecord, pickDefined } from 'slates';

export type RecordType = 'Contacts' | 'Accounts' | 'Leads' | 'Activities' | 'Tasks' | 'Notes';
export type JsonRecord = Record<string, unknown>;
export interface NutshellRecord extends JsonRecord {
  id: number;
  rev: string;
  entityType: string;
  name: string;
  description?: string;
  title?: string;
  email?: unknown[];
  phone?: unknown[];
  url?: unknown[];
  accounts?: JsonRecord[];
  contacts?: JsonRecord[];
  leads?: JsonRecord[];
  products?: JsonRecord[];
  competitors?: JsonRecord[];
  sources?: JsonRecord[];
  customFields?: JsonRecord;
  createdTime?: string;
  modifiedTime?: string;
  dueTime?: string;
  confidence?: number;
  status?: number | string;
  value?: JsonRecord;
  milestone?: JsonRecord;
  assignee?: JsonRecord | JsonRecord[];
  outcome?: JsonRecord;
  stagesetId?: number;
  type?: number;
}

export let invalid = (message: string) =>
  createApiServiceError(message, { reason: 'nutshell_invalid_input' });
export let malformed = () =>
  createApiServiceError(
    'Nutshell returned an unexpected response. Read the record again before retrying a mutation.',
    { reason: 'nutshell_invalid_response' }
  );
export let positiveId = (value: unknown, field = 'Record ID'): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0)
    throw invalid(
      `${field} must be a positive safe integer. Use API IDs, not the displayed lead number.`
    );
  return value;
};
export let providerId = (value: unknown): number => {
  let number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isSafeInteger(number) || number <= 0)
    throw malformed();
  return number;
};
export let revision = (value: unknown, allowIgnore = true): string => {
  if (typeof value !== 'string' || !value.trim() || (!allowIgnore && value === 'REV_IGNORE'))
    throw invalid(
      'Provide the exact current revision from a record read. Revision bypass is not allowed for deletion.'
    );
  return value;
};
export let text = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw invalid(`${field} must not be empty.`);
  return value;
};
export let dateTime = (value: unknown, field: string) => {
  if (value === undefined) return;
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:?\d\d)$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    throw invalid(`${field} must be an ISO 8601 timestamp with a timezone.`);
};
export let displayName = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (!isApiErrorRecord(value)) return '';
  if (typeof value.displayName === 'string') return value.displayName;
  return [value.givenName, value.familyName].filter(v => typeof v === 'string').join(' ');
};
let strings = (source: JsonRecord, keys: readonly string[]) =>
  Object.fromEntries(
    keys.flatMap(key => (typeof source[key] === 'string' ? [[key, source[key]]] : []))
  );
let numbers = (source: JsonRecord, keys: readonly string[]) =>
  Object.fromEntries(
    keys.flatMap(key =>
      typeof source[key] === 'number' && Number.isFinite(source[key])
        ? [[key, source[key]]]
        : []
    )
  );
let money = (value: unknown): JsonRecord | undefined => {
  if (!isApiErrorRecord(value)) return;
  return pickDefined({
    ...strings(value, ['currency', 'currency_shortname']),
    amount:
      typeof value.amount === 'string' ||
      (typeof value.amount === 'number' && Number.isFinite(value.amount))
        ? value.amount
        : undefined
  });
};
export let reference = (value: unknown): JsonRecord | undefined => {
  if (!isApiErrorRecord(value)) return;
  return pickDefined({
    id: value.id === undefined ? undefined : providerId(value.id),
    entityType: typeof value.entityType === 'string' ? value.entityType : undefined,
    name: value.name === undefined ? undefined : displayName(value.name),
    rev:
      typeof value.rev === 'string' || typeof value.rev === 'number'
        ? String(value.rev)
        : undefined,
    ...strings(value, ['description', 'relationship', 'title', 'sku', 'unit']),
    ...numbers(value, ['quantity', 'status', 'type', 'position']),
    price: money(value.price)
  });
};
let refs = (value: unknown): JsonRecord[] | undefined =>
  Array.isArray(value)
    ? value.flatMap(item => {
        let ref = reference(item);
        return ref ? [ref] : [];
      })
    : undefined;

// Nutshell dictionaries duplicate their primary entry under --primary.
export let multiValues = (
  value: unknown,
  kind: 'email' | 'phone' | 'url' | 'address'
): unknown[] | undefined => {
  if (value === undefined || value === null) return;
  let values = Array.isArray(value)
    ? value
    : isApiErrorRecord(value)
      ? Object.entries(value)
          .filter(([key]) => key !== '--primary')
          .map(([, item]) => item)
      : [value];
  return values.flatMap<unknown>(item => {
    if (typeof item === 'string') return [item];
    if (!isApiErrorRecord(item)) return [];
    let allowed =
      kind === 'phone'
        ? ['countryCode', 'number', 'extension']
        : kind === 'address'
          ? [
              'name',
              'address_1',
              'address_2',
              'address_3',
              'city',
              'state',
              'postalCode',
              'country',
              'timezone'
            ]
          : ['value', 'address', 'email', 'url', 'name'];
    return [strings(item, allowed)];
  });
};
export let leadStatus = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return;
  let states: Record<string, string> = {
    '0': 'open',
    '1': 'pending',
    '10': 'won',
    '11': 'lost',
    '12': 'canceled'
  };
  let status = states[String(value)];
  if (!status) throw malformed();
  return status;
};
export let normalizeRecord = (
  value: unknown,
  expectedType?: string,
  requireRevision = false
): NutshellRecord => {
  if (!isApiErrorRecord(value)) throw malformed();
  let id = providerId(value.id);
  let entityType = typeof value.entityType === 'string' ? value.entityType : expectedType;
  if (!entityType || (expectedType && entityType !== expectedType)) throw malformed();
  let rev =
    typeof value.rev === 'string' ||
    (typeof value.rev === 'number' && Number.isSafeInteger(value.rev))
      ? String(value.rev)
      : '';
  if (requireRevision && !rev.trim()) throw malformed();
  // Avatar URLs can contain authentication. Project CRM fields instead of
  // passing file URIs, passwords, or other transport metadata through.
  let record: NutshellRecord = {
    id,
    rev,
    entityType,
    name: displayName(value.name ?? value.title),
    ...strings(value, [
      'description',
      'title',
      'createdTime',
      'modifiedTime',
      'deletedTime',
      'closedTime',
      'dueTime',
      'startTime',
      'endTime',
      'completedTime',
      'date',
      'note',
      'noteMarkup',
      'subject',
      'primaryAccountName',
      'primaryContactName'
    ]),
    ...numbers(value, ['confidence', 'completion', 'type']),
    stagesetId: value.stagesetId === undefined ? undefined : providerId(value.stagesetId),
    email: multiValues(value.emails ?? value.email, 'email'),
    phone: multiValues(value.phone, 'phone'),
    url: multiValues(value.url, 'url'),
    address: multiValues(value.address, 'address'),
    accounts: refs(value.accounts),
    contacts: refs(value.contacts),
    leads: refs(value.leads),
    products: refs(value.products),
    competitors: refs(value.competitors),
    sources: refs(value.sources),
    participants: refs(value.participants),
    entity: Array.isArray(value.entity) ? refs(value.entity) : reference(value.entity),
    owner: reference(value.owner),
    assignee: Array.isArray(value.assignee) ? refs(value.assignee) : reference(value.assignee),
    industry: reference(value.industry),
    milestone: reference(value.milestone),
    stageset: reference(value.stageset),
    outcome: reference(value.outcome),
    activityType: reference(value.activityType),
    creator: reference(value.creator),
    user: reference(value.user),
    lead: reference(value.lead),
    account: reference(value.account),
    contact: reference(value.contact),
    customFields: isApiErrorRecord(value.customFields) ? value.customFields : undefined,
    value: money(value.value),
    status:
      entityType === 'Leads'
        ? leadStatus(value.status)
        : typeof value.status === 'number'
          ? value.status
          : undefined
  };
  if (typeof value.jobTitle === 'string') record.title = value.jobTitle;
  else if (
    isApiErrorRecord(value.customFields) &&
    typeof value.customFields['Job Title'] === 'string'
  )
    record.title = value.customFields['Job Title'];
  if (typeof value.isEnabled === 'boolean') record.isEnabled = value.isEnabled;
  if (typeof value.isAdministrator === 'boolean')
    record.isAdministrator = value.isAdministrator;
  if (isApiErrorRecord(value.logNote))
    record.logNote = normalizeRecord(value.logNote, 'Notes');
  if (Array.isArray(value.notes))
    record.notes = value.notes.map(note => normalizeRecord(note, 'Notes'));
  return { ...pickDefined(record), id, rev, entityType, name: record.name };
};
export let preparePayload = (type: RecordType, payload: JsonRecord): JsonRecord => {
  let result = { ...payload };
  for (let field of ['dueTime', 'startTime', 'endTime']) dateTime(result[field], field);
  for (let field of ['industryId', 'activityTypeId', 'milestoneId'])
    if (result[field] !== undefined) positiveId(result[field], field);
  for (let field of ['owner', 'assignee', 'entity', 'milestone'])
    if (isApiErrorRecord(result[field])) positiveId(result[field].id, field);
  for (let field of ['accounts', 'contacts', 'leads', 'participants'])
    if (Array.isArray(result[field]))
      for (let ref of result[field]) {
        if (!isApiErrorRecord(ref)) throw invalid(`Invalid ${field} reference.`);
        positiveId(ref.id, field);
      }
  if (
    result.confidence !== undefined &&
    (typeof result.confidence !== 'number' ||
      !Number.isFinite(result.confidence) ||
      result.confidence < 0 ||
      result.confidence > 100)
  )
    throw invalid('Confidence must be between 0 and 100.');
  if (isApiErrorRecord(result.value)) {
    if (typeof result.value.amount !== 'number' || !Number.isFinite(result.value.amount))
      throw invalid('Value amount must be finite.');
    if (
      result.value.currency !== undefined &&
      (typeof result.value.currency !== 'string' || !/^[A-Z]{3}$/.test(result.value.currency))
    )
      throw invalid('Use a three-letter uppercase currency code.');
  }
  if ((type === 'Contacts' || type === 'Accounts') && isApiErrorRecord(result.address)) {
    let { address1, address2, ...rest } = result.address;
    result.address = [pickDefined({ ...rest, address_1: address1, address_2: address2 })];
  }
  if (type === 'Contacts' && result.title !== undefined) {
    let fields = isApiErrorRecord(result.customFields) ? result.customFields : {};
    if (fields['Job Title'] !== undefined && fields['Job Title'] !== result.title)
      throw invalid('Title and the Job Title custom field must agree.');
    result.customFields = { ...fields, 'Job Title': result.title };
    result.title = undefined;
  }
  if (type === 'Leads' && isApiErrorRecord(result.milestone)) {
    result.milestoneId = result.milestone.id;
    result.milestone = undefined;
  }
  if (type === 'Activities') {
    if (result.status !== undefined && result.status !== 0 && result.status !== 1)
      throw invalid('New activities support status 0 (scheduled) or 1 (logged).');
    if (isApiErrorRecord(result.lead)) {
      positiveId(result.lead.id, 'Lead ID');
      result.leads = [result.lead];
      result.lead = undefined;
    }
    if (result.note !== undefined) {
      result.logNote = { note: result.note };
      result.note = undefined;
    }
    if (
      typeof result.startTime === 'string' &&
      typeof result.endTime === 'string' &&
      Date.parse(result.endTime) < Date.parse(result.startTime)
    )
      throw invalid('Activity end time must not precede start time.');
  }
  if (type === 'Tasks') {
    text(result.title ?? result.description, 'Task title');
    result.title ??= result.description;
    if (Array.isArray(result.leads)) {
      if (result.leads.length > 1)
        throw invalid('A task accepts one related entity. Provide at most one lead ID.');
      if (result.leads.length) result.entity = result.leads[0];
      result.leads = undefined;
    }
  }
  return result;
};
