import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  requestAxios
} from 'slates';
import { z } from 'zod';
import * as native from './native';
import { fail, instanceUrl, pageSize, sudoUsername, text, token } from './validation';

export interface ClientConfig {
  instanceUrl: string;
  authorizationHeader: string;
  token?: string;
}
const PAGE = 'totalCount pageInfo { hasNextPage endCursor }';
const REPO =
  'id name url description createdAt mirrorInfo { cloned cloneInProgress lastError } externalRepository { serviceType } defaultBranch { name }';
const BATCH =
  'id name description state url namespace { ... on User { username } ... on Org { name } } creator { username } createdAt updatedAt closedAt changesetsStats { total merged open closed unpublished draft }';
const INSIGHT =
  'id presentation { ... on LineChartInsightViewPresentation { title } ... on PieChartInsightViewPresentation { title } } defaultFilters { includeRepoRegex excludeRepoRegex } dataSeries { label points { dateTime value } status { totalPoints pendingJobs completedJobs failedJobs } }';
const MONITOR = `id description enabled createdAt owner { id ... on User { username } ... on Org { name } } trigger { ... on MonitorQuery { query } } actions(first: 100) { nodes { __typename ... on MonitorEmail { id enabled includeResults priority header recipients(first: 100) { nodes { ... on User { id } ... on Org { id } } ${PAGE} } } ... on MonitorSlackWebhook { id enabled includeResults url } ... on MonitorWebhook { id enabled includeResults url } } ${PAGE} }`;
const errorsSchema = z.array(
  z.object({
    message: z.string(),
    locations: z
      .array(z.object({ line: z.number().int(), column: z.number().int() }))
      .optional(),
    path: z.array(z.union([z.string(), z.number().int()])).optional()
  })
);

export class Client {
  private readonly instanceUrl: string;
  private readonly authorizationHeader: string;
  private readonly secrets: string[];

  static forContext(ctx: {
    auth: { token: string; authorizationHeader: string; instanceUrl?: string };
    config: Record<string, unknown>;
  }) {
    return new Client({
      instanceUrl: instanceUrl(ctx.auth.instanceUrl ?? ctx.config.instanceUrl),
      authorizationHeader: ctx.auth.authorizationHeader,
      token: ctx.auth.token
    });
  }

  constructor(config: ClientConfig) {
    this.instanceUrl = instanceUrl(config.instanceUrl);
    const header = text(config.authorizationHeader, 'Authorization header');
    const plain = /^token ([A-Za-z0-9._~+/-]+)$/.exec(header);
    const sudo = /^token-sudo user="([^"\\,]+)",token="([A-Za-z0-9._~+/-]+)"$/.exec(header);
    if (sudo?.[1]) sudoUsername(sudo[1]);
    const credential = plain?.[1] ?? sudo?.[2];
    if (!credential || (config.token !== undefined && token(config.token) !== credential))
      throw fail(
        'Stored authorization does not match the token. Reconnect to the intended instance.'
      );
    this.authorizationHeader = header;
    this.secrets = [
      ...new Set(
        [credential, header].flatMap(secret => [
          secret,
          encodeURIComponent(secret),
          encodeURIComponent(secret).toLowerCase(),
          Buffer.from(secret).toString('base64'),
          Buffer.from(secret).toString('base64url'),
          Buffer.from(secret).toString('hex'),
          Buffer.from(secret).toString('hex').toUpperCase()
        ])
      )
    ];
  }

  private redact(value: string) {
    let safe = value;
    for (const secret of this.secrets.sort((a, b) => b.length - a.length))
      safe = safe.split(secret).join('[redacted]');
    return safe.slice(0, 2048);
  }

  private containsSecret(value: unknown, visited = new WeakSet<object>(), depth = 0): boolean {
    if (typeof value === 'string') return this.secrets.some(secret => value.includes(secret));
    if (!value || typeof value !== 'object') return false;
    if (depth > 24 || visited.has(value)) return false;
    visited.add(value);
    try {
      return Object.values(Object.getOwnPropertyDescriptors(value)).some(
        descriptor =>
          !('value' in descriptor) || this.containsSecret(descriptor.value, visited, depth + 1)
      );
    } catch {
      return true;
    }
  }

  private parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
    const result = schema.safeParse(value);
    if (!result.success)
      throw fail(
        'The deployment returned an unsupported or incomplete native response. Check its GraphQL console and feature permissions; a write may already have taken effect.',
        'invalid_upstream_response'
      );
    return result.data;
  }

  private async http(path: string, body?: unknown, params?: Record<string, string>) {
    if (this.containsSecret(body) || this.containsSecret(params))
      throw fail(
        'Request input contains these connection credentials. Remove them before retrying.',
        'credential_in_input'
      );
    const client = createAuthenticatedAxios({
      baseURL: this.instanceUrl,
      authHeader: { value: this.authorizationHeader },
      timeout: 60000,
      maxRedirects: 0,
      maxContentLength: 4 * 1024 * 1024,
      maxBodyLength: 128 * 1024
    });
    const response = await requestAxios<unknown>(
      'request',
      () =>
        body === undefined
          ? client.get(`${this.instanceUrl}${path}`, {
              params,
              headers: { Accept: 'text/event-stream' },
              responseType: 'text'
            })
          : client.post(`${this.instanceUrl}${path}`, body),
      error => {
        if (error instanceof ServiceError) return error;
        let status: number | undefined;
        try {
          const value = getApiErrorStatus(error);
          if (
            typeof value === 'number' &&
            Number.isInteger(value) &&
            value >= 100 &&
            value <= 599
          )
            status = value;
        } catch {
          /* Unreadable transport metadata is not retained. */
        }
        return buildApiServiceError(
          {},
          {
            providerLabel: 'Sourcegraph',
            operation: 'request',
            reason: 'upstream_request_failed',
            extractStatus: () => status,
            extractMessage: () =>
              'The request failed. Check the instance, token, deployment schema and feature permissions. If this was a write, read its native state before retrying.',
            parent: {}
          }
        );
      }
    );
    if (response.status !== 200)
      throw fail(
        'The deployment did not return a completed HTTP 200 response. Check native state before retrying a write.',
        'unexpected_status'
      );
    if (this.containsSecret(response.data))
      throw fail(
        'The response reflected connection credentials and cannot be returned. Check native state before retrying a write.',
        'credential_in_response'
      );
    return response.data;
  }

  async graphql<T extends z.ZodType>(
    query: string,
    variables: Record<string, unknown>,
    schema: T
  ): Promise<z.output<T>> {
    const body = await this.http('/.api/graphql', { query, variables });
    const envelope = this.parse(
      z.object({ data: z.unknown().optional(), errors: z.unknown().optional() }),
      body
    );
    if (envelope.errors !== undefined) {
      const errors = this.parse(errorsSchema, envelope.errors);
      if (errors.length) {
        const safe = errors.map(error => ({
          ...error,
          message: this.redact(error.message),
          path: error.path?.map(part => (typeof part === 'string' ? this.redact(part) : part))
        }));
        const error = fail(
          `GraphQL failed: ${safe.map(item => item.message).join('; ')} Check the deployment schema/permissions. Partial data is not treated as success; read native state before retrying a write.`,
          'graphql_error'
        );
        error.data.graphqlErrors = safe;
        throw error;
      }
    }
    return this.parse(schema, envelope.data);
  }

  async streamSearch(
    query: string,
    options: { patternType?: string; maxMatchCount?: number } = {}
  ) {
    text(query, 'Search query');
    const limit = options.maxMatchCount ?? 50;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000)
      throw fail('maxResults must be an integer from 1 to 1000.');
    // Legacy pattern modes are native deployment capabilities; explicit query filters take precedence.
    const raw = await this.http('/.api/search/stream', undefined, {
      q: query,
      v: 'V3',
      t: options.patternType ?? 'keyword',
      display: String(limit),
      cm: 'false'
    });
    if (typeof raw !== 'string' || Buffer.byteLength(raw) > 4 * 1024 * 1024)
      throw fail(
        'Search returned an invalid or oversized event stream.',
        'invalid_upstream_response'
      );
    const matches: native.NativeMatch[] = [];
    let matchCount: number | undefined;
    let searchDone = false;
    let terminal = false;
    const skipped: Array<{ reason: string; title?: string }> = [];
    const alerts: Array<{ title: string; description?: string }> = [];
    const blocks = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n\n');
    for (const block of blocks) {
      const lines = block.split('\n');
      const event = lines
        .find(line => line.startsWith('event:'))
        ?.slice(6)
        .trim();
      const data = lines
        .filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).replace(/^ /, ''))
        .join('\n');
      if (!event) continue;
      if (terminal)
        throw fail(
          'Search returned events after its terminal event.',
          'invalid_upstream_response'
        );
      let parsed: unknown;
      try {
        parsed = JSON.parse(data);
      } catch {
        throw fail('Search returned malformed event data.', 'invalid_upstream_response');
      }
      if (this.containsSecret(parsed))
        throw fail(
          'Search reflected connection credentials and cannot be returned.',
          'credential_in_response'
        );
      if (event === 'matches') matches.push(...this.parse(z.array(native.match), parsed));
      if (event === 'progress') {
        const progress = this.parse(
          z.object({
            done: z.boolean(),
            matchCount: z.number().int().nonnegative(),
            skipped: z
              .array(z.object({ reason: z.string(), title: z.string().optional() }))
              .optional()
          }),
          parsed
        );
        matchCount = progress.matchCount;
        searchDone = progress.done;
        if (progress.skipped) skipped.splice(0, skipped.length, ...progress.skipped);
      }
      if (event === 'alert')
        alerts.push(
          this.parse(
            z.object({ title: z.string(), description: z.string().optional() }),
            parsed
          )
        );
      if (event === 'error')
        throw fail(
          'Search reported an upstream error; narrow the query and check deployment support.',
          'search_error'
        );
      if (event === 'done') terminal = true;
    }
    if (!terminal || !searchDone || matchCount === undefined)
      throw fail(
        'Search ended before a confirmed final progress and terminal event. Retry with a narrower query.',
        'incomplete_search'
      );
    return {
      matches: matches.slice(0, limit),
      matchCount,
      returnedCount: Math.min(matches.length, limit),
      skipped,
      alerts,
      truncated:
        matches.length > limit ||
        skipped.some(item => /limit|timeout/.test(item.reason)) ||
        matchCount > limit
    };
  }

  listRepositories(options: { query?: string; first?: number; after?: string } = {}) {
    return this.graphql(
      `query Repositories($first: Int!, $after: String, $query: String) { repositories(first: $first, after: $after, query: $query) { nodes { ${REPO} } ${PAGE} } }`,
      {
        first: pageSize(options.first),
        after: options.after === undefined ? undefined : text(options.after, 'Cursor'),
        query:
          options.query === undefined
            ? undefined
            : text(options.query, 'Repository query', true)
      },
      z.object({ repositories: native.connection(native.repository) })
    );
  }

  async getRepository(name: string) {
    const result = await this.graphql(
      `query Repository($name: String!) { repository(name: $name) { ${REPO} branches(first: 100) { nodes { name target { oid } } ${PAGE} } tags(first: 100) { nodes { name target { oid } } ${PAGE} } } }`,
      { name: text(name, 'Repository name') },
      z.object({ repository: native.repository.nullable() })
    );
    if (!result.repository)
      throw fail('Repository was not found or is not visible to this user.', 'not_found');
    if (result.repository.name !== name)
      throw fail(
        'The repository receipt does not match the requested name.',
        'invalid_upstream_response'
      );
    return result;
  }

  async getFileContent(name: string, path: string, revision?: string) {
    const result = await this.graphql(
      'query File($name: String!, $path: String!, $rev: String!) { repository(name: $name) { name commit(rev: $rev) { oid blob(path: $path) { path content binary byteSize } } } }',
      {
        name: text(name, 'Repository name'),
        path: text(path, 'File path', true),
        rev: revision === undefined ? 'HEAD' : text(revision, 'Revision')
      },
      z.object({
        repository: z
          .object({
            name: z.string(),
            commit: z.object({ oid: z.string(), blob: native.blob.nullable() }).nullable()
          })
          .nullable()
      })
    );
    this.confirmRevision(revision, result.repository?.commit?.oid);
    return result;
  }

  async listDirectoryContents(name: string, path: string, revision?: string) {
    const result = await this.graphql(
      'query Directory($name: String!, $path: String!, $rev: String!) { repository(name: $name) { name commit(rev: $rev) { oid tree(path: $path) { path entries(first: 1001) { name path isDirectory } } } } }',
      {
        name: text(name, 'Repository name'),
        path: text(path, 'Directory path', true),
        rev: revision === undefined ? 'HEAD' : text(revision, 'Revision')
      },
      z.object({
        repository: z
          .object({
            name: z.string(),
            commit: z.object({ oid: z.string(), tree: native.tree.nullable() }).nullable()
          })
          .nullable()
      })
    );
    this.confirmRevision(revision, result.repository?.commit?.oid);
    return result;
  }

  private confirmRevision(requested: string | undefined, received: string | undefined) {
    if (
      requested !== undefined &&
      /^[a-f0-9]{40}$/i.test(requested) &&
      received !== undefined &&
      received.toLowerCase() !== requested.toLowerCase()
    )
      throw fail(
        'The returned commit does not match the requested immutable revision.',
        'invalid_upstream_response'
      );
  }

  listBatchChanges(
    options: { state?: 'OPEN' | 'CLOSED' | 'DRAFT'; first?: number; after?: string } = {}
  ) {
    return this.graphql(
      `query BatchChanges($first: Int!, $after: String, $state: BatchChangeState) { batchChanges(first: $first, after: $after, state: $state) { nodes { ${BATCH} } ${PAGE} } }`,
      {
        first: pageSize(options.first),
        after: options.after === undefined ? undefined : text(options.after, 'Cursor'),
        state: options.state
      },
      z.object({ batchChanges: native.connection(native.batch) })
    );
  }

  async getBatchChange(id: string, first?: number, after?: string) {
    const result = await this.graphql(
      `query BatchChange($id: ID!, $first: Int!, $after: String) { node(id: $id) { __typename ... on BatchChange { ${BATCH} changesets(first: $first, after: $after) { nodes { id state createdAt updatedAt ... on ExternalChangeset { externalID title body reviewState checkState repository { name } externalURL { url } } } ${PAGE} } } } }`,
      {
        id: text(id, 'Batch change ID'),
        first: pageSize(first),
        after: after === undefined ? undefined : text(after, 'Changeset cursor')
      },
      z.object({
        node: native.batch.extend({ __typename: z.literal('BatchChange') }).nullable()
      })
    );
    if (!result.node) throw fail('Batch change was not found or is not visible.', 'not_found');
    if (result.node.id !== id)
      throw fail(
        'Batch change receipt does not match the requested ID.',
        'invalid_upstream_response'
      );
    return result;
  }

  async closeBatchChange(id: string, closeChangesets: boolean) {
    const result = await this.graphql(
      'mutation CloseBatchChange($id: ID!, $close: Boolean!) { closeBatchChange(batchChange: $id, closeChangesets: $close) { id name state closedAt } }',
      { id: text(id, 'Batch change ID'), close: closeChangesets },
      z.object({ closeBatchChange: native.batch })
    );
    if (result.closeBatchChange.id !== id || result.closeBatchChange.state !== 'CLOSED')
      throw fail(
        'Closing returned an unconfirmed receipt. Read this batch change before retrying.',
        'invalid_upstream_response'
      );
    return result;
  }

  async listInsightViews(options: { first?: number; after?: string } = {}) {
    const result = await this.graphql(
      `query Insights($first: Int!, $after: String) { insightViews(first: $first, after: $after) { nodes { ${INSIGHT} } ${PAGE} } }`,
      {
        first: pageSize(options.first),
        after: options.after === undefined ? undefined : text(options.after, 'Cursor')
      },
      z.object({
        insightViews: z.object({
          nodes: z.array(native.insight.nullable()),
          totalCount: z.number().int().nonnegative().nullish(),
          pageInfo: native.pageInfo
        })
      })
    );
    return {
      insightViews: {
        ...result.insightViews,
        totalCount: result.insightViews.totalCount ?? undefined,
        nodes: result.insightViews.nodes
          .filter((item): item is NonNullable<typeof item> => item !== null)
          .map(view => ({ ...view, title: view.presentation.title }))
      }
    };
  }

  async createLineChartInsight(input: {
    title: string;
    dataSeries: Array<{
      query: string;
      label: string;
      repositories?: string[];
      stepInterval?: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
      stepValue?: number;
      lineColor?: string;
    }>;
    dashboardIds?: string[];
  }) {
    text(input.title, 'Insight title');
    if (!input.dataSeries.length || input.dataSeries.length > 20)
      throw fail(
        'Provide 1 to 20 insight series. Creation schedules historical searches and persists their results.'
      );
    const variables = {
      input: {
        options: { title: input.title },
        dashboards: input.dashboardIds?.map(id => text(id, 'Dashboard ID')),
        dataSeries: input.dataSeries.map(series => {
          text(series.query, 'Series query');
          text(series.label, 'Series label');
          if (series.stepValue !== undefined && series.stepInterval === undefined)
            throw fail('stepValue requires stepInterval.');
          if (
            series.stepValue !== undefined &&
            (!Number.isSafeInteger(series.stepValue) || series.stepValue < 1)
          )
            throw fail('stepValue must be a positive integer.');
          if (series.lineColor !== undefined && !/^#[0-9a-fA-F]{6}$/.test(series.lineColor))
            throw fail('lineColor must be a six-digit hex color, such as #6495ED.');
          return {
            query: series.query,
            options: { label: series.label, lineColor: series.lineColor },
            repositoryScope:
              series.repositories === undefined
                ? undefined
                : {
                    repositories: series.repositories.map(name =>
                      text(name, 'Repository name')
                    )
                  },
            timeScope:
              series.stepInterval === undefined
                ? undefined
                : { stepInterval: { unit: series.stepInterval, value: series.stepValue ?? 1 } }
          };
        })
      }
    };
    const result = await this.graphql(
      `mutation CreateInsight($input: LineChartSearchInsightInput!) { createLineChartSearchInsight(input: $input) { view { ${INSIGHT} } } }`,
      variables,
      z.object({ createLineChartSearchInsight: z.object({ view: native.insight }) })
    );
    const view = result.createLineChartSearchInsight.view;
    if (
      view.presentation.title !== input.title ||
      view.dataSeries.length !== input.dataSeries.length ||
      view.dataSeries.some((series, index) => series.label !== input.dataSeries[index]?.label)
    )
      throw fail(
        'Insight creation returned an unexpected receipt. Read the native insight before retrying; its backfill may already be scheduled.',
        'invalid_upstream_response'
      );
    return {
      createLineChartSearchInsight: { view: { ...view, title: view.presentation.title } }
    };
  }

  async deleteInsightView(id: string) {
    return this.graphql(
      'mutation DeleteInsight($id: ID!) { deleteInsightView(id: $id) { alwaysNil } }',
      { id: text(id, 'Insight ID') },
      z.object({ deleteInsightView: z.object({ alwaysNil: z.null() }) })
    );
  }

  async listCodeMonitors(options: { first?: number; after?: string } = {}) {
    const result = await this.graphql(
      `query Monitors($first: Int!, $after: String) { currentUser { monitors(first: $first, after: $after) { nodes { ${MONITOR} } ${PAGE} } } }`,
      {
        first: pageSize(options.first),
        after: options.after === undefined ? undefined : text(options.after, 'Cursor')
      },
      z.object({
        currentUser: z.object({ monitors: native.connection(native.monitor) }).nullable()
      })
    );
    if (!result.currentUser)
      throw fail('A current user is required to list monitors.', 'not_authenticated');
    return { currentUser: result.currentUser };
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
  }) {
    text(input.description, 'Monitor description');
    text(input.namespace, 'Owner ID');
    text(input.trigger.query, 'Monitor query');
    if (!/(^|\s)type:(diff|commit)(?=\s|$)/.test(input.trigger.query))
      throw fail('Monitor queries must include a native type:diff or type:commit filter.');
    if (!input.actions.length)
      throw fail('Specify at least one email, Slack or webhook action.');
    const actions = input.actions.map(action =>
      action.email
        ? {
            email: {
              ...action.email,
              recipients: action.email.recipients.map(id => text(id, 'Recipient ID')),
              includeResults: false,
              priority: 'NORMAL',
              header: ''
            }
          }
        : action.slackWebhook
          ? { slackWebhook: { ...action.slackWebhook, includeResults: false } }
          : { webhook: { ...action.webhook, includeResults: false } }
    );
    const result = await this.graphql(
      `mutation CreateMonitor($monitor: MonitorInput!, $trigger: MonitorTriggerInput!, $actions: [MonitorActionInput!]!) { createCodeMonitor(monitor: $monitor, trigger: $trigger, actions: $actions) { ${MONITOR} } }`,
      {
        monitor: {
          namespace: input.namespace,
          description: input.description,
          enabled: input.enabled
        },
        trigger: input.trigger,
        actions
      },
      z.object({ createCodeMonitor: native.monitor })
    );
    const value = result.createCodeMonitor;
    if (
      value.description !== input.description ||
      value.enabled !== input.enabled ||
      value.trigger.query !== input.trigger.query ||
      value.owner?.id !== input.namespace ||
      !value.actions ||
      value.actions.totalCount !== actions.length ||
      value.actions.nodes.length !== actions.length ||
      value.actions.pageInfo.hasNextPage
    )
      throw fail(
        'Monitor creation returned an unexpected receipt. Check its native actions/state before retrying; notifications may already be enabled.',
        'invalid_upstream_response'
      );
    for (const requested of input.actions) {
      const kind = requested.email
        ? 'MonitorEmail'
        : requested.slackWebhook
          ? 'MonitorSlackWebhook'
          : 'MonitorWebhook';
      const action = value.actions.nodes.find(action => action.__typename === kind);
      const requestUrl = requested.slackWebhook?.url ?? requested.webhook?.url;
      if (
        !action?.enabled ||
        action.includeResults !== false ||
        (requestUrl !== undefined && action.url !== requestUrl)
      )
        throw fail(
          'Monitor action receipt differs from the requested destination or snippet policy. Inspect the created monitor before retrying.',
          'invalid_upstream_response'
        );
      if (requested.email) {
        const recipients = action.recipients;
        if (
          !recipients ||
          recipients.pageInfo.hasNextPage ||
          recipients.totalCount !== requested.email.recipients.length ||
          recipients.nodes.length !== requested.email.recipients.length ||
          recipients.nodes.some(
            recipient => !requested.email?.recipients.includes(recipient.id)
          ) ||
          action.priority !== 'NORMAL' ||
          action.header !== ''
        )
          throw fail(
            'Email action recipients or delivery options were not confirmed. Inspect the created monitor before retrying.',
            'invalid_upstream_response'
          );
      }
    }
    return result;
  }

  deleteCodeMonitor(id: string) {
    return this.graphql(
      'mutation DeleteMonitor($id: ID!) { deleteCodeMonitor(id: $id) { alwaysNil } }',
      { id: text(id, 'Monitor ID') },
      z.object({ deleteCodeMonitor: z.object({ alwaysNil: z.null() }) })
    );
  }

  async getCurrentUser() {
    const result = await this.graphql(
      'query CurrentUser { currentUser { id username displayName primaryEmail { email } avatarURL siteAdmin organizations { nodes { id name displayName } totalCount } } }',
      {},
      z.object({ currentUser: native.user.nullable() })
    );
    if (!result.currentUser)
      throw fail('The token does not resolve to an authenticated user.', 'not_authenticated');
    return {
      currentUser: { ...result.currentUser, email: result.currentUser.primaryEmail?.email }
    };
  }
}
