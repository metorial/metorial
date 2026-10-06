import { getCurrentContext, pickDefined, requestAxios } from 'slates';
import { z } from 'zod';
import { adaptError, assertPrivateReceipt, authenticatedHttp } from './http';
import {
  answerSchema,
  groupPageSchema,
  groupSchema,
  indexPageSchema,
  invalid,
  malformed,
  meSchema,
  noteContentSchema,
  notePageSchema,
  noteSchema,
  parse,
  processingSchema,
  resourceId,
  searchPageSchema,
  sourceSchema,
  threadSchema,
  userPageSchema,
  userSchema
} from './schemas';

export interface CreateNoteParams {
  title: string;
  parentNoteId?: string;
  templateId?: string;
  markdown?: string;
  html?: string;
  sliteml?: string;
  attributes?: Array<string | null>;
}

export interface UpdateNoteParams {
  title?: string;
  markdown?: string;
  html?: string;
  sliteml?: string;
  attributes?: Array<string | null>;
}

export interface SearchNotesParams {
  query?: string;
  parentNoteId?: string;
  depth?: number;
  reviewState?: string;
  page?: number;
  hitsPerPage?: number;
  highlightPreTag?: string;
  highlightPostTag?: string;
  lastEditedAfter?: string;
  lastUpdatedAfter?: string;
  includeArchived?: boolean;
}

export interface ListNotesParams {
  ownerId?: string;
  parentNoteId?: string;
  orderBy?: string;
  cursor?: string;
}

export interface AskParams {
  question: string;
  parentNoteId?: string;
  assistantId?: string;
}

export interface IndexCustomContentParams {
  rootId: string;
  contentId: string;
  title: string;
  content: string;
  type: 'markdown' | 'html';
  updatedAt: string;
  url: string;
}

export interface UpdateTileParams {
  title?: string | null;
  iconURL?: string | null;
  status?: { label: string; colorHex?: string | null } | null;
  url?: string | null;
  content?: string | null;
}

export interface KnowledgeManagementParams {
  reviewStateList?: string[];
  ownerIdList?: string[];
  channelIdList?: string[];
  sinceDaysAgo?: number;
  first?: number;
  cursor?: string;
}

export class Client {
  private http;
  private privacy;
  constructor(token: string) {
    this.http = authenticatedHttp(token);
    this.privacy = assertPrivateReceipt(token);
  }
  private segment(value: string) {
    const id = resourceId.safeParse(value);
    if (!id.success)
      throw invalid(
        'Provide an exact resource ID containing valid Unicode text, without whitespace or control characters.'
      );
    return encodeURIComponent(id.data);
  }
  private async request<T extends z.ZodType>(
    schema: T,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
    params?: Record<string, unknown>,
    statuses = [200],
    timeout = 30000
  ) {
    if (body !== undefined && Buffer.byteLength(JSON.stringify(body)) > 1024 * 1024)
      throw invalid(
        'The request exceeds Slite’s documented 1 MiB limit. Reduce the content before writing.'
      );
    let response = await requestAxios(
      `${method} Slite API request`,
      () =>
        this.http.request<unknown>({
          method,
          url: path,
          data: body,
          params,
          timeout,
          paramsSerializer: { indexes: null }
        }),
      (error, operation) => {
        this.privacy(getCurrentContext().getHttpTraces());
        return adaptError(error, operation);
      }
    );
    this.privacy(getCurrentContext().getHttpTraces());
    this.privacy(response.data);
    if (!statuses.includes(response.status)) throw malformed();
    return { data: parse(schema, response.data), status: response.status };
  }
  private async value<T extends z.ZodType>(
    schema: T,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
    params?: Record<string, unknown>
  ) {
    return (await this.request(schema, method, path, body, params)).data;
  }
  private exact(actual: string, expected: string) {
    if (actual !== expected) throw malformed();
  }
  private writeBody(params: Record<string, unknown>) {
    let body = pickDefined(params);
    if (!Object.keys(body).length) throw invalid('Provide at least one field to update.');
    return body;
  }
  private representations(params: { markdown?: string; html?: string; sliteml?: string }) {
    if (
      [params.markdown, params.html, params.sliteml].filter(value => value !== undefined)
        .length > 1
    )
      throw invalid('Choose exactly one content representation: markdown, html, or sliteml.');
  }
  private cursorPage<
    T extends { total: number; hasNextPage: boolean; nextCursor: string | null }
  >(page: T, items: Array<{ id: string }>, cursor?: string) {
    if (
      items.length > page.total ||
      new Set(items.map(item => item.id)).size !== items.length ||
      (page.hasNextPage &&
        (!page.nextCursor?.trim() || page.nextCursor === cursor || !items.length))
    )
      throw malformed();
    return page;
  }
  private searchPage<T extends { hits: Array<{ id: string }>; page: number; nbPages: number }>(
    page: T,
    requested = 0,
    size = 100
  ) {
    if (
      page.page !== requested ||
      page.hits.length > size ||
      new Set(page.hits.map(item => item.id)).size !== page.hits.length ||
      (page.nbPages === 0 && page.hits.length) ||
      (page.nbPages > 0 && page.page >= page.nbPages && page.hits.length)
    )
      throw malformed();
    return page;
  }
  private searchParams(params: Record<string, unknown>) {
    if (
      params.page !== undefined &&
      (!Number.isSafeInteger(params.page) || Number(params.page) < 0)
    )
      throw invalid('Use a nonnegative integer page.');
    if (
      params.hitsPerPage !== undefined &&
      (!Number.isSafeInteger(params.hitsPerPage) ||
        Number(params.hitsPerPage) < 1 ||
        Number(params.hitsPerPage) > 100)
    )
      throw invalid('Use a page size from 1 to 100.');
    return pickDefined(params);
  }
  private confirmFields(
    note: z.output<typeof noteSchema>,
    params: { title?: string; attributes?: Array<string | null> }
  ) {
    if (params.title !== undefined && note.title !== params.title) throw malformed();
    if (
      params.attributes !== undefined &&
      (!note.attributes ||
        params.attributes.some(
          (value, index) => value !== null && note.attributes?.[index] !== value
        ))
    )
      throw invalid(
        'Slite did not confirm the requested collection attributes. It can ignore values whose types do not match the columns; inspect the note before retrying.'
      );
    return note;
  }
  async createNote(params: CreateNoteParams) {
    this.representations(params);
    for (let id of [params.parentNoteId, params.templateId])
      if (id !== undefined) this.segment(id);
    let note = await this.value(noteSchema, 'POST', '/notes', pickDefined(params));
    if (params.parentNoteId !== undefined)
      this.exact(note.parentNoteId ?? '', params.parentNoteId);
    return this.confirmFields(note, params);
  }
  async getNote(
    noteId: string,
    format: 'md' | 'html' | 'sliteml' = 'md',
    selectors: { css?: 'inline' | 'none'; compact?: boolean } = {}
  ) {
    if (selectors.css !== undefined && format !== 'html')
      throw invalid('css applies only to HTML content.');
    if (selectors.compact !== undefined && format !== 'sliteml')
      throw invalid('compact applies only to SliteML content.');
    let result = await this.value(
      noteContentSchema,
      'GET',
      `/notes/${this.segment(noteId)}`,
      undefined,
      pickDefined({ format, ...selectors })
    );
    this.exact(result.id, noteId);
    return result;
  }
  async updateNote(noteId: string, params: UpdateNoteParams) {
    this.representations(params);
    let result = await this.value(
      noteSchema,
      'PUT',
      `/notes/${this.segment(noteId)}`,
      this.writeBody({ ...params })
    );
    this.exact(result.id, noteId);
    return this.confirmFields(result, params);
  }
  async deleteNote(noteId: string) {
    await this.request(
      z.unknown(),
      'DELETE',
      `/notes/${this.segment(noteId)}`,
      undefined,
      undefined,
      [204]
    );
    try {
      await this.getNote(noteId);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'data' in error &&
        typeof error.data === 'object' &&
        error.data !== null &&
        'upstreamStatus' in error.data &&
        error.data.upstreamStatus === 404
      )
        return;
      throw error;
    }
    throw invalid(
      'The note is still readable after deletion. Deletion is unresolved; inspect its state before retrying.'
    );
  }
  async getNoteChildren(noteId: string, cursor?: string) {
    let page = await this.value(
      notePageSchema,
      'GET',
      `/notes/${this.segment(noteId)}/children`,
      undefined,
      pickDefined({ cursor })
    );
    if (page.notes.some(note => note.parentNoteId !== noteId)) throw malformed();
    return this.cursorPage(page, page.notes, cursor);
  }
  async listNotes(params: ListNotesParams = {}) {
    for (let id of [params.ownerId, params.parentNoteId])
      if (id !== undefined) this.segment(id);
    let page = await this.value(
      notePageSchema,
      'GET',
      '/notes',
      undefined,
      pickDefined({ ...params })
    );
    if (
      params.parentNoteId !== undefined &&
      page.notes.some(note => note.parentNoteId !== params.parentNoteId)
    )
      throw malformed();
    return this.cursorPage(page, page.notes, params.cursor);
  }
  async searchNotes(params: SearchNotesParams) {
    return this.searchPage(
      await this.value(
        searchPageSchema,
        'GET',
        '/search-notes',
        undefined,
        this.searchParams({ ...params })
      ),
      params.page,
      params.hitsPerPage
    );
  }
  async ask(params: AskParams) {
    for (let id of [params.parentNoteId, params.assistantId])
      if (id !== undefined) this.segment(id);
    if (!params.question.trim()) throw invalid('Provide a nonempty question.');
    let response = await this.request(
      z.unknown(),
      'GET',
      '/ask',
      undefined,
      pickDefined({ ...params, wait: false }),
      [200, 202],
      65000
    );
    if (response.status === 202)
      return { ...parse(processingSchema, response.data), sources: [] };
    return { ...parse(answerSchema, response.data), status: 'completed' as const };
  }
  async getAskThread(threadId: string) {
    let response = await this.request(
      threadSchema,
      'GET',
      `/threads/${this.segment(threadId)}`,
      undefined,
      undefined,
      [200, 202]
    );
    this.exact(response.data.threadId, threadId);
    if (response.status === 202 && response.data.status !== 'processing') throw malformed();
    return response.data;
  }
  private async lifecycle(noteId: string, action: string, body: Record<string, unknown>) {
    let note = await this.value(
      noteSchema,
      'PUT',
      `/notes/${this.segment(noteId)}/${action}`,
      body
    );
    this.exact(note.id, noteId);
    return note;
  }
  async verifyNote(noteId: string, until?: string | null) {
    if (
      until !== undefined &&
      until !== null &&
      !z.string().datetime({ offset: true }).safeParse(until).success
    )
      throw invalid('verifyUntil must be an ISO 8601 date and time with a timezone.');
    let note = await this.lifecycle(noteId, 'verify', { until: until ?? null });
    if (note.reviewState === undefined) note = await this.getNote(noteId);
    if (note.reviewState !== 'Verified') throw malformed();
    return note;
  }
  async flagNoteAsOutdated(noteId: string, reason: string) {
    if (!reason.trim()) throw invalid('Provide a nonempty outdated reason.');
    let note = await this.lifecycle(noteId, 'flag-as-outdated', { reason });
    if (note.reviewState === undefined) note = await this.getNote(noteId);
    if (note.reviewState !== 'Outdated') throw malformed();
    return note;
  }
  async setNoteArchived(noteId: string, archived: boolean) {
    let note = await this.lifecycle(noteId, 'archived', { archived });
    if (archived ? !note.archivedAt : note.archivedAt !== null) throw malformed();
    return note;
  }
  async updateNoteOwner(noteId: string, owner: { userId?: string; groupId?: string }) {
    if (Number(owner.userId !== undefined) + Number(owner.groupId !== undefined) !== 1)
      throw invalid('Provide exactly one owner user ID or group ID.');
    let wanted = owner.userId ?? owner.groupId;
    this.segment(wanted!);
    let note = await this.lifecycle(noteId, 'owner', pickDefined(owner));
    if (note.owner === undefined) note = await this.getNote(noteId);
    if (note.owner?.userId !== owner.userId || note.owner?.groupId !== owner.groupId)
      throw malformed();
    return note;
  }
  async updateTile(noteId: string, tileId: string, params: UpdateTileParams) {
    await this.getNote(noteId);
    return this.value(
      z.object({ url: z.string() }),
      'PUT',
      `/notes/${this.segment(noteId)}/tiles/${this.segment(tileId)}`,
      this.writeBody({ ...params })
    );
  }
  async indexCustomContent(params: IndexCustomContentParams) {
    this.segment(params.rootId);
    this.segment(params.contentId);
    if (!z.string().datetime({ offset: true }).safeParse(params.updatedAt).success)
      throw invalid('contentUpdatedAt must be an ISO 8601 date and time with a timezone.');
    let source = await this.value(sourceSchema, 'POST', '/ask/index', {
      rootId: params.rootId,
      id: params.contentId,
      title: params.title,
      content: params.content,
      type: params.type,
      updatedAt: params.updatedAt,
      url: params.url
    });
    this.exact(source.id, params.contentId);
    if (
      source.title !== params.title ||
      source.url !== params.url ||
      Number.isNaN(Date.parse(source.updatedAt)) ||
      Date.parse(source.updatedAt) !== Date.parse(params.updatedAt)
    )
      throw malformed();
    return source;
  }
  async deleteCustomContent(rootId: string, contentId: string) {
    this.segment(rootId);
    this.segment(contentId);
    let receipt = await this.value(z.object({ ok: z.boolean() }), 'DELETE', '/ask/index', {
      rootId,
      id: contentId
    });
    if (!receipt.ok) throw malformed();
    return receipt;
  }
  async listCustomContent(rootId: string, page?: number, hitsPerPage?: number) {
    this.segment(rootId);
    return this.searchPage(
      await this.value(
        indexPageSchema,
        'GET',
        '/ask/index',
        undefined,
        this.searchParams({ rootId, page, hitsPerPage })
      ),
      page,
      hitsPerPage
    );
  }
  private async audit(path: string, params: KnowledgeManagementParams) {
    if (
      params.first !== undefined &&
      (!Number.isInteger(params.first) || params.first < 1 || params.first > 50)
    )
      throw invalid('first must be from 1 to 50.');
    if (
      params.sinceDaysAgo !== undefined &&
      (!Number.isFinite(params.sinceDaysAgo) || params.sinceDaysAgo < 0)
    )
      throw invalid('sinceDaysAgo must be nonnegative.');
    if (
      (path.endsWith('/inactive') || path.endsWith('/empty')) &&
      (params.reviewStateList !== undefined || params.sinceDaysAgo !== undefined)
    )
      throw invalid(
        'Inactive and empty audits do not accept reviewStateList or sinceDaysAgo.'
      );
    let page = await this.value(
      notePageSchema,
      'GET',
      path,
      undefined,
      pickDefined({ ...params })
    );
    return this.cursorPage(page, page.notes, params.cursor);
  }
  async listKnowledgeManagementNotes(params: KnowledgeManagementParams = {}) {
    return this.audit('/knowledge-management/notes', params);
  }
  async listPublicNotes(params: KnowledgeManagementParams = {}) {
    return this.audit('/knowledge-management/notes/public', params);
  }
  async listInactiveNotes(params: KnowledgeManagementParams = {}) {
    return this.audit('/knowledge-management/notes/inactive', params);
  }
  async listEmptyNotes(params: KnowledgeManagementParams = {}) {
    return this.audit('/knowledge-management/notes/empty', params);
  }
  async getUser(userId: string) {
    let user = await this.value(userSchema, 'GET', `/users/${this.segment(userId)}`);
    this.exact(user.id, userId);
    return user;
  }
  async searchUsers(query: string, includeArchived?: boolean, cursor?: string) {
    if (!query.trim()) throw invalid('Provide a nonempty user search query.');
    let page = await this.value(
      userPageSchema,
      'GET',
      '/users',
      undefined,
      pickDefined({ query, includeArchived, cursor })
    );
    return this.cursorPage(page, page.users, cursor);
  }
  async getGroup(groupId: string) {
    let group = await this.value(groupSchema, 'GET', `/groups/${this.segment(groupId)}`);
    this.exact(group.id, groupId);
    return group;
  }
  async searchGroups(query: string, cursor?: string) {
    if (!query.trim()) throw invalid('Provide a nonempty group search query.');
    let page = await this.value(
      groupPageSchema,
      'GET',
      '/groups',
      undefined,
      pickDefined({ query, cursor })
    );
    return this.cursorPage(page, page.groups, cursor);
  }
  async getMe() {
    return this.value(meSchema, 'GET', '/me');
  }
}
