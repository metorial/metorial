import { createAuthenticatedAxios, getResponseHeaderValue } from 'slates';
import {
  clean,
  type Document,
  fail,
  hosts,
  id,
  type Json,
  native,
  own,
  type Region,
  record,
  regionFor,
  string,
  token
} from './validation';

export type Resource =
  | 'connections'
  | 'flows'
  | 'exports'
  | 'imports'
  | 'integrations'
  | 'jobs'
  | 'ashares';
export class Client {
  readonly region: Region;
  readonly baseURL: string;
  private readonly secret: string;
  private readonly secrets: string[];
  constructor(auth: { token: unknown; region?: unknown }, config?: { region?: unknown }) {
    this.region = regionFor(auth, config);
    this.baseURL = `https://${hosts[this.region]}/v1`;
    this.secret = token(auth.token);
    this.secrets = [this.secret];
  }
  private remember(value: unknown, key = '', depth = 0): void {
    if (depth > 30 || !value) return;
    if (
      typeof value === 'string' &&
      /password|secret|credential|authorization|token|private.?key|api.?key|(^|\.)auth(\.|$)|authentication/i.test(
        key
      ) &&
      !/^(type|authType|mode|scope|scopes|name|region)$/i.test(key.split('.').at(-1) ?? '') &&
      value.length >= 4
    )
      this.secrets.push(value);
    else if (typeof value === 'object')
      for (const [k, d] of Object.entries(Object.getOwnPropertyDescriptors(value)))
        if ('value' in d) this.remember(d.value, key ? `${key}.${k}` : k, depth + 1);
  }
  private safeRecovery(value: Document): Document {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => {
        try {
          return [key, clean(entry, this.secrets)];
        } catch {
          return [key, '[withheld]'];
        }
      })
    );
  }
  private adapt(error: unknown, method: string, recovery?: Document) {
    const response = own(error, 'response');
    const data = own(error, 'data') ?? own(own(error, 'error'), 'data');
    const rawStatus =
      own(response, 'status') ??
      own(own(data, 'upstream'), 'status') ??
      own(data, 'upstreamStatus');
    const status =
      typeof rawStatus === 'number' && rawStatus >= 100 && rawStatus <= 599
        ? rawStatus
        : undefined;
    const advice =
      status === 401
        ? 'Reconnect with a valid token issued in this region and environment.'
        : status === 403
          ? 'The token lacks access. Check its resource capabilities or the personal token owner’s permissions.'
          : status === 404
            ? 'The resource is absent or hidden from this token; verify its region, environment and native ID.'
            : status === 409
              ? 'Read the latest resource and explicitly reapply your change.'
              : status === 429
                ? 'Wait for the provider rate limit before trying again.'
                : 'Check Celigo and reconcile the resource before trying again.';
    return fail(
      `Celigo request failed. ${advice}${method !== 'GET' ? ' The operation may have taken effect; do not blindly repeat it.' : ''}`,
      {
        upstreamStatus: status,
        outcomeUncertain: method !== 'GET',
        ...(recovery ? { recovery: this.safeRecovery(recovery) } : {})
      }
    );
  }
  async request(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    params?: Record<string, string | number>,
    statuses = [200],
    recovery?: Document
  ) {
    this.remember(body);
    clean(path, this.secrets);
    if (params) clean(params, this.secrets);
    const ax = createAuthenticatedAxios({
      baseURL: this.baseURL,
      authHeader: { value: `Bearer ${this.secret}` },
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 16 * 1024 * 1024,
      maxBodyLength: 16 * 1024 * 1024,
      errorAdapter: error => this.adapt(error, method, recovery)
    });
    let reportedResourceIds: string[] = [];
    try {
      const response = await ax.request<unknown>({ method, url: path, data: body, params });
      if (!statuses.includes(response.status))
        throw fail(
          'Celigo returned an unexpected status. Reconcile the outcome before repeating a write.',
          { upstreamStatus: response.status, outcomeUncertain: method !== 'GET', recovery }
        );
      if (method !== 'GET') {
        const entries = Array.isArray(response.data) ? response.data : [response.data];
        reportedResourceIds = entries.slice(0, 1000).flatMap(value => {
          const valueId = own(value, '_id') ?? own(own(value, 'doc'), '_id');
          return typeof valueId === 'string' && /^[a-f\d]{24}$/i.test(valueId)
            ? [id(valueId)]
            : [];
        });
      }
      const data =
        response.status === 204 || response.data === '' || response.data === undefined
          ? null
          : clean(response.data, this.secrets);
      for (const name of Object.keys(response.headers)) {
        const value = getResponseHeaderValue(response.headers, name);
        if (value) clean(value, this.secrets);
      }
      const link = getResponseHeaderValue(response.headers, 'link');
      if (link) clean(link, this.secrets);
      return { data, status: response.status, link };
    } catch (error) {
      throw this.adapt(
        error,
        method,
        reportedResourceIds.length ? { ...recovery, reportedResourceIds } : recovery
      );
    }
  }
  private confirm(value: unknown, recovery: Document, expected?: string) {
    try {
      return native(value, expected);
    } catch {
      throw fail(
        'The write may have taken effect, but its native receipt could not be verified. Reconcile the retained resource before repeating.',
        { outcomeUncertain: true, recovery: this.safeRecovery(recovery) }
      );
    }
  }

  continuation(
    value: string,
    path: string,
    fixed: Record<string, string | number> = {},
    mode: 'link' | 'errors' = 'link'
  ) {
    string(value, 'next page URL');
    clean(value, this.secrets);
    let url: URL;
    try {
      url = new URL(value, `${this.baseURL}/`);
    } catch {
      throw fail('Celigo returned an invalid next page URL.');
    }
    if (mode === 'errors' && url.pathname.startsWith('/api/v1/'))
      url.pathname = url.pathname.slice(4);
    if (
      url.origin !== new URL(this.baseURL).origin ||
      url.username ||
      url.password ||
      url.hash ||
      url.pathname !== `/v1${path}`
    )
      throw fail('The next page URL does not belong to this region and resource.');
    const allowed = new Set([
      ...Object.keys(fixed),
      ...(mode === 'link'
        ? ['after', 'limit']
        : ['after', 'limit', 'occurredAt_gte', 'occurredAt_lte', '_flowJobId', 'skip'])
    ]);
    for (const [key] of url.searchParams)
      if (!allowed.has(key) || url.searchParams.getAll(key).length !== 1)
        throw fail('The next page URL contains unsupported parameters.');
    for (const [key, val] of Object.entries(fixed))
      if (url.searchParams.get(key) !== String(val))
        throw fail('The next page URL changed the requested filters.');
    return url.toString();
  }
  async list(
    resource: Resource,
    params: Record<string, string | number> = {},
    pageUrl?: string
  ) {
    const path = `/${resource}`;
    const response = await this.request(
      'GET',
      pageUrl ? this.continuation(pageUrl, path, params) : path,
      undefined,
      pageUrl ? undefined : params,
      [200, 204]
    );
    const docs = response.data === null ? [] : response.data;
    if (!Array.isArray(docs)) throw fail('Celigo returned an invalid resource list.');
    const seen = new Set<string>();
    const items = docs.map(v => {
      const doc = native(v);
      const key = id(doc._id);
      if (seen.has(key)) throw fail('Celigo returned duplicate resource IDs.');
      seen.add(key);
      return doc;
    });
    const links = response.link?.match(/<([^>]+)>\s*;\s*rel=["']?next["']?/g) ?? [];
    if (links.length > 1) throw fail('Celigo returned conflicting pagination links.');
    const raw = links[0]?.match(/<([^>]+)>/)?.[1];
    const nextPageUrl = raw ? this.continuation(raw, path, params) : undefined;
    if (
      nextPageUrl &&
      (!items.length || (pageUrl && nextPageUrl === this.continuation(pageUrl, path, params)))
    )
      throw fail('Celigo pagination made no progress.');
    return { items, nextPageUrl };
  }
  async get(resource: Resource, resourceId: string) {
    return native(
      (await this.request('GET', `/${resource}/${id(resourceId)}`)).data,
      resourceId
    );
  }
  async create(resource: Resource, body: Document) {
    const response = await this.request('POST', `/${resource}`, body, undefined, [201], {
      resource,
      name: typeof body.name === 'string' ? body.name : null,
      externalId: typeof body.externalId === 'string' ? body.externalId : null
    });
    const recovery: Document = {
      region: this.region,
      resource,
      name: typeof body.name === 'string' ? body.name : null,
      externalId: typeof body.externalId === 'string' ? body.externalId : null
    };
    if (
      response.data &&
      typeof response.data === 'object' &&
      !Array.isArray(response.data) &&
      typeof response.data._id === 'string' &&
      /^[a-f\d]{24}$/i.test(response.data._id)
    )
      recovery.resourceId = id(response.data._id);
    const doc = this.confirm(response.data, recovery);
    if (typeof body.name === 'string' && doc.name !== body.name)
      throw fail(
        'Creation returned an inconsistent name. Reconcile the reported native resource before repeating.',
        { outcomeUncertain: true, recovery: this.safeRecovery(recovery) }
      );
    return doc;
  }
  async update(resource: Resource, resourceId: string, body: Document, replaceAll?: boolean) {
    const target = id(resourceId);
    await this.get(resource, target);
    if (!replaceAll)
      throw fail(
        'Celigo PUT replaces the complete document. Supply the complete writable configuration and set replaceAll to true; omitted fields, including credentials, may be cleared.'
      );
    const response = await this.request(
      'PUT',
      `/${resource}/${target}`,
      body,
      undefined,
      [200],
      { resource, resourceId: target }
    );
    const doc = this.confirm(
      response.data,
      { region: this.region, resource, resourceId: target },
      target
    );
    if (typeof body.name === 'string' && doc.name !== body.name)
      throw fail(
        'The returned native configuration does not confirm the requested name. Reconcile the retained resource before repeating the update.',
        {
          outcomeUncertain: true,
          recovery: { region: this.region, resource, resourceId: target }
        }
      );
    return doc;
  }

  async toggleFlow(flowId: string, disabled: boolean) {
    const target = id(flowId);
    await this.get('flows', target);
    await this.request(
      'PATCH',
      `/flows/${target}`,
      [{ op: 'replace', path: '/disabled', value: disabled }],
      undefined,
      [204],
      { resource: 'flows', resourceId: target }
    );
    let doc: Document;
    try {
      doc = await this.get('flows', target);
    } catch (error) {
      throw this.adapt(error, 'PATCH', { resource: 'flows', resourceId: target });
    }
    if (doc.disabled !== disabled)
      throw fail(
        'The requested flow state was not confirmed. Reconcile it before repeating the change.',
        { resourceId: target, outcomeUncertain: true }
      );
    return doc;
  }
  async remove(resource: Resource, resourceId: string) {
    const target = id(resourceId);
    await this.get(resource, target);
    await this.request('DELETE', `/${resource}/${target}`, undefined, undefined, [204], {
      resource,
      resourceId: target
    });
    return { _id: target, deleted: true };
  }
  async clone(resource: Resource, resourceId: string, options: Document) {
    const target = id(resourceId);
    await this.get(resource, target);
    if (resource === 'flows') id(options._integrationId, 'destination integration ID');
    if (
      (resource === 'flows' || resource === 'integrations') &&
      (!options.connectionMap ||
        typeof options.connectionMap !== 'object' ||
        Array.isArray(options.connectionMap))
    )
      throw fail(
        'Provide documented cloneOptions.connectionMap explicitly. Flow clones also require _integrationId.'
      );
    const result = (
      await this.request(
        'POST',
        `/${resource}/${target}/clone`,
        options,
        undefined,
        resource === 'integrations' ? [200] : [201],
        {
          sourceId: target,
          resource,
          name: typeof options.name === 'string' ? options.name : null
        }
      )
    ).data;
    const reported = (Array.isArray(result) ? result : [result]).flatMap(value =>
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof value._id === 'string' &&
      /^[a-f\d]{24}$/i.test(value._id)
        ? [
            {
              resourceId: id(value._id),
              model: typeof value.model === 'string' ? value.model : null
            }
          ]
        : []
    );
    try {
      if (Array.isArray(result)) {
        const models: Record<string, string> = {
          flows: 'flow',
          exports: 'export',
          imports: 'import',
          integrations: 'integration'
        };
        const entries = result.map(v => native(v));
        const candidates = entries.filter(
          v => typeof v.model === 'string' && v.model.toLowerCase() === models[resource]
        );
        if (candidates.length !== 1)
          throw fail(
            'The clone created resources but its manifest does not identify exactly one target. Reconcile the retained resources before repeating.',
            {
              outcomeUncertain: true,
              createdResources: entries.map(v => ({ id: v._id, model: v.model }))
            }
          );
        if (id(candidates[0]!._id) === target)
          throw fail(
            'The clone response identifies the source resource. Reconcile before repeating.',
            { outcomeUncertain: true }
          );
        return { ...candidates[0]!, createdResources: entries };
      }
      const doc = native(result);
      if (id(doc._id) === target)
        throw fail('The clone did not identify a distinct resource.', {
          outcomeUncertain: true
        });
      return doc;
    } catch {
      throw fail(
        'Clone resources may exist, but the native clone receipt was not verified. Reconcile reported IDs and the source before repeating.',
        {
          outcomeUncertain: true,
          recovery: this.safeRecovery({
            region: this.region,
            resource,
            sourceId: target,
            name: typeof options.name === 'string' ? options.name : null,
            reportedCreatedResources: reported
          })
        }
      );
    }
  }

  async tokenInfo() {
    const doc = record((await this.request('GET', '/tokenInfo')).data);
    id(doc._userId, 'token owner ID');
    return doc;
  }
  async ping(connectionId: string) {
    await this.get('connections', connectionId);
    const doc = record(
      (await this.request('GET', `/connections/${id(connectionId)}/ping`)).data
    );
    if (doc.code !== 200)
      throw fail(
        'The saved connection check failed. Review its credentials and network settings in Celigo.'
      );
    return doc;
  }
  async assertStep(flowId: string, processorId: string) {
    const flow = await this.get('flows', flowId);
    const target = id(processorId, 'processor ID');
    let found = false;
    const walk = (v: Json | undefined): void => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') {
        if (v._exportId === target || v._importId === target) found = true;
        for (const k of ['pageGenerators', 'pageProcessors', 'routers', 'branches'])
          walk(v[k]);
      }
    };
    for (const k of ['pageGenerators', 'pageProcessors', 'routers']) walk(flow[k]);
    if (!found) throw fail('The processor is not a native step of the requested flow.');
  }
  async errors(
    flowId: string,
    processorId: string,
    params: Record<string, string> = {},
    pageUrl?: string
  ) {
    await this.assertStep(flowId, processorId);
    const path = `/flows/${id(flowId)}/${id(processorId)}/errors`;
    const doc = record(
      (
        await this.request(
          'GET',
          pageUrl ? this.continuation(pageUrl, path, params, 'errors') : path,
          undefined,
          pageUrl ? undefined : params
        )
      ).data
    );
    if (!Array.isArray(doc.errors)) throw fail('Celigo returned an invalid error page.');
    if (doc.nextPageURL !== undefined)
      doc.nextPageURL = this.continuation(string(doc.nextPageURL), path, params, 'errors');
    return doc;
  }
  async errorAction(
    action: 'resolve' | 'retry',
    flowId: string,
    processorId: string,
    keys: string[]
  ) {
    if (!keys.length || new Set(keys).size !== keys.length)
      throw fail('Provide a nonempty list of distinct native error IDs or retry keys.');
    keys.forEach(k => string(k));
    const remaining = new Set(keys);
    let pageUrl: string | undefined;
    const seen = new Set<string>();
    for (let pages = 0; pages < 50; pages++) {
      const page = await this.errors(flowId, processorId, {}, pageUrl);
      for (const v of page.errors as Json[]) {
        const doc = record(v);
        const key = action === 'resolve' ? doc.errorId : doc.retryDataKey;
        if (typeof key === 'string') remaining.delete(key);
      }
      pageUrl = typeof page.nextPageURL === 'string' ? page.nextPageURL : undefined;
      if (!remaining.size) break;
      if (!pageUrl)
        throw fail('One or more error IDs or retry keys are not in the requested flow step.');
      if (seen.has(pageUrl)) throw fail('Error pagination made no progress.');
      seen.add(pageUrl);
    }
    if (remaining.size)
      throw fail(
        'Error ownership could not be proven within 50 pages. No write was performed.'
      );
    const path = `/flows/${id(flowId)}/${id(processorId)}/${action === 'resolve' ? 'resolved' : 'retry'}`;
    const r = await this.request(
      action === 'resolve' ? 'PUT' : 'POST',
      path,
      action === 'resolve' ? { errors: keys } : { retryDataKeys: keys },
      undefined,
      action === 'resolve' ? [204] : [200, 204],
      { flowId: id(flowId), processorId: id(processorId) }
    );
    return action === 'resolve'
      ? { resolved: true }
      : r.status === 204
        ? { retried: false }
        : {
            retried: true,
            job: this.confirm(r.data, { flowId: id(flowId), processorId: id(processorId) })
          };
  }
  statePath(resourceType?: string, resourceId?: string, key?: string) {
    if ((resourceType === undefined) !== (resourceId === undefined))
      throw fail('Provide both resourceType and resourceId, or neither for global state.');
    if (
      resourceType !== undefined &&
      !['exports', 'imports', 'integrations'].includes(resourceType)
    )
      throw fail('Resource state supports only exports, imports, and integrations.');
    return `${resourceType === undefined ? '' : `/${resourceType}/${id(resourceId)}`}/state${key === undefined ? '' : `/${encodeURIComponent(string(key, 'state key'))}`}`;
  }
  async state(
    action: 'list_keys' | 'get' | 'set' | 'delete',
    key?: string,
    value?: Document,
    resourceType?: string,
    resourceId?: string
  ) {
    const path = this.statePath(
      resourceType,
      resourceId,
      action === 'list_keys' ? undefined : key
    );
    if (action !== 'list_keys' && key === undefined)
      throw fail('Provide a state key for this action.');
    if (resourceType) await this.get(resourceType as Resource, id(resourceId));
    if (action === 'list_keys') {
      const r = await this.request('GET', path, undefined, undefined, [200, 204]);
      if (r.data === null) return { keys: [] };
      const doc = record(r.data);
      if (!Array.isArray(doc.keys) || doc.keys.some(k => typeof k !== 'string'))
        throw fail('Celigo returned an invalid state key list.');
      return { keys: doc.keys };
    }
    if (action === 'get') return { stateValue: (await this.request('GET', path)).data };
    if (action === 'set') {
      if (!value || !Object.keys(value).length)
        throw fail('Provide a nonempty JSON object as stateValue.');
      const expected = clean(value, this.secrets);
      await this.request('PUT', path, value, undefined, [200, 201], {
        key: key ?? null,
        resourceType: resourceType ?? null,
        resourceId: resourceId ?? null
      });
      let actual: Json;
      try {
        actual = (await this.request('GET', path)).data;
      } catch (error) {
        throw this.adapt(error, 'PUT', {
          key: key ?? null,
          resourceType: resourceType ?? null,
          resourceId: resourceId ?? null
        });
      }
      if (JSON.stringify(canonical(actual)) !== JSON.stringify(canonical(expected)))
        throw fail('The stored state was not confirmed. Reconcile before repeating.', {
          outcomeUncertain: true
        });
      return { updated: true };
    }
    await this.request('GET', path);
    await this.request('DELETE', path, undefined, undefined, [204], {
      key: key ?? null,
      resourceType: resourceType ?? null,
      resourceId: resourceId ?? null
    });
    return { deleted: true };
  }
}

function canonical(value: Json): Json {
  return Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map(k => [k, canonical(value[k]!)])
        )
      : value;
}
