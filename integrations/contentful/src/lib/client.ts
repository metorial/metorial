import { z } from 'zod';
import { type ApiMode, httpClient, origin, type Region, request } from './http';
import {
  assetFieldsSchema,
  contentTypeFieldsSchema,
  type Entity,
  entitySchema,
  invalid,
  malformed,
  parse,
  parseInput,
  resourceId,
  versionSchema
} from './schemas';
export interface ClientConfig {
  token: string;
  spaceId?: string;
  environmentId: string;
  region: Region;
  mode?: ApiMode;
}
export class ContentfulClient {
  readonly spaceId?: string;
  readonly environmentId: string;
  readonly mode: ApiMode;
  private token: string;
  private region: Region;
  private http: ReturnType<typeof httpClient>;
  constructor(config: ClientConfig) {
    this.token = config.token;
    this.spaceId = config.spaceId;
    this.environmentId = config.environmentId;
    this.region = config.region;
    this.mode = config.mode ?? 'management';
    this.http = httpClient(config.token, this.mode, config.region);
  }
  private management() {
    if (this.mode !== 'management')
      throw invalid(
        'This action requires a Content Management API PAT or OAuth token; Delivery and Preview credentials cannot perform it.'
      );
  }
  private segment(value: string) {
    return encodeURIComponent(parseInput(resourceId, value));
  }
  private envPath(path = '') {
    return `${this.spacePath()}/environments/${this.segment(this.environmentId)}${path}`;
  }
  private spacePath(path = '') {
    if (!this.spaceId) throw invalid('Choose a spaceId first.');
    return `/spaces/${this.segment(this.spaceId)}${path}`;
  }
  private version(value: number) {
    return { 'X-Contentful-Version': String(parseInput(versionSchema, value)) };
  }
  private async call(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
    params?: Record<string, unknown>,
    headers?: Record<string, string>,
    statuses = [200]
  ) {
    let response = await request(this.http, this.token, method, path, body, params, headers);
    if (!statuses.includes(response.status)) throw malformed();
    return response.data;
  }
  private bound(entity: Entity, type: string, id?: string) {
    if (entity.sys.type !== type || (id !== undefined && entity.sys.id !== id))
      throw malformed();
    if (this.spaceId && entity.sys.space && entity.sys.space.sys.id !== this.spaceId)
      throw malformed();
    if (entity.sys.environment && entity.sys.environment.sys.id !== this.environmentId)
      throw invalid(
        'The returned environment differs from the selected ID or alias. Supply the resolved environment ID and inspect the resource before retrying a write.'
      );
    if (
      ['Entry', 'Asset', 'ContentType', 'Release', 'ReleaseAction'].includes(type) &&
      (!entity.sys.space || !entity.sys.environment)
    )
      throw malformed();
    if (
      ['Entry', 'Asset'].includes(type) &&
      (!entity.fields || typeof entity.fields !== 'object' || Array.isArray(entity.fields))
    )
      throw malformed();
    if (type === 'Entry') {
      if (!entity.sys.contentType) throw malformed();
      for (let value of Object.values(entity.fields ?? {}))
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw malformed();
    }
    if (type === 'ContentType' && (!entity.name || !Array.isArray(entity.fields)))
      throw malformed();
    if (type === 'Asset') parse(assetFieldsSchema, entity.fields);
    if (type === 'ContentType') parse(contentTypeFieldsSchema, entity.fields);
    if (type === 'Tag' && !entity.name) throw malformed();
    if (
      type === 'Locale' &&
      (typeof entity.default !== 'boolean' || !entity.code || !entity.name)
    )
      throw malformed();
    if (type === 'Environment' && !entity.name) throw malformed();
    if (type === 'Release' && !entity.title) throw malformed();
    return entity;
  }
  private async entity(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    type: string,
    id?: string,
    body?: unknown,
    params?: Record<string, unknown>,
    headers?: Record<string, string>,
    statuses = [200]
  ) {
    let entity = this.bound(
      parse(entitySchema, await this.call(method, path, body, params, headers, statuses)),
      type,
      id
    );

    return entity;
  }
  private readParams(params: Record<string, unknown> = {}) {
    return this.mode === 'management' ? params : { ...params, locale: '*' };
  }
  private async page(path: string, type: string, params: Record<string, unknown> = {}) {
    let page = parse(
      z.object({
        items: z.array(entitySchema),
        total: z.number().int().min(0),
        skip: z.number().int().min(0).optional(),
        limit: z.number().int().min(0)
      }),
      await this.call('GET', path, undefined, params)
    );
    let skip = page.skip ?? 0;
    if (
      page.items.length > page.limit ||
      (page.items.length > 0 && page.items.length + skip > page.total) ||
      (page.skip !== undefined && params.skip !== undefined && skip !== params.skip) ||
      (!page.items.length && skip < page.total) ||
      new Set(page.items.map(e => e.sys.id)).size !== page.items.length
    )
      throw malformed();
    for (let entity of page.items) this.bound(entity, type);
    return {
      ...page,
      skip,
      nextSkip: skip + page.items.length < page.total ? skip + page.items.length : undefined,
      hasMore: skip + page.items.length < page.total
    };
  }
  private async removed(path: string, headers?: Record<string, string>) {
    this.management();
    await this.call('DELETE', path, undefined, undefined, headers, [204]);
  }
  private localized(fields: Record<string, unknown>) {
    for (let [key, value] of Object.entries(fields)) {
      this.segment(key);
      if (!value || typeof value !== 'object' || Array.isArray(value))
        throw invalid('Each field must be an object keyed by locale.');
      for (let locale of Object.keys(value)) this.segment(locale);
    }
    return fields;
  }
  async getCurrentUser() {
    this.management();
    return this.entity('GET', '/users/me', 'User');
  }
  async getSpaces(params: Record<string, unknown> = {}) {
    this.management();
    return this.page('/spaces', 'Space', params);
  }
  async getEntries(params: Record<string, unknown> = {}) {
    return this.page(this.envPath('/entries'), 'Entry', this.readParams(params));
  }
  async getEntry(id: string) {
    return this.entity(
      'GET',
      this.envPath(`/entries/${this.segment(id)}`),
      'Entry',
      id,
      undefined,
      this.readParams()
    );
  }
  async createEntry(contentTypeId: string, fields: Record<string, unknown>) {
    this.management();
    let entry = await this.entity(
      'POST',
      this.envPath('/entries'),
      'Entry',
      undefined,
      { fields: this.localized(fields) },
      undefined,
      { 'X-Contentful-Content-Type': parseInput(resourceId, contentTypeId) },
      [201]
    );
    if (entry.sys.contentType?.sys.id !== contentTypeId) throw malformed();
    return entry;
  }
  async updateEntry(id: string, fields: Record<string, unknown>, version: number) {
    this.management();
    let current = await this.getEntry(id);
    return this.entity(
      'PUT',
      this.envPath(`/entries/${this.segment(id)}`),
      'Entry',
      id,
      { fields: this.localized(fields), metadata: current.metadata },
      undefined,
      this.version(version)
    );
  }
  async getAssets(params: Record<string, unknown> = {}) {
    return this.page(this.envPath('/assets'), 'Asset', this.readParams(params));
  }
  async getAsset(id: string) {
    return this.entity(
      'GET',
      this.envPath(`/assets/${this.segment(id)}`),
      'Asset',
      id,
      undefined,
      this.readParams()
    );
  }
  async createAsset(fields: Record<string, unknown>) {
    this.management();
    this.localized(fields);
    return this.entity(
      'POST',
      this.envPath('/assets'),
      'Asset',
      undefined,
      { fields },
      undefined,
      undefined,
      [201]
    );
  }
  async processAsset(id: string, locale: string, version: number) {
    this.management();
    await this.call(
      'PUT',
      this.envPath(`/assets/${this.segment(id)}/files/${this.segment(locale)}/process`),
      null,
      undefined,
      this.version(version),
      [204]
    );
  }
  async getContentTypes(params: Record<string, unknown> = {}) {
    return this.page(this.envPath('/content_types'), 'ContentType', params);
  }
  async getContentType(id: string) {
    return this.entity(
      'GET',
      this.envPath(`/content_types/${this.segment(id)}`),
      'ContentType',
      id
    );
  }
  async createContentType(data: {
    name: string;
    description?: string;
    displayField?: string;
    fields: unknown[];
  }) {
    this.management();
    return this.entity(
      'POST',
      this.envPath('/content_types'),
      'ContentType',
      undefined,
      data,
      undefined,
      undefined,
      [201]
    );
  }
  async updateContentType(
    id: string,
    data: { name: string; description?: string; displayField?: string; fields: unknown[] },
    version: number
  ) {
    this.management();
    return this.entity(
      'PUT',
      this.envPath(`/content_types/${this.segment(id)}`),
      'ContentType',
      id,
      data,
      undefined,
      this.version(version)
    );
  }
  async deleteContentType(id: string) {
    await this.removed(this.envPath(`/content_types/${this.segment(id)}`));
  }
  async getTags(params: Record<string, unknown> = {}) {
    return this.page(this.envPath('/tags'), 'Tag', params);
  }
  async getTag(id: string) {
    return this.entity('GET', this.envPath(`/tags/${this.segment(id)}`), 'Tag', id);
  }
  async createTag(id: string, name: string, visibility = 'private') {
    this.management();
    return this.entity(
      'PUT',
      this.envPath(`/tags/${this.segment(id)}`),
      'Tag',
      id,
      { name, sys: { id, type: 'Tag', visibility } },
      undefined,
      undefined,
      [201]
    );
  }
  async updateTag(id: string, name: string, version: number) {
    this.management();
    let tag = await this.getTag(id);
    return this.entity(
      'PUT',
      this.envPath(`/tags/${this.segment(id)}`),
      'Tag',
      id,
      { name, sys: { id, type: 'Tag', visibility: tag.sys.visibility } },
      undefined,
      this.version(version),
      [200, 201]
    );
  }
  async deleteTag(id: string, version: number) {
    await this.removed(this.envPath(`/tags/${this.segment(id)}`), this.version(version));
  }
  async getLocales(params: Record<string, unknown> = {}) {
    return this.page(this.envPath('/locales'), 'Locale', params);
  }
  async getEnvironments(params: Record<string, unknown> = {}) {
    this.management();
    return this.page(this.spacePath('/environments'), 'Environment', params);
  }
  async getEnvironment(id: string) {
    this.management();
    return this.entity(
      'GET',
      this.spacePath(`/environments/${this.segment(id)}`),
      'Environment',
      id
    );
  }
  continuation(value: string, path: string) {
    let url: URL;
    try {
      url = new URL(value, origin(this.mode, this.region));
    } catch {
      throw malformed();
    }
    if (
      url.origin !== origin(this.mode, this.region) ||
      url.pathname !== path ||
      url.username ||
      url.password ||
      url.hash ||
      url.searchParams.has('access_token')
    )
      throw malformed();
    return url;
  }
  async sync(params: {
    initial?: boolean;
    syncToken?: string;
    type?: string;
    limit?: number;
  }) {
    if (this.mode !== 'delivery')
      throw invalid(
        'Sync requires a production Content Delivery API key. CMA and Preview tokens are not sync credentials.'
      );
    if (
      Number(params.initial === true) + Number(params.syncToken !== undefined) !== 1 ||
      (params.syncToken !== undefined &&
        (params.type !== undefined || params.limit !== undefined))
    )
      throw invalid(
        'Choose initial:true or a syncToken. Type and limit apply only to the initial request.'
      );
    if (
      params.type !== undefined &&
      !['all', 'Entry', 'Asset', 'Deletion', 'DeletedEntry', 'DeletedAsset'].includes(
        params.type
      )
    )
      throw invalid('Use a documented sync type.');
    let path = this.envPath('/sync');
    let page = parse(
      z.object({
        items: z.array(z.unknown()),
        nextPageUrl: z.string().optional(),
        nextSyncUrl: z.string().optional()
      }),
      await this.call(
        'GET',
        path,
        undefined,
        params.initial
          ? { initial: true, type: params.type, limit: params.limit }
          : { sync_token: params.syncToken }
      )
    );
    if (Number(page.nextPageUrl !== undefined) + Number(page.nextSyncUrl !== undefined) !== 1)
      throw malformed();
    let url = this.continuation((page.nextPageUrl ?? page.nextSyncUrl)!, path);
    if ([...url.searchParams.keys()].some(k => k !== 'sync_token')) throw malformed();
    let token = url.searchParams.get('sync_token');
    if (!token || (page.nextPageUrl && token === params.syncToken)) throw malformed();
    return {
      ...page,
      nextPageToken: page.nextPageUrl ? token : undefined,
      nextSyncToken: page.nextSyncUrl ? token : undefined,
      hasMore: !!page.nextPageUrl
    };
  }
  private async cursorPage(path: string, type: string, params: Record<string, unknown> = {}) {
    let next = params.nextPage;
    let query: Record<string, unknown> = { limit: params.limit };
    if (next !== undefined) {
      if (typeof next !== 'string') throw invalid('Use the exact nextPage URL.');
      let url = this.continuation(next, path);
      query = Object.fromEntries(url.searchParams);
    }
    let page = parse(
      z.object({
        items: z.array(entitySchema),
        limit: z.number().int().min(0),
        pages: z
          .object({ next: z.string().optional(), prev: z.string().optional() })
          .optional()
      }),
      await this.call('GET', path, undefined, query)
    );
    if (
      page.items.length > page.limit ||
      new Set(page.items.map(e => e.sys.id)).size !== page.items.length
    )
      throw malformed();
    for (let item of page.items) this.bound(item, type);
    if (page.pages?.next) {
      let url = this.continuation(page.pages.next, path);
      if (url.href === (typeof next === 'string' ? this.continuation(next, path).href : ''))
        throw malformed();
    }
    return { ...page, nextPage: page.pages?.next, hasMore: !!page.pages?.next };
  }
  async getReleases(params: Record<string, unknown> = {}) {
    this.management();
    return this.cursorPage(this.envPath('/releases'), 'Release', params);
  }
  async getRelease(id: string) {
    this.management();
    return this.entity('GET', this.envPath(`/releases/${this.segment(id)}`), 'Release', id);
  }
  async createRelease(data: { title: string; description?: string; entities: unknown[] }) {
    this.management();
    if (
      !data.entities.length ||
      data.entities.length > 200 ||
      new Set(data.entities.map(e => JSON.stringify(e))).size !== data.entities.length
    )
      throw invalid('Provide from 1 to 200 distinct Entry or Asset links.');
    if (data.description !== undefined)
      throw invalid(
        'The documented Release.v1 creation payload has no description field. Omit description and use title; no release was created.'
      );
    return this.entity(
      'POST',
      this.envPath('/releases'),
      'Release',
      undefined,
      { title: data.title, entities: { items: data.entities } },
      undefined,
      undefined,
      [201]
    );
  }
  async getReleaseAction(id: string, actionId: string) {
    this.management();
    let action = await this.entity(
      'GET',
      this.envPath(`/releases/${this.segment(id)}/actions/${this.segment(actionId)}`),
      'ReleaseAction',
      actionId
    );
    if (
      action.sys.release?.sys.id !== id ||
      typeof action.sys.status !== 'string' ||
      !['created', 'inProgress', 'failed', 'succeeded'].includes(action.sys.status)
    )
      throw malformed();
    return action;
  }
  private async releaseAction(id: string, version: number, action: 'publish' | 'unpublish') {
    this.management();
    let result = await this.entity(
      action === 'publish' ? 'PUT' : 'DELETE',
      this.envPath(`/releases/${this.segment(id)}/published`),
      'ReleaseAction',
      undefined,
      action === 'publish' ? null : undefined,
      undefined,
      this.version(version),
      [202]
    );
    if (
      result.sys.release?.sys.id !== id ||
      result.action !== action ||
      typeof result.sys.status !== 'string'
    )
      throw malformed();
    return result;
  }
  async publishRelease(id: string, version: number) {
    return this.releaseAction(id, version, 'publish');
  }
  async unpublishRelease(id: string, version: number) {
    return this.releaseAction(id, version, 'unpublish');
  }
  async deleteRelease(id: string) {
    await this.removed(this.envPath(`/releases/${this.segment(id)}`));
  }
  async getScheduledActions(params: Record<string, unknown> = {}) {
    this.management();
    let path = this.spacePath('/scheduled_actions');
    let { nextPage: next, ...filters } = params;
    let query = { ...filters, 'environment.sys.id': this.environmentId };
    if (typeof next === 'string') {
      let url = this.continuation(next, path);
      if (url.searchParams.get('environment.sys.id') !== this.environmentId) throw malformed();
      query = Object.fromEntries(url.searchParams) as typeof query;
    }
    let data = parse(
      z.object({
        items: z.array(entitySchema),
        pages: z
          .object({ next: z.string().optional(), prev: z.string().optional() })
          .optional(),
        limit: z.number().optional()
      }),
      await this.call('GET', path, undefined, query)
    );
    if (
      new Set(data.items.map(item => item.sys.id)).size !== data.items.length ||
      (data.limit !== undefined && data.items.length > data.limit)
    )
      throw malformed();
    for (let item of data.items) this.scheduledBinding(item);
    let nextResult = data.pages?.next;
    if (nextResult) {
      let url = this.continuation(nextResult, path);
      if (
        url.searchParams.get('environment.sys.id') !== this.environmentId ||
        !data.items.length ||
        (typeof next === 'string' && url.href === this.continuation(next, path).href)
      )
        throw malformed();
    }
    return { ...data, nextPage: nextResult, hasMore: !!nextResult };
  }
  private scheduledBinding(entity: Entity, id?: string) {
    this.bound(entity, 'ScheduledAction', id);
    if (
      entity.environment?.sys.id !== this.environmentId ||
      !entity.entity ||
      typeof entity.sys.status !== 'string'
    )
      throw malformed();
    return entity;
  }
  async getScheduledAction(id: string) {
    this.management();
    return this.scheduledBinding(
      await this.entity(
        'GET',
        this.spacePath(`/scheduled_actions/${this.segment(id)}`),
        'ScheduledAction',
        id,
        undefined,
        { 'environment.sys.id': this.environmentId }
      ),
      id
    );
  }
  async createScheduledAction(data: {
    entity: { sys: { type: string; linkType: string; id: string } };
    environment: { sys: { type: string; linkType: string; id: string } };
    action: string;
    scheduledFor: { datetime: string; timezone?: string };
  }) {
    this.management();
    let timestamp = Date.parse(data.scheduledFor.datetime);
    if (
      !z.string().datetime({ offset: true }).safeParse(data.scheduledFor.datetime).success ||
      timestamp <= Date.now() ||
      timestamp > Date.now() + 5 * 366 * 24 * 3600 * 1000
    )
      throw invalid(
        'Schedule a valid ISO 8601 timestamp with timezone in the future, no more than five years ahead.'
      );
    if (data.scheduledFor.timezone)
      try {
        new Intl.DateTimeFormat('en', { timeZone: data.scheduledFor.timezone });
      } catch {
        throw invalid('Use a valid IANA timezone identifier.');
      }
    await this.getEntry(data.entity.sys.id);
    let result = this.scheduledBinding(
      await this.entity(
        'POST',
        this.spacePath('/scheduled_actions'),
        'ScheduledAction',
        undefined,
        data,
        undefined,
        undefined,
        [201]
      )
    );
    if (
      result.entity?.sys.id !== data.entity.sys.id ||
      result.action !== data.action ||
      Date.parse(result.scheduledFor?.datetime ?? '') !== timestamp ||
      result.sys.status !== 'scheduled'
    )
      throw malformed();
    return result;
  }
  async cancelScheduledAction(id: string) {
    this.management();
    await this.getScheduledAction(id);
    let result = this.scheduledBinding(
      await this.entity(
        'DELETE',
        this.spacePath(`/scheduled_actions/${this.segment(id)}`),
        'ScheduledAction',
        id,
        undefined,
        { 'environment.sys.id': this.environmentId }
      ),
      id
    );
    if (result.sys.status !== 'canceled') throw malformed();
    return result;
  }
  async publishEntry(id: string, version: number) {
    this.management();
    let result = await this.entity(
      'PUT',
      this.envPath(`/entries/${this.segment(id)}/published`),
      'Entry',
      id,
      null,
      undefined,
      this.version(version)
    );
    if (!result.sys.publishedVersion) throw malformed();
    return result;
  }
  async unpublishEntry(id: string, version: number) {
    this.management();
    let result = await this.entity(
      'DELETE',
      this.envPath(`/entries/${this.segment(id)}/published`),
      'Entry',
      id,
      undefined,
      undefined,
      this.version(version)
    );
    if (result.sys.publishedVersion !== undefined) throw malformed();
    return result;
  }
  async archiveEntry(id: string, version: number) {
    this.management();
    let result = await this.entity(
      'PUT',
      this.envPath(`/entries/${this.segment(id)}/archived`),
      'Entry',
      id,
      null,
      undefined,
      this.version(version)
    );
    if (!result.sys.archivedAt) throw malformed();
    return result;
  }
  async unarchiveEntry(id: string, version: number) {
    this.management();
    let result = await this.entity(
      'DELETE',
      this.envPath(`/entries/${this.segment(id)}/archived`),
      'Entry',
      id,
      undefined,
      undefined,
      this.version(version)
    );
    if (result.sys.archivedAt !== undefined) throw malformed();
    return result;
  }
  async deleteEntry(id: string, version: number) {
    await this.removed(this.envPath(`/entries/${this.segment(id)}`), this.version(version));
  }
  async publishAsset(id: string, version: number) {
    this.management();
    let result = await this.entity(
      'PUT',
      this.envPath(`/assets/${this.segment(id)}/published`),
      'Asset',
      id,
      null,
      undefined,
      this.version(version)
    );
    if (!result.sys.publishedVersion) throw malformed();
    return result;
  }
  async unpublishAsset(id: string, version: number) {
    this.management();
    let result = await this.entity(
      'DELETE',
      this.envPath(`/assets/${this.segment(id)}/published`),
      'Asset',
      id,
      undefined,
      undefined,
      this.version(version)
    );
    if (result.sys.publishedVersion !== undefined) throw malformed();
    return result;
  }
  async archiveAsset(id: string, version: number) {
    this.management();
    let result = await this.entity(
      'PUT',
      this.envPath(`/assets/${this.segment(id)}/archived`),
      'Asset',
      id,
      null,
      undefined,
      this.version(version)
    );
    if (!result.sys.archivedAt) throw malformed();
    return result;
  }
  async unarchiveAsset(id: string, version: number) {
    this.management();
    let result = await this.entity(
      'DELETE',
      this.envPath(`/assets/${this.segment(id)}/archived`),
      'Asset',
      id,
      undefined,
      undefined,
      this.version(version)
    );
    if (result.sys.archivedAt !== undefined) throw malformed();
    return result;
  }
  async deleteAsset(id: string, version: number) {
    await this.removed(this.envPath(`/assets/${this.segment(id)}`), this.version(version));
  }
  async publishContentType(id: string, version: number) {
    this.management();
    let result = await this.entity(
      'PUT',
      this.envPath(`/content_types/${this.segment(id)}/published`),
      'ContentType',
      id,
      null,
      undefined,
      this.version(version)
    );
    if (!result.sys.publishedVersion) throw malformed();
    return result;
  }
  async unpublishContentType(id: string, version: number) {
    this.management();
    let result = await this.entity(
      'DELETE',
      this.envPath(`/content_types/${this.segment(id)}/published`),
      'ContentType',
      id,
      undefined,
      undefined,
      this.version(version)
    );
    if (result.sys.publishedVersion !== undefined) throw malformed();
    return result;
  }
}
