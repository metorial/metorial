import { createAxios, getOAuthExpiresAtFromExpiresIn, isApiErrorRecord } from 'slates';
import {
  apiOrigin,
  credentialVariants,
  dateOnly,
  identifier,
  invalid,
  nonempty,
  positiveId,
  safeData,
  upstream
} from './helpers';
import { type EntityMetadata, type Property, parseMetadata } from './metadata';
import type { Page, QueryOptions } from './types';

type Keys = Record<string, string | number>;
const encode = (s: string) => encodeURIComponent(s).replaceAll("'", '%27');
const integer = (v: unknown): string => {
  if (
    (typeof v !== 'string' || !/^-?\d+$/.test(v)) &&
    (typeof v !== 'number' || !Number.isSafeInteger(v))
  )
    throw invalid('Integer fields and keys require an exact decimal string or safe integer.');
  return BigInt(String(v)).toString();
};
const decimal = (value: string): string => {
  let [whole, fraction = ''] = value.split('.');
  let negative = whole!.startsWith('-');
  whole = whole!.replace(/^-/, '').replace(/^0+(?=\d)/, '');
  fraction = fraction.replace(/0+$/, '');
  return `${negative && (whole !== '0' || fraction) ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
};
function valueFor(p: Property, value: unknown, key = false): unknown {
  if (value === null) {
    if (!p.nullable || key) throw invalid(`The ${p.name} field cannot be null.`);
    return null;
  }
  switch (p.type) {
    case 'Edm.String':
      if (typeof value !== 'string') throw invalid(`The ${p.name} field requires a string.`);
      return key ? `'${encode(nonempty(value, p.name).replaceAll("'", "''"))}'` : value;
    case 'Edm.Int64': {
      let v = integer(value);
      if (BigInt(v) < -9223372036854775808n || BigInt(v) > 9223372036854775807n)
        throw invalid('Int64 value is outside its supported range.');
      return key ? `${v}L` : v;
    }
    case 'Edm.Int32':
    case 'Edm.Int16':
    case 'Edm.Byte': {
      let v = integer(value);
      let bounds =
        p.type === 'Edm.Int32'
          ? [-2147483648, 2147483647]
          : p.type === 'Edm.Int16'
            ? [-32768, 32767]
            : [0, 255];
      if (BigInt(v) < BigInt(bounds[0]!) || BigInt(v) > BigInt(bounds[1]!))
        throw invalid('Integer value is outside its supported range.');
      return key ? v : Number(v);
    }
    case 'Edm.Decimal': {
      if (typeof value !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(value))
        throw invalid(
          `The ${p.name} decimal requires an exact decimal string. Numeric input cannot preserve decimal precision.`
        );
      return key ? `${decimal(value)}M` : value;
    }
    case 'Edm.Boolean':
      if (typeof value !== 'boolean') throw invalid(`The ${p.name} field requires a boolean.`);
      return key ? String(value) : value;
    case 'Edm.Double':
    case 'Edm.Single':
      if (typeof value !== 'number' || !Number.isFinite(value))
        throw invalid(`The ${p.name} field requires a finite number.`);
      return key ? `${value}${p.type === 'Edm.Double' ? 'D' : 'F'}` : value;
    case 'Edm.DateTime':
    case 'Edm.DateTimeOffset': {
      if (typeof value !== 'string')
        throw invalid(`The ${p.name} field requires a date string.`);
      let stamp: number;
      if (/^\d{4}-\d{2}-\d{2}$/.test(value))
        stamp = Date.parse(`${dateOnly(value)}T00:00:00Z`);
      else if (/^\/Date\(-?\d+(?:[+-]\d{4})?\)\/$/.test(value))
        stamp = Number(value.match(/-?\d+/)?.[0]);
      else if (
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})?$/.test(value)
      ) {
        dateOnly(value.slice(0, 10));
        stamp = Date.parse(
          value.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`
        );
      } else
        throw invalid(
          `The ${p.name} field requires YYYY-MM-DD, an ISO date-time or an OData /Date(milliseconds)/ value.`
        );
      if (!Number.isSafeInteger(stamp) || !Number.isFinite(new Date(stamp).getTime()))
        throw invalid('Date value is invalid.');
      return key
        ? `${p.type === 'Edm.DateTime' ? 'datetime' : 'datetimeoffset'}'${encode(p.type === 'Edm.DateTime' ? new Date(stamp).toISOString().replace(/Z$/, '') : new Date(stamp).toISOString())}'`
        : `/Date(${stamp})/`;
    }
    default:
      throw invalid(
        `The ${p.name} field uses unsupported type ${p.type}. Use SAP’s documented typed API for this field.`
      );
  }
}
export class Client {
  private axios: ReturnType<typeof createAxios>;
  readonly origin: string;
  private token: string;
  private metadata = new Map<string, EntityMetadata>();
  constructor(auth: { token: string; apiServerUrl: string }) {
    this.origin = apiOrigin(auth.apiServerUrl);
    this.token = nonempty(auth.token, 'Access token');
    this.axios = createAxios({
      baseURL: `${this.origin}/odata/v2`,
      timeout: 30_000,
      maxRedirects: 0,
      maxContentLength: 16 * 1024 * 1024,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }
  private async request(
    method: 'get' | 'post',
    path: string,
    options: {
      params?: Record<string, string>;
      data?: unknown;
      headers?: Record<string, string>;
      responseType?: 'text';
    } = {}
  ): Promise<unknown> {
    try {
      let r = await this.axios.request({ method, url: path, ...options });
      return r.data;
    } catch (error) {
      throw upstream(error, method === 'get' ? 'read' : 'write', false);
    }
  }
  async getMetadata(entitySet?: string): Promise<{ entities: EntityMetadata[]; url: string }> {
    let path = entitySet ? `/${identifier(entitySet)}/$metadata` : '/$metadata';
    let xml = await this.request('get', path, {
      headers: { Accept: 'application/atom+xml' },
      responseType: 'text'
    });
    if (typeof xml === 'string') safeData(xml, this.token);
    let entities = parseMetadata(xml);
    if (entitySet && !entities.some(e => e.name === entitySet))
      throw invalid(
        'The requested entity set is absent from the company metadata. Inspect get_api_metadata and choose an available exact entity name.'
      );
    for (let e of entities) this.metadata.set(e.name, e);
    return { entities, url: `${this.origin}/odata/v2${path}` };
  }
  private async entity(name: string) {
    identifier(name);
    if (!this.metadata.has(name)) await this.getMetadata(name);
    let m = this.metadata.get(name);
    if (!m) throw invalid('The entity set is unavailable in this company.');
    return m;
  }
  private params(options: QueryOptions, m: EntityMetadata): Record<string, string> {
    let params: Record<string, string> = { $format: 'json' };
    for (let [name, value] of [
      ['$top', options.top],
      ['$skip', options.skip]
    ] as const)
      if (value !== undefined) {
        if (
          !Number.isSafeInteger(value) ||
          value < 0 ||
          (name === '$top' && (value < 1 || value > 1000))
        )
          throw invalid(
            'top must be an integer from 1 to 1000; skip must be a nonnegative safe integer.'
          );
        params[name] = String(value);
      }
    for (let [name, value] of [
      ['$filter', options.filter],
      ['$select', options.select],
      ['$expand', options.expand],
      ['$orderby', options.orderBy]
    ] as const)
      if (value !== undefined) {
        nonempty(value, name);
        if (value.length > 8000 || credentialVariants(this.token).some(s => value.includes(s)))
          throw invalid('The OData query is too long or contains a credential.');
        if (name !== '$filter')
          for (let item of value.split(',')) {
            let field = item.trim().replace(/\s+(asc|desc)$/i, '');
            if (field === '*' && name === '$select') continue;
            let segments = field.split('/');
            for (let s of segments) identifier(s);
            let root = segments[0]!;
            let p = m.properties.find(p => p.name === root);
            if (
              name === '$expand'
                ? !m.navigationProperties.includes(root)
                : !p && !m.navigationProperties.includes(root)
            )
              throw invalid(
                'The selected property or navigation is absent from the entity metadata. Call get_api_metadata for exact names.'
              );
            if (p && name === '$select' && !p.visible)
              throw invalid('The selected property is not visible in the entity metadata.');
          }
        params[name] = value;
      }
    if (options.inlineCount) params.$inlinecount = 'allpages';
    if (options.asOfDate && (options.fromDate || options.toDate))
      throw invalid('Use asOfDate or a fromDate/toDate range, not both.');
    for (let [name, value] of [
      ['asOfDate', options.asOfDate],
      ['fromDate', options.fromDate],
      ['toDate', options.toDate]
    ] as const)
      if (value !== undefined) params[name] = dateOnly(value);
    if (options.fromDate && options.toDate && options.fromDate > options.toDate)
      throw invalid('fromDate must not be after toDate.');
    return params;
  }
  private predicate(m: EntityMetadata, keys: Keys): string {
    if (Object.keys(keys).length !== m.keys.length || m.keys.some(k => !(k in keys)))
      throw invalid(
        'Provide exactly the key properties reported by get_api_metadata, including effective dates and sequence numbers.'
      );
    return m.keys
      .map(
        k =>
          `${identifier(k)}=${String(valueFor(m.properties.find(p => p.name === k)!, keys[k], true))}`
      )
      .join(',');
  }
  private record(data: unknown, m: EntityMetadata): Record<string, unknown> {
    if (!isApiErrorRecord(data) || !isApiErrorRecord(data.d) || Array.isArray(data.d.results))
      throw invalid('SAP returned an invalid single-entity response.');
    return this.cleanRecord(data.d, m);
  }
  private cleanRecord(
    data: Record<string, unknown>,
    m: EntityMetadata
  ): Record<string, unknown> {
    for (let p of m.properties)
      if (data[p.name] !== undefined && data[p.name] !== null) {
        if (
          p.type === 'Edm.Decimal' &&
          (typeof data[p.name] !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(String(data[p.name])))
        )
          throw invalid('SAP returned a decimal without its exact string representation.');
        if (p.type === 'Edm.Int64') integer(data[p.name]);
      }
    let safe = safeData(data, this.token);
    if (!isApiErrorRecord(safe)) throw invalid('Invalid entity response.');
    return safe;
  }
  private bind(record: Record<string, unknown>, m: EntityMetadata, keys: Keys) {
    for (let k of m.keys) {
      let p = m.properties.find(p => p.name === k)!;
      if (valueFor(p, record[k], true) !== valueFor(p, keys[k], true))
        throw invalid(
          'SAP returned an entity whose keys do not match the requested resource. No success can be confirmed.'
        );
    }
  }
  private pageUrl(value: string, name: string): URL {
    let url: URL;
    try {
      url = new URL(value, `${this.origin}/odata/v2/`);
    } catch {
      throw invalid('The next-page URL is invalid.');
    }
    if (
      url.origin !== this.origin ||
      url.username ||
      url.password ||
      url.hash ||
      url.pathname !== `/odata/v2/${identifier(name)}` ||
      credentialVariants(this.token).some(s => value.includes(s))
    )
      throw invalid(
        'The next-page URL must target the same SAP API server and exact entity set.'
      );
    let allowed = new Set([
      '$format',
      '$filter',
      '$select',
      '$expand',
      '$orderby',
      '$inlinecount',
      '$top',
      '$skip',
      '$skiptoken',
      'paging',
      'customPageSize',
      'asOfDate',
      'fromDate',
      'toDate'
    ]);
    for (let k of url.searchParams.keys())
      if (!allowed.has(k) || url.searchParams.getAll(k).length !== 1)
        throw invalid('The next-page URL contains unsupported or duplicate parameters.');
    if (!url.searchParams.has('$skiptoken') && !url.searchParams.has('$skip'))
      throw invalid('Use the exact nextLink returned by a previous page.');
    return url;
  }
  async getEntity(
    name: string,
    key: string,
    options: QueryOptions = {}
  ): Promise<Record<string, unknown>> {
    let m = await this.entity(name);
    if (m.keys.length !== 1)
      throw invalid(
        'This entity requires compoundKeys. Call get_api_metadata to discover every key.'
      );
    return this.getEntityByCompoundKey(name, { [m.keys[0]!]: key }, options);
  }
  async getEntityByCompoundKey(
    name: string,
    keys: Keys,
    options: QueryOptions = {}
  ): Promise<Record<string, unknown>> {
    if (
      options.filter ||
      options.orderBy ||
      options.skip !== undefined ||
      options.inlineCount ||
      options.nextPage ||
      options.asOfDate ||
      options.fromDate ||
      options.toDate
    )
      throw invalid(
        'Keyed reads cannot use collection filters, count, pagination or effective-date selection. Put the effective date in the exact key.'
      );
    let m = await this.entity(name);
    let params = this.params(options, m);
    if (params.$select && params.$select !== '*')
      params.$select = [...new Set([...params.$select.split(','), ...m.keys])].join(',');
    let r = this.record(
      await this.request('get', `/${name}(${this.predicate(m, keys)})`, { params }),
      m
    );
    this.bind(r, m, keys);
    return r;
  }
  async queryEntities(name: string, options: QueryOptions = {}): Promise<Page> {
    let m = await this.entity(name);
    let params = this.params(options, m);
    let path = `/${name}`;
    if (options.nextPage) {
      let url = this.pageUrl(options.nextPage, name);
      for (let k of [
        '$filter',
        '$select',
        '$expand',
        '$orderby',
        'asOfDate',
        'fromDate',
        'toDate'
      ])
        if (params[k] !== undefined && params[k] !== url.searchParams.get(k))
          throw invalid(
            'The supplied query differs from the next-page URL. Reuse the exact original query or omit its optional fields.'
          );
      if (options.skip !== undefined) throw invalid('Do not combine nextPage with skip.');
      path = `${url.pathname.slice('/odata/v2'.length)}${url.search}`;
      params = {};
    }
    let data = await this.request('get', path, { params });
    if (
      !isApiErrorRecord(data) ||
      !isApiErrorRecord(data.d) ||
      !Array.isArray(data.d.results) ||
      data.d.results.some(r => !isApiErrorRecord(r))
    )
      throw invalid('SAP returned an invalid collection response.');
    let count: number | undefined;
    if (data.d.__count !== undefined) {
      let v = integer(data.d.__count);
      count = Number(v);
      if (!Number.isSafeInteger(count) || count < 0)
        throw invalid('SAP returned an invalid or unsafe total count.');
    }
    let nextLink: string | undefined;
    if (data.d.__next !== undefined) {
      if (typeof data.d.__next !== 'string')
        throw invalid('SAP returned an invalid continuation.');
      nextLink = this.pageUrl(data.d.__next, name).href;
    }
    return {
      results: data.d.results.map(r => this.cleanRecord(r, m)),
      count,
      nextLink,
      hasMore: nextLink !== undefined
    };
  }
  private fields(
    m: EntityMetadata,
    data: Record<string, unknown>,
    operation: 'create' | 'update'
  ) {
    if (!Object.keys(data).length) throw invalid('Provide at least one writable field.');
    let result: Record<string, unknown> = {};
    for (let [k, v] of Object.entries(data)) {
      identifier(k);
      let p = m.properties.find(p => p.name === k);
      if (
        !p?.[operation === 'create' ? 'creatable' : 'updatable'] ||
        /password|token|secret|assertion|privatekey|authorization|x509certificate|^api_?key$/i.test(
          k
        )
      )
        throw invalid(
          'A supplied field is unavailable, not writable or credential-bearing. Inspect get_api_metadata; nested/navigation writes are unsupported.'
        );
      if (p.required && v === null)
        throw invalid('Required writable fields cannot be null. Inspect get_api_metadata.');
      safeData(v, this.token);
      result[k] = valueFor(p, v);
    }
    if (operation === 'create')
      for (let p of m.properties)
        if (p.required && p.creatable && (!(p.name in result) || result[p.name] === null))
          throw invalid('Supply every required creatable field from get_api_metadata.');
    return result;
  }
  async createEntity(
    name: string,
    data: Record<string, unknown>,
    params: Record<string, string> = {}
  ): Promise<Record<string, unknown>> {
    let m = await this.entity(name);
    if (!m.creatable)
      throw invalid(
        'This entity does not support Insert. Use its documented SAP workflow; this tool does not silently substitute Upsert.'
      );
    let fields = this.fields(m, data, 'create');
    let keys = Object.fromEntries(m.keys.map(k => [k, fields[k]]));
    this.predicate(m, keys as Keys);
    try {
      let r = this.record(
        await this.request('post', `/${name}`, {
          params: { $format: 'json', ...params },
          data: fields
        }),
        m
      );
      this.bind(r, m, keys as Keys);
      return await this.confirm(name, m, keys as Keys, fields);
    } catch (error) {
      throw this.writeReceipt(error, name, keys as Keys);
    }
  }
  async updateEntityByCompoundKey(
    name: string,
    keys: Keys,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let m = await this.entity(name);
    if (!m.updatable)
      throw invalid('This entity does not support Merge. Use its documented SAP workflow.');
    let predicate = this.predicate(m, keys);
    let fields = this.fields(m, data, 'update');
    for (let k of m.keys)
      if (
        k in fields &&
        valueFor(m.properties.find(p => p.name === k)!, fields[k], true) !==
          valueFor(m.properties.find(p => p.name === k)!, keys[k], true)
      )
        throw invalid('An update cannot change its identifying keys.');
    await this.getEntityByCompoundKey(name, keys, { select: m.keys.join(',') });
    try {
      await this.request('post', `/${name}(${predicate})`, {
        params: { $format: 'json' },
        headers: { 'X-HTTP-METHOD': 'MERGE' },
        data: fields
      });
      return await this.confirm(name, m, keys, fields);
    } catch (error) {
      throw this.writeReceipt(error, name, keys);
    }
  }
  private writeReceipt(error: unknown, name: string, keys: Keys) {
    let e = upstream(error, 'write confirmation');
    e.data.entitySet = name;
    e.data.resourceKeys = safeData(keys, this.token);
    e.data.writeMayHaveOccurred = true;
    return e;
  }
  private async confirm(
    name: string,
    m: EntityMetadata,
    keys: Keys,
    fields: Record<string, unknown>
  ) {
    try {
      let record = await this.getEntityByCompoundKey(name, keys, {
        select: [...new Set([...m.keys, ...Object.keys(fields)])].join(',')
      });
      for (let [k, v] of Object.entries(fields)) {
        let p = m.properties.find(p => p.name === k)!;
        let actual = valueFor(p, record[k]);
        let matches =
          p.type === 'Edm.Decimal' && typeof actual === 'string' && typeof v === 'string'
            ? decimal(actual) === decimal(v)
            : actual === v;
        if (!matches) throw invalid('SAP did not confirm every requested field.');
      }
      return record;
    } catch {
      throw invalid(
        'SAP accepted the write, but its exact keys and requested fields could not be verified. Query the same keys before retrying; the write may already have taken effect.'
      );
    }
  }
  async validateToken() {
    let data = await this.request('get', `${this.origin}/oauth/validate`);
    if (
      !isApiErrorRecord(data) ||
      data.access_token !== this.token ||
      data.token_type !== 'Bearer'
    )
      throw invalid('SAP did not confirm the current bearer token. Reconnect.');
    if (
      (typeof data.expires_in !== 'number' &&
        (typeof data.expires_in !== 'string' || !/^\d+$/.test(data.expires_in))) ||
      !Number.isSafeInteger(Number(data.expires_in)) ||
      Number(data.expires_in) <= 0 ||
      !Number.isFinite(new Date(Date.now() + Number(data.expires_in) * 1000).getTime())
    )
      throw invalid('SAP returned an invalid remaining token lifetime. Reconnect.');
    let expiresAt = getOAuthExpiresAtFromExpiresIn(data.expires_in, {
      required: true,
      providerLabel: 'SAP SuccessFactors'
    });
    return {
      tokenValid: true as const,
      apiServerUrl: this.origin,
      tokenType: 'Bearer' as const,
      expiresAt: expiresAt!
    };
  }
  getEmployee(id: string, o?: QueryOptions) {
    return this.getEntity('User', id, o);
  }
  queryEmployees(o?: QueryOptions) {
    return this.queryEntities('User', o);
  }
  queryJobInfo(o?: QueryOptions) {
    return this.queryEntities('EmpJob', o);
  }
  queryCompensationInfo(o?: QueryOptions) {
    return this.queryEntities('EmpCompensation', o);
  }
  queryPositions(o?: QueryOptions) {
    return this.queryEntities('Position', o);
  }
  queryDepartments(o?: QueryOptions) {
    return this.queryEntities('FODepartment', o);
  }
  queryDivisions(o?: QueryOptions) {
    return this.queryEntities('FODivision', o);
  }
  queryCostCenters(o?: QueryOptions) {
    return this.queryEntities('FOCostCenter', o);
  }
  queryLocations(o?: QueryOptions) {
    return this.queryEntities('FOLocation', o);
  }
  queryCompanies(o?: QueryOptions) {
    return this.queryEntities('FOCompany', o);
  }
  queryJobRequisitions(o?: QueryOptions) {
    return this.queryEntities('JobRequisition', o);
  }
  getJobApplication(id: number, o?: QueryOptions) {
    return this.getEntityByCompoundKey('JobApplication', { applicationId: positiveId(id) }, o);
  }
  queryJobApplications(o?: QueryOptions) {
    return this.queryEntities('JobApplication', o);
  }
  queryTimeOff(o?: QueryOptions) {
    return this.queryEntities('EmployeeTime', o);
  }
  queryTimeAccounts(o?: QueryOptions) {
    return this.queryEntities('EmployeeTimeAccount', o);
  }
  createTimeOff(data: Record<string, unknown>, workflowConfirmed: boolean) {
    return this.createEntity('EmployeeTime', data, {
      workflowConfirmed: String(workflowConfirmed)
    });
  }
  queryGoalPlans(o?: QueryOptions) {
    return this.queryEntities('GoalPlanTemplate', o);
  }
  queryGoals(id: number, o?: QueryOptions) {
    return this.queryEntities(`Goal_${positiveId(id)}`, o);
  }
  queryPerformanceReviews(o?: QueryOptions) {
    return this.queryEntities('FormHeader', o);
  }
  getPerformanceReview(id: number, o?: QueryOptions) {
    return this.getEntityByCompoundKey('FormHeader', { formDataId: positiveId(id) }, o);
  }
  querySuccessionNominees(o?: QueryOptions) {
    return this.queryEntities('SuccessionNominee', o);
  }
  queryTalentPools(o?: QueryOptions) {
    return this.queryEntities('TalentPool', o);
  }
}
