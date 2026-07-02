import { createAxios } from 'slates';
import { huggingFaceApiError, huggingFaceServiceError } from './errors';

let hubAxios = createAxios({
  baseURL: 'https://huggingface.co'
});

let routerAxios = createAxios({
  baseURL: 'https://router.huggingface.co'
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

type AxiosResult<T> = Promise<{ data: T }>;

let encodePath = (path: string) =>
  path
    .split('/')
    .filter(segment => segment.length > 0)
    .map(segment => encodeURIComponent(segment))
    .join('/');

let splitRepoId = (repoId: string) => {
  let parts = repoId.split('/').filter(Boolean);
  let namespace = parts[0];
  let repo = parts[1];
  if (parts.length !== 2 || !namespace || !repo) {
    throw huggingFaceServiceError(
      'repoId must be a full Hugging Face repository ID in "namespace/name" format.'
    );
  }

  return {
    namespace,
    repo
  };
};

let repoRoute = (prefix: string, repoId: string, ...segments: string[]) => {
  let { namespace, repo } = splitRepoId(repoId);
  let suffix = segments
    .filter(segment => segment.length > 0)
    .map(segment => encodePath(segment))
    .join('/');

  return `/api/${prefix}/${encodeURIComponent(namespace)}/${encodeURIComponent(repo)}${
    suffix ? `/${suffix}` : ''
  }`;
};

let discussionRoute = (repoType: RepoType, repoId: string, ...segments: string[]) =>
  repoRoute(
    repoType === 'model' ? 'models' : `${repoType}s`,
    repoId,
    'discussions',
    ...segments
  );

let repoResolveRoute = (
  repoType: RepoType,
  repoId: string,
  revision: string,
  filePath: string
) => {
  let { namespace, repo } = splitRepoId(repoId);
  let prefix = repoType === 'model' ? '' : `/${repoType}s`;

  return `${prefix}/${encodeURIComponent(namespace)}/${encodeURIComponent(repo)}/resolve/${encodeURIComponent(
    revision
  )}/${encodePath(filePath)}`;
};

let collectionRoute = (slug: string, ...segments: string[]) => {
  let [namespace, collectionSlug] = slug.split('/');
  if (!namespace || !collectionSlug) {
    throw huggingFaceServiceError(
      'Collection slug must include the namespace, for example "username/collection-name-abc123".'
    );
  }

  let suffix = segments
    .filter(segment => segment.length > 0)
    .map(segment => encodePath(segment))
    .join('/');

  return `/api/collections/${encodeURIComponent(namespace)}/${encodeURIComponent(collectionSlug)}${
    suffix ? `/${suffix}` : ''
  }`;
};

let collectionItemRoute = (slug: string, itemId: string) => {
  let [namespace, collectionSlug] = slug.split('/');
  if (!namespace || !collectionSlug) {
    throw huggingFaceServiceError(
      'Collection slug must include the namespace, for example "username/collection-name-abc123".'
    );
  }

  return `/api/collections/${encodeURIComponent(namespace)}/${encodeURIComponent(
    collectionSlug
  )}/items/${encodeURIComponent(itemId)}`;
};

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

  private jsonHeaders() {
    return {
      ...this.headers(),
      'Content-Type': 'application/json'
    };
  }

  private async request<T>(operation: string, run: () => AxiosResult<T>): Promise<T> {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw huggingFaceApiError(error, operation);
    }
  }

  private async requestVoid(operation: string, run: () => Promise<unknown>): Promise<void> {
    try {
      await run();
    } catch (error) {
      throw huggingFaceApiError(error, operation);
    }
  }

  // ---- User / Org ----

  async whoami(): Promise<any> {
    return await this.request('get current user', async () =>
      hubAxios.get('/api/whoami-v2', {
        headers: this.headers()
      })
    );
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

    return await this.request('create repository', async () =>
      hubAxios.post('/api/repos/create', body, {
        headers: this.jsonHeaders()
      })
    );
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

    await this.requestVoid('delete repository', async () =>
      hubAxios.delete('/api/repos/delete', {
        headers: this.jsonHeaders(),
        data: body
      })
    );
  }

  async duplicateSpace(params: {
    sourceRepoId: string;
    destinationRepoId: string;
    private?: boolean;
    visibility?: 'private' | 'public' | 'protected';
    hardware?: string;
    sleepTimeSeconds?: number;
  }): Promise<any> {
    let body: any = {
      repository: params.destinationRepoId
    };
    if (params.private !== undefined) body.private = params.private;
    if (params.visibility) body.visibility = params.visibility;
    if (params.hardware) body.hardware = params.hardware;
    if (params.sleepTimeSeconds !== undefined) body.sleepTimeSeconds = params.sleepTimeSeconds;

    return await this.request('duplicate Space repository', async () =>
      hubAxios.post(repoRoute('spaces', params.sourceRepoId, 'duplicate'), body, {
        headers: this.jsonHeaders()
      })
    );
  }

  async updateRepoVisibility(params: {
    repoType: RepoType;
    repoId: string;
    private: boolean;
  }): Promise<any> {
    let prefix = this.repoTypePrefix(params.repoType);
    return await this.request('update repository visibility', async () =>
      hubAxios.put(
        repoRoute(prefix, params.repoId, 'settings'),
        { private: params.private },
        { headers: this.jsonHeaders() }
      )
    );
  }

  async getRepoInfo(params: {
    repoType: RepoType;
    repoId: string;
    revision?: string;
  }): Promise<any> {
    let prefix = this.repoTypePrefix(params.repoType);
    let url = repoRoute(prefix, params.repoId);
    if (params.revision) url += `/revision/${encodeURIComponent(params.revision)}`;

    return await this.request('get repository info', async () =>
      hubAxios.get(url, {
        headers: this.headers()
      })
    );
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
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.full !== undefined) queryParams.full = params.full;

    return await this.request('search models', async () =>
      hubAxios.get('/api/models', {
        headers: this.headers(),
        params: queryParams
      })
    );
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
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.full !== undefined) queryParams.full = params.full;

    return await this.request('search datasets', async () =>
      hubAxios.get('/api/datasets', {
        headers: this.headers(),
        params: queryParams
      })
    );
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
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.full !== undefined) queryParams.full = params.full;

    return await this.request('search spaces', async () =>
      hubAxios.get('/api/spaces', {
        headers: this.headers(),
        params: queryParams
      })
    );
  }

  // ---- File Operations ----

  async listRepoFiles(params: {
    repoType: RepoType;
    repoId: string;
    revision?: string;
    path?: string;
  }): Promise<any[]> {
    let prefix = this.repoTypePrefix(params.repoType);
    let revision = params.revision || 'main';
    let path = params.path || '';

    return await this.request('list repository files', async () =>
      hubAxios.get(repoRoute(prefix, params.repoId, 'tree', revision, path), {
        headers: this.headers()
      })
    );
  }

  async getFileContent(params: {
    repoType: RepoType;
    repoId: string;
    filePath: string;
    revision?: string;
  }): Promise<{ content: string; contentType?: string; size: number }> {
    let response = await this.request<{ content: string; contentType?: string; size: number }>(
      'download repository file',
      async () => {
        let res = await hubAxios.get(
          repoResolveRoute(
            params.repoType,
            params.repoId,
            params.revision || 'main',
            params.filePath
          ),
          {
            headers: this.headers(),
            responseType: 'text'
          }
        );

        let content = typeof res.data === 'string' ? res.data : String(res.data ?? '');
        let contentTypeHeader = res.headers?.['content-type'];
        let contentType =
          typeof contentTypeHeader === 'string' ? contentTypeHeader : undefined;

        return {
          data: {
            content,
            contentType,
            size: Buffer.byteLength(content)
          }
        };
      }
    );

    return response;
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

    return await this.request('upload repository file', async () =>
      hubAxios.post(
        repoRoute(prefix, params.repoId, 'commit', revision),
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
          headers: this.jsonHeaders()
        }
      )
    );
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

    return await this.request('delete repository file', async () =>
      hubAxios.post(
        repoRoute(prefix, params.repoId, 'commit', revision),
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
          headers: this.jsonHeaders()
        }
      )
    );
  }

  // ---- Discussions ----

  async listDiscussions(params: { repoType: RepoType; repoId: string }): Promise<any> {
    return await this.request('list discussions', async () =>
      hubAxios.get(discussionRoute(params.repoType, params.repoId), {
        headers: this.headers()
      })
    );
  }

  async getDiscussion(params: {
    repoType: RepoType;
    repoId: string;
    discussionNum: number;
  }): Promise<any> {
    return await this.request('get discussion', async () =>
      hubAxios.get(
        discussionRoute(params.repoType, params.repoId, String(params.discussionNum)),
        {
          headers: this.headers()
        }
      )
    );
  }

  async createDiscussion(params: {
    repoType: RepoType;
    repoId: string;
    title: string;
    description?: string;
    isPullRequest?: boolean;
  }): Promise<any> {
    let body: any = {
      title: params.title,
      description: params.description || ''
    };
    if (params.isPullRequest) {
      body.pullRequest = true;
    }

    return await this.request('create discussion', async () =>
      hubAxios.post(discussionRoute(params.repoType, params.repoId), body, {
        headers: this.jsonHeaders()
      })
    );
  }

  async commentOnDiscussion(params: {
    repoType: RepoType;
    repoId: string;
    discussionNum: number;
    comment: string;
  }): Promise<any> {
    return await this.request('comment on discussion', async () =>
      hubAxios.post(
        discussionRoute(
          params.repoType,
          params.repoId,
          String(params.discussionNum),
          'comment'
        ),
        { comment: params.comment },
        { headers: this.jsonHeaders() }
      )
    );
  }

  async updateDiscussionStatus(params: {
    repoType: RepoType;
    repoId: string;
    discussionNum: number;
    status: 'open' | 'closed';
    comment?: string;
  }): Promise<any> {
    return await this.request('update discussion status', async () =>
      hubAxios.post(
        discussionRoute(
          params.repoType,
          params.repoId,
          String(params.discussionNum),
          'status'
        ),
        { status: params.status, comment: params.comment || '' },
        { headers: this.jsonHeaders() }
      )
    );
  }

  async mergeDiscussion(params: {
    repoType: RepoType;
    repoId: string;
    discussionNum: number;
    comment?: string;
  }): Promise<any> {
    return await this.request('merge discussion', async () =>
      hubAxios.post(
        discussionRoute(params.repoType, params.repoId, String(params.discussionNum), 'merge'),
        { comment: params.comment || '' },
        { headers: this.jsonHeaders() }
      )
    );
  }

  // ---- Collections ----

  async listCollections(params: {
    query?: string;
    owner?: string;
    item?: string;
    sort?: 'upvotes' | 'lastModified' | 'trending';
    cursor?: string;
    limit?: number;
  }): Promise<any> {
    let queryParams: any = {};
    if (params.query) queryParams.q = params.query;
    if (params.owner) queryParams.owner = params.owner;
    if (params.item) queryParams.item = params.item;
    if (params.sort) queryParams.sort = params.sort;
    if (params.cursor) queryParams.cursor = params.cursor;
    if (params.limit !== undefined) queryParams.limit = params.limit;

    return await this.request('list collections', async () =>
      hubAxios.get('/api/collections', {
        headers: this.headers(),
        params: queryParams
      })
    );
  }

  async getCollection(params: { slug: string }): Promise<any> {
    return await this.request('get collection', async () =>
      hubAxios.get(collectionRoute(params.slug), {
        headers: this.headers()
      })
    );
  }

  async createCollection(params: {
    title: string;
    namespace: string;
    description?: string;
    private?: boolean;
  }): Promise<any> {
    return await this.request('create collection', async () =>
      hubAxios.post(
        '/api/collections',
        {
          title: params.title,
          namespace: params.namespace,
          description: params.description || '',
          private: params.private ?? false
        },
        { headers: this.jsonHeaders() }
      )
    );
  }

  async updateCollection(params: {
    slug: string;
    title?: string;
    description?: string;
    private?: boolean;
    theme?: 'orange' | 'blue' | 'green' | 'purple' | 'pink' | 'indigo';
  }): Promise<any> {
    let body: any = {};
    if (params.title !== undefined) body.title = params.title;
    if (params.description !== undefined) body.description = params.description;
    if (params.private !== undefined) body.private = params.private;
    if (params.theme !== undefined) body.theme = params.theme;

    return await this.request('update collection', async () =>
      hubAxios.patch(collectionRoute(params.slug), body, { headers: this.jsonHeaders() })
    );
  }

  async deleteCollection(params: { slug: string }): Promise<void> {
    await this.requestVoid('delete collection', async () =>
      hubAxios.delete(collectionRoute(params.slug), { headers: this.headers() })
    );
  }

  async addCollectionItem(params: {
    slug: string;
    itemId: string;
    itemType: RepoType;
    note?: string;
  }): Promise<any> {
    return await this.request('add collection item', async () =>
      hubAxios.post(
        collectionRoute(params.slug, 'items'),
        {
          item: { id: params.itemId, type: params.itemType },
          note: params.note
        },
        { headers: this.jsonHeaders() }
      )
    );
  }

  async removeCollectionItem(params: { slug: string; itemId: string }): Promise<void> {
    await this.requestVoid('remove collection item', async () =>
      hubAxios.delete(collectionItemRoute(params.slug, params.itemId), {
        headers: this.headers()
      })
    );
  }

  // ---- Spaces Management ----

  async getSpaceRuntime(params: { repoId: string }): Promise<any> {
    return await this.request('get Space runtime', async () =>
      hubAxios.get(repoRoute('spaces', params.repoId, 'runtime'), {
        headers: this.headers()
      })
    );
  }

  async setSpaceHardware(params: { repoId: string; hardware: string }): Promise<any> {
    return await this.request('set Space hardware', async () =>
      hubAxios.post(
        repoRoute('spaces', params.repoId, 'hardware'),
        { flavor: params.hardware },
        { headers: this.jsonHeaders() }
      )
    );
  }

  async pauseSpace(params: { repoId: string }): Promise<any> {
    return await this.request('pause Space', async () =>
      hubAxios.post(
        repoRoute('spaces', params.repoId, 'pause'),
        {},
        { headers: this.jsonHeaders() }
      )
    );
  }

  async restartSpace(params: { repoId: string }): Promise<any> {
    return await this.request('restart Space', async () =>
      hubAxios.post(
        repoRoute('spaces', params.repoId, 'restart'),
        {},
        { headers: this.jsonHeaders() }
      )
    );
  }

  async listSpaceSecrets(params: { repoId: string }): Promise<any[]> {
    return await this.request('list Space secrets', async () =>
      hubAxios.get(repoRoute('spaces', params.repoId, 'secrets'), {
        headers: this.headers()
      })
    );
  }

  async addSpaceSecret(params: {
    repoId: string;
    key: string;
    value: string;
    description?: string;
  }): Promise<void> {
    let body: any = { key: params.key, value: params.value };
    if (params.description) body.description = params.description;

    await this.requestVoid('upsert Space secret', async () =>
      hubAxios.post(repoRoute('spaces', params.repoId, 'secrets'), body, {
        headers: this.jsonHeaders()
      })
    );
  }

  async deleteSpaceSecret(params: { repoId: string; key: string }): Promise<void> {
    await this.requestVoid('delete Space secret', async () =>
      hubAxios.delete(repoRoute('spaces', params.repoId, 'secrets'), {
        headers: this.jsonHeaders(),
        data: { key: params.key }
      })
    );
  }

  async listSpaceVariables(params: { repoId: string }): Promise<any[]> {
    return await this.request('list Space variables', async () =>
      hubAxios.get(repoRoute('spaces', params.repoId, 'variables'), {
        headers: this.headers()
      })
    );
  }

  async addSpaceVariable(params: {
    repoId: string;
    key: string;
    value: string;
    description?: string;
  }): Promise<void> {
    let body: any = { key: params.key, value: params.value };
    if (params.description) body.description = params.description;

    await this.requestVoid('upsert Space variable', async () =>
      hubAxios.post(repoRoute('spaces', params.repoId, 'variables'), body, {
        headers: this.jsonHeaders()
      })
    );
  }

  async deleteSpaceVariable(params: { repoId: string; key: string }): Promise<void> {
    await this.requestVoid('delete Space variable', async () =>
      hubAxios.delete(repoRoute('spaces', params.repoId, 'variables'), {
        headers: this.jsonHeaders(),
        data: { key: params.key }
      })
    );
  }

  // ---- Webhook Management ----

  async listWebhooks(): Promise<any[]> {
    return await this.request('list webhooks', async () =>
      hubAxios.get('/api/settings/webhooks', { headers: this.headers() })
    );
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

    return await this.request('create webhook', async () =>
      hubAxios.post('/api/settings/webhooks', body, {
        headers: this.jsonHeaders()
      })
    );
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

    return await this.request('update webhook', async () =>
      hubAxios.post(`/api/settings/webhooks/${encodeURIComponent(params.webhookId)}`, body, {
        headers: this.jsonHeaders()
      })
    );
  }

  async deleteWebhook(params: { webhookId: string }): Promise<void> {
    await this.requestVoid('delete webhook', async () =>
      hubAxios.delete(`/api/settings/webhooks/${encodeURIComponent(params.webhookId)}`, {
        headers: this.headers()
      })
    );
  }

  async enableWebhook(params: { webhookId: string }): Promise<any> {
    return await this.request('enable webhook', async () =>
      hubAxios.post(
        `/api/settings/webhooks/${encodeURIComponent(params.webhookId)}/enable`,
        {},
        { headers: this.jsonHeaders() }
      )
    );
  }

  async disableWebhook(params: { webhookId: string }): Promise<any> {
    return await this.request('disable webhook', async () =>
      hubAxios.post(
        `/api/settings/webhooks/${encodeURIComponent(params.webhookId)}/disable`,
        {},
        { headers: this.jsonHeaders() }
      )
    );
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

    return await this.request('run inference', async () =>
      routerAxios.post(`/hf-inference/models/${encodePath(params.modelId)}`, body, {
        headers: this.jsonHeaders()
      })
    );
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

    return await this.request('create chat completion', async () =>
      routerAxios.post('/v1/chat/completions', body, {
        headers: this.jsonHeaders()
      })
    );
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
    let body: any = {
      model: params.model,
      prompt: params.inputs
    };
    if (params.maxNewTokens !== undefined) body.max_tokens = params.maxNewTokens;
    if (params.temperature !== undefined) body.temperature = params.temperature;
    if (params.topP !== undefined) body.top_p = params.topP;
    if (params.repetitionPenalty !== undefined)
      body.repetition_penalty = params.repetitionPenalty;
    if (params.doSample !== undefined) body.do_sample = params.doSample;
    if (params.returnFullText !== undefined) body.return_full_text = params.returnFullText;

    let result = await this.request<any>('generate text', async () =>
      routerAxios.post(
        `/hf-inference/models/${encodePath(params.model)}/v1/completions`,
        body,
        {
          headers: this.jsonHeaders()
        }
      )
    );

    if (result?.choices?.[0]?.text !== undefined) {
      return { generated_text: result.choices[0].text };
    }

    return result;
  }

  async featureExtraction(params: {
    model: string;
    inputs: string | string[];
    normalize?: boolean;
    truncate?: boolean;
    promptName?: string;
    truncationDirection?: 'left' | 'right';
  }): Promise<any> {
    let body: any = {
      inputs: params.inputs
    };
    if (params.normalize !== undefined) body.normalize = params.normalize;
    if (params.truncate !== undefined) body.truncate = params.truncate;
    if (params.promptName !== undefined) body.prompt_name = params.promptName;
    if (params.truncationDirection !== undefined)
      body.truncation_direction = params.truncationDirection;

    return await this.request('run feature extraction', async () =>
      routerAxios.post(
        `/hf-inference/models/${encodePath(params.model)}/pipeline/feature-extraction`,
        body,
        { headers: this.jsonHeaders() }
      )
    );
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

    return await this.request('run summarization', async () =>
      routerAxios.post(
        `/hf-inference/models/${encodePath(params.model)}`,
        {
          inputs: params.inputs,
          parameters: Object.keys(parameters).length > 0 ? parameters : undefined
        },
        { headers: this.jsonHeaders() }
      )
    );
  }
}
