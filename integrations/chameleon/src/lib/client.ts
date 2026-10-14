import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

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
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.chameleon.io/v3',
      authHeader: { name: 'X-Account-Secret', value: token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Chameleon',
          reason: 'chameleon_api_error'
        })
    });
  }

  async getAccount() {
    let response = await this.axios.get('https://api.chameleon.io');
    return response.data;
  }

  async upsertProfile(data: {
    profileId?: string;
    uid?: string;
    email?: string;
    companyId?: string;
    companyUid?: string;
    properties?: Record<string, unknown>;
  }) {
    if (!data.profileId && !data.uid && !data.email) {
      throw createApiServiceError(
        'Provide uid to create a profile, or profileId, uid, or email to update one.'
      );
    }
    for (let key of [
      'id',
      'uid',
      'email',
      'company_id',
      'company_uid',
      'account_secret',
      'profiles'
    ]) {
      if (Object.hasOwn(data.properties ?? {}, key)) {
        throw createApiServiceError(
          `Do not include ${key} in properties. Use the dedicated input fields for identifiers.`
        );
      }
    }
    let response = await this.axios.post('/observe/hooks/profiles', {
      ...data.properties,
      ...pickDefined({
        id: data.profileId,
        uid: data.uid,
        email: data.email,
        company_id: data.companyId,
        company_uid: data.companyUid
      })
    });
    return response.data.profile;
  }

  async upsertCompany(data: {
    companyId?: string;
    uid?: string;
    properties?: Record<string, unknown>;
  }) {
    if (!data.companyId && !data.uid) {
      throw createApiServiceError(
        'Provide uid to create a company, or companyId or uid to update one.'
      );
    }
    for (let key of ['id', 'uid', 'account_secret', 'companies']) {
      if (Object.hasOwn(data.properties ?? {}, key)) {
        throw createApiServiceError(
          `Do not include ${key} in properties. Use the dedicated input fields for identifiers.`
        );
      }
    }
    let response = await this.axios.post('/observe/hooks/companies', {
      ...data.properties,
      ...pickDefined({ id: data.companyId, uid: data.uid })
    });
    return response.data.company;
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
    if (!params.profileId && !params.uid && !params.email) {
      throw createApiServiceError(
        'Provide profileId, uid, or email to retrieve a user profile.'
      );
    }
    if (params.profileId) {
      let response = await this.axios.get(
        `/analyze/profiles/${encodeURIComponent(params.profileId)}`
      );
      return response.data.profile;
    }
    let query: Record<string, string> = {};
    if (params.uid) query.uid = params.uid;
    if (params.email) query.email = params.email;
    let response = await this.axios.get('/analyze/profile', { params: query });
    return response.data.profile;
  }

  async clearProfile(params: { profileId?: string; uid?: string }) {
    if (!params.profileId && !params.uid) {
      throw createApiServiceError(
        'Provide profileId or uid to clear a user profile; email is only supported for forget mode.'
      );
    }
    if (params.profileId) {
      let response = await this.axios.delete(
        `/edit/profiles/${encodeURIComponent(params.profileId)}`
      );
      return response.data.profile;
    }
    let response = await this.axios.delete('/edit/profiles', { params: { uid: params.uid } });
    return response.data.profile;
  }

  async deleteProfile(params: { profileId?: string; uid?: string; email?: string }) {
    if (!params.profileId && !params.uid && !params.email) {
      throw createApiServiceError(
        'Provide profileId, uid, or email to delete a user profile.'
      );
    }
    if (params.profileId) {
      let response = await this.axios.delete(
        `/edit/profiles/${encodeURIComponent(params.profileId)}/forget`
      );
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
      filtersOp?: 'and' | 'or';
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
      offset?: number;
      expand?: { company?: string };
    } = {}
  ) {
    let { filters, filtersOp, sortBy, sortDir, expand, ...pagination } = params;
    let body: Record<string, unknown> = { ...pagination };
    if (filters) body.filters = filters;
    if (filtersOp) body.filters_op = filtersOp;
    if (sortBy) body.sort_by = sortBy;
    if (sortDir) body.sort_dir = sortDir;
    if (expand) body.expand = expand;
    let response = await this.axios.post('/analyze/companies', body);
    return response.data;
  }

  async getCompany(params: { companyId?: string; uid?: string }) {
    if (!params.companyId && !params.uid) {
      throw createApiServiceError('Provide companyId or uid to retrieve a company.');
    }
    if (params.companyId) {
      let response = await this.axios.get(
        `/analyze/companies/${encodeURIComponent(params.companyId)}`
      );
      return response.data.company;
    }
    let response = await this.axios.get('/analyze/company', { params: { uid: params.uid } });
    return response.data.company;
  }

  async deleteCompany(params: { companyId?: string; uid?: string; cascade?: boolean }) {
    if (!params.companyId && !params.uid) {
      throw createApiServiceError('Provide companyId or uid to delete a company.');
    }
    let path = params.companyId
      ? `/edit/companies/${encodeURIComponent(params.companyId)}`
      : '/edit/company';
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
    let response = await this.axios.get(`/edit/tours/${encodeURIComponent(tourId)}`);
    return response.data.tour;
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
    let response = await this.axios.patch(`/edit/tours/${encodeURIComponent(tourId)}`, body);
    return response.data.tour;
  }

  // ---- Microsurveys ----

  async listSurveys(params: PaginationParams = {}) {
    let response = await this.axios.get('/edit/surveys', { params });
    return response.data;
  }

  async getSurvey(surveyId: string) {
    let response = await this.axios.get(`/edit/surveys/${encodeURIComponent(surveyId)}`);
    return response.data.survey;
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
    let response = await this.axios.patch(
      `/edit/surveys/${encodeURIComponent(surveyId)}`,
      body
    );
    return response.data.survey;
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
    let response = await this.axios.delete(
      `/edit/responses/${encodeURIComponent(responseId)}`
    );
    return response.data;
  }

  // ---- Segments ----

  async listSegments(params: PaginationParams = {}) {
    let response = await this.axios.get('/edit/segments', { params });
    return response.data;
  }

  async getSegment(segmentId: string) {
    let response = await this.axios.get(`/edit/segments/${encodeURIComponent(segmentId)}`);
    return response.data.segment;
  }

  async getSegmentExperiences(segmentId: string, kind: 'tour' | 'survey' | 'launcher') {
    let response = await this.axios.get(
      `/edit/segments/${encodeURIComponent(segmentId)}/${kind}`
    );
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
    let response = await this.axios.get(`/edit/tooltips/${encodeURIComponent(tooltipId)}`);
    return response.data.tooltip;
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
    let response = await this.axios.patch(
      `/edit/tooltips/${encodeURIComponent(tooltipId)}`,
      body
    );
    return response.data.tooltip;
  }

  // ---- Launchers ----

  async listLaunchers(params: PaginationParams = {}) {
    let response = await this.axios.get('/edit/launchers', { params });
    return response.data;
  }

  async getLauncher(launcherId: string) {
    let response = await this.axios.get(`/edit/launchers/${encodeURIComponent(launcherId)}`);
    return response.data.launcher;
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
    let response = await this.axios.patch(
      `/edit/launchers/${encodeURIComponent(launcherId)}`,
      body
    );
    return response.data.launcher;
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
    return response.data.delivery;
  }

  async deleteDelivery(deliveryId: string) {
    let response = await this.axios.delete(
      `/edit/deliveries/${encodeURIComponent(deliveryId)}`
    );
    return response.data;
  }

  // ---- Tags ----

  async listTags(params: PaginationParams = {}) {
    let response = await this.axios.get('/edit/tags', { params });
    return response.data;
  }

  async getTag(tagId: string) {
    let response = await this.axios.get(`/edit/tags/${encodeURIComponent(tagId)}`);
    return response.data.tag;
  }

  // ---- Domains / URLs ----

  async listUrls(params: PaginationParams & { domain?: string } = {}) {
    let response = await this.axios.get('/edit/urls', { params });
    return response.data;
  }

  async createUrl(data: {
    host: string;
    enabled: boolean;
    enabledState?: 'on' | 'off' | 'subdomain';
  }) {
    let response = await this.axios.post('/edit/urls', {
      host: data.host,
      enabled: data.enabledState ?? (data.enabled ? 'on' : 'off')
    });
    return response.data.url;
  }

  async updateUrl(
    urlId: string,
    data: {
      enabled?: boolean;
      enabledState?: 'on' | 'off' | 'subdomain';
      urlGroupId?: string;
      archivedAt?: string | null;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (data.enabledState !== undefined) body.enabled = data.enabledState;
    else if (data.enabled !== undefined) body.enabled = data.enabled ? 'on' : 'off';
    if (data.urlGroupId) body.url_group_id = data.urlGroupId;
    if (data.archivedAt !== undefined) body.archived_at = data.archivedAt;
    let response = await this.axios.patch(`/edit/urls/${encodeURIComponent(urlId)}`, body);
    return response.data.url;
  }

  // ---- Environments / URL Groups ----

  async listUrlGroups(params: PaginationParams = {}) {
    let response = await this.axios.get('/edit/url_groups', { params });
    return response.data;
  }

  async createUrlGroup(data: { name: string; description?: string; shortName?: string }) {
    let body: Record<string, unknown> = { name: data.name };
    if (data.description !== undefined) body.description = data.description;
    if (data.shortName !== undefined) body.short_name = data.shortName;
    let response = await this.axios.post('/edit/url_groups', body);
    return response.data.url_group;
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
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.shortName !== undefined) body.short_name = data.shortName;
    if (data.archivedAt !== undefined) body.archived_at = data.archivedAt;
    let response = await this.axios.patch(
      `/edit/url_groups/${encodeURIComponent(groupId)}`,
      body
    );
    return response.data.url_group;
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
    return response.data.webhook;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.axios.delete(`/edit/webhooks/${encodeURIComponent(webhookId)}`);
    return response.data;
  }
}
