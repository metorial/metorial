import { createAxios } from 'slates';

export type Region = 'us' | 'eu';

let getGraphqlUrl = (region: Region): string =>
  region === 'eu' ? 'https://api.eu.newrelic.com/graphql' : 'https://api.newrelic.com/graphql';

let getMetricIngestUrl = (region: Region): string =>
  region === 'eu'
    ? 'https://metric-api.eu.newrelic.com/metric/v1'
    : 'https://metric-api.newrelic.com/metric/v1';

let getEventIngestUrl = (region: Region, accountId: string): string =>
  region === 'eu'
    ? `https://insights-collector.eu01.nr-data.net/v1/accounts/${accountId}/events`
    : `https://insights-collector.nr-data.net/v1/accounts/${accountId}/events`;

let getLogIngestUrl = (region: Region): string =>
  region === 'eu'
    ? 'https://log-api.eu.newrelic.com/log/v1'
    : 'https://log-api.newrelic.com/log/v1';

let getTraceIngestUrl = (region: Region): string =>
  region === 'eu'
    ? 'https://trace-api.eu.newrelic.com/trace/v1'
    : 'https://trace-api.newrelic.com/trace/v1';

export interface ClientConfig {
  token: string;
  region: Region;
  accountId: string;
  licenseKey?: string;
}

export class NerdGraphClient {
  private http: ReturnType<typeof createAxios>;
  private accountId: string;

  constructor(config: ClientConfig) {
    this.accountId = config.accountId;
    this.http = createAxios({
      baseURL: getGraphqlUrl(config.region),
      headers: {
        'API-Key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async query(graphqlQuery: string, variables?: Record<string, any>): Promise<any> {
    let response = await this.http.post('', {
      query: graphqlQuery,
      variables: variables || {}
    });

    if (response.data?.errors?.length) {
      throw new Error(
        `NerdGraph error: ${response.data.errors.map((e: any) => e.message).join(', ')}`
      );
    }

    return response.data?.data;
  }

  async runNrql(nrql: string, timeout?: number): Promise<any> {
    let timeoutValue = timeout || 30;
    let data = await this.query(
      `query($accountId: Int!, $nrql: Nrql!, $timeout: Seconds) {
        actor {
          account(id: $accountId) {
            nrql(query: $nrql, timeout: $timeout) {
              results
              metadata {
                timeWindow { begin end }
                facets
              }
            }
          }
        }
      }`,
      { accountId: Number.parseInt(this.accountId, 10), nrql, timeout: timeoutValue }
    );

    return data?.actor?.account?.nrql;
  }

  async searchEntities(params: { query?: string; cursor?: string }): Promise<any> {
    let data = await this.query(
      `query($query: String, $cursor: String) {
        actor {
          entitySearch(query: $query) {
            results(cursor: $cursor) {
              entities {
                guid
                name
                entityType
                domain
                type
                reporting
                alertSeverity
                permalink
                tags { key values }
                account { id name }
              }
              nextCursor
            }
            count
          }
        }
      }`,
      { query: params.query || undefined, cursor: params.cursor }
    );

    return data?.actor?.entitySearch;
  }

  async getEntity(entityGuid: string): Promise<any> {
    let data = await this.query(
      `query($guid: EntityGuid!) {
        actor {
          entity(guid: $guid) {
            guid
            name
            entityType
            domain
            type
            reporting
            alertSeverity
            permalink
            tags { key values }
            account { id name }
            goldenMetrics {
              metrics {
                name
                title
                unit
                query
              }
            }
          }
        }
      }`,
      { guid: entityGuid }
    );

    return data?.actor?.entity;
  }

  async addEntityTags(
    entityGuid: string,
    tags: Array<{ key: string; values: string[] }>
  ): Promise<any> {
    let data = await this.query(
      `mutation($guid: EntityGuid!, $tags: [TaggingTagInput!]!) {
        taggingAddTagsToEntity(guid: $guid, tags: $tags) {
          errors { message type }
        }
      }`,
      { guid: entityGuid, tags }
    );

    let result = data?.taggingAddTagsToEntity;
    if (result?.errors?.length) {
      throw new Error(`Tag error: ${result.errors.map((e: any) => e.message).join(', ')}`);
    }
    return result;
  }

  async deleteEntityTags(entityGuid: string, tagKeys: string[]): Promise<any> {
    let data = await this.query(
      `mutation($guid: EntityGuid!, $tagKeys: [String!]!) {
        taggingDeleteTagFromEntity(guid: $guid, tagKeys: $tagKeys) {
          errors { message type }
        }
      }`,
      { guid: entityGuid, tagKeys }
    );

    let result = data?.taggingDeleteTagFromEntity;
    if (result?.errors?.length) {
      throw new Error(
        `Tag deletion error: ${result.errors.map((e: any) => e.message).join(', ')}`
      );
    }
    return result;
  }

  async replaceEntityTags(
    entityGuid: string,
    tags: Array<{ key: string; values: string[] }>
  ): Promise<any> {
    let data = await this.query(
      `mutation($guid: EntityGuid!, $tags: [TaggingTagInput!]!) {
        taggingReplaceTagsOnEntity(guid: $guid, tags: $tags) {
          errors { message type }
        }
      }`,
      { guid: entityGuid, tags }
    );

    let result = data?.taggingReplaceTagsOnEntity;
    if (result?.errors?.length) {
      throw new Error(
        `Tag replace error: ${result.errors.map((e: any) => e.message).join(', ')}`
      );
    }
    return result;
  }

  async createNrqlAlertCondition(
    policyId: string,
    params: {
      name: string;
      nrql: string;
      enabled?: boolean;
      type: 'STATIC' | 'BASELINE';
      critical?: {
        threshold: number;
        thresholdDuration: number;
        operator: string;
        thresholdOccurrences: string;
      };
      warning?: {
        threshold: number;
        thresholdDuration: number;
        operator: string;
        thresholdOccurrences: string;
      };
      signal?: {
        aggregationDelay?: number;
        aggregationMethod?: string;
        aggregationWindow?: number;
        fillOption?: string;
        fillValue?: number;
      };
      expiration?: {
        closeViolationsOnExpiration?: boolean;
        expirationDuration?: number;
        openViolationOnExpiration?: boolean;
      };
      description?: string;
    }
  ): Promise<any> {
    let terms: any[] = [];
    if (params.critical) {
      terms.push({ ...params.critical, priority: 'CRITICAL' });
    }
    if (params.warning) {
      terms.push({ ...params.warning, priority: 'WARNING' });
    }

    let conditionInput: any = {
      name: params.name,
      enabled: params.enabled !== false,
      nrql: { query: params.nrql },
      terms,
      signal: params.signal || {
        aggregationWindow: 60,
        aggregationMethod: 'EVENT_FLOW',
        aggregationDelay: 120
      },
      description: params.description || ''
    };

    if (params.expiration) {
      conditionInput.expiration = params.expiration;
    }

    let mutation =
      params.type === 'STATIC'
        ? `mutation($accountId: Int!, $policyId: ID!, $condition: AlertsNrqlConditionStaticInput!) {
          alertsNrqlConditionStaticCreate(accountId: $accountId, policyId: $policyId, condition: $condition) {
            id name enabled nrql { query } terms { threshold thresholdDuration operator priority thresholdOccurrences } policyId description
          }
        }`
        : `mutation($accountId: Int!, $policyId: ID!, $condition: AlertsNrqlConditionBaselineInput!) {
          alertsNrqlConditionBaselineCreate(accountId: $accountId, policyId: $policyId, condition: $condition) {
            id name enabled nrql { query } terms { threshold thresholdDuration operator priority thresholdOccurrences } policyId description
          }
        }`;

    let data = await this.query(mutation, {
      accountId: Number.parseInt(this.accountId, 10),
      policyId,
      condition: conditionInput
    });

    return params.type === 'STATIC'
      ? data?.alertsNrqlConditionStaticCreate
      : data?.alertsNrqlConditionBaselineCreate;
  }

  async updateNrqlAlertCondition(
    conditionId: string,
    params: {
      name?: string;
      nrql?: string;
      enabled?: boolean;
      type: 'STATIC' | 'BASELINE';
      critical?: {
        threshold: number;
        thresholdDuration: number;
        operator: string;
        thresholdOccurrences: string;
      };
      warning?: {
        threshold: number;
        thresholdDuration: number;
        operator: string;
        thresholdOccurrences: string;
      };
      description?: string;
    }
  ): Promise<any> {
    let conditionInput: any = {};
    if (params.name !== undefined) conditionInput.name = params.name;
    if (params.nrql !== undefined) conditionInput.nrql = { query: params.nrql };
    if (params.enabled !== undefined) conditionInput.enabled = params.enabled;
    if (params.description !== undefined) conditionInput.description = params.description;

    let terms: any[] = [];
    if (params.critical) terms.push({ ...params.critical, priority: 'CRITICAL' });
    if (params.warning) terms.push({ ...params.warning, priority: 'WARNING' });
    if (terms.length > 0) conditionInput.terms = terms;

    let mutation =
      params.type === 'STATIC'
        ? `mutation($accountId: Int!, $id: ID!, $condition: AlertsNrqlConditionStaticInput!) {
          alertsNrqlConditionStaticUpdate(accountId: $accountId, id: $id, condition: $condition) {
            id name enabled nrql { query } terms { threshold thresholdDuration operator priority thresholdOccurrences } policyId description
          }
        }`
        : `mutation($accountId: Int!, $id: ID!, $condition: AlertsNrqlConditionBaselineInput!) {
          alertsNrqlConditionBaselineUpdate(accountId: $accountId, id: $id, condition: $condition) {
            id name enabled nrql { query } terms { threshold thresholdDuration operator priority thresholdOccurrences } policyId description
          }
        }`;

    let data = await this.query(mutation, {
      accountId: Number.parseInt(this.accountId, 10),
      id: conditionId,
      condition: conditionInput
    });

    return params.type === 'STATIC'
      ? data?.alertsNrqlConditionStaticUpdate
      : data?.alertsNrqlConditionBaselineUpdate;
  }

  async deleteAlertCondition(conditionId: string): Promise<any> {
    let data = await this.query(
      `mutation($accountId: Int!, $id: ID!) {
        alertsConditionDelete(accountId: $accountId, id: $id) {
          id
        }
      }`,
      { accountId: Number.parseInt(this.accountId, 10), id: conditionId }
    );

    return data?.alertsConditionDelete;
  }

  async createDashboard(params: {
    name: string;
    description?: string;
    permissions?: string;
    pages: Array<{
      name: string;
      description?: string;
      widgets: Array<{
        title: string;
        visualization: string;
        rawConfiguration: any;
        layout?: { column: number; row: number; width: number; height: number };
      }>;
    }>;
  }): Promise<any> {
    let dashboardInput: any = {
      name: params.name,
      description: params.description || '',
      permissions: params.permissions || 'PUBLIC_READ_WRITE',
      pages: params.pages.map(page => ({
        name: page.name,
        description: page.description || '',
        widgets: page.widgets.map(widget => ({
          title: widget.title,
          visualization: { id: widget.visualization },
          rawConfiguration: widget.rawConfiguration,
          layout: widget.layout
        }))
      }))
    };

    let data = await this.query(
      `mutation($accountId: Int!, $dashboard: DashboardInput!) {
        dashboardCreate(accountId: $accountId, dashboard: $dashboard) {
          entityResult {
            guid name description permalink
            pages { guid name widgets { id title visualization { id } } }
          }
          errors { description type }
        }
      }`,
      { accountId: Number.parseInt(this.accountId, 10), dashboard: dashboardInput }
    );

    let result = data?.dashboardCreate;
    if (result?.errors?.length) {
      throw new Error(
        `Dashboard create error: ${result.errors.map((e: any) => e.description).join(', ')}`
      );
    }
    return result?.entityResult;
  }

  async updateDashboard(
    dashboardGuid: string,
    params: {
      name?: string;
      description?: string;
      permissions?: string;
      pages?: Array<{
        name: string;
        description?: string;
        widgets: Array<{
          title: string;
          visualization: string;
          rawConfiguration: any;
          layout?: { column: number; row: number; width: number; height: number };
        }>;
      }>;
    }
  ): Promise<any> {
    let dashboardInput: any = {};
    if (params.name !== undefined) dashboardInput.name = params.name;
    if (params.description !== undefined) dashboardInput.description = params.description;
    if (params.permissions !== undefined) dashboardInput.permissions = params.permissions;
    if (params.pages !== undefined) {
      dashboardInput.pages = params.pages.map(page => ({
        name: page.name,
        description: page.description || '',
        widgets: page.widgets.map(widget => ({
          title: widget.title,
          visualization: { id: widget.visualization },
          rawConfiguration: widget.rawConfiguration,
          layout: widget.layout
        }))
      }));
    }

    let data = await this.query(
      `mutation($guid: EntityGuid!, $dashboard: DashboardUpdateInput!) {
        dashboardUpdate(guid: $guid, dashboard: $dashboard) {
          entityResult {
            guid name description permalink
            pages { guid name widgets { id title visualization { id } } }
          }
          errors { description type }
        }
      }`,
      { guid: dashboardGuid, dashboard: dashboardInput }
    );

    let result = data?.dashboardUpdate;
    if (result?.errors?.length) {
      throw new Error(
        `Dashboard update error: ${result.errors.map((e: any) => e.description).join(', ')}`
      );
    }
    return result?.entityResult;
  }

  async deleteDashboard(dashboardGuid: string): Promise<any> {
    let data = await this.query(
      `mutation($guid: EntityGuid!) {
        dashboardDelete(guid: $guid) {
          status
          errors { description type }
        }
      }`,
      { guid: dashboardGuid }
    );

    let result = data?.dashboardDelete;
    if (result?.errors?.length) {
      throw new Error(
        `Dashboard delete error: ${result.errors.map((e: any) => e.description).join(', ')}`
      );
    }
    return result;
  }

  async getDashboard(dashboardGuid: string): Promise<any> {
    let data = await this.query(
      `query($guid: EntityGuid!) {
        actor {
          entity(guid: $guid) {
            ... on DashboardEntity {
              guid name description permalink permissions
              pages {
                guid name description
                widgets {
                  id title
                  visualization { id }
                  rawConfiguration
                  layout { column row width height }
                }
              }
            }
          }
        }
      }`,
      { guid: dashboardGuid }
    );

    return data?.actor?.entity;
  }

  async createSyntheticMonitor(params: {
    name: string;
    type: string;
    uri?: string;
    period: string;
    status: string;
    locations: { public: string[] };
    script?: string;
  }): Promise<any> {
    let monitorType = params.type.toUpperCase();

    if (monitorType === 'SIMPLE_BROWSER') {
      let data = await this.query(
        `mutation($accountId: Int!, $monitor: SyntheticsCreateSimpleBrowserMonitorInput!) {
          syntheticsCreateSimpleBrowserMonitor(accountId: $accountId, monitor: $monitor) {
            monitor { guid name status period uri locations { public } }
            errors { description type }
          }
        }`,
        {
          accountId: Number.parseInt(this.accountId, 10),
          monitor: {
            name: params.name,
            uri: params.uri,
            period: params.period,
            status: params.status,
            locations: params.locations
          }
        }
      );
      let result = data?.syntheticsCreateSimpleBrowserMonitor;
      if (result?.errors?.length) {
        throw new Error(
          `Synthetics error: ${result.errors.map((e: any) => e.description).join(', ')}`
        );
      }
      return result?.monitor;
    }

    if (monitorType === 'SCRIPT_BROWSER' || monitorType === 'SCRIPT_API') {
      let mutationName =
        monitorType === 'SCRIPT_BROWSER'
          ? 'syntheticsCreateScriptBrowserMonitor'
          : 'syntheticsCreateScriptApiMonitor';
      let inputType =
        monitorType === 'SCRIPT_BROWSER'
          ? 'SyntheticsCreateScriptBrowserMonitorInput'
          : 'SyntheticsCreateScriptApiMonitorInput';

      let data = await this.query(
        `mutation($accountId: Int!, $monitor: ${inputType}!) {
          ${mutationName}(accountId: $accountId, monitor: $monitor) {
            monitor { guid name status period locations { public } }
            errors { description type }
          }
        }`,
        {
          accountId: Number.parseInt(this.accountId, 10),
          monitor: {
            name: params.name,
            period: params.period,
            status: params.status,
            locations: params.locations,
            script: params.script,
            ...(params.uri ? { uri: params.uri } : {})
          }
        }
      );
      let result = data?.[mutationName];
      if (result?.errors?.length) {
        throw new Error(
          `Synthetics error: ${result.errors.map((e: any) => e.description).join(', ')}`
        );
      }
      return result?.monitor;
    }

    // Default: simple ping monitor
    let data = await this.query(
      `mutation($accountId: Int!, $monitor: SyntheticsCreateSimpleMonitorInput!) {
        syntheticsCreateSimpleMonitor(accountId: $accountId, monitor: $monitor) {
          monitor { guid name status period uri locations { public } }
          errors { description type }
        }
      }`,
      {
        accountId: Number.parseInt(this.accountId, 10),
        monitor: {
          name: params.name,
          uri: params.uri,
          period: params.period,
          status: params.status,
          locations: params.locations
        }
      }
    );
    let result = data?.syntheticsCreateSimpleMonitor;
    if (result?.errors?.length) {
      throw new Error(
        `Synthetics error: ${result.errors.map((e: any) => e.description).join(', ')}`
      );
    }
    return result?.monitor;
  }

  async deleteSyntheticMonitor(monitorGuid: string): Promise<any> {
    let data = await this.query(
      `mutation($guid: EntityGuid!) {
        syntheticsDeleteMonitor(guid: $guid) {
          deletedGuid
        }
      }`,
      { guid: monitorGuid }
    );

    return data?.syntheticsDeleteMonitor;
  }

  async createChangeTrackingMarker(params: {
    entityGuid: string;
    version?: string;
    changelog?: string;
    commit?: string;
    description?: string;
    deploymentType?: string;
    deepLink?: string;
    groupId?: string;
    user?: string;
    timestamp?: number;
  }): Promise<any> {
    let deploymentInput: any = {
      entityGuid: params.entityGuid,
      version: params.version || ''
    };
    if (params.changelog) deploymentInput.changelog = params.changelog;
    if (params.commit) deploymentInput.commit = params.commit;
    if (params.description) deploymentInput.description = params.description;
    if (params.deploymentType) deploymentInput.deploymentType = params.deploymentType;
    if (params.deepLink) deploymentInput.deepLink = params.deepLink;
    if (params.groupId) deploymentInput.groupId = params.groupId;
    if (params.user) deploymentInput.user = params.user;
    if (params.timestamp) deploymentInput.timestamp = params.timestamp;

    let data = await this.query(
      `mutation($deployment: ChangeTrackingDeploymentInput!) {
        changeTrackingCreateDeployment(deployment: $deployment) {
          deploymentId entityGuid version changelog commit description deploymentType deepLink groupId user timestamp
        }
      }`,
      { deployment: deploymentInput }
    );

    return data?.changeTrackingCreateDeployment;
  }

  async listAlertIssues(params?: {
    filter?: { states?: string[]; priorities?: string[] };
    cursor?: string;
  }): Promise<any> {
    let filterInput: any = {};
    if (params?.filter?.states) filterInput.states = params.filter.states;
    if (params?.filter?.priorities) filterInput.priorities = params.filter.priorities;

    let data = await this.query(
      `query($accountId: Int!, $cursor: String, $filter: AiIssuesFilterInput) {
        actor {
          account(id: $accountId) {
            aiIssues {
              issues(cursor: $cursor, filter: $filter) {
                issues {
                  issueId
                  title
                  state
                  priority
                  activatedAt
                  closedAt
                  acknowledgedAt
                  updatedAt
                  entityGuids
                  entityNames
                  conditionName
                  policyName
                  sources
                }
                nextCursor
              }
            }
          }
        }
      }`,
      {
        accountId: Number.parseInt(this.accountId, 10),
        cursor: params?.cursor,
        filter: Object.keys(filterInput).length > 0 ? filterInput : undefined
      }
    );

    return data?.actor?.account?.aiIssues?.issues;
  }
}

export class IngestClient {
  private region: Region;
  private accountId: string;
  private licenseKey: string;

  constructor(config: { region: Region; accountId: string; licenseKey: string }) {
    this.region = config.region;
    this.accountId = config.accountId;
    this.licenseKey = config.licenseKey;
  }

  async ingestMetrics(
    metrics: Array<{
      name: string;
      type: string;
      value: number;
      timestamp?: number;
      attributes?: Record<string, any>;
    }>
  ): Promise<any> {
    let http = createAxios({
      baseURL: getMetricIngestUrl(this.region),
      headers: {
        'Api-Key': this.licenseKey,
        'Content-Type': 'application/json'
      }
    });

    let payload = [
      {
        metrics: metrics.map(m => ({
          name: m.name,
          type: m.type,
          value: m.value,
          timestamp: m.timestamp || Math.floor(Date.now() / 1000),
          attributes: m.attributes || {}
        }))
      }
    ];

    let response = await http.post('', payload);
    return response.data;
  }

  async ingestEvents(events: Record<string, any>[]): Promise<any> {
    let http = createAxios({
      baseURL: getEventIngestUrl(this.region, this.accountId),
      headers: {
        'Api-Key': this.licenseKey,
        'Content-Type': 'application/json'
      }
    });

    let response = await http.post('', events);
    return response.data;
  }

  async ingestLogs(
    logs: Array<{
      message: string;
      timestamp?: number;
      attributes?: Record<string, any>;
    }>
  ): Promise<any> {
    let http = createAxios({
      baseURL: getLogIngestUrl(this.region),
      headers: {
        'Api-Key': this.licenseKey,
        'Content-Type': 'application/json'
      }
    });

    let payload = [
      {
        logs: logs.map(l => ({
          message: l.message,
          timestamp: l.timestamp || Date.now(),
          attributes: l.attributes || {}
        }))
      }
    ];

    let response = await http.post('', payload);
    return response.data;
  }

  async ingestTraces(
    spans: Array<{
      traceId: string;
      spanId: string;
      parentId?: string;
      serviceName: string;
      name: string;
      durationMs: number;
      timestamp?: number;
      attributes?: Record<string, any>;
    }>
  ): Promise<any> {
    let http = createAxios({
      baseURL: getTraceIngestUrl(this.region),
      headers: {
        'Api-Key': this.licenseKey,
        'Content-Type': 'application/json',
        'Data-Format': 'newrelic',
        'Data-Format-Version': '1'
      }
    });

    let payload = [
      {
        spans: spans.map(s => ({
          'trace.id': s.traceId,
          id: s.spanId,
          attributes: {
            'parent.id': s.parentId,
            'service.name': s.serviceName,
            name: s.name,
            'duration.ms': s.durationMs,
            timestamp: s.timestamp || Date.now(),
            ...(s.attributes || {})
          }
        }))
      }
    ];

    let response = await http.post('', payload);
    return response.data;
  }
}
