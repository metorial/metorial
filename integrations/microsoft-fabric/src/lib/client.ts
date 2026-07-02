import { createAxios } from '@slates/provider';
import type { FabricRuntimeConfig } from '../config';
import { fabricApiError, fabricValidationError } from './errors';
import { encodeOneLakePath, encodePathSegment, validateOneLakePath } from './paths';

type HttpClient = ReturnType<typeof createAxios>;

type HttpResponse<T = unknown> = {
  status: number;
  statusText?: string;
  data: T;
  headers?: Record<string, unknown>;
};

export type OperationMetadata = {
  status: number;
  statusText?: string;
  location?: string;
  operationId?: string;
  retryAfter?: string;
};

export type PaginatedResult<T = unknown> = {
  items: T[];
  continuationToken?: string;
  pageCount: number;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let asString = (value: unknown) => (typeof value === 'string' ? value : undefined);

let getHeader = (headers: Record<string, unknown> | undefined, name: string) => {
  if (!headers) return undefined;

  let direct = asString(headers[name]);
  if (direct) return direct;

  let lower = name.toLowerCase();
  for (let [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) return asString(value);
  }

  return undefined;
};

export let extractOperationMetadata = (response: HttpResponse): OperationMetadata => ({
  status: response.status,
  statusText: response.statusText,
  location: getHeader(response.headers, 'location'),
  operationId: getHeader(response.headers, 'x-ms-operation-id'),
  retryAfter: getHeader(response.headers, 'retry-after')
});

export let responseDataToBuffer = (data: unknown) => {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  if (typeof data === 'string') return Buffer.from(data, 'utf8');

  return Buffer.from(JSON.stringify(data ?? {}), 'utf8');
};

let responseDataToText = (data: unknown) => {
  if (typeof data === 'string') return data;
  return responseDataToBuffer(data).toString('utf8');
};

let normalizeItems = (data: unknown) => {
  if (!isRecord(data)) return [];
  if (Array.isArray(data.value)) return data.value;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.paths)) return data.paths;
  return [];
};

let normalizeContinuationToken = (data: unknown) =>
  isRecord(data) ? asString(data.continuationToken) : undefined;

let parseStorageListXml = (xml: string) => {
  let entries: Record<string, string>[] = [];
  let blobMatches = xml.matchAll(/<(Blob|Path)>([\s\S]*?)<\/\1>/g);

  for (let match of blobMatches) {
    let body = match[2] ?? '';
    let entry: Record<string, string> = {};
    for (let field of [
      'Name',
      'Path',
      'Url',
      'Content-Length',
      'Content-Type',
      'Last-Modified'
    ]) {
      let fieldMatch = body.match(new RegExp(`<${field}>([\\s\\S]*?)<\\/${field}>`));
      if (fieldMatch?.[1]) entry[field] = fieldMatch[1];
    }
    if (Object.keys(entry).length > 0) entries.push(entry);
  }

  return entries;
};

let compactRecord = (value: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  );

let rejectMutuallyExclusivePayloads = (input: {
  definition?: unknown;
  creationPayload?: unknown;
}) => {
  if (input.definition !== undefined && input.creationPayload !== undefined) {
    throw fabricValidationError('Use either definition or creationPayload, not both.');
  }
};

type FabricCreateItemInput = {
  workspaceId: string;
  displayName: string;
  itemType: string;
  description?: string;
  definition?: unknown;
  creationPayload?: unknown;
  folderId?: string;
  sensitivityLabelSettings?: unknown;
};

type FabricCreateDataFactoryItemInput = {
  workspaceId: string;
  displayName: string;
  description?: string;
  definition?: unknown;
  folderId?: string;
  sensitivityLabelSettings?: unknown;
};

type FabricListDataFactoryItemsInput = {
  workspaceId: string;
  continuationToken?: string;
  recursive?: boolean;
  rootFolderId?: string;
};

type FabricRunDataPipelineInput = {
  workspaceId: string;
  pipelineId: string;
  jobType?: string;
  executionData?: unknown;
  parameters?: Array<{
    name: string;
    value: unknown;
    type: string;
  }>;
};

export class FabricClient {
  private http: HttpClient;

  constructor(input: { token: string; config: FabricRuntimeConfig }) {
    this.http = createAxios({
      baseURL: input.config.fabricApiBaseUrl,
      headers: {
        Authorization: `Bearer ${input.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private async request<T>(operation: string, options: Record<string, unknown>) {
    try {
      return (await this.http.request(options)) as HttpResponse<T>;
    } catch (error) {
      throw fabricApiError(error, operation);
    }
  }

  async listPaginated<T>(
    path: string,
    input: {
      params?: Record<string, unknown>;
      continuationToken?: string;
      pageLimit?: number;
    } = {}
  ): Promise<PaginatedResult<T>> {
    let items: T[] = [];
    let continuationToken = input.continuationToken;
    let pageCount = 0;

    do {
      let response = await this.request<Record<string, unknown>>(`list ${path}`, {
        method: 'GET',
        url: path,
        params: compactRecord({
          ...input.params,
          continuationToken
        })
      });

      items.push(...(normalizeItems(response.data) as T[]));
      continuationToken = normalizeContinuationToken(response.data);
      pageCount += 1;
    } while (continuationToken && (!input.pageLimit || pageCount < input.pageLimit));

    return { items, continuationToken, pageCount };
  }

  async createItem(input: FabricCreateItemInput) {
    rejectMutuallyExclusivePayloads(input);

    let response = await this.request('create Fabric item', {
      method: 'POST',
      url: `/workspaces/${encodeURIComponent(input.workspaceId)}/items`,
      data: compactRecord({
        displayName: input.displayName,
        type: input.itemType,
        description: input.description,
        definition: input.definition,
        creationPayload: input.creationPayload,
        folderId: input.folderId,
        sensitivityLabelSettings: input.sensitivityLabelSettings
      })
    });

    return {
      item: response.data,
      operation: extractOperationMetadata(response)
    };
  }

  async listDataPipelines(input: FabricListDataFactoryItemsInput) {
    return await this.listPaginated(
      `/workspaces/${encodeURIComponent(input.workspaceId)}/dataPipelines`,
      {
        continuationToken: input.continuationToken,
        params: {
          recursive: input.recursive,
          rootFolderId: input.rootFolderId
        }
      }
    );
  }

  async createDataPipeline(input: FabricCreateDataFactoryItemInput) {
    let response = await this.request('create Data Pipeline', {
      method: 'POST',
      url: `/workspaces/${encodeURIComponent(input.workspaceId)}/dataPipelines`,
      data: compactRecord({
        displayName: input.displayName,
        description: input.description,
        definition: input.definition,
        folderId: input.folderId,
        sensitivityLabelSettings: input.sensitivityLabelSettings
      })
    });

    return {
      pipeline: response.data,
      operation: extractOperationMetadata(response)
    };
  }

  async getDataPipeline(workspaceId: string, pipelineId: string) {
    let response = await this.request('get Data Pipeline', {
      method: 'GET',
      url: `/workspaces/${encodeURIComponent(workspaceId)}/dataPipelines/${encodeURIComponent(
        pipelineId
      )}`
    });
    return response.data;
  }

  async runDataPipeline(input: FabricRunDataPipelineInput) {
    let body = compactRecord({
      executionData: input.executionData,
      parameters: input.parameters
    });

    let response = await this.request('run Data Pipeline', {
      method: 'POST',
      url: `/workspaces/${encodeURIComponent(input.workspaceId)}/items/${encodeURIComponent(
        input.pipelineId
      )}/jobs/${encodeURIComponent(input.jobType ?? 'DefaultJob')}/instances`,
      data: Object.keys(body).length > 0 ? body : undefined
    });

    return {
      result: response.data,
      operation: extractOperationMetadata(response)
    };
  }

  async listDataflows(input: FabricListDataFactoryItemsInput) {
    return await this.listPaginated(
      `/workspaces/${encodeURIComponent(input.workspaceId)}/dataflows`,
      {
        continuationToken: input.continuationToken,
        params: {
          recursive: input.recursive,
          rootFolderId: input.rootFolderId
        }
      }
    );
  }

  async createDataflow(input: FabricCreateDataFactoryItemInput) {
    let response = await this.request('create Dataflow', {
      method: 'POST',
      url: `/workspaces/${encodeURIComponent(input.workspaceId)}/dataflows`,
      data: compactRecord({
        displayName: input.displayName,
        description: input.description,
        definition: input.definition,
        folderId: input.folderId,
        sensitivityLabelSettings: input.sensitivityLabelSettings
      })
    });

    return {
      dataflow: response.data,
      operation: extractOperationMetadata(response)
    };
  }

  async executeDataflowQuery(input: {
    workspaceId: string;
    dataflowId: string;
    queryName: string;
    customMashupDocument?: string;
  }) {
    let response = await this.request('execute Dataflow query', {
      method: 'POST',
      url: `/workspaces/${encodeURIComponent(input.workspaceId)}/dataflows/${encodeURIComponent(
        input.dataflowId
      )}/executeQuery`,
      data: compactRecord({
        queryName: input.queryName,
        customMashupDocument: input.customMashupDocument
      }),
      responseType: 'arraybuffer'
    });

    let contentType =
      getHeader(response.headers, 'content-type') ?? 'application/octet-stream';
    let buffer = responseDataToBuffer(response.data);

    return {
      status: response.status,
      contentType,
      size: buffer.byteLength,
      base64: response.status === 202 ? undefined : buffer.toString('base64'),
      operation: extractOperationMetadata(response)
    };
  }
}

export class OneLakeClient {
  private api: HttpClient;
  private dfs: HttpClient;
  private blob: HttpClient;
  private table: HttpClient;

  constructor(input: { token: string; config: FabricRuntimeConfig }) {
    let headers = {
      Authorization: `Bearer ${input.token}`,
      'x-ms-version': '2023-11-03'
    };

    this.api = createAxios({ baseURL: input.config.oneLakeApiBaseUrl, headers });
    this.dfs = createAxios({ baseURL: input.config.oneLakeDfsBaseUrl, headers });
    this.blob = createAxios({ baseURL: input.config.oneLakeBlobBaseUrl, headers });
    this.table = createAxios({ baseURL: input.config.oneLakeTableBaseUrl, headers });
  }

  private async request<T>(
    client: HttpClient,
    operation: string,
    options: Record<string, unknown>
  ) {
    try {
      return (await client.request(options)) as HttpResponse<T>;
    } catch (error) {
      throw fabricApiError(error, operation);
    }
  }

  async listWorkspaces(input: { continuationToken?: string } = {}) {
    let response = await this.request<Record<string, unknown>>(
      this.api,
      'list OneLake workspaces',
      {
        method: 'GET',
        url: '/workspaces',
        params: compactRecord({ continuationToken: input.continuationToken })
      }
    );

    return {
      workspaces: normalizeItems(response.data),
      continuationToken: normalizeContinuationToken(response.data),
      raw: response.data
    };
  }

  async listItems(input: { workspace: string; continuationToken?: string }) {
    let response = await this.request<Record<string, unknown>>(
      this.api,
      'list OneLake items',
      {
        method: 'GET',
        url: `/workspaces/${encodePathSegment(input.workspace)}/items`,
        params: compactRecord({ continuationToken: input.continuationToken })
      }
    );

    return {
      items: normalizeItems(response.data),
      continuationToken: normalizeContinuationToken(response.data),
      raw: response.data
    };
  }

  async listItemsDfs(input: { workspace: string; recursive?: boolean }) {
    let response = await this.request(this.dfs, 'list OneLake items via DFS', {
      method: 'GET',
      url: `/${encodePathSegment(input.workspace)}`,
      params: {
        resource: 'filesystem',
        recursive: input.recursive === true ? 'true' : 'false'
      }
    });

    let text = responseDataToText(response.data);
    return {
      paths:
        typeof response.data === 'string'
          ? parseStorageListXml(text)
          : normalizeItems(response.data),
      raw: response.data
    };
  }

  async listFiles(input: {
    workspace: string;
    item: string;
    path?: string;
    recursive?: boolean;
  }) {
    let directory = [input.item, input.path].filter(Boolean).join('/');
    let response = await this.request(this.dfs, 'list OneLake files', {
      method: 'GET',
      url: `/${encodePathSegment(input.workspace)}`,
      params: compactRecord({
        resource: 'filesystem',
        directory,
        recursive: input.recursive === true ? 'true' : 'false'
      })
    });

    let text = responseDataToText(response.data);
    return {
      files:
        typeof response.data === 'string'
          ? parseStorageListXml(text)
          : normalizeItems(response.data),
      raw: response.data
    };
  }

  async downloadFile(input: { workspace: string; item: string; filePath: string }) {
    let filePath = validateOneLakePath(input.filePath, 'filePath');
    let response = await this.request(this.blob, 'download OneLake file', {
      method: 'GET',
      url: `/${encodePathSegment(input.workspace)}/${encodePathSegment(input.item)}/${encodeOneLakePath(
        filePath
      )}`,
      responseType: 'arraybuffer'
    });
    let buffer = responseDataToBuffer(response.data);

    return {
      base64: buffer.toString('base64'),
      contentType: getHeader(response.headers, 'content-type') ?? 'application/octet-stream',
      size: buffer.byteLength,
      etag: getHeader(response.headers, 'etag'),
      lastModified: getHeader(response.headers, 'last-modified')
    };
  }

  async uploadFile(input: {
    workspace: string;
    item: string;
    filePath: string;
    content: Buffer;
    contentType?: string;
    overwrite?: boolean;
  }) {
    let filePath = validateOneLakePath(input.filePath, 'filePath');
    let response = await this.request(this.blob, 'upload OneLake file', {
      method: 'PUT',
      url: `/${encodePathSegment(input.workspace)}/${encodePathSegment(input.item)}/${encodeOneLakePath(
        filePath
      )}`,
      data: input.content,
      headers: compactRecord({
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': input.contentType ?? 'application/octet-stream',
        'If-None-Match': input.overwrite === false ? '*' : undefined
      })
    });

    return {
      status: response.status,
      etag: getHeader(response.headers, 'etag'),
      lastModified: getHeader(response.headers, 'last-modified'),
      size: input.content.byteLength
    };
  }

  async deleteFile(input: { workspace: string; item: string; filePath: string }) {
    let filePath = validateOneLakePath(input.filePath, 'filePath');
    let response = await this.request(this.blob, 'delete OneLake file', {
      method: 'DELETE',
      url: `/${encodePathSegment(input.workspace)}/${encodePathSegment(input.item)}/${encodeOneLakePath(
        filePath
      )}`
    });

    return { status: response.status };
  }

  async createDirectory(input: { workspace: string; item: string; directoryPath: string }) {
    let directoryPath = validateOneLakePath(input.directoryPath, 'directoryPath');
    let response = await this.request(this.dfs, 'create OneLake directory', {
      method: 'PUT',
      url: `/${encodePathSegment(input.workspace)}/${encodePathSegment(input.item)}/${encodeOneLakePath(
        directoryPath
      )}`,
      params: { resource: 'directory' }
    });

    return {
      status: response.status,
      etag: getHeader(response.headers, 'etag'),
      lastModified: getHeader(response.headers, 'last-modified')
    };
  }

  async deleteDirectory(input: {
    workspace: string;
    item: string;
    directoryPath: string;
    recursive?: boolean;
  }) {
    let directoryPath = validateOneLakePath(input.directoryPath, 'directoryPath');
    let response = await this.request(this.dfs, 'delete OneLake directory', {
      method: 'DELETE',
      url: `/${encodePathSegment(input.workspace)}/${encodePathSegment(input.item)}/${encodeOneLakePath(
        directoryPath
      )}`,
      params: compactRecord({
        recursive: input.recursive === false ? undefined : 'true'
      })
    });

    return { status: response.status };
  }

  async getTableConfig(input: { workspace: string; item: string }) {
    let response = await this.request(this.table, 'get OneLake table config', {
      method: 'GET',
      url: '/iceberg/v1/config',
      params: {
        warehouse: `${input.workspace}/${input.item}`
      }
    });

    return response.data;
  }

  async listTableNamespaces(input: { workspace: string; item: string }) {
    let response = await this.request(this.table, 'list OneLake table namespaces', {
      method: 'GET',
      url: `/iceberg/v1/${encodePathSegment(input.workspace)}/${encodePathSegment(
        input.item
      )}/namespaces`
    });

    return response.data;
  }

  async getTableNamespace(input: { workspace: string; item: string; namespace: string }) {
    let response = await this.request(this.table, 'get OneLake table namespace', {
      method: 'GET',
      url: `/iceberg/v1/${encodePathSegment(input.workspace)}/${encodePathSegment(
        input.item
      )}/namespaces/${encodeOneLakePath(input.namespace)}`
    });

    return response.data;
  }

  async listTables(input: { workspace: string; item: string; namespace: string }) {
    let response = await this.request(this.table, 'list OneLake tables', {
      method: 'GET',
      url: `/iceberg/v1/${encodePathSegment(input.workspace)}/${encodePathSegment(
        input.item
      )}/namespaces/${encodeOneLakePath(input.namespace)}/tables`
    });

    return response.data;
  }

  async getTable(input: {
    workspace: string;
    item: string;
    namespace: string;
    table: string;
  }) {
    let response = await this.request(this.table, 'get OneLake table', {
      method: 'GET',
      url: `/iceberg/v1/${encodePathSegment(input.workspace)}/${encodePathSegment(
        input.item
      )}/namespaces/${encodeOneLakePath(input.namespace)}/tables/${encodePathSegment(
        input.table
      )}`
    });

    return response.data;
  }
}
