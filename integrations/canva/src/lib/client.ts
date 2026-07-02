import { createAxios } from 'slates';

export class Client {
  private api: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.api = createAxios({
      baseURL: 'https://api.canva.com/rest/v1',
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  // ---- Users ----

  async getCurrentUser(): Promise<{
    userId: string;
    teamId: string;
    displayName?: string;
  }> {
    let [meRes, profileRes] = await Promise.all([
      this.api.get('/users/me'),
      this.api.get('/users/me/profile').catch(() => null)
    ]);

    let me = meRes.data as { team_user: { user_id: string; team_id: string } };
    let profile = profileRes?.data as { profile?: { display_name?: string } } | null;

    return {
      userId: me.team_user.user_id,
      teamId: me.team_user.team_id,
      displayName: profile?.profile?.display_name
    };
  }

  // ---- Assets ----

  async getAsset(assetId: string): Promise<CanvaAsset> {
    let res = await this.api.get(`/assets/${assetId}`);
    let data = res.data as { asset: RawCanvaAsset };
    return mapAsset(data.asset);
  }

  async updateAsset(
    assetId: string,
    update: { name?: string; tags?: string[] }
  ): Promise<CanvaAsset> {
    let res = await this.api.patch(`/assets/${assetId}`, update, {
      headers: { 'Content-Type': 'application/json' }
    });
    let data = res.data as { asset: RawCanvaAsset };
    return mapAsset(data.asset);
  }

  async deleteAsset(assetId: string): Promise<void> {
    await this.api.delete(`/assets/${assetId}`);
  }

  async uploadAssetFromUrl(params: { name: string; url: string }): Promise<CanvaUploadJob> {
    let nameBase64 = btoa(params.name);
    let res = await this.api.post(
      '/asset-uploads',
      {
        url: params.url
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Asset-Upload-Metadata': JSON.stringify({ name_base64: nameBase64 })
        }
      }
    );
    let data = res.data as { job: RawUploadJob };
    return mapUploadJob(data.job);
  }

  async getAssetUploadJob(jobId: string): Promise<CanvaUploadJob> {
    let res = await this.api.get(`/asset-uploads/${jobId}`);
    let data = res.data as { job: RawUploadJob };
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
    let queryParams: Record<string, string> = {};
    if (params?.query) queryParams.query = params.query;
    if (params?.ownership) queryParams.ownership = params.ownership;
    if (params?.sortBy) queryParams.sort_by = params.sortBy;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.continuation) queryParams.continuation = params.continuation;

    let res = await this.api.get('/designs', { params: queryParams });
    let data = res.data as { items: RawCanvaDesign[]; continuation?: string };
    return {
      designs: data.items.map(mapDesign),
      continuation: data.continuation
    };
  }

  async getDesign(designId: string): Promise<CanvaDesign> {
    let res = await this.api.get(`/designs/${designId}`);
    let data = res.data as { design: RawCanvaDesign };
    return mapDesign(data.design);
  }

  async createDesign(params: {
    designType:
      | { type: 'preset'; name: string }
      | { type: 'custom'; width: number; height: number };
    title?: string;
    assetId?: string;
  }): Promise<CanvaDesign> {
    let body: Record<string, unknown> = {
      design_type: params.designType
    };
    if (params.title) body.title = params.title;
    if (params.assetId) body.asset_id = params.assetId;

    let res = await this.api.post('/designs', body, {
      headers: { 'Content-Type': 'application/json' }
    });
    let data = res.data as { design: RawCanvaDesign };
    return mapDesign(data.design);
  }

  // ---- Design Export ----

  async createExportJob(params: {
    designId: string;
    format: ExportFormat;
  }): Promise<CanvaExportJob> {
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
    let data = res.data as { job: RawExportJob };
    return mapExportJob(data.job);
  }

  async getExportJob(jobId: string): Promise<CanvaExportJob> {
    let res = await this.api.get(`/exports/${jobId}`);
    let data = res.data as { job: RawExportJob };
    return mapExportJob(data.job);
  }

  // ---- Design Import ----

  async createImportJobFromUrl(params: {
    title: string;
    url: string;
    mimeType?: string;
  }): Promise<CanvaImportJob> {
    let titleBase64 = btoa(params.title);
    let metadata: Record<string, string> = { title_base64: titleBase64 };
    if (params.mimeType) metadata.mime_type = params.mimeType;

    let res = await this.api.post(
      '/imports/url',
      {
        url: params.url,
        title_base64: titleBase64,
        ...(params.mimeType ? { mime_type: params.mimeType } : {})
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    let data = res.data as { job: RawImportJob };
    return mapImportJob(data.job);
  }

  async getImportJob(jobId: string): Promise<CanvaImportJob> {
    let res = await this.api.get(`/imports/${jobId}`);
    let data = res.data as { job: RawImportJob };
    return mapImportJob(data.job);
  }

  // ---- Folders ----

  async getFolder(folderId: string): Promise<CanvaFolder> {
    let res = await this.api.get(`/folders/${folderId}`);
    let data = res.data as { folder: RawCanvaFolder };
    return mapFolder(data.folder);
  }

  async createFolder(params: { name: string; parentFolderId: string }): Promise<CanvaFolder> {
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
    let data = res.data as { folder: RawCanvaFolder };
    return mapFolder(data.folder);
  }

  async updateFolder(folderId: string, params: { name: string }): Promise<CanvaFolder> {
    let res = await this.api.patch(
      `/folders/${folderId}`,
      {
        name: params.name
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    let data = res.data as { folder: RawCanvaFolder };
    return mapFolder(data.folder);
  }

  async deleteFolder(folderId: string): Promise<void> {
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
    let queryParams: Record<string, string | string[]> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.continuation) queryParams.continuation = params.continuation;
    if (params?.itemTypes) queryParams.item_types = params.itemTypes;
    if (params?.sortBy) queryParams.sort_by = params.sortBy;

    let res = await this.api.get(`/folders/${folderId}/items`, { params: queryParams });
    let data = res.data as { items: RawFolderItem[]; continuation?: string };
    return {
      items: data.items.map(mapFolderItem),
      continuation: data.continuation
    };
  }

  async moveFolderItem(params: { itemId: string; toFolderId: string }): Promise<void> {
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
    let body: Record<string, string> = {
      message_plaintext: params.messagePlaintext
    };
    if (params.assigneeId) body.assignee_id = params.assigneeId;

    let res = await this.api.post(`/designs/${designId}/comments`, body, {
      headers: { 'Content-Type': 'application/json' }
    });
    let data = res.data as { thread: RawCommentThread };
    return mapCommentThread(data.thread);
  }

  async getCommentThread(designId: string, threadId: string): Promise<CanvaCommentThread> {
    let res = await this.api.get(`/designs/${designId}/comments/${threadId}`);
    let data = res.data as { thread: RawCommentThread };
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
    let data = res.data as { reply: RawCommentReply };
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
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.continuation) queryParams.continuation = params.continuation;

    let res = await this.api.get(`/designs/${designId}/comments/${threadId}/replies`, {
      params: queryParams
    });
    let data = res.data as { items: RawCommentReply[]; continuation?: string };
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
    let queryParams: Record<string, string> = {};
    if (params?.query) queryParams.query = params.query;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.continuation) queryParams.continuation = params.continuation;
    if (params?.ownership) queryParams.ownership = params.ownership;
    if (params?.sortBy) queryParams.sort_by = params.sortBy;
    if (params?.dataset) queryParams.dataset = params.dataset;

    let res = await this.api.get('/brand-templates', { params: queryParams });
    let data = res.data as { items: RawBrandTemplate[]; continuation?: string };
    return {
      templates: data.items.map(mapBrandTemplate),
      continuation: data.continuation
    };
  }

  async getBrandTemplate(brandTemplateId: string): Promise<CanvaBrandTemplate> {
    let res = await this.api.get(`/brand-templates/${brandTemplateId}`);
    let data = res.data as { brand_template: RawBrandTemplate };
    return mapBrandTemplate(data.brand_template);
  }

  async getBrandTemplateDataset(
    brandTemplateId: string
  ): Promise<Record<string, { type: string }>> {
    let res = await this.api.get(`/brand-templates/${brandTemplateId}/dataset`);
    let data = res.data as { dataset: Record<string, { type: string }> };
    return data.dataset;
  }

  // ---- Autofill ----

  async createAutofillJob(params: {
    brandTemplateId: string;
    data: Record<string, unknown>;
    title?: string;
  }): Promise<CanvaAutofillJob> {
    let body: Record<string, unknown> = {
      brand_template_id: params.brandTemplateId,
      data: params.data
    };
    if (params.title) body.title = params.title;

    let res = await this.api.post('/autofills', body, {
      headers: { 'Content-Type': 'application/json' }
    });
    let data = res.data as { job: RawAutofillJob };
    return mapAutofillJob(data.job);
  }

  async getAutofillJob(jobId: string): Promise<CanvaAutofillJob> {
    let res = await this.api.get(`/autofills/${jobId}`);
    let data = res.data as { job: RawAutofillJob };
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

interface RawFolderItem {
  type: string;
  folder?: RawCanvaFolder;
  design?: RawCanvaDesign;
  image?: RawCanvaAsset;
}

interface RawCommentThread {
  id: string;
  design_id: string;
  thread_type?: unknown;
  author?: { user_id: string; display_name?: string };
  content?: { plaintext?: string; markdown?: string };
  assignee?: { user_id: string; display_name?: string };
  resolver?: { user_id: string; display_name?: string };
  created_at: number;
  updated_at: number;
}

interface RawCommentReply {
  id: string;
  design_id?: string;
  thread_id?: string;
  author?: { user_id: string; display_name?: string };
  content?: { plaintext?: string; markdown?: string };
  created_at: number;
  updated_at: number;
}

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
  image?: CanvaAsset;
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
  | { type: 'mp4'; quality?: string; export_quality?: string; pages?: number[] };

// ---- Mappers ----

let mapAsset = (raw: RawCanvaAsset): CanvaAsset => ({
  assetId: raw.id,
  type: raw.type,
  name: raw.name,
  tags: raw.tags,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  ownerUserId: raw.owner.user_id,
  ownerTeamId: raw.owner.team_id,
  thumbnailUrl: raw.thumbnail?.url,
  thumbnailWidth: raw.thumbnail?.width,
  thumbnailHeight: raw.thumbnail?.height
});

let mapUploadJob = (raw: RawUploadJob): CanvaUploadJob => ({
  jobId: raw.id,
  status: raw.status,
  errorCode: raw.error?.code,
  errorMessage: raw.error?.message,
  asset: raw.asset ? mapAsset(raw.asset) : undefined
});

let mapDesign = (raw: RawCanvaDesign): CanvaDesign => ({
  designId: raw.id,
  title: raw.title,
  ownerUserId: raw.owner?.user_id,
  ownerTeamId: raw.owner?.team_id,
  editUrl: raw.urls?.edit_url,
  viewUrl: raw.urls?.view_url,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  thumbnailUrl: raw.thumbnail?.url,
  pageCount: raw.page_count
});

let mapExportJob = (raw: RawExportJob): CanvaExportJob => ({
  jobId: raw.id,
  status: raw.status,
  downloadUrls: raw.urls,
  errorCode: raw.error?.code,
  errorMessage: raw.error?.message
});

let mapImportJob = (raw: RawImportJob): CanvaImportJob => ({
  jobId: raw.id,
  status: raw.status,
  designs: raw.result?.designs.map(mapDesign),
  errorCode: raw.error?.code,
  errorMessage: raw.error?.message
});

let mapFolder = (raw: RawCanvaFolder): CanvaFolder => ({
  folderId: raw.id,
  name: raw.name,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  thumbnailUrl: raw.thumbnail?.url
});

let mapFolderItem = (raw: RawFolderItem): CanvaFolderItem => ({
  type: raw.type,
  folder: raw.folder ? mapFolder(raw.folder) : undefined,
  design: raw.design ? mapDesign(raw.design) : undefined,
  image: raw.image ? mapAsset(raw.image) : undefined
});

let mapCommentThread = (raw: RawCommentThread): CanvaCommentThread => ({
  threadId: raw.id,
  designId: raw.design_id,
  authorUserId: raw.author?.user_id,
  authorDisplayName: raw.author?.display_name,
  contentPlaintext: raw.content?.plaintext,
  contentMarkdown: raw.content?.markdown,
  assigneeUserId: raw.assignee?.user_id,
  assigneeDisplayName: raw.assignee?.display_name,
  resolverUserId: raw.resolver?.user_id,
  resolverDisplayName: raw.resolver?.display_name,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at
});

let mapCommentReply = (raw: RawCommentReply): CanvaCommentReply => ({
  replyId: raw.id,
  designId: raw.design_id,
  threadId: raw.thread_id,
  authorUserId: raw.author?.user_id,
  authorDisplayName: raw.author?.display_name,
  contentPlaintext: raw.content?.plaintext,
  contentMarkdown: raw.content?.markdown,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at
});

let mapBrandTemplate = (raw: RawBrandTemplate): CanvaBrandTemplate => ({
  brandTemplateId: raw.id,
  title: raw.title,
  viewUrl: raw.view_url,
  createUrl: raw.create_url,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  thumbnailUrl: raw.thumbnail?.url
});

let mapAutofillJob = (raw: RawAutofillJob): CanvaAutofillJob => ({
  jobId: raw.id,
  status: raw.status,
  design: raw.result?.design ? mapDesign(raw.result.design) : undefined,
  errorCode: raw.error?.code,
  errorMessage: raw.error?.message
});
