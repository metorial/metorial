import { createAxios } from '@slates/provider';
import { snapchatApiError, snapchatServiceError } from './errors';

let adsApi = createAxios({
  baseURL: 'https://adsapi.snapchat.com/v1'
});

let conversionsApi = createAxios({
  baseURL: 'https://tr.snapchat.com/v3'
});

let profileApi = createAxios({
  baseURL: 'https://businessapi.snapchat.com/v1'
});

type ListResult<T> = {
  items: T[];
  nextLink?: string;
};

let isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null;

let isSuccessStatus = (value: unknown) =>
  typeof value === 'string' && ['SUCCESS', 'success', 'VALID'].includes(value);

let extractPayloadMessage = (value: unknown): string | undefined => {
  if (!isRecord(value)) return undefined;

  for (let key of ['message', 'reason', 'error', 'error_description', 'request_status']) {
    let detail = value[key];
    if (typeof detail === 'string' && detail.trim()) {
      return detail.trim();
    }
  }

  return undefined;
};

let assertPayloadSuccess = (payload: unknown, operation: string) => {
  if (!isRecord(payload) || payload.request_status === undefined) return;
  if (isSuccessStatus(payload.request_status)) return;

  throw snapchatServiceError(
    `Snapchat API ${operation} failed: ${extractPayloadMessage(payload) ?? 'Request was not successful'}`
  );
};

let unwrapEntity = (entry: unknown, entityKey: string, operation: string) => {
  if (!isRecord(entry)) return undefined;

  if (entry.sub_request_status !== undefined && !isSuccessStatus(entry.sub_request_status)) {
    throw snapchatServiceError(
      `Snapchat API ${operation} failed: ${extractPayloadMessage(entry) ?? String(entry.sub_request_status)}`
    );
  }

  return entry[entityKey];
};

let unwrapEntityArray = (
  payload: unknown,
  collectionKey: string,
  entityKey: string,
  operation: string
) => {
  assertPayloadSuccess(payload, operation);
  if (!isRecord(payload) || !Array.isArray(payload[collectionKey])) return [];

  return payload[collectionKey]
    .map(entry => unwrapEntity(entry, entityKey, operation))
    .filter((entity): entity is Record<string, any> => isRecord(entity));
};

let unwrapListResult = (
  payload: unknown,
  collectionKey: string,
  entityKey: string,
  operation: string
): ListResult<Record<string, any>> => ({
  items: unwrapEntityArray(payload, collectionKey, entityKey, operation),
  nextLink:
    isRecord(payload) &&
    isRecord(payload.paging) &&
    typeof payload.paging.next_link === 'string'
      ? payload.paging.next_link
      : undefined
});

let unwrapFirstEntity = (
  payload: unknown,
  collectionKey: string,
  entityKey: string,
  operation: string
) => unwrapEntityArray(payload, collectionKey, entityKey, operation)[0];

let requestParams = (limit?: number, cursor?: string) => {
  let params: Record<string, string | number> = {};
  if (limit !== undefined) params.limit = limit;
  if (cursor) params.cursor = cursor;
  return params;
};

export class SnapchatClient {
  private headers: Record<string, string>;

  constructor(private token: string) {
    this.headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  private async request<T>(operation: string, run: () => Promise<{ data: T }>) {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw snapchatApiError(error, operation);
    }
  }

  async getMe() {
    let data = await this.request<any>('get authenticated user', () =>
      adsApi.get('/me', { headers: this.headers })
    );
    return data.me;
  }

  async listOrganizations(limit?: number, cursor?: string) {
    let data = await this.request<any>('list organizations', () =>
      adsApi.get('/me/organizations', {
        headers: this.headers,
        params: requestParams(limit, cursor)
      })
    );
    return unwrapListResult(data, 'organizations', 'organization', 'list organizations');
  }

  async getOrganization(organizationId: string) {
    let data = await this.request<any>('get organization', () =>
      adsApi.get(`/organizations/${organizationId}`, {
        headers: this.headers
      })
    );
    return unwrapFirstEntity(data, 'organizations', 'organization', 'get organization');
  }

  async listAdAccounts(organizationId: string, limit?: number, cursor?: string) {
    let data = await this.request<any>('list ad accounts', () =>
      adsApi.get(`/organizations/${organizationId}/adaccounts`, {
        headers: this.headers,
        params: requestParams(limit, cursor)
      })
    );
    return unwrapListResult(data, 'adaccounts', 'adaccount', 'list ad accounts');
  }

  async getAdAccount(adAccountId: string) {
    let data = await this.request<any>('get ad account', () =>
      adsApi.get(`/adaccounts/${adAccountId}`, { headers: this.headers })
    );
    return unwrapFirstEntity(data, 'adaccounts', 'adaccount', 'get ad account');
  }

  async listCampaigns(adAccountId: string, limit?: number, cursor?: string) {
    let data = await this.request<any>('list campaigns', () =>
      adsApi.get(`/adaccounts/${adAccountId}/campaigns`, {
        headers: this.headers,
        params: requestParams(limit, cursor)
      })
    );
    return unwrapListResult(data, 'campaigns', 'campaign', 'list campaigns');
  }

  async getCampaign(campaignId: string) {
    let data = await this.request<any>('get campaign', () =>
      adsApi.get(`/campaigns/${campaignId}`, { headers: this.headers })
    );
    return unwrapFirstEntity(data, 'campaigns', 'campaign', 'get campaign');
  }

  async createCampaign(adAccountId: string, campaignData: Record<string, any>) {
    let data = await this.request<any>('create campaign', () =>
      adsApi.post(
        `/adaccounts/${adAccountId}/campaigns`,
        {
          campaigns: [{ ...campaignData, ad_account_id: adAccountId }]
        },
        { headers: this.headers }
      )
    );
    return unwrapFirstEntity(data, 'campaigns', 'campaign', 'create campaign');
  }

  async updateCampaign(adAccountId: string, campaignData: Record<string, any>) {
    let data = await this.request<any>('update campaign', () =>
      adsApi.put(
        `/adaccounts/${adAccountId}/campaigns`,
        {
          campaigns: [campaignData]
        },
        { headers: this.headers }
      )
    );
    return unwrapFirstEntity(data, 'campaigns', 'campaign', 'update campaign');
  }

  async deleteCampaign(campaignId: string) {
    return await this.request<any>('delete campaign', () =>
      adsApi.delete(`/campaigns/${campaignId}`, { headers: this.headers })
    );
  }

  async listAdSquads(campaignId: string, limit?: number, cursor?: string) {
    let data = await this.request<any>('list ad squads', () =>
      adsApi.get(`/campaigns/${campaignId}/adsquads`, {
        headers: this.headers,
        params: requestParams(limit, cursor)
      })
    );
    return unwrapListResult(data, 'adsquads', 'adsquad', 'list ad squads');
  }

  async getAdSquad(adSquadId: string) {
    let data = await this.request<any>('get ad squad', () =>
      adsApi.get(`/adsquads/${adSquadId}`, { headers: this.headers })
    );
    return unwrapFirstEntity(data, 'adsquads', 'adsquad', 'get ad squad');
  }

  async createAdSquad(campaignId: string, adSquadData: Record<string, any>) {
    let data = await this.request<any>('create ad squad', () =>
      adsApi.post(
        `/campaigns/${campaignId}/adsquads`,
        {
          adsquads: [{ ...adSquadData, campaign_id: campaignId }]
        },
        { headers: this.headers }
      )
    );
    return unwrapFirstEntity(data, 'adsquads', 'adsquad', 'create ad squad');
  }

  async updateAdSquad(campaignId: string, adSquadData: Record<string, any>) {
    let data = await this.request<any>('update ad squad', () =>
      adsApi.put(
        `/campaigns/${campaignId}/adsquads`,
        {
          adsquads: [adSquadData]
        },
        { headers: this.headers }
      )
    );
    return unwrapFirstEntity(data, 'adsquads', 'adsquad', 'update ad squad');
  }

  async deleteAdSquad(adSquadId: string) {
    return await this.request<any>('delete ad squad', () =>
      adsApi.delete(`/adsquads/${adSquadId}`, { headers: this.headers })
    );
  }

  async listAds(adSquadId: string, limit?: number, cursor?: string) {
    let data = await this.request<any>('list ads', () =>
      adsApi.get(`/adsquads/${adSquadId}/ads`, {
        headers: this.headers,
        params: requestParams(limit, cursor)
      })
    );
    return unwrapListResult(data, 'ads', 'ad', 'list ads');
  }

  async getAd(adId: string) {
    let data = await this.request<any>('get ad', () =>
      adsApi.get(`/ads/${adId}`, { headers: this.headers })
    );
    return unwrapFirstEntity(data, 'ads', 'ad', 'get ad');
  }

  async createAd(adSquadId: string, adData: Record<string, any>) {
    let data = await this.request<any>('create ad', () =>
      adsApi.post(
        `/adsquads/${adSquadId}/ads`,
        {
          ads: [{ ...adData, ad_squad_id: adSquadId }]
        },
        { headers: this.headers }
      )
    );
    return unwrapFirstEntity(data, 'ads', 'ad', 'create ad');
  }

  async updateAd(adSquadId: string, adData: Record<string, any>) {
    let data = await this.request<any>('update ad', () =>
      adsApi.put(
        `/adsquads/${adSquadId}/ads`,
        {
          ads: [adData]
        },
        { headers: this.headers }
      )
    );
    return unwrapFirstEntity(data, 'ads', 'ad', 'update ad');
  }

  async deleteAd(adId: string) {
    return await this.request<any>('delete ad', () =>
      adsApi.delete(`/ads/${adId}`, { headers: this.headers })
    );
  }

  async listCreatives(adAccountId: string, limit?: number, cursor?: string) {
    let data = await this.request<any>('list creatives', () =>
      adsApi.get(`/adaccounts/${adAccountId}/creatives`, {
        headers: this.headers,
        params: requestParams(limit, cursor)
      })
    );
    return unwrapListResult(data, 'creatives', 'creative', 'list creatives');
  }

  async getCreative(creativeId: string) {
    let data = await this.request<any>('get creative', () =>
      adsApi.get(`/creatives/${creativeId}`, { headers: this.headers })
    );
    return unwrapFirstEntity(data, 'creatives', 'creative', 'get creative');
  }

  async createCreative(adAccountId: string, creativeData: Record<string, any>) {
    let data = await this.request<any>('create creative', () =>
      adsApi.post(
        `/adaccounts/${adAccountId}/creatives`,
        {
          creatives: [{ ...creativeData, ad_account_id: adAccountId }]
        },
        { headers: this.headers }
      )
    );
    return unwrapFirstEntity(data, 'creatives', 'creative', 'create creative');
  }

  async updateCreative(adAccountId: string, creativeData: Record<string, any>) {
    let data = await this.request<any>('update creative', () =>
      adsApi.put(
        `/adaccounts/${adAccountId}/creatives`,
        {
          creatives: [creativeData]
        },
        { headers: this.headers }
      )
    );
    return unwrapFirstEntity(data, 'creatives', 'creative', 'update creative');
  }

  async listMedia(adAccountId: string, limit?: number, cursor?: string) {
    let data = await this.request<any>('list media', () =>
      adsApi.get(`/adaccounts/${adAccountId}/media`, {
        headers: this.headers,
        params: requestParams(limit, cursor)
      })
    );
    return unwrapListResult(data, 'media', 'media', 'list media');
  }

  async getMedia(mediaId: string) {
    let data = await this.request<any>('get media', () =>
      adsApi.get(`/media/${mediaId}`, { headers: this.headers })
    );
    return unwrapFirstEntity(data, 'media', 'media', 'get media');
  }

  async createMedia(adAccountId: string, mediaData: Record<string, any>) {
    let data = await this.request<any>('create media', () =>
      adsApi.post(
        `/adaccounts/${adAccountId}/media`,
        {
          media: [{ ...mediaData, ad_account_id: adAccountId }]
        },
        { headers: this.headers }
      )
    );
    return unwrapFirstEntity(data, 'media', 'media', 'create media');
  }

  async listSegments(adAccountId: string, limit?: number, cursor?: string) {
    let data = await this.request<any>('list audience segments', () =>
      adsApi.get(`/adaccounts/${adAccountId}/segments`, {
        headers: this.headers,
        params: requestParams(limit, cursor)
      })
    );
    return unwrapListResult(data, 'segments', 'segment', 'list audience segments');
  }

  async getSegment(segmentId: string) {
    let data = await this.request<any>('get audience segment', () =>
      adsApi.get(`/segments/${segmentId}`, { headers: this.headers })
    );
    return unwrapFirstEntity(data, 'segments', 'segment', 'get audience segment');
  }

  async createSegment(adAccountId: string, segmentData: Record<string, any>) {
    let data = await this.request<any>('create audience segment', () =>
      adsApi.post(
        `/adaccounts/${adAccountId}/segments`,
        {
          segments: [{ ...segmentData, ad_account_id: adAccountId }]
        },
        { headers: this.headers }
      )
    );
    return unwrapFirstEntity(data, 'segments', 'segment', 'create audience segment');
  }

  async updateSegment(adAccountId: string, segmentData: Record<string, any>) {
    let data = await this.request<any>('update audience segment', () =>
      adsApi.put(
        `/adaccounts/${adAccountId}/segments`,
        {
          segments: [segmentData]
        },
        { headers: this.headers }
      )
    );
    return unwrapFirstEntity(data, 'segments', 'segment', 'update audience segment');
  }

  async deleteSegment(segmentId: string) {
    return await this.request<any>('delete audience segment', () =>
      adsApi.delete(`/segments/${segmentId}`, { headers: this.headers })
    );
  }

  async addUsersToSegment(segmentId: string, userData: Record<string, any>) {
    return await this.request<any>('add users to audience segment', () =>
      adsApi.post(`/segments/${segmentId}/users`, userData, {
        headers: this.headers
      })
    );
  }

  async getStats(
    entityType: 'campaigns' | 'adsquads' | 'ads' | 'adaccounts',
    entityId: string,
    params: Record<string, string>
  ) {
    return await this.request<any>('get stats', () =>
      adsApi.get(`/${entityType}/${entityId}/stats`, {
        headers: this.headers,
        params
      })
    );
  }

  async sendConversionEvents(pixelOrAppId: string, events: any[]) {
    return await this.request<any>('send conversion events', () =>
      conversionsApi.post(
        `/${pixelOrAppId}/events`,
        {
          data: events
        },
        {
          headers: { 'Content-Type': 'application/json' },
          params: { access_token: this.token }
        }
      )
    );
  }

  async validateConversionEvents(pixelOrAppId: string, events: any[]) {
    return await this.request<any>('validate conversion events', () =>
      conversionsApi.post(
        `/${pixelOrAppId}/events/validate`,
        {
          data: events
        },
        {
          headers: { 'Content-Type': 'application/json' },
          params: { access_token: this.token }
        }
      )
    );
  }

  async listPixels(adAccountId: string) {
    let data = await this.request<any>('list pixels', () =>
      adsApi.get(`/adaccounts/${adAccountId}/pixels`, {
        headers: this.headers
      })
    );
    return unwrapEntityArray(data, 'pixels', 'pixel', 'list pixels');
  }

  async getPixel(pixelId: string) {
    let data = await this.request<any>('get pixel', () =>
      adsApi.get(`/pixels/${pixelId}`, { headers: this.headers })
    );
    return unwrapFirstEntity(data, 'pixels', 'pixel', 'get pixel');
  }

  async updatePixel(adAccountId: string, pixelData: Record<string, any>) {
    let data = await this.request<any>('update pixel', () =>
      adsApi.put(
        `/adaccounts/${adAccountId}/pixels`,
        {
          pixels: [{ ...pixelData, ad_account_id: adAccountId }]
        },
        { headers: this.headers }
      )
    );
    return unwrapFirstEntity(data, 'pixels', 'pixel', 'update pixel');
  }

  async listFundingSources(organizationId: string, limit?: number, cursor?: string) {
    let data = await this.request<any>('list funding sources', () =>
      adsApi.get(`/organizations/${organizationId}/fundingsources`, {
        headers: this.headers,
        params: requestParams(limit, cursor)
      })
    );
    return unwrapListResult(data, 'fundingsources', 'fundingsource', 'list funding sources');
  }

  async getAudienceSizeForSpec(adAccountId: string, adSquadSpec: Record<string, any>) {
    let data = await this.request<any>('get audience size for ad squad spec', () =>
      adsApi.post(`/adaccounts/${adAccountId}/audience_size_v2`, adSquadSpec, {
        headers: this.headers
      })
    );
    assertPayloadSuccess(data, 'get audience size for ad squad spec');
    return data;
  }

  async getAudienceSizeForAdSquad(adSquadId: string) {
    let data = await this.request<any>('get audience size for ad squad', () =>
      adsApi.get(`/adsquads/${adSquadId}/audience_size_v2`, {
        headers: this.headers
      })
    );
    assertPayloadSuccess(data, 'get audience size for ad squad');
    return data;
  }

  async getBidEstimateForSpec(
    adAccountId: string,
    optimizationGoal: string,
    targeting: Record<string, any>
  ) {
    let data = await this.request<any>('get bid estimate for targeting spec', () =>
      adsApi.post(
        `/adaccounts/${adAccountId}/bid_estimate`,
        {
          optimization_goal: optimizationGoal,
          targeting
        },
        { headers: this.headers }
      )
    );
    assertPayloadSuccess(data, 'get bid estimate for targeting spec');
    return data;
  }

  async getBidEstimateForAdSquad(adSquadId: string) {
    let data = await this.request<any>('get bid estimate for ad squad', () =>
      adsApi.get(`/adsquads/${adSquadId}/bid_estimate`, {
        headers: this.headers
      })
    );
    assertPayloadSuccess(data, 'get bid estimate for ad squad');
    return data;
  }

  async getMyProfile() {
    return await this.request<any>('get public profile', () =>
      profileApi.get('/public_profiles/my_profile', {
        headers: this.headers
      })
    );
  }

  async listPublicProfiles(organizationId: string) {
    return await this.request<any>('list public profiles', () =>
      profileApi.get(`/organizations/${organizationId}/public_profiles`, {
        headers: this.headers
      })
    );
  }
}
