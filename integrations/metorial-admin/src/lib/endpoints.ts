import { metorialValidationError } from './errors';

export let METORIAL_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

export type MetorialMethod = (typeof METORIAL_METHODS)[number];

export type MetorialIntrospectionPath = {
  path: string;
  sdkPath?: string;
};

export type MetorialIntrospectionController = {
  id: string;
  name?: string;
  description?: string;
  category?: unknown;
  deprecated?: boolean;
  hideInDocs?: boolean;
  [key: string]: unknown;
};

export type MetorialIntrospectionType = {
  id: string;
  name?: string;
  type?: unknown;
  [key: string]: unknown;
};

export type MetorialIntrospectionEndpoint = {
  id?: string;
  controllerId: string;
  allPaths?: MetorialIntrospectionPath[];
  path?: string;
  method: string;
  name?: string;
  description?: string;
  deprecated?: boolean;
  hideInDocs?: boolean;
  confidential?: boolean;
  outputId?: string | null;
  queryId?: string | null;
  bodyId?: string | null;
  [key: string]: unknown;
};

export type MetorialIntrospectionDocs = {
  version?: string;
  controllers?: MetorialIntrospectionController[];
  endpoints?: MetorialIntrospectionEndpoint[];
  types?: MetorialIntrospectionType[];
};

export type MetorialEndpoint = {
  method: MetorialMethod;
  path: string;
  name?: string;
  description?: string;
  controller?: Record<string, unknown>;
  pathParameters: string[];
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ListMetorialEndpointsOptions = {
  method?: MetorialMethod;
  search?: string;
  limit?: number;
  offset?: number;
  includeSchemas?: boolean;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let stripKeys = <T extends Record<string, unknown>>(value: T, keys: string[]) => {
  let output: Record<string, unknown> = {};

  for (let [key, item] of Object.entries(value)) {
    if (!keys.includes(key) && item !== undefined) output[key] = item;
  }

  return output;
};

let asTypeRecord = (value: unknown) =>
  isRecord(value) ? stripKeys(value, ['id']) : undefined;

export let extractPathParameters = (path: string) => {
  let params = new Set<string>();

  for (let match of path.matchAll(/:([A-Za-z0-9_]+)/g)) {
    let param = match[1];
    if (param) params.add(param);
  }

  return [...params];
};

let normalizeMethod = (method: string): MetorialMethod | null => {
  let normalized = method.toLowerCase();
  return METORIAL_METHODS.includes(normalized as MetorialMethod)
    ? (normalized as MetorialMethod)
    : null;
};

let selectDashboardInstancePath = (endpoint: MetorialIntrospectionEndpoint) =>
  endpoint.allPaths?.find(item => item.path.startsWith('/dashboard/instances/'));

export let buildMetorialEndpoints = (
  docs: MetorialIntrospectionDocs,
  options: { includeSchemas?: boolean } = {}
) => {
  let controllerMap = new Map(
    (docs.controllers ?? []).map(controller => [controller.id, controller] as const)
  );
  let typesMap = new Map((docs.types ?? []).map(type => [type.id, type] as const));
  let endpoints: MetorialEndpoint[] = [];

  for (let endpoint of docs.endpoints ?? []) {
    let controller = controllerMap.get(endpoint.controllerId);
    let method = normalizeMethod(endpoint.method);
    let selectedPath = selectDashboardInstancePath(endpoint);
    let deprecated = endpoint.deprecated === true || controller?.deprecated === true;
    let hideInDocs = endpoint.hideInDocs === true || controller?.hideInDocs === true;
    let confidential = endpoint.confidential === true;

    if (!controller || !method || !selectedPath || deprecated || hideInDocs || confidential)
      continue;

    let output = stripKeys(endpoint, [
      'id',
      'controllerId',
      'allPaths',
      'deprecated',
      'hideInDocs',
      'confidential',
      'outputId',
      'queryId',
      'bodyId'
    ]) as MetorialEndpoint;

    output.method = method;
    output.path = selectedPath.path;
    output.controller = stripKeys(controller, ['id', 'category', 'deprecated', 'hideInDocs']);
    output.pathParameters = extractPathParameters(selectedPath.path);

    if (options.includeSchemas) {
      let query = endpoint.queryId ? typesMap.get(endpoint.queryId) : undefined;
      let body = endpoint.bodyId ? typesMap.get(endpoint.bodyId) : undefined;
      let cleanQuery = asTypeRecord(query);
      let cleanBody = asTypeRecord(body);

      if (cleanQuery) output.query = cleanQuery;
      if (cleanBody) output.body = cleanBody;
    }

    endpoints.push(output);
  }

  return endpoints;
};

let endpointMatchesSearch = (endpoint: MetorialEndpoint, search: string) => {
  let normalized = search.trim().toLowerCase();
  if (!normalized) return true;

  let controller = endpoint.controller;
  let haystack = [
    endpoint.path,
    endpoint.method,
    endpoint.name,
    endpoint.description,
    typeof controller?.name === 'string' ? controller.name : undefined,
    typeof controller?.description === 'string' ? controller.description : undefined
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalized);
};

export let listMetorialEndpoints = (
  docs: MetorialIntrospectionDocs,
  options: ListMetorialEndpointsOptions = {}
) => {
  let offset = Math.max(0, options.offset ?? 0);
  let limit = Math.min(200, Math.max(1, options.limit ?? 50));
  let endpoints = buildMetorialEndpoints(docs, {
    includeSchemas: options.includeSchemas
  }).filter(endpoint => {
    if (options.method && endpoint.method !== options.method) return false;
    if (options.search && !endpointMatchesSearch(endpoint, options.search)) return false;
    return true;
  });

  return {
    endpoints: endpoints.slice(offset, offset + limit),
    total: endpoints.length,
    limit,
    offset
  };
};

export let resolveMetorialEndpointForCall = (
  docs: MetorialIntrospectionDocs,
  input: { method: MetorialMethod; endpointPath: string }
) => {
  let endpoints = buildMetorialEndpoints(docs, { includeSchemas: true });
  let pathMatches = endpoints.filter(endpoint => endpoint.path === input.endpointPath);

  if (pathMatches.length > 0) {
    let methodMatch = pathMatches.find(endpoint => endpoint.method === input.method);
    if (methodMatch) return methodMatch;

    throw metorialValidationError(
      `Metorial endpoint ${input.endpointPath} exists but does not support method ${input.method}.`
    );
  }

  throw metorialValidationError(`Unknown Metorial endpoint: ${input.endpointPath}`);
};

export let buildMetorialEndpointPath = (
  endpoint: MetorialEndpoint,
  input: { instanceId: string; pathParams?: Record<string, string> }
) => {
  if (!endpoint.path.startsWith('/dashboard/instances/')) {
    throw metorialValidationError(
      `Metorial endpoint ${endpoint.path} is not a dashboard instance endpoint.`
    );
  }

  return endpoint.path.replace(/:([A-Za-z0-9_]+)/g, (_match, name: string) => {
    let value = name === 'instanceId' ? input.instanceId : input.pathParams?.[name];

    if (!value) {
      throw metorialValidationError(
        `Missing path parameter "${name}" for Metorial endpoint ${endpoint.path}.`
      );
    }

    return encodeURIComponent(value);
  });
};
