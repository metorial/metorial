import { createAxios } from 'slates';

export class ApifyClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.apify.com/v2',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- User ----

  async getUser(): Promise<Record<string, any>> {
    let response = await this.axios.get('/users/me');
    return response.data?.data;
  }

  // ---- Actors ----

  async listActors(params?: {
    offset?: number;
    limit?: number;
    desc?: boolean;
    my?: boolean;
  }): Promise<{
    items: Record<string, any>[];
    total: number;
    offset: number;
    limit: number;
    count: number;
  }> {
    let queryParams: Record<string, string> = {};
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.desc !== undefined) queryParams.desc = params.desc ? '1' : '0';
    if (params?.my !== undefined) queryParams.my = params.my ? '1' : '0';

    let response = await this.axios.get('/acts', { params: queryParams });
    let data = response.data?.data;
    return {
      items: data?.items || [],
      total: data?.total || 0,
      offset: data?.offset || 0,
      limit: data?.limit || 0,
      count: data?.count || 0
    };
  }

  async getActor(actorId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/acts/${actorId}`);
    return response.data?.data;
  }

  async createActor(actorData: Record<string, any>): Promise<Record<string, any>> {
    let response = await this.axios.post('/acts', actorData);
    return response.data?.data;
  }

  async updateActor(
    actorId: string,
    actorData: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.put(`/acts/${actorId}`, actorData);
    return response.data?.data;
  }

  async deleteActor(actorId: string): Promise<void> {
    await this.axios.delete(`/acts/${actorId}`);
  }

  // ---- Actor Runs ----

  async runActor(
    actorId: string,
    params?: {
      input?: any;
      timeout?: number;
      memory?: number;
      build?: string;
      webhooks?: Record<string, any>[];
    }
  ): Promise<Record<string, any>> {
    let queryParams: Record<string, string> = {};
    if (params?.timeout !== undefined) queryParams.timeout = String(params.timeout);
    if (params?.memory !== undefined) queryParams.memory = String(params.memory);
    if (params?.build !== undefined) queryParams.build = params.build;
    if (params?.webhooks !== undefined)
      queryParams.webhooks = btoa(JSON.stringify(params.webhooks));

    let response = await this.axios.post(`/acts/${actorId}/runs`, params?.input || {}, {
      params: queryParams
    });
    return response.data?.data;
  }

  async runActorSync(
    actorId: string,
    params?: {
      input?: any;
      timeout?: number;
      memory?: number;
      build?: string;
    }
  ): Promise<Record<string, any>> {
    let queryParams: Record<string, string> = {};
    if (params?.timeout !== undefined) queryParams.timeout = String(params.timeout);
    if (params?.memory !== undefined) queryParams.memory = String(params.memory);
    if (params?.build !== undefined) queryParams.build = params.build;

    let response = await this.axios.post(
      `/acts/${actorId}/run-sync-get-dataset-items`,
      params?.input || {},
      {
        params: queryParams
      }
    );
    return response.data;
  }

  async getRun(runId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/actor-runs/${runId}`);
    return response.data?.data;
  }

  async listRuns(
    actorId: string,
    params?: {
      offset?: number;
      limit?: number;
      desc?: boolean;
      status?: string;
    }
  ): Promise<{
    items: Record<string, any>[];
    total: number;
    offset: number;
    limit: number;
    count: number;
  }> {
    let queryParams: Record<string, string> = {};
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.desc !== undefined) queryParams.desc = params.desc ? '1' : '0';
    if (params?.status !== undefined) queryParams.status = params.status;

    let response = await this.axios.get(`/acts/${actorId}/runs`, { params: queryParams });
    let data = response.data?.data;
    return {
      items: data?.items || [],
      total: data?.total || 0,
      offset: data?.offset || 0,
      limit: data?.limit || 0,
      count: data?.count || 0
    };
  }

  async abortRun(runId: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/actor-runs/${runId}/abort`);
    return response.data?.data;
  }

  async resurrectRun(actorId: string, runId: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/acts/${actorId}/runs/${runId}/resurrect`);
    return response.data?.data;
  }

  // ---- Actor Tasks ----

  async listTasks(params?: { offset?: number; limit?: number; desc?: boolean }): Promise<{
    items: Record<string, any>[];
    total: number;
    offset: number;
    limit: number;
    count: number;
  }> {
    let queryParams: Record<string, string> = {};
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.desc !== undefined) queryParams.desc = params.desc ? '1' : '0';

    let response = await this.axios.get('/actor-tasks', { params: queryParams });
    let data = response.data?.data;
    return {
      items: data?.items || [],
      total: data?.total || 0,
      offset: data?.offset || 0,
      limit: data?.limit || 0,
      count: data?.count || 0
    };
  }

  async getTask(taskId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/actor-tasks/${taskId}`);
    return response.data?.data;
  }

  async createTask(taskData: Record<string, any>): Promise<Record<string, any>> {
    let response = await this.axios.post('/actor-tasks', taskData);
    return response.data?.data;
  }

  async updateTask(
    taskId: string,
    taskData: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.put(`/actor-tasks/${taskId}`, taskData);
    return response.data?.data;
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.axios.delete(`/actor-tasks/${taskId}`);
  }

  async runTask(
    taskId: string,
    params?: {
      input?: any;
      timeout?: number;
      memory?: number;
      build?: string;
      webhooks?: Record<string, any>[];
    }
  ): Promise<Record<string, any>> {
    let queryParams: Record<string, string> = {};
    if (params?.timeout !== undefined) queryParams.timeout = String(params.timeout);
    if (params?.memory !== undefined) queryParams.memory = String(params.memory);
    if (params?.build !== undefined) queryParams.build = params.build;
    if (params?.webhooks !== undefined)
      queryParams.webhooks = btoa(JSON.stringify(params.webhooks));

    let response = await this.axios.post(`/actor-tasks/${taskId}/runs`, params?.input || {}, {
      params: queryParams
    });
    return response.data?.data;
  }

  // ---- Datasets ----

  async listDatasets(params?: {
    offset?: number;
    limit?: number;
    desc?: boolean;
    unnamed?: boolean;
  }): Promise<{
    items: Record<string, any>[];
    total: number;
    offset: number;
    limit: number;
    count: number;
  }> {
    let queryParams: Record<string, string> = {};
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.desc !== undefined) queryParams.desc = params.desc ? '1' : '0';
    if (params?.unnamed !== undefined) queryParams.unnamed = params.unnamed ? '1' : '0';

    let response = await this.axios.get('/datasets', { params: queryParams });
    let data = response.data?.data;
    return {
      items: data?.items || [],
      total: data?.total || 0,
      offset: data?.offset || 0,
      limit: data?.limit || 0,
      count: data?.count || 0
    };
  }

  async getDataset(datasetId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/datasets/${datasetId}`);
    return response.data?.data;
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
    }
  ): Promise<Record<string, any>[]> {
    let queryParams: Record<string, string> = {};
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.fields !== undefined) queryParams.fields = params.fields.join(',');
    if (params?.omit !== undefined) queryParams.omit = params.omit.join(',');
    if (params?.desc !== undefined) queryParams.desc = params.desc ? '1' : '0';
    if (params?.clean !== undefined) queryParams.clean = params.clean ? '1' : '0';
    queryParams.format = 'json';

    let response = await this.axios.get(`/datasets/${datasetId}/items`, {
      params: queryParams
    });
    return response.data || [];
  }

  async pushDatasetItems(datasetId: string, items: Record<string, any>[]): Promise<void> {
    await this.axios.post(`/datasets/${datasetId}/items`, items);
  }

  // ---- Key-Value Stores ----

  async listKeyValueStores(params?: {
    offset?: number;
    limit?: number;
    desc?: boolean;
    unnamed?: boolean;
  }): Promise<{
    items: Record<string, any>[];
    total: number;
    offset: number;
    limit: number;
    count: number;
  }> {
    let queryParams: Record<string, string> = {};
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.desc !== undefined) queryParams.desc = params.desc ? '1' : '0';
    if (params?.unnamed !== undefined) queryParams.unnamed = params.unnamed ? '1' : '0';

    let response = await this.axios.get('/key-value-stores', { params: queryParams });
    let data = response.data?.data;
    return {
      items: data?.items || [],
      total: data?.total || 0,
      offset: data?.offset || 0,
      limit: data?.limit || 0,
      count: data?.count || 0
    };
  }

  async listKeyValueStoreKeys(
    storeId: string,
    params?: {
      exclusiveStartKey?: string;
      limit?: number;
    }
  ): Promise<{
    items: Array<{ key: string; size: number }>;
    isTruncated: boolean;
    nextExclusiveStartKey?: string;
  }> {
    let queryParams: Record<string, string> = {};
    if (params?.exclusiveStartKey !== undefined)
      queryParams.exclusiveStartKey = params.exclusiveStartKey;
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);

    let response = await this.axios.get(`/key-value-stores/${storeId}/keys`, {
      params: queryParams
    });
    let data = response.data?.data;
    return {
      items: data?.items || [],
      isTruncated: data?.isTruncated || false,
      nextExclusiveStartKey: data?.nextExclusiveStartKey
    };
  }

  async getKeyValueStoreRecord(storeId: string, recordKey: string): Promise<any> {
    let response = await this.axios.get(`/key-value-stores/${storeId}/records/${recordKey}`);
    return response.data;
  }

  async setKeyValueStoreRecord(
    storeId: string,
    recordKey: string,
    value: any,
    contentType?: string
  ): Promise<void> {
    let headers: Record<string, string> = {};
    if (contentType) headers['Content-Type'] = contentType;
    await this.axios.put(`/key-value-stores/${storeId}/records/${recordKey}`, value, {
      headers
    });
  }

  async deleteKeyValueStoreRecord(storeId: string, recordKey: string): Promise<void> {
    await this.axios.delete(`/key-value-stores/${storeId}/records/${recordKey}`);
  }

  // ---- Schedules ----

  async listSchedules(params?: { offset?: number; limit?: number; desc?: boolean }): Promise<{
    items: Record<string, any>[];
    total: number;
    offset: number;
    limit: number;
    count: number;
  }> {
    let queryParams: Record<string, string> = {};
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.desc !== undefined) queryParams.desc = params.desc ? '1' : '0';

    let response = await this.axios.get('/schedules', { params: queryParams });
    let data = response.data?.data;
    return {
      items: data?.items || [],
      total: data?.total || 0,
      offset: data?.offset || 0,
      limit: data?.limit || 0,
      count: data?.count || 0
    };
  }

  async getSchedule(scheduleId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/schedules/${scheduleId}`);
    return response.data?.data;
  }

  async createSchedule(scheduleData: Record<string, any>): Promise<Record<string, any>> {
    let response = await this.axios.post('/schedules', scheduleData);
    return response.data?.data;
  }

  async updateSchedule(
    scheduleId: string,
    scheduleData: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.put(`/schedules/${scheduleId}`, scheduleData);
    return response.data?.data;
  }

  async deleteSchedule(scheduleId: string): Promise<void> {
    await this.axios.delete(`/schedules/${scheduleId}`);
  }

  // ---- Webhooks ----

  async listWebhooks(params?: { offset?: number; limit?: number; desc?: boolean }): Promise<{
    items: Record<string, any>[];
    total: number;
    offset: number;
    limit: number;
    count: number;
  }> {
    let queryParams: Record<string, string> = {};
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.desc !== undefined) queryParams.desc = params.desc ? '1' : '0';

    let response = await this.axios.get('/webhooks', { params: queryParams });
    let data = response.data?.data;
    return {
      items: data?.items || [],
      total: data?.total || 0,
      offset: data?.offset || 0,
      limit: data?.limit || 0,
      count: data?.count || 0
    };
  }

  async getWebhook(webhookId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/webhooks/${webhookId}`);
    return response.data?.data;
  }

  async createWebhook(webhookData: {
    eventTypes: string[];
    requestUrl: string;
    condition?: {
      actorId?: string;
      actorTaskId?: string;
      actorRunId?: string;
    };
    payloadTemplate?: string;
    headersTemplate?: string;
    description?: string;
    ignoreSslErrors?: boolean;
    doNotRetry?: boolean;
    isAdHoc?: boolean;
    idempotencyKey?: string;
    shouldInterpolateStrings?: boolean;
  }): Promise<Record<string, any>> {
    let body: Record<string, any> = {
      eventTypes: webhookData.eventTypes,
      requestUrl: webhookData.requestUrl
    };
    if (webhookData.condition !== undefined) body.condition = webhookData.condition;
    if (webhookData.payloadTemplate !== undefined)
      body.payloadTemplate = webhookData.payloadTemplate;
    if (webhookData.headersTemplate !== undefined)
      body.headersTemplate = webhookData.headersTemplate;
    if (webhookData.description !== undefined) body.description = webhookData.description;
    if (webhookData.ignoreSslErrors !== undefined)
      body.ignoreSslErrors = webhookData.ignoreSslErrors;
    if (webhookData.doNotRetry !== undefined) body.doNotRetry = webhookData.doNotRetry;
    if (webhookData.isAdHoc !== undefined) body.isAdHoc = webhookData.isAdHoc;
    if (webhookData.idempotencyKey !== undefined)
      body.idempotencyKey = webhookData.idempotencyKey;
    if (webhookData.shouldInterpolateStrings !== undefined)
      body.shouldInterpolateStrings = webhookData.shouldInterpolateStrings;

    let response = await this.axios.post('/webhooks', body);
    return response.data?.data;
  }

  async updateWebhook(
    webhookId: string,
    webhookData: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.put(`/webhooks/${webhookId}`, webhookData);
    return response.data?.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/webhooks/${webhookId}`);
  }

  // ---- Builds ----

  async buildActor(
    actorId: string,
    params?: {
      version?: string;
      tag?: string;
      useCache?: boolean;
      betaPackages?: boolean;
    }
  ): Promise<Record<string, any>> {
    let queryParams: Record<string, string> = {};
    if (params?.version !== undefined) queryParams.version = params.version;
    if (params?.tag !== undefined) queryParams.tag = params.tag;
    if (params?.useCache !== undefined) queryParams.useCache = params.useCache ? '1' : '0';
    if (params?.betaPackages !== undefined)
      queryParams.betaPackages = params.betaPackages ? '1' : '0';

    let response = await this.axios.post(
      `/acts/${actorId}/builds`,
      {},
      { params: queryParams }
    );
    return response.data?.data;
  }

  async getBuild(buildId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/actor-builds/${buildId}`);
    return response.data?.data;
  }

  async listBuilds(
    actorId: string,
    params?: {
      offset?: number;
      limit?: number;
      desc?: boolean;
    }
  ): Promise<{
    items: Record<string, any>[];
    total: number;
    offset: number;
    limit: number;
    count: number;
  }> {
    let queryParams: Record<string, string> = {};
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.desc !== undefined) queryParams.desc = params.desc ? '1' : '0';

    let response = await this.axios.get(`/acts/${actorId}/builds`, { params: queryParams });
    let data = response.data?.data;
    return {
      items: data?.items || [],
      total: data?.total || 0,
      offset: data?.offset || 0,
      limit: data?.limit || 0,
      count: data?.count || 0
    };
  }

  // ---- Request Queues ----

  async listRequestQueues(params?: {
    offset?: number;
    limit?: number;
    desc?: boolean;
    unnamed?: boolean;
  }): Promise<{
    items: Record<string, any>[];
    total: number;
    offset: number;
    limit: number;
    count: number;
  }> {
    let queryParams: Record<string, string> = {};
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.desc !== undefined) queryParams.desc = params.desc ? '1' : '0';
    if (params?.unnamed !== undefined) queryParams.unnamed = params.unnamed ? '1' : '0';

    let response = await this.axios.get('/request-queues', { params: queryParams });
    let data = response.data?.data;
    return {
      items: data?.items || [],
      total: data?.total || 0,
      offset: data?.offset || 0,
      limit: data?.limit || 0,
      count: data?.count || 0
    };
  }

  // ---- Run Dataset Items (shortcut) ----

  async getRunDatasetItems(
    runId: string,
    params?: {
      offset?: number;
      limit?: number;
      fields?: string[];
      omit?: string[];
      clean?: boolean;
    }
  ): Promise<Record<string, any>[]> {
    let queryParams: Record<string, string> = {};
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.fields !== undefined) queryParams.fields = params.fields.join(',');
    if (params?.omit !== undefined) queryParams.omit = params.omit.join(',');
    if (params?.clean !== undefined) queryParams.clean = params.clean ? '1' : '0';
    queryParams.format = 'json';

    let response = await this.axios.get(`/actor-runs/${runId}/dataset/items`, {
      params: queryParams
    });
    return response.data || [];
  }

  // ---- Run Log (shortcut) ----

  async getLog(buildOrRunId: string): Promise<string> {
    let response = await this.axios.get(`/logs/${buildOrRunId}`, {
      headers: { Accept: 'text/plain' }
    });
    return response.data;
  }
}
