import { ServiceError } from '@lowerdeck/error';
import { createApiServiceError, createAuthenticatedAxios, requestAxios } from 'slates';
import {
  apiKey,
  integer,
  type Params,
  requireValue,
  safeJson,
  searchId,
  string,
  upstream,
  validateCollections
} from './contracts';

export class SerpApiClient {
  private readonly key: string;
  private readonly accountId?: string;
  constructor(opts: { apiKey: string; accountId?: string }) {
    this.key = apiKey(opts.apiKey);
    this.accountId =
      opts.accountId === undefined ? undefined : string(opts.accountId, 'Account ID');
  }
  private async get(path: string, params: Params, owner = false) {
    const client = createAuthenticatedAxios({
      baseURL: 'https://serpapi.com',
      contentType: false,
      timeout: 60000,
      maxRedirects: 0,
      maxContentLength: 8 * 1024 * 1024,
      maxBodyLength: 8 * 1024 * 1024
    });
    const response = await requestAxios('read', () => client.get(path, { params }), upstream);
    try {
      safeJson(
        {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(Object.entries(response.headers))
        },
        this.key
      );
      const data = response.data;
      if (owner) {
        requireValue(
          data && typeof data === 'object' && !Array.isArray(data),
          'SerpApi returned an invalid account envelope.'
        );
        requireValue(
          data.api_key === this.key,
          'SerpApi account response is not bound to the supplied API key.'
        );
        const id = string(data.account_id, 'Native account ID');
        requireValue(
          !this.accountId || this.accountId === id,
          'SerpApi account identity changed; reconnect before continuing.'
        );
        const { api_key: _verifiedKey, ...publicAccount } = data;
        safeJson(publicAccount, this.key);
        return publicAccount;
      }
      safeJson(data, this.key);
      return data;
    } catch (error) {
      if (
        error instanceof ServiceError &&
        path !== '/account.json' &&
        path !== '/locations.json'
      ) {
        const id = response.data?.search_metadata?.id;
        try {
          searchId(id);
          safeJson(id, this.key);
          error.data.searchId = id;
        } catch {
          /* Only a safe native ID may help reconcile an uncertain paid result. */
        }
        error.data.outcomeUncertain = true;
      }
      throw error;
    }
  }
  private receipt(data: any, expected?: { engine?: string; id?: string }) {
    try {
      requireValue(
        data && typeof data === 'object' && !Array.isArray(data),
        'SerpApi returned an invalid search envelope.'
      );
      const id = data.search_metadata?.id;
      if (id !== undefined) searchId(id);
      requireValue(
        !expected?.id || id === expected.id,
        'SerpApi archive response does not match the requested search ID.'
      );
      if (expected?.id && data.search_metadata?.status === 'Error') return data;
      if (data.error || data.search_metadata?.status === 'Error') {
        const error = createApiServiceError(
          'SerpApi reported a failed search. Check native parameters and account quota; search history or charges may remain. Do not blindly resubmit.',
          { reason: 'serpapi_search_failed' }
        );
        if (id) error.data.searchId = id;
        error.data.searchStatus = 'Error';
        throw error;
      }
      requireValue(
        id && ['Queued', 'Processing', 'Success'].includes(data.search_metadata?.status),
        'SerpApi returned no valid native search ID/status. The search outcome and billing may be uncertain; inspect account history before retrying.'
      );
      requireValue(
        !expected?.engine ||
          !data.search_parameters?.engine ||
          data.search_parameters.engine === expected.engine,
        'SerpApi returned results for a different engine.'
      );
      if (!expected?.id) validateCollections(data);
      return data;
    } catch (error) {
      if (error instanceof ServiceError) {
        try {
          const id = searchId(expected?.id ?? data?.search_metadata?.id);
          safeJson(id, this.key);
          error.data.searchId = id;
        } catch {
          // Only a screened exact ID can help reconcile the retained search.
        }
        if (error.data.searchStatus !== 'Error') error.data.outcomeUncertain = true;
        error.data.reconciliation =
          'Inspect the exact search ID and retained account history before retrying. Do not resubmit a paid query to check its outcome.';
      }
      throw error;
    }
  }

  async search(params: Params): Promise<any> {
    requireValue(
      params.async !== true || params.no_cache !== true,
      'async and noCache cannot both be true. Accounts with Ludicrous Speed cannot use async.'
    );
    safeJson(params, this.key);
    return this.receipt(await this.get('/search.json', { ...params, api_key: this.key }), {
      engine: String(params.engine)
    });
  }
  async getSearch(id: string): Promise<any> {
    const exact = searchId(id);
    return this.receipt(await this.get(`/searches/${exact}.json`, { api_key: this.key }), {
      id: exact
    });
  }
  async getAccount(): Promise<any> {
    return this.get('/account.json', { api_key: this.key }, true);
  }
  async getLocations(query?: string, limit?: number): Promise<any[]> {
    const data = await this.get('/locations.json', {
      ...(query === undefined ? {} : { q: string(query, 'Location query') }),
      ...(limit === undefined ? {} : { limit: integer(limit, 'Location limit', 1, 10) })
    });
    requireValue(
      Array.isArray(data) &&
        data.every(row => row && typeof row === 'object' && !Array.isArray(row)),
      'SerpApi returned an invalid locations collection.'
    );
    return data;
  }
}

export function receiptOutput(data: any) {
  return {
    searchMetadata: {
      searchId: data.search_metadata.id,
      status: data.search_metadata.status,
      totalResults: data.search_information?.total_results,
      timeTaken: data.search_metadata.total_time_taken
    },
    isComplete: data.search_metadata.status === 'Success',
    pagination: data.serpapi_pagination
  };
}
export function receiptMessage(data: any, completed: string) {
  return data.search_metadata.status === 'Success'
    ? completed
    : `Search ${data.search_metadata.id} is ${data.search_metadata.status}. Results are not complete. Use Get Search with this exact ID; do not resubmit the paid query to check status.`;
}
