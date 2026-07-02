import { createAxios } from 'slates';
import { onePasswordApiError } from './errors';

export interface VaultSummary {
  id: string;
  name: string;
  description: string;
  attributeVersion: number;
  contentVersion: number;
  items: number;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItemField {
  id: string;
  section?: { id: string; label?: string };
  type: string;
  purpose?: string;
  label: string;
  value?: string;
  generate?: boolean;
  recipe?: {
    length?: number;
    characterSets?: string[];
  };
  entropy?: number;
  totp?: string;
  reference?: string;
}

export interface ItemSection {
  id: string;
  label?: string;
}

export interface ItemUrl {
  label?: string;
  primary?: boolean;
  href: string;
}

export interface FileSummary {
  id: string;
  name: string;
  size: number;
  contentPath?: string;
  content_path?: string;
  section?: { id: string; label?: string };
}

export interface ItemSummary {
  id: string;
  title: string;
  version: number;
  vault: { id: string; name?: string };
  category: string;
  lastEditedBy: string;
  createdAt: string;
  updatedAt: string;
  additionalInformation?: string;
  urls?: ItemUrl[];
  favorite?: boolean;
  tags?: string[];
  state?: string;
}

export interface FullItem extends ItemSummary {
  sections?: ItemSection[];
  fields?: ItemField[];
  files?: FileSummary[];
}

export interface CreateItemInput {
  vault: { id: string };
  title?: string;
  category: string;
  tags?: string[];
  fields?: Partial<ItemField>[];
  sections?: Partial<ItemSection>[];
  urls?: ItemUrl[];
  favorite?: boolean;
}

export interface PatchOperation {
  op: 'add' | 'remove' | 'replace';
  path: string;
  value?: unknown;
}

export class ConnectClient {
  private apiHttp;
  private serverHttp;

  constructor(config: { token: string; serverUrl: string }) {
    let serverUrl = config.serverUrl.replace(/\/+$/, '');
    let headers = {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    };

    this.apiHttp = createAxios({
      baseURL: `${serverUrl}/v1`,
      headers
    });

    this.serverHttp = createAxios({
      baseURL: serverUrl,
      headers: {
        ...headers
      }
    });
  }

  private async request<T>(operation: string, run: () => Promise<{ data: T }>): Promise<T> {
    try {
      let res = await run();
      return res.data;
    } catch (error) {
      throw onePasswordApiError(error, operation);
    }
  }

  // ---- Vaults ----

  async listVaults(filter?: string): Promise<VaultSummary[]> {
    let params: Record<string, string> = {};
    if (filter) params.filter = filter;
    return this.request('list vaults', () => this.apiHttp.get('/vaults', { params }));
  }

  async getVault(vaultId: string): Promise<VaultSummary> {
    return this.request('get vault', () => this.apiHttp.get(`/vaults/${vaultId}`));
  }

  // ---- Items ----

  async listItems(vaultId: string, filter?: string): Promise<ItemSummary[]> {
    let params: Record<string, string> = {};
    if (filter) params.filter = filter;
    return this.request('list items', () =>
      this.apiHttp.get(`/vaults/${vaultId}/items`, { params })
    );
  }

  async getItem(vaultId: string, itemId: string): Promise<FullItem> {
    return this.request('get item', () =>
      this.apiHttp.get(`/vaults/${vaultId}/items/${itemId}`)
    );
  }

  async createItem(vaultId: string, item: CreateItemInput): Promise<FullItem> {
    return this.request('create item', () =>
      this.apiHttp.post(`/vaults/${vaultId}/items`, item)
    );
  }

  async replaceItem(vaultId: string, itemId: string, item: FullItem): Promise<FullItem> {
    return this.request('replace item', () =>
      this.apiHttp.put(`/vaults/${vaultId}/items/${itemId}`, item)
    );
  }

  async patchItem(
    vaultId: string,
    itemId: string,
    operations: PatchOperation[]
  ): Promise<FullItem> {
    return this.request('patch item', () =>
      this.apiHttp.patch(`/vaults/${vaultId}/items/${itemId}`, operations)
    );
  }

  async deleteItem(vaultId: string, itemId: string): Promise<void> {
    await this.request('delete item', () =>
      this.apiHttp.delete(`/vaults/${vaultId}/items/${itemId}`)
    );
  }

  // ---- Files ----

  async listFiles(vaultId: string, itemId: string): Promise<FileSummary[]> {
    return this.request('list files', () =>
      this.apiHttp.get(`/vaults/${vaultId}/items/${itemId}/files`)
    );
  }

  async getFile(vaultId: string, itemId: string, fileId: string): Promise<FileSummary> {
    return this.request('get file metadata', () =>
      this.apiHttp.get(`/vaults/${vaultId}/items/${itemId}/files/${fileId}`)
    );
  }

  async getFileContent(
    vaultId: string,
    itemId: string,
    fileId: string
  ): Promise<DownloadedFileContent> {
    try {
      let res = await this.apiHttp.get(
        `/vaults/${vaultId}/items/${itemId}/files/${fileId}/content`,
        {
          responseType: 'arraybuffer'
        }
      );
      let raw = res.data;
      let buffer = Buffer.isBuffer(raw)
        ? raw
        : Buffer.from(raw instanceof ArrayBuffer ? new Uint8Array(raw) : raw);
      let contentType =
        typeof res.headers?.['content-type'] === 'string'
          ? res.headers['content-type']
          : 'application/octet-stream';

      return {
        contentBase64: buffer.toString('base64'),
        contentType,
        byteLength: buffer.byteLength
      };
    } catch (error) {
      throw onePasswordApiError(error, 'get file content');
    }
  }

  // ---- Activity ----

  async getActivity(limit?: number, offset?: number): Promise<ApiRequest[]> {
    let params: Record<string, string | number> = {};
    if (limit !== undefined) params.limit = limit;
    if (offset !== undefined) params.offset = offset;
    return this.request('list API activity', () => this.apiHttp.get('/activity', { params }));
  }

  // ---- Health ----

  async getServerHealth(): Promise<ServerHealth> {
    return this.request('get server health', () => this.serverHttp.get('/health'));
  }

  async getServerHeartbeat(): Promise<ServerHeartbeat> {
    try {
      let res = await this.serverHttp.get('/heartbeat');
      return {
        ok: res.status >= 200 && res.status < 300,
        status: res.status
      };
    } catch (error) {
      throw onePasswordApiError(error, 'get server heartbeat');
    }
  }

  async getPrometheusMetrics(): Promise<PrometheusMetrics> {
    try {
      let res = await this.serverHttp.get('/metrics', { responseType: 'text' });
      let content = typeof res.data === 'string' ? res.data : String(res.data ?? '');
      let contentType =
        typeof res.headers?.['content-type'] === 'string'
          ? res.headers['content-type']
          : 'text/plain; version=0.0.4';

      return {
        content,
        contentType,
        byteLength: Buffer.byteLength(content)
      };
    } catch (error) {
      throw onePasswordApiError(error, 'get Prometheus metrics');
    }
  }
}

export interface DownloadedFileContent {
  contentBase64: string;
  contentType: string;
  byteLength: number;
}

export interface ApiRequest {
  requestID?: string;
  requestId: string;
  timestamp: string;
  action: string;
  result: string;
  actor: {
    id: string;
    account: string;
    jti: string;
    userAgent: string;
    ip?: string;
    requestIp: string;
  };
  resource: {
    type: string;
    vault?: { id: string };
    item?: { id: string };
    itemVersion?: number;
  };
}

export interface ServerHealth {
  name: string;
  version: string;
  dependencies: Array<{
    service: string;
    status: string;
    message?: string;
  }>;
}

export interface ServerHeartbeat {
  ok: boolean;
  status: number;
}

export interface PrometheusMetrics {
  content: string;
  contentType: string;
  byteLength: number;
}
