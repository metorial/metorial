import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  extractApiErrorMessage,
  getApiErrorResponseWithBody,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { z } from 'zod';
import {
  articleResponse,
  companyResponse,
  journalistResponse,
  limitsResponse,
  personResponse,
  sourceResponse,
  storyResponse,
  topicResponse,
  wikipediaResponse
} from './responses';

let searchResponse = <T extends z.ZodType>(item: T) =>
  z
    .object({ status: z.number(), numResults: z.number(), results: z.array(item) })
    .passthrough();
let articlesResponse = z
  .object({
    status: z.number(),
    numResults: z.number(),
    articles: z.array(articleResponse)
  })
  .passthrough();
let topicsResponse = z
  .object({ total: z.number(), data: z.array(topicResponse) })
  .passthrough();

type SearchParams = Record<string, string | number | boolean | string[] | undefined>;

export class PerigonClient {
  private axios;

  constructor(private token: string) {
    if (!token.trim()) {
      throw createApiServiceError('Enter a Perigon API key to connect.', {
        reason: 'missing_api_key'
      });
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.perigon.io/v1',
      authHeader: { value: `Bearer ${token}` },
      timeout: 30000,
      // Inspect the provider body before translating an HTTP failure.
      validateStatus: () => true,
      paramsSerializer: { indexes: null }
    });
  }

  private async request<T>(
    path: string,
    schema: z.ZodType<T>,
    params: SearchParams = {}
  ): Promise<T> {
    let response: { status: number; data: unknown };
    try {
      response = await this.axios.get(path, { params: pickDefined(params) });
    } catch (error) {
      let upstream = getApiErrorResponseWithBody(error);
      throw this.apiError(
        upstream?.status,
        extractApiErrorMessage(error, { response: upstream })
      );
    }

    let bodyStatus =
      isApiErrorRecord(response.data) && typeof response.data.status === 'number'
        ? response.data.status
        : undefined;
    if (response.status >= 400 || (bodyStatus !== undefined && bodyStatus >= 400)) {
      throw this.apiError(
        response.status >= 400 ? response.status : bodyStatus,
        extractApiErrorMessage({ response: { data: response.data } })
      );
    }

    let parsed = schema.safeParse(response.data);
    if (!parsed.success) {
      throw createApiServiceError(
        'Perigon returned an invalid response. Try the request again or contact Perigon support.',
        {
          reason: 'invalid_response',
          upstreamStatus: response.status
        }
      );
    }
    return parsed.data;
  }

  private apiError(status: number | string | undefined, message: string) {
    let safeMessage = message
      .replaceAll(this.token, '[REDACTED]')
      .replaceAll(encodeURIComponent(this.token), '[REDACTED]')
      .replace(/Bearer\s+[^\s"'<>]+/gi, 'Bearer [REDACTED]');
    return buildApiServiceError(
      { response: { status, data: { message: safeMessage } } },
      {
        providerLabel: 'Perigon',
        reason: 'perigon_api_error',
        operation: 'request'
      }
    );
  }

  searchArticles(params: SearchParams) {
    return this.request('/articles/all', articlesResponse, params);
  }

  searchStories(params: SearchParams) {
    return this.request('/stories/all', searchResponse(storyResponse), params);
  }

  searchPeople(params: SearchParams) {
    return this.request('/people/all', searchResponse(personResponse), params);
  }

  searchCompanies(params: SearchParams) {
    return this.request('/companies/all', searchResponse(companyResponse), params);
  }

  searchJournalists(params: SearchParams) {
    return this.request('/journalists/all', searchResponse(journalistResponse), params);
  }

  getJournalistById(journalistId: string) {
    if (!journalistId.trim()) {
      throw createApiServiceError(
        'Provide a journalist ID from Search Articles or Search Journalists.',
        { reason: 'invalid_journalist_id' }
      );
    }
    return this.request(
      `/journalists/${encodeURIComponent(journalistId)}`,
      journalistResponse
    );
  }

  searchSources(params: SearchParams) {
    return this.request('/sources/all', searchResponse(sourceResponse), params);
  }

  searchTopics(params: SearchParams) {
    return this.request('/topics/all', topicsResponse, params);
  }

  searchWikipedia(params: SearchParams) {
    return this.request('/wikipedia/all', searchResponse(wikipediaResponse), params);
  }

  getAccountUsage() {
    return this.request('/limits', limitsResponse);
  }
}
