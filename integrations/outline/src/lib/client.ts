import { createAxios, pickDefined } from 'slates';
import { z } from 'zod';
import {
  nativeCollection,
  nativeComment,
  nativeDocument,
  nativeGroup,
  nativeMembership,
  nativeUser,
  paginationSchema
} from './schemas';
import {
  apiError,
  assertNoCredential,
  identifier,
  instanceUrl,
  parse,
  requireValue
} from './validation';

export type OutlineDocument = z.infer<typeof nativeDocument>;
export type OutlineCollection = z.infer<typeof nativeCollection>;
export type OutlineComment = z.infer<typeof nativeComment>;
export type OutlineGroup = z.infer<typeof nativeGroup>;
export type OutlineUser = z.infer<typeof nativeUser>;
export type Pagination = z.infer<typeof paginationSchema>;
export interface ClientConfig {
  token: string;
  baseUrl?: string;
}
export function clientConfig(
  auth: ClientConfig,
  config: Record<string, unknown> = {}
): ClientConfig {
  const baseUrl =
    auth.baseUrl ?? (typeof config.baseUrl === 'string' ? config.baseUrl : undefined);
  requireValue(
    baseUrl,
    'Reconnect API Token authentication with the exact Outline instance URL. Legacy connections may retain their configured instance URL.'
  );
  return { token: auth.token, baseUrl: instanceUrl(baseUrl) };
}
const envelope = z.object({
  ok: z.boolean().optional(),
  success: z.boolean().optional(),
  data: z.unknown().optional(),
  pagination: z.unknown().optional()
});
export class Client {
  readonly baseUrl: string;
  readonly token: string;
  constructor(config: ClientConfig) {
    requireValue(
      config.baseUrl,
      'Set the exact Outline instance URL in API Token authentication before using this connection.'
    );
    this.baseUrl = instanceUrl(config.baseUrl);
    this.token = identifier(config.token, 'API token');
  }
  async post(endpoint: string, data: Record<string, unknown> = {}) {
    requireValue(/^[a-z]+\.[a-z_]+$/.test(endpoint), 'Unsupported Outline operation.');
    assertNoCredential(data, this.token);
    let response: { status: number; data: unknown };
    try {
      response = await createAxios({}).post(`/${endpoint}`, pickDefined(data), {
        baseURL: `${this.baseUrl}/api`,
        timeout: 30_000,
        maxRedirects: 0,
        maxContentLength: 16 * 1024 * 1024,
        maxBodyLength: 4 * 1024 * 1024,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-api-version': '1'
        }
      });
    } catch (error) {
      throw apiError(error, endpoint);
    }
    if (response.status !== 200 && response.status !== 201)
      throw apiError({ response: { status: response.status } }, endpoint);
    assertNoCredential(response.data, this.token);
    const result = parse(envelope, response.data, endpoint);
    requireValue(
      result.ok !== false && result.success !== false,
      `Outline ${endpoint} was not accepted. Check permissions and server version, then inspect state before retrying a write.`
    );
    return result;
  }
  async one<T extends { id: string; urlId?: string }>(
    endpoint: string,
    schema: z.ZodType<T>,
    data: Record<string, unknown>,
    expectedId?: string
  ): Promise<T> {
    const response = await this.post(endpoint, data);
    const resource = parse(schema, response.data, endpoint);
    requireValue(
      !expectedId || resource.id === expectedId || resource.urlId === expectedId,
      'Outline returned a different resource. Inspect the exact resource before retrying a write.'
    );
    return resource;
  }
  async page<T>(endpoint: string, schema: z.ZodType<T>, data: Record<string, unknown> = {}) {
    const response = await this.post(endpoint, data);
    const resources = parse(z.array(schema), response.data, endpoint);
    return { data: resources, pagination: this.pagination(response.pagination, endpoint) };
  }
  pagination(value: unknown, endpoint: string): Pagination | undefined {
    if (value === undefined) return undefined;
    const result = parse(paginationSchema, value, 'pagination');
    if (result.nextPath) {
      const url = new URL(result.nextPath, `${this.baseUrl}/`);
      requireValue(
        url.origin === new URL(this.baseUrl).origin &&
          url.pathname ===
            `${new URL(this.baseUrl).pathname}/api/${endpoint}`.replace(/\/+/g, '/') &&
          !url.username &&
          !url.password &&
          !url.hash,
        'Outline returned an unsupported pagination path. Continue using explicit limit and offset.'
      );
    }
    return result;
  }
  async accepted(endpoint: string, data: Record<string, unknown>) {
    const result = await this.post(endpoint, data);
    requireValue(
      result.success === true,
      `Outline did not confirm ${endpoint}. Inspect state before retrying; prior effects may remain.`
    );
  }
  async getIdentity() {
    const result = await this.post('auth.info');
    return parse(
      z.object({
        user: nativeUser,
        team: z.object({ id: z.string().min(1), name: z.string(), url: z.string().optional() })
      }),
      result.data,
      'identity'
    );
  }
  getDocument(id: string) {
    return this.one(
      'documents.info',
      nativeDocument,
      { id: identifier(id), apiVersion: 1 },
      id
    );
  }
  listDocuments(data: Record<string, unknown> = {}) {
    return this.page('documents.list', nativeDocument, data);
  }
  listDrafts(data: Record<string, unknown> = {}) {
    return this.page('documents.drafts', nativeDocument, data);
  }
  createDocument(data: Record<string, unknown>) {
    return this.one('documents.create', nativeDocument, data);
  }
  updateDocument(data: Record<string, unknown> & { id: string }) {
    return this.one('documents.update', nativeDocument, data, data.id);
  }
  archiveDocument(id: string) {
    return this.one('documents.archive', nativeDocument, { id: identifier(id) }, id);
  }
  restoreDocument(id: string, collectionId?: string) {
    return this.one(
      'documents.restore',
      nativeDocument,
      { id: identifier(id), collectionId },
      id
    );
  }
  deleteDocument(id: string, permanent = false) {
    return this.accepted('documents.delete', { id: identifier(id), permanent });
  }
  async moveDocument(
    id: string,
    collectionId?: string,
    parentDocumentId?: string,
    index?: number
  ) {
    const result = await this.post('documents.move', {
      id: identifier(id),
      collectionId,
      parentDocumentId,
      index
    });
    const data = parse(
      z.object({
        documents: z.array(nativeDocument),
        collections: z.array(nativeCollection).optional()
      }),
      result.data,
      'document move'
    );
    const document = data.documents.find(d => d.id === id || d.urlId === id);
    requireValue(
      document,
      'Outline did not identify the moved document. Inspect both collections before retrying; the move may already have occurred.'
    );
    requireValue(
      (collectionId === undefined || document.collectionId === collectionId) &&
        (parentDocumentId === undefined || document.parentDocumentId === parentDocumentId),
      'Outline move receipt differs from the requested destination. Re-read the document before retrying.'
    );
    return {
      document,
      affectedDocumentIds: data.documents.map(d => d.id),
      affectedCollectionIds: data.collections?.map(c => c.id)
    };
  }
  async searchDocuments(data: Record<string, unknown>) {
    return this.page(
      'documents.search',
      z.object({ context: z.string(), ranking: z.number(), document: nativeDocument }),
      data
    );
  }
  async exportDocument(id: string) {
    const result = await this.post('documents.export', {
      id: identifier(id),
      includeChildDocuments: false
    });
    const markdown = parse(z.string(), result.data, 'Markdown export');
    const bytes = Buffer.from(markdown, 'utf8');
    requireValue(
      bytes.byteLength <= 8 * 1024 * 1024,
      'Markdown export exceeds the supported 8 MiB size. Export a smaller document.'
    );
    return bytes;
  }
  getCollection(id: string) {
    return this.one('collections.info', nativeCollection, { id: identifier(id) }, id);
  }
  listCollections(data: Record<string, unknown> = {}) {
    return this.page('collections.list', nativeCollection, data);
  }
  createCollection(data: Record<string, unknown>) {
    return this.one('collections.create', nativeCollection, data);
  }
  updateCollection(data: Record<string, unknown> & { id: string }) {
    return this.one('collections.update', nativeCollection, data, data.id);
  }
  deleteCollection(id: string) {
    return this.accepted('collections.delete', { id: identifier(id) });
  }
  async collectionMemberships(
    id: string,
    groups: boolean,
    data: Record<string, unknown> = {}
  ) {
    const endpoint = groups ? 'collections.group_memberships' : 'collections.memberships';
    const result = await this.post(endpoint, { ...data, id: identifier(id) });
    const memberships = groups
      ? (() => {
          const parsed = parse(
            z.object({
              groupMemberships: z.array(nativeMembership).optional(),
              collectionGroupMemberships: z.array(nativeMembership).optional()
            }),
            result.data,
            'collection group memberships'
          );
          return parsed.groupMemberships ?? parsed.collectionGroupMemberships;
        })()
      : parse(
          z.object({ memberships: z.array(nativeMembership) }),
          result.data,
          'collection user memberships'
        ).memberships;
    requireValue(
      memberships,
      'Outline did not provide collection membership records. Check your server version.'
    );
    requireValue(
      memberships.every(m => m.collectionId === id),
      'Outline returned memberships for a different collection.'
    );
    return { memberships, pagination: this.pagination(result.pagination, endpoint) };
  }
  async addCollectionMember(
    id: string,
    targetId: string,
    group: boolean,
    permission?: string
  ) {
    const endpoint = group ? 'collections.add_group' : 'collections.add_user';
    const result = await this.post(endpoint, {
      id: identifier(id),
      [group ? 'groupId' : 'userId']: identifier(targetId),
      permission
    });
    const data = parse(
      z.object({
        memberships: z.array(nativeMembership).optional(),
        groupMemberships: z.array(nativeMembership).optional(),
        collectionGroupMemberships: z.array(nativeMembership).optional()
      }),
      result.data,
      'collection membership'
    );
    const memberships = group
      ? (data.groupMemberships ?? data.collectionGroupMemberships)
      : data.memberships;
    const membership = memberships?.find(
      m => m.collectionId === id && (group ? m.groupId === targetId : m.userId === targetId)
    );
    requireValue(
      membership && (permission === undefined || membership.permission === permission),
      'Outline did not confirm the exact collection membership and permission. Inspect membership state before retrying.'
    );
    return membership;
  }
  removeCollectionMember(id: string, targetId: string, group: boolean) {
    return this.accepted(group ? 'collections.remove_group' : 'collections.remove_user', {
      id: identifier(id),
      [group ? 'groupId' : 'userId']: identifier(targetId)
    });
  }
  getUser(id: string) {
    return this.one('users.info', nativeUser, { id: identifier(id) }, id);
  }
  listUsers(data: Record<string, unknown> = {}) {
    return this.page('users.list', nativeUser, data);
  }
  getComment(id: string) {
    return this.one('comments.info', nativeComment, { id: identifier(id) }, id);
  }
  listComments(data: Record<string, unknown> = {}) {
    return this.page('comments.list', nativeComment, data);
  }
  createComment(data: Record<string, unknown>) {
    return this.one('comments.create', nativeComment, data);
  }
  updateComment(data: Record<string, unknown> & { id: string }) {
    return this.one('comments.update', nativeComment, data, data.id);
  }
  deleteComment(id: string) {
    return this.accepted('comments.delete', { id: identifier(id) });
  }
  getGroup(id: string) {
    return this.one('groups.info', nativeGroup, { id: identifier(id) }, id);
  }
  createGroup(data: Record<string, unknown>) {
    return this.one('groups.create', nativeGroup, data);
  }
  updateGroup(data: Record<string, unknown> & { id: string }) {
    return this.one('groups.update', nativeGroup, data, data.id);
  }
  deleteGroup(id: string) {
    return this.accepted('groups.delete', { id: identifier(id) });
  }
  async listGroups(data: Record<string, unknown> = {}) {
    const result = await this.post('groups.list', data);
    const parsed = parse(z.object({ groups: z.array(nativeGroup) }), result.data, 'groups');
    return {
      data: parsed.groups,
      pagination: this.pagination(result.pagination, 'groups.list')
    };
  }
  async groupMemberships(id: string, data: Record<string, unknown> = {}) {
    const result = await this.post('groups.memberships', { ...data, id: identifier(id) });
    const parsed = parse(
      z.object({ groupMemberships: z.array(nativeMembership) }),
      result.data,
      'group memberships'
    );
    requireValue(
      parsed.groupMemberships.every(m => m.groupId === id),
      'Outline returned memberships for a different group.'
    );
    return {
      memberships: parsed.groupMemberships,
      pagination: this.pagination(result.pagination, 'groups.memberships')
    };
  }
  async changeGroupMember(id: string, userId: string, add: boolean) {
    const result = await this.post(add ? 'groups.add_user' : 'groups.remove_user', {
      id: identifier(id),
      userId: identifier(userId)
    });
    const data = parse(
      z.object({
        groups: z.array(nativeGroup),
        groupMemberships: z.array(nativeMembership).optional()
      }),
      result.data,
      'group membership'
    );
    const group = data.groups.find(g => g.id === id);
    requireValue(
      group &&
        (!add || data.groupMemberships?.some(m => m.groupId === id && m.userId === userId)),
      'Outline did not confirm the requested group membership operation. Inspect current membership state before retrying.'
    );
    return group;
  }
}
