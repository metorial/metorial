import { ServiceError } from '@lowerdeck/error';
import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus
} from 'slates';
import { z } from 'zod';

export type Row = Record<string, unknown>;
export type AshbyAuth = { token: string; apiVersion?: string };
export const invalid: (message: string) => never = message => {
  throw createApiServiceError(message, { reason: 'ashby_validation' });
};
export const unexpected: () => never = () => {
  throw createApiServiceError(
    'Ashby returned incomplete or unexpected data. A write may have completed; read the exact resource before retrying.',
    { reason: 'ashby_response' }
  );
};
export const row = (value: unknown): Row =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Row)
    : unexpected();
export const rows = (value: unknown): Row[] =>
  Array.isArray(value) ? value.map(row) : unexpected();
export const text = (value: unknown, label: string): string => {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > 100_000 ||
    [...value].some(
      char =>
        (char.charCodeAt(0) < 32 && char !== '\n' && char !== '\t') ||
        char.charCodeAt(0) === 127
    )
  )
    invalid(`${label} must be a nonempty string without unsupported control characters.`);
  return value as string;
};
export const credential = (value: unknown): string => {
  const token = text(value, 'API key');
  if (/\s|:/.test(token))
    invalid('API key must not contain whitespace or a colon. Reconnect with the exact key.');
  return token;
};
export const id = (value: unknown, label: string): string => {
  const result = text(value, label);
  if (
    !/^(?:[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i.test(
      result
    )
  )
    invalid(
      `${label} must be an Ashby UUID. Use the relevant discovery tool to select the exact resource.`
    );
  return result;
};
export const str = (value: unknown): string =>
  typeof value === 'string' ? value : unexpected();
export const optionalString = (value: unknown): string | undefined =>
  value === undefined || value === null ? undefined : str(value);
export const email = (value: unknown): string => {
  const result = text(value, 'Email');
  if (!z.email().safeParse(result).success) invalid('Enter a valid email address.');
  return result;
};
export const webUrl = (value: unknown): string => {
  const result = text(value, 'URL');
  let url: URL;
  try {
    url = new URL(result);
  } catch {
    return invalid('Enter a valid HTTP or HTTPS URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    invalid('Enter an HTTP or HTTPS URL without credentials.');
  return result;
};
export const pageInput = (input: {
  cursor?: string;
  perPage?: number;
  syncToken?: string;
}) => {
  if (
    input.perPage !== undefined &&
    (!Number.isSafeInteger(input.perPage) || input.perPage < 1 || input.perPage > 100)
  )
    invalid('perPage must be an integer from 1 to 100.');
  return {
    ...(input.cursor === undefined ? {} : { cursor: text(input.cursor, 'Cursor') }),
    ...(input.perPage === undefined ? {} : { limit: input.perPage }),
    ...(input.syncToken === undefined
      ? {}
      : { syncToken: text(input.syncToken, 'Sync token') })
  };
};
export const pageSchema = z.object({
  moreDataAvailable: z.boolean().optional(),
  nextCursor: z.string().nullable().optional(),
  syncToken: z.string().nullable().optional()
});
export const warningsSchema = z
  .array(z.string())
  .optional()
  .describe(
    'Provider warning codes; warnings may indicate partially accepted metadata. Read the exact resource before retrying.'
  );
export const pageOutput = (response: Row, paginated = true) => {
  if (!paginated) return {};
  if (
    response.moreDataAvailable !== undefined &&
    typeof response.moreDataAvailable !== 'boolean'
  )
    unexpected();
  for (const key of ['nextCursor', 'syncToken'])
    if (
      response[key] !== undefined &&
      response[key] !== null &&
      typeof response[key] !== 'string'
    )
      unexpected();
  if (
    response.moreDataAvailable &&
    (typeof response.nextCursor !== 'string' || !response.nextCursor)
  )
    unexpected();
  return {
    nextCursor: response.moreDataAvailable ? str(response.nextCursor) : undefined,
    pageInfo: {
      ...(response.moreDataAvailable === undefined
        ? {}
        : { moreDataAvailable: response.moreDataAvailable as boolean }),
      ...(response.nextCursor === undefined
        ? {}
        : { nextCursor: response.nextCursor as string | null }),
      ...(response.syncToken === undefined
        ? {}
        : { syncToken: response.syncToken as string | null })
    }
  };
};
const codes = new Set([
  'missing_endpoint_permission',
  'candidate_not_found',
  'application_not_found',
  'job_not_found',
  'offer_not_found',
  'interview_schedule_not_found',
  'opening_in_use',
  'opening_state_invalid',
  'next_cursor_expired',
  'cursor_invalid',
  'invalid_next_cursor',
  'sync_token_expired',
  'sync_token_invalid',
  'incremental_sync_too_large'
]);
export const providerFailure = (envelope: Row): never => {
  const info =
    envelope.errorInfo && typeof envelope.errorInfo === 'object'
      ? row(envelope.errorInfo)
      : {};
  const errors = Array.isArray(envelope.errors) ? envelope.errors : [];
  const reported = [
    info.code,
    ...errors.map(error =>
      typeof error === 'string'
        ? error
        : error !== null && typeof error === 'object' && !Array.isArray(error)
          ? row(error).code
          : undefined
    )
  ];
  const code = reported.find(
    (value): value is string => typeof value === 'string' && codes.has(value)
  );
  const recovery =
    code &&
    [
      'next_cursor_expired',
      'cursor_invalid',
      'invalid_next_cursor',
      'sync_token_expired',
      'sync_token_invalid',
      'incremental_sync_too_large'
    ].includes(code)
      ? ' Restart a full sync without both cursor and syncToken; retain the old result set until all pages succeed.'
      : ' Check API-key permissions and the selected resource. A write may have completed; read back before retrying.';
  throw createApiServiceError(
    `Ashby rejected the request${code ? ` (${code})` : ''}.${recovery}`,
    { reason: 'ashby_api_error', upstreamStatus: 200, upstreamCode: code }
  );
};
export const safeApiError = (error: unknown) => {
  if (error instanceof ServiceError) return error;
  const value = getApiErrorStatus(error);
  const status =
    typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599
      ? value
      : undefined;
  return buildApiServiceError(status === undefined ? {} : { response: { status } }, {
    providerLabel: 'Ashby',
    reason: 'ashby_transport',
    parent: {},
    extractMessage: () => 'Provider details omitted.',
    formatMessage: () =>
      `Ashby request failed${status === undefined ? '' : ` (HTTP ${status})`}. Check API-key permissions. A write may have completed; read back before retrying.`
  });
};
export const safeData = (value: unknown, auth: AshbyAuth): unknown => {
  const redact = new AuthConfigSecretRedactor({
    token: auth.token,
    encoded: Buffer.from(`${auth.token}:`).toString('base64')
  });
  const seen = new Set<unknown>();
  const visit = (item: unknown, depth: number): unknown => {
    if (depth > 30) unexpected();
    if (typeof item === 'string') {
      if (redact.redactEmbedded(item) !== item || item.includes('$$MT$secret$authConfig$'))
        unexpected();
      return item;
    }
    if (
      item === null ||
      typeof item === 'boolean' ||
      (typeof item === 'number' && Number.isFinite(item))
    )
      return item;
    if (!item || typeof item !== 'object' || seen.has(item)) unexpected();
    seen.add(item);
    if (Array.isArray(item)) return item.map(child => visit(child, depth + 1));
    return Object.fromEntries(
      Object.entries(item).map(([key, child]) => {
        if (
          redact.redactEmbedded(key) !== key ||
          ['__proto__', 'constructor', 'prototype'].includes(key) ||
          /^(?:authorization|api[_-]?key|access_token|refresh_token|password|client_secret)$/i.test(
            key
          )
        )
          unexpected();
        return [key, visit(child, depth + 1)];
      })
    );
  };
  return visit(value, 0);
};
export const contactType = (
  type: string | undefined,
  value: string | undefined,
  label: string
) => {
  if (value !== undefined && type !== undefined && type !== 'Personal')
    invalid(
      `Ashby's ${label} field sets the primary personal contact. Use Personal; other legacy contact types are not supported by this endpoint.`
    );
};
export const socialLinks = (value: unknown) =>
  rows(value).map(link => ({
    type: text(link.type, 'Social link type'),
    url: webUrl(link.url)
  }));
export const mapJob = (value: unknown) => {
  const job = row(value);
  return {
    jobId: str(job.id),
    title: str(job.title),
    status: str(job.status),
    locationId: optionalString(job.locationId),
    departmentId: optionalString(job.departmentId),
    createdAt: str(job.createdAt),
    updatedAt: str(job.updatedAt),
    defaultInterviewPlanId: optionalString(job.defaultInterviewPlanId)
  };
};
export const mapApplication = (value: unknown) => {
  const app = row(value),
    candidate = row(app.candidate),
    job = row(app.job),
    stage = row(app.currentInterviewStage);
  return {
    applicationId: str(app.id),
    status: str(app.status),
    candidateName: str(candidate.name),
    candidateId: str(candidate.id),
    jobTitle: str(job.title),
    jobId: str(job.id),
    currentStage: { stageId: str(stage.id), title: str(stage.title) },
    source:
      app.source === undefined || app.source === null
        ? undefined
        : { sourceId: str(row(app.source).id), title: str(row(app.source).title) },
    createdAt: str(app.createdAt),
    updatedAt: str(app.updatedAt)
  };
};
export const mapOffer = (value: unknown) => {
  const offer = row(value),
    version =
      offer.latestVersion === undefined || offer.latestVersion === null
        ? undefined
        : row(offer.latestVersion);
  return {
    offerId: str(offer.id),
    status: str(offer.offerStatus),
    applicationId: str(offer.applicationId),
    acceptanceStatus: str(offer.acceptanceStatus),
    latestVersion: version
      ? {
          offerVersionId: str(version.id),
          createdAt: str(version.createdAt),
          approvalStatus:
            version.approvalStatus === undefined
              ? undefined
              : (version.approvalStatus as string | null),
          fileHandles:
            version.fileHandles === undefined
              ? undefined
              : version.fileHandles === null
                ? null
                : rows(version.fileHandles)
        }
      : offer.latestVersion === null
        ? null
        : undefined
  };
};
