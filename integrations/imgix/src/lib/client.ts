import { createApiServiceError, createAuthenticatedAxios, pickDefined } from 'slates';
import { z } from 'zod';
import { apiFailure, containsCredential } from './errors';
import { assetResource, pagination, reportResource, sourceResource } from './schemas';
import { apiPath, rawPath, validateId, validateSort } from './validation';

const sourceDocument = z.object({ data: sourceResource });
const assetDocument = z.object({ data: assetResource });
const reportDocument = z.object({ data: reportResource });
const pagedSources = z.object({
  data: z.array(sourceResource),
  meta: z.object({ pagination })
});
const pagedReports = z.object({
  data: z.array(reportResource),
  meta: z.object({ pagination })
});
const count = z
  .union([z.string().regex(/^\d+$/), z.number().int().nonnegative().safe()])
  .nullish();
const pagedAssets = z.object({
  data: z.array(assetResource),
  cursor: z.object({
    current: z.string().nullish(),
    next: z.string().nullish(),
    hasMore: z.boolean(),
    totalRecords: count
  })
});
type Params = {
  sort?: string;
  filterName?: string;
  filterEnabled?: boolean;
  filterDeploymentType?: string;
  pageNumber?: number;
  pageSize?: number;
};
export class ImgixClient {
  private http;
  private credentials: Set<string>;
  constructor(
    private token: string,
    credentials: string[] = []
  ) {
    this.credentials = new Set(credentials);
    if (!token || /\s/.test(token))
      throw createApiServiceError('A valid Management API key is required.', { parent: {} });
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.imgix.com/api/v1',
      authHeader: { value: `Bearer ${token}` },
      contentType: 'application/vnd.api+json',
      headers: { Accept: 'application/vnd.api+json' },
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 8 * 1024 * 1024,
      errorAdapter: error => apiFailure(error, 'request')
    });
  }
  private reflectsCredential(value: unknown): boolean {
    if (containsCredential(value, this.token)) return true;
    const record = (part: unknown): Record<string, unknown> | undefined =>
      part && typeof part === 'object' && !Array.isArray(part)
        ? (part as Record<string, unknown>)
        : undefined;
    const document = record(value);
    if (!document)
      return [...this.credentials].some(secret => containsCredential(value, secret));
    const source = (part: unknown) => {
      const resource = record(part);
      const attributes = record(resource?.attributes);
      if (resource?.type !== 'sources' || !attributes) return part;
      const token = attributes.secure_url_token;
      if (typeof token === 'string' && token) this.credentials.add(token);
      const { secure_url_token: _token, ...visible } = attributes;
      const deployment = record(visible.deployment);
      if (deployment) {
        const copy = { ...deployment };
        // These native fields are redacted by the HTTP helper. Other reflections must fail.
        for (const key of ['password', 's3_secret_key', 'gcs_secret_key', 'secret_key']) {
          const secret = copy[key];
          if (typeof secret === 'string' && this.credentials.has(secret)) delete copy[key];
        }
        visible.deployment = copy;
      }
      return { ...resource, attributes: visible };
    };
    const visible = {
      ...document,
      data: Array.isArray(document.data) ? document.data.map(source) : source(document.data)
    };
    return [...this.credentials].some(secret => containsCredential(visible, secret));
  }
  private async request(
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    status: number,
    params?: Record<string, unknown>,
    data?: unknown,
    uncertain = false
  ) {
    try {
      const response = await this.http.request<unknown>({ method, url: path, params, data });
      if (response.status !== status || this.reflectsCredential(response.data))
        throw createApiServiceError(
          `imgix returned an unexpected ${method === 'GET' ? 'read' : 'mutation'} receipt.${uncertain ? ' The operation may have succeeded; inspect the existing resource or discovery list before repeating it.' : ''}`,
          { parent: {} }
        );
      return response.data;
    } catch (error) {
      throw apiFailure(error, 'request');
    }
  }
  private parse<T>(
    schema: z.ZodType<T>,
    value: unknown,
    operation: string,
    uncertain = false
  ): T {
    const result = schema.safeParse(value);
    if (!result.success)
      throw createApiServiceError(
        `imgix returned an invalid ${operation} receipt.${uncertain ? ' The mutation may have succeeded; inspect its resource before repeating.' : ''}`,
        { parent: {} }
      );
    return result.data;
  }
  private page<T extends { meta: { pagination: z.infer<typeof pagination> } }>(
    value: T,
    page: number
  ): T {
    const meta = value.meta.pagination;
    if (
      meta.currentPage !== page ||
      (meta.hasNextPage && (meta.nextPage == null || meta.nextPage === page))
    )
      throw createApiServiceError(
        'imgix returned inconsistent native pagination; do not infer a completed listing.',
        { parent: {} }
      );
    return value;
  }
  async listSources(params: Params = {}) {
    validateSort(params.sort, ['name', 'enabled', 'date_deployed']);
    const page = params.pageNumber ?? 0;
    const query = pickDefined({
      sort: params.sort,
      'filter[name]': params.filterName,
      'filter[enabled]': params.filterEnabled,
      'filter[deployment.type]': params.filterDeploymentType,
      'page[number]': page,
      'page[size]': params.pageSize ?? 20
    });
    return this.page(
      this.parse(
        pagedSources,
        await this.request('GET', '/sources', 200, query),
        'source list'
      ),
      page
    );
  }
  async getSource(sourceId: string) {
    validateId(sourceId);
    const result = this.parse(
      sourceDocument,
      await this.request('GET', `/sources/${sourceId}`, 200),
      'source'
    );
    if (result.data.id !== sourceId)
      throw createApiServiceError('imgix returned a different source ID.', { parent: {} });
    return result;
  }
  async createSource(attributes: Record<string, unknown>) {
    return this.parse(
      sourceDocument,
      await this.request(
        'POST',
        '/sources',
        201,
        undefined,
        { data: { type: 'sources', attributes } },
        true
      ),
      'source creation; use list_sources with the unique name and subdomain to resolve uncertain creation',
      true
    );
  }
  async updateSource(sourceId: string, attributes: Record<string, unknown>) {
    validateId(sourceId);
    const result = this.parse(
      sourceDocument,
      await this.request(
        'PATCH',
        `/sources/${sourceId}`,
        200,
        undefined,
        { data: { id: sourceId, type: 'sources', attributes } },
        true
      ),
      'source update',
      true
    );
    if (result.data.id !== sourceId)
      throw createApiServiceError(
        'Source update returned a different ID. Inspect get_source before repeating.',
        { parent: {} }
      );
    return result;
  }
  async listAssets(
    sourceId: string,
    params: {
      cursor?: string;
      limit?: number;
      sort?: string;
      filterOriginPath?: string;
      filterMediaKind?: string;
      filterKeyword?: string;
      filterCategories?: string;
      filterTags?: string;
    } = {}
  ) {
    validateId(sourceId);
    validateSort(params.sort, ['date_created', 'date_modified', 'file_size']);
    const query = pickDefined({
      'page[cursor]': params.cursor,
      'page[limit]': params.limit ?? 20,
      sort: params.sort,
      'filter[origin_path]': params.filterOriginPath,
      'filter[media_kind]': params.filterMediaKind,
      'filter[keyword]': params.filterKeyword,
      'filter[categories]': params.filterCategories,
      'filter[tags]': params.filterTags
    });
    const result = this.parse(
      pagedAssets,
      await this.request('GET', `/sources/${sourceId}/assets`, 200, query),
      'asset list'
    );
    if (result.cursor.hasMore && (!result.cursor.next || result.cursor.next === params.cursor))
      throw createApiServiceError(
        'imgix omitted a usable next cursor; do not infer a completed asset listing.',
        { parent: {} }
      );
    const total =
      result.cursor.totalRecords == null ? undefined : Number(result.cursor.totalRecords);
    if (total !== undefined && (!Number.isSafeInteger(total) || total < 0))
      throw createApiServiceError('imgix asset count is not exactly representable.', {
        parent: {}
      });
    for (const asset of result.data)
      this.matchAsset(asset, sourceId, asset.attributes.origin_path);
    return { ...result, totalRecords: total };
  }
  private matchAsset(
    asset: z.infer<typeof assetResource>,
    sourceId: string,
    originPath: string
  ) {
    if (
      rawPath(asset.attributes.origin_path) !== rawPath(originPath) ||
      (asset.attributes.source_id !== undefined && asset.attributes.source_id !== sourceId) ||
      asset.id !== `${sourceId}/${rawPath(originPath)}`
    )
      throw createApiServiceError(
        'imgix returned a different asset identity. Inspect get_asset before repeating mutations.',
        { parent: {} }
      );
    return asset;
  }
  async getAsset(sourceId: string, originPath: string) {
    validateId(sourceId);
    const result = this.parse(
      assetDocument,
      await this.request('GET', `/sources/${sourceId}/assets/${apiPath(originPath)}`, 200),
      'asset'
    );
    this.matchAsset(result.data, sourceId, originPath);
    return result;
  }
  async updateAsset(
    sourceId: string,
    originPath: string,
    attributes: Record<string, unknown>
  ) {
    const current = await this.getAsset(sourceId, originPath);
    const result = this.parse(
      assetDocument,
      await this.request(
        'PATCH',
        `/sources/${sourceId}/assets/${apiPath(originPath)}`,
        200,
        undefined,
        { data: { id: current.data.id, type: 'assets', attributes } },
        true
      ),
      'asset update',
      true
    );
    this.matchAsset(result.data, sourceId, originPath);
    return result;
  }
  async addAsset(sourceId: string, originPath: string) {
    validateId(sourceId);
    await this.request(
      'POST',
      `/sources/${sourceId}/assets/add/${apiPath(originPath)}`,
      202,
      undefined,
      {},
      true
    );
  }
  async refreshAsset(sourceId: string, originPath: string) {
    validateId(sourceId);
    const result = this.parse(
      assetDocument,
      await this.request(
        'POST',
        `/sources/${sourceId}/assets/refresh/${apiPath(originPath)}`,
        200,
        undefined,
        {},
        true
      ),
      'asset refresh',
      true
    );
    this.matchAsset(result.data, sourceId, originPath);
    return result;
  }
  async purge(url: string, options: { subImage?: boolean; sourceId?: string } = {}) {
    if (options.sourceId !== undefined) validateId(options.sourceId);
    const result = this.parse(
      z.object({
        data: z.object({
          id: z.string().min(1),
          type: z.literal('purges'),
          attributes: z.object({ purge_id: z.string().min(1) })
        })
      }),
      await this.request(
        'POST',
        '/purge',
        200,
        undefined,
        {
          data: {
            type: 'purges',
            attributes: pickDefined({
              url,
              sub_image: options.subImage,
              source_id: options.sourceId
            })
          }
        },
        true
      ),
      'purge',
      true
    );
    if (result.data.id !== result.data.attributes.purge_id)
      throw createApiServiceError(
        'imgix returned inconsistent purge identifiers. Do not automatically repeat the purge.',
        { parent: {} }
      );
    return result;
  }
  async listReports(
    params: {
      sort?: string;
      filterReportType?: string;
      filterCompleted?: boolean;
      pageNumber?: number;
      pageSize?: number;
    } = {}
  ) {
    validateSort(params.sort, ['period_end', 'period_start', 'report_key', 'report_type']);
    const page = params.pageNumber ?? 0;
    const query = pickDefined({
      sort: params.sort,
      'filter[report_type]': params.filterReportType,
      'filter[completed]': params.filterCompleted,
      'page[number]': page,
      'page[size]': params.pageSize ?? 20
    });
    return this.page(
      this.parse(
        pagedReports,
        await this.request('GET', '/reports', 200, query),
        'report list'
      ),
      page
    );
  }
  async getReport(reportId: string) {
    validateId(reportId);
    const result = this.parse(
      reportDocument,
      await this.request('GET', `/reports/${reportId}`, 200),
      'report'
    );
    if (result.data.id !== reportId)
      throw createApiServiceError('imgix returned a different report ID.', { parent: {} });
    return result;
  }
}
