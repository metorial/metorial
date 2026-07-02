import { createAxios } from 'slates';

export interface MixpanelClientConfig {
  serviceAccountUsername?: string;
  serviceAccountSecret?: string;
  projectToken?: string;
  projectId: string;
  dataResidency: 'us' | 'eu';
}

let getIngestionBaseUrl = (residency: 'us' | 'eu'): string => {
  return residency === 'eu' ? 'https://api-eu.mixpanel.com' : 'https://api.mixpanel.com';
};

let getQueryBaseUrl = (residency: 'us' | 'eu'): string => {
  return residency === 'eu' ? 'https://eu.mixpanel.com/api' : 'https://mixpanel.com/api';
};

let getExportBaseUrl = (residency: 'us' | 'eu'): string => {
  return residency === 'eu' ? 'https://data-eu.mixpanel.com' : 'https://data.mixpanel.com';
};

let getAppBaseUrl = (residency: 'us' | 'eu'): string => {
  return residency === 'eu'
    ? 'https://eu.mixpanel.com/api/app'
    : 'https://mixpanel.com/api/app';
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
    let response = await this.ingestionAxios.post('/import', events, {
      params: { strict: '1', project_id: this.config.projectId },
      headers: { 'Content-Type': 'application/json' }
    });
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
    let response = await this.ingestionAxios.post('/track', events, {
      params: { verbose: '1' },
      headers: { 'Content-Type': 'application/json' }
    });
    return { success: response.data.status === 1 || response.data === 1 };
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
    let response = await this.ingestionAxios.post('/engage#profile-set', payload, {
      params: { verbose: '1' },
      headers: { 'Content-Type': 'application/json' }
    });
    return { success: response.data.status === 1 || response.data === 1 };
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
    let response = await this.ingestionAxios.post('/engage#profile-set-once', payload, {
      params: { verbose: '1' },
      headers: { 'Content-Type': 'application/json' }
    });
    return { success: response.data.status === 1 || response.data === 1 };
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
    let response = await this.ingestionAxios.post('/engage#profile-numerical-add', payload, {
      params: { verbose: '1' },
      headers: { 'Content-Type': 'application/json' }
    });
    return { success: response.data.status === 1 || response.data === 1 };
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
    let response = await this.ingestionAxios.post('/engage#profile-list-append', payload, {
      params: { verbose: '1' },
      headers: { 'Content-Type': 'application/json' }
    });
    return { success: response.data.status === 1 || response.data === 1 };
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
    let response = await this.ingestionAxios.post('/engage#profile-list-remove', payload, {
      params: { verbose: '1' },
      headers: { 'Content-Type': 'application/json' }
    });
    return { success: response.data.status === 1 || response.data === 1 };
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
    let response = await this.ingestionAxios.post('/engage#profile-union', payload, {
      params: { verbose: '1' },
      headers: { 'Content-Type': 'application/json' }
    });
    return { success: response.data.status === 1 || response.data === 1 };
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
    let response = await this.ingestionAxios.post('/engage#profile-unset', payload, {
      params: { verbose: '1' },
      headers: { 'Content-Type': 'application/json' }
    });
    return { success: response.data.status === 1 || response.data === 1 };
  }

  async deleteUserProfile(distinctId: string): Promise<{ success: boolean }> {
    let payload = [
      {
        $token: this.config.projectToken,
        $distinct_id: distinctId,
        $delete: ''
      }
    ];
    let response = await this.ingestionAxios.post('/engage#profile-delete', payload, {
      params: { verbose: '1' },
      headers: { 'Content-Type': 'application/json' }
    });
    return { success: response.data.status === 1 || response.data === 1 };
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
    let response = await this.ingestionAxios.post('/groups#group-set', payload, {
      params: { verbose: '1' },
      headers: { 'Content-Type': 'application/json' }
    });
    return { success: response.data.status === 1 || response.data === 1 };
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
    let response = await this.ingestionAxios.post('/groups#group-delete', payload, {
      params: { verbose: '1' },
      headers: { 'Content-Type': 'application/json' }
    });
    return { success: response.data.status === 1 || response.data === 1 };
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
    let response = await this.queryAxios.get('/query/segmentation', {
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
    });
    return {
      legendSize: response.data.data?.legend_size ?? 0,
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
    let response = await this.queryAxios.get('/query/funnels', {
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
    });
    return {
      meta: response.data.meta ?? {},
      data: response.data.data ?? {}
    };
  }

  async listFunnels(): Promise<Array<{ funnelId: number; name: string }>> {
    let response = await this.queryAxios.get('/query/funnels/list', {
      params: { project_id: this.config.projectId }
    });
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
    let response = await this.queryAxios.get('/query/retention', {
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
    });
    return response.data ?? {};
  }

  // =====================
  // Query: Insights
  // =====================
  async queryInsights(bookmarkId: number): Promise<Record<string, unknown>> {
    let response = await this.queryAxios.get('/query/insights', {
      params: {
        project_id: this.config.projectId,
        bookmark_id: bookmarkId
      }
    });
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
    let response = await this.queryAxios.post('/query/cohorts/list', null, {
      params: { project_id: this.config.projectId }
    });
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

    let response = await this.queryAxios.post(
      '/query/engage',
      new URLSearchParams(bodyParams).toString(),
      {
        params: { project_id: this.config.projectId },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
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
    let response = await this.queryAxios.get('/query/stream/query', {
      params: {
        project_id: this.config.projectId,
        distinct_ids: JSON.stringify(params.distinctIds),
        from_date: params.fromDate,
        to_date: params.toDate
      }
    });
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
    let response = await this.queryAxios.get('/query/events/top', {
      params: {
        project_id: this.config.projectId,
        limit: params.limit ?? 10
      }
    });
    let events = response.data?.events ?? {};
    return Object.entries(events).map(([event, amount]) => ({
      event,
      amount: amount as number
    }));
  }

  async getEventCounts(params: {
    eventNames: string[];
    type: 'general' | 'unique' | 'average';
    unit: 'minute' | 'hour' | 'day' | 'month';
    interval?: number;
  }): Promise<Record<string, unknown>> {
    let response = await this.queryAxios.get('/query/events', {
      params: {
        project_id: this.config.projectId,
        event: JSON.stringify(params.eventNames),
        type: params.type,
        unit: params.unit,
        interval: params.interval
      }
    });
    return response.data?.data ?? {};
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
  }): Promise<Array<{ event: string; properties: Record<string, unknown> }>> {
    let response = await this.exportAxios.get('/api/2.0/export', {
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
    });

    let text = typeof response.data === 'string' ? response.data : String(response.data);
    let lines = text
      .trim()
      .split('\n')
      .filter((l: string) => l.trim());
    return lines.map((line: string) => {
      let parsed = JSON.parse(line);
      return {
        event: parsed.event,
        properties: parsed.properties ?? {}
      };
    });
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
    let response = await this.appAxios.get(`/projects/${this.config.projectId}/annotations`, {
      params: {
        fromDate: params?.fromDate,
        toDate: params?.toDate
      }
    });
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
    let response = await this.appAxios.post(
      `/projects/${this.config.projectId}/annotations`,
      {
        date: params.date,
        description: params.description
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return {
      annotationId: response.data?.id ?? response.data?.results?.id,
      date: response.data?.date ?? response.data?.results?.date ?? params.date,
      description:
        response.data?.description ?? response.data?.results?.description ?? params.description
    };
  }

  async deleteAnnotation(annotationId: number): Promise<void> {
    await this.appAxios.delete(
      `/projects/${this.config.projectId}/annotations/${annotationId}`
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
    let response = await this.ingestionAxios.post('/track#create-identity', payload, {
      params: { verbose: '1' },
      headers: { 'Content-Type': 'application/json' }
    });
    return { success: response.data.status === 1 || response.data === 1 };
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
    let response = await this.ingestionAxios.post('/import', payload, {
      params: { strict: '1', project_id: this.config.projectId },
      headers: { 'Content-Type': 'application/json' }
    });
    return { success: response.data.code === 200 };
  }
}
