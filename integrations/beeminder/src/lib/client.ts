import { createAxios } from 'slates';

export class BeeminderClient {
  private http;
  private username: string;

  constructor(config: { token: string; username: string }) {
    this.username = config.username;
    this.http = createAxios({
      baseURL: 'https://www.beeminder.com/api/v1',
      params: {
        auth_token: config.token
      }
    });
  }

  private get user() {
    return this.username || 'me';
  }

  // ── User ──────────────────────────────────────────────────────

  async getUser(params?: { diffSince?: number; skinny?: boolean }) {
    let queryParams: Record<string, any> = {};
    if (params?.diffSince !== undefined) queryParams.diff_since = params.diffSince;
    if (params?.skinny !== undefined) queryParams.skinny = params.skinny;

    let response = await this.http.get(`/users/${this.user}.json`, { params: queryParams });
    return response.data;
  }

  // ── Goals ─────────────────────────────────────────────────────

  async getGoals() {
    let response = await this.http.get(`/users/${this.user}/goals.json`);
    return response.data;
  }

  async getArchivedGoals() {
    let response = await this.http.get(`/users/${this.user}/goals/archived.json`);
    return response.data;
  }

  async getGoal(goalSlug: string) {
    let response = await this.http.get(`/users/${this.user}/goals/${goalSlug}.json`);
    return response.data;
  }

  async createGoal(params: {
    slug: string;
    title: string;
    goalType: string;
    gunits: string;
    goaldate?: number;
    goalval?: number;
    rate?: number;
    initval?: number;
    secret?: boolean;
    datapublic?: boolean;
    datelast?: number;
    tags?: string[];
    pledge?: number;
  }) {
    let body: Record<string, any> = {
      slug: params.slug,
      title: params.title,
      goal_type: params.goalType,
      gunits: params.gunits
    };
    if (params.goaldate !== undefined) body.goaldate = params.goaldate;
    if (params.goalval !== undefined) body.goalval = params.goalval;
    if (params.rate !== undefined) body.rate = params.rate;
    if (params.initval !== undefined) body.initval = params.initval;
    if (params.secret !== undefined) body.secret = params.secret;
    if (params.datapublic !== undefined) body.datapublic = params.datapublic;
    if (params.datelast !== undefined) body.datelast = params.datelast;
    if (params.tags !== undefined) body.tags = params.tags.join(' ');
    if (params.pledge !== undefined) body.pledge = params.pledge;

    let response = await this.http.post(`/users/${this.user}/goals.json`, body);
    return response.data;
  }

  async updateGoal(
    goalSlug: string,
    params: {
      title?: string;
      yaxis?: string;
      secret?: boolean;
      datapublic?: boolean;
      roadall?: any[];
      tags?: string[];
      callbackUrl?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (params.title !== undefined) body.title = params.title;
    if (params.yaxis !== undefined) body.yaxis = params.yaxis;
    if (params.secret !== undefined) body.secret = params.secret;
    if (params.datapublic !== undefined) body.datapublic = params.datapublic;
    if (params.roadall !== undefined) body.roadall = JSON.stringify(params.roadall);
    if (params.tags !== undefined) body.tags = params.tags.join(' ');
    if (params.callbackUrl !== undefined) body.callback_url = params.callbackUrl;

    let response = await this.http.put(`/users/${this.user}/goals/${goalSlug}.json`, body);
    return response.data;
  }

  async refreshGoal(goalSlug: string) {
    let response = await this.http.get(
      `/users/${this.user}/goals/${goalSlug}/refresh_graph.json`
    );
    return response.data;
  }

  async shortcircuit(goalSlug: string) {
    let response = await this.http.post(
      `/users/${this.user}/goals/${goalSlug}/shortcircuit.json`
    );
    return response.data;
  }

  async stepdown(goalSlug: string) {
    let response = await this.http.post(`/users/${this.user}/goals/${goalSlug}/stepdown.json`);
    return response.data;
  }

  async cancelStepdown(goalSlug: string) {
    let response = await this.http.post(
      `/users/${this.user}/goals/${goalSlug}/cancel_stepdown.json`
    );
    return response.data;
  }

  async ratchet(goalSlug: string, newsafety: number) {
    let response = await this.http.post(`/users/${this.user}/goals/${goalSlug}/ratchet.json`, {
      newsafety
    });
    return response.data;
  }

  async uncle(goalSlug: string) {
    let response = await this.http.post(`/users/${this.user}/goals/${goalSlug}/uncleme.json`);
    return response.data;
  }

  // ── Datapoints ────────────────────────────────────────────────

  async getDatapoints(
    goalSlug: string,
    params?: {
      sort?: string;
      count?: number;
      page?: number;
      per?: number;
    }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.sort !== undefined) queryParams.sort = params.sort;
    if (params?.count !== undefined) queryParams.count = params.count;
    if (params?.page !== undefined) queryParams.page = params.page;
    if (params?.per !== undefined) queryParams.per = params.per;

    let response = await this.http.get(
      `/users/${this.user}/goals/${goalSlug}/datapoints.json`,
      {
        params: queryParams
      }
    );
    return response.data;
  }

  async createDatapoint(
    goalSlug: string,
    params: {
      value: number;
      timestamp?: number;
      daystamp?: string;
      comment?: string;
      requestid?: string;
    }
  ) {
    let body: Record<string, any> = { value: params.value };
    if (params.timestamp !== undefined) body.timestamp = params.timestamp;
    if (params.daystamp !== undefined) body.daystamp = params.daystamp;
    if (params.comment !== undefined) body.comment = params.comment;
    if (params.requestid !== undefined) body.requestid = params.requestid;

    let response = await this.http.post(
      `/users/${this.user}/goals/${goalSlug}/datapoints.json`,
      body
    );
    return response.data;
  }

  async createDatapoints(
    goalSlug: string,
    datapoints: Array<{
      value: number;
      timestamp?: number;
      daystamp?: string;
      comment?: string;
      requestid?: string;
    }>
  ) {
    let response = await this.http.post(
      `/users/${this.user}/goals/${goalSlug}/datapoints/create_all.json`,
      { datapoints }
    );
    return response.data;
  }

  async updateDatapoint(
    goalSlug: string,
    datapointId: string,
    params: {
      value?: number;
      timestamp?: number;
      daystamp?: string;
      comment?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (params.value !== undefined) body.value = params.value;
    if (params.timestamp !== undefined) body.timestamp = params.timestamp;
    if (params.daystamp !== undefined) body.daystamp = params.daystamp;
    if (params.comment !== undefined) body.comment = params.comment;

    let response = await this.http.put(
      `/users/${this.user}/goals/${goalSlug}/datapoints/${datapointId}.json`,
      body
    );
    return response.data;
  }

  async deleteDatapoint(goalSlug: string, datapointId: string) {
    let response = await this.http.delete(
      `/users/${this.user}/goals/${goalSlug}/datapoints/${datapointId}.json`
    );
    return response.data;
  }

  // ── Charges ───────────────────────────────────────────────────

  async createCharge(params: {
    userId: string;
    amount: number;
    note?: string;
    dryrun?: boolean;
  }) {
    let body: Record<string, any> = {
      user_id: params.userId,
      amount: params.amount
    };
    if (params.note !== undefined) body.note = params.note;
    if (params.dryrun !== undefined) body.dryrun = params.dryrun;

    let response = await this.http.post('/charges.json', body);
    return response.data;
  }
}
