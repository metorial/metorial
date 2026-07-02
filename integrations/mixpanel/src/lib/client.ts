import { createAxios } from 'slates';
import { mixpanelApiError, mixpanelServiceError } from './errors';

export type MixpanelDataResidency = 'us' | 'eu' | 'in';

export interface MixpanelClientConfig {
  serviceAccountUsername?: string;
  serviceAccountSecret?: string;
  projectToken?: string;
  projectId: string;
  dataResidency: MixpanelDataResidency;
}

let getIngestionBaseUrl = (residency: MixpanelDataResidency): string => {
  if (residency === 'eu') return 'https://api-eu.mixpanel.com';
  if (residency === 'in') return 'https://api-in.mixpanel.com';
  return 'https://api.mixpanel.com';
};

let getQueryBaseUrl = (residency: MixpanelDataResidency): string => {
  if (residency === 'eu') return 'https://eu.mixpanel.com/api';
  if (residency === 'in') return 'https://in.mixpanel.com/api';
  return 'https://mixpanel.com/api';
};

let getExportBaseUrl = (residency: MixpanelDataResidency): string => {
  if (residency === 'eu') return 'https://data-eu.mixpanel.com';
  if (residency === 'in') return 'https://data-in.mixpanel.com';
  return 'https://data.mixpanel.com';
};

let getAppBaseUrl = (residency: MixpanelDataResidency): string => {
  if (residency === 'eu') return 'https://eu.mixpanel.com/api/app';
  if (residency === 'in') return 'https://in.mixpanel.com/api/app';
  return 'https://mixpanel.com/api/app';
};

type IngestionResponse = {
  status?: number | string;
  error?: string;
  code?: number;
};

let isAccepted = (data: unknown) => {
  if (data === 1 || data === '1') return true;
  if (typeof data !== 'object' || data === null) return false;

  let response = data as IngestionResponse;
  return response.status === 1 || response.status === 'OK' || response.code === 200;
};

export class MixpanelClient {
  private ingestionAxios: ReturnType<typeof createAxios>;
  private queryAxios: ReturnType<typeof createAxios>;
  private exportAxios: ReturnType<typeof createAxios>;
  private appAxios: ReturnType<typeof createAxios>;
  private config: MixpanelClientConfig;

  constructor(config: MixpanelClientConfig) {
    this.config = config;

    let basicAuth =
      config.serviceAccountUsername && config.serviceAccountSecret
        ? `Basic ${btoa(`${config.serviceAccountUsername}:${config.serviceAccountSecret}`)}`
        : undefined;

    this.ingestionAxios = createAxios({
      baseURL: getIngestionBaseUrl(config.dataResidency),
      headers: basicAuth ? { Authorization: basicAuth } : {}
    });

    this.queryAxios = createAxios({
      baseURL: getQueryBaseUrl(config.dataResidency),
      headers: basicAuth ? { Authorization: basicAuth } : {}
    });

    this.exportAxios = createAxios({
      baseURL: getExportBaseUrl(config.dataResidency),
      headers: basicAuth ? { Authorization: basicAuth } : {}
    });

    this.appAxios = createAxios({
      baseURL: getAppBaseUrl(config.dataResidency),
      headers: basicAuth ? { Authorization: basicAuth } : {}
    });
  }

  private async request<T>(operation: string, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      throw mixpanelApiError(error, operation);
    }
  }

  private ensureAccepted(data: unknown, operation: string) {
    if (isAccepted(data)) {
      return;
    }

    let response = data as IngestionResponse | undefined;
    let reason =
      response && typeof response === 'object'
        ? (response.error ?? response.status ?? 'not accepted')
        : 'not accepted';

    throw mixpanelServiceError(`Mixpanel ${operation} failed: ${String(reason)}`);
  }

  // =====================
  // Ingestion: Import Events
  // =====================
  async importEvents(
    events: Array<{
      event: string;
      properties: Record<string, unknown>;
    }>
  ): Promise<{
    code: number;
    numRecordsImported: number;
    status: string;
    failedRecords?: Array<{
      index: number;
      insertId?: string;
      field?: string;
      message: string;
    }>;
  }> {
    let response = await this.request('import events', () =>
      this.ingestionAxios.post('/import', events, {
        params: { strict: '1', project_id: this.config.projectId },
        headers: { 'Content-Type': 'application/json' }
      })
    );
    this.ensureAccepted(response.data, 'import events');
    return {
      code: response.data.code,
      numRecordsImported: response.data.num_records_imported,
      status: response.data.status,
      failedRecords: response.data.failed_records?.map((r: any) => ({
        index: r.index,
        insertId: r.insert_id,
        field: r.field,
        message: r.message
      }))
    };
  }

  // =====================
  // Ingestion: Track Events
  // =====================
  async trackEvents(
    events: Array<{
      event: string;
      properties: Record<string, unknown>;
    }>
  ): Promise<{ success: boolean }> {
    let response = await this.request('track events', () =>
      this.ingestionAxios.post('/track', events, {
        params: { verbose: '1' },
        headers: { 'Content-Type': 'application/json' }
      })
    );
    this.ensureAccepted(response.data, 'track events');
    return { success: true };
  }

  // =====================
  // User Profiles
  // =====================
  async setUserProperties(
    distinctId: string,
    properties: Record<string, unknown>
  ): Promise<{ success: boolean }> {
    let payload = [
      {
        $token: this.config.projectToken,
        $distinct_id: distinctId,
        $set: properties
      }
    ];
    let response = await this.request('set user properties', () =>
      this.ingestionAxios.post('/engage#profile-set', payload, {
        params: { verbose: '1' },
        headers: { 'Content-Type': 'application/json' }
      })
    );
    this.ensureAccepted(response.data, 'set user properties');
    return { success: true };
  }

  async setUserPropertiesOnce(
    distinctId: string,
    properties: Record<string, unknown>
  ): Promise<{ success: boolean }> {
    let payload = [
      {
        $token: this.config.projectToken,
        $distinct_id: distinctId,
        $set_once: properties
      }
    ];
    let response = await this.request('set user properties once', () =>
      this.ingestionAxios.post('/engage#profile-set-once', payload, {
        params: { verbose: '1' },
        headers: { 'Content-Type': 'application/json' }
      })
    );
    this.ensureAccepted(response.data, 'set user properties once');
    return { success: true };
  }

  async incrementUserProperties(
    distinctId: string,
    properties: Record<string, number>
  ): Promise<{ success: boolean }> {
    let payload = [
      {
        $token: this.config.projectToken,
        $distinct_id: distinctId,
        $add: properties
      }
    ];
    let response = await this.request('increment user properties', () =>
      this.ingestionAxios.post('/engage#profile-numerical-add', payload, {
        params: { verbose: '1' },
        headers: { 'Content-Type': 'application/json' }
      })
    );
    this.ensureAccepted(response.data, 'increment user properties');
    return { success: true };
  }

  async appendToUserListProperty(
    distinctId: string,
    properties: Record<string, unknown>
  ): Promise<{ success: boolean }> {
    let payload = [
      {
        $token: this.config.projectToken,
        $distinct_id: distinctId,
        $append: properties
      }
    ];
    let response = await this.request('append to user list property', () =>
      this.ingestionAxios.post('/engage#profile-list-append', payload, {
        params: { verbose: '1' },
        headers: { 'Content-Type': 'application/json' }
      })
    );
    this.ensureAccepted(response.data, 'append to user list property');
    return { success: true };
  }

  async removeFromUserListProperty(
    distinctId: string,
    properties: Record<string, unknown>
  ): Promise<{ success: boolean }> {
    let payload = [
      {
        $token: this.config.projectToken,
        $distinct_id: distinctId,
        $remove: properties
      }
    ];
    let response = await this.request('remove from user list property', () =>
      this.ingestionAxios.post('/engage#profile-list-remove', payload, {
        params: { verbose: '1' },
        headers: { 'Content-Type': 'application/json' }
      })
    );
    this.ensureAccepted(response.data, 'remove from user list property');
    return { success: true };
  }

  async unionToUserListProperty(
    distinctId: string,
    properties: Record<string, unknown[]>
  ): Promise<{ success: boolean }> {
    let payload = [
      {
        $token: this.config.projectToken,
        $distinct_id: distinctId,
        $union: properties
      }
    ];
    let response = await this.request('union to user list property', () =>
      this.ingestionAxios.post('/engage#profile-union', payload, {
        params: { verbose: '1' },
        headers: { 'Content-Type': 'application/json' }
      })
    );
    this.ensureAccepted(response.data, 'union to user list property');
    return { success: true };
  }

  async deleteUserProperties(
    distinctId: string,
    propertyNames: string[]
  ): Promise<{ success: boolean }> {
    let payload = [
      {
        $token: this.config.projectToken,
        $distinct_id: distinctId,
        $unset: propertyNames
      }
    ];
    let response = await this.request('delete user properties', () =>
      this.ingestionAxios.post('/engage#profile-unset', payload, {
        params: { verbose: '1' },
        headers: { 'Content-Type': 'application/json' }
      })
    );
    this.ensureAccepted(response.data, 'delete user properties');
    return { success: true };
  }

  async deleteUserProfile(distinctId: string): Promise<{ success: boolean }> {
    let payload = [
      {
        $token: this.config.projectToken,
        $distinct_id: distinctId,
        $delete: ''
      }
    ];
    let response = await this.request('delete user profile', () =>
      this.ingestionAxios.post('/engage#profile-delete', payload, {
        params: { verbose: '1' },
        headers: { 'Content-Type': 'application/json' }
      })
    );
    this.ensureAccepted(response.data, 'delete user profile');
    return { success: true };
  }

  // =====================
  // Group Profiles
  // =====================
  async setGroupProperties(
    groupKey: string,
    groupId: string,
    properties: Record<string, unknown>
  ): Promise<{ success: boolean }> {
    let payload = [
      {
        $token: this.config.projectToken,
        $group_key: groupKey,
        $group_id: groupId,
        $set: properties
      }
    ];
    let response = await this.request('set group properties', () =>
      this.ingestionAxios.post('/groups#group-set', payload, {
        params: { verbose: '1' },
        headers: { 'Content-Type': 'application/json' }
      })
    );
    this.ensureAccepted(response.data, 'set group properties');
    return { success: true };
  }

  async setGroupPropertiesOnce(
    groupKey: string,
    groupId: string,
    properties: Record<string, unknown>
  ): Promise<{ success: boolean }> {
    let payload = [
      {
        $token: this.config.projectToken,
        $group_key: groupKey,
        $group_id: groupId,
        $set_once: properties
      }
    ];
    let response = await this.request('set group properties once', () =>
      this.ingestionAxios.post('/groups#group-set-once', payload, {
        params: { verbose: '1' },
        headers: { 'Content-Type': 'application/json' }
      })
    );
    this.ensureAccepted(response.data, 'set group properties once');
    return { success: true };
  }

  async removeFromGroupListProperty(
    groupKey: string,
    groupId: string,
    properties: Record<string, unknown>
  ): Promise<{ success: boolean }> {
    let payload = [
      {
        $token: this.config.projectToken,
        $group_key: groupKey,
        $group_id: groupId,
        $remove: properties
      }
    ];
    let response = await this.request('remove from group list property', () =>
      this.ingestionAxios.post('/groups#group-remove-from-list', payload, {
        params: { verbose: '1' },
        headers: { 'Content-Type': 'application/json' }
      })
    );
    this.ensureAccepted(response.data, 'remove from group list property');
    return { success: true };
  }

  async unionToGroupListProperty(
    groupKey: string,
    groupId: string,
    properties: Record<string, unknown[]>
  ): Promise<{ success: boolean }> {
    let payload = [
      {
        $token: this.config.projectToken,
        $group_key: groupKey,
        $group_id: groupId,
        $union: properties
      }
    ];
    let response = await this.request('union to group list property', () =>
      this.ingestionAxios.post('/groups#group-union', payload, {
        params: { verbose: '1' },
        headers: { 'Content-Type': 'application/json' }
      })
    );
    this.ensureAccepted(response.data, 'union to group list property');
    return { success: true };
  }

  async deleteGroupProperties(
    groupKey: string,
    groupId: string,
    propertyNames: string[]
  ): Promise<{ success: boolean }> {
    let payload = [
      {
        $token: this.config.projectToken,
        $group_key: groupKey,
        $group_id: groupId,
        $unset: propertyNames
      }
    ];
    let response = await this.request('delete group properties', () =>
      this.ingestionAxios.post('/groups#group-unset', payload, {
        params: { verbose: '1' },
        headers: { 'Content-Type': 'application/json' }
      })
    );
    this.ensureAccepted(response.data, 'delete group properties');
    return { success: true };
  }

  async deleteGroupProfile(groupKey: string, groupId: string): Promise<{ success: boolean }> {
    let payload = [
      {
        $token: this.config.projectToken,
        $group_key: groupKey,
        $group_id: groupId,
        $delete: ''
      }
    ];
    let response = await this.request('delete group profile', () =>
      this.ingestionAxios.post('/groups#group-delete', payload, {
        params: { verbose: '1' },
        headers: { 'Content-Type': 'application/json' }
      })
    );
    this.ensureAccepted(response.data, 'delete group profile');
    return { success: true };
  }

  // =====================
  // Query: Segmentation
  // =====================
  async querySegmentation(params: {
    event: string;
    fromDate: string;
    toDate: string;
    on?: string;
    unit?: 'minute' | 'hour' | 'day' | 'month';
    where?: string;
    limit?: number;
    type?: 'general' | 'unique' | 'average';
  }): Promise<{
    legendSize: number;
    series: string[];
    values: Record<string, Record<string, number>>;
  }> {
    let response = await this.request('query segmentation', () =>
      this.queryAxios.get('/query/segmentation', {
        params: {
          project_id: this.config.projectId,
          event: params.event,
          from_date: params.fromDate,
          to_date: params.toDate,
          on: params.on,
          unit: params.unit,
          where: params.where,
          limit: params.limit,
          type: params.type
        }
      })
    );
    return {
      legendSize: response.data?.legend_size ?? 0,
      series: response.data.data?.series ?? [],
      values: response.data.data?.values ?? {}
    };
  }

  // =====================
  // Query: Funnels
  // =====================
  async queryFunnel(params: {
    funnelId: number;
    fromDate: string;
    toDate: string;
    length?: number;
    lengthUnit?: 'second' | 'minute' | 'hour' | 'day';
    unit?: 'day' | 'week' | 'month';
    on?: string;
    where?: string;
    limit?: number;
  }): Promise<{ meta: Record<string, unknown>; data: Record<string, unknown> }> {
    let response = await this.request('query funnel', () =>
      this.queryAxios.get('/query/funnels', {
        params: {
          project_id: this.config.projectId,
          funnel_id: params.funnelId,
          from_date: params.fromDate,
          to_date: params.toDate,
          length: params.length,
          length_unit: params.lengthUnit,
          unit: params.unit,
          on: params.on,
          where: params.where,
          limit: params.limit
        }
      })
    );
    return {
      meta: response.data.meta ?? {},
      data: response.data.data ?? {}
    };
  }

  async listFunnels(): Promise<Array<{ funnelId: number; name: string }>> {
    let response = await this.request('list funnels', () =>
      this.queryAxios.get('/query/funnels/list', {
        params: { project_id: this.config.projectId }
      })
    );
    return (response.data ?? []).map((f: any) => ({
      funnelId: f.funnel_id,
      name: f.name
    }));
  }

  // =====================
  // Query: Retention
  // =====================
  async queryRetention(params: {
    fromDate: string;
    toDate: string;
    retentionType?: 'birth' | 'compounded';
    bornEvent?: string;
    event?: string;
    bornWhere?: string;
    where?: string;
    interval?: number;
    intervalCount?: number;
    unit?: 'day' | 'week' | 'month';
    on?: string;
    limit?: number;
  }): Promise<Record<string, { counts: number[]; first: number }>> {
    let response = await this.request('query retention', () =>
      this.queryAxios.get('/query/retention', {
        params: {
          project_id: this.config.projectId,
          from_date: params.fromDate,
          to_date: params.toDate,
          retention_type: params.retentionType,
          born_event: params.bornEvent,
          event: params.event,
          born_where: params.bornWhere,
          where: params.where,
          interval: params.interval,
          interval_count: params.intervalCount,
          unit: params.unit,
          on: params.on,
          limit: params.limit
        }
      })
    );
    return response.data ?? {};
  }

  // =====================
  // Query: Insights
  // =====================
  async queryInsights(bookmarkId: number): Promise<Record<string, unknown>> {
    let response = await this.request('query insights', () =>
      this.queryAxios.get('/query/insights', {
        params: {
          project_id: this.config.projectId,
          bookmark_id: bookmarkId
        }
      })
    );
    return response.data ?? {};
  }

  // =====================
  // Query: Cohorts
  // =====================
  async listCohorts(): Promise<
    Array<{
      cohortId: number;
      name: string;
      description: string;
      createdAt: string;
      count: number;
    }>
  > {
    let response = await this.request('list cohorts', () =>
      this.queryAxios.post('/query/cohorts/list', null, {
        params: { project_id: this.config.projectId }
      })
    );
    return (response.data ?? []).map((c: any) => ({
      cohortId: c.id,
      name: c.name,
      description: c.description ?? '',
      createdAt: c.created ?? '',
      count: c.count ?? 0
    }));
  }

  // =====================
  // Query: Engage (User Profiles)
  // =====================
  async queryProfiles(params: {
    where?: string;
    distinctId?: string;
    outputProperties?: string[];
    sessionId?: string;
    page?: number;
    filterByCohort?: number;
  }): Promise<{
    page: number;
    pageSize: number;
    sessionId: string;
    total: number;
    results: Array<{ distinctId: string; properties: Record<string, unknown> }>;
  }> {
    let bodyParams: Record<string, string> = {};
    if (params.where) bodyParams.where = params.where;
    if (params.distinctId) bodyParams.distinct_id = params.distinctId;
    if (params.outputProperties)
      bodyParams.output_properties = JSON.stringify(params.outputProperties);
    if (params.sessionId) bodyParams.session_id = params.sessionId;
    if (params.page !== undefined) bodyParams.page = String(params.page);
    if (params.filterByCohort !== undefined)
      bodyParams.filter_by_cohort = JSON.stringify({ id: params.filterByCohort });

    let response = await this.request('query profiles', () =>
      this.queryAxios.post('/query/engage', new URLSearchParams(bodyParams).toString(), {
        params: { project_id: this.config.projectId },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
    );
    return {
      page: response.data.page ?? 0,
      pageSize: response.data.page_size ?? 0,
      sessionId: response.data.session_id ?? '',
      total: response.data.total ?? 0,
      results: (response.data.results ?? []).map((r: any) => ({
        distinctId: r.$distinct_id,
        properties: r.$properties ?? {}
      }))
    };
  }

  // =====================
  // Query: Activity Feed
  // =====================
  async queryActivityFeed(params: {
    distinctIds: string[];
    fromDate: string;
    toDate: string;
  }): Promise<Array<{ event: string; properties: Record<string, unknown> }>> {
    let response = await this.request('query activity feed', () =>
      this.queryAxios.get('/query/stream/query', {
        params: {
          project_id: this.config.projectId,
          distinct_ids: JSON.stringify(params.distinctIds),
          from_date: params.fromDate,
          to_date: params.toDate
        }
      })
    );
    let events = response.data?.results?.events ?? [];
    return events.map((e: any) => ({
      event: e.event,
      properties: e.properties ?? {}
    }));
  }

  // =====================
  // Query: Event Breakdown
  // =====================
  async getTopEvents(params: {
    limit?: number;
  }): Promise<Array<{ event: string; amount: number }>> {
    let response = await this.request("query today's top events", () =>
      this.queryAxios.get('/query/events/top', {
        params: {
          project_id: this.config.projectId,
          limit: params.limit ?? 10
        }
      })
    );
    let events = response.data?.events ?? {};
    return Object.entries(events).map(([event, amount]) => ({
      event,
      amount: amount as number
    }));
  }

  async getEventCounts(params: {
    eventNames: string[];
    type: 'general' | 'unique' | 'average';
    unit: 'minute' | 'hour' | 'day' | 'week' | 'month';
    interval?: number;
    fromDate?: string;
    toDate?: string;
  }): Promise<{
    legendSize: number;
    series: string[];
    values: Record<string, Record<string, number>>;
  }> {
    let response = await this.request('query event counts', () =>
      this.queryAxios.get('/query/events', {
        params: {
          project_id: this.config.projectId,
          event: JSON.stringify(params.eventNames),
          type: params.type,
          unit: params.unit,
          interval: params.interval,
          from_date: params.fromDate,
          to_date: params.toDate
        }
      })
    );
    return {
      legendSize: response.data?.legend_size ?? 0,
      series: response.data?.data?.series ?? [],
      values: response.data?.data?.values ?? {}
    };
  }

  async queryEventPropertyValues(params: {
    eventName: string;
    propertyName: string;
    values?: string[];
    type: 'general' | 'unique' | 'average';
    unit: 'minute' | 'hour' | 'day' | 'week' | 'month';
    interval?: number;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }): Promise<{
    legendSize: number;
    series: string[];
    values: Record<string, Record<string, number>>;
  }> {
    let response = await this.request('query event property values', () =>
      this.queryAxios.get('/query/events/properties', {
        params: {
          project_id: this.config.projectId,
          event: params.eventName,
          name: params.propertyName,
          values: params.values ? JSON.stringify(params.values) : undefined,
          type: params.type,
          unit: params.unit,
          interval: params.interval,
          from_date: params.fromDate,
          to_date: params.toDate,
          limit: params.limit
        }
      })
    );
    return {
      legendSize: response.data?.legend_size ?? 0,
      series: response.data?.data?.series ?? [],
      values: response.data?.data?.values ?? {}
    };
  }

  async listTopEventProperties(params: {
    eventName: string;
    limit?: number;
  }): Promise<Array<{ propertyName: string; count: number }>> {
    let response = await this.request('list top event properties', () =>
      this.queryAxios.get('/query/events/properties/top', {
        params: {
          project_id: this.config.projectId,
          event: params.eventName,
          limit: params.limit
        }
      })
    );

    return Object.entries(response.data ?? {}).map(([propertyName, value]) => ({
      propertyName,
      count:
        typeof value === 'object' &&
        value !== null &&
        typeof (value as { count?: unknown }).count === 'number'
          ? (value as { count: number }).count
          : 0
    }));
  }

  async listTopEventPropertyValues(params: {
    eventName: string;
    propertyName: string;
    limit?: number;
  }): Promise<string[]> {
    let response = await this.request('list top event property values', () =>
      this.queryAxios.get('/query/events/properties/values', {
        params: {
          project_id: this.config.projectId,
          event: params.eventName,
          name: params.propertyName,
          limit: params.limit
        }
      })
    );
    return Array.isArray(response.data) ? response.data.map(value => String(value)) : [];
  }

  // =====================
  // Raw Data Export
  // =====================
  async exportRawEvents(params: {
    fromDate: string;
    toDate: string;
    event?: string;
    where?: string;
    limit?: number;
  }): Promise<{ content: string; count: number; contentType: string; byteLength: number }> {
    let response = await this.request('export raw events', () =>
      this.exportAxios.get('/api/2.0/export', {
        params: {
          project_id: this.config.projectId,
          from_date: params.fromDate,
          to_date: params.toDate,
          event: params.event ? JSON.stringify([params.event]) : undefined,
          where: params.where,
          limit: params.limit
        },
        headers: { accept: 'text/plain' },
        responseType: 'text'
      })
    );

    let text = typeof response.data === 'string' ? response.data : String(response.data);
    let lines = text
      .trim()
      .split('\n')
      .filter((l: string) => l.trim());

    try {
      for (let line of lines) {
        JSON.parse(line);
      }
    } catch (error) {
      let serviceError = mixpanelServiceError('Mixpanel raw export returned invalid JSONL.');
      if (error instanceof Error) {
        serviceError.setParent(error);
      }
      throw serviceError;
    }

    return {
      content: text,
      count: lines.length,
      contentType: 'application/jsonl',
      byteLength: Buffer.byteLength(text, 'utf8')
    };
  }

  // =====================
  // Annotations
  // =====================
  async listAnnotations(params?: { fromDate?: string; toDate?: string }): Promise<
    Array<{
      annotationId: number;
      date: string;
      description: string;
      tags: Array<{ tagId: number; name: string }>;
    }>
  > {
    let response = await this.request('list annotations', () =>
      this.appAxios.get(`/projects/${this.config.projectId}/annotations`, {
        params: {
          fromDate: params?.fromDate,
          toDate: params?.toDate
        }
      })
    );
    return (response.data?.results ?? []).map((a: any) => ({
      annotationId: a.id,
      date: a.date,
      description: a.description,
      tags: (a.tags ?? []).map((t: any) => ({ tagId: t.id, name: t.name }))
    }));
  }

  async createAnnotation(params: {
    date: string;
    description: string;
  }): Promise<{ annotationId: number; date: string; description: string }> {
    let response = await this.request('create annotation', () =>
      this.appAxios.post(
        `/projects/${this.config.projectId}/annotations`,
        {
          date: params.date,
          description: params.description
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      )
    );
    return {
      annotationId: response.data?.id ?? response.data?.results?.id,
      date: response.data?.date ?? response.data?.results?.date ?? params.date,
      description:
        response.data?.description ?? response.data?.results?.description ?? params.description
    };
  }

  async deleteAnnotation(annotationId: number): Promise<void> {
    await this.request('delete annotation', () =>
      this.appAxios.delete(`/projects/${this.config.projectId}/annotations/${annotationId}`)
    );
  }

  // =====================
  // Identity Management
  // =====================
  async createIdentity(identifiedId: string, anonId: string): Promise<{ success: boolean }> {
    let payload = [
      {
        event: '$identify',
        properties: {
          $identified_id: identifiedId,
          $anon_id: anonId,
          token: this.config.projectToken
        }
      }
    ];
    let response = await this.request('create identity', () =>
      this.ingestionAxios.post('/track#create-identity', payload, {
        params: { verbose: '1' },
        headers: { 'Content-Type': 'application/json' }
      })
    );
    this.ensureAccepted(response.data, 'create identity');
    return { success: true };
  }

  async mergeIdentities(
    distinctId1: string,
    distinctId2: string
  ): Promise<{ success: boolean }> {
    let payload = [
      {
        event: '$merge',
        properties: {
          $distinct_ids: [distinctId1, distinctId2],
          token: this.config.projectToken
        }
      }
    ];
    let response = await this.request('merge identities', () =>
      this.ingestionAxios.post('/import', payload, {
        params: { strict: '1', project_id: this.config.projectId },
        headers: { 'Content-Type': 'application/json' }
      })
    );
    this.ensureAccepted(response.data, 'merge identities');
    return { success: true };
  }
}
