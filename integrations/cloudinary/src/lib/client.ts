import { createAxios } from 'slates';
import type {
  CloudinaryConfig,
  CloudinaryFolder,
  CloudinaryFolderListResult,
  CloudinaryListResult,
  CloudinaryResource,
  CloudinarySearchResult,
  CloudinaryTrigger,
  CloudinaryUploadResponse
} from './types';

let getBaseUrl = (region: 'us' | 'eu' | 'ap'): string => {
  if (region === 'eu') return 'https://api-eu.cloudinary.com';
  if (region === 'ap') return 'https://api-ap.cloudinary.com';
  return 'https://api.cloudinary.com';
};

let toSnakeCase = (str: string): string =>
  str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

let keysToSnakeCase = (obj: Record<string, any>): Record<string, any> => {
  let result: Record<string, any> = {};
  for (let key of Object.keys(obj)) {
    result[toSnakeCase(key)] = obj[key];
  }
  return result;
};

let toCamelCase = (str: string): string =>
  str.replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase());

let keysToCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(keysToCamelCase);
  }
  if (obj !== null && typeof obj === 'object') {
    let result: Record<string, any> = {};
    for (let key of Object.keys(obj)) {
      result[toCamelCase(key)] = keysToCamelCase(obj[key]);
    }
    return result;
  }
  return obj;
};

let normalizeResource = (raw: any): CloudinaryResource => {
  let r = keysToCamelCase(raw);
  return {
    assetId: r.assetId ?? '',
    publicId: r.publicId ?? '',
    format: r.format ?? '',
    version: r.version ?? 0,
    resourceType: r.resourceType ?? '',
    type: r.type ?? '',
    createdAt: r.createdAt ?? '',
    bytes: r.bytes ?? 0,
    width: r.width,
    height: r.height,
    folder: r.folder ?? '',
    assetFolder: r.assetFolder,
    displayName: r.displayName,
    url: r.url ?? '',
    secureUrl: r.secureUrl ?? '',
    tags: r.tags,
    context: r.context,
    metadata: r.metadata,
    accessMode: r.accessMode
  };
};

let normalizeUploadResponse = (raw: any): CloudinaryUploadResponse => {
  let r = keysToCamelCase(raw);
  return {
    assetId: r.assetId ?? '',
    publicId: r.publicId ?? '',
    version: r.version ?? 0,
    versionId: r.versionId ?? '',
    signature: r.signature ?? '',
    width: r.width,
    height: r.height,
    format: r.format ?? '',
    resourceType: r.resourceType ?? '',
    createdAt: r.createdAt ?? '',
    tags: r.tags ?? [],
    bytes: r.bytes ?? 0,
    type: r.type ?? '',
    url: r.url ?? '',
    secureUrl: r.secureUrl ?? '',
    folder: r.folder ?? '',
    assetFolder: r.assetFolder,
    displayName: r.displayName,
    originalFilename: r.originalFilename
  };
};

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private cloudName: string;

  constructor(config: CloudinaryConfig) {
    this.cloudName = config.cloudName;
    let basicAuth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');

    this.axios = createAxios({
      baseURL: `${getBaseUrl(config.region)}/v1_1/${config.cloudName}`,
      headers: {
        Authorization: `Basic ${basicAuth}`
      }
    });
  }

  // ─── Upload API ───────────────────────────────────────────────

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
    notificationUrl?: string;
    eager?: string;
    format?: string;
  }): Promise<CloudinaryUploadResponse> {
    let resourceType = params.resourceType || 'auto';

    let formData: Record<string, any> = {
      file: params.file
    };
    if (params.publicId) formData.public_id = params.publicId;
    if (params.folder) formData.folder = params.folder;
    if (params.assetFolder) formData.asset_folder = params.assetFolder;
    if (params.displayName) formData.display_name = params.displayName;
    if (params.tags && params.tags.length > 0) formData.tags = params.tags.join(',');
    if (params.context) {
      formData.context = Object.entries(params.context)
        .map(([k, v]) => `${k}=${v}`)
        .join('|');
    }
    if (params.metadata) {
      formData.metadata = Object.entries(params.metadata)
        .map(([k, v]) => `${k}=${v}`)
        .join('|');
    }
    if (params.transformation) formData.transformation = params.transformation;
    if (params.overwrite !== undefined) formData.overwrite = params.overwrite;
    if (params.notificationUrl) formData.notification_url = params.notificationUrl;
    if (params.eager) formData.eager = params.eager;
    if (params.format) formData.format = params.format;

    let response = await this.axios.post(`/${resourceType}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return normalizeUploadResponse(response.data);
  }

  async destroy(
    publicId: string,
    resourceType?: string,
    type?: string
  ): Promise<{ result: string }> {
    let rt = resourceType || 'image';
    let formData: Record<string, any> = { public_id: publicId };
    if (type) formData.type = type;

    let response = await this.axios.post(`/${rt}/destroy`, formData);
    return response.data;
  }

  async rename(
    fromPublicId: string,
    toPublicId: string,
    resourceType?: string,
    overwrite?: boolean
  ): Promise<CloudinaryResource> {
    let rt = resourceType || 'image';
    let formData: Record<string, any> = {
      from_public_id: fromPublicId,
      to_public_id: toPublicId
    };
    if (overwrite !== undefined) formData.overwrite = overwrite;

    let response = await this.axios.post(`/${rt}/rename`, formData);
    return normalizeResource(response.data);
  }

  async manageTags(params: {
    publicIds: string[];
    tag: string;
    command: 'add' | 'remove' | 'replace' | 'set_exclusive' | 'remove_all';
    resourceType?: string;
  }): Promise<{ publicIds: string[] }> {
    let rt = params.resourceType || 'image';
    let formData: Record<string, any> = {
      tag: params.tag,
      public_ids: params.publicIds,
      command: params.command
    };

    let response = await this.axios.post(`/${rt}/tags`, formData);
    return { publicIds: response.data.public_ids ?? [] };
  }

  // ─── Admin API ────────────────────────────────────────────────

  async listResources(params?: {
    resourceType?: string;
    type?: string;
    prefix?: string;
    maxResults?: number;
    nextCursor?: string;
    tags?: boolean;
    context?: boolean;
    metadata?: boolean;
    moderations?: boolean;
  }): Promise<CloudinaryListResult> {
    let rt = params?.resourceType || 'image';
    let t = params?.type || 'upload';
    let query: Record<string, any> = {};
    if (params?.prefix) query.prefix = params.prefix;
    if (params?.maxResults) query.max_results = params.maxResults;
    if (params?.nextCursor) query.next_cursor = params.nextCursor;
    if (params?.tags) query.tags = true;
    if (params?.context) query.context = true;
    if (params?.metadata) query.metadata = true;
    if (params?.moderations) query.moderations = true;

    let response = await this.axios.get(`/resources/${rt}/${t}`, { params: query });
    return {
      resources: (response.data.resources || []).map(normalizeResource),
      nextCursor: response.data.next_cursor
    };
  }

  async listResourcesByTag(params: {
    tag: string;
    resourceType?: string;
    maxResults?: number;
    nextCursor?: string;
  }): Promise<CloudinaryListResult> {
    let rt = params.resourceType || 'image';
    let query: Record<string, any> = {};
    if (params.maxResults) query.max_results = params.maxResults;
    if (params.nextCursor) query.next_cursor = params.nextCursor;

    let response = await this.axios.get(`/resources/${rt}/tags/${params.tag}`, {
      params: query
    });
    return {
      resources: (response.data.resources || []).map(normalizeResource),
      nextCursor: response.data.next_cursor
    };
  }

  async getResource(
    publicId: string,
    resourceType?: string,
    type?: string
  ): Promise<CloudinaryResource> {
    let rt = resourceType || 'image';
    let t = type || 'upload';
    let response = await this.axios.get(`/resources/${rt}/${t}/${publicId}`, {
      params: { tags: true, context: true, metadata: true }
    });
    return normalizeResource(response.data);
  }

  async getResourceByAssetId(assetId: string): Promise<CloudinaryResource> {
    let response = await this.axios.get(`/resources/${assetId}`, {
      params: { tags: true, context: true, metadata: true }
    });
    return normalizeResource(response.data);
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
      accessControl?: Array<{ accessType: string; start?: string; end?: string }>;
      assetFolder?: string;
      displayName?: string;
    }
  ): Promise<CloudinaryResource> {
    let rt = params.resourceType || 'image';
    let t = params.type || 'upload';
    let body: Record<string, any> = {};
    if (params.tags) body.tags = params.tags;
    if (params.context) {
      body.context = Object.entries(params.context)
        .map(([k, v]) => `${k}=${v}`)
        .join('|');
    }
    if (params.metadata) {
      body.metadata = Object.entries(params.metadata)
        .map(([k, v]) => `${k}=${v}`)
        .join('|');
    }
    if (params.moderationStatus) body.moderation_status = params.moderationStatus;
    if (params.accessControl) body.access_control = params.accessControl.map(keysToSnakeCase);
    if (params.assetFolder) body.asset_folder = params.assetFolder;
    if (params.displayName) body.display_name = params.displayName;

    let response = await this.axios.post(`/resources/${rt}/${t}/${publicId}`, body);
    return normalizeResource(response.data);
  }

  async deleteResources(params: {
    publicIds: string[];
    resourceType?: string;
    type?: string;
  }): Promise<{ deleted: Record<string, string>; partial: boolean }> {
    let rt = params.resourceType || 'image';
    let t = params.type || 'upload';
    let response = await this.axios.delete(`/resources/${rt}/${t}`, {
      data: { public_ids: params.publicIds }
    });
    return {
      deleted: response.data.deleted ?? {},
      partial: response.data.partial ?? false
    };
  }

  async deleteResourcesByPrefix(params: {
    prefix: string;
    resourceType?: string;
    type?: string;
  }): Promise<{ deleted: Record<string, string>; partial: boolean }> {
    let rt = params.resourceType || 'image';
    let t = params.type || 'upload';
    let response = await this.axios.delete(`/resources/${rt}/${t}`, {
      data: { prefix: params.prefix }
    });
    return {
      deleted: response.data.deleted ?? {},
      partial: response.data.partial ?? false
    };
  }

  async deleteResourcesByTag(params: {
    tag: string;
    resourceType?: string;
  }): Promise<{ deleted: Record<string, string>; partial: boolean }> {
    let rt = params.resourceType || 'image';
    let response = await this.axios.delete(`/resources/${rt}/tags/${params.tag}`);
    return {
      deleted: response.data.deleted ?? {},
      partial: response.data.partial ?? false
    };
  }

  // ─── Search API ───────────────────────────────────────────────

  async search(params: {
    expression?: string;
    sortBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
    maxResults?: number;
    nextCursor?: string;
    withField?: string[];
    aggregate?: string[];
  }): Promise<CloudinarySearchResult> {
    let body: Record<string, any> = {};
    if (params.expression) body.expression = params.expression;
    if (params.sortBy) {
      body.sort_by = params.sortBy.map(s => ({ [s.field]: s.direction }));
    }
    if (params.maxResults) body.max_results = params.maxResults;
    if (params.nextCursor) body.next_cursor = params.nextCursor;
    if (params.withField) body.with_field = params.withField;
    if (params.aggregate) body.aggregate = params.aggregate;

    let response = await this.axios.post('/resources/search', body, {
      headers: { 'Content-Type': 'application/json' }
    });
    return {
      totalCount: response.data.total_count ?? 0,
      time: response.data.time ?? 0,
      nextCursor: response.data.next_cursor,
      resources: (response.data.resources || []).map(normalizeResource)
    };
  }

  // ─── Folders ──────────────────────────────────────────────────

  async listFolders(params?: {
    maxResults?: number;
    nextCursor?: string;
  }): Promise<CloudinaryFolderListResult> {
    let query: Record<string, any> = {};
    if (params?.maxResults) query.max_results = params.maxResults;
    if (params?.nextCursor) query.next_cursor = params.nextCursor;

    let response = await this.axios.get('/folders', { params: query });
    return {
      folders: (response.data.folders || []).map((f: any) => keysToCamelCase(f)),
      nextCursor: response.data.next_cursor,
      totalCount: response.data.total_count
    };
  }

  async listSubfolders(
    folder: string,
    params?: {
      maxResults?: number;
      nextCursor?: string;
    }
  ): Promise<CloudinaryFolderListResult> {
    let query: Record<string, any> = {};
    if (params?.maxResults) query.max_results = params.maxResults;
    if (params?.nextCursor) query.next_cursor = params.nextCursor;

    let response = await this.axios.get(`/folders/${folder}`, { params: query });
    return {
      folders: (response.data.folders || []).map((f: any) => keysToCamelCase(f)),
      nextCursor: response.data.next_cursor,
      totalCount: response.data.total_count
    };
  }

  async createFolder(path: string): Promise<CloudinaryFolder> {
    let response = await this.axios.post(`/folders/${path}`);
    return keysToCamelCase(response.data) as CloudinaryFolder;
  }

  async deleteFolder(path: string): Promise<{ deleted: string[] }> {
    let response = await this.axios.delete(`/folders/${path}`);
    return { deleted: response.data.deleted ?? [] };
  }

  // ─── Triggers (Webhook Notifications) ─────────────────────────

  async listTriggers(): Promise<CloudinaryTrigger[]> {
    let response = await this.axios.get('/notification_triggers');
    let triggers = response.data.notification_triggers || response.data || [];
    return triggers.map((t: any) => ({
      triggerId: t.id ?? t.trigger_id ?? '',
      notificationUrl: t.notification_url ?? t.url ?? '',
      eventType: t.event_type ?? ''
    }));
  }

  async createTrigger(notificationUrl: string, eventType: string): Promise<CloudinaryTrigger> {
    let response = await this.axios.post('/notification_triggers', {
      notification_url: notificationUrl,
      event_type: eventType
    });
    let t = response.data;
    return {
      triggerId: t.id ?? t.trigger_id ?? '',
      notificationUrl: t.notification_url ?? t.url ?? '',
      eventType: t.event_type ?? ''
    };
  }

  async deleteTrigger(triggerId: string): Promise<void> {
    await this.axios.delete(`/notification_triggers/${triggerId}`);
  }

  // ─── Usage ────────────────────────────────────────────────────

  async getUsage(date?: string): Promise<Record<string, any>> {
    let query: Record<string, any> = {};
    if (date) query.date = date;
    let response = await this.axios.get('/usage', { params: query });
    return keysToCamelCase(response.data);
  }
}
