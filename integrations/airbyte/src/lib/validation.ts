import { buildApiServiceError, createApiServiceError, isApiErrorRecord } from 'slates';
import { z } from 'zod';

export const apiBaseUrl = (value: string) => {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw createApiServiceError('Provide the complete Airbyte public API base URL.');
  }
  url.pathname = url.pathname.replace(/\/+$/, '');
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.pathname.endsWith('/v1') ||
    url.pathname.endsWith('/api/v1') ||
    (url.hostname === 'api.airbyte.com' &&
      (url.protocol !== 'https:' || url.pathname !== '/v1'))
  )
    throw createApiServiceError(
      'Use https://api.airbyte.com/v1 or your self-managed public API URL ending in /api/public/v1.'
    );
  return url.toString().replace(/\/$/, '');
};

export const pathId = (value: string) => {
  if (!value.trim() || value !== value.trim() || value === '.' || value === '..')
    throw createApiServiceError(
      'Provide a nonempty resource ID without surrounding whitespace.'
    );
  try {
    return encodeURIComponent(value);
  } catch {
    throw createApiServiceError('The resource ID contains invalid characters.');
  }
};

export const jobId = (value: number) => {
  if (!Number.isSafeInteger(value) || value < 1)
    throw createApiServiceError('jobId must be a positive safe integer.');
  return value;
};

export const requireUpdate = (body: Record<string, unknown>) => {
  if (!Object.values(body).some(value => value !== undefined))
    throw createApiServiceError('Provide at least one field to update.');
};

export const listQuery = (options?: Record<string, unknown>) => {
  const query = { ...options };
  for (const [key, minimum, maximum] of [
    ['limit', 1, 100],
    ['offset', 0, Number.MAX_SAFE_INTEGER]
  ] as const) {
    const value = query[key];
    if (
      value !== undefined &&
      (typeof value !== 'number' ||
        !Number.isSafeInteger(value) ||
        value < minimum ||
        value > maximum)
    )
      throw createApiServiceError(
        `${key} must be a whole number from ${minimum} to ${maximum}.`
      );
  }
  if (Array.isArray(query.workspaceIds)) {
    for (const id of query.workspaceIds) {
      if (typeof id !== 'string')
        throw createApiServiceError('workspaceIds must contain resource IDs.');
      pathId(id);
    }
    if (query.workspaceIds.length === 0) query.workspaceIds = undefined;
  }
  for (const key of ['createdAtStart', 'createdAtEnd', 'updatedAtStart', 'updatedAtEnd']) {
    const value = query[key];
    if (
      value !== undefined &&
      (typeof value !== 'string' || !z.iso.datetime({ offset: true }).safeParse(value).success)
    )
      throw createApiServiceError(`${key} must be an ISO 8601 date and time.`);
  }
  for (const [start, end] of [
    ['createdAtStart', 'createdAtEnd'],
    ['updatedAtStart', 'updatedAtEnd']
  ] as const)
    if (
      typeof query[start] === 'string' &&
      typeof query[end] === 'string' &&
      Date.parse(query[start]) > Date.parse(query[end])
    )
      throw createApiServiceError(`${start} must not be after ${end}.`);
  if (
    query.orderBy !== undefined &&
    (typeof query.orderBy !== 'string' ||
      !/^(createdAt|updatedAt)\|(ASC|DESC)$/.test(query.orderBy))
  )
    throw createApiServiceError(
      'orderBy must be createdAt|ASC, createdAt|DESC, updatedAt|ASC or updatedAt|DESC.'
    );
  return query;
};

export const validateSchedule = (schedule?: {
  scheduleType: string;
  cronExpression?: string;
  cronTimeZone?: string;
}) => {
  if (!schedule) return;
  if (schedule.scheduleType === 'cron' && !schedule.cronExpression?.trim())
    throw createApiServiceError('A cron schedule requires cronExpression.');
  if (
    schedule.scheduleType === 'manual' &&
    (schedule.cronExpression !== undefined || schedule.cronTimeZone !== undefined)
  )
    throw createApiServiceError('Omit cronExpression and cronTimeZone for a manual schedule.');
};

export const validatePermission = (data: {
  permissionType: string;
  workspaceId?: string;
  organizationId?: string;
}) => {
  if (data.permissionType === 'instance_admin')
    throw createApiServiceError(
      'The public API cannot grant instance_admin. Use a workspace or organization role.'
    );
  const workspace = data.permissionType.startsWith('workspace_');
  if (
    workspace
      ? !data.workspaceId || data.organizationId !== undefined
      : !data.organizationId || data.workspaceId !== undefined
  )
    throw createApiServiceError(
      'Provide exactly the workspaceId or organizationId corresponding to the permission role.'
    );
};

const secretField = (key: string) =>
  /password|secret|token$|api[_-]?key|private[_-]?key|access[_-]?key|credential|service[_-]?account|connection[_-]?string|jdbc[_-]?url|webhook|authorization|cookie|^key$/i.test(
    key
  );
export const configurationSecrets = (value: unknown, sensitive = false): string[] => {
  if (typeof value === 'string') return sensitive && value ? [value] : [];
  if (Array.isArray(value))
    return value.flatMap(item => configurationSecrets(item, sensitive));
  if (isApiErrorRecord(value))
    return Object.entries(value).flatMap(([key, item]) =>
      configurationSecrets(item, sensitive || secretField(key))
    );
  return [];
};
export const publicConfiguration = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(publicConfiguration);
  if (isApiErrorRecord(value))
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        secretField(key) ? '[redacted]' : publicConfiguration(item)
      ])
    );
  return value;
};

export const airbyteError = (error: unknown, secrets: readonly string[] = []) =>
  buildApiServiceError(error, {
    providerLabel: 'Airbyte',
    reason: 'airbyte_api_error',
    parent: {},
    detailKeys: ['detail', 'title', 'message', 'error', 'errors'],
    extractMessage: (value, helpers) =>
      [...new Set(secrets.flatMap(secret => [secret, JSON.stringify(secret).slice(1, -1)]))]
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)
        .reduce(
          (message, secret) => message.split(secret).join('[redacted]'),
          helpers.extractMessage(value, {
            detailKeys: ['detail', 'title', 'message', 'error', 'errors']
          })
        )
  });
