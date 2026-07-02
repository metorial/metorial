import { createAxios } from 'slates';

export interface SplunkClientConfig {
  token: string;
  hecToken?: string;
  host: string;
  managementPort: string;
  hecPort: string;
  scheme: string;
}

export class SplunkClient {
  private baseURL: string;
  private hecBaseURL: string;
  private token: string;
  private hecToken?: string;

  constructor(config: SplunkClientConfig) {
    this.baseURL = `${config.scheme}://${config.host}:${config.managementPort}`;
    this.hecBaseURL = `${config.scheme}://${config.host}:${config.hecPort}`;
    this.token = config.token;
    this.hecToken = config.hecToken;
  }

  private get api() {
    return createAxios({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Splunk ${this.token}`
      }
    });
  }

  private get hecApi() {
    if (!this.hecToken) {
      throw new Error(
        'HEC token is required for data ingestion. Please configure an HEC token in your authentication settings.'
      );
    }
    return createAxios({
      baseURL: this.hecBaseURL,
      headers: {
        Authorization: `Splunk ${this.hecToken}`
      }
    });
  }

  // ─── Search ────────────────────────────────────────────────────────────

  async createSearchJob(params: {
    search: string;
    earliestTime?: string;
    latestTime?: string;
    maxCount?: number;
    execMode?: 'normal' | 'blocking' | 'oneshot';
    statusBuckets?: number;
    namespace?: { owner?: string; app?: string };
  }): Promise<{ searchId: string }> {
    let formParts: string[] = [
      `search=${encodeURIComponent(params.search)}`,
      'output_mode=json'
    ];
    if (params.earliestTime)
      formParts.push(`earliest_time=${encodeURIComponent(params.earliestTime)}`);
    if (params.latestTime)
      formParts.push(`latest_time=${encodeURIComponent(params.latestTime)}`);
    if (params.maxCount !== undefined) formParts.push(`max_count=${params.maxCount}`);
    if (params.execMode) formParts.push(`exec_mode=${params.execMode}`);
    if (params.statusBuckets !== undefined)
      formParts.push(`status_buckets=${params.statusBuckets}`);

    let path =
      params.namespace?.owner && params.namespace?.app
        ? `/servicesNS/${encodeURIComponent(params.namespace.owner)}/${encodeURIComponent(params.namespace.app)}/search/jobs`
        : '/services/search/jobs';

    let response = await this.api.post(path, formParts.join('&'), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    return { searchId: response.data?.sid || response.data?.entry?.[0]?.content?.sid };
  }

  async getSearchJobStatus(searchId: string): Promise<Record<string, any>> {
    let response = await this.api.get(
      `/services/search/jobs/${encodeURIComponent(searchId)}`,
      {
        params: { output_mode: 'json' }
      }
    );
    let content = response.data?.entry?.[0]?.content || {};
    return {
      searchId,
      dispatchState: content.dispatchState,
      isDone: content.isDone,
      isFailed: content.isFailed,
      isFinalized: content.isFinalized,
      isPaused: content.isPaused,
      eventCount: content.eventCount,
      resultCount: content.resultCount,
      scanCount: content.scanCount,
      doneProgress: content.doneProgress,
      runDuration: content.runDuration
    };
  }

  async getSearchResults(
    searchId: string,
    params?: {
      count?: number;
      offset?: number;
    }
  ): Promise<{ results: Record<string, any>[]; resultCount: number }> {
    let response = await this.api.get(
      `/services/search/jobs/${encodeURIComponent(searchId)}/results`,
      {
        params: {
          output_mode: 'json',
          count: params?.count ?? 100,
          offset: params?.offset ?? 0
        }
      }
    );
    return {
      results: response.data?.results || [],
      resultCount: response.data?.results?.length || 0
    };
  }

  async runOneshotSearch(params: {
    search: string;
    earliestTime?: string;
    latestTime?: string;
    maxCount?: number;
    namespace?: { owner?: string; app?: string };
  }): Promise<{ results: Record<string, any>[] }> {
    let formParts: string[] = [
      `search=${encodeURIComponent(params.search)}`,
      'output_mode=json',
      'exec_mode=oneshot'
    ];
    if (params.earliestTime)
      formParts.push(`earliest_time=${encodeURIComponent(params.earliestTime)}`);
    if (params.latestTime)
      formParts.push(`latest_time=${encodeURIComponent(params.latestTime)}`);
    if (params.maxCount !== undefined) formParts.push(`max_count=${params.maxCount}`);

    let path =
      params.namespace?.owner && params.namespace?.app
        ? `/servicesNS/${encodeURIComponent(params.namespace.owner)}/${encodeURIComponent(params.namespace.app)}/search/jobs`
        : '/services/search/jobs';

    let response = await this.api.post(path, formParts.join('&'), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    return { results: response.data?.results || [] };
  }

  // ─── Saved Searches ───────────────────────────────────────────────────

  async listSavedSearches(params?: {
    count?: number;
    offset?: number;
    searchFilter?: string;
    namespace?: { owner?: string; app?: string };
  }): Promise<{ savedSearches: Record<string, any>[]; total: number }> {
    let path =
      params?.namespace?.owner && params?.namespace?.app
        ? `/servicesNS/${encodeURIComponent(params.namespace.owner)}/${encodeURIComponent(params.namespace.app)}/saved/searches`
        : '/servicesNS/-/-/saved/searches';

    let response = await this.api.get(path, {
      params: {
        output_mode: 'json',
        count: params?.count ?? 30,
        offset: params?.offset ?? 0,
        ...(params?.searchFilter ? { search: params.searchFilter } : {})
      }
    });

    let entries = response.data?.entry || [];
    return {
      savedSearches: entries.map((e: any) => ({
        name: e.name,
        searchQuery: e.content?.search,
        description: e.content?.description,
        isScheduled: e.content?.is_scheduled,
        cronSchedule: e.content?.cron_schedule,
        earliestTime: e.content?.['dispatch.earliest_time'],
        latestTime: e.content?.['dispatch.latest_time'],
        disabled: e.content?.disabled,
        owner: e.acl?.owner,
        app: e.acl?.app
      })),
      total: response.data?.paging?.total || entries.length
    };
  }

  async createSavedSearch(params: {
    name: string;
    searchQuery: string;
    description?: string;
    isScheduled?: boolean;
    cronSchedule?: string;
    earliestTime?: string;
    latestTime?: string;
    disabled?: boolean;
    alertType?: string;
    alertComparator?: string;
    alertThreshold?: string;
    alertActions?: string;
    webhookUrl?: string;
    namespace?: { owner?: string; app?: string };
  }): Promise<Record<string, any>> {
    let formParts: string[] = [
      `name=${encodeURIComponent(params.name)}`,
      `search=${encodeURIComponent(params.searchQuery)}`,
      'output_mode=json'
    ];
    if (params.description)
      formParts.push(`description=${encodeURIComponent(params.description)}`);
    if (params.isScheduled !== undefined)
      formParts.push(`is_scheduled=${params.isScheduled ? '1' : '0'}`);
    if (params.cronSchedule)
      formParts.push(`cron_schedule=${encodeURIComponent(params.cronSchedule)}`);
    if (params.earliestTime)
      formParts.push(`dispatch.earliest_time=${encodeURIComponent(params.earliestTime)}`);
    if (params.latestTime)
      formParts.push(`dispatch.latest_time=${encodeURIComponent(params.latestTime)}`);
    if (params.disabled !== undefined)
      formParts.push(`disabled=${params.disabled ? '1' : '0'}`);
    if (params.alertType) formParts.push(`alert_type=${encodeURIComponent(params.alertType)}`);
    if (params.alertComparator)
      formParts.push(`alert.severity=${encodeURIComponent(params.alertComparator)}`);
    if (params.alertThreshold)
      formParts.push(`alert_threshold=${encodeURIComponent(params.alertThreshold)}`);
    if (params.alertActions)
      formParts.push(`actions=${encodeURIComponent(params.alertActions)}`);
    if (params.webhookUrl)
      formParts.push(`action.webhook.param.url=${encodeURIComponent(params.webhookUrl)}`);

    let path =
      params.namespace?.owner && params.namespace?.app
        ? `/servicesNS/${encodeURIComponent(params.namespace.owner)}/${encodeURIComponent(params.namespace.app)}/saved/searches`
        : '/services/saved/searches';

    let response = await this.api.post(path, formParts.join('&'), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    let entry = response.data?.entry?.[0];
    return {
      name: entry?.name,
      searchQuery: entry?.content?.search,
      description: entry?.content?.description,
      isScheduled: entry?.content?.is_scheduled,
      cronSchedule: entry?.content?.cron_schedule,
      owner: entry?.acl?.owner,
      app: entry?.acl?.app
    };
  }

  async updateSavedSearch(
    name: string,
    params: {
      searchQuery?: string;
      description?: string;
      isScheduled?: boolean;
      cronSchedule?: string;
      earliestTime?: string;
      latestTime?: string;
      disabled?: boolean;
      alertActions?: string;
      webhookUrl?: string;
      namespace?: { owner?: string; app?: string };
    }
  ): Promise<Record<string, any>> {
    let formParts: string[] = ['output_mode=json'];
    if (params.searchQuery) formParts.push(`search=${encodeURIComponent(params.searchQuery)}`);
    if (params.description !== undefined)
      formParts.push(`description=${encodeURIComponent(params.description)}`);
    if (params.isScheduled !== undefined)
      formParts.push(`is_scheduled=${params.isScheduled ? '1' : '0'}`);
    if (params.cronSchedule)
      formParts.push(`cron_schedule=${encodeURIComponent(params.cronSchedule)}`);
    if (params.earliestTime)
      formParts.push(`dispatch.earliest_time=${encodeURIComponent(params.earliestTime)}`);
    if (params.latestTime)
      formParts.push(`dispatch.latest_time=${encodeURIComponent(params.latestTime)}`);
    if (params.disabled !== undefined)
      formParts.push(`disabled=${params.disabled ? '1' : '0'}`);
    if (params.alertActions)
      formParts.push(`actions=${encodeURIComponent(params.alertActions)}`);
    if (params.webhookUrl)
      formParts.push(`action.webhook.param.url=${encodeURIComponent(params.webhookUrl)}`);

    let path =
      params.namespace?.owner && params.namespace?.app
        ? `/servicesNS/${encodeURIComponent(params.namespace.owner)}/${encodeURIComponent(params.namespace.app)}/saved/searches/${encodeURIComponent(name)}`
        : `/services/saved/searches/${encodeURIComponent(name)}`;

    let response = await this.api.post(path, formParts.join('&'), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    let entry = response.data?.entry?.[0];
    return {
      name: entry?.name,
      searchQuery: entry?.content?.search,
      description: entry?.content?.description,
      isScheduled: entry?.content?.is_scheduled,
      cronSchedule: entry?.content?.cron_schedule,
      owner: entry?.acl?.owner,
      app: entry?.acl?.app
    };
  }

  async deleteSavedSearch(
    name: string,
    namespace?: { owner?: string; app?: string }
  ): Promise<void> {
    let path =
      namespace?.owner && namespace?.app
        ? `/servicesNS/${encodeURIComponent(namespace.owner)}/${encodeURIComponent(namespace.app)}/saved/searches/${encodeURIComponent(name)}`
        : `/services/saved/searches/${encodeURIComponent(name)}`;

    await this.api.delete(path, {
      params: { output_mode: 'json' }
    });
  }

  async dispatchSavedSearch(
    name: string,
    params?: {
      earliestTime?: string;
      latestTime?: string;
      triggerActions?: boolean;
      forceDispatch?: boolean;
      namespace?: { owner?: string; app?: string };
    }
  ): Promise<{ searchId: string }> {
    let formParts: string[] = ['output_mode=json'];
    if (params?.earliestTime)
      formParts.push(`dispatch.earliest_time=${encodeURIComponent(params.earliestTime)}`);
    if (params?.latestTime)
      formParts.push(`dispatch.latest_time=${encodeURIComponent(params.latestTime)}`);
    if (params?.triggerActions !== undefined)
      formParts.push(`trigger_actions=${params.triggerActions ? '1' : '0'}`);
    if (params?.forceDispatch !== undefined)
      formParts.push(`force_dispatch=${params.forceDispatch ? '1' : '0'}`);

    let path =
      params?.namespace?.owner && params?.namespace?.app
        ? `/servicesNS/${encodeURIComponent(params.namespace.owner)}/${encodeURIComponent(params.namespace.app)}/saved/searches/${encodeURIComponent(name)}/dispatch`
        : `/services/saved/searches/${encodeURIComponent(name)}/dispatch`;

    let response = await this.api.post(path, formParts.join('&'), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    return { searchId: response.data?.sid || response.data?.entry?.[0]?.content?.sid };
  }

  // ─── HEC (HTTP Event Collector) ────────────────────────────────────────

  async sendHecEvent(event: {
    event: any;
    time?: number;
    host?: string;
    source?: string;
    sourcetype?: string;
    index?: string;
  }): Promise<{ text: string; code: number }> {
    let response = await this.hecApi.post('/services/collector/event', event, {
      headers: { 'Content-Type': 'application/json' }
    });
    return { text: response.data?.text || 'Success', code: response.data?.code || 0 };
  }

  async sendHecEvents(
    events: Array<{
      event: any;
      time?: number;
      host?: string;
      source?: string;
      sourcetype?: string;
      index?: string;
    }>
  ): Promise<{ text: string; code: number }> {
    let body = events.map(e => JSON.stringify(e)).join('');
    let response = await this.hecApi.post('/services/collector/event', body, {
      headers: { 'Content-Type': 'application/json' }
    });
    return { text: response.data?.text || 'Success', code: response.data?.code || 0 };
  }

  async sendHecRaw(
    rawData: string,
    params?: {
      host?: string;
      source?: string;
      sourcetype?: string;
      index?: string;
      channel?: string;
    }
  ): Promise<{ text: string; code: number }> {
    let headers: Record<string, string> = { 'Content-Type': 'text/plain' };
    if (params?.channel) {
      headers['X-Splunk-Request-Channel'] = params.channel;
    }

    let queryParams: Record<string, string> = {};
    if (params?.host) queryParams.host = params.host;
    if (params?.source) queryParams.source = params.source;
    if (params?.sourcetype) queryParams.sourcetype = params.sourcetype;
    if (params?.index) queryParams.index = params.index;

    let response = await this.hecApi.post('/services/collector/raw', rawData, {
      headers,
      params: queryParams
    });
    return { text: response.data?.text || 'Success', code: response.data?.code || 0 };
  }

  // ─── Indexes ──────────────────────────────────────────────────────────

  async listIndexes(params?: {
    count?: number;
    offset?: number;
    searchFilter?: string;
  }): Promise<{ indexes: Record<string, any>[]; total: number }> {
    let response = await this.api.get('/services/data/indexes', {
      params: {
        output_mode: 'json',
        count: params?.count ?? 30,
        offset: params?.offset ?? 0,
        ...(params?.searchFilter ? { search: params.searchFilter } : {})
      }
    });

    let entries = response.data?.entry || [];
    return {
      indexes: entries.map((e: any) => ({
        name: e.name,
        datatype: e.content?.datatype,
        currentDBSizeMB: e.content?.currentDBSizeMB,
        maxDataSizeMB: e.content?.maxDataSize,
        totalEventCount: e.content?.totalEventCount,
        frozenTimePeriodInSecs: e.content?.frozenTimePeriodInSecs,
        maxTime: e.content?.maxTime,
        minTime: e.content?.minTime,
        homePath: e.content?.homePath,
        isInternal: e.content?.isInternal,
        disabled: e.content?.disabled
      })),
      total: response.data?.paging?.total || entries.length
    };
  }

  async createIndex(params: {
    name: string;
    datatype?: 'event' | 'metric';
    homePath?: string;
    coldPath?: string;
    thawedPath?: string;
    maxDataSizeMB?: number;
    frozenTimePeriodInSecs?: number;
  }): Promise<Record<string, any>> {
    let formParts: string[] = [`name=${encodeURIComponent(params.name)}`, 'output_mode=json'];
    if (params.datatype) formParts.push(`datatype=${params.datatype}`);
    if (params.homePath) formParts.push(`homePath=${encodeURIComponent(params.homePath)}`);
    if (params.coldPath) formParts.push(`coldPath=${encodeURIComponent(params.coldPath)}`);
    if (params.thawedPath)
      formParts.push(`thawedPath=${encodeURIComponent(params.thawedPath)}`);
    if (params.maxDataSizeMB !== undefined)
      formParts.push(`maxDataSize=${params.maxDataSizeMB}`);
    if (params.frozenTimePeriodInSecs !== undefined)
      formParts.push(`frozenTimePeriodInSecs=${params.frozenTimePeriodInSecs}`);

    let response = await this.api.post('/services/data/indexes', formParts.join('&'), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    let entry = response.data?.entry?.[0];
    return {
      name: entry?.name,
      datatype: entry?.content?.datatype,
      homePath: entry?.content?.homePath,
      maxDataSizeMB: entry?.content?.maxDataSize,
      frozenTimePeriodInSecs: entry?.content?.frozenTimePeriodInSecs
    };
  }

  async getIndex(name: string): Promise<Record<string, any>> {
    let response = await this.api.get(`/services/data/indexes/${encodeURIComponent(name)}`, {
      params: { output_mode: 'json' }
    });

    let entry = response.data?.entry?.[0];
    return {
      name: entry?.name,
      datatype: entry?.content?.datatype,
      currentDBSizeMB: entry?.content?.currentDBSizeMB,
      maxDataSizeMB: entry?.content?.maxDataSize,
      totalEventCount: entry?.content?.totalEventCount,
      frozenTimePeriodInSecs: entry?.content?.frozenTimePeriodInSecs,
      maxTime: entry?.content?.maxTime,
      minTime: entry?.content?.minTime,
      homePath: entry?.content?.homePath,
      isInternal: entry?.content?.isInternal,
      disabled: entry?.content?.disabled
    };
  }

  // ─── KV Store ─────────────────────────────────────────────────────────

  async listKVStoreCollections(params: {
    app: string;
    owner?: string;
  }): Promise<{ collections: Record<string, any>[] }> {
    let owner = params.owner || 'nobody';
    let response = await this.api.get(
      `/servicesNS/${encodeURIComponent(owner)}/${encodeURIComponent(params.app)}/storage/collections/config`,
      {
        params: { output_mode: 'json' }
      }
    );

    let entries = response.data?.entry || [];
    return {
      collections: entries.map((e: any) => ({
        name: e.name,
        app: e.acl?.app,
        owner: e.acl?.owner,
        fields: e.content
      }))
    };
  }

  async createKVStoreCollection(params: {
    app: string;
    name: string;
    owner?: string;
  }): Promise<{ name: string }> {
    let owner = params.owner || 'nobody';
    await this.api.post(
      `/servicesNS/${encodeURIComponent(owner)}/${encodeURIComponent(params.app)}/storage/collections/config`,
      `name=${encodeURIComponent(params.name)}&output_mode=json`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return { name: params.name };
  }

  async deleteKVStoreCollection(params: {
    app: string;
    collectionName: string;
    owner?: string;
  }): Promise<void> {
    let owner = params.owner || 'nobody';
    await this.api.delete(
      `/servicesNS/${encodeURIComponent(owner)}/${encodeURIComponent(params.app)}/storage/collections/config/${encodeURIComponent(params.collectionName)}`,
      { params: { output_mode: 'json' } }
    );
  }

  async getKVStoreRecords(params: {
    app: string;
    collectionName: string;
    owner?: string;
    query?: string;
    sort?: string;
    limit?: number;
    skip?: number;
    fields?: string;
  }): Promise<Record<string, any>[]> {
    let owner = params.owner || 'nobody';
    let queryParams: Record<string, any> = { output_mode: 'json' };
    if (params.query) queryParams.query = params.query;
    if (params.sort) queryParams.sort = params.sort;
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.skip !== undefined) queryParams.skip = params.skip;
    if (params.fields) queryParams.fields = params.fields;

    let response = await this.api.get(
      `/servicesNS/${encodeURIComponent(owner)}/${encodeURIComponent(params.app)}/storage/collections/data/${encodeURIComponent(params.collectionName)}`,
      { params: queryParams }
    );
    return response.data || [];
  }

  async insertKVStoreRecord(params: {
    app: string;
    collectionName: string;
    record: Record<string, any>;
    owner?: string;
  }): Promise<Record<string, any>> {
    let owner = params.owner || 'nobody';
    let response = await this.api.post(
      `/servicesNS/${encodeURIComponent(owner)}/${encodeURIComponent(params.app)}/storage/collections/data/${encodeURIComponent(params.collectionName)}`,
      params.record,
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data || {};
  }

  async updateKVStoreRecord(params: {
    app: string;
    collectionName: string;
    recordKey: string;
    record: Record<string, any>;
    owner?: string;
  }): Promise<Record<string, any>> {
    let owner = params.owner || 'nobody';
    let response = await this.api.post(
      `/servicesNS/${encodeURIComponent(owner)}/${encodeURIComponent(params.app)}/storage/collections/data/${encodeURIComponent(params.collectionName)}/${encodeURIComponent(params.recordKey)}`,
      params.record,
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data || {};
  }

  async deleteKVStoreRecord(params: {
    app: string;
    collectionName: string;
    recordKey: string;
    owner?: string;
  }): Promise<void> {
    let owner = params.owner || 'nobody';
    await this.api.delete(
      `/servicesNS/${encodeURIComponent(owner)}/${encodeURIComponent(params.app)}/storage/collections/data/${encodeURIComponent(params.collectionName)}/${encodeURIComponent(params.recordKey)}`
    );
  }

  async deleteKVStoreRecordsByQuery(params: {
    app: string;
    collectionName: string;
    query: string;
    owner?: string;
  }): Promise<void> {
    let owner = params.owner || 'nobody';
    await this.api.delete(
      `/servicesNS/${encodeURIComponent(owner)}/${encodeURIComponent(params.app)}/storage/collections/data/${encodeURIComponent(params.collectionName)}`,
      { params: { query: params.query } }
    );
  }

  // ─── Users & Roles ─────────────────────────────────────────────────────

  async listUsers(params?: {
    count?: number;
    offset?: number;
  }): Promise<{ users: Record<string, any>[]; total: number }> {
    let response = await this.api.get('/services/authentication/users', {
      params: {
        output_mode: 'json',
        count: params?.count ?? 30,
        offset: params?.offset ?? 0
      }
    });

    let entries = response.data?.entry || [];
    return {
      users: entries.map((e: any) => ({
        username: e.name,
        realname: e.content?.realname,
        email: e.content?.email,
        roles: e.content?.roles,
        defaultApp: e.content?.defaultApp,
        type: e.content?.type,
        lastSuccessfulLogin: e.content?.last_successful_login
      })),
      total: response.data?.paging?.total || entries.length
    };
  }

  async getCurrentUser(): Promise<Record<string, any>> {
    let response = await this.api.get('/services/authentication/current-context', {
      params: { output_mode: 'json' }
    });
    let entry = response.data?.entry?.[0]?.content;
    return {
      username: entry?.username,
      realname: entry?.realname,
      roles: entry?.roles,
      capabilities: entry?.capabilities
    };
  }

  // ─── Apps ──────────────────────────────────────────────────────────────

  async listApps(params?: {
    count?: number;
    offset?: number;
  }): Promise<{ apps: Record<string, any>[]; total: number }> {
    let response = await this.api.get('/services/apps/local', {
      params: {
        output_mode: 'json',
        count: params?.count ?? 30,
        offset: params?.offset ?? 0
      }
    });

    let entries = response.data?.entry || [];
    return {
      apps: entries.map((e: any) => ({
        name: e.name,
        label: e.content?.label,
        version: e.content?.version,
        description: e.content?.description,
        visible: e.content?.visible,
        disabled: e.content?.disabled,
        author: e.content?.author
      })),
      total: response.data?.paging?.total || entries.length
    };
  }

  // ─── Fired Alerts ─────────────────────────────────────────────────────

  async listFiredAlerts(params?: {
    count?: number;
    offset?: number;
    namespace?: { owner?: string; app?: string };
  }): Promise<{ alerts: Record<string, any>[]; total: number }> {
    let path =
      params?.namespace?.owner && params?.namespace?.app
        ? `/servicesNS/${encodeURIComponent(params.namespace.owner)}/${encodeURIComponent(params.namespace.app)}/alerts/fired_alerts`
        : '/services/alerts/fired_alerts';

    let response = await this.api.get(path, {
      params: {
        output_mode: 'json',
        count: params?.count ?? 30,
        offset: params?.offset ?? 0
      }
    });

    let entries = response.data?.entry || [];
    return {
      alerts: entries.map((e: any) => ({
        name: e.name,
        triggeredAlertCount: e.content?.triggered_alert_count,
        id: e.id
      })),
      total: response.data?.paging?.total || entries.length
    };
  }

  // ─── Server Info ──────────────────────────────────────────────────────

  async getServerInfo(): Promise<Record<string, any>> {
    let response = await this.api.get('/services/server/info', {
      params: { output_mode: 'json' }
    });
    let entry = response.data?.entry?.[0]?.content;
    return {
      serverName: entry?.serverName,
      version: entry?.version,
      build: entry?.build,
      cpuArch: entry?.cpu_arch,
      os: entry?.os_name,
      isFree: entry?.isFree,
      isTrial: entry?.isTrial,
      licenseState: entry?.licenseState,
      guid: entry?.guid
    };
  }
}
