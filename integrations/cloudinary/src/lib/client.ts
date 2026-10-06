import { Buffer } from 'node:buffer';
import { createAxios, pickDefined } from 'slates';
import { z } from 'zod';
import {
  type CloudinaryConfig,
  type CloudinaryFolderListResult,
  type CloudinaryListResult,
  type CloudinaryResource,
  type CloudinarySearchResult,
  deleteSchema,
  folderSchema,
  resourceSchema,
  usageSchema
} from './types';
import {
  apiError,
  credentials,
  fail,
  ids,
  page,
  pairs,
  parse,
  privateResponse,
  type Row,
  row,
  segment,
  tags,
  text
} from './validation';

const nativeResource = z.object({
  asset_id: z.string().min(1),
  public_id: z.string().min(1),
  format: z.string().optional(),
  version: z.number().int().nonnegative().safe().optional(),
  resource_type: z.string().optional(),
  type: z.string().optional(),
  created_at: z.string().optional(),
  bytes: z.number().int().nonnegative().safe().optional(),
  width: z.number().int().nonnegative().safe().optional(),
  height: z.number().int().nonnegative().safe().optional(),
  folder: z.string().optional(),
  asset_folder: z.string().optional(),
  display_name: z.string().optional(),
  url: z.string().optional(),
  secure_url: z.string().optional(),
  tags: z.array(z.string()).optional(),
  context: z.object({ custom: z.record(z.string(), z.string()).optional() }).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  access_mode: z.string().optional(),
  original_filename: z.string().optional(),
  moderation: z.array(z.object({ kind: z.string().optional(), status: z.string() })).optional()
});
export function normalizeResource(value: unknown): CloudinaryResource {
  const raw = parse(nativeResource, value);
  return parse(
    resourceSchema,
    pickDefined({
      assetId: raw.asset_id,
      publicId: raw.public_id,
      format: raw.format,
      version: raw.version,
      resourceType: raw.resource_type,
      type: raw.type,
      createdAt: raw.created_at,
      bytes: raw.bytes,
      width: raw.width,
      height: raw.height,
      folder: raw.folder,
      assetFolder: raw.asset_folder,
      displayName: raw.display_name,
      url: raw.url,
      secureUrl: raw.secure_url,
      tags: raw.tags,
      context: raw.context?.custom,
      metadata: raw.metadata,
      accessMode: raw.access_mode,
      originalFilename: raw.original_filename,
      moderation: raw.moderation
    })
  );
}
export class Client {
  private readonly api: ReturnType<typeof createAxios>;
  readonly baseUrl: string;
  constructor(private readonly config: CloudinaryConfig) {
    if (!/^[a-z0-9_-]+$/i.test(config.cloudName))
      fail(
        'Cloud name must be the Cloudinary product-environment name, without a URL or path.'
      );
    if (!['us', 'eu', 'ap'].includes(config.region))
      fail('Choose the configured Cloudinary data center: us, eu or ap.');
    const hosts = {
      us: 'api.cloudinary.com',
      eu: 'api-eu.cloudinary.com',
      ap: 'api-ap.cloudinary.com'
    };
    this.baseUrl = `https://${hosts[config.region]}/v1_1/${config.cloudName}`;
    this.api = createAxios({
      baseURL: this.baseUrl,
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 16 * 1024 * 1024,
      headers: {
        Authorization: credentials(config.apiKey, config.apiSecret),
        Accept: 'application/json'
      }
    });
  }
  private async request(
    method: 'get' | 'post' | 'delete',
    path: string,
    data?: Row | FormData | string,
    params?: Row,
    json = false
  ): Promise<unknown> {
    let response: { status: number; data: unknown };
    try {
      response = await this.api.request<unknown>({
        method,
        url: path,
        data:
          data instanceof FormData
            ? data
            : data === undefined
              ? undefined
              : typeof data === 'string'
                ? data
                : pickDefined(data),
        params: params ? pickDefined(params) : undefined,
        headers: json
          ? { 'Content-Type': 'application/json' }
          : typeof data === 'string'
            ? { 'Content-Type': 'application/x-www-form-urlencoded' }
            : undefined
      });
    } catch (error) {
      apiError(error, `${method.toUpperCase()} request`);
    }
    if (response.status < 200 || response.status >= 300 || response.status === 202)
      fail(
        'Cloudinary did not confirm a completed request. Read the asset state before retrying.',
        'cloudinary_unconfirmed_response'
      );
    let value = row(response.data);
    if (path === '/config') value = { cloud_name: value.cloud_name, settings: value.settings };
    if (value.error !== undefined)
      apiError({ response: { status: response.status } }, `${method.toUpperCase()} request`);
    return privateResponse(value, {
      token: this.config.apiKey,
      apiSecret: this.config.apiSecret
    });
  }
  private form(value: Row): string {
    const form = new URLSearchParams();
    for (const [key, val] of Object.entries(pickDefined(value))) {
      if (Array.isArray(val)) for (const item of val) form.append(`${key}[]`, String(item));
      else form.append(key, String(val));
    }
    return form.toString();
  }
  private route(resourceType = 'image', type = 'upload') {
    if (
      !['image', 'video', 'raw'].includes(resourceType) ||
      !['upload', 'fetch', 'private', 'authenticated'].includes(type)
    )
      fail('Use a supported resource type and delivery type.');
    return `/resources/${resourceType}/${type}`;
  }
  async upload(params: {
    file: string;
    resourceType?: string;
    publicId?: string;
    folder?: string;
    assetFolder?: string;
    displayName?: string;
    tags?: string[];
    context?: Record<string, string>;
    metadata?: Record<string, string>;
    transformation?: string;
    overwrite?: boolean;
    eager?: string;
    format?: string;
  }) {
    text(params.file, 'file');
    if (!/^(?:https?:\/\/|s3:\/\/|gs:\/\/|ftp:\/\/|data:[^,]+;base64,)/i.test(params.file))
      fail(
        'file must be a supported remote URL or base64 data URI; local file paths are not supported.'
      );
    if (params.file.startsWith('data:') && params.file.length > 62910000)
      fail('The base64 data URI exceeds the documented upload size limit.');
    const rt = params.resourceType ?? 'auto';
    if (!['image', 'video', 'raw', 'auto'].includes(rt))
      fail('Choose image, video, raw or auto.');
    if (params.publicId !== undefined) segment(params.publicId, 'Public ID');
    for (const value of [
      params.folder,
      params.assetFolder,
      params.displayName,
      params.transformation,
      params.eager,
      params.format
    ])
      if (value !== undefined) text(value, 'Upload option');
    if (params.folder !== undefined && params.assetFolder !== undefined)
      fail(
        'Use folder for fixed folder mode or assetFolder for dynamic folder mode, rather than both.'
      );
    const form = new FormData();
    const values = pickDefined({
      file: params.file,
      public_id: params.publicId,
      folder: params.folder,
      asset_folder: params.assetFolder,
      display_name: params.displayName,
      tags: params.tags === undefined ? undefined : tags(params.tags),
      context: params.context === undefined ? undefined : pairs(params.context),
      metadata: params.metadata === undefined ? undefined : pairs(params.metadata, 'metadata'),
      transformation: params.transformation,
      overwrite: params.overwrite,
      eager: params.eager,
      format: params.format
    });
    for (const [key, val] of Object.entries(values)) form.append(key, String(val));
    return normalizeResource(await this.request('post', `/${rt}/upload`, form));
  }
  async rename(
    from: string,
    to: string,
    resourceType = 'image',
    overwrite?: boolean,
    type = 'upload'
  ) {
    this.route(resourceType, type);
    segment(from, 'Public ID');
    segment(to, 'New public ID');
    if (type === 'fetch')
      fail('Cloudinary rename supports upload, private and authenticated assets.');
    const result = normalizeResource(
      await this.request(
        'post',
        `/${resourceType}/rename`,
        this.form({ from_public_id: from, to_public_id: to, type, overwrite })
      )
    );
    if (result.publicId !== to)
      fail(
        'Cloudinary did not confirm the requested new public ID. Read the asset by immutable ID before retrying.',
        'cloudinary_unconfirmed_mutation'
      );
    return result;
  }
  async manageTags(params: {
    publicIds: string[];
    tag: string;
    command: 'add' | 'remove' | 'replace' | 'set_exclusive' | 'remove_all';
    resourceType?: string;
  }) {
    const rt = params.resourceType ?? 'image';
    this.route(rt);
    ids(params.publicIds, 1000);
    const tagList = params.command === 'remove_all' ? [] : text(params.tag, 'tag').split(',');
    tags(tagList);
    if (tagList.length * params.publicIds.length > 1000)
      fail('Cloudinary supports at most 1000 tag operations per request.');
    const raw = row(
      await this.request(
        'post',
        `/${rt}/tags`,
        this.form({
          public_ids: params.publicIds,
          command: params.command,
          tag: params.command === 'remove_all' ? undefined : params.tag
        })
      )
    );
    const result = parse(z.object({ public_ids: z.array(z.string()) }), raw);
    if (
      new Set(result.public_ids).size !== result.public_ids.length ||
      result.public_ids.some(id => !params.publicIds.includes(id))
    )
      fail(
        'Cloudinary returned unexpected affected public IDs. Read current tags before retrying.',
        'cloudinary_unconfirmed_mutation'
      );
    return { publicIds: result.public_ids };
  }
  private list(value: unknown): CloudinaryListResult {
    const raw = parse(
      z.object({ resources: z.array(z.unknown()), next_cursor: z.string().optional() }),
      value
    );
    return { resources: raw.resources.map(normalizeResource), nextCursor: raw.next_cursor };
  }
  async listResources(params: {
    resourceType?: string;
    type?: string;
    prefix?: string;
    maxResults?: number;
    nextCursor?: string;
    tags?: boolean;
    context?: boolean;
    metadata?: boolean;
  }) {
    if (params.prefix !== undefined) text(params.prefix, 'prefix');
    return this.list(
      await this.request('get', this.route(params.resourceType, params.type), undefined, {
        ...page(params.maxResults, params.nextCursor),
        prefix: params.prefix,
        tags: params.tags,
        context: params.context,
        metadata: params.metadata
      })
    );
  }
  async listResourcesByTag(params: {
    tag: string;
    resourceType?: string;
    maxResults?: number;
    nextCursor?: string;
    tags?: boolean;
    context?: boolean;
  }) {
    const rt = params.resourceType ?? 'image';
    this.route(rt);
    return this.list(
      await this.request(
        'get',
        `/resources/${rt}/tags/${segment(params.tag, 'Tag')}`,
        undefined,
        {
          ...page(params.maxResults, params.nextCursor),
          tags: params.tags,
          context: params.context
        }
      )
    );
  }
  async getResource(publicId: string, resourceType = 'image', type = 'upload') {
    const result = normalizeResource(
      await this.request(
        'get',
        `${this.route(resourceType, type)}/${segment(publicId, 'Public ID')}`,
        undefined,
        { tags: true, context: true, metadata: true }
      )
    );
    if (
      result.publicId !== publicId ||
      (result.resourceType !== undefined && result.resourceType !== resourceType) ||
      (result.type !== undefined && result.type !== type)
    )
      fail(
        'Cloudinary returned a different asset locator. Confirm its immutable ID before continuing.',
        'cloudinary_invalid_identity'
      );
    return result;
  }
  async getResourceByAssetId(assetId: string) {
    const result = normalizeResource(
      await this.request('get', `/resources/${segment(assetId, 'Asset ID')}`, undefined, {
        tags: true,
        context: true,
        metadata: true
      })
    );
    if (result.assetId !== assetId)
      fail(
        'Cloudinary returned a different immutable asset ID.',
        'cloudinary_invalid_identity'
      );
    return result;
  }
  validateUpdate(params: {
    tags?: string[];
    context?: Record<string, string>;
    metadata?: Record<string, string>;
    assetFolder?: string;
    displayName?: string;
    moderationStatus?: string;
  }) {
    if (params.moderationStatus === 'pending')
      fail(
        'Cloudinary can set moderation status only to approved or rejected. pending is a read state; omit it or choose an approved/rejected update before renaming.'
      );
    for (const val of [params.assetFolder, params.displayName])
      if (val !== undefined) text(val, 'Update value');
    for (const val of [params.context, params.metadata])
      if (val !== undefined && Object.keys(val).length === 0)
        fail(
          'An empty metadata object does not define a documented update. Supply explicit key/value pairs.'
        );
    if (params.tags !== undefined) tags(params.tags);
    if (params.context !== undefined) pairs(params.context);
    if (params.metadata !== undefined) pairs(params.metadata, 'metadata');
  }
  async updateResource(
    publicId: string,
    params: {
      resourceType?: string;
      type?: string;
      tags?: string[];
      context?: Record<string, string>;
      metadata?: Record<string, string>;
      moderationStatus?: string;
      assetFolder?: string;
      displayName?: string;
    }
  ) {
    this.validateUpdate(params);
    const result = normalizeResource(
      await this.request(
        'post',
        `${this.route(params.resourceType, params.type)}/${segment(publicId, 'Public ID')}`,
        this.form({
          tags: params.tags === undefined ? undefined : tags(params.tags),
          context: params.context === undefined ? undefined : pairs(params.context),
          metadata:
            params.metadata === undefined ? undefined : pairs(params.metadata, 'metadata'),
          moderation_status: params.moderationStatus,
          asset_folder: params.assetFolder,
          display_name: params.displayName
        })
      )
    );
    if (result.publicId !== publicId)
      fail(
        'Cloudinary returned a different public ID after update. Read current state before retrying.',
        'cloudinary_unconfirmed_mutation'
      );
    return result;
  }
  private deletion(value: unknown) {
    const raw = parse(
      z.object({
        deleted: z.record(z.string(), z.string()),
        partial: z.boolean().optional(),
        next_cursor: z.string().optional()
      }),
      value
    );
    if (raw.partial === true && !raw.next_cursor)
      fail(
        'Cloudinary reported a partial deletion without a continuation cursor. Inspect remaining assets before retrying.',
        'cloudinary_unconfirmed_mutation'
      );
    return parse(
      deleteSchema,
      pickDefined({ deleted: raw.deleted, partial: raw.partial, nextCursor: raw.next_cursor })
    );
  }
  async deleteResources(params: {
    publicIds: string[];
    resourceType?: string;
    type?: string;
  }) {
    ids(params.publicIds, 100);
    const result = this.deletion(
      await this.request(
        'delete',
        this.route(params.resourceType, params.type),
        this.form({ public_ids: params.publicIds })
      )
    );
    if (
      Object.keys(result.deleted).some(id => !params.publicIds.includes(id)) ||
      params.publicIds.some(id => !(id in result.deleted))
    )
      fail(
        'Cloudinary did not return an exact receipt for every requested public ID. Read asset state before retrying.',
        'cloudinary_unconfirmed_mutation'
      );
    return result;
  }
  async deleteResourcesByPrefix(params: {
    prefix: string;
    resourceType?: string;
    type?: string;
    nextCursor?: string;
  }) {
    text(params.prefix, 'prefix');
    const paging = page(undefined, params.nextCursor);
    return this.deletion(
      await this.request(
        'delete',
        this.route(params.resourceType, params.type),
        this.form({ prefix: params.prefix, ...paging })
      )
    );
  }
  async deleteResourcesByTag(params: {
    tag: string;
    resourceType?: string;
    nextCursor?: string;
  }) {
    const rt = params.resourceType ?? 'image';
    this.route(rt);
    return this.deletion(
      await this.request(
        'delete',
        `/resources/${rt}/tags/${segment(params.tag, 'Tag')}`,
        this.form(page(undefined, params.nextCursor))
      )
    );
  }
  async search(params: {
    expression?: string;
    sortBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
    maxResults?: number;
    nextCursor?: string;
    withField?: string[];
    aggregate?: string[];
  }): Promise<CloudinarySearchResult> {
    if (params.expression !== undefined) text(params.expression, 'expression');
    params.sortBy?.forEach(sort => text(sort.field, 'Sort field'));
    const raw = parse(
      z.object({
        resources: z.array(z.unknown()),
        total_count: z.number().int().nonnegative().safe(),
        time: z.number().nonnegative().optional(),
        next_cursor: z.string().optional(),
        aggregations: z.record(z.string(), z.unknown()).optional()
      }),
      await this.request(
        'post',
        '/resources/search',
        {
          ...page(params.maxResults, params.nextCursor),
          expression: params.expression,
          sort_by: params.sortBy?.map(sort => ({ [sort.field]: sort.direction })),
          with_field: params.withField,
          aggregate: params.aggregate
        },
        undefined,
        true
      )
    );
    return {
      resources: raw.resources.map(normalizeResource),
      totalCount: raw.total_count,
      time: raw.time,
      nextCursor: raw.next_cursor,
      aggregations: raw.aggregations
    };
  }
  private folders(value: unknown): CloudinaryFolderListResult {
    const raw = parse(
      z.object({
        folders: z.array(
          z.object({ name: z.string(), path: z.string(), external_id: z.string().optional() })
        ),
        next_cursor: z.string().optional(),
        total_count: z.number().int().nonnegative().safe().optional()
      }),
      value
    );
    return {
      folders: raw.folders.map(folder =>
        parse(
          folderSchema,
          pickDefined({ name: folder.name, path: folder.path, externalId: folder.external_id })
        )
      ),
      nextCursor: raw.next_cursor,
      totalCount: raw.total_count
    };
  }
  async listFolders(params?: { maxResults?: number; nextCursor?: string }) {
    return this.folders(
      await this.request(
        'get',
        '/folders',
        undefined,
        page(params?.maxResults, params?.nextCursor)
      )
    );
  }
  async listSubfolders(folder: string, params?: { maxResults?: number; nextCursor?: string }) {
    return this.folders(
      await this.request(
        'get',
        `/folders/${segment(folder, 'Folder path')}`,
        undefined,
        page(params?.maxResults, params?.nextCursor)
      )
    );
  }
  async createFolder(path: string) {
    const raw = row(await this.request('post', `/folders/${segment(path, 'Folder path')}`));
    const result = parse(folderSchema, {
      name: raw.name,
      path: raw.path,
      externalId: raw.external_id
    });
    if (result.path !== path)
      fail(
        'Cloudinary did not confirm the requested folder path. List its parent before retrying.',
        'cloudinary_unconfirmed_mutation'
      );
    return result;
  }
  async deleteFolder(path: string) {
    const raw = parse(
      z.object({ deleted: z.array(z.string()) }),
      await this.request('delete', `/folders/${segment(path, 'Folder path')}`)
    );
    if (raw.deleted.length !== 1 || raw.deleted[0] !== path)
      fail(
        'Cloudinary did not confirm deletion of the exact folder. List its parent before retrying.',
        'cloudinary_unconfirmed_mutation'
      );
    return raw;
  }
  async getEnvironmentContext() {
    const raw = parse(
      z.object({
        cloud_name: z.string().optional(),
        settings: z.object({ folder_mode: z.enum(['fixed', 'dynamic']).optional() }).optional()
      }),
      await this.request('get', '/config', undefined, { settings: true })
    );
    if (raw.cloud_name !== undefined && raw.cloud_name !== this.config.cloudName)
      fail(
        'Cloudinary returned a different product environment. Check the cloud name and credentials.',
        'cloudinary_invalid_identity'
      );
    return {
      configuredCloudName: this.config.cloudName,
      cloudName: raw.cloud_name,
      folderMode: raw.settings?.folder_mode,
      region: this.config.region
    };
  }
  async getUsage(date?: string) {
    if (date !== undefined) {
      const parsed = new Date(`${date}T00:00:00Z`),
        now = new Date(),
        earliest = new Date(now);
      earliest.setUTCMonth(earliest.getUTCMonth() - 3);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== date ||
        date > now.toISOString().slice(0, 10) ||
        date < earliest.toISOString().slice(0, 10)
      )
        fail('date must be a valid YYYY-MM-DD date within the last three months.');
    }
    const raw = row(await this.request('get', '/usage', undefined, { date }));
    const metric = (value: unknown) => {
      if (value === undefined) return undefined;
      const source = row(value);
      return { usage: source.usage, limit: source.limit, usedPercent: source.used_percent };
    };
    return parse(
      usageSchema,
      pickDefined({
        plan: raw.plan,
        lastUpdated: raw.last_updated,
        storage: metric(raw.storage),
        bandwidth: metric(raw.bandwidth),
        transformations: metric(raw.transformations),
        requests: raw.requests,
        resources: raw.resources,
        derivedResources: raw.derived_resources
      })
    );
  }
  downloadUrl(assetId: string) {
    segment(assetId, 'Asset ID');
    return `${this.baseUrl}/asset/download`;
  }
  async downloadContent(assetId: string, expectedBytes?: number) {
    const url = this.downloadUrl(assetId),
      limit = 64 * 1024 * 1024;
    if (expectedBytes === undefined)
      fail(
        'Cloudinary did not return the asset size needed to validate this older connection download. Read the asset again or reconnect to enable URL-based delivery.'
      );
    if (expectedBytes > limit)
      fail(
        'This older connection supports downloads up to 64 MiB. Reconnect to enable URL-based delivery for larger files.'
      );
    let response: { status: number; data: ArrayBuffer; headers: Record<string, unknown> };
    try {
      response = await this.api.get<ArrayBuffer>(url, {
        params: { asset_id: assetId, attachment: true },
        responseType: 'arraybuffer',
        maxContentLength: limit,
        maxRedirects: 0
      });
    } catch (error) {
      apiError(error, 'download');
    }
    if (response.status !== 200)
      fail('Cloudinary did not return the requested file.', 'cloudinary_invalid_download');
    const bytes = Buffer.from(response.data);
    if (!bytes.length || bytes.length > limit || bytes.length !== expectedBytes)
      fail(
        'Cloudinary returned an unexpected file size. Read the asset again before retrying.',
        'cloudinary_invalid_download'
      );
    privateResponse(bytes.toString('utf8'), {
      token: this.config.apiKey,
      apiSecret: this.config.apiSecret
    });
    const mime =
      typeof response.headers['content-type'] === 'string'
        ? response.headers['content-type'].split(';')[0]
        : 'application/octet-stream';
    return new Response(new Uint8Array(bytes), {
      headers: { 'content-type': mime ?? 'application/octet-stream' }
    });
  }
}
