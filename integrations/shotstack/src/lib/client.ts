import { createAxios } from 'slates';

export type Environment = 'production' | 'sandbox';

let getVersion = (env: Environment): string => {
  return env === 'production' ? 'v1' : 'stage';
};

let createApiClient = (
  apiPath: string,
  token: string,
  environment: Environment
): ReturnType<typeof createAxios> => {
  let version = getVersion(environment);
  return createAxios({
    baseURL: `https://api.shotstack.io/${apiPath}/${version}`,
    headers: {
      'x-api-key': token,
      'Content-Type': 'application/json'
    }
  });
};

export class EditClient {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string, environment: Environment) {
    this.http = createApiClient('edit', token, environment);
  }

  async render(edit: Record<string, any>): Promise<any> {
    let res = await this.http.post('/render', edit);
    return res.data;
  }

  async getRender(
    renderId: string,
    options?: { data?: boolean; merged?: boolean }
  ): Promise<any> {
    let params: Record<string, any> = {};
    if (options?.data) params.data = true;
    if (options?.merged) params.merged = true;
    let res = await this.http.get(`/render/${renderId}`, { params });
    return res.data;
  }

  async createTemplate(name: string, template: Record<string, any>): Promise<any> {
    let res = await this.http.post('/templates', { name, template });
    return res.data;
  }

  async listTemplates(): Promise<any> {
    let res = await this.http.get('/templates');
    return res.data;
  }

  async getTemplate(templateId: string): Promise<any> {
    let res = await this.http.get(`/templates/${templateId}`);
    return res.data;
  }

  async updateTemplate(
    templateId: string,
    name: string,
    template: Record<string, any>
  ): Promise<any> {
    let res = await this.http.put(`/templates/${templateId}`, { name, template });
    return res.data;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await this.http.delete(`/templates/${templateId}`);
  }

  async renderTemplate(
    templateId: string,
    merge?: Array<{ find: string; replace: string }>
  ): Promise<any> {
    let body: Record<string, any> = { id: templateId };
    if (merge && merge.length > 0) body.merge = merge;
    let res = await this.http.post('/templates/render', body);
    return res.data;
  }

  async probe(url: string): Promise<any> {
    let encodedUrl = encodeURIComponent(url);
    let res = await this.http.get(`/probe/${encodedUrl}`);
    return res.data;
  }
}

export class ServeClient {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string, environment: Environment) {
    this.http = createApiClient('serve', token, environment);
  }

  async getAsset(assetId: string): Promise<any> {
    let res = await this.http.get(`/assets/${assetId}`);
    return res.data;
  }

  async deleteAsset(assetId: string): Promise<void> {
    await this.http.delete(`/assets/${assetId}`);
  }

  async getAssetsByRenderId(renderId: string): Promise<any> {
    let res = await this.http.get(`/assets/render/${renderId}`);
    return res.data;
  }

  async getAssetsBySourceId(sourceId: string): Promise<any> {
    let res = await this.http.get(`/assets/source/${sourceId}`);
    return res.data;
  }

  async transferAsset(transfer: Record<string, any>): Promise<any> {
    let res = await this.http.post('/assets', transfer);
    return res.data;
  }
}

export class IngestClient {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string, environment: Environment) {
    this.http = createApiClient('ingest', token, environment);
  }

  async fetchSource(source: Record<string, any>): Promise<any> {
    let res = await this.http.post('/sources', source);
    return res.data;
  }

  async requestUploadUrl(options?: Record<string, any>): Promise<any> {
    let res = await this.http.post('/upload', options || {});
    return res.data;
  }

  async listSources(): Promise<any> {
    let res = await this.http.get('/sources');
    return res.data;
  }

  async getSource(sourceId: string): Promise<any> {
    let res = await this.http.get(`/sources/${sourceId}`);
    return res.data;
  }

  async deleteSource(sourceId: string): Promise<void> {
    await this.http.delete(`/sources/${sourceId}`);
  }
}

export class CreateClient {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string, environment: Environment) {
    this.http = createApiClient('create', token, environment);
  }

  async generateAsset(provider: string, options: Record<string, any>): Promise<any> {
    let res = await this.http.post('/assets', { provider, options });
    return res.data;
  }

  async getGeneratedAsset(assetId: string): Promise<any> {
    let res = await this.http.get(`/assets/${assetId}`);
    return res.data;
  }
}
