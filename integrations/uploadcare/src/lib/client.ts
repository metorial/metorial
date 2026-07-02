import { createAxios } from 'slates';

export interface UploadcareAuth {
  publicKey: string;
  secretKey: string;
}

export interface PaginatedResponse<T> {
  next: string | null;
  previous: string | null;
  total: number;
  per_page: number;
  results: T[];
}

export interface FileObject {
  uuid: string;
  datetime_uploaded: string;
  datetime_stored: string | null;
  datetime_removed: string | null;
  original_filename: string;
  size: number;
  mime_type: string;
  is_image: boolean;
  is_ready: boolean;
  url: string;
  original_file_url: string | null;
  content_info: Record<string, any> | null;
  metadata: Record<string, string>;
  appdata: Record<string, any> | null;
}

export interface GroupObject {
  id: string;
  datetime_created: string;
  datetime_stored: string | null;
  files_count: number;
  cdn_url: string;
  url: string;
  files: FileObject[];
}

export interface WebhookObject {
  id: number;
  project: number;
  target_url: string;
  event: string;
  is_active: boolean;
  signing_secret: string | null;
  version: string;
}

export interface ProjectObject {
  name: string;
  pub_key: string;
  autostore_enabled: boolean;
  collaborators: Array<{ email: string; name: string }>;
}

export interface ConversionResult {
  original_source: string;
  token: number;
  uuid: string;
  thumbnails_group_uuid?: string;
}

export interface ConversionStatus {
  status: string;
  result: FileObject | null;
  error: string | null;
}

export class Client {
  private auth: UploadcareAuth;

  constructor(auth: UploadcareAuth) {
    this.auth = auth;
  }

  private getAxios() {
    return createAxios({
      baseURL: 'https://api.uploadcare.com/',
      headers: {
        Accept: 'application/vnd.uploadcare-v0.7+json',
        Authorization: `Uploadcare.Simple ${this.auth.publicKey}:${this.auth.secretKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Files ──

  async listFiles(params?: {
    removed?: boolean;
    stored?: boolean;
    limit?: number;
    ordering?: string;
    from?: string;
    include?: string;
  }): Promise<PaginatedResponse<FileObject>> {
    let axios = this.getAxios();
    let response = await axios.get('/files/', { params });
    return response.data;
  }

  async getFile(fileId: string, include?: string): Promise<FileObject> {
    let axios = this.getAxios();
    let response = await axios.get(`/files/${fileId}/`, {
      params: include ? { include } : undefined
    });
    return response.data;
  }

  async storeFile(fileId: string): Promise<FileObject> {
    let axios = this.getAxios();
    let response = await axios.put(`/files/${fileId}/storage/`);
    return response.data;
  }

  async deleteFile(fileId: string): Promise<FileObject> {
    let axios = this.getAxios();
    let response = await axios.delete(`/files/${fileId}/storage/`);
    return response.data;
  }

  async batchStore(
    fileIds: string[]
  ): Promise<{ status: string; problems: Record<string, string>; result: FileObject[] }> {
    let axios = this.getAxios();
    let response = await axios.put('/files/storage/', fileIds);
    return response.data;
  }

  async batchDelete(
    fileIds: string[]
  ): Promise<{ status: string; problems: Record<string, string>; result: FileObject[] }> {
    let axios = this.getAxios();
    let response = await axios.delete('/files/storage/', { data: fileIds });
    return response.data;
  }

  // ── File Copy ──

  async localCopy(
    source: string,
    store?: boolean
  ): Promise<{ type: string; result: FileObject }> {
    let axios = this.getAxios();
    let response = await axios.post('/files/local_copy/', { source, store });
    return response.data;
  }

  async remoteCopy(
    source: string,
    target: string,
    options?: {
      makePublic?: boolean;
      pattern?: string;
    }
  ): Promise<{ type: string; result: string }> {
    let axios = this.getAxios();
    let response = await axios.post('/files/remote_copy/', {
      source,
      target,
      make_public: options?.makePublic,
      pattern: options?.pattern
    });
    return response.data;
  }

  // ── File Metadata ──

  async getMetadata(fileId: string): Promise<Record<string, string>> {
    let axios = this.getAxios();
    let response = await axios.get(`/files/${fileId}/metadata/`);
    return response.data;
  }

  async getMetadataKey(fileId: string, key: string): Promise<string> {
    let axios = this.getAxios();
    let response = await axios.get(`/files/${fileId}/metadata/${key}/`);
    return response.data;
  }

  async updateMetadataKey(fileId: string, key: string, value: string): Promise<string> {
    let axios = this.getAxios();
    let response = await axios.put(
      `/files/${fileId}/metadata/${key}/`,
      JSON.stringify(value),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async deleteMetadataKey(fileId: string, key: string): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/files/${fileId}/metadata/${key}/`);
  }

  // ── File Groups ──

  async listGroups(params?: {
    limit?: number;
    ordering?: string;
    from?: string;
  }): Promise<PaginatedResponse<GroupObject>> {
    let axios = this.getAxios();
    let response = await axios.get('/groups/', { params });
    return response.data;
  }

  async getGroup(groupId: string): Promise<GroupObject> {
    let axios = this.getAxios();
    let response = await axios.get(`/groups/${groupId}/`);
    return response.data;
  }

  async storeGroup(groupId: string): Promise<GroupObject> {
    let axios = this.getAxios();
    let response = await axios.put(`/groups/${groupId}/storage/`);
    return response.data;
  }

  async deleteGroup(groupId: string): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/groups/${groupId}/`);
  }

  // ── Webhooks ──

  async listWebhooks(): Promise<WebhookObject[]> {
    let axios = this.getAxios();
    let response = await axios.get('/webhooks/');
    return response.data;
  }

  async createWebhook(params: {
    targetUrl: string;
    event: string;
    isActive?: boolean;
    signingSecret?: string;
  }): Promise<WebhookObject> {
    let axios = this.getAxios();
    let response = await axios.post('/webhooks/', {
      target_url: params.targetUrl,
      event: params.event,
      is_active: params.isActive ?? true,
      signing_secret: params.signingSecret,
      version: '0.7'
    });
    return response.data;
  }

  async updateWebhook(
    webhookId: number,
    params: {
      targetUrl?: string;
      event?: string;
      isActive?: boolean;
      signingSecret?: string;
    }
  ): Promise<WebhookObject> {
    let axios = this.getAxios();
    let body: Record<string, any> = {};
    if (params.targetUrl !== undefined) body.target_url = params.targetUrl;
    if (params.event !== undefined) body.event = params.event;
    if (params.isActive !== undefined) body.is_active = params.isActive;
    if (params.signingSecret !== undefined) body.signing_secret = params.signingSecret;

    let response = await axios.put(`/webhooks/${webhookId}/`, body);
    return response.data;
  }

  async deleteWebhook(targetUrl: string): Promise<void> {
    let axios = this.getAxios();
    await axios.delete('/webhooks/unsubscribe/', {
      data: { target_url: targetUrl }
    });
  }

  // ── Project ──

  async getProject(): Promise<ProjectObject> {
    let axios = this.getAxios();
    let response = await axios.get('/project/');
    return response.data;
  }

  // ── Add-Ons ──

  async executeAddon(
    addonName: string,
    target: string,
    params?: Record<string, any>
  ): Promise<string> {
    let axios = this.getAxios();
    let body: Record<string, any> = { target };
    if (params) body.params = params;
    let response = await axios.post(`/addons/${addonName}/execute/`, body);
    return response.data.request_id;
  }

  async getAddonStatus(
    addonName: string,
    requestId: string
  ): Promise<{ status: string; result?: Record<string, any> }> {
    let axios = this.getAxios();
    let response = await axios.get(`/addons/${addonName}/execute/status/`, {
      params: { request_id: requestId }
    });
    return response.data;
  }

  // ── Document Conversion ──

  async convertDocument(
    paths: string[],
    store?: boolean,
    saveInGroup?: boolean
  ): Promise<{
    result: ConversionResult[];
    problems: Record<string, string>;
  }> {
    let axios = this.getAxios();
    let response = await axios.post('/convert/document/', {
      paths,
      store: store ? '1' : '0',
      save_in_group: saveInGroup ? 1 : 0
    });
    return response.data;
  }

  async getDocumentConversionStatus(token: number): Promise<ConversionStatus> {
    let axios = this.getAxios();
    let response = await axios.get(`/convert/document/status/${token}/`);
    return response.data;
  }

  // ── Video Encoding ──

  async convertVideo(
    paths: string[],
    store?: boolean
  ): Promise<{
    result: ConversionResult[];
    problems: Record<string, string>;
  }> {
    let axios = this.getAxios();
    let response = await axios.post('/convert/video/', {
      paths,
      store: store ? '1' : '0'
    });
    return response.data;
  }

  async getVideoConversionStatus(token: number): Promise<ConversionStatus> {
    let axios = this.getAxios();
    let response = await axios.get(`/convert/video/status/${token}/`);
    return response.data;
  }
}
