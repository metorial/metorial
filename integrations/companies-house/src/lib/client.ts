import {
  createAuthenticatedAxios,
  createAxios,
  getApiErrorStatus,
  getResponseHeaderValue,
  pickDefined,
  requestAxios,
  requestAxiosData
} from 'slates';
import {
  DEFAULT_ITEMS_PER_PAGE,
  DISQUALIFICATION_RESOURCE_PATHS,
  type DisqualifiedOfficerType,
  DOCUMENT_API_BASE_URL,
  isDisqualifiedOfficerType,
  isSafeDocumentMimeType,
  MAX_DOCUMENT_DOWNLOAD_BYTES,
  MAX_ITEMS_PER_PAGE,
  PUBLIC_DATA_BASE_URL,
  SAFE_DOCUMENT_MIME_EXTENSIONS
} from './constants';
import {
  companiesHouseApiError,
  companiesHouseDownloadError,
  companiesHouseValidationError
} from './errors';
import {
  mapAdvancedCompanySearchEnvelope,
  mapChargeRecord,
  mapCompanyRecord,
  mapDocumentMetadata,
  mapFilingRecord,
  mapOfficerRecord,
  mapPaginatedEnvelope,
  mapPscRecord
} from './mappers';
import type { MappedDocumentMetadata, ProviderRecord } from './types';

export type CompaniesHousePagination = {
  itemsPerPage?: number;
  startIndex?: number;
};

export type CompaniesHouseSearchRestriction =
  | 'active-companies'
  | 'legally-equivalent-company-name';

const COMPANY_SEARCH_RESTRICTIONS = [
  'active-companies',
  'legally-equivalent-company-name'
] as const;

export type CompaniesHouseAdvancedSearchParams = CompaniesHousePagination & {
  companyNameIncludes?: string;
  companyNameExcludes?: string;
  companyStatus?: string[];
  companyType?: string[];
  companySubtype?: string[];
  incorporatedFrom?: string;
  incorporatedTo?: string;
  dissolvedFrom?: string;
  dissolvedTo?: string;
  location?: string;
  sicCodes?: string[];
};

type RegisterViewPagination = CompaniesHousePagination & { registerView?: boolean };

export type CompanyOfficerOrderBy = 'appointed_on' | 'resigned_on' | 'surname';
export type CompanyOfficerRegisterType = 'directors' | 'secretaries' | 'llp_members';
export type CompanyOfficerListParams = RegisterViewPagination & {
  orderBy?: CompanyOfficerOrderBy;
  registerType?: CompanyOfficerRegisterType;
};

const COMPANY_OFFICER_ORDER_VALUES = ['appointed_on', 'resigned_on', 'surname'] as const;
const COMPANY_OFFICER_REGISTER_TYPES = ['directors', 'secretaries', 'llp_members'] as const;

let pathSegment = (value: string) => encodeURIComponent(value);

let normalizePagination = (value: CompaniesHousePagination = {}) => {
  let itemsPerPage = value.itemsPerPage ?? DEFAULT_ITEMS_PER_PAGE;
  let startIndex = value.startIndex ?? 0;
  if (
    !Number.isInteger(itemsPerPage) ||
    itemsPerPage < 1 ||
    itemsPerPage > MAX_ITEMS_PER_PAGE
  ) {
    throw companiesHouseValidationError(
      `itemsPerPage must be an integer from 1 to ${MAX_ITEMS_PER_PAGE}.`
    );
  }
  if (!Number.isInteger(startIndex) || startIndex < 0) {
    throw companiesHouseValidationError('startIndex must be a non-negative integer.');
  }
  return { itemsPerPage, startIndex };
};

let trimmed = (value: string | undefined) => {
  let normalized = value?.trim();
  return normalized ? normalized : undefined;
};

let commaList = (value: string[] | undefined) => {
  let normalized = value?.map(item => item.trim()).filter(Boolean);
  return normalized && normalized.length > 0 ? normalized.join(',') : undefined;
};

let simpleSearchRestrictions = (value: unknown) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length === 0) {
    throw companiesHouseValidationError(
      'restrictions must be a non-empty array of supported Companies House restrictions.'
    );
  }
  if (
    !value.every(
      item =>
        typeof item === 'string' &&
        COMPANY_SEARCH_RESTRICTIONS.includes(item as CompaniesHouseSearchRestriction)
    )
  ) {
    throw companiesHouseValidationError(
      'restrictions may contain only active-companies and legally-equivalent-company-name.'
    );
  }
  if (new Set(value).size !== value.length) {
    throw companiesHouseValidationError('restrictions must not contain duplicate values.');
  }
  return value.join(' ');
};

let validateDate = (value: string | undefined, field: string) => {
  if (value === undefined) return;
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  let parsed = match ? new Date(`${value}T00:00:00Z`) : undefined;
  if (
    !match ||
    !parsed ||
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== Number(match[1]) ||
    parsed.getUTCMonth() + 1 !== Number(match[2]) ||
    parsed.getUTCDate() !== Number(match[3])
  ) {
    throw companiesHouseValidationError(`${field} must use YYYY-MM-DD format.`);
  }
};

let validateDateRange = (from: string | undefined, to: string | undefined, label: string) => {
  validateDate(from, `${label}From`);
  validateDate(to, `${label}To`);
  if (from !== undefined && to !== undefined && from > to) {
    throw companiesHouseValidationError(
      `${label} date range is reversed: the from date must not be later than the to date.`
    );
  }
};

let binaryBuffer = (value: unknown) => {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  return undefined;
};

let normalizedMimeType = (value: string | undefined) =>
  value?.split(';', 1)[0]?.trim().toLowerCase();

export class CompaniesHouseClient {
  private publicHttp: ReturnType<typeof createAuthenticatedAxios>;
  private documentHttp: ReturnType<typeof createAuthenticatedAxios>;
  private downloadHttp: ReturnType<typeof createAxios>;
  private token: string;

  constructor(auth: { token: string }) {
    this.token = auth.token;
    let authorization = `Basic ${Buffer.from(`${auth.token}:`).toString('base64')}`;
    let authenticated = {
      authHeader: { value: authorization },
      contentType: false as const,
      headers: { Accept: 'application/json' }
    };

    this.publicHttp = createAuthenticatedAxios({
      baseURL: PUBLIC_DATA_BASE_URL,
      ...authenticated
    });
    this.documentHttp = createAuthenticatedAxios({
      baseURL: DOCUMENT_API_BASE_URL,
      ...authenticated
    });
    this.downloadHttp = createAxios();
  }

  private apiError(error: unknown, operation: string) {
    return companiesHouseApiError(error, operation, [this.token]);
  }

  private publicData<T>(operation: string, path: string, config?: Record<string, unknown>) {
    return requestAxiosData<T>(
      operation,
      () => (config ? this.publicHttp.get(path, config) : this.publicHttp.get(path)),
      (error, requestOperation) => this.apiError(error, requestOperation)
    );
  }

  private documentData<T>(operation: string, path: string, config?: Record<string, unknown>) {
    return requestAxiosData<T>(
      operation,
      () => (config ? this.documentHttp.get(path, config) : this.documentHttp.get(path)),
      (error, requestOperation) => this.apiError(error, requestOperation)
    );
  }

  async searchCompanies(
    params: {
      query: string;
      restrictions?: CompaniesHouseSearchRestriction[];
    } & CompaniesHousePagination
  ) {
    let page = normalizePagination(params);
    let query = trimmed(params.query);
    if (!query) throw companiesHouseValidationError('query is required.');
    let data = await this.publicData<ProviderRecord>('search companies', '/search/companies', {
      params: pickDefined({
        q: query,
        restrictions: simpleSearchRestrictions(params.restrictions),
        items_per_page: page.itemsPerPage,
        start_index: page.startIndex
      })
    });
    return mapPaginatedEnvelope(data, mapCompanyRecord, page);
  }

  async searchCompaniesAdvanced(params: CompaniesHouseAdvancedSearchParams) {
    let page = normalizePagination(params);
    let filters = {
      companyNameIncludes: trimmed(params.companyNameIncludes),
      companyNameExcludes: trimmed(params.companyNameExcludes),
      companyStatus: commaList(params.companyStatus),
      companyType: commaList(params.companyType),
      companySubtype: commaList(params.companySubtype),
      incorporatedFrom: trimmed(params.incorporatedFrom),
      incorporatedTo: trimmed(params.incorporatedTo),
      dissolvedFrom: trimmed(params.dissolvedFrom),
      dissolvedTo: trimmed(params.dissolvedTo),
      location: trimmed(params.location),
      sicCodes: commaList(params.sicCodes)
    };
    if (!Object.values(filters).some(value => value !== undefined)) {
      throw companiesHouseValidationError(
        'Advanced company search requires at least one business filter.'
      );
    }
    validateDateRange(filters.incorporatedFrom, filters.incorporatedTo, 'incorporated');
    validateDateRange(filters.dissolvedFrom, filters.dissolvedTo, 'dissolved');

    let query = pickDefined({
      company_name_includes: filters.companyNameIncludes,
      company_name_excludes: filters.companyNameExcludes,
      company_status: filters.companyStatus,
      company_subtype: filters.companySubtype,
      company_type: filters.companyType,
      incorporated_from: filters.incorporatedFrom,
      incorporated_to: filters.incorporatedTo,
      dissolved_from: filters.dissolvedFrom,
      dissolved_to: filters.dissolvedTo,
      location: filters.location,
      sic_codes: filters.sicCodes,
      size: page.itemsPerPage,
      start_index: page.startIndex
    });

    try {
      let data = await requestAxiosData<ProviderRecord>(
        'advanced company search',
        () => this.publicHttp.get('/advanced-search/companies', { params: query }),
        error => error
      );
      return mapAdvancedCompanySearchEnvelope(data, page);
    } catch (error) {
      if (Number(getApiErrorStatus(error)) === 404) {
        return mapAdvancedCompanySearchEnvelope({ hits: '0', items: [] }, page);
      }
      throw this.apiError(error, 'advanced company search');
    }
  }

  async getCompanyProfile(companyNumber: string) {
    let data = await this.publicData<ProviderRecord>(
      'get company profile',
      `/company/${pathSegment(companyNumber)}`
    );
    return mapCompanyRecord(data);
  }

  async searchOfficers(params: { query: string } & CompaniesHousePagination) {
    let page = normalizePagination(params);
    let query = trimmed(params.query);
    if (!query) throw companiesHouseValidationError('query is required.');
    let data = await this.publicData<ProviderRecord>('search officers', '/search/officers', {
      params: { q: query, items_per_page: page.itemsPerPage, start_index: page.startIndex }
    });
    return mapPaginatedEnvelope(data, mapOfficerRecord, page);
  }

  async listCompanyOfficers(companyNumber: string, params: CompanyOfficerListParams = {}) {
    let page = normalizePagination(params);
    if (
      params.orderBy !== undefined &&
      !COMPANY_OFFICER_ORDER_VALUES.includes(params.orderBy)
    ) {
      throw companiesHouseValidationError(
        'orderBy must be appointed_on, resigned_on, or surname.'
      );
    }
    if (
      params.registerType !== undefined &&
      !COMPANY_OFFICER_REGISTER_TYPES.includes(params.registerType)
    ) {
      throw companiesHouseValidationError(
        'registerType must be directors, secretaries, or llp_members.'
      );
    }
    if (params.registerType !== undefined && params.registerView !== true) {
      throw companiesHouseValidationError(
        'registerView must be true when registerType is supplied.'
      );
    }
    let data = await this.publicData<ProviderRecord>(
      'list company officers',
      `/company/${pathSegment(companyNumber)}/officers`,
      {
        params: pickDefined({
          items_per_page: page.itemsPerPage,
          order_by: params.orderBy,
          register_type: params.registerType,
          register_view:
            params.registerView === undefined ? undefined : String(params.registerView),
          start_index: page.startIndex
        })
      }
    );
    return mapPaginatedEnvelope(data, mapOfficerRecord, page);
  }

  async listOfficerAppointments(officerId: string, params: CompaniesHousePagination = {}) {
    let page = normalizePagination(params);
    let data = await this.publicData<ProviderRecord>(
      'list officer appointments',
      `/officers/${pathSegment(officerId)}/appointments`,
      {
        params: { items_per_page: page.itemsPerPage, start_index: page.startIndex }
      }
    );
    return mapPaginatedEnvelope(data, mapOfficerRecord, page);
  }

  async searchDisqualifiedOfficers(params: { query: string } & CompaniesHousePagination) {
    let page = normalizePagination(params);
    let query = trimmed(params.query);
    if (!query) throw companiesHouseValidationError('query is required.');
    let data = await this.publicData<ProviderRecord>(
      'search disqualified officers',
      '/search/disqualified-officers',
      {
        params: { q: query, items_per_page: page.itemsPerPage, start_index: page.startIndex }
      }
    );
    return mapPaginatedEnvelope(data, mapOfficerRecord, page);
  }

  async getOfficerDisqualifications(officerId: string, officerType: DisqualifiedOfficerType) {
    if (!isDisqualifiedOfficerType(officerType)) {
      throw companiesHouseValidationError('officerType must be either natural or corporate.');
    }
    let resourcePath = DISQUALIFICATION_RESOURCE_PATHS[officerType];
    let data = await this.publicData<ProviderRecord>(
      'get officer disqualifications',
      `${resourcePath}${pathSegment(officerId)}`
    );
    return mapOfficerRecord(data);
  }

  async listFilingHistory(
    companyNumber: string,
    params: CompaniesHousePagination & { categories?: string[] } = {}
  ) {
    let page = normalizePagination(params);
    let data = await this.publicData<ProviderRecord>(
      'list filing history',
      `/company/${pathSegment(companyNumber)}/filing-history`,
      {
        params: pickDefined({
          category: commaList(params.categories),
          items_per_page: page.itemsPerPage,
          start_index: page.startIndex
        })
      }
    );
    return mapPaginatedEnvelope(data, mapFilingRecord, page);
  }

  async getFilingHistoryItem(companyNumber: string, transactionId: string) {
    let data = await this.publicData<ProviderRecord>(
      'get filing history item',
      `/company/${pathSegment(companyNumber)}/filing-history/${pathSegment(transactionId)}`
    );
    return mapFilingRecord(data);
  }

  async getDocumentMetadata(documentId: string): Promise<MappedDocumentMetadata> {
    let data = await this.documentData<ProviderRecord>(
      'get document metadata',
      `/document/${pathSegment(documentId)}`
    );
    return mapDocumentMetadata(data);
  }

  async getDocumentContent(documentId: string, requestedMimeType: string) {
    let mimeType = normalizedMimeType(requestedMimeType);
    if (!isSafeDocumentMimeType(mimeType)) {
      throw companiesHouseValidationError(
        'The requested document MIME type is not safe to download.',
        'companies_house_document_mime_invalid'
      );
    }
    let safeMimeType = mimeType;
    let metadata = await this.getDocumentMetadata(documentId);
    let resource = metadata.resources[safeMimeType];
    if (!resource) {
      throw companiesHouseValidationError(
        `Companies House does not advertise ${safeMimeType} for this document.`,
        'companies_house_document_mime_unavailable'
      );
    }
    if (
      resource.contentLength !== undefined &&
      (!Number.isSafeInteger(resource.contentLength) ||
        resource.contentLength < 0 ||
        resource.contentLength > MAX_DOCUMENT_DOWNLOAD_BYTES)
    ) {
      throw companiesHouseValidationError(
        `The requested Companies House document exceeds the ${MAX_DOCUMENT_DOWNLOAD_BYTES}-byte download limit.`,
        'companies_house_document_too_large'
      );
    }

    let locationResponse = await requestAxios(
      'locate document content',
      () =>
        this.documentHttp.get(`/document/${pathSegment(documentId)}/content`, {
          headers: { Accept: safeMimeType },
          maxRedirects: 0,
          validateStatus: status => status === 302
        }),
      (error, operation) => this.apiError(error, operation)
    );
    if (locationResponse.status !== 302) {
      throw companiesHouseValidationError(
        'Companies House returned an unexpected response instead of a document redirect.',
        'companies_house_document_redirect_invalid'
      );
    }

    let location = getResponseHeaderValue(locationResponse.headers, 'location');
    let redirectUrl: URL;
    try {
      redirectUrl = new URL(location ?? '');
    } catch {
      throw companiesHouseValidationError(
        'Companies House returned a document redirect without a valid HTTPS destination.',
        'companies_house_document_redirect_invalid'
      );
    }
    if (
      redirectUrl.protocol !== 'https:' ||
      redirectUrl.username.length > 0 ||
      redirectUrl.password.length > 0
    ) {
      throw companiesHouseValidationError(
        'Companies House returned an unsafe document redirect destination.',
        'companies_house_document_redirect_invalid'
      );
    }

    let downloadResponse = await requestAxios(
      'download document bytes',
      () =>
        this.downloadHttp.get(redirectUrl.toString(), {
          responseType: 'arraybuffer',
          maxRedirects: 0,
          maxBodyLength: MAX_DOCUMENT_DOWNLOAD_BYTES,
          maxContentLength: MAX_DOCUMENT_DOWNLOAD_BYTES,
          validateStatus: status => status >= 200 && status < 300
        }),
      companiesHouseDownloadError
    );

    let contentLength = getResponseHeaderValue(downloadResponse.headers, 'content-length');
    if (contentLength !== undefined) {
      if (
        !/^\d+$/.test(contentLength) ||
        Number(contentLength) > MAX_DOCUMENT_DOWNLOAD_BYTES
      ) {
        throw companiesHouseValidationError(
          `The downloaded Companies House document exceeds the ${MAX_DOCUMENT_DOWNLOAD_BYTES}-byte limit or has an invalid declared size.`,
          'companies_house_document_too_large'
        );
      }
    }

    let content = binaryBuffer(downloadResponse.data);
    if (!content || content.length === 0) {
      throw companiesHouseValidationError(
        'Companies House returned an empty or non-binary document body.',
        'companies_house_document_body_invalid'
      );
    }
    if (content.length > MAX_DOCUMENT_DOWNLOAD_BYTES) {
      throw companiesHouseValidationError(
        `The downloaded Companies House document exceeds the ${MAX_DOCUMENT_DOWNLOAD_BYTES}-byte limit.`,
        'companies_house_document_too_large'
      );
    }

    let responseMimeType = normalizedMimeType(
      getResponseHeaderValue(downloadResponse.headers, 'content-type')
    );
    let resolvedMimeType =
      !responseMimeType ||
      responseMimeType === 'application/octet-stream' ||
      responseMimeType === 'binary/octet-stream'
        ? safeMimeType
        : responseMimeType;
    if (!isSafeDocumentMimeType(resolvedMimeType) || resolvedMimeType !== safeMimeType) {
      throw companiesHouseValidationError(
        `Companies House returned an unexpected document MIME type "${resolvedMimeType}".`,
        'companies_house_document_mime_invalid'
      );
    }

    return {
      documentId,
      content,
      mimeType: safeMimeType,
      extension: SAFE_DOCUMENT_MIME_EXTENSIONS[safeMimeType]
    };
  }

  async listCompanyCharges(companyNumber: string, params: CompaniesHousePagination = {}) {
    let page = normalizePagination(params);
    let data = await this.publicData<ProviderRecord>(
      'list company charges',
      `/company/${pathSegment(companyNumber)}/charges`,
      { params: { items_per_page: page.itemsPerPage, start_index: page.startIndex } }
    );
    return mapPaginatedEnvelope(data, mapChargeRecord, page);
  }

  async getCompanyCharge(companyNumber: string, chargeId: string) {
    let data = await this.publicData<ProviderRecord>(
      'get company charge',
      `/company/${pathSegment(companyNumber)}/charges/${pathSegment(chargeId)}`
    );
    return mapChargeRecord(data);
  }

  async getCompanyInsolvency(companyNumber: string) {
    let record = await this.publicData<ProviderRecord>(
      'get company insolvency',
      `/company/${pathSegment(companyNumber)}/insolvency`
    );
    return { record };
  }

  async listCompanyPscs(companyNumber: string, params: RegisterViewPagination = {}) {
    let page = normalizePagination(params);
    let data = await this.publicData<ProviderRecord>(
      'list company persons with significant control',
      `/company/${pathSegment(companyNumber)}/persons-with-significant-control`,
      {
        params: pickDefined({
          items_per_page: page.itemsPerPage,
          register_view:
            params.registerView === undefined ? undefined : String(params.registerView),
          start_index: page.startIndex
        })
      }
    );
    return mapPaginatedEnvelope(data, mapPscRecord, page);
  }

  async listPscStatements(companyNumber: string, params: RegisterViewPagination = {}) {
    let page = normalizePagination(params);
    let data = await this.publicData<ProviderRecord>(
      'list company persons with significant control statements',
      `/company/${pathSegment(companyNumber)}/persons-with-significant-control-statements`,
      {
        params: pickDefined({
          items_per_page: page.itemsPerPage,
          register_view:
            params.registerView === undefined ? undefined : String(params.registerView),
          start_index: page.startIndex
        })
      }
    );
    return mapPaginatedEnvelope(data, mapPscRecord, page);
  }
}
