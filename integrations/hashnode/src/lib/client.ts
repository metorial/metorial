import { ServiceError } from '@lowerdeck/error';
import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  getCurrentContext,
  pickDefined,
  requestAxios
} from 'slates';
import { cursor, first, host, identifier, objectId, token } from './schemas';
import type {
  Comment,
  Draft,
  PageInfo,
  Post,
  PostInput,
  Publication,
  Series,
  StaticPage,
  User
} from './types';

const userFields =
  'id username name profilePicture tagline bio { markdown } location dateJoined availableFor socialMediaLinks { website github twitter instagram facebook stackoverflow linkedin youtube }';
const publicationFields =
  'id title displayTitle descriptionSEO seo { title description } about { markdown html } url canonicalURL favicon headerColor isTeam author { id username name profilePicture }';
const postFields =
  'id title subtitle slug url brief publishedAt updatedAt readTimeInMinutes reactionCount responseCount content { markdown html } coverImage { url } author { id username name profilePicture } publication { id title } tags { id name slug } series { id name } seo { title description } ogMetaData { image }';
const draftFields =
  'id title subtitle slug updatedAt content { markdown html } author { id username name } publication { id title } tags { id name slug } coverImage { url }';
const seriesFields =
  'id name slug description { markdown html } coverImage author { id username name }';
const pageFields = 'pageInfo { hasNextPage endCursor totalDocuments }';
const staticFields = 'id title slug hidden content { markdown html }';
const commentFields =
  'id content { markdown html } author { id username name } dateAdded totalReactions';
const unavailable = () =>
  createApiServiceError(
    'This legacy write is absent from Hashnode’s current public API. Use the Hashnode dashboard for this operation; no request was sent.',
    { reason: 'unsupported_operation' }
  );
const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'invalid_input' });
const incomplete = () =>
  createApiServiceError(
    'Hashnode returned an incomplete or mismatched response. Inspect the exact resource before retrying a write.',
    { reason: 'invalid_response' }
  );
const parse = <T>(
  schema: { safeParse(value: unknown): { success: boolean; data?: T } },
  value: unknown
): T => {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw invalid(
      'Provide valid resource identifiers, pagination, publication selection, and credential values.'
    );
  return parsed.data as T;
};
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw incomplete();
  return value as Record<string, unknown>;
};
const native = <T extends { id: string }>(
  value: unknown,
  expectedId?: string,
  required: string[] = []
): T => {
  const item = record(value);
  if (
    typeof item.id !== 'string' ||
    !identifier.safeParse(item.id).success ||
    (expectedId !== undefined && item.id !== expectedId)
  )
    throw incomplete();
  for (const name of required)
    if (typeof item[name] !== 'string' || !item[name]) throw incomplete();
  return item as unknown as T;
};
const adapt = (error: unknown) => {
  if (error instanceof ServiceError) return error;
  const status = getApiErrorStatus(error);
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Hashnode',
      operation: 'request',
      reason: 'hashnode_api',
      parent: {},
      extractMessage: () =>
        status === 401
          ? 'Reconnect with a valid personal access token.'
          : status === 403
            ? 'Check publication Pro entitlement and your publication role.'
            : status === 429
              ? 'Wait before retrying; inspect an uncertain write first.'
              : 'The request failed. Inspect the exact resource before retrying a write.'
    }
  );
};
export class Client {
  private readonly http: ReturnType<typeof createAuthenticatedAxios>;
  private readonly credential: string;
  constructor(
    private readonly config: {
      token: string;
      publicationHost?: string;
      publicationId?: string;
    }
  ) {
    this.credential = parse(token, config.token).replace(/^Bearer /i, '');
    this.http = createAuthenticatedAxios({
      baseURL: 'https://gql.hashnode.com',
      authHeader: { value: `Bearer ${this.credential}` },
      timeout: 30000,
      maxRedirects: 0,
      maxBodyLength: 100000,
      maxContentLength: 8 * 1024 * 1024
    });
  }
  private protect(value: unknown) {
    const redactor = new AuthConfigSecretRedactor({
      token: this.credential,
      authorization: `Bearer ${this.credential}`
    });
    const textSafe = (initial: string) => {
      let text = initial;
      for (let pass = 0; pass < 5; pass++) {
        if (redactor.redactEmbedded(text) !== text) return false;
        for (const part of text.matchAll(/[A-Za-z0-9+/_-]{8,}={0,2}/g)) {
          const decoded = Buffer.from(part[0], 'base64').toString('utf8');
          if (redactor.redactEmbedded(decoded) !== decoded) return false;
        }
        const decoded = text.replace(/%([a-f0-9]{2})/gi, (_, byte: string) =>
          String.fromCharCode(Number.parseInt(byte, 16))
        );
        if (decoded === text) break;
        text = decoded;
      }
      return true;
    };
    const inspect = (item: unknown, depth = 0): boolean => {
      if (depth > 80) return false;
      if (typeof item === 'string') return textSafe(item);
      if (Array.isArray(item)) return item.every(v => inspect(v, depth + 1));
      if (item && typeof item === 'object')
        return Object.entries(item).every(
          ([key, itemValue]) => textSafe(key) && inspect(itemValue, depth + 1)
        );
      return true;
    };
    if (!inspect(value) || !inspect(getCurrentContext().getHttpTraces()))
      throw createApiServiceError(
        'Credential-bearing request or response content was refused. Inspect the resource before retrying a write.',
        { reason: 'credential_reflection' }
      );
  }
  async graphql(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const body = pickDefined({ query, variables });
    this.protect(body);
    if (Buffer.byteLength(JSON.stringify(body), 'utf8') > 100000)
      throw invalid(
        'The GraphQL request exceeds the supported 100,000-byte limit. Reduce the content before retrying.'
      );
    const response = await requestAxios(
      'Hashnode GraphQL request',
      () => this.http.post<unknown>('/', body),
      error => {
        this.protect(undefined);
        return adapt(error);
      }
    );
    this.protect(response.data);
    const result = record(response.data);
    if (response.status !== 200) throw incomplete();
    if (result.errors !== undefined) {
      if (!Array.isArray(result.errors)) throw incomplete();
      if (result.errors.length) {
        const codes = result.errors.map(item =>
          record(item).extensions === undefined
            ? undefined
            : record(record(item).extensions).code
        );
        const code =
          codes.find(value =>
            ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'BAD_USER_INPUT'].includes(
              String(value)
            )
          ) ?? 'INTERNAL_SERVER_ERROR';
        const status =
          code === 'UNAUTHENTICATED'
            ? 401
            : code === 'FORBIDDEN'
              ? 403
              : code === 'NOT_FOUND'
                ? 404
                : code === 'BAD_USER_INPUT'
                  ? 400
                  : 500;
        throw createApiServiceError(
          code === 'UNAUTHENTICATED'
            ? 'Hashnode requires a valid personal access token.'
            : code === 'FORBIDDEN'
              ? 'Check the publication’s Pro plan and your publication role before retrying.'
              : code === 'NOT_FOUND'
                ? 'The exact resource is unavailable or hidden from this credential.'
                : 'Hashnode rejected the request. Check the input and inspect any uncertain write before retrying.',
          { reason: 'hashnode_graphql', upstreamStatus: status, upstreamCode: String(code) }
        );
      }
    }
    return record(result.data);
  }
  private selection() {
    if (this.config.publicationId !== undefined && this.config.publicationHost !== undefined)
      throw invalid('Supply either publicationId or publicationHost, not both.');
    if (this.config.publicationId !== undefined)
      return { id: parse(objectId, this.config.publicationId).toLowerCase() };
    if (this.config.publicationHost !== undefined)
      return { host: parse(host, this.config.publicationHost).toLowerCase() };
    throw invalid(
      'Select a publication with publicationId or publicationHost. Call list_publications for publications you own, or use the known hostname of your team publication.'
    );
  }
  private async publication(
    selectionFields: string,
    variables: Record<string, unknown> = {},
    declarations = ''
  ) {
    const selection = this.selection();
    const data = await this.graphql(
      `query Publication($id: ObjectId, $host: String${declarations}) { publication(id: $id, host: $host) { ${selectionFields} } }`,
      { ...selection, ...variables }
    );
    if (data.publication === null)
      throw createApiServiceError(
        'The selected publication is unavailable. Check its exact ID or hostname and Pro entitlement.',
        { reason: 'not_found', upstreamStatus: 404 }
      );
    return native<Publication>(data.publication, selection.id, ['title']);
  }
  private page<T extends { id: string }>(
    value: unknown,
    size: number,
    after?: string,
    required: string[] = []
  ): { nodes: T[]; pageInfo: PageInfo; totalDocuments?: number | null } {
    const connection = record(value);
    const info = record(connection.pageInfo);
    if (
      !Array.isArray(connection.edges) ||
      connection.edges.length > size ||
      typeof info.hasNextPage !== 'boolean' ||
      (info.endCursor !== null &&
        info.endCursor !== undefined &&
        typeof info.endCursor !== 'string') ||
      (info.hasNextPage &&
        (!info.endCursor || info.endCursor === after || !connection.edges.length))
    )
      throw incomplete();
    if (
      info.totalDocuments !== null &&
      info.totalDocuments !== undefined &&
      (typeof info.totalDocuments !== 'number' ||
        !Number.isSafeInteger(info.totalDocuments) ||
        info.totalDocuments < connection.edges.length)
    )
      throw incomplete();
    const nodes = connection.edges.map(edge =>
      native<T>(record(edge).node, undefined, required)
    );
    if (new Set(nodes.map(node => node.id)).size !== nodes.length) throw incomplete();
    return {
      nodes,
      pageInfo: info as unknown as PageInfo,
      totalDocuments: info.totalDocuments as number | null | undefined
    };
  }
  private pagination(options: { first?: number; after?: string }, max = 100) {
    const size = parse(first, options.first);
    if (size > max) throw invalid(`Use a page size of at most ${max} for this connection.`);
    return { first: size, after: parse(cursor, options.after) };
  }
  async getPublication() {
    return this.publication(publicationFields);
  }
  async getPublicationId() {
    return (await this.getPublication()).id;
  }
  private async verifySelectedPublication(publication?: Publication | null) {
    if (this.config.publicationHost === undefined && this.config.publicationId === undefined)
      return;
    const expected = await this.getPublicationId();
    if (!publication || publication.id !== expected)
      throw invalid(
        'The resource does not belong to the selected publication. Use its exact publication ID or hostname.'
      );
  }
  async listPublications(options: { first?: number; after?: string } = {}) {
    const pagination = this.pagination(options);
    const data = await this.graphql(
      `query OwnedPublications($first: Int!, $after: String) { me { id publications(first: $first, after: $after) { edges { node { ${publicationFields} domainInfo { hashnodeSubdomain domain { host ready } } } } ${pageFields} } } }`,
      pagination
    );
    const me = native<User>(data.me);
    const result = this.page<Publication>(
      record(data.me).publications,
      pagination.first,
      pagination.after,
      ['title']
    );
    return { ownerId: me.id, publications: result.nodes, pageInfo: result.pageInfo };
  }
  async listPosts(options: { first?: number; after?: string; tagSlugs?: string[] } = {}) {
    const pagination = this.pagination(options);
    const filter = options.tagSlugs?.length
      ? { tagSlugs: options.tagSlugs.map(value => parse(identifier, value)) }
      : undefined;
    const publication = await this.publication(
      `id title posts(first: $first, after: $after, filter: $filter) { edges { node { ${postFields} } } ${pageFields} }`,
      { ...pagination, filter },
      ', $first: Int!, $after: String, $filter: PublicationPostConnectionFilter'
    );
    const result = this.page<Post>(publication.posts, pagination.first, pagination.after, [
      'title',
      'slug',
      'url'
    ]);
    return {
      posts: result.nodes,
      pageInfo: result.pageInfo,
      totalDocuments: result.totalDocuments
    };
  }
  async getPost(postId: string) {
    const id = parse(identifier, postId);
    const data = await this.graphql(
      `query Post($id: ID!) { post(id: $id) { ${postFields} } }`,
      { id }
    );
    if (data.post === null)
      throw createApiServiceError('Post unavailable or hidden from this credential.', {
        reason: 'not_found',
        upstreamStatus: 404
      });
    const post = native<Post>(data.post, id, ['title', 'slug', 'url']);
    await this.verifySelectedPublication(post.publication);
    return post;
  }
  async getPostBySlug(slug: string) {
    const publication = await this.publication(
      `id title post(slug: $slug) { ${postFields} }`,
      { slug: parse(identifier, slug) },
      ', $slug: String!'
    );
    const post = native<Post>(publication.post, undefined, ['title', 'slug', 'url']);
    if (post.slug !== slug) throw incomplete();
    return post;
  }
  private postInput(input: PostInput) {
    if (input.isNewsletterActivated !== undefined)
      throw invalid(
        'sendNewsletter is unavailable on the current publishPost mutation. No request was sent; use the dashboard to deliver a newsletter.'
      );
    const tags = input.tags?.map(tag => {
      if (tag.id !== undefined)
        throw invalid(
          'Current tag inputs use slug and optional name. Omit legacy tagId and provide a slug.'
        );
      return { slug: parse(identifier, tag.slug), ...pickDefined({ name: tag.name }) };
    });
    if (tags && tags.length > 15)
      throw invalid('Hashnode accepts at most 15 tags per post or draft.');
    if (
      input.publishedAt !== undefined &&
      (!Number.isFinite(Date.parse(input.publishedAt)) ||
        !/^\d{4}-\d{2}-\d{2}T/.test(input.publishedAt) ||
        Date.parse(input.publishedAt) > Date.now())
    )
      throw invalid(
        'publishedAt must be an ISO timestamp in the past; it backdates a post and does not schedule publication.'
      );
    for (const value of [input.coverImageURL, input.originalArticleURL])
      if (value !== undefined && value !== '') {
        let address: URL;
        try {
          address = new URL(value);
        } catch {
          throw invalid('Provide an absolute HTTP or HTTPS image or canonical URL.');
        }
        if (
          !['http:', 'https:'].includes(address.protocol) ||
          address.username ||
          address.password
        )
          throw invalid('Provide an HTTP or HTTPS URL without credentials.');
      }
    return pickDefined({
      title: input.title,
      contentMarkdown: input.contentMarkdown,
      subtitle: input.subtitle,
      slug: input.slug,
      tags,
      coverImage: input.coverImageURL,
      originalArticleURL: input.originalArticleURL,
      seriesId: input.seriesId === undefined ? undefined : parse(objectId, input.seriesId),
      disableComments: input.disableComments,
      enableToc: input.enableTableOfContent,
      publishedAt: input.publishedAt
    });
  }
  async publishPost(input: PostInput & { title: string; contentMarkdown: string }) {
    const body = this.postInput(input);
    this.protect(body);
    if (!input.title.trim() || !input.contentMarkdown.trim())
      throw invalid('Provide a nonempty title and Markdown content.');
    const publicationId = await this.getPublicationId();
    const data = await this.graphql(
      'mutation PublishPost($input: PublishPostInput!) { publishPost(input: $input) { post { id title slug url } } }',
      { input: { ...body, publicationId } }
    );
    const receipt = native<Post>(record(data.publishPost).post, undefined, [
      'title',
      'slug',
      'url'
    ]);
    const post = await this.getPost(receipt.id);
    if (
      post.publication?.id !== publicationId ||
      post.title !== receipt.title ||
      post.slug !== receipt.slug ||
      post.url !== receipt.url
    )
      throw incomplete();
    return post;
  }
  async updatePost(postId: string, input: PostInput) {
    const id = parse(identifier, postId);
    const body = this.postInput(input);
    if (!Object.keys(body).length)
      throw invalid('Provide at least one supported field to update.');
    this.protect(body);
    await this.getPost(id);
    const data = await this.graphql(
      'mutation UpdatePost($input: UpdatePostInput!) { updatePost(input: $input) { post { id title slug url } } }',
      { input: { id, ...body } }
    );
    return native<Post>(record(data.updatePost).post, id, ['title', 'slug', 'url']);
  }
  async removePost(postId: string) {
    const id = parse(identifier, postId);
    await this.getPost(id);
    const data = await this.graphql(
      'mutation RemovePost($input: RemovePostInput!) { removePost(input: $input) { post { id title slug url } } }',
      { input: { id } }
    );
    return native<Post>(record(data.removePost).post, id);
  }
  async listDrafts(options: { first?: number; after?: string } = {}) {
    const pagination = this.pagination(options, 50);
    const publication = await this.publication(
      `id title drafts(first: $first, after: $after) { edges { node { ${draftFields} } } ${pageFields} }`,
      pagination,
      ', $first: Int!, $after: String'
    );
    const result = this.page<Draft>(publication.drafts, pagination.first, pagination.after);
    return { drafts: result.nodes, pageInfo: result.pageInfo };
  }
  async getDraft(draftId: string) {
    const id = parse(objectId, draftId).toLowerCase();
    const data = await this.graphql(
      `query Draft($id: ObjectId!) { draft(id: $id) { ${draftFields} } }`,
      { id }
    );
    const draft = native<Draft>(data.draft, id);
    await this.verifySelectedPublication(draft.publication);
    return draft;
  }
  async createDraft(input: PostInput) {
    const { coverImage, enableToc, ...body } = this.postInput(input);
    this.protect({ ...body, coverImage, enableToc });
    const publicationId = await this.getPublicationId();
    const data = await this.graphql(
      `mutation CreateDraft($input: CreateDraftInput!) { createDraft(input: $input) { draft { ${draftFields} } } }`,
      {
        input: {
          ...body,
          publicationId,
          ...(coverImage === undefined
            ? {}
            : { coverImageOptions: { coverImageURL: coverImage } }),
          ...(enableToc === undefined ? {} : { settings: { enableTableOfContent: enableToc } })
        }
      }
    );
    const draft = native<Draft>(record(data.createDraft).draft);
    if (draft.publication?.id !== publicationId) throw incomplete();
    return draft;
  }
  async updateDraft(draftId: string, input: PostInput) {
    const id = parse(objectId, draftId).toLowerCase();
    const { coverImage, enableToc, ...body } = this.postInput(input);
    if (!Object.keys(body).length && coverImage === undefined && enableToc === undefined)
      throw invalid('Provide at least one supported draft field to update.');
    this.protect({ ...body, coverImage, enableToc });
    const original = await this.getDraft(id);
    const data = await this.graphql(
      `mutation UpdateDraft($input: UpdateDraftInput!) { updateDraft(input: $input) { draft { ${draftFields} } } }`,
      {
        input: {
          draftId: id,
          ...body,
          ...(coverImage === undefined
            ? {}
            : { coverImageOptions: { coverImageURL: coverImage } }),
          ...(enableToc === undefined ? {} : { settings: { enableTableOfContent: enableToc } })
        }
      }
    );
    const draft = native<Draft>(record(data.updateDraft).draft, id);
    if (original.publication?.id && draft.publication?.id !== original.publication.id)
      throw incomplete();
    return draft;
  }
  async deleteDraft(draftId: string) {
    const id = parse(objectId, draftId).toLowerCase();
    await this.getDraft(id);
    const data = await this.graphql(
      'mutation DeleteDraft($input: DeleteDraftInput!) { deleteDraft(input: $input) { draft { id } } }',
      { input: { draftId: id } }
    );
    return native<Draft>(record(data.deleteDraft).draft, id);
  }
  async publishDraft(draftId: string) {
    const id = parse(objectId, draftId).toLowerCase();
    const draft = await this.getDraft(id);
    const data = await this.graphql(
      'mutation PublishDraft($input: PublishDraftInput!) { publishDraft(input: $input) { post { id title slug url } } }',
      { input: { draftId: id } }
    );
    const receipt = native<Post>(record(data.publishDraft).post, undefined, [
      'title',
      'slug',
      'url'
    ]);
    const post = await this.getPost(receipt.id);
    if (
      (draft.publication?.id && post.publication?.id !== draft.publication.id) ||
      post.title !== receipt.title ||
      post.slug !== receipt.slug ||
      post.url !== receipt.url
    )
      throw incomplete();
    return post;
  }
  async listSeries(options: { first?: number; after?: string } = {}) {
    const pagination = this.pagination(options);
    const publication = await this.publication(
      `id title seriesList(first: $first, after: $after) { edges { node { ${seriesFields} } } ${pageFields} }`,
      pagination,
      ', $first: Int!, $after: String'
    );
    const result = this.page<Series>(
      publication.seriesList,
      pagination.first,
      pagination.after,
      ['name', 'slug']
    );
    return {
      series: result.nodes,
      pageInfo: result.pageInfo,
      totalDocuments: result.totalDocuments
    };
  }
  async getSeriesBySlug(slug: string) {
    const publication = await this.publication(
      `id title series(slug: $slug) { ${seriesFields} posts(first: 20) { edges { node { id title slug url } } ${pageFields} } }`,
      { slug: parse(identifier, slug) },
      ', $slug: String!'
    );
    const series = native<Series>(publication.series, undefined, ['name', 'slug']);
    if (series.slug !== slug) throw incomplete();
    this.page<Post>(series.posts, 20, undefined, ['title', 'slug', 'url']);
    return series;
  }
  async createSeries(_input: unknown): Promise<Series> {
    throw unavailable();
  }
  async updateSeries(_id: string, _input: unknown): Promise<Series> {
    throw unavailable();
  }
  async removeSeries(_id: string): Promise<Series> {
    throw unavailable();
  }
  async getComments(postId: string, options: { first?: number; after?: string } = {}) {
    const id = parse(identifier, postId);
    const pagination = this.pagination(options);
    const data = await this.graphql(
      `query Comments($id: ID!, $first: Int!, $after: String) { post(id: $id) { id comments(first: $first, after: $after) { edges { node { ${commentFields} replies(first: 20) { edges { node { ${commentFields} } } ${pageFields} } } } ${pageFields} } } }`,
      { id, ...pagination }
    );
    const post = native<Post>(data.post, id);
    const result = this.page<Comment>(post.comments, pagination.first, pagination.after);
    const comments = result.nodes.map(comment => {
      const replies = this.page<Comment>(record(comment).replies, 20);
      return { ...comment, replies: replies.nodes, repliesPageInfo: replies.pageInfo };
    });
    return { comments, pageInfo: result.pageInfo, totalDocuments: result.totalDocuments };
  }
  async addComment(_postId: string, _content: string): Promise<Comment> {
    throw unavailable();
  }
  async addReply(_commentId: string, _content: string): Promise<Comment> {
    throw unavailable();
  }
  async removeComment(_commentId: string): Promise<Comment> {
    throw unavailable();
  }
  async removeReply(_commentId: string, _replyId: string): Promise<Comment> {
    throw unavailable();
  }
  async listStaticPages(options: { first?: number; after?: string } = {}) {
    const pagination = this.pagination(options);
    const publication = await this.publication(
      `id title staticPages(first: $first, after: $after) { edges { node { ${staticFields} } } ${pageFields} }`,
      pagination,
      ', $first: Int!, $after: String'
    );
    const result = this.page<StaticPage>(
      publication.staticPages,
      pagination.first,
      pagination.after,
      ['title', 'slug']
    );
    return { staticPages: result.nodes, pageInfo: result.pageInfo };
  }
  async getStaticPageBySlug(slug: string) {
    const publication = await this.publication(
      `id title staticPage(slug: $slug) { ${staticFields} }`,
      { slug: parse(identifier, slug) },
      ', $slug: String!'
    );
    const page = native<StaticPage>(publication.staticPage, undefined, ['title', 'slug']);
    if (page.slug !== slug) throw incomplete();
    return page;
  }
  async getUser(username: string) {
    const data = await this.graphql(
      `query User($username: String!) { user(username: $username) { ${userFields} followersCount followingsCount } }`,
      { username: parse(identifier, username) }
    );
    const user = native<User>(data.user, undefined, ['username']);
    if (user.username !== username) throw incomplete();
    return user;
  }
  async getMe() {
    const data = await this.graphql(`query Me { me { ${userFields} email } }`);
    return native<User>(data.me, undefined, ['username']);
  }
  async subscribeToNewsletter(_email: string): Promise<{ status?: string }> {
    throw unavailable();
  }
  async searchPosts(query: string, options: { first?: number; after?: string } = {}) {
    const pagination = this.pagination(options);
    const publicationId = await this.getPublicationId();
    const data = await this.graphql(
      `query SearchPosts($first: Int!, $after: String, $filter: SearchPostsOfPublicationFilter!) { searchPostsOfPublication(first: $first, after: $after, filter: $filter) { edges { node { ${postFields} } } ${pageFields} } }`,
      { ...pagination, filter: { publicationId, query: parse(identifier, query) } }
    );
    const result = this.page<Post>(
      data.searchPostsOfPublication,
      pagination.first,
      pagination.after,
      ['title', 'slug', 'url']
    );
    return { posts: result.nodes, pageInfo: result.pageInfo };
  }
}
