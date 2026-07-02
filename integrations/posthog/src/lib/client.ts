import { createAxios } from 'slates';
import { postHogApiError, postHogServiceError } from './errors';
import { getPrivateBaseUrl, getPublicBaseUrl } from './urls';

type JsonRecord = Record<string, any>;
type QueryParams = Record<string, string>;
type RequestConfig = { params?: QueryParams };

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

  private requireProjectId(operation: string): string {
    if (!this.projectId) {
      throw postHogServiceError(
        `PostHog projectId is required to ${operation}. Set projectId in the integration config.`
      );
    }

    return this.projectId;
  }

  private envPath(path: string, operation: string): string {
    return `/api/environments/${this.requireProjectId(operation)}${path}`;
  }

  private projectPath(path: string, operation: string): string {
    return `/api/projects/${this.requireProjectId(operation)}${path}`;
  }

  private async privateGet(path: string, operation: string, config?: RequestConfig) {
    try {
      let response = await this.privateHttp.get(path, config);
      return response.data;
    } catch (error) {
      throw postHogApiError(error, operation);
    }
  }

  private async privatePost(path: string, body: JsonRecord, operation: string) {
    try {
      let response = await this.privateHttp.post(path, body);
      return response.data;
    } catch (error) {
      throw postHogApiError(error, operation);
    }
  }

  private async privatePatch(path: string, body: JsonRecord, operation: string) {
    try {
      let response = await this.privateHttp.patch(path, body);
      return response.data;
    } catch (error) {
      throw postHogApiError(error, operation);
    }
  }

  private async privateDelete(path: string, operation: string) {
    try {
      let response = await this.privateHttp.delete(path);
      return response.data;
    } catch (error) {
      throw postHogApiError(error, operation);
    }
  }

  private async publicPost(path: string, body: JsonRecord, operation: string) {
    try {
      let response = await this.publicHttp.post(path, body);
      return response.data;
    } catch (error) {
      throw postHogApiError(error, operation);
    }
  }

  // Event Capture

  async captureEvent(params: {
    apiKey: string;
    distinctId: string;
    event: string;
    properties?: JsonRecord;
    timestamp?: string;
    set?: JsonRecord;
    setOnce?: JsonRecord;
  }) {
    let properties: JsonRecord = { ...(params.properties || {}) };
    if (params.set) properties.$set = params.set;
    if (params.setOnce) properties.$set_once = params.setOnce;

    let body: JsonRecord = {
      api_key: params.apiKey,
      distinct_id: params.distinctId,
      event: params.event,
      properties
    };
    if (params.timestamp) body.timestamp = params.timestamp;

    return this.publicPost('/i/v0/e/', body, 'capture event');
  }

  async captureBatch(params: {
    apiKey: string;
    events: Array<{
      distinctId: string;
      event: string;
      properties?: JsonRecord;
      timestamp?: string;
      set?: JsonRecord;
      setOnce?: JsonRecord;
    }>;
  }) {
    let batch = params.events.map(e => {
      let properties: JsonRecord = { ...(e.properties || {}) };
      if (properties.distinct_id === undefined) properties.distinct_id = e.distinctId;
      if (e.set) properties.$set = e.set;
      if (e.setOnce) properties.$set_once = e.setOnce;

      return {
        distinct_id: e.distinctId,
        event: e.event,
        properties,
        ...(e.timestamp ? { timestamp: e.timestamp } : {})
      };
    });

    return this.publicPost(
      '/batch/',
      {
        api_key: params.apiKey,
        batch
      },
      'capture event batch'
    );
  }

  // Persons

  async listPersons(params?: {
    search?: string;
    properties?: any[];
    limit?: number;
    offset?: number;
  }) {
    let queryParams: QueryParams = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.properties) queryParams.properties = JSON.stringify(params.properties);

    return this.privateGet(this.envPath('/persons/', 'list persons'), 'list persons', {
      params: queryParams
    });
  }

  async getPerson(personId: string) {
    return this.privateGet(
      this.envPath(`/persons/${personId}/`, 'get a person'),
      'get person'
    );
  }

  async deletePerson(personId: string) {
    return this.privatePost(
      this.envPath('/persons/bulk_delete/', 'delete persons'),
      { ids: [personId] },
      'delete person'
    );
  }

  // Feature Flags

  async listFeatureFlags(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    active?: 'STALE' | 'false' | 'true';
    type?: 'boolean' | 'experiment' | 'multivariant' | 'remote_config';
  }) {
    let queryParams: QueryParams = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.active) queryParams.active = params.active;
    if (params?.type) queryParams.type = params.type;

    return this.privateGet(
      this.projectPath('/feature_flags/', 'list feature flags'),
      'list feature flags',
      { params: queryParams }
    );
  }

  async getFeatureFlag(flagId: string) {
    return this.privateGet(
      this.projectPath(`/feature_flags/${flagId}/`, 'get a feature flag'),
      'get feature flag'
    );
  }

  async createFeatureFlag(data: JsonRecord) {
    return this.privatePost(
      this.projectPath('/feature_flags/', 'create a feature flag'),
      data,
      'create feature flag'
    );
  }

  async updateFeatureFlag(flagId: string, data: JsonRecord) {
    return this.privatePatch(
      this.projectPath(`/feature_flags/${flagId}/`, 'update a feature flag'),
      data,
      'update feature flag'
    );
  }

  async deleteFeatureFlag(flagId: string) {
    return this.privateDelete(
      this.projectPath(`/feature_flags/${flagId}/`, 'delete a feature flag'),
      'delete feature flag'
    );
  }

  async evaluateFeatureFlags(params: {
    apiKey: string;
    distinctId: string;
    groups?: Record<string, string>;
    personProperties?: JsonRecord;
    groupProperties?: Record<string, JsonRecord>;
    evaluationContexts?: string[];
    includeConfig?: boolean;
  }) {
    let body: JsonRecord = {
      api_key: params.apiKey,
      distinct_id: params.distinctId
    };
    if (params.groups) body.groups = params.groups;
    if (params.personProperties) body.person_properties = params.personProperties;
    if (params.groupProperties) body.group_properties = params.groupProperties;
    if (params.evaluationContexts) body.evaluation_contexts = params.evaluationContexts;

    return this.publicPost(
      `/flags/?v=2${params.includeConfig ? '&config=true' : ''}`,
      body,
      'evaluate feature flags'
    );
  }

  // Experiments

  async listExperiments(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    archived?: boolean;
  }) {
    let queryParams: QueryParams = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.search) queryParams.search = params.search;
    if (params?.status) queryParams.status = params.status;
    if (params?.archived !== undefined) queryParams.archived = String(params.archived);

    return this.privateGet(
      this.projectPath('/experiments/', 'list experiments'),
      'list experiments',
      { params: queryParams }
    );
  }

  async getExperiment(experimentId: string) {
    return this.privateGet(
      this.projectPath(`/experiments/${experimentId}/`, 'get an experiment'),
      'get experiment'
    );
  }

  async createExperiment(data: JsonRecord) {
    return this.privatePost(
      this.projectPath('/experiments/', 'create an experiment'),
      data,
      'create experiment'
    );
  }

  async updateExperiment(experimentId: string, data: JsonRecord) {
    return this.privatePatch(
      this.projectPath(`/experiments/${experimentId}/`, 'update an experiment'),
      data,
      'update experiment'
    );
  }

  async deleteExperiment(experimentId: string) {
    return this.privateDelete(
      this.projectPath(`/experiments/${experimentId}/`, 'delete an experiment'),
      'delete experiment'
    );
  }

  // Surveys

  async listSurveys(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    archived?: boolean;
    type?: string;
  }) {
    let queryParams: QueryParams = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.search) queryParams.search = params.search;
    if (params?.archived !== undefined) queryParams.archived = String(params.archived);
    if (params?.type) queryParams.type = params.type;

    return this.privateGet(this.projectPath('/surveys/', 'list surveys'), 'list surveys', {
      params: queryParams
    });
  }

  async getSurvey(surveyId: string) {
    return this.privateGet(
      this.projectPath(`/surveys/${surveyId}/`, 'get a survey'),
      'get survey'
    );
  }

  async createSurvey(data: JsonRecord) {
    return this.privatePost(
      this.projectPath('/surveys/', 'create a survey'),
      data,
      'create survey'
    );
  }

  async updateSurvey(surveyId: string, data: JsonRecord) {
    return this.privatePatch(
      this.projectPath(`/surveys/${surveyId}/`, 'update a survey'),
      data,
      'update survey'
    );
  }

  async deleteSurvey(surveyId: string) {
    return this.privateDelete(
      this.projectPath(`/surveys/${surveyId}/`, 'delete a survey'),
      'delete survey'
    );
  }

  // Insights

  async listInsights(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    savedOnly?: boolean;
  }) {
    let queryParams: QueryParams = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.savedOnly) queryParams.saved = 'true';

    return this.privateGet(this.envPath('/insights/', 'list insights'), 'list insights', {
      params: queryParams
    });
  }

  async getInsight(insightId: string) {
    return this.privateGet(
      this.envPath(`/insights/${insightId}/`, 'get an insight'),
      'get insight'
    );
  }

  // Dashboards

  async listDashboards(params?: { limit?: number; offset?: number; search?: string }) {
    let queryParams: QueryParams = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);

    return this.privateGet(
      this.envPath('/dashboards/', 'list dashboards'),
      'list dashboards',
      { params: queryParams }
    );
  }

  async getDashboard(dashboardId: string) {
    return this.privateGet(
      this.envPath(`/dashboards/${dashboardId}/`, 'get a dashboard'),
      'get dashboard'
    );
  }

  async createDashboard(data: JsonRecord) {
    return this.privatePost(
      this.envPath('/dashboards/', 'create a dashboard'),
      data,
      'create dashboard'
    );
  }

  async updateDashboard(dashboardId: string, data: JsonRecord) {
    return this.privatePatch(
      this.envPath(`/dashboards/${dashboardId}/`, 'update a dashboard'),
      data,
      'update dashboard'
    );
  }

  async deleteDashboard(dashboardId: string) {
    return this.privateDelete(
      this.envPath(`/dashboards/${dashboardId}/`, 'delete a dashboard'),
      'delete dashboard'
    );
  }

  // Cohorts

  async listCohorts(params?: { limit?: number; offset?: number; basic?: boolean }) {
    let queryParams: QueryParams = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.basic !== undefined) queryParams.basic = String(params.basic);

    return this.privateGet(this.projectPath('/cohorts/', 'list cohorts'), 'list cohorts', {
      params: queryParams
    });
  }

  async getCohort(cohortId: string) {
    return this.privateGet(
      this.projectPath(`/cohorts/${cohortId}/`, 'get a cohort'),
      'get cohort'
    );
  }

  async createCohort(data: JsonRecord) {
    return this.privatePost(
      this.projectPath('/cohorts/', 'create a cohort'),
      data,
      'create cohort'
    );
  }

  async updateCohort(cohortId: string, data: JsonRecord) {
    return this.privatePatch(
      this.projectPath(`/cohorts/${cohortId}/`, 'update a cohort'),
      data,
      'update cohort'
    );
  }

  async deleteCohort(cohortId: string) {
    return this.privateDelete(
      this.projectPath(`/cohorts/${cohortId}/`, 'delete a cohort'),
      'delete cohort'
    );
  }

  // Annotations

  async listAnnotations(params?: { limit?: number; offset?: number; search?: string }) {
    let queryParams: QueryParams = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);

    return this.privateGet(
      this.projectPath('/annotations/', 'list annotations'),
      'list annotations',
      { params: queryParams }
    );
  }

  async getAnnotation(annotationId: string) {
    return this.privateGet(
      this.projectPath(`/annotations/${annotationId}/`, 'get an annotation'),
      'get annotation'
    );
  }

  async createAnnotation(data: JsonRecord) {
    return this.privatePost(
      this.projectPath('/annotations/', 'create an annotation'),
      data,
      'create annotation'
    );
  }

  async updateAnnotation(annotationId: string, data: JsonRecord) {
    return this.privatePatch(
      this.projectPath(`/annotations/${annotationId}/`, 'update an annotation'),
      data,
      'update annotation'
    );
  }

  async deleteAnnotation(annotationId: string) {
    return this.privateDelete(
      this.projectPath(`/annotations/${annotationId}/`, 'delete an annotation'),
      'delete annotation'
    );
  }

  // Actions

  async listActions(params?: { limit?: number; offset?: number; search?: string }) {
    let queryParams: QueryParams = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);

    return this.privateGet(this.projectPath('/actions/', 'list actions'), 'list actions', {
      params: queryParams
    });
  }

  async getAction(actionId: string) {
    return this.privateGet(
      this.projectPath(`/actions/${actionId}/`, 'get an action'),
      'get action'
    );
  }

  async createAction(data: JsonRecord) {
    return this.privatePost(
      this.projectPath('/actions/', 'create an action'),
      data,
      'create action'
    );
  }

  async updateAction(actionId: string, data: JsonRecord) {
    return this.privatePatch(
      this.projectPath(`/actions/${actionId}/`, 'update an action'),
      data,
      'update action'
    );
  }

  async deleteAction(actionId: string) {
    return this.privateDelete(
      this.projectPath(`/actions/${actionId}/`, 'delete an action'),
      'delete action'
    );
  }

  // Groups

  async listGroupTypes() {
    return this.privateGet(
      this.projectPath('/groups_types/', 'list group types'),
      'list group types'
    );
  }

  async listGroups(params: {
    groupTypeIndex: number;
    groupKey?: string;
    search?: string;
    cursor?: string;
  }) {
    let queryParams: QueryParams = {
      group_type_index: String(params.groupTypeIndex)
    };
    if (params.groupKey) queryParams.group_key = params.groupKey;
    if (params.search) queryParams.search = params.search;
    if (params.cursor) queryParams.cursor = params.cursor;

    return this.privateGet(this.projectPath('/groups/', 'list groups'), 'list groups', {
      params: queryParams
    });
  }

  async findGroup(params: {
    groupTypeIndex: number;
    groupKey: string;
    skipCreateNotebook?: boolean;
  }) {
    let queryParams: QueryParams = {
      group_type_index: String(params.groupTypeIndex),
      group_key: params.groupKey
    };
    if (params.skipCreateNotebook !== undefined) {
      queryParams.skip_create_notebook = String(params.skipCreateNotebook);
    }

    let data = await this.privateGet(
      this.projectPath('/groups/find/', 'find a group'),
      'find group',
      {
        params: queryParams
      }
    );
    if (
      data &&
      typeof data === 'object' &&
      (data as Record<string, unknown>).group_key !== undefined
    ) {
      return data;
    }

    let listed = await this.listGroups({
      groupTypeIndex: params.groupTypeIndex,
      groupKey: params.groupKey
    });
    let results = Array.isArray(listed) ? listed : listed.results || [];
    let group = results[0];
    if (!group) {
      throw postHogServiceError(
        `PostHog group ${params.groupKey} was not found for group type ${params.groupTypeIndex}.`
      );
    }

    return group;
  }

  async createGroup(data: JsonRecord) {
    return this.privatePost(
      this.projectPath('/groups/', 'create a group'),
      data,
      'create group'
    );
  }

  async updateGroupProperty(data: JsonRecord) {
    return this.privatePost(
      this.projectPath('/groups/update_property/', 'update a group property'),
      data,
      'update group property'
    );
  }

  async deleteGroupProperty(data: JsonRecord) {
    return this.privatePost(
      this.projectPath('/groups/delete_property/', 'delete a group property'),
      data,
      'delete group property'
    );
  }

  // Session Recordings

  async listSessionRecordings(params?: {
    limit?: number;
    offset?: number;
    personId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    let queryParams: QueryParams = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.personId) queryParams.person_id = params.personId;
    if (params?.dateFrom) queryParams.date_from = params.dateFrom;
    if (params?.dateTo) queryParams.date_to = params.dateTo;

    return this.privateGet(
      this.envPath('/session_recordings/', 'list session recordings'),
      'list session recordings',
      { params: queryParams }
    );
  }

  async getSessionRecording(recordingId: string) {
    return this.privateGet(
      this.envPath(`/session_recordings/${recordingId}/`, 'get a session recording'),
      'get session recording'
    );
  }

  // Query (HogQL)

  async runQuery(query: JsonRecord) {
    return this.privatePost(this.envPath('/query/', 'run a query'), { query }, 'run query');
  }

  // Event Definitions

  async listEventDefinitions(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    excludeHidden?: boolean;
    excludeStale?: boolean;
  }) {
    let queryParams: QueryParams = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.excludeHidden !== undefined)
      queryParams.exclude_hidden = String(params.excludeHidden);
    if (params?.excludeStale !== undefined)
      queryParams.exclude_stale = String(params.excludeStale);

    return this.privateGet(
      this.projectPath('/event_definitions/', 'list event definitions'),
      'list event definitions',
      { params: queryParams }
    );
  }

  // Property Definitions

  async listPropertyDefinitions(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    type?: string;
  }) {
    let queryParams: QueryParams = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.type) queryParams.type = params.type;

    return this.privateGet(
      this.projectPath('/property_definitions/', 'list property definitions'),
      'list property definitions',
      { params: queryParams }
    );
  }

  // Projects and account context

  async listOrganizations(params?: { limit?: number; offset?: number }) {
    let queryParams: QueryParams = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);

    return this.privateGet('/api/organizations/', 'list organizations', {
      params: queryParams
    });
  }

  async listProjects(params?: {
    organizationId?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }) {
    let queryParams: QueryParams = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.search) queryParams.search = params.search;

    if (params?.organizationId) {
      return this.privateGet(
        `/api/organizations/${params.organizationId}/projects/`,
        'list organization projects',
        { params: queryParams }
      );
    }

    return this.privateGet('/api/projects/', 'list projects', { params: queryParams });
  }

  async getProject(projectId: string) {
    return this.privateGet(`/api/projects/${projectId}/`, 'get project');
  }

  async getCurrentUser() {
    return this.privateGet('/api/users/@me/', 'get current user');
  }
}
