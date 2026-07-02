import { createAxios } from 'slates';
import { getPrivateBaseUrl, getPublicBaseUrl } from './urls';

export class PostHogClient {
  private privateHttp: ReturnType<typeof createAxios>;
  private publicHttp: ReturnType<typeof createAxios>;
  private projectId?: string;

  constructor(config: {
    token: string;
    projectToken?: string;
    region: string;
    instanceUrl?: string;
    projectId?: string;
  }) {
    this.projectId = config.projectId;

    this.privateHttp = createAxios({
      baseURL: getPrivateBaseUrl(config.region, config.instanceUrl),
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });

    this.publicHttp = createAxios({
      baseURL: getPublicBaseUrl(config.region, config.instanceUrl),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  private envPath(path: string): string {
    return `/api/environments/${this.projectId}${path}`;
  }

  // ── Event Capture ────────────────────────────────────────────────────

  async captureEvent(params: {
    apiKey: string;
    distinctId: string;
    event: string;
    properties?: Record<string, any>;
    timestamp?: string;
    set?: Record<string, any>;
    setOnce?: Record<string, any>;
  }) {
    let body: Record<string, any> = {
      api_key: params.apiKey,
      distinct_id: params.distinctId,
      event: params.event,
      properties: params.properties || {}
    };
    if (params.timestamp) body.timestamp = params.timestamp;
    if (params.set) body.$set = params.set;
    if (params.setOnce) body.$set_once = params.setOnce;

    let response = await this.publicHttp.post('/i/v0/e', body);
    return response.data;
  }

  async captureBatch(params: {
    apiKey: string;
    events: Array<{
      distinctId: string;
      event: string;
      properties?: Record<string, any>;
      timestamp?: string;
    }>;
  }) {
    let batch = params.events.map(e => ({
      distinct_id: e.distinctId,
      event: e.event,
      properties: e.properties || {},
      ...(e.timestamp ? { timestamp: e.timestamp } : {})
    }));

    let response = await this.publicHttp.post('/batch', {
      api_key: params.apiKey,
      batch
    });
    return response.data;
  }

  // ── Persons ──────────────────────────────────────────────────────────

  async listPersons(params?: {
    search?: string;
    properties?: any[];
    limit?: number;
    offset?: number;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.properties) queryParams.properties = JSON.stringify(params.properties);

    let response = await this.privateHttp.get(this.envPath('/persons/'), {
      params: queryParams
    });
    return response.data;
  }

  async getPerson(personId: string) {
    let response = await this.privateHttp.get(this.envPath(`/persons/${personId}/`));
    return response.data;
  }

  async deletePerson(personId: string) {
    await this.privateHttp.delete(this.envPath(`/persons/${personId}/`));
  }

  // ── Feature Flags ────────────────────────────────────────────────────

  async listFeatureFlags(params?: { limit?: number; offset?: number; search?: string }) {
    let queryParams: Record<string, string> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);

    let response = await this.privateHttp.get(this.envPath('/feature_flags/'), {
      params: queryParams
    });
    return response.data;
  }

  async getFeatureFlag(flagId: string) {
    let response = await this.privateHttp.get(this.envPath(`/feature_flags/${flagId}/`));
    return response.data;
  }

  async createFeatureFlag(data: Record<string, any>) {
    let response = await this.privateHttp.post(this.envPath('/feature_flags/'), data);
    return response.data;
  }

  async updateFeatureFlag(flagId: string, data: Record<string, any>) {
    let response = await this.privateHttp.patch(
      this.envPath(`/feature_flags/${flagId}/`),
      data
    );
    return response.data;
  }

  async deleteFeatureFlag(flagId: string) {
    await this.privateHttp.delete(this.envPath(`/feature_flags/${flagId}/`));
  }

  async evaluateFeatureFlags(params: {
    apiKey: string;
    distinctId: string;
    personProperties?: Record<string, any>;
    groupProperties?: Record<string, Record<string, any>>;
  }) {
    let body: Record<string, any> = {
      api_key: params.apiKey,
      distinct_id: params.distinctId
    };
    if (params.personProperties) body.person_properties = params.personProperties;
    if (params.groupProperties) body.group_properties = params.groupProperties;

    let response = await this.publicHttp.post('/flags/?v=2', body);
    return response.data;
  }

  // ── Experiments ──────────────────────────────────────────────────────

  async listExperiments(params?: { limit?: number; offset?: number }) {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);

    let response = await this.privateHttp.get(this.envPath('/experiments/'), {
      params: queryParams
    });
    return response.data;
  }

  async getExperiment(experimentId: string) {
    let response = await this.privateHttp.get(this.envPath(`/experiments/${experimentId}/`));
    return response.data;
  }

  async createExperiment(data: Record<string, any>) {
    let response = await this.privateHttp.post(this.envPath('/experiments/'), data);
    return response.data;
  }

  async updateExperiment(experimentId: string, data: Record<string, any>) {
    let response = await this.privateHttp.patch(
      this.envPath(`/experiments/${experimentId}/`),
      data
    );
    return response.data;
  }

  // ── Surveys ──────────────────────────────────────────────────────────

  async listSurveys(params?: { limit?: number; offset?: number }) {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);

    let response = await this.privateHttp.get(this.envPath('/surveys/'), {
      params: queryParams
    });
    return response.data;
  }

  async getSurvey(surveyId: string) {
    let response = await this.privateHttp.get(this.envPath(`/surveys/${surveyId}/`));
    return response.data;
  }

  async createSurvey(data: Record<string, any>) {
    let response = await this.privateHttp.post(this.envPath('/surveys/'), data);
    return response.data;
  }

  async updateSurvey(surveyId: string, data: Record<string, any>) {
    let response = await this.privateHttp.patch(this.envPath(`/surveys/${surveyId}/`), data);
    return response.data;
  }

  async deleteSurvey(surveyId: string) {
    await this.privateHttp.delete(this.envPath(`/surveys/${surveyId}/`));
  }

  // ── Insights ─────────────────────────────────────────────────────────

  async listInsights(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    savedOnly?: boolean;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.savedOnly) queryParams.saved = 'true';

    let response = await this.privateHttp.get(this.envPath('/insights/'), {
      params: queryParams
    });
    return response.data;
  }

  async getInsight(insightId: string) {
    let response = await this.privateHttp.get(this.envPath(`/insights/${insightId}/`));
    return response.data;
  }

  // ── Dashboards ───────────────────────────────────────────────────────

  async listDashboards(params?: { limit?: number; offset?: number; search?: string }) {
    let queryParams: Record<string, string> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);

    let response = await this.privateHttp.get(this.envPath('/dashboards/'), {
      params: queryParams
    });
    return response.data;
  }

  async getDashboard(dashboardId: string) {
    let response = await this.privateHttp.get(this.envPath(`/dashboards/${dashboardId}/`));
    return response.data;
  }

  async createDashboard(data: Record<string, any>) {
    let response = await this.privateHttp.post(this.envPath('/dashboards/'), data);
    return response.data;
  }

  async updateDashboard(dashboardId: string, data: Record<string, any>) {
    let response = await this.privateHttp.patch(
      this.envPath(`/dashboards/${dashboardId}/`),
      data
    );
    return response.data;
  }

  async deleteDashboard(dashboardId: string) {
    await this.privateHttp.delete(this.envPath(`/dashboards/${dashboardId}/`));
  }

  // ── Cohorts ──────────────────────────────────────────────────────────

  async listCohorts(params?: { limit?: number; offset?: number }) {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);

    let response = await this.privateHttp.get(this.envPath('/cohorts/'), {
      params: queryParams
    });
    return response.data;
  }

  async getCohort(cohortId: string) {
    let response = await this.privateHttp.get(this.envPath(`/cohorts/${cohortId}/`));
    return response.data;
  }

  async createCohort(data: Record<string, any>) {
    let response = await this.privateHttp.post(this.envPath('/cohorts/'), data);
    return response.data;
  }

  async updateCohort(cohortId: string, data: Record<string, any>) {
    let response = await this.privateHttp.patch(this.envPath(`/cohorts/${cohortId}/`), data);
    return response.data;
  }

  // ── Annotations ──────────────────────────────────────────────────────

  async listAnnotations(params?: { limit?: number; offset?: number; search?: string }) {
    let queryParams: Record<string, string> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);

    let response = await this.privateHttp.get(this.envPath('/annotations/'), {
      params: queryParams
    });
    return response.data;
  }

  async createAnnotation(data: Record<string, any>) {
    let response = await this.privateHttp.post(this.envPath('/annotations/'), data);
    return response.data;
  }

  async updateAnnotation(annotationId: string, data: Record<string, any>) {
    let response = await this.privateHttp.patch(
      this.envPath(`/annotations/${annotationId}/`),
      data
    );
    return response.data;
  }

  async deleteAnnotation(annotationId: string) {
    await this.privateHttp.delete(this.envPath(`/annotations/${annotationId}/`));
  }

  // ── Actions ──────────────────────────────────────────────────────────

  async listActions(params?: { limit?: number; offset?: number }) {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);

    let response = await this.privateHttp.get(this.envPath('/actions/'), {
      params: queryParams
    });
    return response.data;
  }

  async getAction(actionId: string) {
    let response = await this.privateHttp.get(this.envPath(`/actions/${actionId}/`));
    return response.data;
  }

  // ── Session Recordings ───────────────────────────────────────────────

  async listSessionRecordings(params?: {
    limit?: number;
    offset?: number;
    personId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.personId) queryParams.person_id = params.personId;
    if (params?.dateFrom) queryParams.date_from = params.dateFrom;
    if (params?.dateTo) queryParams.date_to = params.dateTo;

    let response = await this.privateHttp.get(this.envPath('/session_recordings/'), {
      params: queryParams
    });
    return response.data;
  }

  async getSessionRecording(recordingId: string) {
    let response = await this.privateHttp.get(
      this.envPath(`/session_recordings/${recordingId}/`)
    );
    return response.data;
  }

  // ── Query (HogQL) ───────────────────────────────────────────────────

  async runQuery(query: Record<string, any>) {
    let response = await this.privateHttp.post(this.envPath('/query/'), { query });
    return response.data;
  }

  // ── Event Definitions ────────────────────────────────────────────────

  async listEventDefinitions(params?: { limit?: number; offset?: number; search?: string }) {
    let queryParams: Record<string, string> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);

    let response = await this.privateHttp.get(this.envPath('/event_definitions/'), {
      params: queryParams
    });
    return response.data;
  }

  // ── Property Definitions ─────────────────────────────────────────────

  async listPropertyDefinitions(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    type?: string;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.type) queryParams.type = params.type;

    let response = await this.privateHttp.get(this.envPath('/property_definitions/'), {
      params: queryParams
    });
    return response.data;
  }

  // ── Projects ─────────────────────────────────────────────────────────

  async listProjects() {
    let response = await this.privateHttp.get('/api/projects/');
    return response.data;
  }

  async getProject(projectId: string) {
    let response = await this.privateHttp.get(`/api/projects/${projectId}/`);
    return response.data;
  }

  async getCurrentUser() {
    let response = await this.privateHttp.get('/api/users/@me/');
    return response.data;
  }
}
