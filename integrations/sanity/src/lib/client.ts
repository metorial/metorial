import { ServiceError } from '@lowerdeck/error';
import { createAuthenticatedAxios, pickDefined, requestAxios } from 'slates';
import { z } from 'zod';
import { privateReceipt, serviceFailure, tokenValue } from './http';
import {
  apiVersion,
  dataset,
  documentId,
  documentPage,
  input,
  invalid,
  malformed,
  nativeAsset,
  nativeDataset,
  nativeHook,
  nativeProfile,
  nativeProject,
  opaqueId,
  parse,
  projectId,
  record
} from './schemas';

export interface SanityClientConfig {
  token: string;
  projectId?: string;
  dataset?: string;
  apiVersion?: string;
}
export const clientFor = (ctx: {
  auth: { token: string };
  input: { projectId?: string; dataset?: string };
  config: Record<string, unknown>;
}) =>
  new SanityClient({
    token: ctx.auth.token,
    projectId:
      ctx.input.projectId ??
      (typeof ctx.config.projectId === 'string' ? ctx.config.projectId : undefined),
    dataset:
      ctx.input.dataset ??
      (typeof ctx.config.dataset === 'string' ? ctx.config.dataset : 'production'),
    apiVersion:
      typeof ctx.config.apiVersion === 'string' ? ctx.config.apiVersion : '2024-01-01'
  });
export class SanityClient {
  readonly token: string;
  readonly apiVersion: string;
  readonly projectId?: string;
  readonly dataset?: string;
  constructor(config: SanityClientConfig) {
    this.token = tokenValue(config.token);
    this.apiVersion = input(
      apiVersion,
      config.apiVersion ?? '2024-01-01',
      'Provide an actual API version date in YYYY-MM-DD format.'
    );
    this.projectId =
      config.projectId === undefined
        ? undefined
        : input(
            projectId,
            config.projectId,
            'Call list_projects and provide an exact project ID.'
          );
    this.dataset =
      config.dataset === undefined
        ? undefined
        : input(
            dataset,
            config.dataset,
            'Call manage_datasets with action list and provide a valid dataset name.'
          );
  }
  project() {
    if (!this.projectId)
      throw invalid(
        'Call list_projects and pass projectId to this tool. Older stored project settings remain supported.'
      );
    return this.projectId;
  }
  lake() {
    if (!this.dataset)
      throw invalid('Call manage_datasets with action list and pass dataset.');
    return encodeURIComponent(this.dataset);
  }
  async request<T extends z.ZodType>(
    shape: T,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    data?: unknown,
    params?: Record<string, unknown>,
    management = false,
    cdn = false,
    contentType = 'application/json'
  ) {
    const baseURL = management
      ? `https://api.sanity.io/v${this.apiVersion}`
      : `https://${this.project()}.${cdn ? 'apicdn' : 'api'}.sanity.io/v${this.apiVersion}`;
    const ax = createAuthenticatedAxios({
      baseURL,
      authHeader: { value: `Bearer ${this.token}` },
      contentType,
      timeout: 60000,
      maxRedirects: 0,
      maxContentLength: 32 * 1024 * 1024,
      maxBodyLength: 32 * 1024 * 1024
    });
    const response = await requestAxios(
      'Sanity request',
      () =>
        ax.request<unknown>({
          method,
          url: path,
          data,
          params: params ? pickDefined(params) : undefined
        }),
      serviceFailure
    );
    if (response.status !== 200) throw malformed();
    privateReceipt(this.token)(response.data);
    return parse(shape, response.data);
  }
  async query(
    query: string,
    params?: Record<string, unknown>,
    options?: { perspective?: string; useCdn?: boolean }
  ) {
    return this.request(
      z
        .object({ result: z.unknown(), ms: z.number().optional() })
        .passthrough()
        .refine(value => Object.hasOwn(value, 'result')),
      'POST',
      `/data/query/${this.lake()}`,
      { query, params: params ?? {} },
      options?.perspective ? { perspective: options.perspective } : undefined,
      false,
      options?.useCdn
    );
  }
  async getDocuments(
    ids: string[],
    options?: {
      revision?: string;
      time?: string;
      lastRevision?: boolean;
      includeAllVersions?: boolean;
    }
  ) {
    const historical =
      options?.revision !== undefined ||
      options?.time !== undefined ||
      options?.lastRevision === true;
    const encoded = ids
      .map(id =>
        encodeURIComponent(input(documentId, id, 'Provide an exact valid document ID.'))
      )
      .join(',');
    const response = await this.request(
      documentPage,
      'GET',
      historical
        ? `/data/history/${this.lake()}/documents/${encoded}`
        : `/data/doc/${this.lake()}/${encoded}`,
      undefined,
      options
    );
    if (
      response.documents.some(
        doc =>
          !ids.includes(doc._id) &&
          !(
            options?.includeAllVersions &&
            ids.some(
              id =>
                doc._id === `drafts.${id}` ||
                (doc._id.startsWith('versions.') && doc._id.endsWith(`.${id}`))
            )
          )
      )
    )
      throw malformed();
    return response;
  }
  async getDocument(id: string) {
    return this.getDocuments([id]);
  }
  async getDocumentRevision(id: string, options: { revision?: string; time?: string }) {
    return this.getDocuments([id], options);
  }
  async mutate(mutations: Record<string, unknown>[], options?: Record<string, unknown>) {
    return this.request(
      z
        .object({
          transactionId: opaqueId,
          results: z.array(
            z
              .object({
                operation: z.string(),
                id: documentId.optional(),
                documentId: documentId.optional(),
                document: record.optional()
              })
              .passthrough()
              .refine(
                value =>
                  (value.id !== undefined || value.documentId !== undefined) &&
                  !(
                    value.id !== undefined &&
                    value.documentId !== undefined &&
                    value.id !== value.documentId
                  )
              )
          )
        })
        .passthrough(),
      'POST',
      `/data/mutate/${this.lake()}`,
      { mutations },
      { returnIds: true, returnDocuments: false, ...options }
    );
  }
  async listProjects() {
    return this.request(
      z.array(nativeProject),
      'GET',
      '/projects',
      undefined,
      undefined,
      true
    );
  }
  async getProject(id = this.project()) {
    const exact = input(projectId, id, 'Provide an exact project ID.');
    const response = await this.request(
      nativeProject,
      'GET',
      `/projects/${encodeURIComponent(exact)}`,
      undefined,
      undefined,
      true
    );
    if (response.id !== exact) throw malformed();
    return response;
  }
  async listDatasets(id = this.project()) {
    const exact = input(projectId, id, 'Provide an exact project ID.');
    return this.request(
      z.array(nativeDataset),
      'GET',
      `/projects/${encodeURIComponent(exact)}/datasets`,
      undefined,
      undefined,
      true
    );
  }
  async getDataset(name: string) {
    const exact = input(dataset, name, 'Provide a valid dataset name.');
    const matches = (await this.listDatasets()).filter(item => item.name === exact);
    if (matches.length !== 1)
      throw invalid(
        'The exact dataset is unavailable in native discovery. Check its name and token permissions.'
      );
    return matches[0]!;
  }
  async createDataset(name: string, aclMode?: 'public' | 'private' | 'custom') {
    await this.request(
      record,
      'PUT',
      `/projects/${this.project()}/datasets/${encodeURIComponent(name)}`,
      aclMode ? { aclMode } : {},
      undefined,
      true
    );
    const result = await this.getDataset(name);
    if (aclMode && result.aclMode !== aclMode) throw malformed();
    return result;
  }
  async deleteDataset(name: string) {
    const result = await this.request(
      z.object({ deleted: z.literal(true) }),
      'DELETE',
      `/projects/${this.project()}/datasets/${encodeURIComponent(name)}`,
      undefined,
      undefined,
      true
    );
    if ((await this.listDatasets()).some(item => item.name === name)) throw malformed();
    return result;
  }
  async listWebhooks() {
    return this.request(z.array(nativeHook), 'GET', `/hooks/projects/${this.project()}`);
  }
  async getWebhook(id: string) {
    const result = await this.request(
      nativeHook,
      'GET',
      `/hooks/projects/${this.project()}/${encodeURIComponent(input(opaqueId, id, 'Provide an exact webhook ID.'))}`
    );
    if (result.id !== id) throw malformed();
    return result;
  }
  async createWebhook(body: Record<string, unknown>) {
    const result = await this.request(
      nativeHook,
      'POST',
      `/hooks/projects/${this.project()}`,
      body
    );
    const read = await this.getWebhook(result.id);
    for (const key of [
      'type',
      'name',
      'url',
      'dataset',
      'apiVersion',
      'httpMethod',
      'includeDrafts'
    ])
      if (body[key] !== undefined && JSON.stringify(body[key]) !== JSON.stringify(read[key]))
        throw malformed();
    if (body.rule !== undefined) {
      const requested = record.safeParse(body.rule);
      const returned = record.safeParse(read.rule);
      if (!requested.success || !returned.success) throw malformed();
      for (const [key, value] of Object.entries(requested.data))
        if (JSON.stringify(value) !== JSON.stringify(returned.data[key])) throw malformed();
    }
    return read;
  }
  async deleteWebhook(id: string) {
    await this.request(
      z.object({ deleted: z.literal(1) }),
      'DELETE',
      `/hooks/projects/${this.project()}/${encodeURIComponent(input(opaqueId, id, 'Provide an exact webhook ID.'))}`
    );
    if ((await this.listWebhooks()).some(hook => hook.id === id && !hook.deletedAt))
      throw malformed();
    return { deleted: true };
  }
  async uploadAsset(
    type: 'image' | 'file',
    bytes: Buffer,
    filename?: string,
    contentType?: string
  ) {
    const result = await this.request(
      z.object({ document: nativeAsset }),
      'POST',
      `/assets/${type === 'image' ? 'images' : 'files'}/${this.lake()}`,
      bytes,
      filename ? { filename } : undefined,
      false,
      false,
      contentType ?? 'application/octet-stream'
    );
    if (
      result.document._type !== `sanity.${type}Asset` ||
      result.document.size !== bytes.length
    )
      throw malformed();
    return result;
  }
  async getCurrentUser() {
    return this.request(nativeProfile, 'GET', '/users/me', undefined, undefined, true);
  }
  async profile() {
    try {
      const user = await this.getCurrentUser();
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        imageUrl: user.profileImage ?? undefined
      };
    } catch (error) {
      if (!(error instanceof ServiceError) || error.data.upstreamStatus !== 401) throw error;
      await this.listProjects();
      return { name: 'Sanity API token — project access verified' };
    }
  }
}
