import { createAxios } from 'slates';

let analyticsAxios = createAxios({
  baseURL: 'https://youtubeanalytics.googleapis.com/v2'
});

let reportingAxios = createAxios({
  baseURL: 'https://youtubereporting.googleapis.com/v1'
});

export interface AnalyticsQueryParams {
  ids: string;
  startDate: string;
  endDate: string;
  metrics: string;
  dimensions?: string;
  filters?: string;
  sort?: string;
  maxResults?: number;
  startIndex?: number;
  currency?: string;
  includeHistoricalChannelData?: boolean;
}

export interface AnalyticsQueryResult {
  columnHeaders: Array<{
    name: string;
    dataType: string;
    columnType: string;
  }>;
  rows: Array<Array<string | number>>;
}

export interface Group {
  kind: string;
  etag: string;
  groupId: string;
  title: string;
  publishedAt: string;
  itemCount: number;
  itemType: string;
}

export interface GroupItem {
  groupItemId: string;
  groupId: string;
  resourceKind: string;
  resourceId: string;
}

export interface ReportType {
  reportTypeId: string;
  name: string;
}

export interface ReportingJob {
  jobId: string;
  reportTypeId: string;
  name: string;
  createTime: string;
  expireTime?: string;
  systemManaged?: boolean;
}

export interface BulkReport {
  reportId: string;
  jobId: string;
  startTime: string;
  endTime: string;
  createTime: string;
  jobExpireTime?: string;
  downloadUrl: string;
}

export class YouTubeAnalyticsClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private authHeaders() {
    return { Authorization: `Bearer ${this.token}` };
  }

  // --- YouTube Analytics API ---

  async queryReports(params: AnalyticsQueryParams): Promise<AnalyticsQueryResult> {
    let queryParams: Record<string, string | number | boolean> = {
      ids: params.ids,
      startDate: params.startDate,
      endDate: params.endDate,
      metrics: params.metrics
    };

    if (params.dimensions) queryParams.dimensions = params.dimensions;
    if (params.filters) queryParams.filters = params.filters;
    if (params.sort) queryParams.sort = params.sort;
    if (params.maxResults !== undefined) queryParams.maxResults = params.maxResults;
    if (params.startIndex !== undefined) queryParams.startIndex = params.startIndex;
    if (params.currency) queryParams.currency = params.currency;
    if (params.includeHistoricalChannelData !== undefined)
      queryParams.includeHistoricalChannelData = params.includeHistoricalChannelData;

    let response = await analyticsAxios.get('/reports', {
      params: queryParams,
      headers: this.authHeaders()
    });

    let data = response.data;

    return {
      columnHeaders: data.columnHeaders || [],
      rows: data.rows || []
    };
  }

  // --- Groups ---

  async listGroups(params?: {
    groupId?: string;
    mine?: boolean;
    onBehalfOfContentOwner?: string;
    pageToken?: string;
  }): Promise<{ groups: Group[]; nextPageToken?: string }> {
    let queryParams: Record<string, string | boolean> = {};

    if (params?.groupId) queryParams.id = params.groupId;
    else queryParams.mine = true;
    if (params?.onBehalfOfContentOwner)
      queryParams.onBehalfOfContentOwner = params.onBehalfOfContentOwner;
    if (params?.pageToken) queryParams.pageToken = params.pageToken;

    let response = await analyticsAxios.get('/groups', {
      params: queryParams,
      headers: this.authHeaders()
    });

    let data = response.data;

    return {
      groups: (data.items || []).map(mapGroup),
      nextPageToken: data.nextPageToken
    };
  }

  async createGroup(
    title: string,
    itemType: string,
    onBehalfOfContentOwner?: string
  ): Promise<Group> {
    let queryParams: Record<string, string> = {};
    if (onBehalfOfContentOwner) queryParams.onBehalfOfContentOwner = onBehalfOfContentOwner;

    let response = await analyticsAxios.post(
      '/groups',
      {
        snippet: { title },
        contentDetails: { itemType }
      },
      {
        params: queryParams,
        headers: {
          ...this.authHeaders(),
          'Content-Type': 'application/json'
        }
      }
    );

    return mapGroup(response.data);
  }

  async updateGroup(
    groupId: string,
    title: string,
    onBehalfOfContentOwner?: string
  ): Promise<Group> {
    let queryParams: Record<string, string> = {};
    if (onBehalfOfContentOwner) queryParams.onBehalfOfContentOwner = onBehalfOfContentOwner;

    let response = await analyticsAxios.put(
      '/groups',
      {
        id: groupId,
        snippet: { title }
      },
      {
        params: queryParams,
        headers: {
          ...this.authHeaders(),
          'Content-Type': 'application/json'
        }
      }
    );

    return mapGroup(response.data);
  }

  async deleteGroup(groupId: string, onBehalfOfContentOwner?: string): Promise<void> {
    let queryParams: Record<string, string> = { id: groupId };
    if (onBehalfOfContentOwner) queryParams.onBehalfOfContentOwner = onBehalfOfContentOwner;

    await analyticsAxios.delete('/groups', {
      params: queryParams,
      headers: this.authHeaders()
    });
  }

  // --- Group Items ---

  async listGroupItems(
    groupId: string,
    onBehalfOfContentOwner?: string
  ): Promise<GroupItem[]> {
    let queryParams: Record<string, string> = { groupId };
    if (onBehalfOfContentOwner) queryParams.onBehalfOfContentOwner = onBehalfOfContentOwner;

    let response = await analyticsAxios.get('/groupItems', {
      params: queryParams,
      headers: this.authHeaders()
    });

    return (response.data.items || []).map(mapGroupItem);
  }

  async addGroupItem(
    groupId: string,
    resourceId: string,
    resourceKind: string,
    onBehalfOfContentOwner?: string
  ): Promise<GroupItem> {
    let queryParams: Record<string, string> = {};
    if (onBehalfOfContentOwner) queryParams.onBehalfOfContentOwner = onBehalfOfContentOwner;

    let response = await analyticsAxios.post(
      '/groupItems',
      {
        groupId,
        resource: {
          kind: resourceKind,
          id: resourceId
        }
      },
      {
        params: queryParams,
        headers: {
          ...this.authHeaders(),
          'Content-Type': 'application/json'
        }
      }
    );

    return mapGroupItem(response.data);
  }

  async removeGroupItem(groupItemId: string, onBehalfOfContentOwner?: string): Promise<void> {
    let queryParams: Record<string, string> = { id: groupItemId };
    if (onBehalfOfContentOwner) queryParams.onBehalfOfContentOwner = onBehalfOfContentOwner;

    await analyticsAxios.delete('/groupItems', {
      params: queryParams,
      headers: this.authHeaders()
    });
  }

  // --- YouTube Reporting API ---

  async listReportTypes(params?: {
    onBehalfOfContentOwner?: string;
    includeSystemManaged?: boolean;
    pageToken?: string;
  }): Promise<{ reportTypes: ReportType[]; nextPageToken?: string }> {
    let queryParams: Record<string, string | boolean> = {};
    if (params?.onBehalfOfContentOwner)
      queryParams.onBehalfOfContentOwner = params.onBehalfOfContentOwner;
    if (params?.includeSystemManaged !== undefined)
      queryParams.includeSystemManaged = params.includeSystemManaged;
    if (params?.pageToken) queryParams.pageToken = params.pageToken;

    let response = await reportingAxios.get('/reportTypes', {
      params: queryParams,
      headers: this.authHeaders()
    });

    let data = response.data;

    return {
      reportTypes: (data.reportTypes || []).map((rt: any) => ({
        reportTypeId: rt.id,
        name: rt.name
      })),
      nextPageToken: data.nextPageToken
    };
  }

  async createReportingJob(
    reportTypeId: string,
    name: string,
    onBehalfOfContentOwner?: string
  ): Promise<ReportingJob> {
    let queryParams: Record<string, string> = {};
    if (onBehalfOfContentOwner) queryParams.onBehalfOfContentOwner = onBehalfOfContentOwner;

    let response = await reportingAxios.post(
      '/jobs',
      {
        reportTypeId,
        name
      },
      {
        params: queryParams,
        headers: {
          ...this.authHeaders(),
          'Content-Type': 'application/json'
        }
      }
    );

    return mapReportingJob(response.data);
  }

  async listReportingJobs(params?: {
    onBehalfOfContentOwner?: string;
    includeSystemManaged?: boolean;
    pageToken?: string;
  }): Promise<{ jobs: ReportingJob[]; nextPageToken?: string }> {
    let queryParams: Record<string, string | boolean> = {};
    if (params?.onBehalfOfContentOwner)
      queryParams.onBehalfOfContentOwner = params.onBehalfOfContentOwner;
    if (params?.includeSystemManaged !== undefined)
      queryParams.includeSystemManaged = params.includeSystemManaged;
    if (params?.pageToken) queryParams.pageToken = params.pageToken;

    let response = await reportingAxios.get('/jobs', {
      params: queryParams,
      headers: this.authHeaders()
    });

    let data = response.data;

    return {
      jobs: (data.jobs || []).map(mapReportingJob),
      nextPageToken: data.nextPageToken
    };
  }

  async getReportingJob(
    jobId: string,
    onBehalfOfContentOwner?: string
  ): Promise<ReportingJob> {
    let queryParams: Record<string, string> = {};
    if (onBehalfOfContentOwner) queryParams.onBehalfOfContentOwner = onBehalfOfContentOwner;

    let response = await reportingAxios.get(`/jobs/${encodeURIComponent(jobId)}`, {
      params: queryParams,
      headers: this.authHeaders()
    });

    return mapReportingJob(response.data);
  }

  async deleteReportingJob(jobId: string, onBehalfOfContentOwner?: string): Promise<void> {
    let queryParams: Record<string, string> = {};
    if (onBehalfOfContentOwner) queryParams.onBehalfOfContentOwner = onBehalfOfContentOwner;

    await reportingAxios.delete(`/jobs/${encodeURIComponent(jobId)}`, {
      params: queryParams,
      headers: this.authHeaders()
    });
  }

  async listBulkReports(
    jobId: string,
    params?: {
      createdAfter?: string;
      startTimeAtOrAfter?: string;
      startTimeBefore?: string;
      onBehalfOfContentOwner?: string;
      pageToken?: string;
    }
  ): Promise<{ reports: BulkReport[]; nextPageToken?: string }> {
    let queryParams: Record<string, string> = {};
    if (params?.createdAfter) queryParams.createdAfter = params.createdAfter;
    if (params?.startTimeAtOrAfter) queryParams.startTimeAtOrAfter = params.startTimeAtOrAfter;
    if (params?.startTimeBefore) queryParams.startTimeBefore = params.startTimeBefore;
    if (params?.onBehalfOfContentOwner)
      queryParams.onBehalfOfContentOwner = params.onBehalfOfContentOwner;
    if (params?.pageToken) queryParams.pageToken = params.pageToken;

    let response = await reportingAxios.get(`/jobs/${encodeURIComponent(jobId)}/reports`, {
      params: queryParams,
      headers: this.authHeaders()
    });

    let data = response.data;

    return {
      reports: (data.reports || []).map(mapBulkReport),
      nextPageToken: data.nextPageToken
    };
  }

  async getBulkReport(
    jobId: string,
    reportId: string,
    onBehalfOfContentOwner?: string
  ): Promise<BulkReport> {
    let queryParams: Record<string, string> = {};
    if (onBehalfOfContentOwner) queryParams.onBehalfOfContentOwner = onBehalfOfContentOwner;

    let response = await reportingAxios.get(
      `/jobs/${encodeURIComponent(jobId)}/reports/${encodeURIComponent(reportId)}`,
      {
        params: queryParams,
        headers: this.authHeaders()
      }
    );

    return mapBulkReport(response.data);
  }

  async downloadBulkReport(downloadUrl: string): Promise<string> {
    let response = await reportingAxios.get(downloadUrl, {
      headers: this.authHeaders(),
      responseType: 'text'
    });

    return response.data;
  }
}

// --- Mapping helpers ---

let mapGroup = (raw: any): Group => ({
  kind: raw.kind,
  etag: raw.etag,
  groupId: raw.id,
  title: raw.snippet?.title,
  publishedAt: raw.snippet?.publishedAt,
  itemCount: raw.contentDetails?.itemCount ? Number(raw.contentDetails.itemCount) : 0,
  itemType: raw.contentDetails?.itemType
});

let mapGroupItem = (raw: any): GroupItem => ({
  groupItemId: raw.id,
  groupId: raw.groupId,
  resourceKind: raw.resource?.kind,
  resourceId: raw.resource?.id
});

let mapReportingJob = (raw: any): ReportingJob => ({
  jobId: raw.id,
  reportTypeId: raw.reportTypeId,
  name: raw.name,
  createTime: raw.createTime,
  expireTime: raw.expireTime,
  systemManaged: raw.systemManaged
});

let mapBulkReport = (raw: any): BulkReport => ({
  reportId: raw.id,
  jobId: raw.jobId,
  startTime: raw.startTime,
  endTime: raw.endTime,
  createTime: raw.createTime,
  jobExpireTime: raw.jobExpireTime,
  downloadUrl: raw.downloadUrl
});
