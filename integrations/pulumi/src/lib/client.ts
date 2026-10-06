import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  getResponseHeaderValue,
  isApiErrorRecord,
  pickDefined,
  requestAxiosData
} from 'slates';
import { z } from 'zod';
import {
  accessTokenResponse,
  auditEventResponse,
  deploymentResponse,
  environmentResponse,
  memberResponse,
  policyPackResponse,
  stackResponse,
  stackSummaryResponse,
  updateResponse,
  userResponse,
  webhookResponse
} from './schemas';

export const required = (value: string | undefined, label: string): string => {
  if (!value?.trim())
    throw createApiServiceError(`${label} is required.`, { reason: 'invalid_input' });
  return value;
};
export const organization = (input: string | undefined, fallback: string | undefined) =>
  required(input ?? fallback, 'Organization; call get_current_user to discover memberships');
export const apiBaseUrl = (value = 'https://api.pulumi.com'): string => {
  try {
    const url = new URL(value);
    if (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === '/'
    )
      return url.origin;
  } catch {
    /* Invalid URLs receive the same actionable validation error. */
  }
  throw createApiServiceError(
    'Pulumi API base URL must be an HTTPS origin without credentials, path, query or fragment.',
    { reason: 'invalid_input' }
  );
};
export const connectionApiBaseUrl = (
  auth: { baseUrl?: string },
  legacyConfig?: unknown
): string =>
  apiBaseUrl(
    auth.baseUrl ??
      (isApiErrorRecord(legacyConfig) && typeof legacyConfig.baseUrl === 'string'
        ? legacyConfig.baseUrl
        : undefined)
  );
const segment = (value: string) => {
  required(value, 'Resource identifier');
  if (value === '.' || value === '..')
    throw createApiServiceError('Resource identifier cannot be a relative path segment.', {
      reason: 'invalid_input'
    });
  try {
    return encodeURIComponent(value);
  } catch {
    throw createApiServiceError('Resource identifier contains invalid Unicode.', {
      reason: 'invalid_input'
    });
  }
};
const stackPath = (org: string, project: string, stack?: string) =>
  `/api/stacks/${segment(org)}/${segment(project)}${stack === undefined ? '' : `/${segment(stack)}`}`;
const environmentPath = (org: string, project: string, environment: string) =>
  `/api/esc/environments/${segment(org)}/${segment(project)}/${segment(environment)}`;
const decode = <T>(value: unknown, schema: z.ZodType<T>, operation: string): T => {
  const result = schema.safeParse(value);
  if (!result.success)
    throw createApiServiceError(`Pulumi returned an invalid response for ${operation}.`, {
      reason: 'invalid_response'
    });
  return result.data;
};
const positiveInteger = (value: number | undefined, label: string, max?: number) => {
  if (
    value !== undefined &&
    (!Number.isInteger(value) || value < 1 || (max !== undefined && value > max))
  )
    throw createApiServiceError(
      `${label} must be a positive integer${max ? ` no greater than ${max}` : ''}.`,
      { reason: 'invalid_input' }
    );
};
const continuation = z.string().nullish();
export type WebhookBody = {
  active: boolean;
  displayName: string;
  payloadUrl: string;
  format?: string;
  filters?: string[];
  secret?: string;
  name?: string;
};

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  readonly baseUrl: string;
  constructor(private options: { token: string; baseUrl?: string }) {
    required(options.token, 'Pulumi access token');
    this.baseUrl = apiBaseUrl(options.baseUrl);
    this.http = createAuthenticatedAxios({
      baseURL: this.baseUrl,
      authHeader: { value: `token ${options.token}` },
      headers: { Accept: 'application/vnd.pulumi+8', 'Content-Type': 'application/json' },
      timeout: 30000,
      maxRedirects: 0,
      validateStatus: () => true
    });
  }
  private async request(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    query?: Record<string, unknown>,
    status = 200,
    headers?: Record<string, string>
  ): Promise<unknown> {
    const operation = `${method} ${path}`;
    const redact = (message: string) => {
      let safe = message.split(this.options.token).join('[redacted]');
      if (isApiErrorRecord(body) && typeof body.secret === 'string' && body.secret)
        safe = safe.split(body.secret).join('[redacted]');
      return safe.replace(/pul-[A-Za-z0-9._-]+/g, '[redacted token]');
    };
    const adapt = (error: unknown) =>
      buildApiServiceError(error, {
        providerLabel: 'Pulumi',
        reason: 'pulumi_api_error',
        operation,
        parent: createApiServiceError('The upstream Pulumi request failed.', {
          upstreamStatus: getApiErrorStatus(error)
        }),
        formatMessage: ({ status, message }) =>
          `Pulumi API ${operation} failed${status === undefined ? '' : ` (HTTP ${status})`}: ${redact(message)}`,
        extractMessage: (failure, helpers) =>
          path.startsWith('/api/esc/')
            ? 'Environment operation failed; inspect the definition and permissions in Pulumi Cloud.'
            : redact(
                helpers.extractMessage(failure, {
                  nestedKeys: ['error'],
                  detailKeys: ['message', 'detail']
                })
              ),
        extractUpstreamCode: (_failure, response) =>
          !path.startsWith('/api/esc/') &&
          isApiErrorRecord(response?.data) &&
          (typeof response.data.code === 'string' || typeof response.data.code === 'number')
            ? redact(String(response.data.code))
            : undefined
      });
    return requestAxiosData(
      operation,
      async () => {
        const response = await this.http.request<unknown>({
          method,
          url: path,
          data: body,
          params: pickDefined(query ?? {}),
          responseType: headers?.Accept === 'application/x-yaml' ? 'text' : undefined,
          headers
        });
        if (response.status < 200 || response.status >= 300) {
          const error = adapt({ response });
          const retryAfter = getResponseHeaderValue(response.headers, 'retry-after');
          if (
            retryAfter &&
            /^(?:\d+(?:\.\d+)?|[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT)$/.test(
              retryAfter
            )
          )
            error.data.retryAfter = retryAfter;
          throw error;
        }
        if (response.status !== status)
          throw createApiServiceError(
            `Pulumi did not confirm ${operation} with HTTP ${status}.`,
            { reason: 'invalid_response', upstreamStatus: response.status }
          );
        return response;
      },
      adapt
    );
  }
  private async cursorPages<T>(
    path: string,
    item: z.ZodType<T>,
    collection: string,
    tokenKey: string,
    query: Record<string, unknown> = {},
    onePage = false
  ): Promise<{ items: T[]; nextToken?: string }> {
    const items: T[] = [];
    const seen = new Set<string>();
    let token =
      typeof query.continuationToken === 'string'
        ? required(query.continuationToken, 'Continuation token')
        : undefined;
    for (let page = 0; page < 100; page++) {
      const result = decode(
        await this.request('GET', path, undefined, { ...query, continuationToken: token }),
        z.record(z.string(), z.unknown()),
        path
      );
      const values = decode(result[collection], z.array(item), path);
      const next = decode(result[tokenKey], continuation, path);
      items.push(...values);
      const nextToken = typeof next === 'string' && next ? next : undefined;
      if (nextToken && (nextToken === token || seen.has(nextToken)))
        throw createApiServiceError('Pulumi repeated a continuation token.', {
          reason: 'invalid_response'
        });
      if (onePage || !nextToken) return { items, nextToken };
      seen.add(nextToken);
      token = nextToken;
    }
    throw createApiServiceError(
      'Pulumi listing exceeded 100 pages. Request a page with continuationToken or maxResults.',
      { reason: 'pagination_limit' }
    );
  }
  async getCurrentUser() {
    return decode(await this.request('GET', '/api/user'), userResponse, 'current user');
  }
  async listStacks(
    params: {
      organization?: string;
      project?: string;
      tagName?: string;
      tagValue?: string;
      continuationToken?: string;
      maxResults?: number;
    } = {}
  ) {
    if (params.tagValue !== undefined && params.tagName === undefined)
      throw createApiServiceError('tagName is required with tagValue.', {
        reason: 'invalid_input'
      });
    positiveInteger(params.maxResults, 'maxResults');
    const result = await this.cursorPages(
      '/api/user/stacks',
      stackSummaryResponse,
      'stacks',
      'continuationToken',
      params,
      params.continuationToken !== undefined || params.maxResults !== undefined
    );
    return { stacks: result.items, continuationToken: result.nextToken };
  }
  async getStack(org: string, project: string, stack: string) {
    const result = decode(
      await this.request('GET', stackPath(org, project, stack)),
      stackResponse,
      'stack'
    );
    if (result.orgName !== org || result.projectName !== project || result.stackName !== stack)
      throw createApiServiceError('Pulumi returned a different stack than requested.', {
        reason: 'invalid_response'
      });
    return result;
  }
  async createStack(org: string, project: string, stackName: string) {
    required(stackName, 'Stack name');
    return decode(
      await this.request('POST', stackPath(org, project), { stackName }),
      z.object({ messages: z.array(z.unknown()).optional() }),
      'create stack'
    );
  }
  async deleteStack(org: string, project: string, stack: string, force?: boolean) {
    await this.request('DELETE', stackPath(org, project, stack), undefined, { force }, 204);
  }
  async getStackExport(org: string, project: string, stack: string) {
    return decode(
      await this.request('GET', `${stackPath(org, project, stack)}/export`),
      z.record(z.string(), z.unknown()),
      'stack state'
    );
  }
  async getStackOutputs(org: string, project: string, stack: string) {
    return decode(
      await this.request('GET', `${stackPath(org, project, stack)}/outputs`),
      z.object({ outputs: z.record(z.string(), z.unknown()).optional() }),
      'stack outputs'
    );
  }
  async setStackTag(org: string, project: string, stack: string, name: string, value: string) {
    required(name, 'Tag name');
    await this.request(
      'POST',
      `${stackPath(org, project, stack)}/tags`,
      { name, value },
      undefined,
      204
    );
  }
  async deleteStackTag(org: string, project: string, stack: string, tagName: string) {
    await this.request(
      'DELETE',
      `${stackPath(org, project, stack)}/tags/${segment(tagName)}`,
      undefined,
      undefined,
      204
    );
  }
  async listStackUpdates(
    org: string,
    project: string,
    stack: string,
    params: { page?: number; pageSize?: number } = {}
  ) {
    if (params.page !== undefined && (!Number.isInteger(params.page) || params.page < 0))
      throw createApiServiceError(
        'Update page must be a nonnegative integer; 0 retrieves all history.',
        { reason: 'invalid_input' }
      );
    if (
      params.pageSize !== undefined &&
      (!Number.isInteger(params.pageSize) || params.pageSize < 0)
    )
      throw createApiServiceError('Update pageSize must be a nonnegative integer.', {
        reason: 'invalid_input'
      });
    return decode(
      await this.request('GET', `${stackPath(org, project, stack)}/updates`, undefined, {
        page: params.page ?? (params.pageSize ? 1 : 0),
        pageSize: params.pageSize
      }),
      z.object({ updates: z.array(updateResponse) }),
      'stack history'
    );
  }
  async createDeployment(
    org: string,
    project: string,
    stack: string,
    body: { operation: string; inheritSettings?: boolean }
  ) {
    return decode(
      await this.request(
        'POST',
        `${stackPath(org, project, stack)}/deployments`,
        body,
        undefined,
        202
      ),
      z.object({
        id: z.string().min(1),
        version: z.number(),
        consoleUrl: z.string().optional()
      }),
      'create deployment'
    );
  }
  async getDeployment(org: string, project: string, stack: string, deploymentId: string) {
    const result = decode(
      await this.request(
        'GET',
        `${stackPath(org, project, stack)}/deployments/${segment(deploymentId)}`
      ),
      deploymentResponse,
      'deployment'
    );
    if (result.id !== deploymentId)
      throw createApiServiceError('Pulumi returned a different deployment than requested.', {
        reason: 'invalid_response'
      });
    return result;
  }
  private async deployments(
    path: string,
    params: { page?: number; pageSize?: number; status?: string } = {}
  ) {
    positiveInteger(params.page, 'Deployment page');
    positiveInteger(params.pageSize, 'Deployment pageSize', 100);
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;
    const result = decode(
      await this.request('GET', path, undefined, { page, pageSize }),
      z.object({
        deployments: z.array(deploymentResponse),
        total: z.number().optional(),
        itemsPerPage: z.number().optional()
      }),
      'deployments'
    );
    return {
      ...result,
      deployments:
        params.status === undefined
          ? result.deployments
          : result.deployments.filter(value => value.status === params.status),
      page,
      pageSize
    };
  }
  async listDeployments(
    org: string,
    project: string,
    stack: string,
    params?: { page?: number; pageSize?: number; status?: string }
  ) {
    return this.deployments(`${stackPath(org, project, stack)}/deployments`, params);
  }
  async listOrgDeployments(
    org: string,
    params?: { page?: number; pageSize?: number; status?: string }
  ) {
    return this.deployments(`/api/orgs/${segment(org)}/deployments`, params);
  }
  async cancelDeployment(org: string, project: string, stack: string, deploymentId: string) {
    await this.request(
      'POST',
      `${stackPath(org, project, stack)}/deployments/${segment(deploymentId)}/cancel`,
      {}
    );
  }
  async getDeploymentLogs(org: string, project: string, stack: string, deploymentId: string) {
    const path = `${stackPath(org, project, stack)}/deployments/${segment(deploymentId)}/logs`;
    const schema = z.object({
      __type: z.literal('DeploymentLogs'),
      lines: z
        .array(
          z.object({
            line: z.string().optional(),
            timestamp: z.string().optional(),
            header: z.string().optional()
          })
        )
        .optional(),
      nextToken: continuation
    });
    const lines: Array<{ line?: string; timestamp?: string; header?: string }> = [];
    const seen = new Set<string>();
    let continuationToken: string | undefined;
    for (let page = 0; page < 100; page++) {
      const result = decode(
        await this.request('GET', path, undefined, { continuationToken }),
        schema,
        'deployment logs'
      );
      lines.push(...(result.lines ?? []));
      const next = result.nextToken || undefined;
      if (!next) return { lines };
      if (next === continuationToken || seen.has(next))
        throw createApiServiceError('Pulumi repeated a deployment-log continuation token.', {
          reason: 'invalid_response'
        });
      seen.add(next);
      continuationToken = next;
    }
    throw createApiServiceError(
      'Deployment logs exceeded 100 pages; retrieve a narrower deployment log stream in Pulumi Cloud.',
      { reason: 'pagination_limit' }
    );
  }
  async getDeploymentSettings(org: string, project: string, stack: string) {
    return decode(
      await this.request('GET', `${stackPath(org, project, stack)}/deployments/settings`),
      z.record(z.string(), z.unknown()),
      'deployment settings'
    );
  }
  async listEnvironments(org: string, continuationToken?: string, maxResults?: number) {
    positiveInteger(maxResults, 'maxResults');
    const result = await this.cursorPages(
      `/api/esc/environments/${segment(org)}`,
      environmentResponse,
      'environments',
      'nextToken',
      { continuationToken, maxResults },
      continuationToken !== undefined || maxResults !== undefined
    );
    return { environments: result.items, nextToken: result.nextToken };
  }
  async createEnvironment(org: string, project: string, environment: string) {
    await this.request('POST', `/api/esc/environments/${segment(org)}`, {
      project: required(project, 'ESC project'),
      name: required(environment, 'Environment name')
    });
  }
  environmentUrl(org: string, project: string, environment: string) {
    return `${this.baseUrl}${environmentPath(org, project, environment)}`;
  }
  async getEnvironment(org: string, project: string, environment: string) {
    return decode(
      await this.request(
        'GET',
        environmentPath(org, project, environment),
        undefined,
        undefined,
        200,
        { Accept: 'application/x-yaml' }
      ),
      z.string(),
      'environment definition'
    );
  }
  async updateEnvironment(org: string, project: string, environment: string, yaml: string) {
    const result = decode(
      await this.request(
        'PATCH',
        environmentPath(org, project, environment),
        required(yaml, 'YAML definition'),
        undefined,
        200,
        { 'Content-Type': 'application/x-yaml' }
      ),
      z.object({ diagnostics: z.array(z.unknown()).optional() }),
      'environment update'
    );
    if (
      result.diagnostics?.some(
        diagnostic => !isApiErrorRecord(diagnostic) || diagnostic.severity !== 'warning'
      )
    )
      throw createApiServiceError(
        'Pulumi returned environment diagnostics. The definition was not confirmed; inspect it in Pulumi Cloud.',
        { reason: 'environment_diagnostics' }
      );
  }
  async deleteEnvironment(org: string, project: string, environment: string) {
    await this.request('DELETE', environmentPath(org, project, environment));
  }
  async openEnvironment(org: string, project: string, environment: string, duration?: string) {
    const result = decode(
      await this.request(
        'POST',
        `${environmentPath(org, project, environment)}/open`,
        {},
        { duration }
      ),
      z.object({ id: z.string().min(1), diagnostics: z.array(z.unknown()).optional() }),
      'open environment'
    );
    if (
      result.diagnostics?.some(
        diagnostic => !isApiErrorRecord(diagnostic) || diagnostic.severity !== 'warning'
      )
    )
      throw createApiServiceError(
        'Pulumi returned environment diagnostics; resolved values are not confirmed.',
        { reason: 'environment_diagnostics' }
      );
    return result;
  }
  async readOpenEnvironment(
    org: string,
    project: string,
    environment: string,
    sessionId: string,
    property?: string
  ) {
    return decode(
      await this.request(
        'GET',
        `${environmentPath(org, project, environment)}/open/${segment(sessionId)}`,
        undefined,
        { property }
      ),
      z.record(z.string(), z.unknown()),
      'resolved environment'
    );
  }
  async searchResources(
    org: string,
    query: string,
    properties?: boolean,
    options: { page?: number; size?: number; cursor?: string } = {}
  ) {
    if (options.page !== undefined && (!Number.isInteger(options.page) || options.page < 0))
      throw createApiServiceError('Search page must be a nonnegative integer.', {
        reason: 'invalid_input'
      });
    positiveInteger(options.size, 'Search size');
    return decode(
      await this.request(
        'GET',
        `/api/orgs/${segment(org)}/search/resourcesv2`,
        undefined,
        { query: required(query, 'Search query'), properties, ...options },
        200,
        { Accept: 'application/json' }
      ),
      z.object({
        resources: z.array(z.record(z.string(), z.unknown())),
        total: z.number().optional(),
        pagination: z
          .object({
            next: z.string().optional(),
            previous: z.string().optional(),
            cursor: z.string().optional()
          })
          .optional()
      }),
      'resource search'
    );
  }
  async listAuditLogs(
    org: string,
    params: {
      startTime: number;
      userFilter?: string;
      continuationToken?: string;
      endTime?: number;
      eventFilter?: string;
    }
  ) {
    if (
      !Number.isInteger(params.startTime) ||
      params.startTime < 0 ||
      (params.endTime !== undefined &&
        (!Number.isInteger(params.endTime) || params.endTime < params.startTime))
    )
      throw createApiServiceError(
        'Audit time bounds must be Unix seconds, with endTime at or after startTime.',
        { reason: 'invalid_input' }
      );
    const result = await this.cursorPages(
      `/api/orgs/${segment(org)}/auditlogs`,
      auditEventResponse,
      'auditLogEvents',
      'continuationToken',
      params,
      true
    );
    return { auditLogEvents: result.items, continuationToken: result.nextToken };
  }
  async listOrgMembers(org: string, continuationToken?: string) {
    const result = await this.cursorPages(
      `/api/orgs/${segment(org)}/members`,
      memberResponse,
      'members',
      'continuationToken',
      { continuationToken },
      continuationToken !== undefined
    );
    return { members: result.items, continuationToken: result.nextToken };
  }
  private async createWebhook(
    path: string,
    org: string,
    body: WebhookBody,
    scope: Record<string, string> = {}
  ) {
    required(body.displayName, 'Webhook displayName');
    try {
      const url = new URL(body.payloadUrl);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
        throw new TypeError();
    } catch {
      throw createApiServiceError(
        'Webhook payloadUrl must be an HTTP or HTTPS URL without embedded credentials.',
        { reason: 'invalid_input' }
      );
    }
    return decode(
      await this.request(
        'POST',
        path,
        { ...body, organizationName: org, ...scope },
        undefined,
        201
      ),
      webhookResponse,
      'create webhook'
    );
  }
  async createOrgWebhook(org: string, body: WebhookBody) {
    return this.createWebhook(`/api/orgs/${segment(org)}/hooks`, org, body);
  }
  async createStackWebhook(org: string, project: string, stack: string, body: WebhookBody) {
    return this.createWebhook(`${stackPath(org, project, stack)}/hooks`, org, body, {
      projectName: project,
      stackName: stack
    });
  }
  async listOrgWebhooks(org: string) {
    return decode(
      await this.request('GET', `/api/orgs/${segment(org)}/hooks`),
      z.array(webhookResponse),
      'organization webhooks'
    );
  }
  async listStackWebhooks(org: string, project: string, stack: string) {
    return decode(
      await this.request('GET', `${stackPath(org, project, stack)}/hooks`),
      z.array(webhookResponse),
      'stack webhooks'
    );
  }
  async deleteOrgWebhook(org: string, webhookName: string) {
    await this.request(
      'DELETE',
      `/api/orgs/${segment(org)}/hooks/${segment(webhookName)}`,
      undefined,
      undefined,
      204
    );
  }
  async deleteStackWebhook(org: string, project: string, stack: string, webhookName: string) {
    await this.request(
      'DELETE',
      `${stackPath(org, project, stack)}/hooks/${segment(webhookName)}`,
      undefined,
      undefined,
      204
    );
  }
  async getOrgWebhook(org: string, webhookName: string) {
    return decode(
      await this.request('GET', `/api/orgs/${segment(org)}/hooks/${segment(webhookName)}`),
      webhookResponse,
      'webhook'
    );
  }
  async listPersonalAccessTokens(
    showExpired?: boolean,
    continuationToken?: string,
    maxResults?: number
  ) {
    positiveInteger(maxResults, 'maxResults', 1000);
    const result = await this.cursorPages(
      '/api/user/tokens',
      accessTokenResponse,
      'tokens',
      'continuationToken',
      { filter: showExpired ? 'all' : 'active', continuationToken, maxResults },
      continuationToken !== undefined || maxResults !== undefined
    );
    return { tokens: result.items, continuationToken: result.nextToken };
  }
  async createPersonalAccessToken(description: string, expires = 0) {
    const latestExpiry = new Date();
    latestExpiry.setUTCFullYear(latestExpiry.getUTCFullYear() + 2);
    if (
      !Number.isInteger(expires) ||
      expires < 0 ||
      (expires !== 0 &&
        (expires <= Date.now() / 1000 || expires > latestExpiry.getTime() / 1000))
    )
      throw createApiServiceError(
        'Token expiry must be 0 or a Unix-seconds timestamp in the next two years.',
        { reason: 'invalid_input' }
      );
    return decode(
      await this.request('POST', '/api/user/tokens', {
        description: required(description, 'Token description'),
        expires
      }),
      z.object({ id: z.string().min(1), tokenValue: z.string().min(1) }),
      'create access token'
    );
  }
  async deletePersonalAccessToken(tokenId: string) {
    await this.request(
      'DELETE',
      `/api/user/tokens/${segment(tokenId)}`,
      undefined,
      undefined,
      204
    );
  }
  async listPolicyPacks(org: string) {
    return decode(
      await this.request('GET', `/api/orgs/${segment(org)}/policypacks`),
      z.object({ policyPacks: z.array(policyPackResponse) }),
      'policy packs'
    );
  }
}
