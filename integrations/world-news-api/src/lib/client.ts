import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  getResponseHeaderValue
} from 'slates';
import { z } from 'zod';
import { assertPublicData, redactPublicData, validateWebsiteUrl } from './privacy';

export interface SearchNewsParams {
  text?: string;
  textMatchIndexes?: string;
  sourceCountry?: string;
  language?: string;
  minSentiment?: number;
  maxSentiment?: number;
  earliestPublishDate?: string;
  latestPublishDate?: string;
  newsSources?: string;
  authors?: string;
  categories?: string;
  entities?: string;
  locationFilter?: string;
  sort?: string;
  sortDirection?: string;
  offset?: number;
  number?: number;
}

let articleSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  text: z.string(),
  summary: z.string(),
  url: z.string(),
  image: z.string().nullable(),
  video: z.string().nullable(),
  publish_date: z.string(),
  authors: z.array(z.string()),
  category: z.string().nullable(),
  language: z.string(),
  source_country: z.string(),
  sentiment: z.number().nullable()
});

let topArticleSchema = articleSchema.pick({ id: true, title: true, url: true }).extend({
  text: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  publish_date: z.string().nullable().optional(),
  authors: z.array(z.string()).optional(),
  sentiment: z.number().nullable().optional()
});

let extractSchema = z.object({
  title: z.string(),
  text: z.string(),
  url: z.string(),
  image: z.string().nullable(),
  images: z.array(
    z.object({
      url: z.string(),
      width: z.number().nullable(),
      height: z.number().nullable(),
      caption: z.string().nullable().optional(),
      title: z.string().nullable().optional()
    })
  ),
  video: z.string().nullable(),
  videos: z.array(
    z.object({
      url: z.string(),
      summary: z.string().nullable(),
      duration: z.number().nullable(),
      thumbnail: z.string().nullable()
    })
  ),
  publish_date: z.string(),
  authors: z.array(z.string()),
  language: z.string(),
  source_country: z.string().optional(),
  sentiment: z.number().nullable().optional()
});

export let quotaSchema = z.object({
  requestPoints: z.number().optional().describe('Points used by this API request'),
  usedToday: z.number().optional().describe('Points used today; resets at midnight UTC'),
  remainingToday: z.number().optional().describe('Points remaining today')
});

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private token: string;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Provide your World News API key.');
    }
    this.token = config.token;
    this.axios = createAxios({
      baseURL: 'https://api.worldnewsapi.com',
      headers: { 'x-api-key': config.token }
    });
  }

  private async get<T extends Record<string, unknown>>(
    path: string,
    params: Record<string, unknown>,
    schema: z.ZodType<T>
  ) {
    let response: Awaited<ReturnType<typeof this.axios.get<unknown>>>;
    try {
      response = await this.axios.get<unknown>(path, { params });
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw buildApiServiceError(error, {
        providerLabel: 'World News API',
        reason: 'world_news_api_error',
        extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
        extractUpstreamCode: (input, response, helpers) => {
          let body = helpers.isRecord(response?.data) ? response.data : undefined;
          let nestedError = helpers.isRecord(body?.error) ? body.error : undefined;
          let data =
            helpers.isRecord(input) && helpers.isRecord(input.data) ? input.data : undefined;
          let upstream = helpers.isRecord(data?.upstream) ? data.upstream : undefined;
          let code = [body?.code, body?.error_code, nestedError?.code, upstream?.code].find(
            value =>
              (typeof value === 'string' && value.trim() !== '') ||
              (typeof value === 'number' && Number.isFinite(value))
          );
          if (code === undefined) return undefined;
          return String(redactPublicData(String(code), this.token));
        },
        // HTTP clients can retain request headers in the original error.
        parent: {},
        formatMessage: parts => {
          let safe = redactPublicData(`${parts.statusLabel}${parts.message}`, this.token);
          return `World News API request failed: ${safe}`;
        }
      });
    }

    let parsed = schema.safeParse(response.data);
    if (!parsed.success) {
      throw createApiServiceError(
        'World News API returned an invalid response. Required article or response data is missing or has an unexpected type.',
        { reason: 'invalid_provider_response' }
      );
    }
    assertPublicData(parsed.data, this.token);
    let quota: z.infer<typeof quotaSchema> = {};
    for (let [key, header] of [
      ['requestPoints', 'X-API-Quota-Request'],
      ['usedToday', 'X-API-Quota-Used'],
      ['remainingToday', 'X-API-Quota-Left']
    ] as const) {
      let value = getResponseHeaderValue(response.headers, header);
      if (value !== undefined && value.trim() !== '' && Number.isFinite(Number(value))) {
        quota[key] = Number(value);
      }
    }
    return {
      ...parsed.data,
      raw: redactPublicData(response.data, this.token),
      ...(Object.keys(quota).length ? { quota } : {})
    };
  }

  async searchNews(params: SearchNewsParams) {
    let filters = [
      params.text,
      params.sourceCountry,
      params.language,
      params.minSentiment,
      params.maxSentiment,
      params.earliestPublishDate,
      params.latestPublishDate,
      params.newsSources,
      params.authors,
      params.categories,
      params.entities,
      params.locationFilter
    ];
    if (!filters.some(value => value !== undefined && value !== '')) {
      throw createApiServiceError(
        'Provide at least one news search filter, such as text or language.'
      );
    }
    for (let [name, value] of [
      ['offset', params.offset],
      ['maxResults', params.number]
    ] as const) {
      if (value !== undefined && !Number.isInteger(value)) {
        throw createApiServiceError(`${name} must be a whole number.`);
      }
    }
    if (
      params.minSentiment !== undefined &&
      params.maxSentiment !== undefined &&
      params.minSentiment > params.maxSentiment
    ) {
      throw createApiServiceError('minSentiment must not exceed maxSentiment.');
    }
    let queryParams = Object.fromEntries(
      Object.entries({
        text: params.text,
        'text-match-indexes': params.textMatchIndexes,
        'source-country': params.sourceCountry,
        language: params.language,
        'min-sentiment': params.minSentiment,
        'max-sentiment': params.maxSentiment,
        'earliest-publish-date': params.earliestPublishDate,
        'latest-publish-date': params.latestPublishDate,
        'news-sources': params.newsSources,
        authors: params.authors,
        categories: params.categories,
        entities: params.entities,
        'location-filter': params.locationFilter,
        sort: params.sort,
        'sort-direction': params.sortDirection,
        offset: params.offset,
        number: params.number
      }).filter(([, value]) => value !== undefined)
    );
    return this.get(
      '/search-news',
      queryParams,
      z.object({
        offset: z.number().int(),
        number: z.number().int(),
        available: z.number().int(),
        news: z.array(articleSchema)
      })
    );
  }

  async getTopNews(params: {
    sourceCountry: string;
    language: string;
    date?: string;
    headlinesOnly?: boolean;
    maxNewsPerCluster?: number;
  }) {
    if (
      params.maxNewsPerCluster !== undefined &&
      !Number.isInteger(params.maxNewsPerCluster)
    ) {
      throw createApiServiceError('maxArticlesPerCluster must be a whole number.');
    }
    let result = await this.get(
      '/top-news',
      {
        'source-country': params.sourceCountry,
        language: params.language,
        date: params.date,
        'headlines-only': params.headlinesOnly
      },
      z.object({
        top_news: z.array(z.object({ news: z.array(topArticleSchema) })),
        language: z.string(),
        country: z.string()
      })
    );
    // The documented API has no per-cluster limit parameter.
    if (params.maxNewsPerCluster !== undefined) {
      result.top_news = result.top_news.map(cluster => ({
        news: cluster.news.slice(0, params.maxNewsPerCluster)
      }));
    }
    return result;
  }

  async retrieveNews(ids: number[]) {
    if (!ids.every(Number.isInteger)) {
      throw createApiServiceError('Article IDs must be whole numbers.');
    }
    return this.get(
      '/retrieve-news',
      { ids: ids.join(',') },
      z.object({ news: z.array(articleSchema) })
    );
  }

  async extractNews(params: { url: string; analyze?: boolean }) {
    validateWebsiteUrl(params.url, this.token);
    return this.get('/extract-news', params, extractSchema);
  }

  async extractNewsLinks(params: { url: string; prefix?: string; subDomain?: boolean }) {
    validateWebsiteUrl(params.url, this.token);
    let result = await this.get(
      '/extract-news-links',
      { url: params.url },
      z.object({
        news_links: z.array(z.string())
      })
    );
    // Apply the established optional filters locally rather than sending undocumented parameters.
    result.news_links = result.news_links.filter(link => {
      if (params.prefix !== undefined && !link.startsWith(params.prefix)) return false;
      if (params.subDomain === false) {
        try {
          return new URL(link).hostname === new URL(params.url).hostname;
        } catch {
          throw createApiServiceError('World News API returned an invalid article link.');
        }
      }
      return true;
    });
    return result;
  }

  async searchNewsSources(name: string) {
    return this.get(
      '/search-news-sources',
      { name },
      z.object({
        available: z.number().int(),
        sources: z.array(z.object({ url: z.string(), name: z.string(), language: z.string() }))
      })
    );
  }

  async getGeoCoordinates(location: string) {
    return this.get(
      '/geo-coordinates',
      { location },
      z.object({
        latitude: z.number(),
        longitude: z.number(),
        city: z.string().nullable()
      })
    );
  }

  async retrieveFrontPage(params: {
    sourceCountry?: string;
    sourceName?: string;
    date?: string;
  }) {
    return this.get(
      '/retrieve-front-page',
      {
        'source-country': params.sourceCountry,
        'source-name': params.sourceName,
        date: params.date
      },
      z.object({
        front_page: z.object({
          name: z.string(),
          date: z.string(),
          language: z.string(),
          country: z.string(),
          image: z.string()
        })
      })
    );
  }
}
