import { createAxios } from 'slates';

export interface ContentApiConfig {
  repositoryName: string;
  accessToken?: string;
}

export interface PrismicRef {
  ref: string;
  id: string;
  label: string;
  isMasterRef?: boolean;
  scheduledAt?: string;
}

export interface PrismicApiResponse {
  refs: PrismicRef[];
  types: Record<string, string>;
  tags: string[];
  languages: { id: string; name: string }[];
  forms: Record<string, any>;
  bookmarks: Record<string, string>;
  oauth_initiate: string;
  oauth_token: string;
}

export interface PrismicDocument {
  id: string;
  uid: string | null;
  url: string | null;
  type: string;
  href: string;
  tags: string[];
  first_publication_date: string;
  last_publication_date: string;
  slugs: string[];
  linked_documents: any[];
  lang: string;
  alternate_languages: { id: string; uid: string; type: string; lang: string }[];
  data: Record<string, any>;
}

export interface PrismicQueryResponse {
  page: number;
  results_per_page: number;
  results_size: number;
  total_results_size: number;
  total_pages: number;
  next_page: string | null;
  prev_page: string | null;
  results: PrismicDocument[];
}

export class ContentApiClient {
  private repositoryName: string;
  private accessToken?: string;

  constructor(config: ContentApiConfig) {
    this.repositoryName = config.repositoryName;
    this.accessToken = config.accessToken;
  }

  private getAxios() {
    return createAxios({
      baseURL: `https://${this.repositoryName}.cdn.prismic.io/api/v2`
    });
  }

  private getParams(extra?: Record<string, any>): Record<string, any> {
    let params: Record<string, any> = {};
    if (this.accessToken) {
      params.access_token = this.accessToken;
    }
    if (extra) {
      Object.assign(params, extra);
    }
    return params;
  }

  async getApiMetadata(): Promise<PrismicApiResponse> {
    let axios = this.getAxios();
    let response = await axios.get('', {
      params: this.getParams()
    });
    return response.data as PrismicApiResponse;
  }

  async getMasterRef(): Promise<string> {
    let metadata = await this.getApiMetadata();
    let masterRef = metadata.refs.find(r => r.isMasterRef);
    if (!masterRef) {
      throw new Error('Could not find master ref');
    }
    return masterRef.ref;
  }

  async queryDocuments(
    options: {
      query?: string;
      predicates?: string[];
      pageSize?: number;
      page?: number;
      orderings?: string;
      after?: string;
      lang?: string;
      fetchLinks?: string;
      graphQuery?: string;
      ref?: string;
    } = {}
  ): Promise<PrismicQueryResponse> {
    let axios = this.getAxios();
    let ref = options.ref || (await this.getMasterRef());

    let params: Record<string, any> = {
      ref
    };

    if (options.predicates && options.predicates.length > 0) {
      params.q = `[${options.predicates.join('')}]`;
    } else if (options.query) {
      params.q = options.query;
    }

    if (options.pageSize !== undefined) params.pageSize = options.pageSize;
    if (options.page !== undefined) params.page = options.page;
    if (options.orderings) params.orderings = options.orderings;
    if (options.after) params.after = options.after;
    if (options.lang) params.lang = options.lang;
    if (options.fetchLinks) params.fetchLinks = options.fetchLinks;
    if (options.graphQuery) params.graphQuery = options.graphQuery;

    let response = await axios.get('/documents/search', {
      params: this.getParams(params)
    });

    return response.data as PrismicQueryResponse;
  }

  async getDocumentById(
    documentId: string,
    options?: { ref?: string; lang?: string; fetchLinks?: string; graphQuery?: string }
  ): Promise<PrismicDocument | null> {
    let predicates = [`[:d = at(document.id, "${documentId}")]`];
    let result = await this.queryDocuments({
      predicates,
      ref: options?.ref,
      lang: options?.lang,
      fetchLinks: options?.fetchLinks,
      graphQuery: options?.graphQuery
    });
    return result.results[0] || null;
  }

  async getDocumentByUid(
    type: string,
    uid: string,
    options?: { ref?: string; lang?: string; fetchLinks?: string; graphQuery?: string }
  ): Promise<PrismicDocument | null> {
    let predicates = [`[:d = at(my.${type}.uid, "${uid}")]`];
    let result = await this.queryDocuments({
      predicates,
      ref: options?.ref,
      lang: options?.lang,
      fetchLinks: options?.fetchLinks,
      graphQuery: options?.graphQuery
    });
    return result.results[0] || null;
  }

  async getDocumentsByType(
    type: string,
    options?: {
      pageSize?: number;
      page?: number;
      orderings?: string;
      lang?: string;
      ref?: string;
      fetchLinks?: string;
    }
  ): Promise<PrismicQueryResponse> {
    let predicates = [`[:d = at(document.type, "${type}")]`];
    return this.queryDocuments({
      predicates,
      pageSize: options?.pageSize,
      page: options?.page,
      orderings: options?.orderings,
      lang: options?.lang,
      ref: options?.ref,
      fetchLinks: options?.fetchLinks
    });
  }

  async getDocumentsByTags(
    tags: string[],
    options?: {
      pageSize?: number;
      page?: number;
      orderings?: string;
      lang?: string;
      ref?: string;
    }
  ): Promise<PrismicQueryResponse> {
    let predicates = [`[:d = at(document.tags, [${tags.map(t => `"${t}"`).join(',')}])]`];
    return this.queryDocuments({
      predicates,
      pageSize: options?.pageSize,
      page: options?.page,
      orderings: options?.orderings,
      lang: options?.lang,
      ref: options?.ref
    });
  }
}
