import { createAxios } from 'slates';

let NEEDLE_BASE_URL = 'https://needle.app';
let NEEDLE_SEARCH_URL = 'https://search.needle.app';

export interface NeedleCollection {
  id: string;
  name: string;
  created_at: string;
  search_queries: number;
}

export interface NeedleCollectionStats {
  users: number;
  chunks_count: number;
  characters: number;
  data_stats: Array<{
    status: string;
    count: number;
    size: number;
  }>;
}

export interface NeedleCollectionFile {
  id: string;
  name: string;
  size?: number;
  content_type?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NeedleAddFileEntry {
  name: string;
  url: string;
}

export interface NeedleAddFileResult {
  id: string;
  name: string;
  url: string;
  status: string;
  size?: number;
  content_type?: string;
  created_at?: string;
  updated_at?: string;
  md5_hash?: string;
  error?: string;
}

export interface NeedleSearchResult {
  id: string;
  content: string;
  file_id: string;
}

export interface NeedleUploadUrlResult {
  url: string;
  upload_url: string;
}

export interface NeedleConnector {
  id: string;
  name: string;
  type: string;
  collection_id: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
}

export class NeedleClient {
  private api: ReturnType<typeof createAxios>;
  private searchApi: ReturnType<typeof createAxios>;

  constructor(token: string) {
    let headers = {
      'x-api-key': token,
      'Content-Type': 'application/json'
    };

    this.api = createAxios({
      baseURL: NEEDLE_BASE_URL,
      headers
    });

    this.searchApi = createAxios({
      baseURL: NEEDLE_SEARCH_URL,
      headers
    });
  }

  // --- Collections ---

  async listCollections(): Promise<NeedleCollection[]> {
    let res = await this.api.get('/api/v1/collections');
    return res.data.result ?? res.data;
  }

  async getCollection(collectionId: string): Promise<NeedleCollection> {
    let res = await this.api.get(`/api/v1/collections/${collectionId}`);
    return res.data.result ?? res.data;
  }

  async getCollectionStats(collectionId: string): Promise<NeedleCollectionStats> {
    let res = await this.api.get(`/api/v1/collections/${collectionId}/stats`);
    return res.data.result ?? res.data;
  }

  async createCollection(
    name: string
  ): Promise<{ name: string; id: string; created_at: string }> {
    let res = await this.api.post('/api/v1/collections', { name });
    return res.data.result ?? res.data;
  }

  async deleteCollection(collectionId: string): Promise<void> {
    await this.api.delete(`/api/v1/collections/${collectionId}`);
  }

  // --- Collection Files ---

  async listCollectionFiles(
    collectionId: string,
    options?: { offset?: number; limit?: number }
  ): Promise<NeedleCollectionFile[]> {
    let params: Record<string, string> = {};
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.limit !== undefined) params.limit = String(options.limit);

    let res = await this.api.get(`/api/v1/collections/${collectionId}/files`, { params });
    return res.data.result ?? res.data;
  }

  async addFilesToCollection(
    collectionId: string,
    files: NeedleAddFileEntry[]
  ): Promise<NeedleAddFileResult[]> {
    let res = await this.api.post(`/api/v1/collections/${collectionId}/files`, { files });
    return res.data.result ?? res.data;
  }

  async deleteFilesFromCollection(collectionId: string, fileIds: string[]): Promise<void> {
    await this.api.delete(`/api/v1/collections/${collectionId}/files`, {
      data: { file_ids: fileIds }
    });
  }

  // --- Search ---

  async searchCollection(
    collectionId: string,
    text: string,
    options?: { topK?: number; offset?: number }
  ): Promise<NeedleSearchResult[]> {
    let body: Record<string, unknown> = { text };
    if (options?.topK !== undefined) body.top_k = options.topK;
    if (options?.offset !== undefined) body.offset = options.offset;

    let res = await this.searchApi.post(`/api/v1/collections/${collectionId}/search`, body);
    return res.data.result ?? res.data;
  }

  // --- Files (upload/download URLs) ---

  async getUploadUrl(contentTypes: string[]): Promise<NeedleUploadUrlResult[]> {
    let res = await this.api.get('/api/v1/files/upload_url', {
      params: { content_type: contentTypes.join(',') }
    });
    return res.data.result ?? res.data;
  }

  async getDownloadUrl(fileId: string): Promise<string> {
    let res = await this.api.get(`/api/v1/files/${fileId}/download_url`);
    let data = res.data.result ?? res.data;
    return typeof data === 'string' ? data : data.url;
  }

  // --- Connectors ---

  async listConnectors(): Promise<NeedleConnector[]> {
    let res = await this.api.get('/api/v1/connectors');
    return res.data.result ?? res.data;
  }
}
