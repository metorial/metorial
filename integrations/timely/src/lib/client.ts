import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.timelyapp.com/1.1'
});

export class TimelyClient {
  private accountId: string;
  private token: string;

  constructor(config: { accountId: string; token: string }) {
    this.accountId = config.accountId;
    this.token = config.token;
  }

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  private url(path: string): string {
    return `/${this.accountId}${path}`;
  }

  // ─── Accounts ───

  async getAccounts(): Promise<any[]> {
    let res = await http.get('/accounts', { headers: this.headers });
    return res.data;
  }

  async getAccount(): Promise<any> {
    let res = await http.get(`/accounts/${this.accountId}`, { headers: this.headers });
    return res.data;
  }

  // ─── Events (Time Entries) ───

  async listEvents(params?: {
    since?: string;
    upto?: string;
    day?: string;
    projectId?: string;
    userId?: string;
    page?: number;
    perPage?: number;
    sort?: string;
    order?: string;
  }): Promise<any[]> {
    let queryParams: Record<string, string> = {};
    if (params?.since) queryParams.since = params.since;
    if (params?.upto) queryParams.upto = params.upto;
    if (params?.day) queryParams.day = params.day;
    if (params?.page) queryParams.page = String(params.page);
    if (params?.perPage) queryParams.per_page = String(params.perPage);
    if (params?.sort) queryParams.sort = params.sort;
    if (params?.order) queryParams.order = params.order;

    let basePath: string;
    if (params?.userId) {
      basePath = this.url(`/users/${params.userId}/events`);
    } else if (params?.projectId) {
      basePath = this.url(`/projects/${params.projectId}/events`);
    } else {
      basePath = this.url('/events');
    }

    let res = await http.get(basePath, { headers: this.headers, params: queryParams });
    return res.data;
  }

  async getEvent(eventId: string): Promise<any> {
    let res = await http.get(this.url(`/events/${eventId}`), { headers: this.headers });
    return res.data;
  }

  async createEvent(event: {
    hours?: number;
    minutes?: number;
    day: string;
    projectId?: string;
    note?: string;
    from?: string;
    to?: string;
    labelIds?: number[];
    hourRate?: number;
    estimatedHours?: number;
    estimatedMinutes?: number;
    externalId?: string;
    userId?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      day: event.day
    };
    if (event.hours !== undefined) body.hours = event.hours;
    if (event.minutes !== undefined) body.minutes = event.minutes;
    if (event.projectId) body.project_id = Number(event.projectId);
    if (event.note !== undefined) body.note = event.note;
    if (event.from) body.from = event.from;
    if (event.to) body.to = event.to;
    if (event.labelIds) body.label_ids = event.labelIds;
    if (event.hourRate !== undefined) body.hour_rate = event.hourRate;
    if (event.estimatedHours !== undefined) body.estimated_hours = event.estimatedHours;
    if (event.estimatedMinutes !== undefined) body.estimated_minutes = event.estimatedMinutes;
    if (event.externalId) body.external_id = event.externalId;

    let path = event.userId ? this.url(`/users/${event.userId}/events`) : this.url('/events');

    let res = await http.post(path, { event: body }, { headers: this.headers });
    return res.data;
  }

  async updateEvent(
    eventId: string,
    event: {
      hours?: number;
      minutes?: number;
      day?: string;
      projectId?: string;
      note?: string;
      from?: string;
      to?: string;
      labelIds?: number[];
      hourRate?: number;
      estimatedHours?: number;
      estimatedMinutes?: number;
      externalId?: string;
      billed?: boolean;
      billable?: boolean;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (event.hours !== undefined) body.hours = event.hours;
    if (event.minutes !== undefined) body.minutes = event.minutes;
    if (event.day) body.day = event.day;
    if (event.projectId) body.project_id = Number(event.projectId);
    if (event.note !== undefined) body.note = event.note;
    if (event.from) body.from = event.from;
    if (event.to) body.to = event.to;
    if (event.labelIds) body.label_ids = event.labelIds;
    if (event.hourRate !== undefined) body.hour_rate = event.hourRate;
    if (event.estimatedHours !== undefined) body.estimated_hours = event.estimatedHours;
    if (event.estimatedMinutes !== undefined) body.estimated_minutes = event.estimatedMinutes;
    if (event.externalId) body.external_id = event.externalId;
    if (event.billed !== undefined) body.billed = event.billed;
    if (event.billable !== undefined) body.billable = event.billable;

    let res = await http.put(
      this.url(`/events/${eventId}`),
      { event: body },
      { headers: this.headers }
    );
    return res.data;
  }

  async deleteEvent(eventId: string): Promise<void> {
    await http.delete(this.url(`/events/${eventId}`), { headers: this.headers });
  }

  async startTimer(eventId: string): Promise<any> {
    let res = await http.post(
      this.url(`/events/${eventId}/start_timer`),
      {},
      { headers: this.headers }
    );
    return res.data;
  }

  async stopTimer(eventId: string): Promise<any> {
    let res = await http.post(
      this.url(`/events/${eventId}/stop_timer`),
      {},
      { headers: this.headers }
    );
    return res.data;
  }

  // ─── Projects ───

  async listProjects(params?: {
    limit?: number;
    offset?: number;
    order?: string;
    filter?: string;
  }): Promise<any[]> {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.order) queryParams.order = params.order;
    if (params?.filter) queryParams.filter = params.filter;

    let res = await http.get(this.url('/projects'), {
      headers: this.headers,
      params: queryParams
    });
    return res.data;
  }

  async getProject(projectId: string): Promise<any> {
    let res = await http.get(this.url(`/projects/${projectId}`), { headers: this.headers });
    return res.data;
  }

  async createProject(project: {
    name: string;
    description?: string;
    clientId?: string;
    color?: string;
    billable?: boolean;
    budget?: number;
    budgetType?: string;
    hourRate?: number;
    rateType?: string;
    requiredNotes?: boolean;
    requiredLabels?: boolean;
    enableLabels?: string;
    externalId?: string;
    teamIds?: number[];
    labelIds?: number[];
    users?: Array<{ userId: number; hourRate?: number }>;
  }): Promise<any> {
    let body: Record<string, any> = { name: project.name };
    if (project.description !== undefined) body.description = project.description;
    if (project.clientId) body.client_id = Number(project.clientId);
    if (project.color) body.color = project.color;
    if (project.billable !== undefined) body.billable = project.billable;
    if (project.budget !== undefined) body.budget = project.budget;
    if (project.budgetType) body.budget_type = project.budgetType;
    if (project.hourRate !== undefined) body.hour_rate = project.hourRate;
    if (project.rateType) body.rate_type = project.rateType;
    if (project.requiredNotes !== undefined) body.required_notes = project.requiredNotes;
    if (project.requiredLabels !== undefined) body.required_labels = project.requiredLabels;
    if (project.enableLabels) body.enable_labels = project.enableLabels;
    if (project.externalId) body.external_id = project.externalId;
    if (project.teamIds) body.team_ids = project.teamIds;
    if (project.labelIds) body.label_ids = project.labelIds;
    if (project.users) {
      body.users = project.users.map(u => ({
        user_id: u.userId,
        ...(u.hourRate !== undefined ? { hour_rate: u.hourRate } : {})
      }));
    }

    let res = await http.post(
      this.url('/projects'),
      { project: body },
      { headers: this.headers }
    );
    return res.data;
  }

  async updateProject(
    projectId: string,
    project: {
      name?: string;
      description?: string;
      clientId?: string;
      color?: string;
      billable?: boolean;
      budget?: number;
      budgetType?: string;
      hourRate?: number;
      rateType?: string;
      requiredNotes?: boolean;
      requiredLabels?: boolean;
      enableLabels?: string;
      externalId?: string;
      teamIds?: number[];
      labelIds?: number[];
      users?: Array<{ userId: number; hourRate?: number }>;
      active?: boolean;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (project.name !== undefined) body.name = project.name;
    if (project.description !== undefined) body.description = project.description;
    if (project.clientId) body.client_id = Number(project.clientId);
    if (project.color) body.color = project.color;
    if (project.billable !== undefined) body.billable = project.billable;
    if (project.budget !== undefined) body.budget = project.budget;
    if (project.budgetType) body.budget_type = project.budgetType;
    if (project.hourRate !== undefined) body.hour_rate = project.hourRate;
    if (project.rateType) body.rate_type = project.rateType;
    if (project.requiredNotes !== undefined) body.required_notes = project.requiredNotes;
    if (project.requiredLabels !== undefined) body.required_labels = project.requiredLabels;
    if (project.enableLabels) body.enable_labels = project.enableLabels;
    if (project.externalId) body.external_id = project.externalId;
    if (project.teamIds) body.team_ids = project.teamIds;
    if (project.labelIds) body.label_ids = project.labelIds;
    if (project.active !== undefined) body.active = project.active;
    if (project.users) {
      body.users = project.users.map(u => ({
        user_id: u.userId,
        ...(u.hourRate !== undefined ? { hour_rate: u.hourRate } : {})
      }));
    }

    let res = await http.put(
      this.url(`/projects/${projectId}`),
      { project: body },
      { headers: this.headers }
    );
    return res.data;
  }

  async deleteProject(projectId: string): Promise<void> {
    await http.delete(this.url(`/projects/${projectId}`), { headers: this.headers });
  }

  // ─── Clients ───

  async listClients(params?: {
    limit?: number;
    offset?: number;
    order?: string;
    show?: string;
  }): Promise<any[]> {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.order) queryParams.order = params.order;
    if (params?.show) queryParams.show = params.show;

    let res = await http.get(this.url('/clients'), {
      headers: this.headers,
      params: queryParams
    });
    return res.data;
  }

  async getClient(clientId: string): Promise<any> {
    let res = await http.get(this.url(`/clients/${clientId}`), { headers: this.headers });
    return res.data;
  }

  async createClient(client: {
    name: string;
    color?: string;
    externalId?: string;
    active?: boolean;
  }): Promise<any> {
    let body: Record<string, any> = { name: client.name };
    if (client.color) body.color = client.color;
    if (client.externalId) body.external_id = client.externalId;
    if (client.active !== undefined) body.active = client.active;

    let res = await http.post(
      this.url('/clients'),
      { client: body },
      { headers: this.headers }
    );
    return res.data;
  }

  async updateClient(
    clientId: string,
    client: {
      name?: string;
      color?: string;
      externalId?: string;
      active?: boolean;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (client.name !== undefined) body.name = client.name;
    if (client.color) body.color = client.color;
    if (client.externalId) body.external_id = client.externalId;
    if (client.active !== undefined) body.active = client.active;

    let res = await http.put(
      this.url(`/clients/${clientId}`),
      { client: body },
      { headers: this.headers }
    );
    return res.data;
  }

  // ─── Labels ───

  async listLabels(params?: { limit?: number; offset?: number }): Promise<any[]> {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);

    let res = await http.get(this.url('/labels'), {
      headers: this.headers,
      params: queryParams
    });
    return res.data;
  }

  async getLabel(labelId: string): Promise<any> {
    let res = await http.get(this.url(`/labels/${labelId}`), { headers: this.headers });
    return res.data;
  }

  async createLabel(label: { name: string; parentId?: number; emoji?: string }): Promise<any> {
    let body: Record<string, any> = { name: label.name };
    if (label.parentId !== undefined) body.parent_id = label.parentId;
    if (label.emoji) body.emoji = label.emoji;

    let res = await http.post(this.url('/labels'), { label: body }, { headers: this.headers });
    return res.data;
  }

  async updateLabel(
    labelId: string,
    label: {
      name?: string;
      parentId?: number;
      emoji?: string;
      active?: boolean;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (label.name !== undefined) body.name = label.name;
    if (label.parentId !== undefined) body.parent_id = label.parentId;
    if (label.emoji !== undefined) body.emoji = label.emoji;
    if (label.active !== undefined) body.active = label.active;

    let res = await http.put(
      this.url(`/labels/${labelId}`),
      { label: body },
      { headers: this.headers }
    );
    return res.data;
  }

  async deleteLabel(labelId: string): Promise<void> {
    await http.delete(this.url(`/labels/${labelId}`), { headers: this.headers });
  }

  // ─── Teams ───

  async listTeams(params?: {
    limit?: number;
    offset?: number;
    order?: string;
  }): Promise<any[]> {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.order) queryParams.order = params.order;

    let res = await http.get(this.url('/teams'), {
      headers: this.headers,
      params: queryParams
    });
    return res.data;
  }

  async getTeam(teamId: string): Promise<any> {
    let res = await http.get(this.url(`/teams/${teamId}`), { headers: this.headers });
    return res.data;
  }

  async createTeam(team: { name: string; color?: string; userIds?: number[] }): Promise<any> {
    let body: Record<string, any> = { name: team.name };
    if (team.color) body.color = team.color;
    if (team.userIds) body.user_ids = team.userIds;

    let res = await http.post(this.url('/teams'), { team: body }, { headers: this.headers });
    return res.data;
  }

  async updateTeam(
    teamId: string,
    team: {
      name?: string;
      color?: string;
      userIds?: number[];
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (team.name !== undefined) body.name = team.name;
    if (team.color) body.color = team.color;
    if (team.userIds) body.user_ids = team.userIds;

    let res = await http.put(
      this.url(`/teams/${teamId}`),
      { team: body },
      { headers: this.headers }
    );
    return res.data;
  }

  async deleteTeam(teamId: string): Promise<void> {
    await http.delete(this.url(`/teams/${teamId}`), { headers: this.headers });
  }

  // ─── Users ───

  async listUsers(params?: {
    limit?: number;
    offset?: number;
    order?: string;
    show?: string;
  }): Promise<any[]> {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.order) queryParams.order = params.order;
    if (params?.show) queryParams.show = params.show;

    let res = await http.get(this.url('/users'), {
      headers: this.headers,
      params: queryParams
    });
    return res.data;
  }

  async getUser(userId: string): Promise<any> {
    let res = await http.get(this.url(`/users/${userId}`), { headers: this.headers });
    return res.data;
  }

  async getCurrentUser(): Promise<any> {
    let res = await http.get(this.url('/users/current'), { headers: this.headers });
    return res.data;
  }

  // ─── Forecasts (Tasks) ───

  async listForecasts(params?: {
    since?: string;
    upto?: string;
    projectId?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let queryParams: Record<string, string> = {};
    if (params?.since) queryParams.since = params.since;
    if (params?.upto) queryParams.upto = params.upto;
    if (params?.projectId) queryParams.project_id = params.projectId;
    if (params?.userId) queryParams.user_id = params.userId;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);

    let res = await http.get(this.url('/forecasts'), {
      headers: this.headers,
      params: queryParams
    });
    return res.data;
  }

  async createForecast(forecast: {
    projectId: string;
    userId?: string;
    hours?: number;
    minutes?: number;
    estimatedHours?: number;
    estimatedMinutes?: number;
    day?: string;
    from?: string;
    to?: string;
    note?: string;
    labelIds?: number[];
  }): Promise<any> {
    let body: Record<string, any> = {
      project_id: Number(forecast.projectId)
    };
    if (forecast.userId) body.user_id = Number(forecast.userId);
    if (forecast.hours !== undefined) body.hours = forecast.hours;
    if (forecast.minutes !== undefined) body.minutes = forecast.minutes;
    if (forecast.estimatedHours !== undefined) body.estimated_hours = forecast.estimatedHours;
    if (forecast.estimatedMinutes !== undefined)
      body.estimated_minutes = forecast.estimatedMinutes;
    if (forecast.day) body.day = forecast.day;
    if (forecast.from) body.from = forecast.from;
    if (forecast.to) body.to = forecast.to;
    if (forecast.note !== undefined) body.note = forecast.note;
    if (forecast.labelIds) body.label_ids = forecast.labelIds;

    let res = await http.post(
      this.url('/forecasts'),
      { forecast: body },
      { headers: this.headers }
    );
    return res.data;
  }

  async updateForecast(
    forecastId: string,
    forecast: {
      projectId?: string;
      userId?: string;
      hours?: number;
      minutes?: number;
      estimatedHours?: number;
      estimatedMinutes?: number;
      day?: string;
      from?: string;
      to?: string;
      note?: string;
      labelIds?: number[];
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (forecast.projectId) body.project_id = Number(forecast.projectId);
    if (forecast.userId) body.user_id = Number(forecast.userId);
    if (forecast.hours !== undefined) body.hours = forecast.hours;
    if (forecast.minutes !== undefined) body.minutes = forecast.minutes;
    if (forecast.estimatedHours !== undefined) body.estimated_hours = forecast.estimatedHours;
    if (forecast.estimatedMinutes !== undefined)
      body.estimated_minutes = forecast.estimatedMinutes;
    if (forecast.day) body.day = forecast.day;
    if (forecast.from) body.from = forecast.from;
    if (forecast.to) body.to = forecast.to;
    if (forecast.note !== undefined) body.note = forecast.note;
    if (forecast.labelIds) body.label_ids = forecast.labelIds;

    let res = await http.put(
      this.url(`/forecasts/${forecastId}`),
      { forecast: body },
      { headers: this.headers }
    );
    return res.data;
  }

  async deleteForecast(forecastId: string): Promise<void> {
    await http.delete(this.url(`/forecasts/${forecastId}`), { headers: this.headers });
  }

  // ─── Reports ───

  async getFilteredReports(params: {
    since: string;
    upto: string;
    userIds?: string[];
    projectIds?: string[];
    labelIds?: string[];
    teamIds?: string[];
    groupBy?: string[];
  }): Promise<any> {
    let queryParams: Record<string, string> = {
      since: params.since,
      upto: params.upto
    };
    if (params.userIds?.length) queryParams.user_ids = params.userIds.join(',');
    if (params.projectIds?.length) queryParams.project_ids = params.projectIds.join(',');
    if (params.labelIds?.length) queryParams.label_ids = params.labelIds.join(',');
    if (params.teamIds?.length) queryParams.team_ids = params.teamIds.join(',');
    if (params.groupBy?.length) queryParams.group_by = params.groupBy.join(',');

    let res = await http.get(this.url('/reports/filter'), {
      headers: this.headers,
      params: queryParams
    });
    return res.data;
  }

  // ─── Day Properties (Locking) ───

  async lockDays(userIds: number[], dates: string[]): Promise<any> {
    let res = await http.post(
      this.url('/day_properties'),
      {
        user_ids: userIds,
        dates,
        locked: true
      },
      { headers: this.headers }
    );
    return res.data;
  }

  async unlockDays(userIds: number[], dates: string[]): Promise<any> {
    let res = await http.put(
      this.url('/day_properties'),
      {
        user_ids: userIds,
        dates,
        locked: false
      },
      { headers: this.headers }
    );
    return res.data;
  }

  // ─── Webhooks ───

  async listWebhooks(): Promise<any[]> {
    let res = await http.get(this.url('/webhooks'), { headers: this.headers });
    return res.data;
  }

  async createWebhook(webhook: { url: string; eventTypes: string[] }): Promise<any> {
    let res = await http.post(
      this.url('/webhooks'),
      {
        webhook: {
          url: webhook.url,
          event_types: webhook.eventTypes
        }
      },
      { headers: this.headers }
    );
    return res.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await http.delete(this.url(`/webhooks/${webhookId}`), { headers: this.headers });
  }
}
