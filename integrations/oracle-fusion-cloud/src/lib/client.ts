import {
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined,
  requestAxiosData
} from 'slates';
import { createOracleApiError } from './errors';
import { type OracleRecord, recordArray, requireRecord, stringField } from './records';
import { encodeResourceKey, normalizeHttpsOrigin } from './urls';

export type OracleApi = 'fscm' | 'hcm';
export type OracleCollection =
  | '/finBusinessUnitsLOV'
  | '/suppliers'
  | '/purchaseOrders'
  | '/invoices'
  | '/inventoryOrganizations'
  | '/itemsV2'
  | '/workers';
declare const collectionPathBrand: unique symbol;
export type OracleCollectionPath =
  | OracleCollection
  | (string & { readonly [collectionPathBrand]: true });
export type OracleChildCollection = 'sites' | 'invoiceLines';

export type OracleRequestParams = {
  q?: string;
  fields?: string;
  effectiveDate?: string;
  links?: string;
  orderBy?: string;
  totalResults?: boolean;
};
export type OracleMutationParams = OracleRequestParams & { ifMatch?: string };
export type OracleListParams = OracleRequestParams & { limit?: number; offset?: number };
export type OraclePage<T = OracleRecord> = {
  items: T[];
  count: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  nextOffset?: number;
};

const RESOURCE_VERSION = '11.13.18.05';
const FSCM_COLLECTIONS = [
  '/finBusinessUnitsLOV',
  '/suppliers',
  '/purchaseOrders',
  '/invoices',
  '/inventoryOrganizations',
  '/itemsV2'
] as const;
const CHILDREN = { '/suppliers': 'sites', '/invoices': 'invoiceLines' } as const;
const ITEM_MEDIA_TYPE = 'application/vnd.oracle.adf.resourceitem+json';

let conditionalHeaders = (ifMatch: string | undefined) => {
  if (ifMatch === undefined) return undefined;
  if (/^(?:W\/)?"[\x21\x23-\x7e]*"$/.test(ifMatch)) return { 'If-Match': ifMatch };
  if (/^[\x21\x23-\x7e]+$/.test(ifMatch)) return { 'If-Match': `"${ifMatch}"` };
  throw createApiServiceError(
    'Oracle Fusion returned an invalid change indicator for conditional mutation.',
    { reason: 'oracle_fusion_invalid_change_indicator' }
  );
};

let invalidResponse = () =>
  createApiServiceError('Oracle Fusion returned an invalid collection response.', {
    reason: 'oracle_fusion_invalid_response'
  });
let nonnegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

let validateCollection = (api: OracleApi, collection: OracleCollectionPath) => {
  if (api !== 'fscm' && api !== 'hcm') {
    throw createApiServiceError('The Oracle API family is not supported.', {
      reason: 'oracle_fusion_invalid_path'
    });
  }
  if (api === 'hcm' && collection === '/workers') return collection;
  if (api === 'fscm' && FSCM_COLLECTIONS.some(path => path === collection)) return collection;
  if (api === 'fscm') {
    for (let [parent, child] of Object.entries(CHILDREN)) {
      let prefix = `${parent}/`;
      let suffix = `/child/${child}`;
      if (!collection.startsWith(prefix) || !collection.endsWith(suffix)) continue;
      let segment = collection.slice(prefix.length, -suffix.length);
      try {
        let key = decodeURIComponent(segment);
        if (encodeResourceKey(key) === segment) return collection;
      } catch {
        break;
      }
    }
  }
  throw createApiServiceError('The Oracle resource path is not supported.', {
    reason: 'oracle_fusion_invalid_path'
  });
};

export class OracleFusionClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  private instanceUrl: string;
  private apiError: ReturnType<typeof createOracleApiError>;

  constructor(auth: { token: string; instanceUrl: string }) {
    this.instanceUrl = normalizeHttpsOrigin(auth.instanceUrl, 'Oracle Fusion instance URL');
    if (typeof auth.token !== 'string' || !/^[\x21-\x7e]+$/.test(auth.token)) {
      throw createApiServiceError(
        'The Oracle Fusion access token is missing or invalid. Reconnect the account.',
        { reason: 'oracle_fusion_missing_auth' }
      );
    }
    this.apiError = createOracleApiError([auth.token]);
    this.http = createAuthenticatedAxios({
      baseURL: this.instanceUrl,
      authHeader: { value: `Bearer ${auth.token}` },
      contentType: ITEM_MEDIA_TYPE,
      headers: { Accept: 'application/json', 'REST-Framework-Version': '4' },
      maxRedirects: 0,
      timeout: 30000
    });
  }

  childCollectionPath(
    parent: '/suppliers' | '/invoices',
    parentKey: string,
    child: OracleChildCollection
  ): OracleCollectionPath {
    if (CHILDREN[parent] !== child) {
      throw createApiServiceError(
        'The nested Oracle resource is not supported for this parent.',
        { reason: 'oracle_fusion_invalid_path' }
      );
    }
    return `${parent}/${encodeResourceKey(parentKey)}/child/${child}` as OracleCollectionPath;
  }

  private collectionUrl(api: OracleApi, collection: OracleCollectionPath) {
    return `/${api}RestApi/resources/${RESOURCE_VERSION}${validateCollection(api, collection)}`;
  }

  private itemUrl(api: OracleApi, collection: OracleCollectionPath, resourceKey: string) {
    return `${this.collectionUrl(api, collection)}/${encodeResourceKey(resourceKey)}`;
  }

  async list(
    api: OracleApi,
    collection: OracleCollectionPath,
    params: OracleListParams = {}
  ): Promise<OraclePage> {
    let limit = params.limit ?? 25;
    let offset = params.offset ?? 0;
    if (
      !nonnegativeInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !nonnegativeInteger(offset)
    ) {
      throw createApiServiceError(
        'Pagination requires an integer limit from 1 to 100 and a nonnegative integer offset.',
        { reason: 'oracle_fusion_invalid_pagination' }
      );
    }
    let path = this.collectionUrl(api, collection);
    let data = requireRecord(
      await requestAxiosData<unknown>(
        'list resources',
        () => this.http.get(path, { params: pickDefined({ ...params, limit, offset }) }),
        this.apiError
      ),
      'collection'
    );
    let items = recordArray(data.items);
    if (
      !nonnegativeInteger(data.count) ||
      data.count !== items.length ||
      !nonnegativeInteger(data.limit) ||
      data.limit < 1 ||
      data.limit > 100 ||
      data.limit > limit ||
      items.length > data.limit ||
      !nonnegativeInteger(data.offset) ||
      data.offset !== offset ||
      typeof data.hasMore !== 'boolean' ||
      (data.hasMore && items.length === 0)
    ) {
      throw invalidResponse();
    }
    let nextOffset = data.hasMore ? data.offset + data.count : undefined;
    if (nextOffset !== undefined && !Number.isSafeInteger(nextOffset)) throw invalidResponse();
    return {
      items,
      count: data.count,
      limit: data.limit,
      offset: data.offset,
      hasMore: data.hasMore,
      nextOffset
    };
  }

  async get(
    api: OracleApi,
    collection: OracleCollectionPath,
    resourceKey: string,
    params: OracleRequestParams = {}
  ): Promise<OracleRecord> {
    let path = this.itemUrl(api, collection, resourceKey);
    return requireRecord(
      await requestAxiosData<unknown>(
        'get resource',
        () => this.http.get(path, { params: pickDefined(params) }),
        this.apiError
      )
    );
  }

  async create(
    api: OracleApi,
    collection: OracleCollectionPath,
    body: OracleRecord,
    params: OracleRequestParams = {}
  ): Promise<OracleRecord> {
    let path = this.collectionUrl(api, collection);
    return requireRecord(
      await requestAxiosData<unknown>(
        'create resource',
        () => this.http.post(path, body, { params: pickDefined(params) }),
        this.apiError
      )
    );
  }

  async patch(
    api: OracleApi,
    collection: OracleCollectionPath,
    resourceKey: string,
    body: OracleRecord,
    params: OracleMutationParams = {}
  ): Promise<OracleRecord> {
    let path = this.itemUrl(api, collection, resourceKey);
    let { ifMatch, ...query } = params;
    let headers = conditionalHeaders(ifMatch);
    return requireRecord(
      await requestAxiosData<unknown>(
        'update resource',
        () => this.http.patch(path, body, { params: pickDefined(query), headers }),
        this.apiError
      )
    );
  }

  async delete(
    api: OracleApi,
    collection: OracleCollectionPath,
    resourceKey: string,
    params: { ifMatch?: string } = {}
  ): Promise<void> {
    let path = this.itemUrl(api, collection, resourceKey);
    let headers = conditionalHeaders(params.ifMatch);
    await requestAxiosData<unknown>(
      'delete resource',
      () => this.http.delete(path, { headers }),
      this.apiError
    );
  }

  selfLink(
    record: OracleRecord,
    api: OracleApi,
    collection: OracleCollectionPath
  ): string | undefined {
    let linksValue = record.links;
    if (linksValue === undefined && record['@context'] !== undefined) {
      linksValue = requireRecord(record['@context'], 'resource context').links;
    }
    if (linksValue === undefined) return undefined;
    let link = recordArray(linksValue, 'resource links').find(
      value => stringField(value, 'rel') === 'self'
    );
    if (!link) return undefined;
    let href = stringField(link, 'href');
    if (!href)
      throw createApiServiceError('Oracle Fusion returned an invalid resource self link.', {
        reason: 'oracle_fusion_invalid_resource_link'
      });
    let collectionUrl = this.collectionUrl(api, collection);
    let url: URL;
    try {
      url = new URL(href, `${this.instanceUrl}${collectionUrl}/`);
    } catch {
      throw createApiServiceError('Oracle Fusion returned an invalid resource self link.', {
        reason: 'oracle_fusion_invalid_resource_link'
      });
    }
    let prefix = `${collectionUrl}/`;
    if (
      url.origin !== this.instanceUrl ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !url.pathname.startsWith(prefix)
    ) {
      throw createApiServiceError(
        'Oracle Fusion returned a resource link outside the expected collection.',
        { reason: 'oracle_fusion_invalid_resource_link' }
      );
    }
    let encodedKey = url.pathname.slice(prefix.length);
    try {
      let key = decodeURIComponent(encodedKey);
      if (!encodedKey || encodedKey.includes('/') || !encodeResourceKey(key)) {
        throw createApiServiceError('Oracle Fusion returned an invalid resource self link.', {
          reason: 'oracle_fusion_invalid_resource_link'
        });
      }
    } catch {
      throw createApiServiceError('Oracle Fusion returned an invalid resource self link.', {
        reason: 'oracle_fusion_invalid_resource_link'
      });
    }
    return url.href;
  }

  optionalResourceKey(
    record: OracleRecord,
    api: OracleApi,
    collection: OracleCollectionPath
  ): string | undefined {
    let href = this.selfLink(record, api, collection);
    if (!href) return undefined;
    return decodeURIComponent(
      new URL(href).pathname.slice(this.collectionUrl(api, collection).length + 1)
    );
  }

  resourceKey(record: OracleRecord, api: OracleApi, collection: OracleCollectionPath): string {
    let key = this.optionalResourceKey(record, api, collection);
    if (!key) {
      throw createApiServiceError(
        'Oracle Fusion did not return a resource self link. Request resource links before using this result in another tool.',
        { reason: 'oracle_fusion_missing_resource_link' }
      );
    }
    return key;
  }
}
