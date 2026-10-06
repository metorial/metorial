import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';

// SAP's published OData V2 API-server table; certificate/mTLS hosts are different services.
export const API_HOSTS = new Set([
  'api.successfactors.eu',
  'api2.successfactors.eu',
  'apisalesdemo2.successfactors.eu',
  'api2preview.sapsf.eu',
  'api4.successfactors.com',
  'apisalesdemo4.successfactors.com',
  'api4preview.sapsf.com',
  'api8.successfactors.com',
  'apisalesdemo8.successfactors.com',
  'api8preview.sapsf.com',
  'api10.successfactors.com',
  'api10preview.sapsf.com',
  'api012.successfactors.eu',
  'api12preview.sapsf.eu',
  'api15.sapsf.cn',
  'api15preview.sapsf.cn',
  ...[17, 19, 22, 23, 41, 44, 47, 50].flatMap(n => [
    `api${n}.sapsf.com`,
    `api${n}preview.sapsf.com`
  ]),
  'api40sales.sapsf.com',
  'api68sales.successfactors.com',
  ...[55, 74].flatMap(n => [`api${n}.sapsf.eu`, `api${n}preview.sapsf.eu`]),
  'api-in10.hr.cloud.sap',
  'api-in10-preview.hr.cloud.sap',
  'api-sa20.hr.cloud.sap',
  'api-sa20-preview.hr.cloud.sap'
]);
export const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'sap_successfactors_validation' });
export function nonempty(value: string, label: string): string {
  if (!value.trim() || [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127))
    throw invalid(`${label} must be nonempty and contain no control characters.`);
  return value;
}
export function apiOrigin(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw invalid('Enter the HTTPS API server origin from SAP’s published API-server list.');
  }
  if (
    url.protocol !== 'https:' ||
    !API_HOSTS.has(url.hostname) ||
    url.username ||
    url.password ||
    url.port ||
    (url.pathname !== '/' && url.pathname !== '') ||
    url.search ||
    url.hash
  )
    throw invalid(
      'Use a supported SAP HTTPS API server origin without a path, credentials, query or nonstandard port. Verify the company’s data center; certificate servers and custom proxy hosts are unsupported.'
    );
  return url.origin;
}
export function identifier(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value))
    throw invalid(
      'Entity and property names must be exact OData identifiers. Call get_api_metadata to discover them.'
    );
  return value;
}
export function positiveId(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw invalid(
      'The ID must be a positive safe integer. For larger Int64 IDs use query_odata_entity with a decimal string key.'
    );
  return value;
}
export function dateOnly(value: string): string {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) ||
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value
  )
    throw invalid('Dates must be real calendar dates in YYYY-MM-DD format.');
  return value;
}
export function userFilter(userId?: string, filter?: string): string | undefined {
  let own =
    userId === undefined
      ? undefined
      : `userId eq '${nonempty(userId, 'User ID').replaceAll("'", "''")}'`;
  return (
    [own, filter]
      .filter(x => x !== undefined)
      .map(x => `(${x})`)
      .join(' and ') || undefined
  );
}
export function upstream(error: unknown, operation: string, preserveLocal = true) {
  if (preserveLocal && error instanceof ServiceError) return error;
  let status = getApiErrorStatus(error);
  let data = isApiErrorRecord(error) && isApiErrorRecord(error.data) ? error.data : undefined;
  let baggage = data && isApiErrorRecord(data.baggage) ? data.baggage : undefined;
  let serviceData =
    baggage && isApiErrorRecord(baggage.serviceErrorData)
      ? baggage.serviceErrorData
      : undefined;
  let mappedStatus = data?.upstreamStatus ?? serviceData?.upstreamStatus;
  if (
    typeof mappedStatus === 'number' &&
    Number.isInteger(mappedStatus) &&
    mappedStatus >= 100 &&
    mappedStatus <= 599
  )
    status = mappedStatus;
  let message =
    status === 401
      ? 'Authentication failed. Reconnect with a valid token or registered SAML client.'
      : status === 403
        ? 'Access denied. Check the API user’s role-based permissions, target population, module availability and IP restrictions.'
        : status === 404
          ? 'The resource or API is unavailable. Check its exact key and the company’s OData metadata.'
          : status === 429
            ? 'SAP rate-limited this request. Wait before retrying.'
            : 'The request failed. Inspect SAP’s API audit log; do not retry an ambiguous write before checking its exact keys.';
  let transport = preserveLocal ? error : { response: status === undefined ? {} : { status } };
  return buildApiServiceError(transport, {
    providerLabel: 'SAP SuccessFactors',
    reason: 'sap_successfactors_api_error',
    operation,
    extractMessage: () => message,
    extractResponse: () => (status === undefined ? {} : { status }),
    parent: {}
  });
}
export function credentialVariants(token: string): string[] {
  return [
    ...new Set([
      token,
      encodeURIComponent(token),
      Buffer.from(token).toString('base64'),
      Buffer.from(token).toString('base64url'),
      Buffer.from(`Bearer ${token}`).toString('base64')
    ])
  ].filter(Boolean);
}
const secretKey =
  /^(?:password|passwd|secret|client_secret|access_token|refresh_token|token|authorization|privateKey|x509Certificate|apiKey|api_key|assertion)$/i;
export function safeData(value: unknown, token: string, depth = 0): unknown {
  if (depth > 32)
    throw invalid(
      'SAP returned an excessively nested response. Reduce the selected fields and expansions.'
    );
  if (typeof value === 'string') {
    if (credentialVariants(token).some(secret => value.includes(secret)))
      throw invalid(
        'SAP returned credential-bearing data. Reduce the selected fields and contact the API administrator.'
      );
    return value;
  }
  if (
    typeof value === 'number' &&
    (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))
  )
    throw invalid(
      'SAP returned a number that cannot be represented exactly. Request its documented string representation.'
    );
  if (Array.isArray(value)) return value.map(v => safeData(v, token, depth + 1));
  if (isApiErrorRecord(value))
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => !secretKey.test(k) && k !== '__metadata' && k !== '__deferred')
        .map(([k, v]) => {
          safeData(k, token, depth + 1);
          return [k, safeData(v, token, depth + 1)];
        })
    );
  if (value === null || ['number', 'boolean'].includes(typeof value)) return value;
  throw invalid('SAP returned an invalid JSON value.');
}
