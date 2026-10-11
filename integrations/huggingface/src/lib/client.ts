import { createAxios, getResponseHeaderValue } from 'slates';
import { huggingFaceApiError, huggingFaceServiceError } from './errors';

export const HUB_URL = 'https://huggingface.co';

let hubAxios = createAxios({
  baseURL: HUB_URL
});

let routerAxios = createAxios({
  baseURL: 'https://router.huggingface.co'
});

export type RepoType = 'model' | 'dataset' | 'space';

type AxiosResult<T> = Promise<{ data: T }>;

export type PagedResult<T> = {
  data: T;
  nextCursor?: string;
};

export type RepoFileMetadata = {
  downloadUrl: string;
  commitSha?: string;
  contentType?: string;
  size?: number;
};

export type InferenceResult =
  | { type: 'data'; data: unknown }
  | { type: 'file'; bytes: Buffer; contentType: string };

let toBuffer = (data: unknown) => {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  return Buffer.from(typeof data === 'string' ? data : JSON.stringify(data ?? ''), 'utf8');
};

let encodePath = (path: string) =>
  path
    .split('/')
    .filter(segment => segment.length > 0)
    .map(segment => encodeURIComponent(segment))
    .join('/');

export let splitRepoId = (repoId: string) => {
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

export let repoTypePrefix = (type: RepoType) => {
  if (type === 'model') return 'models';
  if (type === 'dataset') return 'datasets';
  return 'spaces';
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

// Revisions such as "refs/pr/1" must be sent as a single encoded path segment.
let revisionSegment = (revision?: string) => encodeURIComponent(revision || 'main');

let discussionRoute = (repoType: RepoType, repoId: string, ...segments: string[]) =>
  repoRoute(repoTypePrefix(repoType), repoId, 'discussions', ...segments);

export let repoWebUrl = (repoType: RepoType, repoId: string) => {
  let { namespace, repo } = splitRepoId(repoId);
  let prefix = repoType === 'model' ? '' : `/${repoTypePrefix(repoType)}`;
  return `${HUB_URL}${prefix}/${encodeURIComponent(namespace)}/${encodeURIComponent(repo)}`;
};

export let repoFileDownloadUrl = (
  repoType: RepoType,
  repoId: string,
  revision: string | undefined,
  filePath: string
) =>
  `${repoWebUrl(repoType, repoId)}/resolve/${revisionSegment(revision)}/${encodePath(filePath)}`;

let splitCollectionSlug = (slug: string) => {
  let [namespace, collectionSlug, ...rest] = slug.split('/');
  if (!namespace || !collectionSlug || rest.length > 0) {
    throw huggingFaceServiceError(
      'Collection slug must include the namespace, for example "username/collection-name-abc123".'
    );
  }

  return { namespace, collectionSlug };
};

let collectionRoute = (slug: string, ...segments: string[]) => {
  let { namespace, collectionSlug } = splitCollectionSlug(slug);
  let suffix = segments
    .filter(segment => segment.length > 0)
    .map(segment => encodeURIComponent(segment))
    .join('/');

  return `/api/collections/${encodeURIComponent(namespace)}/${encodeURIComponent(collectionSlug)}${
    suffix ? `/${suffix}` : ''
  }`;
};

export let collectionWebUrl = (slug: string) => {
  let { namespace, collectionSlug } = splitCollectionSlug(slug);
  return `${HUB_URL}/collections/${encodeURIComponent(namespace)}/${encodeURIComponent(collectionSlug)}`;
};

// Hub list endpoints paginate with a `Link: <...?cursor=...>; rel="next"` header.
let getNextCursor = (headers: unknown) => {
  let link = getResponseHeaderValue(headers, 'link');
  if (!link) return undefined;

  for (let part of link.split(',')) {
    let match = part.match(/<([^>]+)>\s*;\s*rel="?next"?/i);
    if (!match?.[1]) continue;

    try {
      return new URL(match[1], HUB_URL).searchParams.get('cursor') || undefined;
    } catch {
      return undefined;
    }
  }

  return undefined;
};

let decodeBinaryErrorBody = (error: unknown) => {
  let response = (error as { response?: { data?: unknown } } | undefined)?.response;
  let data = response?.data;
  if (!response || !(data instanceof ArrayBuffer || ArrayBuffer.isView(data))) {
    return error;
  }

  let text = Buffer.from(
    data instanceof ArrayBuffer
      ? data
      : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
  ).toString('utf8');
  try {
    response.data = JSON.parse(text);
  } catch {
    response.data = { error: text };
  }

  return error;
};

let joinFilters = (...groups: (string | string[] | undefined)[]) => {
  let values = groups
    .flatMap(group => (Array.isArray(group) ? group : group ? [group] : []))
    .map(value => value.trim())
    .filter(Boolean);

  return values.length > 0 ? values.join(',') : undefined;
};

// The Hub sort key for trending results is `trendingScore`; `trending` is rejected with HTTP 400.
let normalizeRepoSort = (sort?: string) => (sort === 'trending' ? 'trendingScore' : sort);

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

  private async requestPaged<T>(
    operation: string,
    run: () => Promise<{ data: T; headers: unknown }>
  ): Promise<PagedResult<T>> {
    try {
      let response = await run();
      return {
        data: response.data,
        nextCursor: getNextCursor(response.headers)
      };
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

  async deleteRepo(params: { repoType: RepoType; repoId: string }): Promise<void> {
    let { namespace, repo } = splitRepoId(params.repoId);
    let body = {
      type: params.repoType,
      name: repo,
      organization: namespace
    };

    await this.requestVoid('delete repository', async () =>
      hubAxios.delete('/api/repos/delete', {
        headers: this.jsonHeaders(),
        data: body
      })
    );
  }

  async duplicateRepo(params: {
    repoType: RepoType;
    sourceRepoId: string;
    destinationRepoId: string;
    visibility?: 'private' | 'public' | 'protected';
    hardware?: string;
    sleepTimeSeconds?: number;
  }): Promise<any> {
    let body: any = {
      repository: params.destinationRepoId
    };
    if (params.visibility) body.visibility = params.visibility;
    if (params.repoType === 'space') {
      if (params.hardware) body.hardware = params.hardware;
      if (params.sleepTimeSeconds !== undefined)
        body.sleepTimeSeconds = params.sleepTimeSeconds;
    }

    return await this.request('duplicate repository', async () =>
      hubAxios.post(
        repoRoute(repoTypePrefix(params.repoType), params.sourceRepoId, 'duplicate'),
        body,
        {
          headers: this.jsonHeaders()
        }
      )
    );
  }

  async updateRepoVisibility(params: {
    repoType: RepoType;
    repoId: string;
    private: boolean;
  }): Promise<any> {
    let prefix = repoTypePrefix(params.repoType);
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
    let prefix = repoTypePrefix(params.repoType);
    let url = repoRoute(prefix, params.repoId);
    if (params.revision) url += `/revision/${encodeURIComponent(params.revision)}`;

    return await this.request('get repository info', async () =>
      hubAxios.get(url, {
        headers: this.headers()
      })
    );
  }

  async listRepoRefs(params: {
    repoType: RepoType;
    repoId: string;
    includePullRequests?: boolean;
  }): Promise<any> {
    return await this.request('list repository refs', async () =>
      hubAxios.get(repoRoute(repoTypePrefix(params.repoType), params.repoId, 'refs'), {
        headers: this.headers(),
        params: params.includePullRequests ? { include_prs: 1 } : undefined
      })
    );
  }

  // ---- Search ----

  private async searchRepos(
    repoType: RepoType,
    params: {
      search?: string;
      author?: string;
      filter?: string;
      tags?: string[];
      library?: string;
      sort?: string;
      direction?: string;
      limit?: number;
      full?: boolean;
    }
  ): Promise<any[]> {
    let queryParams: Record<string, string | number | boolean> = {};
    let filter = joinFilters(params.filter, params.library, params.tags);
    if (params.search) queryParams.search = params.search;
    if (params.author) queryParams.author = params.author;
    if (filter) queryParams.filter = filter;
    if (params.sort) queryParams.sort = normalizeRepoSort(params.sort)!;
    if (params.direction) queryParams.direction = params.direction;
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.full !== undefined) queryParams.full = params.full;

    return await this.request(`search ${repoTypePrefix(repoType)}`, async () =>
      hubAxios.get(`/api/${repoTypePrefix(repoType)}`, {
        headers: this.headers(),
        params: queryParams
      })
    );
  }

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
    return await this.searchRepos('model', params);
  }

  async searchDatasets(params: {
    search?: string;
    author?: string;
    tags?: string[];
    sort?: string;
    direction?: string;
    limit?: number;
  }): Promise<any[]> {
    return await this.searchRepos('dataset', params);
  }

  async searchSpaces(params: {
    search?: string;
    author?: string;
    tags?: string[];
    sort?: string;
    direction?: string;
    limit?: number;
  }): Promise<any[]> {
    return await this.searchRepos('space', params);
  }

  // ---- File Operations ----

  async listRepoFiles(params: {
    repoType: RepoType;
    repoId: string;
    revision?: string;
    path?: string;
    recursive?: boolean;
    limit?: number;
    cursor?: string;
  }): Promise<PagedResult<any[]>> {
    let prefix = repoTypePrefix(params.repoType);
    let path = params.path ? encodePath(params.path) : '';
    let url = `${repoRoute(prefix, params.repoId, 'tree')}/${revisionSegment(params.revision)}${
      path ? `/${path}` : ''
    }`;
    let queryParams: Record<string, string | number> = {};
    if (params.recursive) queryParams.recursive = 'true';
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.cursor) queryParams.cursor = params.cursor;

    return await this.requestPaged('list repository files', async () =>
      hubAxios.get(url, {
        headers: this.headers(),
        params: queryParams
      })
    );
  }

  async getFileMetadata(params: {
    repoType: RepoType;
    repoId: string;
    filePath: string;
    revision?: string;
  }): Promise<RepoFileMetadata> {
    let downloadUrl = repoFileDownloadUrl(
      params.repoType,
      params.repoId,
      params.revision,
      params.filePath
    );

    let toSize = (value?: string) => {
      let size = value !== undefined ? Number(value) : undefined;
      return size !== undefined && Number.isFinite(size) ? size : undefined;
    };

    return await this.request<RepoFileMetadata>('get repository file metadata', async () => {
      let headers = { ...this.headers(), 'Accept-Encoding': 'identity' };
      // Do not follow redirects to external CDN URLs: LFS/Xet files report their size
      // in `x-linked-size` on the Hub's own redirect response.
      let response = await hubAxios.head(downloadUrl, {
        headers,
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400
      });
      // The resolve response identifies the commit the revision currently points to.
      let commitSha = getResponseHeaderValue(response.headers, 'x-repo-commit');

      if (response.status >= 300) {
        let linkedSize = toSize(getResponseHeaderValue(response.headers, 'x-linked-size'));
        let location = getResponseHeaderValue(response.headers, 'location');

        if (linkedSize !== undefined || !location || /^https?:\/\//i.test(location)) {
          return { data: { downloadUrl, commitSha, size: linkedSize } };
        }

        // Regular files redirect to a Hub-hosted cache path that serves the file headers.
        response = await hubAxios.head(location, { headers });
        commitSha = commitSha || getResponseHeaderValue(response.headers, 'x-repo-commit');
      }

      return {
        data: {
          downloadUrl,
          commitSha,
          contentType: getResponseHeaderValue(response.headers, 'content-type'),
          size: toSize(getResponseHeaderValue(response.headers, 'content-length'))
        }
      };
    });
  }

  private async commit(
    operation: string,
    params: {
      repoType: RepoType;
      repoId: string;
      revision?: string;
      createPullRequest?: boolean;
      body: Record<string, unknown>;
    }
  ): Promise<any> {
    let prefix = repoTypePrefix(params.repoType);
    let url = `${repoRoute(prefix, params.repoId, 'commit')}/${revisionSegment(params.revision)}`;

    return await this.request(operation, async () =>
      hubAxios.post(url, params.body, {
        headers: this.jsonHeaders(),
        params: params.createPullRequest ? { create_pr: '1' } : undefined
      })
    );
  }

  async uploadFile(params: {
    repoType: RepoType;
    repoId: string;
    filePath: string;
    content: string;
    commitMessage?: string;
    revision?: string;
    createPullRequest?: boolean;
  }): Promise<any> {
    return await this.commit('upload repository file', {
      repoType: params.repoType,
      repoId: params.repoId,
      revision: params.revision,
      createPullRequest: params.createPullRequest,
      body: {
        summary: params.commitMessage || `Upload ${params.filePath}`,
        files: [
          {
            path: params.filePath,
            content: params.content,
            encoding: 'utf-8'
          }
        ]
      }
    });
  }

  async deleteFile(params: {
    repoType: RepoType;
    repoId: string;
    filePath: string;
    commitMessage?: string;
    revision?: string;
    createPullRequest?: boolean;
  }): Promise<any> {
    return await this.commit('delete repository file', {
      repoType: params.repoType,
      repoId: params.repoId,
      revision: params.revision,
      createPullRequest: params.createPullRequest,
      body: {
        summary: params.commitMessage || `Delete ${params.filePath}`,
        deletedEntries: [{ path: params.filePath }]
      }
    });
  }

  // ---- Discussions ----

  async listDiscussions(params: {
    repoType: RepoType;
    repoId: string;
    page?: number;
    type?: 'all' | 'discussion' | 'pull_request';
    status?: 'all' | 'open' | 'closed';
    author?: string;
    search?: string;
  }): Promise<any> {
    let queryParams: Record<string, string | number> = {};
    if (params.page !== undefined) queryParams.p = params.page;
    if (params.type) queryParams.type = params.type;
    if (params.status) queryParams.status = params.status;
    if (params.author) queryParams.author = params.author;
    if (params.search) queryParams.search = params.search;

    return await this.request('list discussions', async () =>
      hubAxios.get(discussionRoute(params.repoType, params.repoId), {
        headers: this.headers(),
        params: queryParams
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
    let body: Record<string, string> = { status: params.status };
    if (params.comment?.trim()) body.comment = params.comment.trim();

    return await this.request('update discussion status', async () =>
      hubAxios.post(
        discussionRoute(
          params.repoType,
          params.repoId,
          String(params.discussionNum),
          'status'
        ),
        body,
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
    let body: Record<string, string> = {};
    if (params.comment?.trim()) body.comment = params.comment.trim();

    return await this.request('merge discussion', async () =>
      hubAxios.post(
        discussionRoute(params.repoType, params.repoId, String(params.discussionNum), 'merge'),
        body,
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
  }): Promise<PagedResult<any[]>> {
    let queryParams: Record<string, string | number> = {};
    if (params.query) queryParams.q = params.query;
    if (params.owner) queryParams.owner = params.owner;
    if (params.item) queryParams.item = params.item;
    if (params.sort) queryParams.sort = params.sort;
    if (params.cursor) queryParams.cursor = params.cursor;
    if (params.limit !== undefined) queryParams.limit = params.limit;

    return await this.requestPaged('list collections', async () =>
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

    let result = await this.request<any>('update collection', async () =>
      hubAxios.patch(collectionRoute(params.slug), body, { headers: this.jsonHeaders() })
    );

    // PATCH responds with `{ data: Collection }`.
    return result?.data ?? result;
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
    let body: any = { item: { id: params.itemId, type: params.itemType } };
    if (params.note) body.note = params.note;

    return await this.request('add collection item', async () =>
      hubAxios.post(collectionRoute(params.slug, 'items'), body, {
        headers: this.jsonHeaders()
      })
    );
  }

  async removeCollectionItem(params: { slug: string; itemObjectId: string }): Promise<void> {
    await this.requestVoid('remove collection item', async () =>
      hubAxios.delete(collectionRoute(params.slug, 'items', params.itemObjectId), {
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

  async listSpaceSecrets(params: { repoId: string }): Promise<any> {
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

  async listSpaceVariables(params: { repoId: string }): Promise<any> {
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

  // ---- Inference ----

  async inference(params: {
    modelId: string;
    inputs: any;
    parameters?: any;
    waitForModel?: boolean;
  }): Promise<InferenceResult> {
    let body: any = {
      inputs: params.inputs
    };
    if (params.parameters) body.parameters = params.parameters;

    let headers: Record<string, string> = this.jsonHeaders();
    if (params.waitForModel) {
      headers['x-wait-for-model'] = 'true';
      body.options = { wait_for_model: true };
    }

    let response: { data: unknown; headers: unknown };
    try {
      // Some tasks (for example text-to-speech or image-to-image) respond with raw file bytes.
      response = await routerAxios.post(
        `/hf-inference/models/${encodePath(params.modelId)}`,
        body,
        { headers, responseType: 'arraybuffer' }
      );
    } catch (error) {
      throw huggingFaceApiError(decodeBinaryErrorBody(error), 'run inference');
    }

    let bytes = toBuffer(response.data);
    let contentType = getResponseHeaderValue(response.headers, 'content-type')
      ?.split(';')[0]
      ?.trim()
      .toLowerCase();

    if (!contentType || contentType.includes('json') || contentType.startsWith('text/')) {
      let text = bytes.toString('utf8');
      try {
        return { type: 'data', data: JSON.parse(text) };
      } catch {
        if (contentType?.includes('json')) {
          throw huggingFaceServiceError(
            'Hugging Face returned an inference response that is not valid JSON.'
          );
        }
        return { type: 'data', data: text };
      }
    }

    return { type: 'file', bytes, contentType };
  }

  async textToImage(params: {
    model: string;
    prompt: string;
    parameters?: Record<string, unknown>;
  }): Promise<{ bytes: Buffer; contentType: string }> {
    let body: any = { inputs: params.prompt };
    if (params.parameters && Object.keys(params.parameters).length > 0) {
      body.parameters = params.parameters;
    }

    try {
      let response = await routerAxios.post(
        `/hf-inference/models/${encodePath(params.model)}`,
        body,
        {
          headers: { ...this.jsonHeaders(), Accept: 'image/png, image/jpeg, image/*' },
          responseType: 'arraybuffer'
        }
      );
      let contentType =
        getResponseHeaderValue(response.headers, 'content-type')?.split(';')[0]?.trim() ||
        'image/jpeg';
      let bytes = Buffer.from(response.data as ArrayBuffer);

      if (!contentType.startsWith('image/')) {
        let text = bytes.toString('utf8');
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = undefined;
        }

        let base64 = parsed?.data?.[0]?.b64_json;
        if (typeof base64 === 'string') {
          return { bytes: Buffer.from(base64, 'base64'), contentType: 'image/jpeg' };
        }

        throw huggingFaceServiceError(
          `Hugging Face text-to-image response did not contain an image (received ${contentType}).`
        );
      }

      return { bytes, contentType };
    } catch (error) {
      throw huggingFaceApiError(decodeBinaryErrorBody(error), 'generate image');
    }
  }

  async chatCompletion(params: {
    model: string;
    messages: { role: string; content: string }[];
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stop?: string[];
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
}
