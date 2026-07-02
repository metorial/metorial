import { createAxios } from 'slates';

let hubAxios = createAxios({
  baseURL: 'https://huggingface.co'
});

let inferenceAxios = createAxios({
  baseURL: 'https://api-inference.huggingface.co'
});

export type RepoType = 'model' | 'dataset' | 'space';

export interface RepoInfo {
  repoId: string;
  repoType: RepoType;
  name: string;
  private: boolean;
  author: string;
  sha: string;
  lastModified: string;
  disabled: boolean;
  gated: boolean | string;
  downloads: number;
  likes: number;
  tags: string[];
  libraryName?: string;
  pipelineTag?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface DiscussionInfo {
  discussionNum: number;
  title: string;
  status: string;
  author: string;
  isPullRequest: boolean;
  createdAt: string;
  [key: string]: any;
}

export interface CollectionInfo {
  collectionId: string;
  slug: string;
  title: string;
  description: string;
  owner: string;
  items: any[];
  lastUpdated: string;
  private: boolean;
  [key: string]: any;
}

export class HubClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.token}`
    };
  }

  // ---- User / Org ----

  async whoami(): Promise<any> {
    let response = await hubAxios.get('/api/whoami-v2', {
      headers: this.headers()
    });
    return response.data;
  }

  // ---- Repository Management ----

  private repoTypePrefix(type: RepoType): string {
    if (type === 'model') return 'models';
    if (type === 'dataset') return 'datasets';
    return 'spaces';
  }

  async createRepo(params: {
    repoType: RepoType;
    name: string;
    organization?: string;
    private?: boolean;
    sdk?: string;
    license?: string;
  }): Promise<any> {
    let body: any = {
      type: params.repoType,
      name: params.name,
      private: params.private ?? false
    };
    if (params.organization) body.organization = params.organization;
    if (params.sdk) body.sdk = params.sdk;
    if (params.license) body.license = params.license;

    let response = await hubAxios.post('/api/repos/create', body, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteRepo(params: {
    repoType: RepoType;
    repoId: string;
    organization?: string;
  }): Promise<void> {
    let body: any = {
      type: params.repoType,
      name: params.repoId
    };
    if (params.organization) body.organization = params.organization;

    await hubAxios.delete('/api/repos/delete', {
      headers: this.headers(),
      data: body
    });
  }

  async updateRepoVisibility(params: {
    repoType: RepoType;
    repoId: string;
    private: boolean;
  }): Promise<any> {
    let prefix = this.repoTypePrefix(params.repoType);
    let response = await hubAxios.put(
      `/api/${prefix}/${params.repoId}/settings`,
      { private: params.private },
      { headers: this.headers() }
    );
    return response.data;
  }

  async getRepoInfo(params: {
    repoType: RepoType;
    repoId: string;
    revision?: string;
  }): Promise<any> {
    let prefix = this.repoTypePrefix(params.repoType);
    let url = `/api/${prefix}/${params.repoId}`;
    if (params.revision) url += `/revision/${params.revision}`;

    let response = await hubAxios.get(url, {
      headers: this.headers()
    });
    return response.data;
  }

  // ---- Search ----

  async searchModels(params: {
    search?: string;
    author?: string;
    filter?: string;
    tags?: string[];
    library?: string;
    sort?: string;
    direction?: string;
    limit?: number;
    full?: boolean;
  }): Promise<any[]> {
    let queryParams: any = {};
    if (params.search) queryParams.search = params.search;
    if (params.author) queryParams.author = params.author;
    if (params.filter) queryParams.filter = params.filter;
    if (params.tags) queryParams.tags = params.tags.join(',');
    if (params.library) queryParams.library = params.library;
    if (params.sort) queryParams.sort = params.sort;
    if (params.direction) queryParams.direction = params.direction;
    if (params.limit) queryParams.limit = params.limit;
    if (params.full) queryParams.full = params.full;

    let response = await hubAxios.get('/api/models', {
      headers: this.headers(),
      params: queryParams
    });
    return response.data;
  }

  async searchDatasets(params: {
    search?: string;
    author?: string;
    filter?: string;
    tags?: string[];
    sort?: string;
    direction?: string;
    limit?: number;
    full?: boolean;
  }): Promise<any[]> {
    let queryParams: any = {};
    if (params.search) queryParams.search = params.search;
    if (params.author) queryParams.author = params.author;
    if (params.filter) queryParams.filter = params.filter;
    if (params.tags) queryParams.tags = params.tags.join(',');
    if (params.sort) queryParams.sort = params.sort;
    if (params.direction) queryParams.direction = params.direction;
    if (params.limit) queryParams.limit = params.limit;
    if (params.full) queryParams.full = params.full;

    let response = await hubAxios.get('/api/datasets', {
      headers: this.headers(),
      params: queryParams
    });
    return response.data;
  }

  async searchSpaces(params: {
    search?: string;
    author?: string;
    filter?: string;
    tags?: string[];
    sort?: string;
    direction?: string;
    limit?: number;
    full?: boolean;
  }): Promise<any[]> {
    let queryParams: any = {};
    if (params.search) queryParams.search = params.search;
    if (params.author) queryParams.author = params.author;
    if (params.filter) queryParams.filter = params.filter;
    if (params.tags) queryParams.tags = params.tags.join(',');
    if (params.sort) queryParams.sort = params.sort;
    if (params.direction) queryParams.direction = params.direction;
    if (params.limit) queryParams.limit = params.limit;
    if (params.full) queryParams.full = params.full;

    let response = await hubAxios.get('/api/spaces', {
      headers: this.headers(),
      params: queryParams
    });
    return response.data;
  }

  // ---- File Operations ----

  async listRepoFiles(params: {
    repoType: RepoType;
    repoId: string;
    revision?: string;
    path?: string;
  }): Promise<any[]> {
    let prefix = this.repoTypePrefix(params.repoType);
    let path = params.path || '';
    let url = `/api/${prefix}/${params.repoId}/tree/${params.revision || 'main'}`;
    if (path) url += `/${path}`;

    let response = await hubAxios.get(url, {
      headers: this.headers()
    });
    return response.data;
  }

  async getFileContent(params: {
    repoType: RepoType;
    repoId: string;
    filePath: string;
    revision?: string;
  }): Promise<string> {
    let _prefix = this.repoTypePrefix(params.repoType);
    let revision = params.revision || 'main';
    let url = `/${params.repoId}/raw/${revision}/${params.filePath}`;
    if (params.repoType === 'dataset') {
      url = `/datasets/${params.repoId}/raw/${revision}/${params.filePath}`;
    } else if (params.repoType === 'space') {
      url = `/spaces/${params.repoId}/raw/${revision}/${params.filePath}`;
    }

    let response = await hubAxios.get(url, {
      headers: this.headers(),
      responseType: 'text'
    });
    return response.data;
  }

  async uploadFile(params: {
    repoType: RepoType;
    repoId: string;
    filePath: string;
    content: string;
    commitMessage?: string;
    revision?: string;
  }): Promise<any> {
    let prefix = this.repoTypePrefix(params.repoType);
    let revision = params.revision || 'main';

    // Use the commit API for uploading files
    let _operations = [
      {
        key: 'file',
        value: {
          content: params.content,
          path: params.filePath,
          encoding: 'utf-8'
        }
      }
    ];

    let response = await hubAxios.post(
      `/api/${prefix}/${params.repoId}/commit/${revision}`,
      {
        summary: params.commitMessage || `Upload ${params.filePath}`,
        operations: [
          {
            op: 'addOrUpdate',
            path: params.filePath,
            content: params.content,
            encoding: 'utf-8'
          }
        ]
      },
      {
        headers: {
          ...this.headers(),
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }

  async deleteFile(params: {
    repoType: RepoType;
    repoId: string;
    filePath: string;
    commitMessage?: string;
    revision?: string;
  }): Promise<any> {
    let prefix = this.repoTypePrefix(params.repoType);
    let revision = params.revision || 'main';

    let response = await hubAxios.post(
      `/api/${prefix}/${params.repoId}/commit/${revision}`,
      {
        summary: params.commitMessage || `Delete ${params.filePath}`,
        operations: [
          {
            op: 'delete',
            path: params.filePath
          }
        ]
      },
      {
        headers: {
          ...this.headers(),
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }

  // ---- Discussions ----

  async listDiscussions(params: { repoType: RepoType; repoId: string }): Promise<any> {
    let prefix = this.repoTypePrefix(params.repoType);
    let response = await hubAxios.get(`/api/${prefix}/${params.repoId}/discussions`, {
      headers: this.headers()
    });
    return response.data;
  }

  async getDiscussion(params: {
    repoType: RepoType;
    repoId: string;
    discussionNum: number;
  }): Promise<any> {
    let prefix = this.repoTypePrefix(params.repoType);
    let response = await hubAxios.get(
      `/api/${prefix}/${params.repoId}/discussions/${params.discussionNum}`,
      { headers: this.headers() }
    );
    return response.data;
  }

  async createDiscussion(params: {
    repoType: RepoType;
    repoId: string;
    title: string;
    description?: string;
    isPullRequest?: boolean;
  }): Promise<any> {
    let prefix = this.repoTypePrefix(params.repoType);
    let body: any = {
      title: params.title,
      description: params.description || ''
    };
    if (params.isPullRequest) {
      body.pullRequest = true;
    }

    let response = await hubAxios.post(`/api/${prefix}/${params.repoId}/discussions`, body, {
      headers: this.headers()
    });
    return response.data;
  }

  async commentOnDiscussion(params: {
    repoType: RepoType;
    repoId: string;
    discussionNum: number;
    comment: string;
  }): Promise<any> {
    let prefix = this.repoTypePrefix(params.repoType);
    let response = await hubAxios.post(
      `/api/${prefix}/${params.repoId}/discussions/${params.discussionNum}/comment`,
      { comment: params.comment },
      { headers: this.headers() }
    );
    return response.data;
  }

  async updateDiscussionStatus(params: {
    repoType: RepoType;
    repoId: string;
    discussionNum: number;
    status: 'open' | 'closed';
    comment?: string;
  }): Promise<any> {
    let prefix = this.repoTypePrefix(params.repoType);
    let response = await hubAxios.post(
      `/api/${prefix}/${params.repoId}/discussions/${params.discussionNum}/status`,
      { status: params.status, comment: params.comment || '' },
      { headers: this.headers() }
    );
    return response.data;
  }

  async mergeDiscussion(params: {
    repoType: RepoType;
    repoId: string;
    discussionNum: number;
    comment?: string;
  }): Promise<any> {
    let prefix = this.repoTypePrefix(params.repoType);
    let response = await hubAxios.post(
      `/api/${prefix}/${params.repoId}/discussions/${params.discussionNum}/merge`,
      { comment: params.comment || '' },
      { headers: this.headers() }
    );
    return response.data;
  }

  // ---- Collections ----

  async getCollection(params: { slug: string }): Promise<any> {
    let response = await hubAxios.get(`/api/collections/${params.slug}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createCollection(params: {
    title: string;
    namespace: string;
    description?: string;
    private?: boolean;
  }): Promise<any> {
    let response = await hubAxios.post(
      '/api/collections',
      {
        title: params.title,
        namespace: params.namespace,
        description: params.description || '',
        private: params.private ?? false
      },
      { headers: this.headers() }
    );
    return response.data;
  }

  async deleteCollection(params: { slug: string }): Promise<void> {
    await hubAxios.delete(`/api/collections/${params.slug}`, { headers: this.headers() });
  }

  async addCollectionItem(params: {
    slug: string;
    itemId: string;
    itemType: RepoType;
    note?: string;
  }): Promise<any> {
    let response = await hubAxios.post(
      `/api/collections/${params.slug}/item`,
      {
        item: { id: params.itemId, type: params.itemType },
        note: params.note
      },
      { headers: this.headers() }
    );
    return response.data;
  }

  async removeCollectionItem(params: { slug: string; itemId: string }): Promise<void> {
    await hubAxios.delete(`/api/collections/${params.slug}/items/${params.itemId}`, {
      headers: this.headers()
    });
  }

  // ---- Spaces Management ----

  async getSpaceRuntime(params: { repoId: string }): Promise<any> {
    let response = await hubAxios.get(`/api/spaces/${params.repoId}/runtime`, {
      headers: this.headers()
    });
    return response.data;
  }

  async setSpaceHardware(params: { repoId: string; hardware: string }): Promise<any> {
    let response = await hubAxios.post(
      `/api/spaces/${params.repoId}/hardware`,
      { flavor: params.hardware },
      { headers: this.headers() }
    );
    return response.data;
  }

  async pauseSpace(params: { repoId: string }): Promise<any> {
    let response = await hubAxios.post(
      `/api/spaces/${params.repoId}/pause`,
      {},
      { headers: this.headers() }
    );
    return response.data;
  }

  async restartSpace(params: { repoId: string }): Promise<any> {
    let response = await hubAxios.post(
      `/api/spaces/${params.repoId}/restart`,
      {},
      { headers: this.headers() }
    );
    return response.data;
  }

  async addSpaceSecret(params: { repoId: string; key: string; value: string }): Promise<void> {
    await hubAxios.post(
      `/api/spaces/${params.repoId}/secrets`,
      { key: params.key, value: params.value },
      { headers: this.headers() }
    );
  }

  async deleteSpaceSecret(params: { repoId: string; key: string }): Promise<void> {
    await hubAxios.delete(`/api/spaces/${params.repoId}/secrets`, {
      headers: this.headers(),
      data: { key: params.key }
    });
  }

  async addSpaceVariable(params: {
    repoId: string;
    key: string;
    value: string;
  }): Promise<void> {
    await hubAxios.post(
      `/api/spaces/${params.repoId}/variables`,
      { key: params.key, value: params.value },
      { headers: this.headers() }
    );
  }

  async deleteSpaceVariable(params: { repoId: string; key: string }): Promise<void> {
    await hubAxios.delete(`/api/spaces/${params.repoId}/variables`, {
      headers: this.headers(),
      data: { key: params.key }
    });
  }

  // ---- Webhook Management ----

  async listWebhooks(): Promise<any[]> {
    let response = await hubAxios.get('/api/settings/webhooks', { headers: this.headers() });
    return response.data;
  }

  async createWebhook(params: {
    url: string;
    watched: { type: string; name: string }[];
    domains: string[];
    secret?: string;
  }): Promise<any> {
    let body: any = {
      url: params.url,
      watched: params.watched,
      domains: params.domains
    };
    if (params.secret) body.secret = params.secret;

    let response = await hubAxios.post('/api/settings/webhooks', body, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateWebhook(params: {
    webhookId: string;
    url?: string;
    watched?: { type: string; name: string }[];
    domains?: string[];
    secret?: string;
  }): Promise<any> {
    let body: any = {};
    if (params.url) body.url = params.url;
    if (params.watched) body.watched = params.watched;
    if (params.domains) body.domains = params.domains;
    if (params.secret) body.secret = params.secret;

    let response = await hubAxios.post(`/api/settings/webhooks/${params.webhookId}`, body, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteWebhook(params: { webhookId: string }): Promise<void> {
    await hubAxios.delete(`/api/settings/webhooks/${params.webhookId}`, {
      headers: this.headers()
    });
  }

  async enableWebhook(params: { webhookId: string }): Promise<any> {
    let response = await hubAxios.post(
      `/api/settings/webhooks/${params.webhookId}/enable`,
      {},
      { headers: this.headers() }
    );
    return response.data;
  }

  async disableWebhook(params: { webhookId: string }): Promise<any> {
    let response = await hubAxios.post(
      `/api/settings/webhooks/${params.webhookId}/disable`,
      {},
      { headers: this.headers() }
    );
    return response.data;
  }

  // ---- Inference ----

  async inference(params: {
    modelId: string;
    inputs: any;
    parameters?: any;
    options?: any;
  }): Promise<any> {
    let body: any = {
      inputs: params.inputs
    };
    if (params.parameters) body.parameters = params.parameters;
    if (params.options) body.options = params.options;

    let response = await inferenceAxios.post(`/models/${params.modelId}`, body, {
      headers: this.headers()
    });
    return response.data;
  }

  async chatCompletion(params: {
    model: string;
    messages: { role: string; content: string }[];
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stop?: string[];
    stream?: boolean;
  }): Promise<any> {
    let body: any = {
      model: params.model,
      messages: params.messages
    };
    if (params.maxTokens !== undefined) body.max_tokens = params.maxTokens;
    if (params.temperature !== undefined) body.temperature = params.temperature;
    if (params.topP !== undefined) body.top_p = params.topP;
    if (params.stop) body.stop = params.stop;
    body.stream = false;

    let response = await inferenceAxios.post('/v1/chat/completions', body, {
      headers: this.headers()
    });
    return response.data;
  }

  async textGeneration(params: {
    model: string;
    inputs: string;
    maxNewTokens?: number;
    temperature?: number;
    topP?: number;
    repetitionPenalty?: number;
    doSample?: boolean;
    returnFullText?: boolean;
  }): Promise<any> {
    let parameters: any = {};
    if (params.maxNewTokens !== undefined) parameters.max_new_tokens = params.maxNewTokens;
    if (params.temperature !== undefined) parameters.temperature = params.temperature;
    if (params.topP !== undefined) parameters.top_p = params.topP;
    if (params.repetitionPenalty !== undefined)
      parameters.repetition_penalty = params.repetitionPenalty;
    if (params.doSample !== undefined) parameters.do_sample = params.doSample;
    if (params.returnFullText !== undefined)
      parameters.return_full_text = params.returnFullText;

    let response = await inferenceAxios.post(
      `/models/${params.model}`,
      {
        inputs: params.inputs,
        parameters: Object.keys(parameters).length > 0 ? parameters : undefined
      },
      { headers: this.headers() }
    );
    return response.data;
  }

  async featureExtraction(params: { model: string; inputs: string | string[] }): Promise<any> {
    let response = await inferenceAxios.post(
      `/models/${params.model}`,
      { inputs: params.inputs },
      { headers: this.headers() }
    );
    return response.data;
  }

  async summarization(params: {
    model: string;
    inputs: string;
    maxLength?: number;
    minLength?: number;
  }): Promise<any> {
    let parameters: any = {};
    if (params.maxLength !== undefined) parameters.max_length = params.maxLength;
    if (params.minLength !== undefined) parameters.min_length = params.minLength;

    let response = await inferenceAxios.post(
      `/models/${params.model}`,
      {
        inputs: params.inputs,
        parameters: Object.keys(parameters).length > 0 ? parameters : undefined
      },
      { headers: this.headers() }
    );
    return response.data;
  }
}
