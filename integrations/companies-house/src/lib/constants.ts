export const PUBLIC_DATA_BASE_URL = 'https://api.company-information.service.gov.uk';

export const DOCUMENT_API_BASE_URL = 'https://document-api.company-information.service.gov.uk';

export const DEFAULT_ITEMS_PER_PAGE = 20;
export const MAX_ITEMS_PER_PAGE = 100;
export const MAX_DOCUMENT_DOWNLOAD_BYTES = 50 * 1024 * 1024;

export const SAFE_DOCUMENT_MIME_EXTENSIONS = {
  'application/pdf': 'pdf',
  'application/json': 'json',
  'application/xml': 'xml',
  'application/xhtml+xml': 'xhtml',
  'application/zip': 'zip',
  'text/csv': 'csv'
} as const;

export type SafeDocumentMimeType = keyof typeof SAFE_DOCUMENT_MIME_EXTENSIONS;

export let isSafeDocumentMimeType = (value: unknown): value is SafeDocumentMimeType =>
  typeof value === 'string' && Object.hasOwn(SAFE_DOCUMENT_MIME_EXTENSIONS, value);

export const DISQUALIFICATION_RESOURCE_PATHS = {
  natural: '/disqualified-officers/natural/',
  corporate: '/disqualified-officers/corporate/'
} as const;

export type DisqualifiedOfficerType = keyof typeof DISQUALIFICATION_RESOURCE_PATHS;

export let isDisqualifiedOfficerType = (value: unknown): value is DisqualifiedOfficerType =>
  typeof value === 'string' && Object.hasOwn(DISQUALIFICATION_RESOURCE_PATHS, value);

export const PSC_RESOURCE_DISCRIMINATORS = [
  'corporate-entity-beneficial-owner',
  'corporate-entity',
  'individual-beneficial-owner',
  'individual',
  'legal-person-beneficial-owner',
  'legal-person',
  'super-secure-beneficial-owner',
  'super-secure'
] as const;
