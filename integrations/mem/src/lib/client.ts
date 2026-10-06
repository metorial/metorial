import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';

const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const uuid = z.uuid();
const date = z.iso.datetime({ offset: true });
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const request = z.object({ request_id: z.string().min(1) });
const noteBase = z.object({
  id: uuid,
  title: z.string(),
  content: z.string(),
  collection_ids: z.array(uuid),
  created_at: date,
  updated_at: date,
  version: count.min(1)
});
const noteWrite = noteBase.extend({ request_id: z.string().min(1) });
const noteUpdated = noteWrite.extend({ trashed_at: date.nullable() });
const noteRead = noteUpdated.extend({
  audio_recording_ids: z.array(uuid),
  attachment_metadata: z.array(
    z.object({ attachment_id: uuid, attachment_kind: z.string() }).passthrough()
  )
});
const noteItem = noteBase.omit({ content: true, version: true }).extend({
  content: z.string().nullable().optional(),
  snippet: z.string().nullable().optional(),
  audio_recording_ids: z.array(uuid).optional()
});
const collectionBase = z.object({
  id: uuid,
  title: z.string(),
  description: z.string().nullable(),
  created_at: date,
  updated_at: date
});
const collectionWrite = collectionBase.extend({ request_id: z.string().min(1) });
const collectionRead = collectionWrite.extend({ note_count: count });
const collectionItem = collectionBase.extend({ note_count: count });
const listNotes = request.extend({
  results: z.array(noteItem),
  total: count,
  next_page: z.string().min(1).nullable().optional()
});
const listCollections = request.extend({
  results: z.array(collectionItem),
  total: count,
  next_page: z.string().min(1).nullable().optional()
});
const searchNotes = request.extend({
  results: z.array(noteItem),
  total: count.max(100),
  snapshot_id: uuid,
  has_next_page: z.boolean(),
  offset: count,
  limit: count.min(1).max(50)
});
const searchCollections = request.extend({ results: z.array(collectionItem), total: count });

export type MemNote = z.infer<typeof noteWrite>;
export type MemCollection = z.infer<typeof collectionWrite>;
export type MemNoteResponse = MemNote;
export type MemCollectionResponse = MemCollection;
export type MemRequestIdResponse = z.infer<typeof request>;
export type MemListNotesResponse = z.infer<typeof listNotes>;
export type MemSearchNotesResponse = z.infer<typeof searchNotes>;
export type MemListCollectionsResponse = z.infer<typeof listCollections>;
export type MemSearchCollectionsResponse = z.infer<typeof searchCollections>;

const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'mem_validation_error' });
const malformed = () =>
  createApiServiceError(
    'Mem returned an unexpected response. For writes, inspect the exact note or collection before retrying; the operation may already have changed provider state.',
    { reason: 'mem_invalid_response' }
  );
const control = (value: string) =>
  [...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
function wellFormed(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(++index);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
    } else if (code >= 0xdc00 && code <= 0xdfff) return false;
  }
  return true;
}

export function validateMemToken(token: string): string {
  if (
    typeof token !== 'string' ||
    !token ||
    !wellFormed(token) ||
    token !== token.trim() ||
    control(token) ||
    /\s/.test(token) ||
    /^Bearer /i.test(token)
  )
    throw invalid(
      'Provide the raw nonempty Mem API key without a Bearer prefix, whitespace or control characters. Obtain the key from the API section in Mem settings.'
    );
  return token;
}
function id(value: string, label: string): string {
  if (!uuid.safeParse(value).success)
    throw invalid(
      `${label} must be an exact UUID from the corresponding create, get, list or search tool, not a URL or path.`
    );
  return value.toLowerCase();
}
function text(value: string, label: string, max: number, bytes = false): string {
  if (
    typeof value !== 'string' ||
    [...value].length > max ||
    (bytes && Buffer.byteLength(value, 'utf8') > max)
  )
    throw invalid(
      `${label} must contain at most ${max.toLocaleString('en-US')} characters${bytes ? ` and ${max.toLocaleString('en-US')} UTF-8 bytes` : ''}.`
    );
  return value;
}
function timestamp(value: string, label: string, notFuture = true): string {
  if (!date.safeParse(value).success || (notFuture && Date.parse(value) > Date.now()))
    throw invalid(
      `${label} must be an ISO 8601 timestamp with a timezone offset${notFuture ? ' and cannot be in the future' : ''}.`
    );
  return value;
}
function integer(value: number, label: string, min: number, max: number): number {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw invalid(`${label} must be an integer from ${min} through ${max}.`);
  return value;
}
function cursor(value: string): string {
  if (
    typeof value !== 'string' ||
    !wellFormed(value) ||
    !value.trim() ||
    control(value) ||
    value.length > 8192
  )
    throw invalid(
      'Use the unchanged nonempty nextPage cursor from a prior list response, or omit page for the first page.'
    );
  return value;
}
function sameTime(actual: string, expected: string | null | undefined): boolean {
  return expected == null || Date.parse(actual) === Date.parse(expected);
}
function exact<T extends { id: string }>(value: T, expected: string): T {
  if (value.id.toLowerCase() !== expected) throw malformed();
  return value;
}
type Paging = { limit?: number; page?: string | null; orderBy?: 'created_at' | 'updated_at' };
type NoteFilters = {
  collectionId?: string | null;
  containsOpenTasks?: boolean;
  containsTasks?: boolean;
  containsImages?: boolean;
  containsFiles?: boolean;
  includeNoteContent?: boolean;
};
function paging(params?: Paging) {
  const query = new URLSearchParams();
  if (params?.limit !== undefined)
    query.set('limit', String(integer(params.limit, 'limit', 1, 100)));
  if (params?.page != null) query.set('page', cursor(params.page));
  if (params?.orderBy !== undefined) {
    if (!['created_at', 'updated_at'].includes(params.orderBy))
      throw invalid('orderBy must be created_at or updated_at.');
    query.set('order_by', params.orderBy);
  }
  return query;
}
const route = (path: string, query: URLSearchParams) =>
  `${path}${query.size ? `?${query}` : ''}`;

export class MemClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  private secrets: string[];
  constructor(config: { token: string }) {
    const token = validateMemToken(config.token);
    this.secrets = [
      token,
      encodeURIComponent(token),
      Buffer.from(token).toString('base64'),
      Buffer.from(token).toString('base64url'),
      [...Buffer.from(token)].map(byte => `%${byte.toString(16).padStart(2, '0')}`).join(''),
      [...Buffer.from(token)]
        .map(byte => `%${byte.toString(16).padStart(2, '0').toUpperCase()}`)
        .join('')
    ];
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.mem.ai/v2',
      authHeader: { value: `Bearer ${token}` },
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: MAX_RESPONSE_BYTES,
      maxBodyLength: 2 * 1024 * 1024,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Mem',
          reason: 'mem_api_error',
          parent: {},
          extractMessage: () =>
            'Check the API key, permissions, exact identifiers, current note version, and rate or plan quotas. Inspect writes before retrying.',
          extractUpstreamCode: (_error, response, helpers) => {
            const payload = response?.data;
            if (!helpers.isRecord(payload) || !helpers.isRecord(payload.error))
              return undefined;
            return payload.error.type === 'quota_exceeded' ? 'quota_exceeded' : undefined;
          }
        })
    });
  }
  private containsCredential(serialized: string): boolean {
    const values = [
      serialized,
      ...[...serialized.matchAll(/"(?:\\.|[^"\\])*"/g)].map(
        match => JSON.parse(match[0]) as string
      )
    ];
    for (let value of values) {
      for (let round = 0; round <= 4; round++) {
        if (this.secrets.some(secret => value.includes(secret))) return true;
        for (const match of value.matchAll(/[A-Za-z0-9+/_-]{8,}={0,2}/g)) {
          if (
            this.secrets.some(secret =>
              Buffer.from(match[0], 'base64').toString('utf8').includes(secret)
            )
          )
            return true;
        }
        if (round === 4) break;
        try {
          const decoded = decodeURIComponent(value);
          if (decoded === value) break;
          value = decoded;
        } catch {
          break;
        }
      }
    }
    return false;
  }
  private parse<T>(schema: z.ZodType<T>, value: unknown): T {
    try {
      const serialized = JSON.stringify(value);
      if (
        typeof serialized !== 'string' ||
        Buffer.byteLength(serialized) > MAX_RESPONSE_BYTES ||
        this.containsCredential(serialized)
      )
        throw malformed();
      const parsed = schema.safeParse(value);
      if (!parsed.success) throw malformed();
      return parsed.data;
    } catch {
      throw malformed();
    }
  }
  private async request<T>(
    method: 'get' | 'post' | 'patch' | 'put' | 'delete',
    path: string,
    schema: z.ZodType<T>,
    data?: Record<string, unknown>
  ): Promise<T> {
    if (data !== undefined && this.containsCredential(JSON.stringify(data)))
      throw invalid(
        'Do not include the configured API key or an encoded form of it in note, collection or processing content. Remove the credential before submitting.'
      );
    const response = await this.http.request<unknown>({
      method,
      url: path,
      ...(data === undefined ? {} : { data })
    });
    if (response.status !== 200) throw malformed();
    return this.parse(schema, response.data);
  }
  async createNote(params: {
    content: string;
    noteId?: string | null;
    collectionIds?: string[] | null;
    collectionTitles?: string[] | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  }) {
    const body = pickDefined({
      content: text(params.content, 'content', 200000, true),
      id: params.noteId == null ? params.noteId : id(params.noteId, 'noteId'),
      collection_ids:
        params.collectionIds?.map(value => id(value, 'collectionIds entry')) ??
        params.collectionIds,
      collection_titles:
        params.collectionTitles?.map(value =>
          text(value, 'collectionTitles entry', 1000, true)
        ) ?? params.collectionTitles,
      created_at:
        params.createdAt == null ? params.createdAt : timestamp(params.createdAt, 'createdAt'),
      updated_at:
        params.updatedAt == null ? params.updatedAt : timestamp(params.updatedAt, 'updatedAt')
    });
    const value = await this.request('post', '/notes', noteWrite, body);
    if (body.id) exact(value, body.id);
    if (
      !sameTime(value.created_at, params.createdAt) ||
      !sameTime(value.updated_at, params.updatedAt)
    )
      throw malformed();
    return value;
  }
  async getNote(noteId: string) {
    const key = id(noteId, 'noteId');
    return exact(await this.request('get', `/notes/${key}`, noteRead), key);
  }
  async listNotes(params?: Paging & NoteFilters) {
    const query = paging(params);
    if (params?.collectionId != null)
      query.set('collection_id', id(params.collectionId, 'collectionId'));
    for (const [field, value] of Object.entries(
      pickDefined({
        contains_open_tasks: params?.containsOpenTasks,
        contains_tasks: params?.containsTasks,
        contains_images: params?.containsImages,
        contains_files: params?.containsFiles,
        include_note_content: params?.includeNoteContent
      })
    ))
      query.set(field, String(value));
    const value = await this.request('get', route('/notes', query), listNotes);
    if (
      params?.collectionId &&
      value.results.some(
        note =>
          !note.collection_ids.some(
            key => key.toLowerCase() === params.collectionId?.toLowerCase()
          )
      )
    )
      throw malformed();
    return value;
  }
  async searchNotes(params: {
    query?: string | null;
    filterByCollectionIds?: string[] | null;
    filterByContainsOpenTasks?: boolean;
    filterByContainsTasks?: boolean;
    filterByContainsImages?: boolean;
    filterByContainsFiles?: boolean;
    includeNoteContent?: boolean;
    limit?: number;
    offset?: number;
    snapshotId?: string;
  }) {
    if (typeof params.query !== 'string' || !params.query.trim())
      throw invalid(
        'Search Notes requires a non-whitespace query. Use list_notes for exhaustive chronological discovery.'
      );
    if (params.filterByCollectionIds?.length === 0)
      throw invalid(
        'Supply at least one collection filter, or omit filterByCollectionIds to search across accessible notes.'
      );
    const query = new URLSearchParams();
    if (params.limit !== undefined)
      query.set('limit', String(integer(params.limit, 'limit', 1, 50)));
    if (params.offset !== undefined)
      query.set(
        'offset',
        String(integer(params.offset, 'offset', 0, Number.MAX_SAFE_INTEGER))
      );
    if (params.snapshotId !== undefined)
      query.set('snapshot_id', id(params.snapshotId, 'snapshotId'));
    if ((params.offset ?? 0) > 0 && params.snapshotId === undefined)
      throw invalid(
        'Later search pages require the snapshotId returned by the first page. Reuse the same query and filters.'
      );
    const body = pickDefined({
      query: params.query,
      filter_by_collection_ids:
        params.filterByCollectionIds?.map(value => id(value, 'filterByCollectionIds entry')) ??
        params.filterByCollectionIds,
      filter_by_contains_open_tasks: params.filterByContainsOpenTasks,
      filter_by_contains_tasks: params.filterByContainsTasks,
      filter_by_contains_images: params.filterByContainsImages,
      filter_by_contains_files: params.filterByContainsFiles,
      config:
        params.includeNoteContent === undefined
          ? undefined
          : { include_note_content: params.includeNoteContent }
    });
    const value = await this.request('post', route('/notes/search', query), searchNotes, body);
    if (
      value.offset !== (params.offset ?? 0) ||
      (params.limit !== undefined && value.limit !== params.limit) ||
      (params.snapshotId !== undefined &&
        value.snapshot_id.toLowerCase() !== params.snapshotId.toLowerCase())
    )
      throw malformed();
    if (
      params.filterByCollectionIds &&
      value.results.some(
        note =>
          !note.collection_ids.some(key =>
            params.filterByCollectionIds?.some(
              filter => filter.toLowerCase() === key.toLowerCase()
            )
          )
      )
    )
      throw malformed();
    return value;
  }
  async deleteNote(noteId: string) {
    return this.request('delete', `/notes/${id(noteId, 'noteId')}`, request);
  }
  async updateNote(params: {
    noteId: string;
    content: string;
    version: number;
    updatedAt?: string | null;
  }) {
    const key = id(params.noteId, 'noteId');
    const version = integer(params.version, 'version', 1, Number.MAX_SAFE_INTEGER);
    const body = pickDefined({
      content: text(params.content, 'content', 200000),
      version,
      updated_at:
        params.updatedAt == null
          ? params.updatedAt
          : timestamp(params.updatedAt, 'updatedAt', false)
    });
    const before = await this.getNote(key);
    if (before.trashed_at !== null)
      throw invalid('This note is trashed. Restore it in Mem before updating.');
    if (before.version !== version)
      throw invalid(
        'The note version changed. Read get_note again, review the current content and submit its exact version; do not overwrite unseen changes.'
      );
    const value = exact(await this.request('patch', `/notes/${key}`, noteUpdated, body), key);
    if (
      value.version <= version ||
      value.content !== params.content ||
      value.trashed_at !== null ||
      !sameTime(value.updated_at, params.updatedAt)
    )
      throw malformed();
    return value;
  }
  async createCollection(params: {
    title: string;
    collectionId?: string | null;
    description?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  }) {
    const body = pickDefined({
      title: text(params.title, 'title', 1000, true),
      id:
        params.collectionId == null
          ? params.collectionId
          : id(params.collectionId, 'collectionId'),
      description:
        params.description == null
          ? params.description
          : text(params.description, 'description', 10000, true),
      created_at:
        params.createdAt == null ? params.createdAt : timestamp(params.createdAt, 'createdAt'),
      updated_at:
        params.updatedAt == null ? params.updatedAt : timestamp(params.updatedAt, 'updatedAt')
    });
    const value = await this.request('post', '/collections', collectionWrite, body);
    if (body.id) exact(value, body.id);
    if (
      value.title !== params.title ||
      (params.description !== undefined && value.description !== params.description) ||
      !sameTime(value.created_at, params.createdAt) ||
      !sameTime(value.updated_at, params.updatedAt)
    )
      throw malformed();
    return value;
  }
  async getCollection(collectionId: string) {
    const key = id(collectionId, 'collectionId');
    return exact(await this.request('get', `/collections/${key}`, collectionRead), key);
  }
  async listCollections(params?: Paging) {
    return this.request('get', route('/collections', paging(params)), listCollections);
  }
  async searchCollections(params: { query?: string | null }) {
    return this.request(
      'post',
      '/collections/search',
      searchCollections,
      pickDefined({ query: params.query })
    );
  }
  async deleteCollection(collectionId: string) {
    return this.request('delete', `/collections/${id(collectionId, 'collectionId')}`, request);
  }
  async updateCollection(params: {
    collectionId: string;
    title?: string;
    description?: string | null;
    updatedAt?: string | null;
  }) {
    const key = id(params.collectionId, 'collectionId');
    if (params.title === undefined && params.description === undefined)
      throw invalid(
        'Provide title or description to change the collection; omitted fields are preserved.'
      );
    const body = pickDefined({
      title: params.title === undefined ? undefined : text(params.title, 'title', 1000, true),
      description:
        params.description == null
          ? params.description
          : text(params.description, 'description', 10000, true),
      updated_at:
        params.updatedAt == null ? params.updatedAt : timestamp(params.updatedAt, 'updatedAt')
    });
    const before = await this.getCollection(key);
    const value = exact(
      await this.request('patch', `/collections/${key}`, collectionWrite, body),
      key
    );
    if (
      value.title !== (params.title ?? before.title) ||
      value.description !==
        (params.description === undefined ? before.description : params.description) ||
      !sameTime(value.updated_at, params.updatedAt)
    )
      throw malformed();
    return value;
  }
  async manageCollectionMembership(params: {
    action: 'add' | 'remove' | 'move';
    noteId: string;
    collectionId: string;
    targetCollectionId?: string;
  }) {
    const noteId = id(params.noteId, 'noteId'),
      sourceId = id(params.collectionId, 'collectionId');
    if (!['add', 'remove', 'move'].includes(params.action))
      throw invalid('action must be add, remove or move.');
    if (params.action !== 'move' && params.targetCollectionId !== undefined)
      throw invalid('targetCollectionId is only used by move.');
    const targetId =
      params.action === 'move'
        ? id(params.targetCollectionId ?? '', 'targetCollectionId')
        : undefined;
    if (targetId === sourceId)
      throw invalid('Move requires different source and target collections.');
    const before = await this.getNote(noteId);
    await this.getCollection(sourceId);
    if (targetId) await this.getCollection(targetId);
    if (
      params.action === 'move' &&
      !before.collection_ids.some(value => value.toLowerCase() === sourceId)
    )
      throw invalid('The note must currently belong to the source collection before moving.');
    const receipt = await this.request(
      params.action === 'add' ? 'put' : params.action === 'remove' ? 'delete' : 'post',
      `/collections/${sourceId}/notes/${noteId}${params.action === 'move' ? '/move' : ''}`,
      request,
      targetId ? { target_collection_id: targetId } : undefined
    );
    const after = await this.getNote(noteId),
      expected = new Set(before.collection_ids.map(value => value.toLowerCase()));
    if (params.action === 'add') expected.add(sourceId);
    else expected.delete(sourceId);
    if (targetId) expected.add(targetId);
    if (
      JSON.stringify([...expected].sort()) !==
        JSON.stringify(after.collection_ids.map(value => value.toLowerCase()).sort()) ||
      before.content !== after.content
    )
      throw malformed();
    return { ...receipt, note: after };
  }
  async memIt(params: {
    input: string;
    instructions?: string | null;
    context?: string | null;
    timestamp?: string | null;
  }) {
    return this.request(
      'post',
      '/mem-it',
      request,
      pickDefined({
        input: text(params.input, 'content', 1000000, true),
        instructions:
          params.instructions == null
            ? params.instructions
            : text(params.instructions, 'instructions', 10000, true),
        context:
          params.context == null ? params.context : text(params.context, 'context', 10000),
        timestamp:
          params.timestamp == null
            ? params.timestamp
            : timestamp(params.timestamp, 'timestamp', false)
      })
    );
  }
}
