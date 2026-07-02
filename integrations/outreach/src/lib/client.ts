import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://api.outreach.io/api/v2'
});

let JSON_API_HEADERS = {
  'Content-Type': 'application/vnd.api+json',
  Accept: 'application/vnd.api+json'
};

export interface JsonApiResource {
  id: string;
  type: string;
  attributes: Record<string, any>;
  relationships?: Record<
    string,
    { data: { id: string; type: string } | { id: string; type: string }[] | null }
  >;
  links?: Record<string, string>;
}

export interface JsonApiResponse {
  data: JsonApiResource | JsonApiResource[];
  included?: JsonApiResource[];
  meta?: Record<string, any>;
  links?: Record<string, string | null>;
}

export interface PaginatedResult<T> {
  records: T[];
  hasMore: boolean;
  nextPageUrl: string | null;
  totalCount: number | null;
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return {
      ...JSON_API_HEADERS,
      Authorization: `Bearer ${this.token}`
    };
  }

  // --- Generic CRUD ---

  async getResource(
    resourceType: string,
    resourceId: string,
    queryParams?: Record<string, string>
  ): Promise<JsonApiResource> {
    let params = new URLSearchParams(queryParams);
    let url = `/${resourceType}/${resourceId}${params.toString() ? `?${params.toString()}` : ''}`;
    let response = await api.get(url, { headers: this.headers() });
    return response.data.data;
  }

  async listResources(
    resourceType: string,
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    let query = new URLSearchParams(params);
    let url = `/${resourceType}${query.toString() ? `?${query.toString()}` : ''}`;
    let response = await api.get(url, { headers: this.headers() });
    let body: JsonApiResponse = response.data;
    let records = Array.isArray(body.data) ? body.data : [body.data];

    return {
      records,
      hasMore: !!body.links?.next,
      nextPageUrl: (body.links?.next as string) ?? null,
      totalCount: body.meta?.count ?? null
    };
  }

  async createResource(
    resourceType: string,
    attributes: Record<string, any>,
    relationships?: Record<string, any>
  ): Promise<JsonApiResource> {
    let payload: any = {
      data: {
        type: resourceType,
        attributes
      }
    };
    if (relationships) {
      payload.data.relationships = relationships;
    }
    let response = await api.post(`/${resourceType}`, payload, { headers: this.headers() });
    return response.data.data;
  }

  async updateResource(
    resourceType: string,
    resourceId: string,
    attributes: Record<string, any>,
    relationships?: Record<string, any>
  ): Promise<JsonApiResource> {
    let payload: any = {
      data: {
        type: resourceType,
        id: resourceId,
        attributes
      }
    };
    if (relationships) {
      payload.data.relationships = relationships;
    }
    let response = await api.patch(`/${resourceType}/${resourceId}`, payload, {
      headers: this.headers()
    });
    return response.data.data;
  }

  async deleteResource(resourceType: string, resourceId: string): Promise<void> {
    await api.delete(`/${resourceType}/${resourceId}`, { headers: this.headers() });
  }

  // --- Prospects ---

  async listProspects(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('prospects', params);
  }

  async getProspect(prospectId: string): Promise<JsonApiResource> {
    return this.getResource('prospects', prospectId);
  }

  async createProspect(
    attributes: Record<string, any>,
    relationships?: Record<string, any>
  ): Promise<JsonApiResource> {
    return this.createResource('prospects', attributes, relationships);
  }

  async updateProspect(
    prospectId: string,
    attributes: Record<string, any>,
    relationships?: Record<string, any>
  ): Promise<JsonApiResource> {
    return this.updateResource('prospects', prospectId, attributes, relationships);
  }

  async deleteProspect(prospectId: string): Promise<void> {
    return this.deleteResource('prospects', prospectId);
  }

  // --- Accounts ---

  async listAccounts(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('accounts', params);
  }

  async getAccount(accountId: string): Promise<JsonApiResource> {
    return this.getResource('accounts', accountId);
  }

  async createAccount(
    attributes: Record<string, any>,
    relationships?: Record<string, any>
  ): Promise<JsonApiResource> {
    return this.createResource('accounts', attributes, relationships);
  }

  async updateAccount(
    accountId: string,
    attributes: Record<string, any>,
    relationships?: Record<string, any>
  ): Promise<JsonApiResource> {
    return this.updateResource('accounts', accountId, attributes, relationships);
  }

  async deleteAccount(accountId: string): Promise<void> {
    return this.deleteResource('accounts', accountId);
  }

  // --- Sequences ---

  async listSequences(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('sequences', params);
  }

  async getSequence(sequenceId: string): Promise<JsonApiResource> {
    return this.getResource('sequences', sequenceId);
  }

  async createSequence(
    attributes: Record<string, any>,
    relationships?: Record<string, any>
  ): Promise<JsonApiResource> {
    return this.createResource('sequences', attributes, relationships);
  }

  async updateSequence(
    sequenceId: string,
    attributes: Record<string, any>,
    relationships?: Record<string, any>
  ): Promise<JsonApiResource> {
    return this.updateResource('sequences', sequenceId, attributes, relationships);
  }

  // --- Sequence States ---

  async listSequenceStates(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('sequenceStates', params);
  }

  async getSequenceState(sequenceStateId: string): Promise<JsonApiResource> {
    return this.getResource('sequenceStates', sequenceStateId);
  }

  async createSequenceState(
    attributes: Record<string, any>,
    relationships: Record<string, any>
  ): Promise<JsonApiResource> {
    return this.createResource('sequenceStates', attributes, relationships);
  }

  async updateSequenceState(
    sequenceStateId: string,
    attributes: Record<string, any>
  ): Promise<JsonApiResource> {
    return this.updateResource('sequenceStates', sequenceStateId, attributes);
  }

  // --- Sequence Steps ---

  async listSequenceSteps(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('sequenceSteps', params);
  }

  async getSequenceStep(sequenceStepId: string): Promise<JsonApiResource> {
    return this.getResource('sequenceSteps', sequenceStepId);
  }

  // --- Mailings ---

  async listMailings(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('mailings', params);
  }

  async getMailing(mailingId: string): Promise<JsonApiResource> {
    return this.getResource('mailings', mailingId);
  }

  // --- Tasks ---

  async listTasks(params?: Record<string, string>): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('tasks', params);
  }

  async getTask(taskId: string): Promise<JsonApiResource> {
    return this.getResource('tasks', taskId);
  }

  async updateTask(taskId: string, attributes: Record<string, any>): Promise<JsonApiResource> {
    return this.updateResource('tasks', taskId, attributes);
  }

  // --- Opportunities ---

  async listOpportunities(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('opportunities', params);
  }

  async getOpportunity(opportunityId: string): Promise<JsonApiResource> {
    return this.getResource('opportunities', opportunityId);
  }

  async createOpportunity(
    attributes: Record<string, any>,
    relationships?: Record<string, any>
  ): Promise<JsonApiResource> {
    return this.createResource('opportunities', attributes, relationships);
  }

  async updateOpportunity(
    opportunityId: string,
    attributes: Record<string, any>,
    relationships?: Record<string, any>
  ): Promise<JsonApiResource> {
    return this.updateResource('opportunities', opportunityId, attributes, relationships);
  }

  // --- Templates ---

  async listTemplates(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('templates', params);
  }

  async getTemplate(templateId: string): Promise<JsonApiResource> {
    return this.getResource('templates', templateId);
  }

  async createTemplate(
    attributes: Record<string, any>,
    relationships?: Record<string, any>
  ): Promise<JsonApiResource> {
    return this.createResource('templates', attributes, relationships);
  }

  async updateTemplate(
    templateId: string,
    attributes: Record<string, any>
  ): Promise<JsonApiResource> {
    return this.updateResource('templates', templateId, attributes);
  }

  // --- Snippets ---

  async listSnippets(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('snippets', params);
  }

  async getSnippet(snippetId: string): Promise<JsonApiResource> {
    return this.getResource('snippets', snippetId);
  }

  async createSnippet(
    attributes: Record<string, any>,
    relationships?: Record<string, any>
  ): Promise<JsonApiResource> {
    return this.createResource('snippets', attributes, relationships);
  }

  async updateSnippet(
    snippetId: string,
    attributes: Record<string, any>
  ): Promise<JsonApiResource> {
    return this.updateResource('snippets', snippetId, attributes);
  }

  // --- Calls ---

  async listCalls(params?: Record<string, string>): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('calls', params);
  }

  async getCall(callId: string): Promise<JsonApiResource> {
    return this.getResource('calls', callId);
  }

  async createCall(
    attributes: Record<string, any>,
    relationships?: Record<string, any>
  ): Promise<JsonApiResource> {
    return this.createResource('calls', attributes, relationships);
  }

  // --- Users ---

  async listUsers(params?: Record<string, string>): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('users', params);
  }

  async getUser(userId: string): Promise<JsonApiResource> {
    return this.getResource('users', userId);
  }

  // --- Webhooks ---

  async createWebhook(attributes: Record<string, any>): Promise<JsonApiResource> {
    return this.createResource('webhooks', attributes);
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    return this.deleteResource('webhooks', webhookId);
  }

  async listWebhooks(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('webhooks', params);
  }

  // --- Call Dispositions ---

  async listCallDispositions(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('callDispositions', params);
  }

  // --- Call Purposes ---

  async listCallPurposes(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('callPurposes', params);
  }

  // --- Stages ---

  async listStages(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('stages', params);
  }

  // --- Mailboxes ---

  async listMailboxes(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('mailboxes', params);
  }
}
