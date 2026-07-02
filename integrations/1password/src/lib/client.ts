import { createAxios } from 'slates';

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
  contentPath: string;
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
  private http;

  constructor(config: { token: string; serverUrl: string }) {
    this.http = createAxios({
      baseURL: `${config.serverUrl.replace(/\/+$/, '')}/v1`,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Vaults ----

  async listVaults(filter?: string): Promise<VaultSummary[]> {
    let params: Record<string, string> = {};
    if (filter) params.filter = filter;
    let res = await this.http.get('/vaults', { params });
    return res.data;
  }

  async getVault(vaultId: string): Promise<VaultSummary> {
    let res = await this.http.get(`/vaults/${vaultId}`);
    return res.data;
  }

  // ---- Items ----

  async listItems(vaultId: string, filter?: string): Promise<ItemSummary[]> {
    let params: Record<string, string> = {};
    if (filter) params.filter = filter;
    let res = await this.http.get(`/vaults/${vaultId}/items`, { params });
    return res.data;
  }

  async getItem(vaultId: string, itemId: string): Promise<FullItem> {
    let res = await this.http.get(`/vaults/${vaultId}/items/${itemId}`);
    return res.data;
  }

  async createItem(vaultId: string, item: CreateItemInput): Promise<FullItem> {
    let res = await this.http.post(`/vaults/${vaultId}/items`, item);
    return res.data;
  }

  async replaceItem(vaultId: string, itemId: string, item: FullItem): Promise<FullItem> {
    let res = await this.http.put(`/vaults/${vaultId}/items/${itemId}`, item);
    return res.data;
  }

  async patchItem(
    vaultId: string,
    itemId: string,
    operations: PatchOperation[]
  ): Promise<FullItem> {
    let res = await this.http.patch(`/vaults/${vaultId}/items/${itemId}`, operations);
    return res.data;
  }

  async deleteItem(vaultId: string, itemId: string): Promise<void> {
    await this.http.delete(`/vaults/${vaultId}/items/${itemId}`);
  }

  // ---- Files ----

  async getFileContent(vaultId: string, itemId: string, fileId: string): Promise<string> {
    let res = await this.http.get(
      `/vaults/${vaultId}/items/${itemId}/files/${fileId}/content`,
      {
        responseType: 'text'
      }
    );
    return res.data;
  }

  async listFiles(vaultId: string, itemId: string): Promise<FileSummary[]> {
    let res = await this.http.get(`/vaults/${vaultId}/items/${itemId}/files`);
    return res.data;
  }

  // ---- Activity ----

  async getActivity(limit?: number, offset?: number): Promise<ApiRequest[]> {
    let params: Record<string, string | number> = {};
    if (limit !== undefined) params.limit = limit;
    if (offset !== undefined) params.offset = offset;
    let res = await this.http.get('/activity', { params });
    return res.data;
  }

  // ---- Health ----

  async getServerHealth(): Promise<ServerHealth> {
    let res = await this.http.get('/health');
    return res.data;
  }
}

export interface ApiRequest {
  requestId: string;
  timestamp: string;
  action: string;
  result: string;
  actor: {
    id: string;
    account: string;
    jti: string;
    userAgent: string;
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
