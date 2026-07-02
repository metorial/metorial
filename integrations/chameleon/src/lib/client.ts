import { createAxios } from 'slates';

export interface PaginationParams {
  limit?: number;
  before?: string;
  after?: string;
}

export interface PaginatedResponse<T> {
  cursor?: {
    limit?: number;
    before?: string;
  };
  [key: string]: T[] | { limit?: number; before?: string } | undefined;
}

export class ChameleonClient {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.chameleon.io/v3',
      headers: {
        'X-Account-Secret': token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- User Profiles ----

  async listProfiles(
    params: PaginationParams & {
      segmentId?: string;
      filters?: Record<string, unknown>[];
      filtersOp?: 'and' | 'or';
      expand?: { profile?: string; company?: string };
    } = {}
  ) {
    let { segmentId, filters, filtersOp, expand, ...pagination } = params;
    let body: Record<string, unknown> = { ...pagination };
    if (segmentId) body.segment_id = segmentId;
    if (filters) body.filters = filters;
    if (filtersOp) body.filters_op = filtersOp;
    if (expand) body.expand = expand;
    let response = await this.axios.post('/analyze/profiles', body);
    return response.data;
  }

  async countProfiles(
    params: {
      segmentId?: string;
      filters?: Record<string, unknown>[];
      filtersOp?: 'and' | 'or';
    } = {}
  ) {
    let body: Record<string, unknown> = {};
    if (params.segmentId) body.segment_id = params.segmentId;
    if (params.filters) body.filters = params.filters;
    if (params.filtersOp) body.filters_op = params.filtersOp;
    let response = await this.axios.post('/analyze/profiles/count', body);
    return response.data;
  }

  async getProfile(params: { profileId?: string; uid?: string; email?: string }) {
    if (params.profileId) {
      let response = await this.axios.get(`/analyze/profiles/${params.profileId}`);
      return response.data;
    }
    let query: Record<string, string> = {};
    if (params.uid) query.uid = params.uid;
    if (params.email) query.email = params.email;
    let response = await this.axios.get('/analyze/profile', { params: query });
    return response.data;
  }

  async clearProfile(params: { profileId?: string; uid?: string }) {
    if (params.profileId) {
      let response = await this.axios.delete(`/edit/profiles/${params.profileId}`);
      return response.data;
    }
    let response = await this.axios.delete('/edit/profiles', { params: { uid: params.uid } });
    return response.data;
  }

  async deleteProfile(params: { profileId?: string; uid?: string; email?: string }) {
    if (params.profileId) {
      let response = await this.axios.delete(`/edit/profiles/${params.profileId}/forget`);
      return response.data;
    }
    let query: Record<string, string> = {};
    if (params.uid) query.uid = params.uid;
    if (params.email) query.email = params.email;
    let response = await this.axios.delete('/edit/profiles/forget', { params: query });
    return response.data;
  }

  // ---- Companies ----

  async listCompanies(
    params: PaginationParams & {
      filters?: Record<string, unknown>[];
      expand?: { company?: string };
    } = {}
  ) {
    let { filters, expand, ...pagination } = params;
    let body: Record<string, unknown> = { ...pagination };
    if (filters) body.filters = filters;
    if (expand) body.expand = expand;
    let response = await this.axios.post('/analyze/companies', body);
    return response.data;
  }

  async getCompany(params: { companyId?: string; uid?: string }) {
    if (params.companyId) {
      let response = await this.axios.get(`/analyze/companies/${params.companyId}`);
      return response.data;
    }
    let response = await this.axios.get('/analyze/company', { params: { uid: params.uid } });
    return response.data;
  }

  async deleteCompany(params: { companyId?: string; uid?: string; cascade?: boolean }) {
    let path = params.companyId ? `/edit/companies/${params.companyId}` : '/edit/company';
    let query: Record<string, string> = {};
    if (!params.companyId && params.uid) query.uid = params.uid;
    if (params.cascade) query.cascade = 'profiles';
    let response = await this.axios.delete(path, { params: query });
    return response.data;
  }

  // ---- Tours ----

  async listTours(params: PaginationParams = {}) {
    let response = await this.axios.get('/edit/tours', { params });
    return response.data;
  }

  async getTour(tourId: string) {
    let response = await this.axios.get(`/edit/tours/${tourId}`);
    return response.data;
  }

  async updateTour(
    tourId: string,
    data: {
      publishedAt?: string | null;
      urlGroupId?: string;
      tagId?: string;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (data.publishedAt !== undefined) body.published_at = data.publishedAt;
    if (data.urlGroupId) body.url_group_id = data.urlGroupId;
    if (data.tagId) body.tag_id = data.tagId;
    let response = await this.axios.patch(`/edit/tours/${tourId}`, body);
    return response.data;
  }

  // ---- Microsurveys ----

  async listSurveys(params: PaginationParams = {}) {
    let response = await this.axios.get('/edit/surveys', { params });
    return response.data;
  }

  async getSurvey(surveyId: string) {
    let response = await this.axios.get(`/edit/surveys/${surveyId}`);
    return response.data;
  }

  async updateSurvey(
    surveyId: string,
    data: {
      publishedAt?: string | null;
      urlGroupId?: string;
      tagId?: string;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (data.publishedAt !== undefined) body.published_at = data.publishedAt;
    if (data.urlGroupId) body.url_group_id = data.urlGroupId;
    if (data.tagId) body.tag_id = data.tagId;
    let response = await this.axios.patch(`/edit/surveys/${surveyId}`, body);
    return response.data;
  }

  // ---- Microsurvey Responses ----

  async listSurveyResponses(
    surveyId: string,
    params: PaginationParams & {
      order?: string;
      expand?: { profile?: string; company?: string };
    } = {}
  ) {
    let { expand, ...rest } = params;
    let query: Record<string, unknown> = { id: surveyId, ...rest };
    if (expand) query.expand = expand;
    let response = await this.axios.get('/analyze/responses', { params: query });
    return response.data;
  }

  async deleteSurveyResponse(responseId: string) {
    let response = await this.axios.delete(`/edit/responses/${responseId}`);
    return response.data;
  }

  // ---- Segments ----

  async listSegments(params: PaginationParams = {}) {
    let response = await this.axios.get('/edit/segments', { params });
    return response.data;
  }

  async getSegment(segmentId: string) {
    let response = await this.axios.get(`/edit/segments/${segmentId}`);
    return response.data;
  }

  async getSegmentExperiences(segmentId: string, kind: 'tour' | 'survey' | 'launcher') {
    let response = await this.axios.get(`/edit/segments/${segmentId}/${kind}`);
    return response.data;
  }

  // ---- Tour Interactions ----

  async listTourInteractions(
    tourId: string,
    params: PaginationParams & {
      order?: string;
      expand?: { profile?: string; company?: string };
    } = {}
  ) {
    let { expand, ...rest } = params;
    let query: Record<string, unknown> = { id: tourId, ...rest };
    if (expand) query.expand = expand;
    let response = await this.axios.get('/analyze/interactions', { params: query });
    return response.data;
  }

  // ---- Tooltips ----

  async listTooltips(params: PaginationParams = {}) {
    let response = await this.axios.get('/edit/tooltips', { params });
    return response.data;
  }

  async getTooltip(tooltipId: string) {
    let response = await this.axios.get(`/edit/tooltips/${tooltipId}`);
    return response.data;
  }

  async updateTooltip(
    tooltipId: string,
    data: {
      publishedAt?: string | null;
      urlGroupId?: string;
      tagId?: string;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (data.publishedAt !== undefined) body.published_at = data.publishedAt;
    if (data.urlGroupId) body.url_group_id = data.urlGroupId;
    if (data.tagId) body.tag_id = data.tagId;
    let response = await this.axios.patch(`/edit/tooltips/${tooltipId}`, body);
    return response.data;
  }

  // ---- Launchers ----

  async listLaunchers(params: PaginationParams = {}) {
    let response = await this.axios.get('/edit/launchers', { params });
    return response.data;
  }

  async getLauncher(launcherId: string) {
    let response = await this.axios.get(`/edit/launchers/${launcherId}`);
    return response.data;
  }

  async updateLauncher(
    launcherId: string,
    data: {
      publishedAt?: string | null;
      urlGroupId?: string;
      tagId?: string;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (data.publishedAt !== undefined) body.published_at = data.publishedAt;
    if (data.urlGroupId) body.url_group_id = data.urlGroupId;
    if (data.tagId) body.tag_id = data.tagId;
    let response = await this.axios.patch(`/edit/launchers/${launcherId}`, body);
    return response.data;
  }

  // ---- Deliveries ----

  async listDeliveries(
    params: PaginationParams & {
      modelId?: string;
      profileId?: string;
    } = {}
  ) {
    let { modelId, profileId, ...pagination } = params;
    let query: Record<string, unknown> = { ...pagination };
    if (modelId) query.model_id = modelId;
    if (profileId) query.profile_id = profileId;
    let response = await this.axios.get('/edit/deliveries', { params: query });
    return response.data;
  }

  async createDelivery(data: {
    profileId?: string;
    uid?: string;
    email?: string;
    modelKind: 'tour' | 'survey';
    modelId: string;
    idempotencyKey?: string;
    options?: Record<string, unknown>;
    from?: string;
    until?: string;
    useSegmentation?: boolean;
    once?: boolean;
    skipTriggers?: boolean;
    skipUrlMatch?: boolean;
  }) {
    let body: Record<string, unknown> = {
      model_kind: data.modelKind,
      model_id: data.modelId
    };
    if (data.profileId) body.profile_id = data.profileId;
    if (data.uid) body.uid = data.uid;
    if (data.email) body.email = data.email;
    if (data.idempotencyKey) body.idempotency_key = data.idempotencyKey;
    if (data.options) body.options = data.options;
    if (data.from) body.from = data.from;
    if (data.until) body.until = data.until;
    if (data.useSegmentation !== undefined) body.use_segmentation = data.useSegmentation;
    if (data.once !== undefined) body.once = data.once;
    if (data.skipTriggers !== undefined) body.skip_triggers = data.skipTriggers;
    if (data.skipUrlMatch !== undefined) body.skip_url_match = data.skipUrlMatch;
    let response = await this.axios.post('/edit/deliveries', body);
    return response.data;
  }

  async deleteDelivery(deliveryId: string) {
    let response = await this.axios.delete(`/edit/deliveries/${deliveryId}`);
    return response.data;
  }

  // ---- Tags ----

  async listTags(params: PaginationParams = {}) {
    let response = await this.axios.get('/edit/tags', { params });
    return response.data;
  }

  async getTag(tagId: string) {
    let response = await this.axios.get(`/edit/tags/${tagId}`);
    return response.data;
  }

  // ---- Domains / URLs ----

  async listUrls(params: PaginationParams & { domain?: string } = {}) {
    let response = await this.axios.get('/edit/urls', { params });
    return response.data;
  }

  async createUrl(data: { host: string; enabled: boolean }) {
    let response = await this.axios.post('/edit/urls', data);
    return response.data;
  }

  async updateUrl(
    urlId: string,
    data: {
      enabled?: boolean;
      urlGroupId?: string;
      archivedAt?: string | null;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (data.enabled !== undefined) body.enabled = data.enabled;
    if (data.urlGroupId) body.url_group_id = data.urlGroupId;
    if (data.archivedAt !== undefined) body.archived_at = data.archivedAt;
    let response = await this.axios.patch(`/edit/urls/${urlId}`, body);
    return response.data;
  }

  // ---- Environments / URL Groups ----

  async listUrlGroups(params: PaginationParams = {}) {
    let response = await this.axios.get('/edit/url_groups', { params });
    return response.data;
  }

  async createUrlGroup(data: { name: string; description?: string; shortName?: string }) {
    let body: Record<string, unknown> = { name: data.name };
    if (data.description) body.description = data.description;
    if (data.shortName) body.short_name = data.shortName;
    let response = await this.axios.post('/edit/url_groups', body);
    return response.data;
  }

  async updateUrlGroup(
    groupId: string,
    data: {
      name?: string;
      description?: string;
      shortName?: string;
      archivedAt?: string | null;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (data.name) body.name = data.name;
    if (data.description) body.description = data.description;
    if (data.shortName) body.short_name = data.shortName;
    if (data.archivedAt !== undefined) body.archived_at = data.archivedAt;
    let response = await this.axios.patch(`/edit/url_groups/${groupId}`, body);
    return response.data;
  }

  // ---- Webhooks ----

  async listWebhooks(kind: 'webhook' | 'zapier_hook' = 'webhook') {
    let response = await this.axios.get('/edit/webhooks', { params: { kind } });
    return response.data;
  }

  async createWebhook(data: {
    url: string;
    topics: string[];
    kind?: string;
    experienceIds?: string[];
  }) {
    let body: Record<string, unknown> = {
      kind: data.kind || 'webhook',
      url: data.url,
      topics: data.topics
    };
    if (data.experienceIds) body.experience_ids = data.experienceIds;
    let response = await this.axios.post('/edit/webhooks', body);
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.axios.delete(`/edit/webhooks/${webhookId}`);
    return response.data;
  }
}
