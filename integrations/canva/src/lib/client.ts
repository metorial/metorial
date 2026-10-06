import {
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  pickDefined
} from 'slates';
import { z } from 'zod';
import * as native from './native';
import { ConnectionGuard, fail, id, publicUrl, text } from './validation';

export class Client {
  private readonly http;
  private readonly guard;
  private readonly identity;
  private readonly api;
  static fromContext(ctx: {
    auth: { token: string; refreshToken?: string; userId?: string; teamId?: string };
    input: unknown;
  }) {
    const client = new Client(ctx.auth);
    client.guard.check(ctx.input);
    return client;
  }
  constructor(config: {
    token: string;
    refreshToken?: string;
    userId?: string;
    teamId?: string;
  }) {
    const token = text(config.token, 'Canva access token');
    if (/\s/.test(token)) fail('The Canva access token must not contain whitespace.');
    this.guard = new ConnectionGuard([token, config.refreshToken]);
    this.identity = { userId: config.userId, teamId: config.teamId };
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.canva.com/rest/v1',
      authHeader: { value: `Bearer ${token}` },
      timeout: 30000,
      maxRedirects: 0,
      validateStatus: () => true
    });
    this.api = {
      get: (path: string, options?: { params?: Record<string, string | string[]> }) =>
        this.request('GET', path, undefined, options?.params),
      post: (path: string, data: unknown, _options?: { headers?: Record<string, string> }) =>
        this.request('POST', path, data),
      patch: (path: string, data: unknown, _options?: { headers?: Record<string, string> }) =>
        this.request('PATCH', path, data),
      delete: (path: string) => this.request('DELETE', path)
    };
  }
  private async request(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    data?: unknown,
    params?: Record<string, string | string[]>,
    statuses?: number[]
  ) {
    if (
      !path.startsWith('/') ||
      path
        .split('/')
        .slice(1)
        .some(part => !/^[A-Za-z0-9_-]{1,50}$/.test(part))
    )
      fail('Use exact Canva IDs without paths or queries.');
    this.guard.check([path, data, params]);
    let response: Awaited<ReturnType<typeof this.http.request<unknown>>>;
    try {
      response = await this.http.request<unknown>({ method, url: path, data, params });
    } catch (error) {
      let status: ReturnType<typeof getApiErrorStatus>;
      try {
        status = getApiErrorStatus(error);
      } catch {
        status = undefined;
      }
      throw createApiServiceError(
        'The Canva request failed. Check permissions and the original resource or job before retrying; a write might have taken effect.',
        {
          upstreamStatus:
            typeof status === 'number' &&
            Number.isInteger(status) &&
            status >= 100 &&
            status <= 599
              ? status
              : undefined
        }
      );
    }
    this.guard.check([response.data, response.headers]);
    const expected =
      statuses ?? (method === 'DELETE' || path === '/folders/move' ? [204] : [200]);
    if (!expected.includes(response.status))
      throw createApiServiceError(
        'Canva did not acknowledge the request. Check the resource, granted scopes, plan and job family; reconcile preceding writes before retrying.',
        { upstreamStatus: response.status }
      );
    if (
      response.status === 204 &&
      response.data !== '' &&
      response.data !== null &&
      response.data !== undefined
    )
      fail(
        'Canva returned an unexpected acknowledgment body. Reconcile the operation before retrying.'
      );
    return response;
  }
  private exact(actual: string, expected: string) {
    if (actual !== id(expected))
      fail(
        'Canva returned a different resource or job ID. Reconcile any preceding write before retrying.'
      );
  }
  private page<T>(schema: z.ZodType<T>, value: unknown, requested?: string) {
    const page = native.parseNative(
      z.object({ items: z.array(schema), continuation: z.string().optional() }),
      value
    );
    if (page.continuation !== undefined) {
      text(page.continuation, 'Returned continuation');
      if (page.continuation === requested)
        fail(
          'Canva repeated the requested continuation. Reconcile the current page before continuing.'
        );
    }
    return page;
  }
  private job<T extends { id: string; status: string }>(
    schema: z.ZodType<T>,
    value: unknown,
    expected?: string
  ): T {
    const job = native.parseNative(z.object({ job: schema }), value).job;
    if (expected !== undefined) this.exact(job.id, expected);
    id(job.id);
    return job;
  }
  async getCurrentIdentity(): Promise<{ userId: string; teamId: string }> {
    const me = native.parseNative(
      native.nativeUsersMeResponse,
      (await this.api.get('/users/me')).data
    ).team_user;
    if (
      (this.identity.userId !== undefined && this.identity.userId !== me.user_id) ||
      (this.identity.teamId !== undefined && this.identity.teamId !== me.team_id)
    )
      fail(
        'The Canva user/team differs from the original connection. Reconnect instead of reusing this account context.'
      );
    return { userId: id(me.user_id), teamId: id(me.team_id) };
  }
  async getCurrentUser(): Promise<{ userId: string; teamId: string; displayName?: string }> {
    const me = await this.getCurrentIdentity();
    const profileResponse = await this.request(
      'GET',
      '/users/me/profile',
      undefined,
      undefined,
      [200, 403]
    );
    const profile =
      profileResponse.status === 200
        ? native.parseNative(native.nativeUserProfileResponse, profileResponse.data).profile
        : undefined;
    return { ...me, displayName: profile?.display_name };
  }

  // ---- Assets ----

  async getAsset(assetId: string): Promise<CanvaAsset> {
    let res = await this.api.get(`/assets/${assetId}`);
    let data = native.parseNative(z.object({ asset: native.nativeAsset }), res.data);
    this.exact(data.asset.id, assetId);
    return mapAsset(data.asset);
  }

  async updateAsset(
    assetId: string,
    update: { name?: string; tags?: string[] }
  ): Promise<CanvaAsset> {
    if (update.name === undefined && update.tags === undefined)
      fail('Provide name or tags to update.');
    if (update.name !== undefined) text(update.name, 'Asset name');
    let res = await this.api.patch(`/assets/${assetId}`, update, {
      headers: { 'Content-Type': 'application/json' }
    });
    let data = native.parseNative(z.object({ asset: native.nativeAsset }), res.data);
    this.exact(data.asset.id, assetId);
    return mapAsset(data.asset);
  }

  async deleteAsset(assetId: string): Promise<void> {
    await this.api.delete(`/assets/${assetId}`);
  }

  async uploadAssetFromUrl(params: { name: string; url: string }): Promise<CanvaUploadJob> {
    text(params.name, 'Asset name');
    let res = await this.api.post('/url-asset-uploads', {
      name: params.name,
      url: publicUrl(params.url)
    });
    let data = { job: this.job(native.nativeAssetUploadJob, res.data) };
    return mapUploadJob(data.job);
  }

  async getAssetUploadJob(jobId: string): Promise<CanvaUploadJob> {
    let res = await this.api.get(`/url-asset-uploads/${jobId}`);
    let data = { job: this.job(native.nativeAssetUploadJob, res.data, jobId) };
    return mapUploadJob(data.job);
  }

  // ---- Designs ----

  async listDesigns(params?: {
    query?: string;
    ownership?: string;
    sortBy?: string;
    limit?: number;
    continuation?: string;
  }): Promise<{ designs: CanvaDesign[]; continuation?: string }> {
    if (
      params?.limit !== undefined &&
      (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100)
    )
      fail('Page limit must be an integer from 1 to 100.');
    if (params?.continuation !== undefined) text(params.continuation, 'Continuation');
    let queryParams: Record<string, string> = {};
    if (params?.query !== undefined) queryParams.query = params.query;
    if (params?.ownership !== undefined) queryParams.ownership = params.ownership;
    if (params?.sortBy !== undefined) queryParams.sort_by = params.sortBy;
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.continuation !== undefined) queryParams.continuation = params.continuation;

    let res = await this.api.get('/designs', { params: queryParams });
    let data = this.page(native.nativeDesignSummary, res.data, params?.continuation);
    return {
      designs: data.items.map(mapDesign),
      continuation: data.continuation
    };
  }

  async getDesign(designId: string): Promise<CanvaDesign> {
    let res = await this.api.get(`/designs/${designId}`);
    let data = native.parseNative(z.object({ design: native.nativeDesign }), res.data);
    this.exact(data.design.id, designId);
    return mapDesign(data.design);
  }

  async createDesign(params: {
    designType?:
      | { type: 'preset'; name: string }
      | { type: 'custom'; width: number; height: number };
    title?: string;
    assetId?: string;
  }): Promise<CanvaDesign> {
    if (!params.designType && !params.assetId)
      fail('Provide a preset, both custom dimensions, or an initial image asset.');
    if (params.assetId !== undefined) id(params.assetId);
    if (params.designType?.type === 'custom') {
      native.parseNative(native.nativeCustomDesignTypeInput, params.designType);
      if (params.designType.width * params.designType.height > 25000000)
        fail('Custom designs cannot exceed 25,000,000 square pixels.');
    }
    let body: Record<string, unknown> = {
      type: 'type_and_asset',
      ...pickDefined({ design_type: params.designType })
    };
    if (params.title !== undefined) body.title = params.title;
    if (params.assetId !== undefined) body.asset_id = params.assetId;

    let res = await this.api.post('/designs', body, {
      headers: { 'Content-Type': 'application/json' }
    });
    let data = native.parseNative(z.object({ design: native.nativeDesign }), res.data);
    return mapDesign(data.design);
  }

  // ---- Design Export ----

  async createExportJob(params: {
    designId: string;
    format: ExportFormat;
  }): Promise<CanvaExportJob> {
    id(params.designId);
    const format = params.format;
    if (
      format.pages !== undefined &&
      (format.pages.length === 0 ||
        format.pages.some(page => !Number.isSafeInteger(page) || page < 1))
    )
      fail(
        'Export pages must contain positive, one-based page numbers. Omit pages to export all pages.'
      );
    for (const value of 'width' in format ? [format.width, format.height] : []) {
      if (value !== undefined && (!Number.isInteger(value) || value < 40 || value > 25000))
        fail('Export dimensions must be integer pixels from 40 to 25000.');
    }
    if (
      format.type === 'jpg' &&
      (!Number.isInteger(format.quality) || format.quality < 1 || format.quality > 100)
    )
      fail('JPG export requires an integer quality from 1 to 100.');
    if (
      format.type === 'mp4' &&
      ![
        'horizontal_480p',
        'horizontal_720p',
        'horizontal_1080p',
        'horizontal_4k',
        'vertical_480p',
        'vertical_720p',
        'vertical_1080p',
        'vertical_4k'
      ].includes(format.quality ?? '')
    )
      fail('MP4 export requires a documented horizontal or vertical quality.');
    let res = await this.api.post(
      '/exports',
      {
        design_id: params.designId,
        format: params.format
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    let data = { job: this.job(native.nativeExportJob, res.data) };
    return mapExportJob(data.job);
  }

  async getExportJob(jobId: string): Promise<CanvaExportJob> {
    let res = await this.api.get(`/exports/${jobId}`);
    let data = { job: this.job(native.nativeExportJob, res.data, jobId) };
    return mapExportJob(data.job);
  }

  // ---- Design Import ----

  async createImportJobFromUrl(params: {
    title: string;
    url: string;
    mimeType?: string;
  }): Promise<CanvaImportJob> {
    text(params.title, 'Design title');
    if (params.mimeType !== undefined) text(params.mimeType, 'MIME type');
    let res = await this.api.post(
      '/url-imports',
      pickDefined({
        title: params.title,
        url: publicUrl(params.url),
        mime_type: params.mimeType
      })
    );
    let data = { job: this.job(native.nativeDesignImportJob, res.data) };
    return mapImportJob(data.job);
  }

  async getImportJob(
    jobId: string,
    sourceType: 'url' | 'binary' = 'url'
  ): Promise<CanvaImportJob> {
    let res = await this.api.get(
      `/${sourceType === 'url' ? 'url-imports' : 'imports'}/${jobId}`
    );
    let data = { job: this.job(native.nativeDesignImportJob, res.data, jobId) };
    return mapImportJob(data.job);
  }

  // ---- Folders ----

  async getFolder(folderId: string): Promise<CanvaFolder> {
    let res = await this.api.get(`/folders/${folderId}`);
    let data = native.parseNative(z.object({ folder: native.nativeFolder }), res.data);
    this.exact(data.folder.id, folderId);
    return mapFolder(data.folder);
  }

  async createFolder(params: { name: string; parentFolderId: string }): Promise<CanvaFolder> {
    text(params.name, 'Folder name');
    id(params.parentFolderId);
    let res = await this.api.post(
      '/folders',
      {
        name: params.name,
        parent_folder_id: params.parentFolderId
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    let data = native.parseNative(z.object({ folder: native.nativeFolder }), res.data);
    return mapFolder(data.folder);
  }

  async updateFolder(folderId: string, params: { name: string }): Promise<CanvaFolder> {
    if (folderId === 'root' || folderId === 'uploads')
      fail('The root and Uploads aliases cannot be renamed. Use an exact ordinary folder ID.');
    text(params.name, 'Folder name');
    let res = await this.api.patch(
      `/folders/${folderId}`,
      {
        name: params.name
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    let data = native.parseNative(z.object({ folder: native.nativeFolder }), res.data);
    this.exact(data.folder.id, folderId);
    return mapFolder(data.folder);
  }

  async deleteFolder(folderId: string): Promise<void> {
    if (folderId === 'root' || folderId === 'uploads')
      fail('The root and Uploads aliases cannot be deleted. Use an exact ordinary folder ID.');
    await this.api.delete(`/folders/${folderId}`);
  }

  async listFolderItems(
    folderId: string,
    params?: {
      limit?: number;
      continuation?: string;
      itemTypes?: string[];
      sortBy?: string;
    }
  ): Promise<{ items: CanvaFolderItem[]; continuation?: string }> {
    if (
      params?.limit !== undefined &&
      (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100)
    )
      fail('Page limit must be an integer from 1 to 100.');
    if (params?.continuation !== undefined) text(params.continuation, 'Continuation');
    let queryParams: Record<string, string | string[]> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.continuation !== undefined) queryParams.continuation = params.continuation;
    if (params?.itemTypes !== undefined && params.itemTypes.length === 0)
      fail(
        'Omit itemTypes to use the native defaults, or provide at least one supported type.'
      );
    if (params?.itemTypes !== undefined) queryParams.item_types = params.itemTypes.join(',');
    if (params?.sortBy !== undefined) queryParams.sort_by = params.sortBy;

    let res = await this.api.get(`/folders/${folderId}/items`, { params: queryParams });
    let data = this.page(native.nativeFolderItemSummary, res.data, params?.continuation);
    return {
      items: data.items.map(mapFolderItem),
      continuation: data.continuation
    };
  }

  async moveFolderItem(params: { itemId: string; toFolderId: string }): Promise<void> {
    id(params.itemId);
    id(params.toFolderId);
    await this.api.post(
      '/folders/move',
      {
        item_id: params.itemId,
        to_folder_id: params.toFolderId
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // ---- Comments ----

  async createCommentThread(
    designId: string,
    params: {
      messagePlaintext: string;
      assigneeId?: string;
    }
  ): Promise<CanvaCommentThread> {
    text(params.messagePlaintext, 'Comment message');
    if (
      params.assigneeId !== undefined &&
      !new RegExp(`\\[${id(params.assigneeId)}:[A-Za-z0-9_-]{1,50}\\]`).test(
        params.messagePlaintext
      )
    )
      fail(
        'Mention the assigned user with their exact user/team tag before assigning a thread.'
      );
    let body: Record<string, string> = {
      message_plaintext: params.messagePlaintext
    };
    if (params.assigneeId !== undefined) body.assignee_id = params.assigneeId;

    let res = await this.api.post(`/designs/${designId}/comments`, body, {
      headers: { 'Content-Type': 'application/json' }
    });
    let data = native.parseNative(z.object({ thread: native.nativeThread }), res.data);
    this.exact(data.thread.design_id, designId);
    return mapCommentThread(data.thread);
  }

  async getCommentThread(designId: string, threadId: string): Promise<CanvaCommentThread> {
    let res = await this.api.get(`/designs/${designId}/comments/${threadId}`);
    let data = native.parseNative(z.object({ thread: native.nativeThread }), res.data);
    this.exact(data.thread.design_id, designId);
    this.exact(data.thread.id, threadId);
    return mapCommentThread(data.thread);
  }

  async createReply(
    designId: string,
    threadId: string,
    params: {
      messagePlaintext: string;
    }
  ): Promise<CanvaCommentReply> {
    let res = await this.api.post(
      `/designs/${designId}/comments/${threadId}/replies`,
      {
        message_plaintext: params.messagePlaintext
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    let data = native.parseNative(z.object({ reply: native.nativeReply }), res.data);
    this.exact(data.reply.design_id, designId);
    this.exact(data.reply.thread_id, threadId);
    return mapCommentReply(data.reply);
  }

  async listReplies(
    designId: string,
    threadId: string,
    params?: {
      limit?: number;
      continuation?: string;
    }
  ): Promise<{ replies: CanvaCommentReply[]; continuation?: string }> {
    if (
      params?.limit !== undefined &&
      (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100)
    )
      fail('Page limit must be an integer from 1 to 100.');
    if (params?.continuation !== undefined) text(params.continuation, 'Continuation');
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.continuation !== undefined) queryParams.continuation = params.continuation;

    let res = await this.api.get(`/designs/${designId}/comments/${threadId}/replies`, {
      params: queryParams
    });
    let data = this.page(native.nativeReply, res.data, params?.continuation);
    for (const reply of data.items) {
      this.exact(reply.design_id, designId);
      this.exact(reply.thread_id, threadId);
    }
    return {
      replies: data.items.map(mapCommentReply),
      continuation: data.continuation
    };
  }

  // ---- Brand Templates ----

  async listBrandTemplates(params?: {
    query?: string;
    limit?: number;
    continuation?: string;
    ownership?: string;
    sortBy?: string;
    dataset?: string;
  }): Promise<{ templates: CanvaBrandTemplate[]; continuation?: string }> {
    if (
      params?.limit !== undefined &&
      (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100)
    )
      fail('Page limit must be an integer from 1 to 100.');
    if (params?.continuation !== undefined) text(params.continuation, 'Continuation');
    let queryParams: Record<string, string> = {};
    if (params?.query !== undefined) queryParams.query = params.query;
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.continuation !== undefined) queryParams.continuation = params.continuation;
    if (params?.ownership !== undefined) queryParams.ownership = params.ownership;
    if (params?.sortBy !== undefined) queryParams.sort_by = params.sortBy;
    if (params?.dataset !== undefined) queryParams.dataset = params.dataset;

    let res = await this.api.get('/brand-templates', { params: queryParams });
    let data = this.page(native.nativeBrandTemplate, res.data, params?.continuation);
    return {
      templates: data.items.map(mapBrandTemplate),
      continuation: data.continuation
    };
  }

  async getBrandTemplate(brandTemplateId: string): Promise<CanvaBrandTemplate> {
    let res = await this.api.get(`/brand-templates/${brandTemplateId}`);
    let data = native.parseNative(
      z.object({ brand_template: native.nativeBrandTemplate }),
      res.data
    );
    this.exact(data.brand_template.id, brandTemplateId);
    return mapBrandTemplate(data.brand_template);
  }

  async getBrandTemplateDataset(
    brandTemplateId: string
  ): Promise<Record<string, { type: string }>> {
    let res = await this.api.get(`/brand-templates/${brandTemplateId}/dataset`);
    let data = native.parseNative(
      z.object({ dataset: native.nativeDatasetDefinition }),
      res.data
    );
    return data.dataset;
  }

  // ---- Autofill ----

  async createAutofillJob(params: {
    brandTemplateId: string;
    data: Record<string, unknown>;
    title?: string;
  }): Promise<CanvaAutofillJob> {
    const values = native.parseNative(
      z.record(z.string(), native.nativeDatasetValue),
      params.data
    );
    if (!Object.keys(values).length)
      fail('Provide at least one autofill field from the current template dataset.');
    const dataset = await this.getBrandTemplateDataset(params.brandTemplateId);
    for (const [key, value] of Object.entries(values)) {
      const field = dataset[key];
      if (
        !field ||
        (field.type !== value.type && !(field.type === 'image' && value.type === 'video'))
      )
        fail(
          'An autofill key or value type does not match the current template dataset. Read the dataset and correct the request before creating a design.'
        );
      if ('asset_id' in value) id(value.asset_id);
    }
    let body: Record<string, unknown> = {
      type: 'create_from_brand_template',
      brand_template_id: params.brandTemplateId,
      data: values
    };
    if (params.title !== undefined) body.title = params.title;

    let res = await this.api.post('/autofills', body, {
      headers: { 'Content-Type': 'application/json' }
    });
    let data = { job: this.job(native.nativeDesignAutofillJob, res.data) };
    return mapAutofillJob(data.job);
  }

  async getAutofillJob(jobId: string): Promise<CanvaAutofillJob> {
    let res = await this.api.get(`/autofills/${jobId}`);
    let data = { job: this.job(native.nativeDesignAutofillJob, res.data, jobId) };
    return mapAutofillJob(data.job);
  }
}

// ---- Raw API Types ----

interface RawCanvaAsset {
  id: string;
  type: string;
  name: string;
  tags: string[];
  created_at: number;
  updated_at: number;
  owner: { user_id: string; team_id: string };
  thumbnail?: { width: number; height: number; url: string };
}

interface RawUploadJob {
  id: string;
  status: string;
  error?: { code: string; message: string };
  asset?: RawCanvaAsset;
}

interface RawCanvaDesign {
  id: string;
  title?: string;
  owner?: { user_id: string; team_id: string };
  urls?: { edit_url?: string; view_url?: string };
  created_at: number;
  updated_at: number;
  thumbnail?: { width: number; height: number; url: string };
  page_count?: number;
}

interface RawExportJob {
  id: string;
  status: string;
  urls?: string[];
  error?: { code: string; message: string };
}

interface RawImportJob {
  id: string;
  status: string;
  result?: { designs: RawCanvaDesign[] };
  error?: { code: string; message: string };
}

interface RawCanvaFolder {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  thumbnail?: { width: number; height: number; url: string };
}

type RawFolderItem = z.infer<typeof native.nativeFolderItemSummary>;
type RawCommentThread = z.infer<typeof native.nativeThread>;
type RawCommentReply = z.infer<typeof native.nativeReply>;

interface RawBrandTemplate {
  id: string;
  title?: string;
  view_url?: string;
  create_url?: string;
  created_at: number;
  updated_at: number;
  thumbnail?: { width: number; height: number; url: string };
}

interface RawAutofillJob {
  id: string;
  status: string;
  result?: { design?: RawCanvaDesign };
  error?: { code: string; message: string };
}

// ---- Mapped Types (exported) ----

export interface CanvaAsset {
  assetId: string;
  type: string;
  name: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  ownerUserId: string;
  ownerTeamId: string;
  thumbnailUrl?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
}

export interface CanvaUploadJob {
  jobId: string;
  status: string;
  errorCode?: string;
  errorMessage?: string;
  asset?: CanvaAsset;
}

export interface CanvaDesign {
  designId: string;
  title?: string;
  ownerUserId?: string;
  ownerTeamId?: string;
  editUrl?: string;
  viewUrl?: string;
  createdAt: number;
  updatedAt: number;
  thumbnailUrl?: string;
  pageCount?: number;
}

export interface CanvaExportJob {
  jobId: string;
  status: string;
  downloadUrls?: string[];
  errorCode?: string;
  errorMessage?: string;
}

export interface CanvaImportJob {
  jobId: string;
  status: string;
  designs?: CanvaDesign[];
  errorCode?: string;
  errorMessage?: string;
}

export interface CanvaFolder {
  folderId: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  thumbnailUrl?: string;
}

export interface CanvaFolderItem {
  type: string;
  folder?: CanvaFolder;
  design?: CanvaDesign;
  image?: Omit<CanvaAsset, 'ownerUserId' | 'ownerTeamId'> & {
    ownerUserId?: string;
    ownerTeamId?: string;
  };
  brandTemplate?: CanvaBrandTemplate;
}

export interface CanvaCommentThread {
  threadId: string;
  designId: string;
  authorUserId?: string;
  authorDisplayName?: string;
  contentPlaintext?: string;
  contentMarkdown?: string;
  assigneeUserId?: string;
  assigneeDisplayName?: string;
  resolverUserId?: string;
  resolverDisplayName?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CanvaCommentReply {
  replyId: string;
  designId?: string;
  threadId?: string;
  authorUserId?: string;
  authorDisplayName?: string;
  contentPlaintext?: string;
  contentMarkdown?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CanvaBrandTemplate {
  brandTemplateId: string;
  title?: string;
  viewUrl?: string;
  createUrl?: string;
  createdAt: number;
  updatedAt: number;
  thumbnailUrl?: string;
}

export interface CanvaAutofillJob {
  jobId: string;
  status: string;
  design?: CanvaDesign;
  errorCode?: string;
  errorMessage?: string;
}

export type ExportFormat =
  | { type: 'pdf'; export_quality?: string; size?: string; pages?: number[] }
  | {
      type: 'jpg';
      quality: number;
      height?: number;
      width?: number;
      export_quality?: string;
      pages?: number[];
    }
  | {
      type: 'png';
      height?: number;
      width?: number;
      lossless?: boolean;
      transparent_background?: boolean;
      as_single_image?: boolean;
      export_quality?: string;
      pages?: number[];
    }
  | { type: 'pptx'; pages?: number[] }
  | { type: 'gif'; height?: number; width?: number; export_quality?: string; pages?: number[] }
  | { type: 'mp4'; quality: string; export_quality?: string; pages?: number[] };

// ---- Mappers ----

let mapAsset = (raw: RawCanvaAsset): CanvaAsset => ({
  assetId: id(raw.id),
  type: raw.type,
  name: raw.name,
  tags: raw.tags,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  ownerUserId: raw.owner.user_id,
  ownerTeamId: raw.owner.team_id,
  thumbnailUrl: raw.thumbnail?.url === undefined ? undefined : publicUrl(raw.thumbnail.url),
  thumbnailWidth: raw.thumbnail?.width,
  thumbnailHeight: raw.thumbnail?.height
});

let mapUploadJob = (raw: RawUploadJob): CanvaUploadJob => {
  if (raw.status === 'success' && !raw.asset)
    fail('The successful upload lacks its asset. Reconcile the job before using it.');
  return {
    jobId: raw.id,
    status: raw.status,
    errorCode: raw.error?.code,
    errorMessage: raw.error?.message,
    asset: raw.asset ? mapAsset(raw.asset) : undefined
  };
};

let mapDesign = (raw: RawCanvaDesign): CanvaDesign => ({
  designId: id(raw.id),
  title: raw.title,
  ownerUserId: raw.owner?.user_id,
  ownerTeamId: raw.owner?.team_id,
  editUrl: raw.urls?.edit_url === undefined ? undefined : publicUrl(raw.urls.edit_url),
  viewUrl: raw.urls?.view_url === undefined ? undefined : publicUrl(raw.urls.view_url),
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  thumbnailUrl: raw.thumbnail?.url === undefined ? undefined : publicUrl(raw.thumbnail.url),
  pageCount: raw.page_count
});

let mapExportJob = (raw: RawExportJob): CanvaExportJob => {
  if (raw.status === 'success' && !raw.urls?.length)
    fail(
      'The export reports success without downloadable files. Reconcile the job instead of retrying the export automatically.'
    );
  if (raw.status !== 'success' && raw.urls !== undefined)
    fail('The export result conflicts with its status.');
  return {
    jobId: raw.id,
    status: raw.status,
    downloadUrls: raw.urls?.map(publicUrl),
    errorCode: raw.error?.code,
    errorMessage: raw.error?.message
  };
};

let mapImportJob = (raw: RawImportJob): CanvaImportJob => {
  if (raw.status === 'success' && !raw.result?.designs.length)
    fail('The successful import lacks its designs. Reconcile the job before using it.');
  return {
    jobId: raw.id,
    status: raw.status,
    designs: raw.result?.designs.map(mapDesign),
    errorCode: raw.error?.code,
    errorMessage: raw.error?.message
  };
};

let mapFolder = (raw: RawCanvaFolder): CanvaFolder => ({
  folderId: id(raw.id),
  name: raw.name,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  thumbnailUrl: raw.thumbnail?.url === undefined ? undefined : publicUrl(raw.thumbnail.url)
});

let mapFolderItem = (raw: RawFolderItem): CanvaFolderItem => ({
  type: raw.type,
  folder: raw.type === 'folder' ? mapFolder(raw.folder) : undefined,
  design: raw.type === 'design' ? mapDesign(raw.design) : undefined,
  brandTemplate:
    raw.type === 'brand_template' ? mapBrandTemplate(raw.brand_template) : undefined,
  image:
    raw.type === 'image'
      ? {
          assetId: raw.image.id,
          type: raw.image.type,
          name: raw.image.name,
          tags: raw.image.tags,
          createdAt: raw.image.created_at,
          updatedAt: raw.image.updated_at,
          thumbnailUrl: raw.image.thumbnail?.url
        }
      : undefined
});

let mapCommentThread = (raw: RawCommentThread): CanvaCommentThread => ({
  threadId: id(raw.id),
  designId: raw.design_id,
  authorUserId: raw.author?.id,
  authorDisplayName: raw.author?.display_name,
  contentPlaintext:
    raw.thread_type.type === 'comment' ? raw.thread_type.content.plaintext : undefined,
  contentMarkdown:
    raw.thread_type.type === 'comment' ? raw.thread_type.content.markdown : undefined,
  assigneeUserId:
    raw.thread_type.type === 'comment' ? raw.thread_type.assignee?.id : undefined,
  assigneeDisplayName:
    raw.thread_type.type === 'comment' ? raw.thread_type.assignee?.display_name : undefined,
  resolverUserId:
    raw.thread_type.type === 'comment' ? raw.thread_type.resolver?.id : undefined,
  resolverDisplayName:
    raw.thread_type.type === 'comment' ? raw.thread_type.resolver?.display_name : undefined,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at
});

let mapCommentReply = (raw: RawCommentReply): CanvaCommentReply => ({
  replyId: id(raw.id),
  designId: raw.design_id,
  threadId: raw.thread_id,
  authorUserId: raw.author?.id,
  authorDisplayName: raw.author?.display_name,
  contentPlaintext: raw.content?.plaintext,
  contentMarkdown: raw.content?.markdown,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at
});

let mapBrandTemplate = (raw: RawBrandTemplate): CanvaBrandTemplate => ({
  brandTemplateId: id(raw.id),
  title: raw.title,
  viewUrl: raw.view_url === undefined ? undefined : publicUrl(raw.view_url),
  createUrl: raw.create_url === undefined ? undefined : publicUrl(raw.create_url),
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  thumbnailUrl: raw.thumbnail?.url === undefined ? undefined : publicUrl(raw.thumbnail.url)
});

let mapAutofillJob = (raw: RawAutofillJob): CanvaAutofillJob => {
  if (raw.status === 'success' && !raw.result?.design)
    fail('The successful autofill lacks its design. Reconcile the job before using it.');
  return {
    jobId: raw.id,
    status: raw.status,
    design: raw.result?.design ? mapDesign(raw.result.design) : undefined,
    errorCode: raw.error?.code,
    errorMessage: raw.error?.message
  };
};
