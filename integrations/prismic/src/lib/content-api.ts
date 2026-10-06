import { z } from 'zod';
import {
  exactId,
  inconsistent,
  integer,
  invalid,
  parse,
  protect,
  validText
} from './contracts';
import { PrismicTransport } from './transport';

export interface ContentApiConfig {
  repositoryName: string;
  accessToken?: string;
  protectedTokens?: string[];
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
  forms: Record<string, unknown>;
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
  linked_documents: unknown[];
  lang: string;
  alternate_languages: { id: string; uid: string | null; type: string; lang: string }[];
  data: Record<string, unknown>;
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

const documentSchema = z
  .object({
    id: z.string().min(1),
    uid: z.string().nullable(),
    url: z.string().nullable(),
    type: z.string(),
    href: z.string(),
    tags: z.array(z.string()),
    first_publication_date: z.string(),
    last_publication_date: z.string(),
    slugs: z.array(z.string()),
    linked_documents: z.array(z.unknown()).default([]),
    lang: z.string(),
    alternate_languages: z.array(
      z
        .object({
          id: z.string(),
          uid: z.string().nullable(),
          type: z.string(),
          lang: z.string()
        })
        .passthrough()
    ),
    data: z.record(z.string(), z.unknown())
  })
  .passthrough();
const querySchema = z
  .object({
    page: z.number().int().positive(),
    results_per_page: z.number().int().nonnegative(),
    results_size: z.number().int().nonnegative(),
    total_results_size: z.number().int().nonnegative(),
    total_pages: z.number().int().nonnegative(),
    next_page: z.string().nullable(),
    prev_page: z.string().nullable(),
    results: z.array(documentSchema)
  })
  .passthrough();
export const predicateString = (value: string) => JSON.stringify(validText(value));
export class ContentApiClient {
  private readonly transport: PrismicTransport;
  private readonly accessToken?: string;
  constructor(config: ContentApiConfig) {
    this.accessToken = config.accessToken;
    this.transport = new PrismicTransport(
      config,
      `https://${config.repositoryName}.cdn.prismic.io/api/v2`
    );
    this.transport.credentials.push(...(config.accessToken ? [config.accessToken] : []));
  }
  private params(extra: Record<string, unknown> = {}) {
    return { ...extra, ...(this.accessToken ? { access_token: this.accessToken } : {}) };
  }
  private cleanApiUrl(value: string): string {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return inconsistent();
    }
    if (
      url.protocol !== 'https:' ||
      url.host !== `${this.transport.repositoryName}.cdn.prismic.io` ||
      url.pathname !== '/api/v2/documents/search' ||
      url.username ||
      url.password
    )
      return inconsistent();
    const supplied = url.searchParams.getAll('access_token');
    if (supplied.length && (supplied.length !== 1 || supplied[0] !== this.accessToken))
      return inconsistent();
    url.searchParams.delete('access_token');
    protect(url.toString(), this.transport.credentials);
    return url.toString();
  }
  async getApiMetadata(): Promise<PrismicApiResponse> {
    const response = await this.transport.request('GET', '', { params: this.params() });
    this.transport.check(response.data);
    const metadata = parse(
      z
        .object({
          refs: z.array(
            z
              .object({
                id: z.string(),
                ref: z.string().min(1),
                label: z.string(),
                isMasterRef: z.boolean().optional(),
                scheduledAt: z
                  .union([z.string(), z.number().min(-8640000000000000).max(8640000000000000)])
                  .optional()
              })
              .passthrough()
          ),
          types: z.record(z.string(), z.string()),
          tags: z.array(z.string()),
          languages: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()),
          bookmarks: z.record(z.string(), z.string()).default({}),
          forms: z.record(z.string(), z.unknown()).default({}),
          oauth_initiate: z.string().default(''),
          oauth_token: z.string().default('')
        })
        .passthrough(),
      response.data
    );
    return {
      ...metadata,
      refs: metadata.refs.map(ref => ({
        ...ref,
        scheduledAt:
          typeof ref.scheduledAt === 'number'
            ? new Date(ref.scheduledAt).toISOString()
            : ref.scheduledAt
      }))
    };
  }
  async getMasterRef(): Promise<string> {
    const metadata = await this.getApiMetadata();
    const refs = metadata.refs.filter(ref => ref.isMasterRef);
    return refs.length === 1 ? refs[0]!.ref : inconsistent();
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
    protect(options, this.transport.credentials);
    integer(options.pageSize, 1, 100, 'pageSize');
    integer(options.page, 1, Number.MAX_SAFE_INTEGER, 'page');
    if (options.page !== undefined && options.after !== undefined)
      invalid('Provide page or after, not both pagination modes.');
    if (options.after !== undefined) exactId(options.after);
    if (options.query !== undefined && options.predicates?.length)
      invalid('Provide query or predicates, not both.');
    const params: Record<string, unknown> = {
      ref:
        options.ref === undefined ? await this.getMasterRef() : validText(options.ref, 'ref')
    };
    if (options.predicates?.length)
      params.q = `[${options.predicates
        .map(value => {
          validText(value, 'predicate');
          return value.startsWith('[:d = ') ? `[${value.slice(6)}` : value;
        })
        .join('')}]`;
    else if (options.query !== undefined) params.q = validText(options.query, 'query');
    for (const name of [
      'pageSize',
      'page',
      'orderings',
      'after',
      'lang',
      'fetchLinks',
      'graphQuery'
    ] as const)
      if (options[name] !== undefined) params[name] = options[name];
    const response = await this.transport.request('GET', '/documents/search', {
      params: this.params(params)
    });
    const result = parse(querySchema, response.data);
    const sanitized = {
      ...result,
      next_page: result.next_page === null ? null : this.cleanApiUrl(result.next_page),
      prev_page: result.prev_page === null ? null : this.cleanApiUrl(result.prev_page),
      results: result.results.map(document => ({
        ...document,
        href: this.cleanApiUrl(document.href)
      }))
    };
    this.transport.check(sanitized);
    if (
      sanitized.results_size !== sanitized.results.length ||
      sanitized.results.length > sanitized.results_per_page ||
      sanitized.results.length > sanitized.total_results_size ||
      (options.pageSize !== undefined &&
        (sanitized.results.length > options.pageSize ||
          sanitized.results_per_page !== options.pageSize)) ||
      (options.page !== undefined && sanitized.page !== options.page) ||
      new Set(sanitized.results.map(document => document.id)).size !== sanitized.results.length
    )
      inconsistent();
    return sanitized;
  }
  async getDocumentById(
    documentId: string,
    options?: { ref?: string; lang?: string; fetchLinks?: string; graphQuery?: string }
  ): Promise<PrismicDocument | null> {
    exactId(documentId);
    const result = await this.queryDocuments({
      predicates: [`[at(document.id, ${predicateString(documentId)})]`],
      ...options
    });
    if (!result.results.length) return null;
    if (result.results.length !== 1 || result.results[0]!.id !== documentId) inconsistent();
    return result.results[0]!;
  }
  async getDocumentByUid(
    type: string,
    uid: string,
    options?: { ref?: string; lang?: string; fetchLinks?: string; graphQuery?: string }
  ): Promise<PrismicDocument | null> {
    if (!/^[a-z][a-z0-9_-]*$/.test(type))
      invalid('Provide the custom type API ID returned by Get Repository Info.');
    const result = await this.queryDocuments({
      predicates: [`[at(my.${type}.uid, ${predicateString(uid)})]`],
      ...options
    });
    if (!result.results.length) return null;
    if (
      result.results.length !== 1 ||
      result.results[0]!.type !== type ||
      result.results[0]!.uid !== uid
    )
      invalid(
        'UID lookup must identify exactly one document; provide its language or use documentId.'
      );
    return result.results[0]!;
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
    return this.queryDocuments({
      predicates: [`[at(document.type, ${predicateString(type)})]`],
      ...options
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
    return this.queryDocuments({
      predicates: [`[at(document.tags, ${JSON.stringify(tags.map(tag => validText(tag)))})]`],
      ...options
    });
  }
}
