import {
  createAuthenticatedAxios,
  getResponseHeaderValue,
  requestAxios,
  requestAxiosData
} from 'slates';
import { apifyApiError, apifyValidationError } from './errors';

export type ApifyRecord = Record<string, any>;

export type ApifyListResult<T = ApifyRecord> = {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  count: number;
};

export type ApifyBinaryContent = {
  contentBase64: string;
  contentText?: string;
  contentType: string;
  byteLength: number;
};

export type ApifyKeyValueRecord = ApifyBinaryContent & {
  isJson: boolean;
  jsonValue?: unknown;
};

type ApifyEnvelope<T> = {
  data?: T;
};

let compactParams = (params: Record<string, unknown> = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined));

let boolParam = (value: boolean | undefined) =>
  value === undefined ? undefined : value ? '1' : '0';

let encodeWebhooks = (webhooks: ApifyRecord[] | undefined) =>
  webhooks === undefined
    ? undefined
    : Buffer.from(JSON.stringify(webhooks), 'utf-8').toString('base64');

let pathId = (id: string) => encodeURIComponent(id);

let apifyList = <T = ApifyRecord>(data: any): ApifyListResult<T> => ({
  items: Array.isArray(data?.items) ? data.items : [],
  total: typeof data?.total === 'number' ? data.total : 0,
  offset: typeof data?.offset === 'number' ? data.offset : 0,
  limit: typeof data?.limit === 'number' ? data.limit : 0,
  count: typeof data?.count === 'number' ? data.count : 0
});

let normalizeContentType = (headers: unknown, fallback = 'application/octet-stream') => {
  let value = getResponseHeaderValue(headers, 'content-type') ?? fallback;
  return value.split(';')[0]?.trim().toLowerCase() || fallback;
};

let bufferFromResponse = (data: unknown) => {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  if (typeof data === 'string') return Buffer.from(data, 'utf-8');
  return Buffer.from(JSON.stringify(data ?? ''), 'utf-8');
};

let runOptionsQuery = (params?: {
  timeout?: number;
  memory?: number;
  build?: string;
  waitForFinish?: number;
  maxItems?: number;
  maxTotalChargeUsd?: number;
  restartOnError?: boolean;
  webhooks?: ApifyRecord[];
}) =>
  compactParams({
    timeout: params?.timeout,
    memory: params?.memory,
    build: params?.build,
    waitForFinish: params?.waitForFinish,
    maxItems: params?.maxItems,
    maxTotalChargeUsd: params?.maxTotalChargeUsd,
    restartOnError: boolParam(params?.restartOnError),
    webhooks: encodeWebhooks(params?.webhooks)
  });

let storageQuery = (params?: {
  offset?: number;
  limit?: number;
  desc?: boolean;
  unnamed?: boolean;
}) =>
  compactParams({
    offset: params?.offset,
    limit: params?.limit,
    desc: boolParam(params?.desc),
    unnamed: boolParam(params?.unnamed)
  });

export class ApifyClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.apify.com/v2',
      authHeader: { value: `Bearer ${config.token}` },
      headers: {
        Accept: 'application/json'
      }
    });
  }

  private async wrapped<T>(operation: string, request: () => Promise<any>): Promise<T> {
    let response = await requestAxiosData<ApifyEnvelope<T>>(operation, request, apifyApiError);
    return response.data as T;
  }

  private async list<T = ApifyRecord>(operation: string, request: () => Promise<any>) {
    let data = await this.wrapped<unknown>(operation, request);
    return apifyList<T>(data);
  }

  async getUser(): Promise<ApifyRecord> {
    return this.wrapped('get current user', () => this.http.get('/users/me'));
  }

  async searchStoreActors(params?: {
    search?: string;
    category?: string;
    username?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.list('search Store actors', () =>
      this.http.get('/store', {
        params: compactParams({
          search: params?.search,
          category: params?.category,
          username: params?.username,
          limit: params?.limit,
          offset: params?.offset
        })
      })
    );
  }

  async listActors(params?: { offset?: number; limit?: number; desc?: boolean }) {
    return this.list('list actors', () =>
      this.http.get('/acts', {
        params: compactParams({
          offset: params?.offset,
          limit: params?.limit,
          desc: boolParam(params?.desc),
          my: '1'
        })
      })
    );
  }

  async getActor(actorId: string): Promise<ApifyRecord> {
    return this.wrapped('get actor', () => this.http.get(`/acts/${pathId(actorId)}`));
  }

  async createActor(actorData: ApifyRecord): Promise<ApifyRecord> {
    return this.wrapped('create actor', () => this.http.post('/acts', actorData));
  }

  async updateActor(actorId: string, actorData: ApifyRecord): Promise<ApifyRecord> {
    return this.wrapped('update actor', () =>
      this.http.put(`/acts/${pathId(actorId)}`, actorData)
    );
  }

  async deleteActor(actorId: string): Promise<void> {
    await requestAxios(
      'delete actor',
      () => this.http.delete(`/acts/${pathId(actorId)}`),
      apifyApiError
    );
  }

  async listActorVersions(actorId: string, params?: { offset?: number; limit?: number }) {
    return this.list('list actor versions', () =>
      this.http.get(`/acts/${pathId(actorId)}/versions`, {
        params: compactParams({ offset: params?.offset, limit: params?.limit })
      })
    );
  }

  async getActorVersion(actorId: string, versionNumber: string): Promise<ApifyRecord> {
    return this.wrapped('get actor version', () =>
      this.http.get(`/acts/${pathId(actorId)}/versions/${pathId(versionNumber)}`)
    );
  }

  async createActorVersion(actorId: string, body: ApifyRecord): Promise<ApifyRecord> {
    return this.wrapped('create actor version', () =>
      this.http.post(`/acts/${pathId(actorId)}/versions`, body)
    );
  }

  async updateActorVersion(
    actorId: string,
    versionNumber: string,
    body: ApifyRecord
  ): Promise<ApifyRecord> {
    return this.wrapped('update actor version', () =>
      this.http.put(`/acts/${pathId(actorId)}/versions/${pathId(versionNumber)}`, body)
    );
  }

  async deleteActorVersion(actorId: string, versionNumber: string): Promise<void> {
    await requestAxios(
      'delete actor version',
      () => this.http.delete(`/acts/${pathId(actorId)}/versions/${pathId(versionNumber)}`),
      apifyApiError
    );
  }

  async runActor(
    actorId: string,
    params?: {
      input?: unknown;
      timeout?: number;
      memory?: number;
      build?: string;
      waitForFinish?: number;
      maxItems?: number;
      maxTotalChargeUsd?: number;
      restartOnError?: boolean;
      webhooks?: ApifyRecord[];
    }
  ): Promise<ApifyRecord> {
    return this.wrapped('run actor', () =>
      this.http.post(`/acts/${pathId(actorId)}/runs`, params?.input ?? {}, {
        params: runOptionsQuery(params)
      })
    );
  }

  async runActorSync(
    actorId: string,
    params?: {
      input?: unknown;
      timeout?: number;
      memory?: number;
      build?: string;
      maxItems?: number;
      maxTotalChargeUsd?: number;
      webhooks?: ApifyRecord[];
    }
  ): Promise<ApifyRecord[]> {
    let data = await requestAxiosData<unknown>(
      'run actor synchronously',
      () =>
        this.http.post(
          `/acts/${pathId(actorId)}/run-sync-get-dataset-items`,
          params?.input ?? {},
          {
            params: runOptionsQuery(params)
          }
        ),
      apifyApiError
    );
    return Array.isArray(data) ? (data as ApifyRecord[]) : [];
  }

  async getRun(runId: string): Promise<ApifyRecord> {
    return this.wrapped('get actor run', () => this.http.get(`/actor-runs/${runId}`));
  }

  async listRuns(params?: {
    actorId?: string;
    offset?: number;
    limit?: number;
    desc?: boolean;
    status?: string;
  }) {
    let path = params?.actorId ? `/acts/${pathId(params.actorId)}/runs` : '/actor-runs';
    return this.list('list actor runs', () =>
      this.http.get(path, {
        params: compactParams({
          offset: params?.offset,
          limit: params?.limit,
          desc: boolParam(params?.desc),
          status: params?.status
        })
      })
    );
  }

  async abortRun(runId: string, params?: { gracefully?: boolean }): Promise<ApifyRecord> {
    return this.wrapped('abort actor run', () =>
      this.http.post(`/actor-runs/${runId}/abort`, undefined, {
        params: compactParams({ gracefully: boolParam(params?.gracefully) })
      })
    );
  }

  async resurrectRun(runId: string): Promise<ApifyRecord> {
    return this.wrapped('resurrect actor run', () =>
      this.http.post(`/actor-runs/${runId}/resurrect`)
    );
  }

  async rebootRun(runId: string): Promise<ApifyRecord> {
    return this.wrapped('reboot actor run', () =>
      this.http.post(`/actor-runs/${runId}/reboot`)
    );
  }

  async updateRun(runId: string, body: ApifyRecord): Promise<ApifyRecord> {
    return this.wrapped('update actor run', () => this.http.put(`/actor-runs/${runId}`, body));
  }

  async deleteRun(runId: string): Promise<void> {
    await requestAxios(
      'delete actor run',
      () => this.http.delete(`/actor-runs/${runId}`),
      apifyApiError
    );
  }

  async listTasks(params?: { offset?: number; limit?: number; desc?: boolean }) {
    return this.list('list actor tasks', () =>
      this.http.get('/actor-tasks', {
        params: compactParams({
          offset: params?.offset,
          limit: params?.limit,
          desc: boolParam(params?.desc)
        })
      })
    );
  }

  async getTask(taskId: string): Promise<ApifyRecord> {
    return this.wrapped('get actor task', () => this.http.get(`/actor-tasks/${taskId}`));
  }

  async createTask(taskData: ApifyRecord): Promise<ApifyRecord> {
    return this.wrapped('create actor task', () => this.http.post('/actor-tasks', taskData));
  }

  async updateTask(taskId: string, taskData: ApifyRecord): Promise<ApifyRecord> {
    return this.wrapped('update actor task', () =>
      this.http.put(`/actor-tasks/${taskId}`, taskData)
    );
  }

  async deleteTask(taskId: string): Promise<void> {
    await requestAxios(
      'delete actor task',
      () => this.http.delete(`/actor-tasks/${taskId}`),
      apifyApiError
    );
  }

  async runTask(
    taskId: string,
    params?: {
      input?: unknown;
      timeout?: number;
      memory?: number;
      build?: string;
      waitForFinish?: number;
      maxItems?: number;
      maxTotalChargeUsd?: number;
      restartOnError?: boolean;
      webhooks?: ApifyRecord[];
    }
  ): Promise<ApifyRecord> {
    return this.wrapped('run actor task', () =>
      this.http.post(`/actor-tasks/${taskId}/runs`, params?.input ?? {}, {
        params: runOptionsQuery(params)
      })
    );
  }

  async listDatasets(params?: {
    offset?: number;
    limit?: number;
    desc?: boolean;
    unnamed?: boolean;
  }) {
    return this.list('list datasets', () =>
      this.http.get('/datasets', { params: storageQuery(params) })
    );
  }

  async getDataset(datasetId: string): Promise<ApifyRecord> {
    return this.wrapped('get dataset', () => this.http.get(`/datasets/${datasetId}`));
  }

  async createDataset(params?: { name?: string }): Promise<ApifyRecord> {
    return this.wrapped('create dataset', () =>
      this.http.post('/datasets', undefined, {
        params: compactParams({ name: params?.name })
      })
    );
  }

  async updateDataset(datasetId: string, body: ApifyRecord): Promise<ApifyRecord> {
    return this.wrapped('update dataset', () => this.http.put(`/datasets/${datasetId}`, body));
  }

  async deleteDataset(datasetId: string): Promise<void> {
    await requestAxios(
      'delete dataset',
      () => this.http.delete(`/datasets/${datasetId}`),
      apifyApiError
    );
  }

  async getDatasetItems(
    datasetId: string,
    params?: {
      offset?: number;
      limit?: number;
      fields?: string[];
      omit?: string[];
      desc?: boolean;
      clean?: boolean;
      unwind?: string[];
      skipHeaderRow?: boolean;
      skipHidden?: boolean;
      flatten?: string[];
    }
  ): Promise<ApifyRecord[]> {
    let data = await requestAxiosData<unknown>(
      'get dataset items',
      () =>
        this.http.get(`/datasets/${datasetId}/items`, {
          params: compactParams({
            offset: params?.offset,
            limit: params?.limit,
            fields: params?.fields?.join(','),
            omit: params?.omit?.join(','),
            desc: boolParam(params?.desc),
            clean: boolParam(params?.clean),
            unwind: params?.unwind?.join(','),
            skipHeaderRow: boolParam(params?.skipHeaderRow),
            skipHidden: boolParam(params?.skipHidden),
            flatten: params?.flatten?.join(','),
            format: 'json'
          })
        }),
      apifyApiError
    );
    return Array.isArray(data) ? (data as ApifyRecord[]) : [];
  }

  async exportDatasetItems(
    datasetId: string,
    params: {
      format: string;
      offset?: number;
      limit?: number;
      fields?: string[];
      omit?: string[];
      desc?: boolean;
      clean?: boolean;
      unwind?: string[];
      skipHeaderRow?: boolean;
      skipHidden?: boolean;
      flatten?: string[];
    }
  ): Promise<ApifyBinaryContent> {
    let response = await requestAxios(
      'export dataset items',
      () =>
        this.http.get(`/datasets/${datasetId}/items`, {
          responseType: 'arraybuffer',
          transformResponse: value => value,
          params: compactParams({
            offset: params.offset,
            limit: params.limit,
            fields: params.fields?.join(','),
            omit: params.omit?.join(','),
            desc: boolParam(params.desc),
            clean: boolParam(params.clean),
            unwind: params.unwind?.join(','),
            skipHeaderRow: boolParam(params.skipHeaderRow),
            skipHidden: boolParam(params.skipHidden),
            flatten: params.flatten?.join(','),
            format: params.format
          })
        }),
      apifyApiError
    );

    let buffer = bufferFromResponse(response.data);
    let contentType = normalizeContentType(response.headers);
    return {
      contentBase64: buffer.toString('base64'),
      contentText: buffer.toString('utf-8'),
      contentType,
      byteLength: buffer.byteLength
    };
  }

  async pushDatasetItems(datasetId: string, items: ApifyRecord[]): Promise<void> {
    await requestAxios(
      'push dataset items',
      () => this.http.post(`/datasets/${datasetId}/items`, items),
      apifyApiError
    );
  }

  async listKeyValueStores(params?: {
    offset?: number;
    limit?: number;
    desc?: boolean;
    unnamed?: boolean;
  }) {
    return this.list('list key-value stores', () =>
      this.http.get('/key-value-stores', { params: storageQuery(params) })
    );
  }

  async getKeyValueStore(storeId: string): Promise<ApifyRecord> {
    return this.wrapped('get key-value store', () =>
      this.http.get(`/key-value-stores/${storeId}`)
    );
  }

  async createKeyValueStore(params?: { name?: string }): Promise<ApifyRecord> {
    return this.wrapped('create key-value store', () =>
      this.http.post('/key-value-stores', undefined, {
        params: compactParams({ name: params?.name })
      })
    );
  }

  async updateKeyValueStore(storeId: string, body: ApifyRecord): Promise<ApifyRecord> {
    return this.wrapped('update key-value store', () =>
      this.http.put(`/key-value-stores/${storeId}`, body)
    );
  }

  async deleteKeyValueStore(storeId: string): Promise<void> {
    await requestAxios(
      'delete key-value store',
      () => this.http.delete(`/key-value-stores/${storeId}`),
      apifyApiError
    );
  }

  async listKeyValueStoreKeys(
    storeId: string,
    params?: { exclusiveStartKey?: string; limit?: number }
  ): Promise<{
    items: Array<{ key: string; size: number }>;
    isTruncated: boolean;
    nextExclusiveStartKey?: string;
  }> {
    let data = await this.wrapped<any>('list key-value store keys', () =>
      this.http.get(`/key-value-stores/${storeId}/keys`, {
        params: compactParams({
          exclusiveStartKey: params?.exclusiveStartKey,
          limit: params?.limit
        })
      })
    );

    return {
      items: Array.isArray(data?.items) ? data.items : [],
      isTruncated: Boolean(data?.isTruncated),
      nextExclusiveStartKey:
        typeof data?.nextExclusiveStartKey === 'string'
          ? data.nextExclusiveStartKey
          : undefined
    };
  }

  async getKeyValueStoreRecord(
    storeId: string,
    recordKey: string
  ): Promise<ApifyKeyValueRecord> {
    let response = await requestAxios(
      'get key-value store record',
      () =>
        this.http.get(
          `/key-value-stores/${storeId}/records/${encodeURIComponent(recordKey)}`,
          {
            responseType: 'arraybuffer',
            transformResponse: value => value
          }
        ),
      apifyApiError
    );
    let buffer = bufferFromResponse(response.data);
    let contentType = normalizeContentType(response.headers);
    let text = buffer.toString('utf-8');
    let isJson = contentType.includes('json');
    let jsonValue: unknown;

    if (isJson) {
      try {
        jsonValue = JSON.parse(text);
      } catch {
        throw apifyValidationError(
          `Record "${recordKey}" is marked as JSON but could not be parsed.`
        );
      }
    }

    return {
      contentBase64: buffer.toString('base64'),
      contentText: text,
      contentType,
      byteLength: buffer.byteLength,
      isJson,
      jsonValue
    };
  }

  async setKeyValueStoreRecord(params: {
    storeId: string;
    recordKey: string;
    value: unknown;
    contentType: string;
  }): Promise<void> {
    await requestAxios(
      'set key-value store record',
      () =>
        this.http.put(
          `/key-value-stores/${params.storeId}/records/${encodeURIComponent(params.recordKey)}`,
          params.value,
          {
            headers: { 'Content-Type': params.contentType }
          }
        ),
      apifyApiError
    );
  }

  async deleteKeyValueStoreRecord(storeId: string, recordKey: string): Promise<void> {
    await requestAxios(
      'delete key-value store record',
      () =>
        this.http.delete(
          `/key-value-stores/${storeId}/records/${encodeURIComponent(recordKey)}`
        ),
      apifyApiError
    );
  }

  async listRequestQueues(params?: {
    offset?: number;
    limit?: number;
    desc?: boolean;
    unnamed?: boolean;
  }) {
    return this.list('list request queues', () =>
      this.http.get('/request-queues', { params: storageQuery(params) })
    );
  }

  async getRequestQueue(queueId: string): Promise<ApifyRecord> {
    return this.wrapped('get request queue', () =>
      this.http.get(`/request-queues/${queueId}`)
    );
  }

  async createRequestQueue(params?: { name?: string }): Promise<ApifyRecord> {
    return this.wrapped('create request queue', () =>
      this.http.post('/request-queues', undefined, {
        params: compactParams({ name: params?.name })
      })
    );
  }

  async updateRequestQueue(queueId: string, body: ApifyRecord): Promise<ApifyRecord> {
    return this.wrapped('update request queue', () =>
      this.http.put(`/request-queues/${queueId}`, body)
    );
  }

  async deleteRequestQueue(queueId: string): Promise<void> {
    await requestAxios(
      'delete request queue',
      () => this.http.delete(`/request-queues/${queueId}`),
      apifyApiError
    );
  }

  async listRequestQueueHead(queueId: string, params?: { limit?: number }) {
    let data = await this.wrapped<any>('list request queue head', () =>
      this.http.get(`/request-queues/${queueId}/head`, {
        params: compactParams({ limit: params?.limit })
      })
    );
    return Array.isArray(data?.items) ? data.items : [];
  }

  async addRequestToQueue(
    queueId: string,
    request: ApifyRecord,
    params?: { forefront?: boolean }
  ) {
    return this.wrapped<ApifyRecord>('add request to queue', () =>
      this.http.post(`/request-queues/${queueId}/requests`, request, {
        params: compactParams({ forefront: boolParam(params?.forefront) })
      })
    );
  }

  async getRequestQueueRequest(queueId: string, requestId: string) {
    return this.wrapped<ApifyRecord>('get request queue request', () =>
      this.http.get(`/request-queues/${queueId}/requests/${requestId}`)
    );
  }

  async updateRequestQueueRequest(queueId: string, requestId: string, request: ApifyRecord) {
    return this.wrapped<ApifyRecord>('update request queue request', () =>
      this.http.put(`/request-queues/${queueId}/requests/${requestId}`, request)
    );
  }

  async deleteRequestQueueRequest(queueId: string, requestId: string): Promise<void> {
    await requestAxios(
      'delete request queue request',
      () => this.http.delete(`/request-queues/${queueId}/requests/${requestId}`),
      apifyApiError
    );
  }

  async listSchedules(params?: { offset?: number; limit?: number; desc?: boolean }) {
    return this.list('list schedules', () =>
      this.http.get('/schedules', {
        params: compactParams({
          offset: params?.offset,
          limit: params?.limit,
          desc: boolParam(params?.desc)
        })
      })
    );
  }

  async getSchedule(scheduleId: string): Promise<ApifyRecord> {
    return this.wrapped('get schedule', () => this.http.get(`/schedules/${scheduleId}`));
  }

  async createSchedule(scheduleData: ApifyRecord): Promise<ApifyRecord> {
    return this.wrapped('create schedule', () => this.http.post('/schedules', scheduleData));
  }

  async updateSchedule(scheduleId: string, scheduleData: ApifyRecord): Promise<ApifyRecord> {
    return this.wrapped('update schedule', () =>
      this.http.put(`/schedules/${scheduleId}`, scheduleData)
    );
  }

  async deleteSchedule(scheduleId: string): Promise<void> {
    await requestAxios(
      'delete schedule',
      () => this.http.delete(`/schedules/${scheduleId}`),
      apifyApiError
    );
  }

  async listWebhooks(params?: { offset?: number; limit?: number; desc?: boolean }) {
    return this.list('list webhooks', () =>
      this.http.get('/webhooks', {
        params: compactParams({
          offset: params?.offset,
          limit: params?.limit,
          desc: boolParam(params?.desc)
        })
      })
    );
  }

  async getWebhook(webhookId: string): Promise<ApifyRecord> {
    return this.wrapped('get webhook', () => this.http.get(`/webhooks/${webhookId}`));
  }

  async createWebhook(webhookData: ApifyRecord): Promise<ApifyRecord> {
    return this.wrapped('create webhook', () => this.http.post('/webhooks', webhookData));
  }

  async updateWebhook(webhookId: string, webhookData: ApifyRecord): Promise<ApifyRecord> {
    return this.wrapped('update webhook', () =>
      this.http.put(`/webhooks/${webhookId}`, webhookData)
    );
  }

  async testWebhook(webhookId: string): Promise<ApifyRecord> {
    return this.wrapped('test webhook', () => this.http.post(`/webhooks/${webhookId}/test`));
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await requestAxios(
      'delete webhook',
      () => this.http.delete(`/webhooks/${webhookId}`),
      apifyApiError
    );
  }

  async buildActor(
    actorId: string,
    params: {
      version: string;
      tag?: string;
      useCache?: boolean;
      betaPackages?: boolean;
      waitForFinish?: number;
    }
  ): Promise<ApifyRecord> {
    return this.wrapped('build actor', () =>
      this.http.post(
        `/acts/${pathId(actorId)}/builds`,
        {},
        {
          params: compactParams({
            version: params.version,
            tag: params.tag,
            useCache: boolParam(params.useCache),
            betaPackages: boolParam(params.betaPackages),
            waitForFinish: params.waitForFinish
          })
        }
      )
    );
  }

  async getBuild(buildId: string): Promise<ApifyRecord> {
    return this.wrapped('get actor build', () => this.http.get(`/actor-builds/${buildId}`));
  }

  async listBuilds(
    actorId: string,
    params?: { offset?: number; limit?: number; desc?: boolean }
  ) {
    return this.list('list actor builds', () =>
      this.http.get(`/acts/${pathId(actorId)}/builds`, {
        params: compactParams({
          offset: params?.offset,
          limit: params?.limit,
          desc: boolParam(params?.desc)
        })
      })
    );
  }

  async getRunDatasetItems(
    runId: string,
    params?: {
      offset?: number;
      limit?: number;
      fields?: string[];
      omit?: string[];
      clean?: boolean;
      desc?: boolean;
    }
  ): Promise<ApifyRecord[]> {
    let data = await requestAxiosData<unknown>(
      'get run dataset items',
      () =>
        this.http.get(`/actor-runs/${runId}/dataset/items`, {
          params: compactParams({
            offset: params?.offset,
            limit: params?.limit,
            fields: params?.fields?.join(','),
            omit: params?.omit?.join(','),
            clean: boolParam(params?.clean),
            desc: boolParam(params?.desc),
            format: 'json'
          })
        }),
      apifyApiError
    );
    return Array.isArray(data) ? (data as ApifyRecord[]) : [];
  }

  async getLog(buildOrRunId: string): Promise<ApifyBinaryContent> {
    let response = await requestAxios(
      'get run or build log',
      () =>
        this.http.get(`/logs/${buildOrRunId}`, {
          headers: { Accept: 'text/plain' },
          responseType: 'arraybuffer',
          transformResponse: value => value
        }),
      apifyApiError
    );

    let buffer = bufferFromResponse(response.data);
    return {
      contentBase64: buffer.toString('base64'),
      contentText: buffer.toString('utf-8'),
      contentType: normalizeContentType(response.headers, 'text/plain'),
      byteLength: buffer.byteLength
    };
  }
}
