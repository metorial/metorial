import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord
} from 'slates';

export interface ODataQueryOptions {
  filter?: string;
  select?: string;
  expand?: string;
  orderby?: string;
  top?: number;
  skip?: number;
  nextLink?: string;
}

let baseUrl = 'https://www.21risk.com/odata/v5/';

let buildODataParams = (options?: ODataQueryOptions): Record<string, string | number> => {
  let params: Record<string, string | number> = {};
  if (!options) return params;
  for (let key of ['top', 'skip'] as const) {
    let value = options[key];
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) {
      throw createApiServiceError(`${key} must be a non-negative safe integer.`, {
        reason: 'invalid_pagination'
      });
    }
  }
  if (options.filter) params.$filter = options.filter;
  if (options.select) params.$select = options.select;
  if (options.expand) params.$expand = options.expand;
  if (options.orderby) params.$orderby = options.orderby;
  if (options.top !== undefined) params.$top = options.top;
  if (options.skip !== undefined) params.$skip = options.skip;
  return params;
};

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('A 21RISK API key is required.', {
        reason: 'missing_api_key'
      });
    }
    this.axios = createAxios({
      baseURL: baseUrl,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json'
      }
    });
  }

  private async get(path: string, options?: ODataQueryOptions) {
    let params = buildODataParams(options);
    let requestUrl = new URL(path.replace(/^\//, ''), baseUrl);
    if (options?.nextLink !== undefined) {
      if (Object.keys(params).length) {
        throw createApiServiceError('Use nextLink on its own, without other query options.', {
          reason: 'conflicting_pagination'
        });
      }
      let nextUrl: URL;
      try {
        nextUrl = new URL(options.nextLink, requestUrl);
      } catch {
        throw createApiServiceError('nextLink must be a URL returned by this collection.', {
          reason: 'invalid_next_link'
        });
      }
      if (
        nextUrl.origin !== requestUrl.origin ||
        nextUrl.pathname.toLowerCase() !== requestUrl.pathname.toLowerCase() ||
        nextUrl.username ||
        nextUrl.password ||
        nextUrl.hash ||
        !options.nextLink.trim()
      ) {
        throw createApiServiceError('nextLink must refer to the same 21RISK collection.', {
          reason: 'invalid_next_link'
        });
      }
      requestUrl = nextUrl;
    }

    try {
      let response = await this.axios.get<unknown>(requestUrl.toString(), { params });
      if (
        isApiErrorRecord(response.data) &&
        response.data.error !== undefined &&
        response.data.error !== null
      ) {
        throw buildApiServiceError(
          { response },
          {
            providerLabel: '21RISK',
            reason: 'api_error',
            operation: `read ${path}`,
            nestedKeys: ['error', 'errors', 'details', 'innererror', 'message'],
            detailKeys: ['message', 'detail', 'error', 'error_description', 'code', 'value']
          }
        );
      }
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: '21RISK',
        reason: 'api_error',
        operation: `read ${path}`,
        nestedKeys: ['error', 'errors', 'details', 'innererror', 'message'],
        detailKeys: ['message', 'detail', 'error', 'error_description', 'code', 'value'],
        extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
      });
    }
  }

  private async getCollection(path: string, options?: ODataQueryOptions) {
    let data = await this.get(path, options);
    let wrapped = isApiErrorRecord(data) && 'value' in data;
    let value = isApiErrorRecord(data) && wrapped ? data.value : data;
    // Keep the legacy bare-object response form without turning malformed OData envelopes into records.
    let records = Array.isArray(value)
      ? value
      : !wrapped && isApiErrorRecord(value)
        ? [value]
        : undefined;
    if (!records?.every(isApiErrorRecord)) {
      throw createApiServiceError(`21RISK returned an invalid collection for ${path}.`, {
        reason: 'invalid_response'
      });
    }
    let nextLink = isApiErrorRecord(data)
      ? (data['@odata.nextLink'] ?? data['@nextLink'])
      : undefined;
    let totalCount = isApiErrorRecord(data)
      ? (data['@odata.count'] ?? data['@count'])
      : undefined;
    return {
      records,
      nextLink: typeof nextLink === 'string' && nextLink ? nextLink : undefined,
      totalCount:
        typeof totalCount === 'number' && Number.isSafeInteger(totalCount) && totalCount >= 0
          ? totalCount
          : undefined
    };
  }

  private async getEntity(path: string, id: string, options?: ODataQueryOptions) {
    if (!id.trim()) {
      throw createApiServiceError('A resource ID is required.', {
        reason: 'missing_resource_id'
      });
    }
    let data = await this.get(`${path}(${encodeURIComponent(id)})`, options);
    if (!isApiErrorRecord(data)) {
      throw createApiServiceError(`21RISK returned an invalid entity for ${path}.`, {
        reason: 'invalid_response'
      });
    }
    return data;
  }

  getOrganizations(options?: ODataQueryOptions) {
    return this.getCollection('/Organizations', options);
  }

  getSites(options?: ODataQueryOptions) {
    return this.getCollection('/Sites', options);
  }

  getSite(siteId: string, options?: ODataQueryOptions) {
    return this.getEntity('/Sites', siteId, options);
  }

  getAudits(options?: ODataQueryOptions) {
    return this.getCollection('/Audits', options);
  }

  getAudit(auditId: string, options?: ODataQueryOptions) {
    return this.getEntity('/Audits', auditId, options);
  }

  getRiskModels(options?: ODataQueryOptions) {
    return this.getCollection('/RiskModels', options);
  }

  getRiskModel(riskModelId: string, options?: ODataQueryOptions) {
    return this.getEntity('/RiskModels', riskModelId, options);
  }

  getCategories(options?: ODataQueryOptions) {
    return this.getCollection('/Categories', options);
  }

  getActions(options?: ODataQueryOptions) {
    return this.getCollection('/Actions', options);
  }

  getAction(actionId: string, options?: ODataQueryOptions) {
    return this.getEntity('/Actions', actionId, options);
  }

  getCompliance(options?: ODataQueryOptions) {
    return this.getCollection('/Compliance', options);
  }

  getMembers(options?: ODataQueryOptions) {
    return this.getCollection('/Members', options);
  }

  getPropertyInsuranceItems(options?: ODataQueryOptions) {
    return this.getCollection('/PropertyInsuranceItems', options);
  }

  getItemsPerMonth(options?: ODataQueryOptions) {
    return this.getCollection('/ItemsPerMonth', options);
  }

  getCope(options?: ODataQueryOptions) {
    return this.getCollection('/Cope', options);
  }

  getReports(options?: ODataQueryOptions) {
    return this.getCollection('/Reports', options);
  }
}
