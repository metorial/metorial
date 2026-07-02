import { createAxios } from 'slates';

export interface ClientConfig {
  instanceUrl: string;
  authorizationHeader: string;
}

export class Client {
  private instanceUrl: string;
  private authorizationHeader: string;

  constructor(config: ClientConfig) {
    this.instanceUrl = config.instanceUrl.replace(/\/+$/, '');
    this.authorizationHeader = config.authorizationHeader;
  }

  private getAxios() {
    return createAxios({
      baseURL: this.instanceUrl,
      headers: {
        Authorization: this.authorizationHeader,
        'Content-Type': 'application/json'
      }
    });
  }

  async graphql<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
    let axios = this.getAxios();
    let response = await axios.post('/.api/graphql', {
      query,
      variables: variables || {}
    });

    if (response.data.errors && response.data.errors.length > 0) {
      let messages = response.data.errors.map((e: any) => e.message).join('; ');
      throw new Error(`GraphQL error: ${messages}`);
    }

    return response.data.data;
  }

  async streamSearch(
    query: string,
    options?: {
      version?: string;
      patternType?: string;
      maxMatchCount?: number;
    }
  ): Promise<any[]> {
    let axios = this.getAxios();
    let params: Record<string, string> = { q: query };
    if (options?.version) params.v = options.version;
    if (options?.patternType) params.t = options.patternType;
    if (options?.maxMatchCount) params.cm = String(options.maxMatchCount);

    let response = await axios.get('/.api/search/stream', {
      params,
      headers: {
        Accept: 'text/event-stream'
      },
      responseType: 'text'
    });

    return this.parseSSEEvents(response.data);
  }

  private parseSSEEvents(raw: string): any[] {
    let results: any[] = [];
    let lines = raw.split('\n');
    let currentEvent = '';
    let currentData = '';

    for (let line of lines) {
      if (line.startsWith('event:')) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        currentData += line.slice(5).trim();
      } else if (line === '' && currentEvent && currentData) {
        try {
          let parsed = JSON.parse(currentData);
          if (currentEvent === 'matches') {
            if (Array.isArray(parsed)) {
              results.push(...parsed);
            } else {
              results.push(parsed);
            }
          }
        } catch {
          // Skip unparseable data
        }
        currentEvent = '';
        currentData = '';
      }
    }

    return results;
  }

  // Repository operations

  async listRepositories(options?: {
    query?: string;
    first?: number;
    after?: string;
    cloneStatus?: string;
    orderBy?: string;
  }): Promise<any> {
    let args: string[] = [];
    if (options?.first) args.push(`first: ${options.first}`);
    if (options?.after) args.push(`after: "${options.after}"`);
    if (options?.cloneStatus) args.push(`cloneStatus: ${options.cloneStatus}`);
    if (options?.orderBy) args.push(`orderBy: ${options.orderBy}`);
    if (options?.query) args.push(`query: "${options.query}"`);

    let argsStr = args.length > 0 ? `(${args.join(', ')})` : '(first: 50)';

    return this.graphql(`
      query {
        repositories${argsStr} {
          nodes {
            id
            name
            url
            description
            createdAt
            mirrorInfo {
              cloneInProgress
              cloned
              lastError
              updatedAt
            }
            externalRepository {
              serviceType
              serviceID
            }
            defaultBranch {
              name
              target {
                oid
              }
            }
          }
          totalCount
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `);
  }

  async getRepository(name: string): Promise<any> {
    return this.graphql(
      `
      query($name: String!) {
        repository(name: $name) {
          id
          name
          url
          description
          createdAt
          mirrorInfo {
            cloneInProgress
            cloned
            lastError
            updatedAt
          }
          externalRepository {
            serviceType
            serviceID
          }
          defaultBranch {
            name
            target {
              oid
            }
          }
          branches {
            nodes {
              name
              target {
                oid
              }
            }
            totalCount
          }
          tags {
            nodes {
              name
              target {
                oid
              }
            }
            totalCount
          }
        }
      }
    `,
      { name }
    );
  }

  async getFileContent(repoName: string, filePath: string, revision?: string): Promise<any> {
    let rev = revision || 'HEAD';
    return this.graphql(
      `
      query($repoName: String!, $rev: String!, $filePath: String!) {
        repository(name: $repoName) {
          commit(rev: $rev) {
            blob(path: $filePath) {
              path
              content
              binary
              byteSize
            }
          }
        }
      }
    `,
      { repoName, rev, filePath }
    );
  }

  async listDirectoryContents(
    repoName: string,
    dirPath: string,
    revision?: string
  ): Promise<any> {
    let rev = revision || 'HEAD';
    return this.graphql(
      `
      query($repoName: String!, $rev: String!, $dirPath: String!) {
        repository(name: $repoName) {
          commit(rev: $rev) {
            tree(path: $dirPath) {
              entries {
                name
                path
                isDirectory
              }
            }
          }
        }
      }
    `,
      { repoName, rev, dirPath }
    );
  }

  async refreshRepository(repoName: string): Promise<any> {
    return this.graphql(
      `
      mutation($repo: ID!) {
        scheduleRepositoryPermissionsSync(repository: $repo) {
          alwaysNil
        }
      }
    `,
      { repo: repoName }
    );
  }

  // Search operations

  async graphqlSearch(
    query: string,
    options?: {
      patternType?: string;
      first?: number;
      after?: string;
    }
  ): Promise<any> {
    let searchArgs = [`query: $query`];
    if (options?.patternType) searchArgs.push(`patternType: ${options.patternType}`);

    let resultArgs: string[] = [];
    if (options?.first) resultArgs.push(`first: ${options.first}`);
    if (options?.after) resultArgs.push(`after: "${options.after}"`);

    let resultArgsStr = resultArgs.length > 0 ? `(${resultArgs.join(', ')})` : '';

    return this.graphql(
      `
      query($query: String!) {
        search(query: $query) {
          results${resultArgsStr} {
            matchCount
            limitHit
            approximateResultCount
            results {
              __typename
              ... on FileMatch {
                file {
                  name
                  path
                  url
                }
                repository {
                  name
                  url
                }
                lineMatches {
                  preview
                  lineNumber
                  offsetAndLengths
                }
              }
              ... on CommitSearchResult {
                url
                label {
                  text
                }
                detail {
                  text
                }
                matches {
                  url
                  body {
                    text
                  }
                }
              }
              ... on Repository {
                name
                url
                description
              }
            }
          }
        }
      }
    `,
      { query }
    );
  }

  // Batch Changes operations

  async listBatchChanges(options?: {
    first?: number;
    after?: string;
    namespace?: string;
    state?: string;
  }): Promise<any> {
    let args: string[] = [];
    if (options?.first) args.push(`first: ${options.first}`);
    if (options?.after) args.push(`after: "${options.after}"`);
    if (options?.namespace) args.push(`namespace: "${options.namespace}"`);
    if (options?.state) args.push(`state: ${options.state}`);

    let argsStr = args.length > 0 ? `(${args.join(', ')})` : '(first: 50)';

    return this.graphql(`
      query {
        batchChanges${argsStr} {
          nodes {
            id
            name
            description
            state
            url
            namespace {
              ... on User { username }
              ... on Org { name }
            }
            creator {
              username
            }
            createdAt
            updatedAt
            closedAt
            changesetsStats {
              total
              merged
              open
              closed
              unpublished
              draft
            }
          }
          totalCount
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `);
  }

  async getBatchChange(batchChangeId: string): Promise<any> {
    return this.graphql(
      `
      query($id: ID!) {
        node(id: $id) {
          ... on BatchChange {
            id
            name
            description
            state
            url
            namespace {
              ... on User { username }
              ... on Org { name }
            }
            creator {
              username
            }
            createdAt
            updatedAt
            closedAt
            changesetsStats {
              total
              merged
              open
              closed
              unpublished
              draft
            }
            changesets(first: 100) {
              nodes {
                id
                state
                externalID
                title
                body
                reviewState
                checkState
                repository {
                  name
                  url
                }
                externalURL {
                  url
                }
                createdAt
                updatedAt
              }
              totalCount
            }
          }
        }
      }
    `,
      { id: batchChangeId }
    );
  }

  async createBatchSpec(spec: string, namespace: string): Promise<any> {
    return this.graphql(
      `
      mutation($spec: String!, $namespace: ID!) {
        createBatchSpec(batchSpec: $spec, namespace: $namespace) {
          id
          state
          createdAt
        }
      }
    `,
      { spec, namespace }
    );
  }

  async applyBatchChange(batchSpecId: string): Promise<any> {
    return this.graphql(
      `
      mutation($batchSpec: ID!) {
        applyBatchChange(batchSpec: $batchSpec) {
          id
          name
          url
          state
        }
      }
    `,
      { batchSpec: batchSpecId }
    );
  }

  async closeBatchChange(
    batchChangeId: string,
    closeChangesets: boolean = false
  ): Promise<any> {
    return this.graphql(
      `
      mutation($batchChange: ID!, $closeChangesets: Boolean!) {
        closeBatchChange(batchChange: $batchChange, closeChangesets: $closeChangesets) {
          id
          name
          state
          closedAt
        }
      }
    `,
      { batchChange: batchChangeId, closeChangesets }
    );
  }

  async deleteBatchChange(batchChangeId: string): Promise<any> {
    return this.graphql(
      `
      mutation($batchChange: ID!) {
        deleteBatchChange(batchChange: $batchChange) {
          alwaysNil
        }
      }
    `,
      { batchChange: batchChangeId }
    );
  }

  // Code Insights operations

  async listInsightViews(options?: { first?: number; after?: string }): Promise<any> {
    let args: string[] = [];
    if (options?.first) args.push(`first: ${options.first}`);
    if (options?.after) args.push(`after: "${options.after}"`);

    let argsStr = args.length > 0 ? `(${args.join(', ')})` : '(first: 50)';

    return this.graphql(`
      query {
        insightViews${argsStr} {
          nodes {
            id
            title
            description
            defaultFilters {
              includeRepoRegex
              excludeRepoRegex
            }
            dataSeries {
              label
              points {
                dateTime
                value
              }
              status {
                totalPoints
                pendingJobs
                completedJobs
                failedJobs
              }
            }
          }
          totalCount
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `);
  }

  async createLineChartInsight(input: {
    title: string;
    dataSeries: Array<{
      query: string;
      label: string;
      repositoryScope?: { repositories: string[] };
      timeScope?: { stepInterval: string; stepValue: number };
      lineColor?: string;
    }>;
    dashboardIds?: string[];
  }): Promise<any> {
    return this.graphql(
      `
      mutation($input: LineChartSearchInsightInput!) {
        createLineChartSearchInsight(input: $input) {
          view {
            id
            title
            dataSeries {
              label
              points {
                dateTime
                value
              }
            }
          }
        }
      }
    `,
      { input }
    );
  }

  async updateLineChartInsight(
    insightViewId: string,
    input: {
      title?: string;
      dataSeries?: Array<{
        query?: string;
        label?: string;
        repositoryScope?: { repositories: string[] };
        timeScope?: { stepInterval: string; stepValue: number };
        lineColor?: string;
      }>;
    }
  ): Promise<any> {
    return this.graphql(
      `
      mutation($id: ID!, $input: UpdateLineChartSearchInsightInput!) {
        updateLineChartSearchInsight(id: $id, input: $input) {
          view {
            id
            title
            dataSeries {
              label
              points {
                dateTime
                value
              }
            }
          }
        }
      }
    `,
      { id: insightViewId, input }
    );
  }

  async deleteInsightView(insightViewId: string): Promise<any> {
    return this.graphql(
      `
      mutation($id: ID!) {
        deleteInsightView(id: $id) {
          alwaysNil
        }
      }
    `,
      { id: insightViewId }
    );
  }

  // Insights Dashboards

  async listInsightsDashboards(options?: { first?: number; after?: string }): Promise<any> {
    let args: string[] = [];
    if (options?.first) args.push(`first: ${options.first}`);
    if (options?.after) args.push(`after: "${options.after}"`);

    let argsStr = args.length > 0 ? `(${args.join(', ')})` : '(first: 50)';

    return this.graphql(`
      query {
        insightsDashboards${argsStr} {
          nodes {
            id
            title
            views {
              nodes {
                id
                title
              }
            }
            grants {
              users
              organizations
              global
            }
          }
          totalCount
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `);
  }

  async createInsightsDashboard(input: {
    title: string;
    grants: { users?: string[]; organizations?: string[]; global?: boolean };
  }): Promise<any> {
    return this.graphql(
      `
      mutation($input: CreateInsightsDashboardInput!) {
        createInsightsDashboard(input: $input) {
          dashboard {
            id
            title
          }
        }
      }
    `,
      { input }
    );
  }

  // Code Monitors operations

  async listCodeMonitors(options?: { first?: number; after?: string }): Promise<any> {
    let args: string[] = [];
    if (options?.first) args.push(`first: ${options.first}`);
    if (options?.after) args.push(`after: "${options.after}"`);

    let argsStr = args.length > 0 ? `(${args.join(', ')})` : '(first: 50)';

    return this.graphql(`
      query {
        currentUser {
          monitors${argsStr} {
            nodes {
              id
              description
              enabled
              owner {
                ... on User { username }
                ... on Org { name }
              }
              trigger {
                ... on MonitorQuery {
                  id
                  query
                }
              }
              actions {
                nodes {
                  ... on MonitorEmail {
                    id
                    enabled
                    recipients {
                      nodes {
                        ... on User { username }
                      }
                    }
                  }
                  ... on MonitorSlackWebhook {
                    id
                    enabled
                    url
                  }
                  ... on MonitorWebhook {
                    id
                    enabled
                    url
                  }
                }
              }
              createdAt
            }
            totalCount
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `);
  }

  async createCodeMonitor(input: {
    description: string;
    enabled: boolean;
    namespace: string;
    trigger: { query: string };
    actions: Array<{
      email?: { enabled: boolean; recipients: string[] };
      slackWebhook?: { enabled: boolean; url: string };
      webhook?: { enabled: boolean; url: string };
    }>;
  }): Promise<any> {
    return this.graphql(
      `
      mutation($monitor: MonitorInput!, $trigger: MonitorTriggerInput!, $actions: [MonitorActionInput!]!) {
        createCodeMonitor(monitor: $monitor, trigger: $trigger, actions: $actions) {
          id
          description
          enabled
          trigger {
            ... on MonitorQuery {
              id
              query
            }
          }
          actions {
            nodes {
              ... on MonitorEmail {
                id
                enabled
              }
              ... on MonitorSlackWebhook {
                id
                enabled
                url
              }
              ... on MonitorWebhook {
                id
                enabled
                url
              }
            }
          }
        }
      }
    `,
      {
        monitor: {
          namespace: input.namespace,
          description: input.description,
          enabled: input.enabled
        },
        trigger: { query: input.trigger.query },
        actions: input.actions
      }
    );
  }

  async deleteCodeMonitor(monitorId: string): Promise<any> {
    return this.graphql(
      `
      mutation($id: ID!) {
        deleteCodeMonitor(id: $id) {
          alwaysNil
        }
      }
    `,
      { id: monitorId }
    );
  }

  async toggleCodeMonitor(monitorId: string, enabled: boolean): Promise<any> {
    return this.graphql(
      `
      mutation($id: ID!, $update: MonitorEditInput!) {
        updateCodeMonitor(monitor: $id, update: $update) {
          id
          description
          enabled
        }
      }
    `,
      { id: monitorId, update: { enabled } }
    );
  }

  // User operations

  async getCurrentUser(): Promise<any> {
    return this.graphql(`
      query {
        currentUser {
          id
          username
          displayName
          email
          avatarURL
          siteAdmin
          organizations {
            nodes {
              id
              name
              displayName
            }
          }
        }
      }
    `);
  }

  async listUsers(options?: { first?: number; after?: string; query?: string }): Promise<any> {
    let args: string[] = [];
    if (options?.first) args.push(`first: ${options.first}`);
    if (options?.after) args.push(`after: "${options.after}"`);
    if (options?.query) args.push(`query: "${options.query}"`);

    let argsStr = args.length > 0 ? `(${args.join(', ')})` : '(first: 50)';

    return this.graphql(`
      query {
        users${argsStr} {
          nodes {
            id
            username
            displayName
            email
            siteAdmin
            createdAt
          }
          totalCount
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `);
  }

  // Outgoing webhooks (admin operations)

  async listOutgoingWebhooks(options?: {
    first?: number;
    after?: string;
    eventType?: string;
  }): Promise<any> {
    let args: string[] = [];
    if (options?.first) args.push(`first: ${options.first}`);
    if (options?.after) args.push(`after: "${options.after}"`);
    if (options?.eventType) args.push(`eventType: "${options.eventType}"`);

    let argsStr = args.length > 0 ? `(${args.join(', ')})` : '(first: 50)';

    return this.graphql(`
      query {
        outgoingWebhooks${argsStr} {
          nodes {
            id
            url
            eventTypes {
              eventType
            }
          }
          totalCount
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `);
  }

  async createOutgoingWebhook(input: {
    url: string;
    eventTypes: string[];
    secret?: string;
  }): Promise<any> {
    return this.graphql(
      `
      mutation($input: OutgoingWebhookInput!) {
        createOutgoingWebhook(input: $input) {
          id
          url
          eventTypes {
            eventType
          }
        }
      }
    `,
      {
        input: {
          url: input.url,
          eventTypes: input.eventTypes.map(et => ({ eventType: et })),
          secret: input.secret || ''
        }
      }
    );
  }

  async deleteOutgoingWebhook(webhookId: string): Promise<any> {
    return this.graphql(
      `
      mutation($id: ID!) {
        deleteOutgoingWebhook(id: $id) {
          alwaysNil
        }
      }
    `,
      { id: webhookId }
    );
  }

  // Search Contexts

  async listSearchContexts(options?: {
    first?: number;
    after?: string;
    query?: string;
  }): Promise<any> {
    let args: string[] = [];
    if (options?.first) args.push(`first: ${options.first}`);
    if (options?.after) args.push(`after: "${options.after}"`);
    if (options?.query) args.push(`query: "${options.query}"`);

    let argsStr = args.length > 0 ? `(${args.join(', ')})` : '(first: 50)';

    return this.graphql(`
      query {
        searchContexts${argsStr} {
          nodes {
            id
            name
            description
            public
            autoDefined
            namespace {
              ... on User { username }
              ... on Org { name }
            }
            repositories {
              repository {
                name
              }
              revisions
            }
            query
            updatedAt
          }
          totalCount
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `);
  }
}
