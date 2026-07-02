import { createAxios } from 'slates';

export class ConvexClient {
  private deploymentUrl: string;
  private token: string;
  private authType: string;

  constructor(config: { deploymentUrl: string; token: string; authType: string }) {
    this.deploymentUrl = config.deploymentUrl.replace(/\/$/, '');
    this.token = config.token;
    this.authType = config.authType;
  }

  private getAuthHeader(): string {
    if (this.authType === 'deploy_key') {
      return `Convex ${this.token}`;
    }
    return `Bearer ${this.token}`;
  }

  private createHttp() {
    return createAxios({
      baseURL: this.deploymentUrl,
      headers: {
        Authorization: this.getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Function Invocation ---

  async query(functionPath: string, args: Record<string, any> = {}): Promise<any> {
    let http = this.createHttp();
    let response = await http.post('/api/query', {
      path: functionPath,
      args,
      format: 'json'
    });
    return response.data;
  }

  async mutation(functionPath: string, args: Record<string, any> = {}): Promise<any> {
    let http = this.createHttp();
    let response = await http.post('/api/mutation', {
      path: functionPath,
      args,
      format: 'json'
    });
    return response.data;
  }

  async action(functionPath: string, args: Record<string, any> = {}): Promise<any> {
    let http = this.createHttp();
    let response = await http.post('/api/action', {
      path: functionPath,
      args,
      format: 'json'
    });
    return response.data;
  }

  // --- Streaming Export ---

  async listSnapshot(
    params: { tableName?: string; cursor?: string; snapshotId?: string } = {}
  ): Promise<{
    values: Record<string, any>[];
    cursor: string;
    snapshot: string;
    hasMore: boolean;
  }> {
    let http = this.createHttp();
    let queryParams: Record<string, string> = { format: 'json' };
    if (params.tableName) queryParams.tableName = params.tableName;
    if (params.cursor) queryParams.cursor = params.cursor;
    if (params.snapshotId) queryParams.snapshot = params.snapshotId;

    let response = await http.get('/api/list_snapshot', { params: queryParams });
    return response.data;
  }

  async documentDeltas(params: { cursor?: string; tableName?: string } = {}): Promise<{
    values: Record<string, any>[];
    cursor: string;
    hasMore: boolean;
  }> {
    let http = this.createHttp();
    let queryParams: Record<string, string> = { format: 'json' };
    if (params.cursor) queryParams.cursor = params.cursor;
    if (params.tableName) queryParams.tableName = params.tableName;

    let response = await http.get('/api/document_deltas', { params: queryParams });
    return response.data;
  }

  // --- File Storage ---

  async generateUploadUrl(): Promise<string> {
    let http = this.createHttp();
    let response = await http.post('/api/storage/generate-upload-url');
    return response.data;
  }

  async uploadFile(
    uploadUrl: string,
    fileContent: Uint8Array | string,
    contentType: string
  ): Promise<string> {
    let http = createAxios();
    let response = await http.post(uploadUrl, fileContent, {
      headers: { 'Content-Type': contentType }
    });
    return response.data.storageId;
  }

  async getFileUrl(storageId: string): Promise<string | null> {
    let http = this.createHttp();
    let response = await http.get(`/api/storage/${storageId}`);
    return response.data;
  }

  // --- Environment Variables ---

  async getEnvironmentVariables(): Promise<Array<{ name: string; value: string }>> {
    let http = this.createHttp();
    let response = await http.get('/api/get_environment_variables');
    return response.data;
  }

  async updateEnvironmentVariables(
    changes: Array<{ name: string; value: string }>
  ): Promise<void> {
    let http = this.createHttp();
    await http.post('/api/update_environment_variables', { changes });
  }
}
