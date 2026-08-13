import { buildApiServiceError, createApiServiceError } from 'slates';

type ErrorResponse = {
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let addDetail = (details: string[], value: unknown) => {
  if (typeof value !== 'string' && typeof value !== 'number') return;

  let detail = String(value).trim();
  if (detail && !details.includes(detail)) details.push(detail);
};

let collectDetails = (value: unknown, details: string[]) => {
  if (Array.isArray(value)) {
    for (let item of value) collectDetails(item, details);
    return;
  }

  if (!isRecord(value)) {
    addDetail(details, value);
    return;
  }

  for (let key of ['code', 'message', 'status', 'error', 'error_description']) {
    addDetail(details, value[key]);
  }

  if (isRecord(value.details)) {
    addDetail(details, value.details.api_name);
    addDetail(details, value.details.param_name);
    addDetail(details, value.details.id);
  }

  collectDetails(value.data, details);
  collectDetails(value.errors, details);
};

let extractZohoCrmMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let details: string[] = [];
  collectDetails(response?.data, details);

  if (details.length > 0) return details.join(' - ');
  if (error instanceof Error && error.message) return error.message;
  return 'Unknown error';
};

export let zohoCrmServiceError = (message: string) => createApiServiceError(message);

export let zohoCrmApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Zoho CRM',
    operation,
    reason: 'zoho_crm_api_error',
    extractMessage: extractZohoCrmMessage
  });

export let requireZohoCrmString = (value: unknown, label: string, action?: string) => {
  if (typeof value === 'string' && value.trim()) return value;

  throw zohoCrmServiceError(`${label} is required${action ? ` for "${action}"` : ''}.`);
};

export let requireZohoCrmArray = <T>(
  value: T[] | undefined,
  label: string,
  action?: string
) => {
  if (Array.isArray(value) && value.length > 0) return value;

  throw zohoCrmServiceError(
    `${label} must contain at least one item${action ? ` for "${action}"` : ''}.`
  );
};

export let decodeZohoCrmBase64File = (contentBase64: string, label: string) => {
  let normalized = contentBase64.trim();
  let buffer = Buffer.from(normalized, 'base64');
  let encoded = buffer.toString('base64');

  if (!normalized || encoded !== normalized) {
    throw zohoCrmServiceError(`${label} must be valid non-empty base64 data.`);
  }

  return buffer;
};
