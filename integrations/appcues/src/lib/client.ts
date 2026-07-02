import { createAxios } from 'slates';

let BASE_URLS: Record<string, string> = {
  us: 'https://api.appcues.com',
  eu: 'https://api.eu.appcues.com'
};

export class AppcuesClient {
  private http: ReturnType<typeof createAxios>;
  private accountId: string;

  constructor(opts: { token: string; accountId: string; region: string }) {
    let baseURL = BASE_URLS[opts.region] || BASE_URLS.us;
    this.accountId = opts.accountId;
    this.http = createAxios({
      baseURL,
      headers: {
        Authorization: `Basic ${opts.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private path(suffix: string): string {
    return `/v2/accounts/${this.accountId}${suffix}`;
  }

  // ── Flows ──

  async listFlows(): Promise<any[]> {
    let res = await this.http.get(this.path('/flows'));
    return res.data;
  }

  async getFlow(flowId: string): Promise<any> {
    let res = await this.http.get(this.path(`/flows/${flowId}`));
    return res.data;
  }

  async publishFlow(flowId: string): Promise<any> {
    let res = await this.http.post(this.path(`/flows/${flowId}/publish`));
    return res.data;
  }

  async unpublishFlow(flowId: string): Promise<any> {
    let res = await this.http.post(this.path(`/flows/${flowId}/unpublish`));
    return res.data;
  }

  // ── Pins ──

  async listPins(): Promise<any[]> {
    let res = await this.http.get(this.path('/pins'));
    return res.data;
  }

  async getPin(pinId: string): Promise<any> {
    let res = await this.http.get(this.path(`/pins/${pinId}`));
    return res.data;
  }

  async publishPin(pinId: string): Promise<any> {
    let res = await this.http.post(this.path(`/pins/${pinId}/publish`));
    return res.data;
  }

  async unpublishPin(pinId: string): Promise<any> {
    let res = await this.http.post(this.path(`/pins/${pinId}/unpublish`));
    return res.data;
  }

  // ── Banners ──

  async listBanners(): Promise<any[]> {
    let res = await this.http.get(this.path('/banners'));
    return res.data;
  }

  async getBanner(bannerId: string): Promise<any> {
    let res = await this.http.get(this.path(`/banners/${bannerId}`));
    return res.data;
  }

  async publishBanner(bannerId: string): Promise<any> {
    let res = await this.http.post(this.path(`/banners/${bannerId}/publish`));
    return res.data;
  }

  async unpublishBanner(bannerId: string): Promise<any> {
    let res = await this.http.post(this.path(`/banners/${bannerId}/unpublish`));
    return res.data;
  }

  // ── Launchpads ──

  async listLaunchpads(): Promise<any[]> {
    let res = await this.http.get(this.path('/launchpads'));
    return res.data;
  }

  async getLaunchpad(launchpadId: string): Promise<any> {
    let res = await this.http.get(this.path(`/launchpads/${launchpadId}`));
    return res.data;
  }

  async publishLaunchpad(launchpadId: string): Promise<any> {
    let res = await this.http.post(this.path(`/launchpads/${launchpadId}/publish`));
    return res.data;
  }

  async unpublishLaunchpad(launchpadId: string): Promise<any> {
    let res = await this.http.post(this.path(`/launchpads/${launchpadId}/unpublish`));
    return res.data;
  }

  // ── Checklists ──

  async listChecklists(): Promise<any[]> {
    let res = await this.http.get(this.path('/checklists'));
    return res.data;
  }

  async getChecklist(checklistId: string): Promise<any> {
    let res = await this.http.get(this.path(`/checklists/${checklistId}`));
    return res.data;
  }

  async publishChecklist(checklistId: string): Promise<any> {
    let res = await this.http.post(this.path(`/checklists/${checklistId}/publish`));
    return res.data;
  }

  async unpublishChecklist(checklistId: string): Promise<any> {
    let res = await this.http.post(this.path(`/checklists/${checklistId}/unpublish`));
    return res.data;
  }

  // ── Mobile Experiences ──

  async listMobileExperiences(): Promise<any[]> {
    let res = await this.http.get(this.path('/mobile'));
    return res.data;
  }

  async getMobileExperience(mobileId: string): Promise<any> {
    let res = await this.http.get(this.path(`/mobile/${mobileId}`));
    return res.data;
  }

  async publishMobileExperience(mobileId: string): Promise<any> {
    let res = await this.http.post(this.path(`/mobile/${mobileId}/publish`));
    return res.data;
  }

  async unpublishMobileExperience(mobileId: string): Promise<any> {
    let res = await this.http.post(this.path(`/mobile/${mobileId}/unpublish`));
    return res.data;
  }

  // ── NPS 2.0 ──

  async listNps(): Promise<any[]> {
    let res = await this.http.get(this.path('/nps_2_0'));
    return res.data;
  }

  async getNps(npsId: string): Promise<any> {
    let res = await this.http.get(this.path(`/nps_2_0/${npsId}`));
    return res.data;
  }

  async publishNps(npsId: string): Promise<any> {
    let res = await this.http.post(this.path(`/nps_2_0/${npsId}/publish`));
    return res.data;
  }

  async unpublishNps(npsId: string): Promise<any> {
    let res = await this.http.post(this.path(`/nps_2_0/${npsId}/unpublish`));
    return res.data;
  }

  // ── Embeds ──

  async listEmbeds(): Promise<any[]> {
    let res = await this.http.get(this.path('/embeds'));
    return res.data;
  }

  async getEmbed(embedId: string): Promise<any> {
    let res = await this.http.get(this.path(`/embeds/${embedId}`));
    return res.data;
  }

  async publishEmbed(embedId: string): Promise<any> {
    let res = await this.http.post(this.path(`/embeds/${embedId}/publish`));
    return res.data;
  }

  async unpublishEmbed(embedId: string): Promise<any> {
    let res = await this.http.post(this.path(`/embeds/${embedId}/unpublish`));
    return res.data;
  }

  // ── User Profiles ──

  async getUserProfile(userId: string): Promise<any> {
    let res = await this.http.get(this.path(`/users/${userId}/profile`));
    return res.data;
  }

  async updateUserProfile(userId: string, properties: Record<string, any>): Promise<any> {
    let res = await this.http.patch(this.path(`/users/${userId}/profile`), properties);
    return res.data;
  }

  async deleteUserProfile(userId: string): Promise<any> {
    let res = await this.http.delete(this.path(`/users/${userId}/profile`));
    return res.data;
  }

  // ── User Events ──

  async getUserEvents(userId: string, limit?: number, timeZone?: string): Promise<any> {
    let params: Record<string, any> = {};
    if (limit !== undefined) params.limit = limit;
    if (timeZone !== undefined) params.time_zone = timeZone;
    let res = await this.http.get(this.path(`/users/${userId}/events`), { params });
    return res.data;
  }

  async trackUserEvent(
    userId: string,
    event: {
      name: string;
      timestamp: string;
      attributes?: Record<string, any>;
      groupId?: string;
      context?: Record<string, any>;
    }
  ): Promise<any> {
    let body: Record<string, any> = {
      name: event.name,
      timestamp: event.timestamp
    };
    if (event.attributes) body.attributes = event.attributes;
    if (event.groupId) body.group_id = event.groupId;
    if (event.context) body.context = event.context;
    let res = await this.http.post(this.path(`/users/${userId}/events`), body);
    return res.data;
  }

  // ── Groups ──

  async getGroupProfile(groupId: string): Promise<any> {
    let res = await this.http.get(this.path(`/groups/${groupId}/profile`));
    return res.data;
  }

  async updateGroupProfile(groupId: string, properties: Record<string, any>): Promise<any> {
    let res = await this.http.patch(this.path(`/groups/${groupId}/profile`), properties);
    return res.data;
  }

  async associateUsersToGroup(groupId: string, userIds: string[]): Promise<any> {
    let res = await this.http.patch(this.path(`/groups/${groupId}/users`), {
      user_ids: userIds
    });
    return res.data;
  }

  // ── Segments ──

  async listSegments(): Promise<any[]> {
    let res = await this.http.get(this.path('/segments'));
    return res.data;
  }

  async getSegment(segmentId: string): Promise<any> {
    let res = await this.http.get(this.path(`/segments/${segmentId}`));
    return res.data;
  }

  async createSegment(name: string, description?: string): Promise<any> {
    let body: Record<string, any> = { name };
    if (description) body.description = description;
    let res = await this.http.post(this.path('/segments'), body);
    return res.data;
  }

  async updateSegment(
    segmentId: string,
    data: { name?: string; description?: string }
  ): Promise<any> {
    let res = await this.http.patch(this.path(`/segments/${segmentId}`), data);
    return res.data;
  }

  async deleteSegment(segmentId: string): Promise<any> {
    let res = await this.http.delete(this.path(`/segments/${segmentId}`));
    return res.data;
  }

  async addUsersToSegment(segmentId: string, userIds: string[]): Promise<any> {
    let res = await this.http.post(this.path(`/segments/${segmentId}/add_user_ids`), {
      user_ids: userIds
    });
    return res.data;
  }

  async removeUsersFromSegment(segmentId: string, userIds: string[]): Promise<any> {
    let res = await this.http.post(this.path(`/segments/${segmentId}/remove_user_ids`), {
      user_ids: userIds
    });
    return res.data;
  }

  async exportSegmentMembership(
    segmentId: string,
    opts?: {
      propertyNames?: string[];
      format?: string;
      email?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (opts?.propertyNames) body.property_names = opts.propertyNames;
    if (opts?.format) body.format = opts.format;
    if (opts?.email) body.email = opts.email;
    let res = await this.http.post(
      this.path(`/segments/${segmentId}/segment_membership_export`),
      body
    );
    return res.data;
  }

  // ── Tags ──

  async listTags(): Promise<any[]> {
    let res = await this.http.get(this.path('/tags'));
    return res.data;
  }

  async getTag(tagId: string): Promise<any> {
    let res = await this.http.get(this.path(`/tags/${tagId}`));
    return res.data;
  }

  // ── Jobs ──

  async listJobs(): Promise<any[]> {
    let res = await this.http.get(this.path('/jobs'));
    return res.data;
  }

  async getJob(jobId: string): Promise<any> {
    let res = await this.http.get(this.path(`/jobs/${jobId}`));
    return res.data;
  }

  // ── Bulk Export ──

  async exportEvents(opts: {
    format: string;
    conditions: any[];
    startTime: string;
    endTime?: string;
    timeZone?: string;
    email?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    let body: Record<string, any> = {
      format: opts.format,
      conditions: opts.conditions,
      start_time: opts.startTime
    };
    if (opts.endTime) body.end_time = opts.endTime;
    if (opts.timeZone) body.time_zone = opts.timeZone;
    if (opts.email) body.email = opts.email;
    if (opts.limit !== undefined) body.limit = opts.limit;
    if (opts.offset !== undefined) body.offset = opts.offset;
    let res = await this.http.post(this.path('/export/events'), body);
    return res.data;
  }

  // ── Ingestion Filtering Rules ──

  async getIngestionFilteringRules(): Promise<any> {
    let res = await this.http.get(this.path('/ingestion_filtering_rules'));
    return res.data;
  }

  async updateIngestionFilteringRules(rules: any): Promise<any> {
    let res = await this.http.post(this.path('/ingestion_filtering_rules'), rules);
    return res.data;
  }

  // ── SDK Keys ──

  async listSdkKeys(): Promise<any[]> {
    let res = await this.http.get(this.path('/sdk_keys'));
    return res.data;
  }

  async createSdkKey(config: Record<string, any>): Promise<any> {
    let res = await this.http.post(this.path('/sdk_keys'), config);
    return res.data;
  }

  async deleteSdkKey(keyId: string): Promise<any> {
    let res = await this.http.delete(this.path(`/sdk_keys/${keyId}`));
    return res.data;
  }

  async updateSdkKeyTagField(keyId: string, tagField: string): Promise<any> {
    let res = await this.http.patch(this.path(`/sdk_keys/${keyId}/tag_field`), {
      tag_field: tagField
    });
    return res.data;
  }

  async enableEnforcementMode(keyId: string): Promise<any> {
    let res = await this.http.post(this.path(`/sdk_keys/${keyId}/enforcement_mode/enable`));
    return res.data;
  }

  async disableEnforcementMode(keyId: string): Promise<any> {
    let res = await this.http.post(this.path(`/sdk_keys/${keyId}/enforcement_mode/disable`));
    return res.data;
  }

  async enableSecureDataIngest(keyId: string): Promise<any> {
    let res = await this.http.post(this.path(`/sdk_keys/${keyId}/secure_data_ingest/enable`));
    return res.data;
  }

  async disableSecureDataIngest(keyId: string): Promise<any> {
    let res = await this.http.post(this.path(`/sdk_keys/${keyId}/secure_data_ingest/disable`));
    return res.data;
  }
}
