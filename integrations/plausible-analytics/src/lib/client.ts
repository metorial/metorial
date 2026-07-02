import { createAxios } from 'slates';

export class StatsClient {
  private axios;

  constructor(config: { token: string; baseUrl: string }) {
    this.axios = createAxios({
      baseURL: config.baseUrl,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async query(params: {
    siteId: string;
    metrics: string[];
    dateRange: string | string[];
    dimensions?: string[];
    filters?: any[];
    orderBy?: [string, string][];
    limit?: number;
    offset?: number;
    includeImports?: boolean;
    includeTimeLabels?: boolean;
    includeTotalRows?: boolean;
  }) {
    let body: Record<string, any> = {
      site_id: params.siteId,
      metrics: params.metrics,
      date_range: params.dateRange
    };

    if (params.dimensions && params.dimensions.length > 0) {
      body.dimensions = params.dimensions;
    }

    if (params.filters && params.filters.length > 0) {
      body.filters = params.filters;
    }

    if (params.orderBy && params.orderBy.length > 0) {
      body.order_by = params.orderBy;
    }

    let include: Record<string, boolean> = {};
    if (params.includeImports) include.imports = true;
    if (params.includeTimeLabels) include.time_labels = true;
    if (params.includeTotalRows) include.total_rows = true;
    if (Object.keys(include).length > 0) {
      body.include = include;
    }

    let pagination: Record<string, number> = {};
    if (params.limit !== undefined) pagination.limit = params.limit;
    if (params.offset !== undefined) pagination.offset = params.offset;
    if (Object.keys(pagination).length > 0) {
      body.pagination = pagination;
    }

    let response = await this.axios.post('/api/v2/query', body);
    return response.data;
  }

  async getRealtimeVisitors(siteId: string) {
    let response = await this.axios.get('/api/v1/stats/realtime/visitors', {
      params: { site_id: siteId }
    });
    return response.data;
  }
}

export class EventsClient {
  private axios;

  constructor(config: { baseUrl: string }) {
    this.axios = createAxios({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async sendEvent(params: {
    domain: string;
    name: string;
    url: string;
    referrer?: string;
    props?: Record<string, string>;
    revenue?: { currency: string; amount: string | number };
    userAgent?: string;
    ipAddress?: string;
  }) {
    let body: Record<string, any> = {
      domain: params.domain,
      name: params.name,
      url: params.url
    };

    if (params.referrer) body.referrer = params.referrer;
    if (params.props) body.props = params.props;
    if (params.revenue) body.revenue = params.revenue;

    let headers: Record<string, string> = {};
    if (params.userAgent) headers['User-Agent'] = params.userAgent;
    if (params.ipAddress) headers['X-Forwarded-For'] = params.ipAddress;

    let response = await this.axios.post('/api/event', body, { headers });
    return response.status;
  }
}

export class SitesClient {
  private axios;

  constructor(config: { token: string; baseUrl: string }) {
    this.axios = createAxios({
      baseURL: config.baseUrl,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Sites
  async listSites(params?: {
    after?: string;
    before?: string;
    limit?: number;
    teamId?: string;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.after) queryParams.after = params.after;
    if (params?.before) queryParams.before = params.before;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.teamId) queryParams.team_id = params.teamId;

    let response = await this.axios.get('/api/v1/sites', { params: queryParams });
    return response.data;
  }

  async getSite(siteId: string) {
    let response = await this.axios.get(`/api/v1/sites/${encodeURIComponent(siteId)}`);
    return response.data;
  }

  async createSite(params: {
    domain: string;
    timezone?: string;
    teamId?: string;
    trackerScriptConfiguration?: Record<string, boolean>;
  }) {
    let body: Record<string, any> = {
      domain: params.domain
    };
    if (params.timezone) body.timezone = params.timezone;
    if (params.teamId) body.team_id = params.teamId;
    if (params.trackerScriptConfiguration) {
      body.tracker_script_configuration = params.trackerScriptConfiguration;
    }

    let response = await this.axios.post('/api/v1/sites', body);
    return response.data;
  }

  async updateSite(
    siteId: string,
    params: {
      domain?: string;
      trackerScriptConfiguration?: Record<string, boolean>;
    }
  ) {
    let body: Record<string, any> = {};
    if (params.domain) body.domain = params.domain;
    if (params.trackerScriptConfiguration) {
      body.tracker_script_configuration = params.trackerScriptConfiguration;
    }

    let response = await this.axios.put(`/api/v1/sites/${encodeURIComponent(siteId)}`, body);
    return response.data;
  }

  async deleteSite(siteId: string) {
    let response = await this.axios.delete(`/api/v1/sites/${encodeURIComponent(siteId)}`);
    return response.data;
  }

  // Goals
  async listGoals(
    siteId: string,
    params?: { after?: string; before?: string; limit?: number }
  ) {
    let queryParams: Record<string, any> = { site_id: siteId };
    if (params?.after) queryParams.after = params.after;
    if (params?.before) queryParams.before = params.before;
    if (params?.limit) queryParams.limit = params.limit;

    let response = await this.axios.get('/api/v1/sites/goals', { params: queryParams });
    return response.data;
  }

  async createGoal(params: {
    siteId: string;
    goalType: 'event' | 'page';
    eventName?: string;
    pagePath?: string;
    displayName?: string;
    customProps?: Record<string, string[]>;
  }) {
    let body: Record<string, any> = {
      site_id: params.siteId,
      goal_type: params.goalType
    };
    if (params.eventName) body.event_name = params.eventName;
    if (params.pagePath) body.page_path = params.pagePath;
    if (params.displayName) body.display_name = params.displayName;
    if (params.customProps) body.custom_props = params.customProps;

    let response = await this.axios.put('/api/v1/sites/goals', body);
    return response.data;
  }

  async deleteGoal(siteId: string, goalId: string) {
    let response = await this.axios.delete(
      `/api/v1/sites/goals/${encodeURIComponent(goalId)}`,
      {
        data: { site_id: siteId }
      }
    );
    return response.data;
  }

  // Custom Properties
  async listCustomProperties(siteId: string) {
    let response = await this.axios.get('/api/v1/sites/custom-props', {
      params: { site_id: siteId }
    });
    return response.data;
  }

  async createCustomProperty(siteId: string, property: string) {
    let response = await this.axios.put('/api/v1/sites/custom-props', {
      site_id: siteId,
      property
    });
    return response.data;
  }

  async deleteCustomProperty(siteId: string, property: string) {
    let response = await this.axios.delete(
      `/api/v1/sites/custom-props/${encodeURIComponent(property)}`,
      {
        data: { site_id: siteId }
      }
    );
    return response.data;
  }

  // Shared Links
  async createSharedLink(siteId: string, name: string) {
    let response = await this.axios.put('/api/v1/sites/shared-links', {
      site_id: siteId,
      name
    });
    return response.data;
  }

  // Guests
  async listGuests(
    siteId: string,
    params?: { after?: string; before?: string; limit?: number }
  ) {
    let queryParams: Record<string, any> = { site_id: siteId };
    if (params?.after) queryParams.after = params.after;
    if (params?.before) queryParams.before = params.before;
    if (params?.limit) queryParams.limit = params.limit;

    let response = await this.axios.get('/api/v1/sites/guests', { params: queryParams });
    return response.data;
  }

  async inviteGuest(siteId: string, email: string, role: 'viewer' | 'editor') {
    let response = await this.axios.put('/api/v1/sites/guests', {
      site_id: siteId,
      email,
      role
    });
    return response.data;
  }

  async removeGuest(siteId: string, email: string) {
    let response = await this.axios.delete(
      `/api/v1/sites/guests/${encodeURIComponent(email)}`,
      {
        data: { site_id: siteId }
      }
    );
    return response.data;
  }

  // Teams
  async listTeams(params?: { after?: string; before?: string; limit?: number }) {
    let queryParams: Record<string, any> = {};
    if (params?.after) queryParams.after = params.after;
    if (params?.before) queryParams.before = params.before;
    if (params?.limit) queryParams.limit = params.limit;

    let response = await this.axios.get('/api/v1/sites/teams', { params: queryParams });
    return response.data;
  }
}
