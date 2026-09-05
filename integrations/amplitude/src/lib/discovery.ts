import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { createApiServiceError } from 'slates';
import { z } from 'zod';
import type {
  DeveloperPageInput,
  developerObjectSchema,
  developerPaginationSchema
} from './developer-client';
import { parseResponse, recordSchema } from './rest-validation';

type DiscoveryObject = z.infer<typeof developerObjectSchema>;
const maxLocalItems = 10_000;
const searchableFields = [
  'id',
  'name',
  'key',
  'event_type',
  'event_property',
  'user_property',
  'group_property',
  'property_name',
  'display_name',
  'display',
  'description'
] as const;

export const discoveryInvalid = (message: string): never => {
  throw createApiServiceError(message, { reason: 'amplitude_invalid_input' });
};

export const requireDiscoveryProject = (projectId?: string) => {
  if (!projectId)
    return discoveryInvalid(
      'projectId is required with OAuth. Call get_amplitude_context to discover accessible projects.'
    );
  return projectId;
};

export const rejectKeyProject = (projectId?: string) => {
  if (projectId !== undefined)
    discoveryInvalid(
      'Omit projectId for project API-key reads: the connected API key determines the project.'
    );
};

const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export const discoveryBinding = (
  auth: { apiKey?: string; token?: string; region?: string; experimentManagementKey?: string },
  scope: object
) =>
  hash(
    JSON.stringify({
      credential: auth.apiKey ?? auth.token,
      management: auth.experimentManagementKey,
      region: auth.region ?? 'US',
      scope
    })
  );

const cursorSchema = z
  .object({
    version: z.literal(1),
    binding: z.string(),
    kind: z.enum(['local', 'developer', 'management']),
    offset: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    upstream: z.string().min(1).optional(),
    snapshot: z.string().optional()
  })
  .strict();
type DiscoveryCursor = z.infer<typeof cursorSchema>;

const encodeCursor = (value: DiscoveryCursor) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

const decodeCursor = (
  value: string | undefined,
  binding: string,
  kind: DiscoveryCursor['kind']
): DiscoveryCursor | undefined => {
  if (value === undefined) return undefined;
  let cursor: DiscoveryCursor;
  try {
    if (value.length > 16_384 || !/^[A-Za-z0-9_-]+$/.test(value))
      return discoveryInvalid('Invalid pagination cursor. Start again without cursor.');
    const decoded = Buffer.from(value, 'base64url');
    if (decoded.toString('base64url') !== value)
      return discoveryInvalid('Invalid pagination cursor. Start again without cursor.');
    cursor = cursorSchema.parse(JSON.parse(decoded.toString('utf8')));
  } catch {
    return discoveryInvalid('Invalid pagination cursor. Start again without cursor.');
  }
  if (cursor.binding !== binding || cursor.kind !== kind)
    return discoveryInvalid(
      'This cursor belongs to different search inputs or credentials. Start again without cursor.'
    );
  if (
    (kind === 'local' &&
      (cursor.offset === undefined || !cursor.snapshot || cursor.upstream !== undefined)) ||
    (kind === 'management' &&
      (cursor.offset === undefined ||
        cursor.snapshot !== undefined ||
        cursor.upstream !== undefined)) ||
    (kind === 'developer' &&
      (!cursor.upstream || cursor.offset !== undefined || cursor.snapshot !== undefined))
  )
    return discoveryInvalid('Invalid pagination cursor. Start again without cursor.');
  return cursor;
};

export const discoveryObject = (
  value: unknown,
  object: string,
  idField: string,
  alternateIdField?: string
): DiscoveryObject => {
  const item = parseResponse(recordSchema, value, `${object} lookup`);
  const id = item[idField] ?? (alternateIdField ? item[alternateIdField] : undefined);
  if (
    !(
      (typeof id === 'string' && id.length > 0) ||
      (typeof id === 'number' && Number.isSafeInteger(id) && id >= 0)
    )
  )
    throw createApiServiceError(`Amplitude returned a ${object} without a valid identifier.`, {
      reason: 'amplitude_invalid_response'
    });
  return { ...item, id: String(id), object };
};

export const discoveryItems = (value: unknown, key = 'data') => {
  const result = parseResponse(recordSchema, value, 'resource list');
  const items = parseResponse(z.array(recordSchema), result[key], 'resource list');
  if (items.length > maxLocalItems)
    throw createApiServiceError(
      `Amplitude returned more than ${maxLocalItems} records. Local discovery cannot safely search this complete list.`,
      { reason: 'amplitude_discovery_limit' }
    );
  return items;
};

const matches = (item: DiscoveryObject, q?: string) => {
  if (q === undefined) return true;
  const term = q.toLocaleLowerCase('en-US');
  return searchableFields.some(
    field =>
      typeof item[field] === 'string' && item[field].toLocaleLowerCase('en-US').includes(term)
  );
};

export const singleDiscoveryList = (item: DiscoveryObject) => ({
  data: [item],
  pagination: { next_cursor: null, has_more: false }
});

export const localDiscoveryPage = (
  items: DiscoveryObject[],
  input: DeveloperPageInput,
  binding: string
) => {
  if (items.length > maxLocalItems)
    throw createApiServiceError(`Local discovery is limited to ${maxLocalItems} records.`, {
      reason: 'amplitude_discovery_limit'
    });
  const matching = items
    .filter(item => matches(item, input.q))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const snapshot = hash(JSON.stringify(matching.map(item => item.id)));
  const cursor = decodeCursor(input.cursor, binding, 'local');
  const offset = cursor?.offset ?? 0;
  if ((cursor && cursor.snapshot !== snapshot) || offset > matching.length)
    return discoveryInvalid(
      'The resource list changed or the cursor is out of range. Start again without cursor.'
    );
  const data = matching.slice(offset, offset + (input.limit ?? 50));
  const nextOffset = offset + data.length;
  const hasMore = nextOffset < matching.length;
  return {
    data,
    pagination: {
      has_more: hasMore,
      next_cursor: hasMore
        ? encodeCursor({ version: 1, kind: 'local', binding, snapshot, offset: nextOffset })
        : null
    },
    search: {
      mode: 'local_complete_list',
      query: input.q,
      fields: searchableFields,
      scanned: items.length,
      matches: matching.length
    }
  };
};

export const managementDiscoveryCursor = (cursor: string | undefined, binding: string) =>
  decodeCursor(cursor, binding, 'management')?.offset;

export const managementDiscoveryPage = (
  response: Record<string, unknown>,
  resource: 'flags' | 'experiments',
  input: DeveloperPageInput,
  binding: string
) => {
  const items = discoveryItems(response, resource).map(item =>
    discoveryObject(item, resource === 'flags' ? 'flag' : 'experiment', 'id')
  );
  const rawCursor = response.nextCursor;
  if (
    rawCursor !== undefined &&
    rawCursor !== null &&
    !(typeof rawCursor === 'number' && Number.isSafeInteger(rawCursor) && rawCursor >= 0)
  )
    throw createApiServiceError(
      'Amplitude returned an invalid management pagination cursor.',
      { reason: 'amplitude_invalid_response' }
    );
  const previous = managementDiscoveryCursor(input.cursor, binding);
  if (typeof rawCursor === 'number' && rawCursor <= (previous ?? 0))
    throw createApiServiceError(
      'Amplitude returned a management pagination cursor that does not advance.',
      { reason: 'amplitude_invalid_response' }
    );
  return {
    data: items.filter(item => matches(item, input.q)),
    pagination: {
      has_more: typeof rawCursor === 'number',
      next_cursor:
        typeof rawCursor === 'number'
          ? encodeCursor({ version: 1, kind: 'management', binding, offset: rawCursor })
          : null
    },
    search: {
      mode: 'local_upstream_page',
      query: input.q,
      fields: searchableFields,
      scanned: items.length
    }
  };
};

export const developerDiscoveryCursor = (cursor: string | undefined, binding: string) =>
  decodeCursor(cursor, binding, 'developer')?.upstream;

export const filteredDeveloperPage = (
  response: { data: DiscoveryObject[]; pagination: z.infer<typeof developerPaginationSchema> },
  input: DeveloperPageInput,
  binding: string
) => {
  const next = response.pagination.next_cursor;
  if (
    response.pagination.has_more &&
    (!next || next === developerDiscoveryCursor(input.cursor, binding))
  )
    throw createApiServiceError('Amplitude returned invalid search pagination.', {
      reason: 'amplitude_invalid_response'
    });
  return {
    ...response,
    data: response.data.filter(item => matches(item, input.q)),
    pagination: {
      ...response.pagination,
      next_cursor:
        response.pagination.has_more && next
          ? encodeCursor({ version: 1, kind: 'developer', binding, upstream: next })
          : null
    },
    search: {
      mode: 'local_upstream_page',
      query: input.q,
      fields: searchableFields,
      scanned: response.data.length
    }
  };
};
