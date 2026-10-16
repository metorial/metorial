import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export let createAtlassianAxios = (baseURL: string, authorization?: string) => {
  let client = createAuthenticatedAxios({
    baseURL,
    authHeader: authorization ? { value: authorization } : undefined,
    headers: { Accept: 'application/json' },
    timeout: 30_000,
    validateStatus: () => true
  });
  let apiError = (error: unknown) =>
    buildApiServiceError(error, {
      providerLabel: 'Atlassian',
      reason: 'atlassian_api_error',
      detailKeys: ['message', 'errorMessage', 'error_description', 'error'],
      nestedKeys: ['errorMessages', 'errors'],
      extractMessage: (error, helpers) => {
        let response = helpers.getResponseWithBody(error);
        if (!helpers.isRecord(response?.data)) return undefined;
        let details: string[] = [];
        helpers.collectDetails(response.data, details, {
          detailKeys: ['message', 'errorMessage', 'error_description', 'error'],
          nestedKeys: ['errorMessages']
        });
        if (helpers.isRecord(response.data.errors)) {
          for (let value of Object.values(response.data.errors)) {
            helpers.collectDetails(value, details);
          }
        }
        return details.length ? details.join(' - ') : undefined;
      }
    });
  client.interceptors.response.use(
    response => {
      if (response.status < 200 || response.status >= 300) {
        throw apiError({ response });
      }
      return response;
    },
    error => Promise.reject(apiError(error))
  );
  return client;
};

export interface JiraClientConfig {
  token: string;
  cloudId: string;
  siteUrl?: string;
  authType?: 'basic' | 'bearer';
}

export class JiraClient {
  private jira: ReturnType<typeof createAtlassianAxios>;
  private serviceDesk: ReturnType<typeof createAtlassianAxios>;

  constructor(config: JiraClientConfig) {
    let isBasic = config.authType === 'basic';
    if (!config.authType) {
      // Connections created before authType was persisted contain base64 email:token.
      try {
        isBasic = atob(config.token).includes(':');
      } catch {
        isBasic = false;
      }
    }
    if (!config.token || !config.cloudId) {
      throw createApiServiceError(
        'Reconnect your Atlassian account: authentication state is missing.'
      );
    }
    let baseURL =
      isBasic && config.siteUrl
        ? config.siteUrl
        : `https://api.atlassian.com/ex/jira/${encodeURIComponent(config.cloudId)}`;
    if (
      isBasic &&
      config.siteUrl &&
      !/^https:\/\/[a-z0-9][a-z0-9-]*\.atlassian\.net\/?$/i.test(baseURL)
    ) {
      throw createApiServiceError('Reconnect using a valid Atlassian Cloud site URL.');
    }
    let authorization = `${isBasic ? 'Basic' : 'Bearer'} ${config.token}`;
    this.jira = createAtlassianAxios(
      `${baseURL.replace(/\/$/, '')}/rest/api/3`,
      authorization
    );
    this.serviceDesk = createAtlassianAxios(
      `${baseURL.replace(/\/$/, '')}/rest/servicedeskapi`,
      authorization
    );
    this.serviceDesk.defaults.headers.common['X-ExperimentalApi'] = 'opt-in';
  }

  // ─── Issues ────────────────────────────────────────────────────────

  async getIssue(issueIdOrKey: string, fields?: string[], expand?: string[]): Promise<any> {
    let params: Record<string, string> = {};
    if (fields?.length) params.fields = fields.join(',');
    if (expand?.length) params.expand = expand.join(',');

    let response = await this.jira.get(`/issue/${encodeURIComponent(issueIdOrKey)}`, {
      params
    });
    return response.data;
  }

  async createIssue(body: any): Promise<any> {
    let response = await this.jira.post('/issue', body);
    return response.data;
  }

  async updateIssue(issueIdOrKey: string, body: any): Promise<void> {
    await this.jira.put(`/issue/${encodeURIComponent(issueIdOrKey)}`, body);
  }

  async deleteIssue(issueIdOrKey: string, deleteSubtasks?: boolean): Promise<void> {
    let params: Record<string, string> = {};
    if (deleteSubtasks) params.deleteSubtasks = 'true';
    await this.jira.delete(`/issue/${encodeURIComponent(issueIdOrKey)}`, { params });
  }

  async transitionIssue(
    issueIdOrKey: string,
    transitionId: string,
    fields?: any,
    comment?: string
  ): Promise<void> {
    let body: any = {
      transition: { id: transitionId }
    };
    if (fields) body.fields = fields;
    if (comment) {
      body.update = {
        comment: [
          {
            add: {
              body: {
                type: 'doc',
                version: 1,
                content: [{ type: 'paragraph', content: [{ type: 'text', text: comment }] }]
              }
            }
          }
        ]
      };
    }
    await this.jira.post(`/issue/${encodeURIComponent(issueIdOrKey)}/transitions`, body);
  }

  async getTransitions(issueIdOrKey: string): Promise<any[]> {
    let response = await this.jira.get(
      `/issue/${encodeURIComponent(issueIdOrKey)}/transitions`
    );
    return response.data.transitions;
  }

  async assignIssue(issueIdOrKey: string, accountId: string | null): Promise<void> {
    await this.jira.put(`/issue/${encodeURIComponent(issueIdOrKey)}/assignee`, {
      accountId
    });
  }

  async searchIssues(
    jql: string,
    fields?: string[],
    maxResults?: number,
    startAt?: number,
    nextPageToken?: string
  ): Promise<any> {
    let pageSize = maxResults || 50;
    let offset = startAt ?? 0;
    if (
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100 ||
      !Number.isInteger(offset) ||
      offset < 0
    ) {
      throw createApiServiceError(
        'maxResults must be a whole number from 1 to 100 and startAt a non-negative whole number.'
      );
    }
    let selected: any[] = [];
    let remainingSkip = offset;
    let cursor = nextPageToken;
    let seenTokens = new Set<string>(cursor ? [cursor] : []);
    let isLast: boolean | undefined;
    let pageCalls = 0;
    let maxPageCalls = 10;
    let searchTimeoutMs = 30_000;
    let deadline = Date.now() + searchTimeoutMs;
    let signal = AbortSignal.timeout(searchTimeoutMs);
    let budgetError = () =>
      createApiServiceError(
        'Issue search reached its 10-request or 30-second limit before completing the requested window. ' +
          (cursor && selected.length === 0
            ? `Resume with nextPageToken ${JSON.stringify(cursor)} and startAt ${remainingSkip}, or narrow the JQL query.`
            : 'Reduce startAt or maxResults, narrow the JQL query, or use nextPageToken from a previous successful page.'),
        { reason: 'jira_search_budget_exceeded' }
      );
    // Preserve offsets by skipping from the search start (or supplied cursor).
    // Stop at the requested window: the enhanced endpoint does not return totals.
    while (selected.length < pageSize) {
      let remainingTime = deadline - Date.now();
      if (pageCalls >= maxPageCalls || remainingTime <= 0 || signal.aborted) {
        throw budgetError();
      }
      // Finish offset skipping on a provider page boundary so the returned
      // cursor never skips an issue that was fetched but not returned.
      let requestedSize = Math.min(100, remainingSkip || pageSize - selected.length);
      pageCalls++;
      let response: { data: { issues: unknown; isLast?: boolean; nextPageToken?: string } };
      try {
        response = await this.jira.post(
          '/search/jql',
          {
            jql,
            fields: fields ?? [
              'summary',
              'status',
              'assignee',
              'reporter',
              'priority',
              'issuetype',
              'project',
              'created',
              'updated'
            ],
            maxResults: requestedSize,
            ...(cursor ? { nextPageToken: cursor } : {})
          },
          { timeout: remainingTime, signal }
        );
      } catch (error) {
        if (signal.aborted || Date.now() >= deadline) throw budgetError();
        throw error;
      }
      if (Date.now() >= deadline || signal.aborted) throw budgetError();
      let page = response.data;
      if (!Array.isArray(page.issues) || page.issues.length > requestedSize) {
        throw createApiServiceError('Atlassian returned an invalid issue search page.');
      }
      for (let issue of page.issues) {
        if (remainingSkip > 0) remainingSkip--;
        else selected.push(issue);
      }
      isLast = page.isLast;
      cursor = isLast === true ? undefined : page.nextPageToken;
      if (cursor && seenTokens.has(cursor)) {
        throw createApiServiceError(
          'Atlassian returned a repeated issue search cursor. Retry the search or narrow the JQL query.'
        );
      }
      if (cursor) seenTokens.add(cursor);
      if (!cursor) {
        if (isLast === false) {
          throw createApiServiceError(
            'Atlassian omitted the continuation cursor for an incomplete issue search. Retry the search.'
          );
        }
        break;
      }
    }
    return {
      issues: selected,
      startAt: offset,
      maxResults: pageSize,
      nextPageToken: cursor,
      isLast
    };
  }

  // ─── Comments ──────────────────────────────────────────────────────

  async getComments(
    issueIdOrKey: string,
    startAt?: number,
    maxResults?: number
  ): Promise<any> {
    let params: Record<string, string> = {};
    if (startAt !== undefined) params.startAt = String(startAt);
    if (maxResults !== undefined) params.maxResults = String(maxResults);

    let response = await this.jira.get(`/issue/${encodeURIComponent(issueIdOrKey)}/comment`, {
      params
    });
    return response.data;
  }

  async addComment(issueIdOrKey: string, body: string, isInternal?: boolean): Promise<any> {
    let commentBody: any = {
      body: {
        type: 'doc',
        version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text: body }] }]
      }
    };
    commentBody.properties = [
      {
        key: 'sd.public.comment',
        value: { internal: isInternal ?? false }
      }
    ];

    let response = await this.jira.post(
      `/issue/${encodeURIComponent(issueIdOrKey)}/comment`,
      commentBody
    );
    return response.data;
  }

  // ─── Projects ──────────────────────────────────────────────────────

  async getProjects(startAt?: number, maxResults?: number): Promise<any> {
    let params: Record<string, string> = {};
    if (startAt !== undefined) params.startAt = String(startAt);
    if (maxResults !== undefined) params.maxResults = String(maxResults);

    let response = await this.jira.get('/project/search', { params });
    return response.data;
  }

  async getProject(projectIdOrKey: string): Promise<any> {
    let response = await this.jira.get(`/project/${projectIdOrKey}`);
    return response.data;
  }

  // ─── Service Desks ────────────────────────────────────────────────

  async getServiceDesks(start?: number, limit?: number): Promise<any> {
    let params: Record<string, string> = {};
    if (start !== undefined) params.start = String(start);
    if (limit !== undefined) params.limit = String(limit);

    let response = await this.serviceDesk.get('/servicedesk', { params });
    return response.data;
  }

  async getServiceDesk(serviceDeskId: string): Promise<any> {
    let response = await this.serviceDesk.get(
      `/servicedesk/${encodeURIComponent(serviceDeskId)}`
    );
    return response.data;
  }

  // ─── Customer Requests ────────────────────────────────────────────

  async createCustomerRequest(body: any): Promise<any> {
    let response = await this.serviceDesk.post('/request', body);
    return response.data;
  }

  async getCustomerRequest(issueIdOrKey: string, expand?: string[]): Promise<any> {
    let params: Record<string, string> = {};
    if (expand?.length) params.expand = expand.join(',');

    let response = await this.serviceDesk.get(`/request/${encodeURIComponent(issueIdOrKey)}`, {
      params
    });
    return response.data;
  }

  async getCustomerRequests(params?: {
    searchTerm?: string;
    requestOwnership?: string | string[];
    requestStatus?: string;
    serviceDeskId?: string;
    start?: number;
    limit?: number;
  }): Promise<any> {
    let response = await this.serviceDesk.get('/request', {
      params,
      paramsSerializer: { indexes: null }
    });
    return response.data;
  }

  async addRequestComment(
    issueIdOrKey: string,
    body: string,
    isPublic: boolean
  ): Promise<any> {
    let response = await this.serviceDesk.post(
      `/request/${encodeURIComponent(issueIdOrKey)}/comment`,
      {
        body,
        public: isPublic
      }
    );
    return response.data;
  }

  // ─── Request Types ────────────────────────────────────────────────

  async getRequestTypes(serviceDeskId: string, start?: number, limit?: number): Promise<any> {
    let params: Record<string, string> = {};
    if (start !== undefined) params.start = String(start);
    if (limit !== undefined) params.limit = String(limit);

    let response = await this.serviceDesk.get(
      `/servicedesk/${encodeURIComponent(serviceDeskId)}/requesttype`,
      {
        params
      }
    );
    return response.data;
  }

  async getRequestTypeFields(serviceDeskId: string, requestTypeId: string): Promise<any> {
    let response = await this.serviceDesk.get(
      `/servicedesk/${encodeURIComponent(serviceDeskId)}/requesttype/${encodeURIComponent(requestTypeId)}/field`
    );
    return response.data;
  }

  // ─── Approvals ────────────────────────────────────────────────────

  async getApprovals(issueIdOrKey: string): Promise<any> {
    let response = await this.serviceDesk.get(
      `/request/${encodeURIComponent(issueIdOrKey)}/approval`
    );
    return response.data;
  }

  async answerApproval(
    issueIdOrKey: string,
    approvalId: string,
    decision: 'approve' | 'decline'
  ): Promise<any> {
    let response = await this.serviceDesk.post(
      `/request/${encodeURIComponent(issueIdOrKey)}/approval/${encodeURIComponent(approvalId)}`,
      {
        decision
      }
    );
    return response.data;
  }

  // ─── SLA ──────────────────────────────────────────────────────────

  async getSlaInformation(issueIdOrKey: string): Promise<any> {
    let response = await this.serviceDesk.get(
      `/request/${encodeURIComponent(issueIdOrKey)}/sla`
    );
    return response.data;
  }

  // ─── Queues ───────────────────────────────────────────────────────

  async getQueues(serviceDeskId: string, start?: number, limit?: number): Promise<any> {
    let params: Record<string, string> = {};
    if (start !== undefined) params.start = String(start);
    if (limit !== undefined) params.limit = String(limit);

    let response = await this.serviceDesk.get(
      `/servicedesk/${encodeURIComponent(serviceDeskId)}/queue`,
      {
        params
      }
    );
    return response.data;
  }

  async getQueueIssues(
    serviceDeskId: string,
    queueId: string,
    start?: number,
    limit?: number
  ): Promise<any> {
    let params: Record<string, string> = {};
    if (start !== undefined) params.start = String(start);
    if (limit !== undefined) params.limit = String(limit);

    let response = await this.serviceDesk.get(
      `/servicedesk/${encodeURIComponent(serviceDeskId)}/queue/${encodeURIComponent(queueId)}/issue`,
      { params }
    );
    return response.data;
  }

  // ─── Customers ────────────────────────────────────────────────────

  async createCustomer(email: string, displayName: string): Promise<any> {
    let response = await this.serviceDesk.post('/customer', {
      email,
      displayName
    });
    return response.data;
  }

  async getServiceDeskCustomers(
    serviceDeskId: string,
    query?: string,
    start?: number,
    limit?: number
  ): Promise<any> {
    let params: Record<string, string> = {};
    if (query) params.query = query;
    if (start !== undefined) params.start = String(start);
    if (limit !== undefined) params.limit = String(limit);

    let response = await this.serviceDesk.get(
      `/servicedesk/${encodeURIComponent(serviceDeskId)}/customer`,
      {
        params
      }
    );
    return response.data;
  }

  async addCustomersToServiceDesk(serviceDeskId: string, accountIds: string[]): Promise<void> {
    await this.serviceDesk.post(`/servicedesk/${encodeURIComponent(serviceDeskId)}/customer`, {
      accountIds
    });
  }

  async removeCustomersFromServiceDesk(
    serviceDeskId: string,
    accountIds: string[]
  ): Promise<void> {
    await this.serviceDesk.delete(
      `/servicedesk/${encodeURIComponent(serviceDeskId)}/customer`,
      {
        data: { accountIds }
      }
    );
  }

  // ─── Organizations ────────────────────────────────────────────────

  async getOrganizations(start?: number, limit?: number): Promise<any> {
    let params: Record<string, string> = {};
    if (start !== undefined) params.start = String(start);
    if (limit !== undefined) params.limit = String(limit);

    let response = await this.serviceDesk.get('/organization', { params });
    return response.data;
  }

  async getOrganization(organizationId: string): Promise<any> {
    let response = await this.serviceDesk.get(
      `/organization/${encodeURIComponent(organizationId)}`
    );
    return response.data;
  }

  async createOrganization(name: string): Promise<any> {
    let response = await this.serviceDesk.post('/organization', { name });
    return response.data;
  }

  async deleteOrganization(organizationId: string): Promise<void> {
    await this.serviceDesk.delete(`/organization/${encodeURIComponent(organizationId)}`);
  }

  async getOrganizationUsers(
    organizationId: string,
    start?: number,
    limit?: number
  ): Promise<any> {
    let params: Record<string, string> = {};
    if (start !== undefined) params.start = String(start);
    if (limit !== undefined) params.limit = String(limit);

    let response = await this.serviceDesk.get(
      `/organization/${encodeURIComponent(organizationId)}/user`,
      {
        params
      }
    );
    return response.data;
  }

  async addUsersToOrganization(organizationId: string, accountIds: string[]): Promise<void> {
    await this.serviceDesk.post(`/organization/${encodeURIComponent(organizationId)}/user`, {
      accountIds
    });
  }

  async removeUsersFromOrganization(
    organizationId: string,
    accountIds: string[]
  ): Promise<void> {
    await this.serviceDesk.delete(`/organization/${encodeURIComponent(organizationId)}/user`, {
      data: { accountIds }
    });
  }

  // ─── Knowledge Base ───────────────────────────────────────────────

  async searchKnowledgeBase(
    serviceDeskId: string,
    query: string,
    highlight?: boolean,
    start?: number,
    limit?: number
  ): Promise<any> {
    let params: Record<string, any> = { query };
    if (highlight !== undefined) params.highlight = highlight;
    if (start !== undefined) params.start = start;
    if (limit !== undefined) params.limit = limit;

    let response = await this.serviceDesk.get(
      `/servicedesk/${encodeURIComponent(serviceDeskId)}/knowledgebase/article`,
      { params }
    );
    return response.data;
  }

  // ─── Users ────────────────────────────────────────────────────────

  async searchUsers(query: string, maxResults?: number): Promise<any[]> {
    let params: Record<string, string> = { query };
    if (maxResults !== undefined) params.maxResults = String(maxResults);

    let response = await this.jira.get('/user/search', { params });
    return response.data;
  }

  async getCurrentUser(): Promise<any> {
    let response = await this.jira.get('/myself');
    return response.data;
  }

  async getUser(accountId: string): Promise<any> {
    let response = await this.jira.get('/user', { params: { accountId } });
    return response.data;
  }

  // ─── Webhooks ─────────────────────────────────────────────────────

  async registerWebhook(url: string, events: string[], jqlFilter?: string): Promise<any> {
    let response = await this.jira.post('/webhook', {
      url,
      webhooks: [
        {
          events,
          jqlFilter: jqlFilter || ''
        }
      ]
    });
    return response.data;
  }

  async deleteWebhook(webhookIds: number[]): Promise<void> {
    await this.jira.delete('/webhook', {
      data: { webhookIds }
    });
  }

  async refreshWebhooks(webhookIds: number[]): Promise<any> {
    let response = await this.jira.put('/webhook/refresh', {
      webhookIds
    });
    return response.data;
  }

  // ─── Request Participants ─────────────────────────────────────────

  async getRequestParticipants(issueIdOrKey: string): Promise<any> {
    let response = await this.serviceDesk.get(
      `/request/${encodeURIComponent(issueIdOrKey)}/participant`
    );
    return response.data;
  }

  async addRequestParticipants(issueIdOrKey: string, accountIds: string[]): Promise<any> {
    let response = await this.serviceDesk.post(
      `/request/${encodeURIComponent(issueIdOrKey)}/participant`,
      {
        accountIds
      }
    );
    return response.data;
  }

  async removeRequestParticipants(issueIdOrKey: string, accountIds: string[]): Promise<any> {
    let response = await this.serviceDesk.delete(
      `/request/${encodeURIComponent(issueIdOrKey)}/participant`,
      {
        data: { accountIds }
      }
    );
    return response.data;
  }
}
