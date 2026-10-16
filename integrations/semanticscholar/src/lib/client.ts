import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  requestAxiosData
} from 'slates';
import { z } from 'zod';

let graphApi = createAxios({ baseURL: 'https://api.semanticscholar.org/graph/v1' });
let recommendationsApi = createAxios({
  baseURL: 'https://api.semanticscholar.org/recommendations/v1'
});
let datasetsApi = createAxios({ baseURL: 'https://api.semanticscholar.org/datasets/v1' });
let recordSchema = z.object({}).passthrough();
let paperSchema = z.object({ paperId: z.string().nullable() }).passthrough();
let authorSchema = z.object({ authorId: z.string().nullable() }).passthrough();
let pageSchema = z
  .object({
    offset: z.number().optional(),
    next: z.number().optional(),
    data: z.array(recordSchema)
  })
  .passthrough();
let searchSchema = pageSchema.extend({ total: z.number() });
let datasetSchema = z.object({ name: z.string(), files: z.array(z.string()) }).passthrough();
let releaseSchema = z
  .object({ release_id: z.string(), datasets: z.array(recordSchema) })
  .passthrough();

export interface PaperFilters {
  fields?: string;
  publicationTypes?: string;
  openAccessPdf?: string;
  minCitationCount?: string;
  publicationDateOrYear?: string;
  year?: string;
  venue?: string;
  fieldsOfStudy?: string;
}
export interface PaperSearchParams extends PaperFilters {
  query: string;
  offset?: number;
  limit?: number;
}
export interface PaperBulkSearchParams extends PaperFilters {
  query?: string;
  token?: string;
  sort?: string;
}
export interface PaginationParams {
  fields?: string;
  offset?: number;
  limit?: number;
}
export interface SnippetSearchParams {
  query: string;
  fields?: string;
  paperIds?: string;
  authors?: string;
  minCitationCount?: string;
  insertedBefore?: string;
  publicationDateOrYear?: string;
  year?: string;
  venue?: string;
  fieldsOfStudy?: string;
  limit?: number;
}

export let validateText = (value: string, name: string) => {
  if (!value.trim()) {
    throw createApiServiceError(`${name} must not be empty.`);
  }
};
let validateNumber = (
  value: number | undefined,
  name: string,
  minimum: number,
  maximum?: number
) => {
  if (
    value !== undefined &&
    (!Number.isSafeInteger(value) ||
      value < minimum ||
      (maximum !== undefined && value > maximum))
  ) {
    throw createApiServiceError(
      `${name} must be an integer from ${minimum}${maximum === undefined ? ' upward' : ` to ${maximum}`}.`
    );
  }
};
let validatePagination = (params: PaginationParams = {}, maximum = 1000) => {
  validateNumber(params.offset, 'offset', 0);
  validateNumber(params.limit, 'limit', 1, maximum);
};
let validateFilters = (params: PaperFilters) => {
  if (params.openAccessPdf !== undefined && params.openAccessPdf !== '') {
    throw createApiServiceError(
      'openAccessPdf must be an empty string to enable the PDF filter.'
    );
  }
  if (params.minCitationCount !== undefined && !/^\d+$/.test(params.minCitationCount)) {
    throw createApiServiceError('minCitationCount must be a non-negative integer string.');
  }
};
let validateIds = (ids: string[], name: string, maximum: number) => {
  if (ids.length < 1 || ids.length > maximum) {
    throw createApiServiceError(`${name} must contain between 1 and ${maximum} identifiers.`);
  }
  for (let id of ids) validateText(id, name);
};

export class Client {
  private headers: Record<string, string>;

  constructor(config: { token?: string }) {
    this.headers = config.token ? { 'x-api-key': config.token } : {};
  }

  private async request<T>(
    operation: string,
    request: Parameters<typeof requestAxiosData>[1],
    schema: z.ZodType<T>
  ) {
    let data = await requestAxiosData(operation, request, (error, action) =>
      buildApiServiceError(error, {
        providerLabel: 'Semantic Scholar',
        reason: 'semantic_scholar_api_error',
        operation: action,
        extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
      })
    );
    let result = schema.safeParse(data);
    if (!result.success) {
      throw createApiServiceError(
        `Semantic Scholar returned a malformed ${operation} response.`,
        {
          reason: 'invalid_semantic_scholar_response'
        }
      );
    }
    return result.data;
  }

  async searchPapers(params: PaperSearchParams) {
    validateText(params.query, 'query');
    validatePagination(params, 100);
    if ((params.offset ?? 0) + (params.limit ?? 100) > 1000) {
      throw createApiServiceError(
        'Relevance search can retrieve at most 1,000 results. Use search_papers_bulk for larger searches.'
      );
    }
    validateFilters(params);
    return this.request(
      'paper search',
      () => graphApi.get('/paper/search', { headers: this.headers, params }),
      searchSchema
    );
  }

  async searchPapersBulk(params: PaperBulkSearchParams) {
    validateFilters(params);
    if (
      params.sort !== undefined &&
      !/^(paperId|publicationDate|citationCount)(:(asc|desc))?$/.test(params.sort)
    ) {
      throw createApiServiceError(
        'sort must use paperId, publicationDate, or citationCount, optionally followed by :asc or :desc.'
      );
    }
    return this.request(
      'bulk paper search',
      () => graphApi.get('/paper/search/bulk', { headers: this.headers, params }),
      z
        .object({
          total: z.union([z.string(), z.number()]),
          token: z.string().optional(),
          data: z.array(recordSchema)
        })
        .passthrough()
    );
  }

  async matchPaper(params: PaperFilters & { query: string }) {
    validateText(params.query, 'query');
    validateFilters(params);
    return this.request(
      'paper title matching',
      () => graphApi.get('/paper/search/match', { headers: this.headers, params }),
      z.object({ data: z.array(paperSchema).length(1) }).passthrough()
    );
  }

  async searchSnippets(params: SnippetSearchParams) {
    validateText(params.query, 'query');
    validatePagination(params);
    validateFilters(params);
    return this.request(
      'snippet search',
      () => graphApi.get('/snippet/search', { headers: this.headers, params }),
      z
        .object({ data: z.array(recordSchema), retrievalVersion: z.string().optional() })
        .passthrough()
    );
  }

  async autocompletePapers(query: string) {
    validateText(query, 'query');
    return this.request(
      'paper autocomplete',
      () => graphApi.get('/paper/autocomplete', { headers: this.headers, params: { query } }),
      z.object({ matches: z.array(recordSchema) }).passthrough()
    );
  }

  async getPaper(paperId: string, fields?: string) {
    validateText(paperId, 'paperId');
    return this.request(
      'paper details',
      () =>
        graphApi.get(`/paper/${encodeURIComponent(paperId)}`, {
          headers: this.headers,
          params: { fields }
        }),
      paperSchema
    );
  }

  async getPapersBatch(ids: string[], fields?: string) {
    validateIds(ids, 'paperIds', 500);
    return this.request(
      'batch paper details',
      () =>
        graphApi.post('/paper/batch', { ids }, { headers: this.headers, params: { fields } }),
      z.array(paperSchema.nullable())
    );
  }

  async getPaperAuthors(paperId: string, params: PaginationParams = {}) {
    validateText(paperId, 'paperId');
    validatePagination(params);
    return this.request(
      'paper authors',
      () =>
        graphApi.get(`/paper/${encodeURIComponent(paperId)}/authors`, {
          headers: this.headers,
          params
        }),
      pageSchema
    );
  }

  async getPaperCitations(paperId: string, params: PaginationParams = {}) {
    validateText(paperId, 'paperId');
    validatePagination(params);
    return this.request(
      'paper citations',
      () =>
        graphApi.get(`/paper/${encodeURIComponent(paperId)}/citations`, {
          headers: this.headers,
          params
        }),
      pageSchema
    );
  }

  async getPaperReferences(paperId: string, params: PaginationParams = {}) {
    validateText(paperId, 'paperId');
    validatePagination(params);
    return this.request(
      'paper references',
      () =>
        graphApi.get(`/paper/${encodeURIComponent(paperId)}/references`, {
          headers: this.headers,
          params
        }),
      pageSchema
    );
  }

  async searchAuthors(query: string, params: PaginationParams = {}) {
    validateText(query, 'query');
    validatePagination(params);
    return this.request(
      'author search',
      () =>
        graphApi.get('/author/search', {
          headers: this.headers,
          params: { query, ...params }
        }),
      searchSchema
    );
  }

  async getAuthor(authorId: string, fields?: string) {
    validateText(authorId, 'authorId');
    return this.request(
      'author details',
      () =>
        graphApi.get(`/author/${encodeURIComponent(authorId)}`, {
          headers: this.headers,
          params: { fields }
        }),
      authorSchema
    );
  }

  async getAuthorsBatch(ids: string[], fields?: string) {
    validateIds(ids, 'authorIds', 1000);
    return this.request(
      'batch author details',
      () =>
        graphApi.post('/author/batch', { ids }, { headers: this.headers, params: { fields } }),
      z.array(authorSchema.nullable())
    );
  }

  async getAuthorPapers(
    authorId: string,
    params: PaginationParams & { publicationDateOrYear?: string } = {}
  ) {
    validateText(authorId, 'authorId');
    validatePagination(params);
    return this.request(
      'author papers',
      () =>
        graphApi.get(`/author/${encodeURIComponent(authorId)}/papers`, {
          headers: this.headers,
          params
        }),
      pageSchema
    );
  }

  async getRecommendationsForPaper(
    paperId: string,
    params: { from?: string; limit?: number; fields?: string } = {}
  ) {
    validateText(paperId, 'paperId');
    validateNumber(params.limit, 'limit', 1, 500);
    return this.request(
      'paper recommendations',
      () =>
        recommendationsApi.get(`/papers/forpaper/${encodeURIComponent(paperId)}`, {
          headers: this.headers,
          params
        }),
      z.object({ recommendedPapers: z.array(recordSchema) }).passthrough()
    );
  }

  async getRecommendationsFromList(
    body: { positivePaperIds: string[]; negativePaperIds?: string[] },
    params: { limit?: number; fields?: string } = {}
  ) {
    if (!body.positivePaperIds.length)
      throw createApiServiceError('Provide at least one positivePaperId.');
    for (let id of [...body.positivePaperIds, ...(body.negativePaperIds ?? [])])
      validateText(id, 'paper identifier');
    validateNumber(params.limit, 'limit', 1, 500);
    return this.request(
      'multi-paper recommendations',
      () => recommendationsApi.post('/papers/', body, { headers: this.headers, params }),
      z.object({ recommendedPapers: z.array(recordSchema) }).passthrough()
    );
  }

  async listReleases() {
    return this.request(
      'dataset releases',
      () => datasetsApi.get('/release/', { headers: this.headers }),
      z.array(z.string())
    );
  }

  async getRelease(releaseId: string) {
    validateText(releaseId, 'releaseId');
    return this.request(
      'dataset release',
      () =>
        datasetsApi.get(`/release/${encodeURIComponent(releaseId)}`, {
          headers: this.headers
        }),
      releaseSchema
    );
  }

  async getDatasetDownloadLinks(releaseId: string, datasetName: string) {
    validateText(releaseId, 'releaseId');
    validateText(datasetName, 'datasetName');
    return this.request(
      'dataset download links',
      () =>
        datasetsApi.get(
          `/release/${encodeURIComponent(releaseId)}/dataset/${encodeURIComponent(datasetName)}`,
          { headers: this.headers }
        ),
      datasetSchema
    );
  }
}
