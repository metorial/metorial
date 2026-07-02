import { createAxios } from 'slates';

export interface JiraClientConfig {
  token: string;
  cloudId: string;
}

export class JiraClient {
  private jira: ReturnType<typeof createAxios>;
  private serviceDesk: ReturnType<typeof createAxios>;

  constructor(config: JiraClientConfig) {
    // Detect basic-auth tokens (base64 of "email:token") vs OAuth bearer tokens.
    let isBasic = false;
    try {
      let decoded = atob(config.token);
      if (decoded.includes(':')) isBasic = true;
    } catch {
      // not valid base64 → treat as bearer
    }
    let authHeader = isBasic ? `Basic ${config.token}` : `Bearer ${config.token}`;

    this.jira = createAxios({
      baseURL: `https://api.atlassian.com/ex/jira/${config.cloudId}/rest/api/3`,
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });

    this.serviceDesk = createAxios({
      baseURL: `https://api.atlassian.com/ex/jira/${config.cloudId}/rest/servicedeskapi`,
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-ExperimentalApi': 'opt-in'
      }
    });
  }

  // ─── Issues ────────────────────────────────────────────────────────

  async getIssue(issueIdOrKey: string, fields?: string[], expand?: string[]): Promise<any> {
    let params: Record<string, string> = {};
    if (fields?.length) params.fields = fields.join(',');
    if (expand?.length) params.expand = expand.join(',');

    let response = await this.jira.get(`/issue/${issueIdOrKey}`, { params });
    return response.data;
  }

  async createIssue(body: any): Promise<any> {
    let response = await this.jira.post('/issue', body);
    return response.data;
  }

  async updateIssue(issueIdOrKey: string, body: any): Promise<void> {
    await this.jira.put(`/issue/${issueIdOrKey}`, body);
  }

  async deleteIssue(issueIdOrKey: string, deleteSubtasks?: boolean): Promise<void> {
    let params: Record<string, string> = {};
    if (deleteSubtasks) params.deleteSubtasks = 'true';
    await this.jira.delete(`/issue/${issueIdOrKey}`, { params });
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
    await this.jira.post(`/issue/${issueIdOrKey}/transitions`, body);
  }

  async getTransitions(issueIdOrKey: string): Promise<any[]> {
    let response = await this.jira.get(`/issue/${issueIdOrKey}/transitions`);
    return response.data.transitions;
  }

  async assignIssue(issueIdOrKey: string, accountId: string | null): Promise<void> {
    await this.jira.put(`/issue/${issueIdOrKey}/assignee`, {
      accountId
    });
  }

  async searchIssues(
    jql: string,
    fields?: string[],
    maxResults?: number,
    startAt?: number
  ): Promise<any> {
    let response = await this.jira.post('/search', {
      jql,
      fields: fields || [
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
      maxResults: maxResults || 50,
      startAt: startAt || 0
    });
    return response.data;
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

    let response = await this.jira.get(`/issue/${issueIdOrKey}/comment`, { params });
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
    if (isInternal !== undefined) {
      commentBody.properties = [
        {
          key: 'sd.public.comment',
          value: { internal: isInternal }
        }
      ];
    }

    let response = await this.jira.post(`/issue/${issueIdOrKey}/comment`, commentBody);
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
    let response = await this.serviceDesk.get(`/servicedesk/${serviceDeskId}`);
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

    let response = await this.serviceDesk.get(`/request/${issueIdOrKey}`, { params });
    return response.data;
  }

  async getCustomerRequests(params?: {
    searchTerm?: string;
    requestOwnership?: string;
    requestStatus?: string;
    serviceDeskId?: number;
    start?: number;
    limit?: number;
  }): Promise<any> {
    let response = await this.serviceDesk.get('/request', { params });
    return response.data;
  }

  async addRequestComment(
    issueIdOrKey: string,
    body: string,
    isPublic: boolean
  ): Promise<any> {
    let response = await this.serviceDesk.post(`/request/${issueIdOrKey}/comment`, {
      body,
      public: isPublic
    });
    return response.data;
  }

  // ─── Request Types ────────────────────────────────────────────────

  async getRequestTypes(serviceDeskId: string, start?: number, limit?: number): Promise<any> {
    let params: Record<string, string> = {};
    if (start !== undefined) params.start = String(start);
    if (limit !== undefined) params.limit = String(limit);

    let response = await this.serviceDesk.get(`/servicedesk/${serviceDeskId}/requesttype`, {
      params
    });
    return response.data;
  }

  async getRequestTypeFields(serviceDeskId: string, requestTypeId: string): Promise<any> {
    let response = await this.serviceDesk.get(
      `/servicedesk/${serviceDeskId}/requesttype/${requestTypeId}/field`
    );
    return response.data;
  }

  // ─── Approvals ────────────────────────────────────────────────────

  async getApprovals(issueIdOrKey: string): Promise<any> {
    let response = await this.serviceDesk.get(`/request/${issueIdOrKey}/approval`);
    return response.data;
  }

  async answerApproval(
    issueIdOrKey: string,
    approvalId: string,
    decision: 'approve' | 'decline'
  ): Promise<any> {
    let response = await this.serviceDesk.post(
      `/request/${issueIdOrKey}/approval/${approvalId}`,
      {
        decision
      }
    );
    return response.data;
  }

  // ─── SLA ──────────────────────────────────────────────────────────

  async getSlaInformation(issueIdOrKey: string): Promise<any> {
    let response = await this.serviceDesk.get(`/request/${issueIdOrKey}/sla`);
    return response.data;
  }

  // ─── Queues ───────────────────────────────────────────────────────

  async getQueues(serviceDeskId: string, start?: number, limit?: number): Promise<any> {
    let params: Record<string, string> = {};
    if (start !== undefined) params.start = String(start);
    if (limit !== undefined) params.limit = String(limit);

    let response = await this.serviceDesk.get(`/servicedesk/${serviceDeskId}/queue`, {
      params
    });
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
      `/servicedesk/${serviceDeskId}/queue/${queueId}/issue`,
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

    let response = await this.serviceDesk.get(`/servicedesk/${serviceDeskId}/customer`, {
      params
    });
    return response.data;
  }

  async addCustomersToServiceDesk(serviceDeskId: string, accountIds: string[]): Promise<void> {
    await this.serviceDesk.post(`/servicedesk/${serviceDeskId}/customer`, {
      accountIds
    });
  }

  async removeCustomersFromServiceDesk(
    serviceDeskId: string,
    accountIds: string[]
  ): Promise<void> {
    await this.serviceDesk.delete(`/servicedesk/${serviceDeskId}/customer`, {
      data: { accountIds }
    });
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
    let response = await this.serviceDesk.get(`/organization/${organizationId}`);
    return response.data;
  }

  async createOrganization(name: string): Promise<any> {
    let response = await this.serviceDesk.post('/organization', { name });
    return response.data;
  }

  async deleteOrganization(organizationId: string): Promise<void> {
    await this.serviceDesk.delete(`/organization/${organizationId}`);
  }

  async getOrganizationUsers(
    organizationId: string,
    start?: number,
    limit?: number
  ): Promise<any> {
    let params: Record<string, string> = {};
    if (start !== undefined) params.start = String(start);
    if (limit !== undefined) params.limit = String(limit);

    let response = await this.serviceDesk.get(`/organization/${organizationId}/user`, {
      params
    });
    return response.data;
  }

  async addUsersToOrganization(organizationId: string, accountIds: string[]): Promise<void> {
    await this.serviceDesk.post(`/organization/${organizationId}/user`, {
      accountIds
    });
  }

  async removeUsersFromOrganization(
    organizationId: string,
    accountIds: string[]
  ): Promise<void> {
    await this.serviceDesk.delete(`/organization/${organizationId}/user`, {
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
      `/servicedesk/${serviceDeskId}/knowledgebase/article`,
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

  async getUser(accountId: string): Promise<any> {
    let response = await this.jira.get('/user', { params: { accountId } });
    return response.data;
  }

  // ─── Webhooks ─────────────────────────────────────────────────────

  async registerWebhook(url: string, events: string[], jqlFilter?: string): Promise<any> {
    let response = await this.jira.post('/webhook', {
      webhooks: [
        {
          url,
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
    let response = await this.serviceDesk.get(`/request/${issueIdOrKey}/participant`);
    return response.data;
  }

  async addRequestParticipants(issueIdOrKey: string, accountIds: string[]): Promise<any> {
    let response = await this.serviceDesk.post(`/request/${issueIdOrKey}/participant`, {
      accountIds
    });
    return response.data;
  }

  async removeRequestParticipants(issueIdOrKey: string, accountIds: string[]): Promise<any> {
    let response = await this.serviceDesk.delete(`/request/${issueIdOrKey}/participant`, {
      data: { accountIds }
    });
    return response.data;
  }
}
