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
  MappedDocumentMetadata,
  MappedDocumentResource,
  MappedFiling,
  MappedOfficer,
  MappedPage,
  MappedPsc,
  ProviderEnvelope,
  ProviderRecord
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

let nonNegativeInteger = (value: unknown) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;

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

export const mapAdvancedCompanySearchEnvelope = (
  value: unknown,
  requested: { itemsPerPage: number; startIndex: number }
): MappedPage<MappedCompany> & { topHit?: MappedCompany } => {
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
    items: Array.isArray(record.items) ? record.items.map(mapCompanyRecord) : [],
    itemsPerPage: requested.itemsPerPage,
    startIndex: requested.startIndex,
    totalResults,
    ...(record.top_hit ? { topHit: mapCompanyRecord(record.top_hit) } : {}),
    record
  };
};

export type { ProviderEnvelope };
