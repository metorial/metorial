import { pickDefined } from 'slates';
import {
  type DisqualifiedOfficerType,
  DOCUMENT_API_BASE_URL,
  PSC_RESOURCE_DISCRIMINATORS,
  PUBLIC_DATA_BASE_URL
} from './constants';
import { companiesHouseValidationError } from './errors';
import type {
  AdvancedCompanySearchEnvelope,
  MappedAddress,
  MappedCharge,
  MappedCompany,
  MappedCompanyAccounts,
  MappedCompanyOfficer,
  MappedCompanyOfficerList,
  MappedCompanyProfile,
  MappedCompanySearchItem,
  MappedConfirmationStatement,
  MappedDatedRecord,
  MappedDisqualifiedOfficer,
  MappedDisqualifiedOfficerSearchItem,
  MappedDocumentMetadata,
  MappedDocumentResource,
  MappedFiling,
  MappedOfficer,
  MappedOfficerAppointment,
  MappedOfficerAppointmentList,
  MappedOfficerSearchItem,
  MappedPage,
  MappedPreviousCompanyName,
  MappedPsc,
  ProviderEnvelope,
  ProviderRecord,
  PublishedDateOfBirth
} from './types';

let asRecord = (value: unknown): ProviderRecord | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as ProviderRecord)
    : undefined;

let stringValue = (value: unknown) =>
  typeof value === 'string' && value.length > 0 ? value : undefined;
let numberValue = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
let booleanValue = (value: unknown) => (typeof value === 'boolean' ? value : undefined);
let stringArray = (value: unknown) =>
  Array.isArray(value) && value.every(item => typeof item === 'string')
    ? (value as string[])
    : undefined;

let nonNegativeInteger = (value: unknown) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;

let requiredNonNegativeInteger = (record: ProviderRecord, key: string, label: string) => {
  let value = nonNegativeInteger(record[key]);
  if (value !== undefined) return value;
  throw companiesHouseValidationError(
    `Companies House returned a ${label} response without a valid ${key} value.`,
    'companies_house_response_invalid'
  );
};

let mapPublishedDateOfBirth = (value: unknown): PublishedDateOfBirth | undefined => {
  let text = stringValue(value);
  if (text) return text;
  let record = asRecord(value);
  if (!record) return undefined;
  return [record.day, record.month, record.year].some(
    part => typeof part === 'number' && Number.isInteger(part)
  )
    ? (record as PublishedDateOfBirth)
    : undefined;
};

let decodePathSegment = (value: string | undefined) => {
  if (!value) return undefined;
  try {
    let decoded = decodeURIComponent(value);
    return decoded.length > 0 ? decoded : undefined;
  } catch {
    return undefined;
  }
};

let linkPath = (value: unknown, baseUrl: string) => {
  if (typeof value !== 'string' || value.trim().length === 0) return undefined;
  let trimmed = value.trim();
  let absolute = /^[a-z][a-z\d+.-]*:/i.test(trimmed);

  try {
    let url = new URL(trimmed, baseUrl);
    if (
      url.origin !== new URL(baseUrl).origin ||
      url.search.length > 0 ||
      url.hash.length > 0 ||
      url.username.length > 0 ||
      url.password.length > 0 ||
      (!absolute && !trimmed.startsWith('/'))
    ) {
      return undefined;
    }
    return url.pathname;
  } catch {
    return undefined;
  }
};

export const parseOfficerIdFromLink = (value: unknown) => {
  let path = linkPath(value, PUBLIC_DATA_BASE_URL);
  let match = path?.match(/^\/officers\/([^/]+)\/appointments$/);
  return decodePathSegment(match?.[1]);
};

export const parseDisqualifiedOfficerLink = (value: unknown) => {
  let path = linkPath(value, PUBLIC_DATA_BASE_URL);
  let match = path?.match(/^\/disqualified-officers\/(natural|corporate)\/([^/]+)$/);
  let officerId = decodePathSegment(match?.[2]);
  if (!match || !officerId) return undefined;
  return { officerType: match[1] as DisqualifiedOfficerType, officerId };
};

export const parseDocumentIdFromLink = (value: unknown) => {
  let path = linkPath(value, DOCUMENT_API_BASE_URL);
  let match = path?.match(/^\/document\/([^/]+)$/);
  return decodePathSegment(match?.[1]);
};

export type ParsedPscLink = {
  companyNumber: string;
  pscId: string;
  kind?: (typeof PSC_RESOURCE_DISCRIMINATORS)[number];
  resourceType: 'psc' | 'statement';
};

export const parsePscLink = (value: unknown): ParsedPscLink | undefined => {
  let path = linkPath(value, PUBLIC_DATA_BASE_URL);
  if (!path) return undefined;

  let statementMatch = path.match(
    /^\/company\/([^/]+)\/persons-with-significant-control-statements\/([^/]+)$/
  );
  if (statementMatch) {
    let companyNumber = decodePathSegment(statementMatch[1]);
    let pscId = decodePathSegment(statementMatch[2]);
    return companyNumber && pscId
      ? { companyNumber, pscId, resourceType: 'statement' }
      : undefined;
  }

  let pscMatch = path.match(
    /^\/company\/([^/]+)\/persons-with-significant-control\/([^/]+)\/([^/]+)$/
  );
  if (!pscMatch || !PSC_RESOURCE_DISCRIMINATORS.includes(pscMatch[2] as never)) {
    return undefined;
  }
  let companyNumber = decodePathSegment(pscMatch[1]);
  let pscId = decodePathSegment(pscMatch[3]);
  return companyNumber && pscId
    ? {
        companyNumber,
        kind: pscMatch[2] as ParsedPscLink['kind'],
        pscId,
        resourceType: 'psc'
      }
    : undefined;
};

export const parseChargeIdFromLink = (value: unknown) => {
  let path = linkPath(value, PUBLIC_DATA_BASE_URL);
  let match = path?.match(/^\/company\/([^/]+)\/charges\/([^/]+)$/);
  return decodePathSegment(match?.[2]);
};

export const mapAddress = (value: unknown): MappedAddress | undefined => {
  let record = asRecord(value);
  if (!record) return undefined;
  return pickDefined({
    addressLine1: stringValue(record.address_line_1),
    addressLine2: stringValue(record.address_line_2),
    careOf: stringValue(record.care_of),
    country: stringValue(record.country),
    locality: stringValue(record.locality),
    poBox: stringValue(record.po_box),
    postalCode: stringValue(record.postal_code),
    premises: stringValue(record.premises),
    region: stringValue(record.region),
    record
  }) as MappedAddress;
};

export const mapCompanyRecord = (value: unknown): MappedCompany => {
  let record = asRecord(value) ?? {};
  return {
    companyNumber: stringValue(record.company_number),
    name: stringValue(record.company_name) ?? stringValue(record.title),
    status: stringValue(record.company_status),
    type: stringValue(record.company_type),
    subtype: stringValue(record.company_subtype),
    createdOn: stringValue(record.date_of_creation),
    ceasedOn: stringValue(record.date_of_cessation),
    address: mapAddress(record.registered_office_address ?? record.address),
    record
  };
};

let requiredStringValue = (record: ProviderRecord, keys: string[], label: string) => {
  for (let key of keys) {
    let value = stringValue(record[key]);
    if (value) return value;
  }
  throw companiesHouseValidationError(
    `Companies House returned a ${label} record without a required ${keys[0]} value.`,
    'companies_house_response_invalid'
  );
};

export const mapCompanySearchRecord = (value: unknown): MappedCompanySearchItem => {
  let record = asRecord(value) ?? {};
  let links = asRecord(record.links);
  return pickDefined({
    companyNumber: requiredStringValue(record, ['company_number'], 'company search'),
    name: requiredStringValue(record, ['company_name', 'title'], 'company search'),
    status: stringValue(record.company_status),
    type: stringValue(record.company_type),
    incorporatedOn: stringValue(record.date_of_creation),
    dissolvedOn: stringValue(record.date_of_cessation),
    addressSnippet: stringValue(record.address_snippet),
    profileUrl: stringValue(links?.company_profile),
    record
  }) as MappedCompanySearchItem;
};

let mapDateRecord = (value: unknown): MappedDatedRecord | undefined => {
  let record = asRecord(value);
  if (!record) return undefined;
  return pickDefined({
    dueOn: stringValue(record.due_on),
    madeUpTo: stringValue(record.made_up_to),
    periodStartOn: stringValue(record.period_start_on),
    periodEndOn: stringValue(record.period_end_on),
    type: stringValue(record.type),
    overdue: booleanValue(record.overdue),
    record
  }) as MappedDatedRecord;
};

let mapAccounts = (value: unknown): MappedCompanyAccounts | undefined => {
  let record = asRecord(value);
  if (!record) return undefined;
  let accountingReferenceDate = asRecord(record.accounting_reference_date);
  return pickDefined({
    accountingReferenceDate: accountingReferenceDate
      ? pickDefined({
          day: numberValue(accountingReferenceDate.day),
          month: numberValue(accountingReferenceDate.month),
          record: accountingReferenceDate
        })
      : undefined,
    lastAccounts: mapDateRecord(record.last_accounts),
    nextAccounts: mapDateRecord(record.next_accounts),
    nextDueOn: stringValue(record.next_due),
    nextMadeUpTo: stringValue(record.next_made_up_to),
    overdue: booleanValue(record.overdue),
    record
  }) as MappedCompanyAccounts;
};

let mapConfirmationStatement = (value: unknown): MappedConfirmationStatement | undefined => {
  let record = asRecord(value);
  if (!record) return undefined;
  return pickDefined({
    lastMadeUpTo: stringValue(record.last_made_up_to),
    nextDueOn: stringValue(record.next_due),
    nextMadeUpTo: stringValue(record.next_made_up_to),
    overdue: booleanValue(record.overdue),
    record
  }) as MappedConfirmationStatement;
};

let mapPreviousCompanyName = (value: unknown): MappedPreviousCompanyName => {
  let record = asRecord(value) ?? {};
  return pickDefined({
    name: requiredStringValue(record, ['name'], 'previous company name'),
    effectiveFrom: stringValue(record.effective_from),
    ceasedOn: stringValue(record.ceased_on),
    record
  }) as MappedPreviousCompanyName;
};

export const mapCompanyProfile = (value: unknown): MappedCompanyProfile => {
  let record = asRecord(value) ?? {};
  let previousNames = Array.isArray(record.previous_company_names)
    ? record.previous_company_names.map(mapPreviousCompanyName)
    : [];
  return pickDefined({
    companyNumber: requiredStringValue(record, ['company_number'], 'company profile'),
    name: requiredStringValue(record, ['company_name'], 'company profile'),
    status: stringValue(record.company_status),
    statusDetail: stringValue(record.company_status_detail),
    type: stringValue(record.type) ?? stringValue(record.company_type),
    subtype: stringValue(record.subtype) ?? stringValue(record.company_subtype),
    jurisdiction: stringValue(record.jurisdiction),
    incorporatedOn: stringValue(record.date_of_creation),
    dissolvedOn: stringValue(record.date_of_cessation),
    sicCodes: stringArray(record.sic_codes) ?? [],
    registeredOfficeAddress: mapAddress(record.registered_office_address),
    accounts: mapAccounts(record.accounts),
    confirmationStatement: mapConfirmationStatement(record.confirmation_statement),
    previousNames,
    links: asRecord(record.links),
    record
  }) as MappedCompanyProfile;
};

export const mapOfficerRecord = (value: unknown): MappedOfficer => {
  let record = asRecord(value) ?? {};
  let links = asRecord(record.links);
  let nestedOfficer = asRecord(links?.officer);
  let disqualified = parseDisqualifiedOfficerLink(links?.self);
  let nameParts = [record.forename, record.other_forenames, record.surname]
    .filter(part => typeof part === 'string' && part.length > 0)
    .join(' ');
  return {
    officerId:
      parseOfficerIdFromLink(links?.appointments) ??
      parseOfficerIdFromLink(nestedOfficer?.appointments) ??
      parseOfficerIdFromLink(links?.self) ??
      disqualified?.officerId,
    officerType: disqualified?.officerType,
    name: stringValue(record.name) ?? stringValue(nameParts) ?? stringValue(record.title),
    role: stringValue(record.officer_role),
    appointedOn: stringValue(record.appointed_on),
    resignedOn: stringValue(record.resigned_on),
    dateOfBirth: record.date_of_birth,
    address: mapAddress(record.address),
    record
  };
};

export const mapOfficerSearchRecord = (value: unknown): MappedOfficerSearchItem => {
  let record = asRecord(value) ?? {};
  let links = asRecord(record.links);
  let appointmentsUrl = stringValue(links?.self);
  return pickDefined({
    officerId: parseOfficerIdFromLink(appointmentsUrl),
    name: requiredStringValue(record, ['name', 'title'], 'officer search'),
    appointmentCount: nonNegativeInteger(record.appointment_count),
    dateOfBirth: mapPublishedDateOfBirth(record.date_of_birth),
    addressSnippet: stringValue(record.address_snippet),
    appointmentsUrl,
    record
  }) as MappedOfficerSearchItem;
};

export const mapCompanyOfficerRecord = (value: unknown): MappedCompanyOfficer => {
  let record = asRecord(value) ?? {};
  let links = asRecord(record.links);
  let officerLinks = asRecord(links?.officer);
  return pickDefined({
    officerId:
      parseOfficerIdFromLink(officerLinks?.appointments) ??
      parseOfficerIdFromLink(links?.appointments),
    name: requiredStringValue(record, ['name'], 'company officer'),
    role: requiredStringValue(record, ['officer_role'], 'company officer'),
    appointedOn: stringValue(record.appointed_on),
    resignedOn: stringValue(record.resigned_on),
    nationality: stringValue(record.nationality),
    occupation: stringValue(record.occupation),
    countryOfResidence: stringValue(record.country_of_residence),
    address: mapAddress(record.address),
    dateOfBirth: mapPublishedDateOfBirth(record.date_of_birth),
    links,
    record
  }) as MappedCompanyOfficer;
};

export const mapOfficerAppointmentRecord = (value: unknown): MappedOfficerAppointment => {
  let record = asRecord(value) ?? {};
  let company = asRecord(record.appointed_to) ?? {};
  return pickDefined({
    companyNumber: requiredStringValue(company, ['company_number'], 'officer appointment'),
    companyName: requiredStringValue(company, ['company_name'], 'officer appointment'),
    companyStatus: stringValue(company.company_status),
    role: requiredStringValue(record, ['officer_role'], 'officer appointment'),
    appointedOn: stringValue(record.appointed_on),
    resignedOn: stringValue(record.resigned_on),
    links: asRecord(record.links),
    record
  }) as MappedOfficerAppointment;
};

export const mapDisqualifiedOfficerSearchRecord = (
  value: unknown
): MappedDisqualifiedOfficerSearchItem => {
  let record = asRecord(value) ?? {};
  let links = asRecord(record.links);
  let disqualificationsUrl = stringValue(links?.self);
  let parsed = parseDisqualifiedOfficerLink(disqualificationsUrl);
  return pickDefined({
    officerId: parsed?.officerId,
    officerType: parsed?.officerType,
    name: requiredStringValue(
      record,
      ['name', 'title', 'company_name'],
      'disqualified officer search'
    ),
    addressSnippet: stringValue(record.address_snippet),
    disqualificationsUrl,
    record
  }) as MappedDisqualifiedOfficerSearchItem;
};

export const mapDisqualifiedOfficerRecord = (
  value: unknown,
  officerType: DisqualifiedOfficerType,
  officerId: string
): MappedDisqualifiedOfficer => {
  let record = asRecord(value) ?? {};
  let nameParts = [record.forename, record.other_forenames, record.surname]
    .filter(part => typeof part === 'string' && part.length > 0)
    .join(' ');
  return pickDefined({
    officerId,
    officerType,
    name: requiredStringValue(
      { ...record, composed_name: nameParts },
      ['name', 'company_name', 'composed_name', 'title'],
      'disqualified officer'
    ),
    dateOfBirth: mapPublishedDateOfBirth(record.date_of_birth),
    nationality: stringValue(record.nationality),
    disqualifications: Array.isArray(record.disqualifications)
      ? record.disqualifications.filter(
          (item): item is ProviderRecord => asRecord(item) !== undefined
        )
      : [],
    exemptions: Array.isArray(record.exemptions)
      ? record.exemptions.filter(
          (item): item is ProviderRecord => asRecord(item) !== undefined
        )
      : [],
    links: asRecord(record.links),
    record
  }) as MappedDisqualifiedOfficer;
};

export const mapFilingRecord = (value: unknown): MappedFiling => {
  let record = asRecord(value) ?? {};
  let links = asRecord(record.links);
  return {
    transactionId: stringValue(record.transaction_id),
    documentId: parseDocumentIdFromLink(links?.document_metadata),
    category: stringValue(record.category),
    date: stringValue(record.date),
    description: stringValue(record.description),
    type: stringValue(record.type),
    pages: numberValue(record.pages),
    paperFiled: booleanValue(record.paper_filed),
    record
  };
};

export const mapChargeRecord = (value: unknown): MappedCharge => {
  let record = asRecord(value) ?? {};
  let links = asRecord(record.links);
  let classification = asRecord(record.classification);
  return {
    chargeId: stringValue(record.id) ?? parseChargeIdFromLink(links?.self),
    status: stringValue(record.status),
    createdOn: stringValue(record.created_on),
    deliveredOn: stringValue(record.delivered_on),
    satisfiedOn: stringValue(record.satisfied_on),
    classification:
      stringValue(classification?.description) ?? stringValue(classification?.type),
    record
  };
};

export const mapPscRecord = (value: unknown): MappedPsc => {
  let record = asRecord(value) ?? {};
  let links = asRecord(record.links);
  let parsed = parsePscLink(links?.self);
  return {
    pscId: parsed?.pscId,
    companyNumber: parsed?.companyNumber,
    name: stringValue(record.name) ?? stringValue(record.statement),
    kind: stringValue(record.kind),
    notifiedOn: stringValue(record.notified_on),
    ceasedOn: stringValue(record.ceased_on),
    ceased: booleanValue(record.ceased),
    naturesOfControl: stringArray(record.natures_of_control),
    record
  };
};

export const mapDocumentMetadata = (value: unknown): MappedDocumentMetadata => {
  let record = asRecord(value) ?? {};
  let rawResources = asRecord(record.resources) ?? {};
  let resources: Record<string, MappedDocumentResource> = {};

  for (let [mimeType, resourceValue] of Object.entries(rawResources)) {
    let resource = asRecord(resourceValue);
    if (!resource) continue;
    resources[mimeType.toLowerCase()] = {
      contentLength: numberValue(resource.content_length),
      createdAt: stringValue(resource.created_at),
      updatedAt: stringValue(resource.updated_at),
      record: resource
    };
  }

  return {
    documentId: stringValue(record.id),
    createdAt: stringValue(record.created_at),
    updatedAt: stringValue(record.updated_at),
    pages: numberValue(record.pages),
    availableMimeTypes: Object.keys(resources),
    resources,
    record
  };
};

export const mapPaginatedEnvelope = <T>(
  value: unknown,
  mapper: (record: unknown) => T,
  requested: { itemsPerPage: number; startIndex: number }
): MappedPage<T> => {
  let record = asRecord(value) ?? {};
  let items = Array.isArray(record.items) ? record.items.map(mapper) : [];
  return {
    items,
    itemsPerPage: nonNegativeInteger(record.items_per_page) ?? requested.itemsPerPage,
    startIndex: nonNegativeInteger(record.start_index) ?? requested.startIndex,
    totalResults:
      nonNegativeInteger(record.total_results) ??
      nonNegativeInteger(record.total_count) ??
      items.length,
    record
  };
};

export const mapCompanyOfficerListEnvelope = (
  value: unknown,
  companyNumber: string,
  requested: { itemsPerPage: number; startIndex: number }
): MappedCompanyOfficerList => {
  let record = asRecord(value) ?? {};
  let officers = Array.isArray(record.items) ? record.items.map(mapCompanyOfficerRecord) : [];
  return {
    companyNumber,
    activeCount: requiredNonNegativeInteger(record, 'active_count', 'company officers'),
    resignedCount: requiredNonNegativeInteger(record, 'resigned_count', 'company officers'),
    inactiveCount: requiredNonNegativeInteger(record, 'inactive_count', 'company officers'),
    officers,
    itemsPerPage: nonNegativeInteger(record.items_per_page) ?? requested.itemsPerPage,
    startIndex: nonNegativeInteger(record.start_index) ?? requested.startIndex,
    totalResults:
      nonNegativeInteger(record.total_results) ??
      nonNegativeInteger(record.total_count) ??
      officers.length,
    record
  };
};

export const mapOfficerAppointmentListEnvelope = (
  value: unknown,
  officerId: string,
  requested: { itemsPerPage: number; startIndex: number }
): MappedOfficerAppointmentList => {
  let record = asRecord(value) ?? {};
  let appointments = Array.isArray(record.items)
    ? record.items.map(mapOfficerAppointmentRecord)
    : [];
  return pickDefined({
    officerId,
    name: requiredStringValue(record, ['name'], 'officer appointments'),
    dateOfBirth: mapPublishedDateOfBirth(record.date_of_birth),
    appointments,
    itemsPerPage: nonNegativeInteger(record.items_per_page) ?? requested.itemsPerPage,
    startIndex: nonNegativeInteger(record.start_index) ?? requested.startIndex,
    totalResults:
      nonNegativeInteger(record.total_results) ??
      nonNegativeInteger(record.total_count) ??
      appointments.length,
    record
  }) as MappedOfficerAppointmentList;
};

export const mapAdvancedCompanySearchEnvelope = (
  value: unknown,
  requested: { itemsPerPage: number; startIndex: number }
): MappedPage<MappedCompanySearchItem> => {
  let record = asRecord(value) as AdvancedCompanySearchEnvelope | undefined;
  let hits = record?.hits;
  if (!record || typeof hits !== 'string' || !/^(0|[1-9]\d*)$/.test(hits)) {
    throw companiesHouseValidationError(
      'Companies House advanced search returned an invalid hits count.',
      'companies_house_advanced_search_invalid'
    );
  }
  let totalResults = Number(hits);
  if (!Number.isSafeInteger(totalResults)) {
    throw companiesHouseValidationError(
      'Companies House advanced search returned a hits count that is too large to represent safely.',
      'companies_house_advanced_search_invalid'
    );
  }

  return {
    items: Array.isArray(record.items) ? record.items.map(mapCompanySearchRecord) : [],
    itemsPerPage: requested.itemsPerPage,
    startIndex: requested.startIndex,
    totalResults,
    record
  };
};

export type { ProviderEnvelope };
