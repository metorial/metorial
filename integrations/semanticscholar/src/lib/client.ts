import { createAxios } from 'slates';

let graphApi = createAxios({
  baseURL: 'https://api.semanticscholar.org/graph/v1'
});

let recommendationsApi = createAxios({
  baseURL: 'https://api.semanticscholar.org/recommendations/v1'
});

let datasetsApi = createAxios({
  baseURL: 'https://api.semanticscholar.org/datasets/v1'
});

export interface PaperSearchParams {
  query: string;
  fields?: string;
  offset?: number;
  limit?: number;
  publicationTypes?: string;
  openAccessPdf?: string;
  minCitationCount?: string;
  publicationDateOrYear?: string;
  year?: string;
  venue?: string;
  fieldsOfStudy?: string;
}

export interface PaperBulkSearchParams {
  query: string;
  fields?: string;
  token?: string;
  sort?: string;
  publicationTypes?: string;
  openAccessPdf?: string;
  minCitationCount?: string;
  publicationDateOrYear?: string;
  year?: string;
  venue?: string;
  fieldsOfStudy?: string;
}

export interface PaginationParams {
  fields?: string;
  offset?: number;
  limit?: number;
}

export class Client {
  private headers: Record<string, string>;

  constructor(config: { token?: string }) {
    this.headers = {};
    if (config.token) {
      this.headers['x-api-key'] = config.token;
    }
  }

  // ── Paper Search ──

  async searchPapers(params: PaperSearchParams) {
    let res = await graphApi.get('/paper/search', {
      headers: this.headers,
      params
    });
    return res.data;
  }

  async searchPapersBulk(params: PaperBulkSearchParams) {
    let res = await graphApi.get('/paper/search/bulk', {
      headers: this.headers,
      params
    });
    return res.data;
  }

  async autocompletePapers(query: string) {
    let res = await graphApi.get('/paper/autocomplete', {
      headers: this.headers,
      params: { query }
    });
    return res.data;
  }

  // ── Paper Details ──

  async getPaper(paperId: string, fields?: string) {
    let res = await graphApi.get(`/paper/${encodeURIComponent(paperId)}`, {
      headers: this.headers,
      params: fields ? { fields } : {}
    });
    return res.data;
  }

  async getPapersBatch(ids: string[], fields?: string) {
    let res = await graphApi.post(
      '/paper/batch',
      { ids },
      {
        headers: this.headers,
        params: fields ? { fields } : {}
      }
    );
    return res.data;
  }

  // ── Citations & References ──

  async getPaperCitations(paperId: string, params?: PaginationParams) {
    let res = await graphApi.get(`/paper/${encodeURIComponent(paperId)}/citations`, {
      headers: this.headers,
      params
    });
    return res.data;
  }

  async getPaperReferences(paperId: string, params?: PaginationParams) {
    let res = await graphApi.get(`/paper/${encodeURIComponent(paperId)}/references`, {
      headers: this.headers,
      params
    });
    return res.data;
  }

  // ── Authors ──

  async searchAuthors(query: string, params?: PaginationParams) {
    let res = await graphApi.get('/author/search', {
      headers: this.headers,
      params: { query, ...params }
    });
    return res.data;
  }

  async getAuthor(authorId: string, fields?: string) {
    let res = await graphApi.get(`/author/${encodeURIComponent(authorId)}`, {
      headers: this.headers,
      params: fields ? { fields } : {}
    });
    return res.data;
  }

  async getAuthorsBatch(ids: string[], fields?: string) {
    let res = await graphApi.post(
      '/author/batch',
      { ids },
      {
        headers: this.headers,
        params: fields ? { fields } : {}
      }
    );
    return res.data;
  }

  async getAuthorPapers(
    authorId: string,
    params?: PaginationParams & { publicationDateOrYear?: string }
  ) {
    let res = await graphApi.get(`/author/${encodeURIComponent(authorId)}/papers`, {
      headers: this.headers,
      params
    });
    return res.data;
  }

  // ── Recommendations ──

  async getRecommendationsForPaper(
    paperId: string,
    params?: { from?: string; limit?: number; fields?: string }
  ) {
    let res = await recommendationsApi.get(`/papers/forpaper/${encodeURIComponent(paperId)}`, {
      headers: this.headers,
      params
    });
    return res.data;
  }

  async getRecommendationsFromList(
    body: { positivePaperIds: string[]; negativePaperIds?: string[] },
    params?: { limit?: number; fields?: string }
  ) {
    let res = await recommendationsApi.post('/papers/', body, {
      headers: this.headers,
      params
    });
    return res.data;
  }

  // ── Datasets ──

  async listReleases() {
    let res = await datasetsApi.get('/release/', {
      headers: this.headers
    });
    return res.data;
  }

  async getRelease(releaseId: string) {
    let res = await datasetsApi.get(`/release/${encodeURIComponent(releaseId)}`, {
      headers: this.headers
    });
    return res.data;
  }

  async getDatasetDownloadLinks(releaseId: string, datasetName: string) {
    let res = await datasetsApi.get(
      `/release/${encodeURIComponent(releaseId)}/dataset/${encodeURIComponent(datasetName)}`,
      {
        headers: this.headers
      }
    );
    return res.data;
  }
}
