import { createAxios } from 'slates';

export interface ModeClientConfig {
  token: string;
  secret: string;
  workspaceName: string;
}

export class ModeClient {
  private http: ReturnType<typeof createAxios>;
  private workspace: string;

  constructor(config: ModeClientConfig) {
    let basicAuth = btoa(`${config.token}:${config.secret}`);
    this.workspace = config.workspaceName;
    this.http = createAxios({
      baseURL: 'https://app.mode.com/api',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/hal+json',
        Authorization: `Basic ${basicAuth}`
      }
    });
  }

  // ===== Reports =====

  async getReport(reportToken: string): Promise<any> {
    let response = await this.http.get(`/${this.workspace}/reports/${reportToken}`);
    return response.data;
  }

  async listReportsInCollection(collectionToken: string, options?: ListOptions): Promise<any> {
    let params = buildListParams(options);
    let response = await this.http.get(
      `/${this.workspace}/spaces/${collectionToken}/reports`,
      { params }
    );
    return response.data;
  }

  async listReportsByDataSource(dataSourceToken: string, options?: ListOptions): Promise<any> {
    let params = buildListParams(options);
    let response = await this.http.get(
      `/${this.workspace}/data_sources/${dataSourceToken}/reports`,
      { params }
    );
    return response.data;
  }

  async updateReport(
    reportToken: string,
    data: { name?: string; description?: string; spaceToken?: string }
  ): Promise<any> {
    let body: any = { report: {} };
    if (data.name !== undefined) body.report.name = data.name;
    if (data.description !== undefined) body.report.description = data.description;
    if (data.spaceToken !== undefined) body.report.space_token = data.spaceToken;
    let response = await this.http.patch(`/${this.workspace}/reports/${reportToken}`, body);
    return response.data;
  }

  async archiveReport(reportToken: string): Promise<any> {
    let response = await this.http.patch(`/${this.workspace}/reports/${reportToken}/archive`);
    return response.data;
  }

  async unarchiveReport(reportToken: string): Promise<any> {
    let response = await this.http.patch(
      `/${this.workspace}/reports/${reportToken}/unarchive`
    );
    return response.data;
  }

  async deleteReport(reportToken: string): Promise<void> {
    await this.http.delete(`/${this.workspace}/reports/${reportToken}`);
  }

  // ===== Queries =====

  async getQuery(reportToken: string, queryToken: string): Promise<any> {
    let response = await this.http.get(
      `/${this.workspace}/reports/${reportToken}/queries/${queryToken}`
    );
    return response.data;
  }

  async listQueries(reportToken: string): Promise<any> {
    let response = await this.http.get(`/${this.workspace}/reports/${reportToken}/queries`);
    return response.data;
  }

  async createQuery(
    reportToken: string,
    data: { rawQuery: string; dataSourceId: number; name?: string }
  ): Promise<any> {
    let body: any = {
      query: {
        raw_query: data.rawQuery,
        data_source_id: data.dataSourceId
      }
    };
    if (data.name !== undefined) body.query.name = data.name;
    let response = await this.http.post(
      `/${this.workspace}/reports/${reportToken}/queries`,
      body
    );
    return response.data;
  }

  async updateQuery(
    reportToken: string,
    queryToken: string,
    data: { rawQuery?: string; dataSourceId?: number; name?: string }
  ): Promise<any> {
    let body: any = { query: {} };
    if (data.rawQuery !== undefined) body.query.raw_query = data.rawQuery;
    if (data.dataSourceId !== undefined) body.query.data_source_id = data.dataSourceId;
    if (data.name !== undefined) body.query.name = data.name;
    let response = await this.http.patch(
      `/${this.workspace}/reports/${reportToken}/queries/${queryToken}`,
      body
    );
    return response.data;
  }

  async deleteQuery(reportToken: string, queryToken: string): Promise<void> {
    await this.http.delete(`/${this.workspace}/reports/${reportToken}/queries/${queryToken}`);
  }

  // ===== Report Runs =====

  async getReportRun(reportToken: string, runToken: string): Promise<any> {
    let response = await this.http.get(
      `/${this.workspace}/reports/${reportToken}/runs/${runToken}`
    );
    return response.data;
  }

  async listReportRuns(reportToken: string, options?: ListOptions): Promise<any> {
    let params = buildListParams(options);
    let response = await this.http.get(`/${this.workspace}/reports/${reportToken}/runs`, {
      params
    });
    return response.data;
  }

  async createReportRun(reportToken: string, parameters?: Record<string, any>): Promise<any> {
    let body: any = {};
    if (parameters) {
      body.parameters = parameters;
    }
    let response = await this.http.post(
      `/${this.workspace}/reports/${reportToken}/runs`,
      body
    );
    return response.data;
  }

  // ===== Query Runs =====

  async getQueryRun(
    reportToken: string,
    runToken: string,
    queryRunToken: string
  ): Promise<any> {
    let response = await this.http.get(
      `/${this.workspace}/reports/${reportToken}/runs/${runToken}/query_runs/${queryRunToken}`
    );
    return response.data;
  }

  async listQueryRuns(reportToken: string, runToken: string): Promise<any> {
    let response = await this.http.get(
      `/${this.workspace}/reports/${reportToken}/runs/${runToken}/query_runs`
    );
    return response.data;
  }

  // ===== Collections (Spaces) =====

  async getCollection(collectionToken: string): Promise<any> {
    let response = await this.http.get(`/${this.workspace}/spaces/${collectionToken}`);
    return response.data;
  }

  async listCollections(options?: {
    filter?: string;
    page?: number;
    perPage?: number;
  }): Promise<any> {
    let params: Record<string, any> = {};
    if (options?.filter) params.filter = options.filter;
    if (options?.page) params.page = options.page;
    if (options?.perPage) params.per_page = options.perPage;
    let response = await this.http.get(`/${this.workspace}/spaces`, { params });
    return response.data;
  }

  async createCollection(data: {
    name: string;
    description?: string;
    spaceType?: string;
  }): Promise<any> {
    let body: any = {
      space: {
        name: data.name,
        space_type: data.spaceType || 'custom'
      }
    };
    if (data.description !== undefined) body.space.description = data.description;
    let response = await this.http.post(`/${this.workspace}/spaces`, body);
    return response.data;
  }

  async updateCollection(
    collectionToken: string,
    data: { name?: string; description?: string }
  ): Promise<any> {
    let body: any = { space: {} };
    if (data.name !== undefined) body.space.name = data.name;
    if (data.description !== undefined) body.space.description = data.description;
    let response = await this.http.post(`/${this.workspace}/spaces/${collectionToken}`, body);
    return response.data;
  }

  async deleteCollection(collectionToken: string): Promise<void> {
    await this.http.delete(`/${this.workspace}/spaces/${collectionToken}`);
  }

  // ===== Datasets =====

  async getDataset(datasetToken: string): Promise<any> {
    let response = await this.http.get(`/${this.workspace}/datasets/${datasetToken}`);
    return response.data;
  }

  async listDatasetsInCollection(
    collectionToken: string,
    options?: ListOptions
  ): Promise<any> {
    let params = buildListParams(options);
    let response = await this.http.get(
      `/${this.workspace}/spaces/${collectionToken}/datasets`,
      { params }
    );
    return response.data;
  }

  async listDatasetsByDataSource(
    dataSourceToken: string,
    options?: ListOptions
  ): Promise<any> {
    let params = buildListParams(options);
    let response = await this.http.get(
      `/${this.workspace}/data_sources/${dataSourceToken}/datasets`,
      { params }
    );
    return response.data;
  }

  async updateDataset(
    datasetToken: string,
    data: { name?: string; description?: string; spaceToken?: string }
  ): Promise<any> {
    let body: any = { dataset: {} };
    if (data.name !== undefined) body.dataset.name = data.name;
    if (data.description !== undefined) body.dataset.description = data.description;
    if (data.spaceToken !== undefined) body.dataset.space_token = data.spaceToken;
    let response = await this.http.patch(`/${this.workspace}/datasets/${datasetToken}`, body);
    return response.data;
  }

  async deleteDataset(datasetToken: string): Promise<void> {
    await this.http.delete(`/${this.workspace}/datasets/${datasetToken}`);
  }

  // ===== Data Sources =====

  async getDataSource(dataSourceToken: string): Promise<any> {
    let response = await this.http.get(`/${this.workspace}/data_sources/${dataSourceToken}`);
    return response.data;
  }

  async listDataSources(): Promise<any> {
    let response = await this.http.get(`/${this.workspace}/data_sources`);
    return response.data;
  }

  // ===== Report Schedules =====

  async getReportSchedule(reportToken: string, scheduleToken: string): Promise<any> {
    let response = await this.http.get(
      `/${this.workspace}/reports/${reportToken}/schedules/${scheduleToken}`
    );
    return response.data;
  }

  async listReportSchedules(reportToken: string): Promise<any> {
    let response = await this.http.get(`/${this.workspace}/reports/${reportToken}/schedules`);
    return response.data;
  }

  async createReportSchedule(reportToken: string, data: ScheduleData): Promise<any> {
    let body = buildScheduleBody(data);
    let response = await this.http.post(
      `/${this.workspace}/reports/${reportToken}/schedules`,
      body
    );
    return response.data;
  }

  async updateReportSchedule(
    reportToken: string,
    scheduleToken: string,
    data: Partial<ScheduleData>
  ): Promise<any> {
    let body = buildScheduleBody(data);
    let response = await this.http.patch(
      `/${this.workspace}/reports/${reportToken}/schedules/${scheduleToken}`,
      body
    );
    return response.data;
  }

  async deleteReportSchedule(reportToken: string, scheduleToken: string): Promise<void> {
    await this.http.delete(
      `/${this.workspace}/reports/${reportToken}/schedules/${scheduleToken}`
    );
  }

  // ===== Report Subscriptions =====

  async listReportSubscriptions(reportToken: string): Promise<any> {
    let response = await this.http.get(
      `/${this.workspace}/reports/${reportToken}/subscriptions`
    );
    return response.data;
  }

  async getReportSubscription(reportToken: string, subscriptionToken: string): Promise<any> {
    let response = await this.http.get(
      `/${this.workspace}/reports/${reportToken}/subscriptions/${subscriptionToken}`
    );
    return response.data;
  }

  // ===== Definitions =====

  async getDefinition(definitionToken: string): Promise<any> {
    let response = await this.http.get(`/${this.workspace}/definitions/${definitionToken}`);
    return response.data;
  }

  async listDefinitions(options?: { filter?: string; tokens?: string }): Promise<any> {
    let params: Record<string, any> = {};
    if (options?.filter) params.filter = options.filter;
    if (options?.tokens) params.tokens = options.tokens;
    let response = await this.http.get(`/${this.workspace}/definitions`, { params });
    return response.data;
  }

  async createDefinition(data: Record<string, any>): Promise<any> {
    let response = await this.http.post(`/${this.workspace}/definitions`, {
      definition: data
    });
    return response.data;
  }

  async updateDefinition(definitionToken: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.patch(`/${this.workspace}/definitions/${definitionToken}`, {
      definition: data
    });
    return response.data;
  }

  async deleteDefinition(definitionToken: string): Promise<void> {
    await this.http.delete(`/${this.workspace}/definitions/${definitionToken}`);
  }

  // ===== Members =====

  async listMembers(): Promise<any> {
    let response = await this.http.get(`/${this.workspace}/memberships`);
    return response.data;
  }

  async getMember(membershipToken: string): Promise<any> {
    let response = await this.http.get(`/${this.workspace}/memberships/${membershipToken}`);
    return response.data;
  }

  async removeMember(membershipToken: string): Promise<void> {
    await this.http.delete(`/${this.workspace}/memberships/${membershipToken}`);
  }
}

// ===== Helpers =====

export interface ListOptions {
  filter?: string;
  order?: 'asc' | 'desc';
  orderBy?: 'created_at' | 'updated_at';
  page?: number;
}

export interface ScheduleData {
  name?: string;
  frequency?: string;
  hour?: number;
  minute?: number;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timeZone?: string;
  params?: Record<string, any>;
  timeout?: number;
}

let buildListParams = (options?: ListOptions): Record<string, any> => {
  let params: Record<string, any> = {};
  if (options?.filter) params.filter = options.filter;
  if (options?.order) params.order = options.order;
  if (options?.orderBy) params.order_by = options.orderBy;
  if (options?.page) params.page = options.page;
  return params;
};

let buildScheduleBody = (data: Partial<ScheduleData>): any => {
  let schedule: any = {};
  if (data.name !== undefined) schedule.name = data.name;
  if (data.params !== undefined) schedule.params = data.params;
  if (data.timeout !== undefined) schedule.timeout = data.timeout;

  let cron: any = {};
  if (data.frequency !== undefined) cron.freq = data.frequency;
  if (data.hour !== undefined) cron.hour = data.hour;
  if (data.minute !== undefined) cron.minute = data.minute;
  if (data.dayOfWeek !== undefined) cron.day_of_week = data.dayOfWeek;
  if (data.dayOfMonth !== undefined) cron.day_of_month = data.dayOfMonth;
  if (data.timeZone !== undefined) cron.time_zone = data.timeZone;

  if (Object.keys(cron).length > 0) {
    schedule.cron = cron;
  }

  return { report_schedule: schedule };
};
