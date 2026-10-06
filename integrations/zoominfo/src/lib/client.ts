import { isIP } from 'node:net';
import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export type ApiVersion = 'new' | 'legacy';
export type JsonObject = Record<string, unknown>;
export type ZoomInfoResponse = JsonObject;
export interface ZoomInfoClientConfig {
  token: string;
  apiVersion?: ApiVersion;
}
export const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'zoominfo_validation' });
export const object = (value: unknown, label = 'response'): JsonObject => {
  if (!isApiErrorRecord(value)) throw invalid(`ZoomInfo returned an invalid ${label} object.`);
  return value;
};
export const records = (response: ZoomInfoResponse): JsonObject[] => {
  const value = response.data ?? response.result;
  if (!Array.isArray(value) || !value.every(isApiErrorRecord))
    throw invalid('ZoomInfo returned an invalid record collection.');
  return value;
};
export const matchedCount = (response: ZoomInfoResponse, entity?: 'contact') =>
  records(response).filter(record => {
    const meta = isApiErrorRecord(record.meta) ? record.meta : undefined;
    return (
      record.type !== 'NoMatch' &&
      !(
        entity === 'contact' &&
        ['COMPANY_ONLY_MATCH', 'COMPANY_MATCH_ONLY'].includes(String(meta?.matchStatus))
      ) &&
      (!meta?.matchStatus ||
        [
          'FULL_MATCH',
          'CONTACT_MATCH_ONLY',
          'COMPANY_MATCH_ONLY',
          'CONTACT_ONLY_MATCH',
          'COMPANY_ONLY_MATCH'
        ].includes(String(meta.matchStatus)))
    );
  }).length;
export const pagination = (response: ZoomInfoResponse) => {
  const meta = isApiErrorRecord(response.meta) ? response.meta : undefined;
  const page = isApiErrorRecord(meta?.page) ? meta.page : undefined;
  const count = (value: unknown) =>
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
  return {
    totalResults: count(meta?.totalResults ?? response.totalResults),
    currentPage: count(page?.number ?? response.currentPage),
    totalPages: count(page?.total ?? response.totalPages)
  };
};
export const apiVersion = (
  auth: { apiVersion?: ApiVersion },
  config?: { apiVersion?: ApiVersion }
): ApiVersion => auth.apiVersion ?? config?.apiVersion ?? 'legacy';
export const safeError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'ZoomInfo',
    reason: 'zoominfo_api_error',
    parent: {},
    extractResponse: (error, helpers) => {
      const response = helpers.getResponse(error);
      return {
        status:
          typeof response?.status === 'number' && Number.isInteger(response.status)
            ? response.status
            : undefined
      };
    },
    formatMessage: ({ status, message }) =>
      `ZoomInfo request failed${typeof status === 'number' ? ` (HTTP ${status})` : ''}: ${message}`,
    extractMessage: () =>
      'The request was rejected or could not be completed. Check access, input values, entitlements, and request limits.'
  });
const secretKeys =
  /^(?:access_?token|refresh_?token|id_?token|token|jwt|authorization|password|private_?key|client_?secret|api_?key)$/i;
const safeJson = (value: unknown, token: string, depth = 0): unknown => {
  if (depth > 30)
    throw invalid('ZoomInfo returned a response nested beyond the supported depth.');
  if (typeof value === 'string')
    return value.includes(token) ? value.split(token).join('[redacted]') : value;
  if (Array.isArray(value)) return value.map(item => safeJson(item, token, depth + 1));
  if (!isApiErrorRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !secretKeys.test(key))
      .map(([key, item]) => [key, safeJson(item, token, depth + 1)])
  );
};
const integer = (
  value: unknown,
  label: string,
  min: number,
  max = Number.MAX_SAFE_INTEGER
): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
    throw invalid(`${label} must be a whole number between ${min} and ${max}.`);
  return value;
};
const nonempty = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !value.trim()) throw invalid(`${label} must not be empty.`);
  return value;
};
const values = (value: unknown, label: string, max = 25) => {
  if (!Array.isArray(value) || value.length < 1 || value.length > max)
    throw invalid(`${label} must contain between 1 and ${max} entries.`);
  return value;
};
const companyCriteria = (params: JsonObject) => {
  if (params.companyId !== undefined) integer(params.companyId, 'companyId', 1);
  for (const field of ['companyName', 'companyWebsite'])
    if (params[field] !== undefined) nonempty(params[field], field);
  if (params.companyId === undefined && !params.companyName && !params.companyWebsite)
    throw invalid('Provide a companyId, companyName, or companyWebsite.');
  return params;
};
const date = (value: unknown, label: string) => {
  const text = nonempty(value, label),
    day = text;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !Number.isFinite(Date.parse(text)) ||
    new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day
  )
    throw invalid(
      `${label} must be a valid YYYY-MM-DD calendar date for the current API. Timestamp precision is not supported by this filter; legacy connections retain their original input.`
    );
  return day;
};

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  private token: string;
  readonly apiVersion: ApiVersion;
  constructor(config: ZoomInfoClientConfig) {
    if (
      typeof config.token !== 'string' ||
      !config.token.trim() ||
      /[\r\n]/.test(config.token)
    )
      throw invalid('A valid ZoomInfo token is required.');
    this.token = config.token;
    this.apiVersion = config.apiVersion ?? 'legacy';
    this.http = createAuthenticatedAxios({
      baseURL:
        this.apiVersion === 'new'
          ? 'https://api.zoominfo.com/gtm'
          : 'https://api.zoominfo.com',
      authHeader: { value: `Bearer ${config.token}` },
      contentType: this.apiVersion === 'new' ? 'application/vnd.api+json' : 'application/json',
      headers: {
        Accept: this.apiVersion === 'new' ? 'application/vnd.api+json' : 'application/json'
      },
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: safeError
    });
  }
  static fromContext(ctx: {
    auth: { token: string; apiVersion?: ApiVersion };
    config?: { apiVersion?: ApiVersion };
  }) {
    return new Client({ token: ctx.auth.token, apiVersion: apiVersion(ctx.auth, ctx.config) });
  }
  private async request(
    path: string,
    attributes?: JsonObject,
    type?: string,
    query?: JsonObject
  ): Promise<ZoomInfoResponse> {
    const response =
      attributes === undefined
        ? await this.http.get<unknown>(path, { params: query })
        : await this.http.post<unknown>(
            path,
            this.apiVersion === 'new' ? { data: { type, attributes } } : attributes,
            { params: query }
          );
    if (response.status !== 200)
      throw createApiServiceError('ZoomInfo returned an unexpected response status.', {
        reason: 'zoominfo_response',
        upstreamStatus: response.status
      });
    const envelope = object(safeJson(response.data, this.token));
    if (
      (Array.isArray(envelope.errors) && envelope.errors.length > 0) ||
      envelope.success === false
    )
      throw invalid('ZoomInfo reported a failed operation in its response.');
    if (this.apiVersion === 'new')
      for (const item of records(envelope)) {
        const expectedType = type?.replace(/(?:Search|Enrich)$/, '');
        const allowsNoMatch = [
          'ContactEnrich',
          'CompanyEnrich',
          'CorporateHierarchyEnrich'
        ].includes(type ?? '');
        if (
          typeof item.id !== 'string' ||
          !item.id ||
          typeof item.type !== 'string' ||
          !item.type ||
          (item.type !== 'NoMatch' && !isApiErrorRecord(item.attributes)) ||
          (expectedType !== undefined &&
            item.type !== expectedType &&
            !(allowsNoMatch && item.type === 'NoMatch')) ||
          (item.meta !== undefined && !isApiErrorRecord(item.meta))
        )
          throw invalid('ZoomInfo returned an invalid JSON:API resource.');
      }
    return envelope;
  }
  private paging(page?: number, pageSize?: number, sort?: string) {
    if (page !== undefined) integer(page, 'page', 1);
    if (pageSize !== undefined) integer(pageSize, 'pageSize', 1, 100);
    return this.apiVersion === 'new'
      ? { 'page[number]': page, 'page[size]': pageSize, sort }
      : { page: page ?? 1, rpp: pageSize ?? 25 };
  }
  private searchAttributes(params: JsonObject): JsonObject {
    const output: JsonObject = { ...params };
    if (this.apiVersion === 'legacy') {
      this.currentFieldsOnly(params, ['metroRegion', 'industryCodes']);
      return output;
    }
    if (output.city !== undefined)
      throw invalid(
        'The current ZoomInfo search API does not document a city filter. Use metroRegion from Lookup Data, state, or country; legacy connections retain city.'
      );
    for (const key of [
      'companyId',
      'contactAccuracyScoreMin',
      'employeeRangeMin',
      'employeeRangeMax'
    ])
      if (output[key] !== undefined)
        output[key] = String(integer(output[key], key, key === 'companyId' ? 1 : 0));
    for (const key of ['revenueMin', 'revenueMax'])
      if (output[key] !== undefined) integer(output[key], key, 0, 2147483647);
    for (const [min, max] of [
      ['revenueMin', 'revenueMax'],
      ['employeeRangeMin', 'employeeRangeMax']
    ])
      if (
        min &&
        max &&
        output[min] !== undefined &&
        output[max] !== undefined &&
        Number(output[min]) > Number(output[max])
      )
        throw invalid(`${min} must not exceed ${max}.`);
    if (output.industryKeywords !== undefined)
      output.industryKeywords = values(
        output.industryKeywords,
        'industryKeywords',
        Number.MAX_SAFE_INTEGER
      )
        .map(item => nonempty(item, 'industryKeywords'))
        .join(' OR ');
    if (typeof output.companyTicker === 'string')
      output.companyTicker = [output.companyTicker];
    const levels: Record<string, string> = {
      'c-level': 'C Level Exec',
      'vp-level': 'VP Level Exec'
    };
    if (typeof output.managementLevel === 'string')
      output.managementLevel = output.managementLevel
        .split(',')
        .map(value => levels[value.trim().toLowerCase()] ?? value.trim())
        .join(',');
    return output;
  }
  private async search(
    entity: 'contact' | 'company' | 'intent' | 'scoop' | 'news',
    params: JsonObject,
    page?: number,
    pageSize?: number,
    sort?: string
  ) {
    const paging = this.paging(page, pageSize, sort);
    if (this.apiVersion === 'legacy')
      return this.request(`/search/${entity}`, { ...params, ...paging });
    const plural =
      entity === 'company'
        ? 'companies'
        : entity === 'contact'
          ? 'contacts'
          : entity === 'scoop'
            ? 'scoops'
            : entity;
    return this.request(
      `/data/v1/${plural}/search`,
      params,
      `${entity[0]?.toUpperCase()}${entity.slice(1)}Search`,
      paging
    );
  }
  async searchContacts(params: JsonObject, page?: number, pageSize?: number, sort?: string) {
    return this.search('contact', this.searchAttributes(params), page, pageSize, sort);
  }
  async searchCompanies(params: JsonObject, page?: number, pageSize?: number, sort?: string) {
    return this.search('company', this.searchAttributes(params), page, pageSize, sort);
  }
  async enrichContacts(params: JsonObject, outputFields?: string[]) {
    if (this.apiVersion === 'legacy') {
      const input = values(
        params.personId ?? params.emailAddress ?? params.matchPersonInput,
        'contact matches'
      );
      for (const item of input) {
        if (params.matchPersonInput !== undefined) object(item, 'contact input');
        else nonempty(item, params.personId !== undefined ? 'personId' : 'emailAddress');
      }
      return this.request('/enrich/contact', {
        ...params,
        ...(outputFields ? { outputFields } : {})
      });
    }
    let input: JsonObject[];
    if (params.personId !== undefined)
      input = values(params.personId, 'personIds').map(value => {
        const text = nonempty(value, 'personId');
        if (!/^\d+$/.test(text))
          throw invalid('personIds must contain positive numeric identifiers.');
        return { personId: integer(Number(text), 'personId', 1) };
      });
    else if (params.emailAddress !== undefined)
      input = values(params.emailAddress, 'emailAddresses').map(value => ({
        emailAddress: nonempty(value, 'emailAddress')
      }));
    else
      input = values(params.matchPersonInput, 'contacts').map(value => {
        const contact = object(value, 'contact input');
        if (contact.companyId !== undefined) integer(contact.companyId, 'companyId', 1);
        if (
          !contact.emailAddress &&
          (!contact.firstName ||
            !contact.lastName ||
            (!contact.companyName && contact.companyId === undefined))
        )
          throw invalid(
            'Each contact needs an emailAddress or firstName, lastName, and companyName/companyId.'
          );
        return contact;
      });
    return this.request(
      '/data/v1/contacts/enrich',
      {
        matchPersonInput: input,
        outputFields:
          outputFields === undefined
            ? [
                'id',
                'firstName',
                'lastName',
                'email',
                'phone',
                'jobTitle',
                'companyName',
                'companyId'
              ]
            : values(outputFields, 'outputFields', Number.MAX_SAFE_INTEGER).map(field =>
                nonempty(field, 'outputField')
              )
      },
      'ContactEnrich'
    );
  }
  async enrichCompanies(params: JsonObject, outputFields?: string[]) {
    const field =
      params.companyId !== undefined
        ? 'companyId'
        : params.companyWebsite !== undefined
          ? 'companyWebsite'
          : 'companyName';
    const input = values(params[field], field).map(value => ({
      [field]: field === 'companyId' ? integer(value, 'companyId', 1) : nonempty(value, field)
    }));
    if (this.apiVersion === 'legacy')
      return this.request('/enrich/company', {
        ...params,
        ...(outputFields ? { outputFields } : {})
      });
    const fields =
      outputFields === undefined
        ? undefined
        : values(outputFields, 'outputFields', Number.MAX_SAFE_INTEGER)
            .map(field => nonempty(field, 'outputField'))
            .map(field => (field === 'companyName' ? 'name' : field));
    return this.request(
      '/data/v1/companies/enrich',
      {
        matchCompanyInput: input,
        outputFields: fields ?? [
          'id',
          'name',
          'website',
          'revenue',
          'employeeCount',
          'industries',
          'country',
          'state',
          'city'
        ]
      },
      'CompanyEnrich'
    );
  }
  private intentAttributes(params: JsonObject) {
    const {
      topicId,
      topicName,
      topics,
      audienceStrengthMin,
      audienceStrengthMinimum,
      ...other
    } = params;
    if (audienceStrengthMin !== undefined)
      throw invalid(
        'The current ZoomInfo API uses audience strength letters A–E. Use audienceStrengthMinimum; numeric audienceStrengthMin is retained for legacy connections.'
      );
    const selected = [
      ...(Array.isArray(topics) ? topics : []),
      ...(topicId ? [topicId] : []),
      ...(topicName ? [topicName] : [])
    ];
    const requested = values([...new Set(selected)], 'topics', 50).map(value =>
      nonempty(value, 'topic')
    );
    if (other.signalScoreMin !== undefined)
      integer(other.signalScoreMin, 'signalScoreMin', 60, 100);
    return {
      ...other,
      topics: requested,
      ...(audienceStrengthMinimum ? { audienceStrengthMin: audienceStrengthMinimum } : {})
    };
  }
  async searchIntent(params: JsonObject, page?: number, pageSize?: number) {
    if (this.apiVersion === 'legacy') {
      this.currentFieldsOnly(params, ['topics', 'audienceStrengthMinimum']);
      return this.search('intent', params, page, pageSize);
    }
    if (params.companyId !== undefined || params.companyName !== undefined)
      throw invalid(
        'The current Intent Search API does not accept companyId/companyName. Use Enrich Intent for a specific company; that operation can consume credits.'
      );
    return this.search('intent', this.intentAttributes(params), page, pageSize);
  }
  async enrichIntent(params: JsonObject) {
    const { page, pageSize, ...criteria } = params;
    companyCriteria(criteria);
    if (this.apiVersion === 'legacy') {
      this.currentFieldsOnly(params, ['topics', 'topicName', 'page', 'pageSize']);
      return this.request('/enrich/intent', criteria);
    }
    return this.request(
      '/data/v1/intent/enrich',
      this.intentAttributes(criteria),
      'IntentEnrich',
      this.paging(
        typeof page === 'number' ? page : undefined,
        typeof pageSize === 'number' ? pageSize : undefined
      )
    );
  }
  async searchScoops(params: JsonObject, page?: number, pageSize?: number) {
    if (this.apiVersion === 'legacy') return this.search('scoop', params, page, pageSize);
    const { keywords, publishedDateAfter, ...criteria } = params;
    if (criteria.companyId !== undefined)
      criteria.companyId = String(integer(criteria.companyId, 'companyId', 1));
    if (keywords !== undefined)
      criteria.description = values(keywords, 'keywords', Number.MAX_SAFE_INTEGER)
        .map(value => nonempty(value, 'keyword'))
        .join(' ');
    if (publishedDateAfter !== undefined)
      criteria.publishedStartDate = date(publishedDateAfter, 'publishedDateAfter');
    return this.search('scoop', criteria, page, pageSize);
  }
  private async resolveCompany(params: JsonObject): Promise<number> {
    if (
      params.companyId !== undefined &&
      params.companyName === undefined &&
      params.companyWebsite === undefined
    )
      return integer(params.companyId, 'companyId', 1);
    companyCriteria(params);
    const result = await this.searchCompanies(params, 1, 100),
      data = records(result),
      total = pagination(result).totalResults;
    if (
      total === undefined ||
      total !== data.length ||
      (pagination(result).totalPages ?? 1) > 1
    )
      throw invalid(
        'Company lookup is not complete enough to prove an exact match. Supply companyId from Search Companies.'
      );
    const domain = (value: unknown) => {
      if (typeof value !== 'string') return undefined;
      try {
        return new URL(value.includes('://') ? value : `https://${value}`).hostname
          .toLowerCase()
          .replace(/^www\./, '');
      } catch {
        return undefined;
      }
    };
    const matches = data.filter(item => {
      const attrs = object(item.attributes);
      return (
        (params.companyId === undefined || item.id === String(params.companyId)) &&
        (params.companyName === undefined ||
          (typeof attrs.name === 'string' &&
            attrs.name.toLowerCase() === String(params.companyName).toLowerCase())) &&
        (params.companyWebsite === undefined ||
          (domain(attrs.website) !== undefined &&
            domain(attrs.website) === domain(params.companyWebsite)))
      );
    });
    if (matches.length !== 1)
      throw invalid(
        'Company criteria did not identify exactly one company. Supply companyId from Search Companies.'
      );
    return integer(Number(matches[0]?.id), 'resolved companyId', 1);
  }
  async searchNews(params: JsonObject, page?: number, pageSize?: number) {
    if (this.apiVersion === 'legacy') {
      this.currentFieldsOnly(params, ['categories', 'urls', 'allowCompanyEnrichment']);
      return this.search('news', params, page, pageSize);
    }
    const {
      companyId,
      companyName,
      keywords,
      publishedDateAfter,
      allowCompanyEnrichment,
      urls,
      ...criteria
    } = params;
    if (keywords !== undefined)
      throw invalid(
        'The current News API does not document keyword text search. Use categories or urls; legacy connections retain keywords.'
      );
    if (urls !== undefined) {
      criteria.url = values(urls, 'urls', Number.MAX_SAFE_INTEGER).map(value => {
        const url = nonempty(value, 'url');
        if (url.length < 5)
          throw invalid('News URL filters must contain at least five characters.');
        return url;
      });
    }
    if (criteria.categories !== undefined)
      criteria.categories = values(
        criteria.categories,
        'categories',
        Number.MAX_SAFE_INTEGER
      ).map(value => nonempty(value, 'category'));
    if (publishedDateAfter !== undefined)
      criteria.pageDateMin = date(publishedDateAfter, 'publishedDateAfter');
    if (companyId !== undefined || companyName !== undefined) {
      if (allowCompanyEnrichment !== true)
        throw invalid(
          'News for a specific company uses the credit-consuming News Enrich endpoint. Set allowCompanyEnrichment to true to authorize that request.'
        );
      const id = await this.resolveCompany({
        ...(companyId === undefined ? {} : { companyId }),
        ...(companyName === undefined ? {} : { companyName })
      });
      return this.request(
        '/data/v1/news/enrich',
        { ...criteria, companyId: id },
        'NewsEnrich',
        this.paging(page, pageSize)
      );
    }
    if (!Object.keys(criteria).length)
      throw invalid('Provide categories, urls, or publishedDateAfter for News Search.');
    return this.search('news', criteria, page, pageSize);
  }
  async enrichCorporateHierarchy(params: JsonObject) {
    const { outputFields, ...criteria } = params;
    companyCriteria(criteria);
    if (this.apiVersion === 'legacy') {
      this.currentFieldsOnly(params, ['outputFields']);
      return this.request('/enrich/corporatehierarchy', params);
    }
    return this.request(
      '/data/v1/companies/corporate-hierarchy/enrich',
      {
        matchCompanyInput: [criteria],
        outputFields:
          outputFields === undefined
            ? ['companyId', 'familyTree', 'parentage']
            : values(outputFields, 'outputFields', Number.MAX_SAFE_INTEGER).map(value =>
                nonempty(value, 'outputField')
              )
      },
      'CorporateHierarchyEnrich'
    );
  }
  async enrichTechnology(params: JsonObject) {
    companyCriteria(params);
    if (this.apiVersion === 'legacy') return this.request('/enrich/technology', params);
    const wanted =
      params.technologyNames === undefined
        ? undefined
        : values(params.technologyNames, 'technologyNames', Number.MAX_SAFE_INTEGER).map(
            item => nonempty(item, 'technologyName').toLowerCase()
          );
    const companyId = await this.resolveCompany(
      Object.fromEntries(
        Object.entries(params).filter(([key]) =>
          ['companyId', 'companyName', 'companyWebsite'].includes(key)
        )
      )
    );
    const result = await this.request(
      '/data/v1/companies/technologies/enrich',
      { companyId },
      'TechnologyEnrich'
    );
    if (wanted !== undefined) {
      result.data = records(result).filter(item => {
        const attrs = object(item.attributes);
        return (
          typeof attrs.product === 'string' && wanted.includes(attrs.product.toLowerCase())
        );
      });
      return Object.fromEntries(Object.entries(result).filter(([key]) => key !== 'meta'));
    }
    return result;
  }
  private legacyOnly(feature: string) {
    if (this.apiVersion !== 'legacy')
      throw invalid(
        `${feature} is not documented by the current GTM Data API. Use a legacy Enterprise API connection with the separate provider entitlement; no replacement endpoint is assumed.`
      );
  }
  private currentFieldsOnly(params: JsonObject, fields: string[]) {
    const supplied = fields.filter(field => params[field] !== undefined);
    if (supplied.length)
      throw invalid(
        `${supplied.join(', ')} is supported by this integration only on current GTM connections. Omit it for the retained legacy route.`
      );
  }
  async lookupWebSights(ipAddresses: string[]) {
    this.legacyOnly('WebSights IP lookup');
    for (const ip of values(ipAddresses, 'ipAddresses', Number.MAX_SAFE_INTEGER))
      if (typeof ip !== 'string' || !isIP(ip))
        throw invalid('ipAddresses must contain valid IPv4 or IPv6 addresses.');
    return this.request('/lookup/websights', { ipAddresses });
  }
  async searchCompliance(params: JsonObject) {
    this.legacyOnly('Compliance lookup');
    if (!params.personId && !params.emailAddress)
      throw invalid('Provide personIds or emailAddresses to check.');
    for (const [key, value] of Object.entries(params))
      values(value, key, Number.MAX_SAFE_INTEGER).forEach(item => nonempty(item, key));
    return this.request('/lookup/compliance', params);
  }
  async getUsage() {
    const result = await this.request(
      this.apiVersion === 'new' ? '/data/v1/users/usage' : '/usage'
    );
    if (this.apiVersion === 'new')
      for (const item of records(result)) {
        const attrs = object(item.attributes);
        if (item.type !== 'UserUsage' || !Array.isArray(attrs.usage))
          throw invalid('ZoomInfo returned invalid usage data.');
      }
    return result;
  }
  async lookupData(fieldName: string, filters: JsonObject = {}) {
    if (this.apiVersion !== 'new')
      throw invalid('Lookup Data requires a current GTM API connection.');
    if (
      Object.keys(filters).length &&
      fieldName !== 'hashtags' &&
      !fieldName.startsWith('tech-')
    )
      throw invalid('Lookup filters are documented only for hashtags and technology lookups.');
    if (filters['filter[category]'] !== undefined && fieldName !== 'hashtags')
      throw invalid('category is documented only for hashtag lookup.');
    return this.request(
      `/data/v1/lookup/${encodeURIComponent(fieldName)}`,
      undefined,
      undefined,
      filters
    );
  }
  async lookupFields(
    operation: 'search' | 'enrich',
    entity: string,
    fieldType: 'input' | 'output'
  ) {
    if (this.apiVersion !== 'new')
      throw invalid('Lookup Fields requires a current GTM API connection.');
    if (
      operation === 'search' &&
      !['contact', 'company', 'intent', 'news', 'scoop'].includes(entity)
    )
      throw invalid('This entity supports enrich field lookup only.');
    return this.request(`/data/v1/lookup/${operation}`, undefined, undefined, {
      'filter[entity]': entity,
      'filter[fieldType]': fieldType
    });
  }
}
