import { createAxios } from 'slates';
import type {
  Agent,
  AuditLogEntry,
  AuditLogParams,
  CannedResponse,
  CreateAgentInput,
  CreateTeamInput,
  CreateTicketInput,
  CreateWebhookInput,
  CustomField,
  ListTicketsParams,
  Macro,
  PaginatedResponse,
  ReportParams,
  Rule,
  Tag,
  Team,
  Ticket,
  Transaction,
  UpdateTicketInput,
  View,
  Webhook
} from './types';

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    let isBasicAuth = config.token.startsWith('Basic ');
    this.http = createAxios({
      baseURL: 'https://api.helpdesk.com',
      headers: {
        Authorization: isBasicAuth ? config.token : `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Slates-HelpDesk-Integration/1.0'
      }
    });
  }

  // ── Tickets ──

  async listTickets(params: ListTicketsParams = {}): Promise<PaginatedResponse<Ticket>> {
    let query: Record<string, string> = {};
    if (params.status) query.status = params.status;
    if (params.teamID) query.teamID = params.teamID;
    if (params.assigneeID) query.assigneeID = params.assigneeID;
    if (params.tags && params.tags.length > 0) query.tags = params.tags.join(',');
    if (params.requesterEmail) query.requesterEmail = params.requesterEmail;
    if (params.createdFrom) query.createdFrom = params.createdFrom;
    if (params.createdTo) query.createdTo = params.createdTo;
    if (params.updatedFrom) query.updatedFrom = params.updatedFrom;
    if (params.updatedTo) query.updatedTo = params.updatedTo;
    if (params.search) query.search = params.search;
    if (params.sortBy) query.sortBy = params.sortBy;
    if (params.sortOrder) query.sortOrder = params.sortOrder;
    if (params.pageAfter) query.pageAfter = params.pageAfter;
    if (params.pageBefore) query.pageBefore = params.pageBefore;
    if (params.limit) query.limit = String(params.limit);
    if (params.silo) query.silo = params.silo;

    let response = await this.http.get('/v1/tickets', { params: query });
    return response.data as PaginatedResponse<Ticket>;
  }

  async getTicket(ticketId: string): Promise<Ticket> {
    let response = await this.http.get(`/v1/tickets/${ticketId}`);
    return response.data as Ticket;
  }

  async createTicket(input: CreateTicketInput): Promise<Ticket> {
    let response = await this.http.post('/v1/tickets', input);
    return response.data as Ticket;
  }

  async updateTicket(ticketId: string, input: UpdateTicketInput): Promise<Ticket> {
    let response = await this.http.patch(`/v1/tickets/${ticketId}`, input);
    return response.data as Ticket;
  }

  async deleteTicket(ticketId: string): Promise<void> {
    await this.http.delete(`/v1/tickets/${ticketId}`);
  }

  async addTicketTags(ticketId: string, tags: string[]): Promise<void> {
    await this.http.post(`/v1/tickets/${ticketId}/tags`, { tags });
  }

  async removeTicketTags(ticketId: string, tags: string[]): Promise<void> {
    await this.http.delete(`/v1/tickets/${ticketId}/tags`, { data: { tags } });
  }

  async addTicketFollowers(ticketId: string, agentIds: string[]): Promise<void> {
    await this.http.post(`/v1/tickets/${ticketId}/followers`, { followers: agentIds });
  }

  async removeTicketFollowers(ticketId: string, agentIds: string[]): Promise<void> {
    await this.http.delete(`/v1/tickets/${ticketId}/followers`, {
      data: { followers: agentIds }
    });
  }

  async mergeTickets(parentTicketId: string, childTicketIds: string[]): Promise<void> {
    await this.http.post(`/v1/tickets/${parentTicketId}/merge`, { ticketIDs: childTicketIds });
  }

  async unmergeTicket(ticketId: string): Promise<void> {
    await this.http.delete(`/v1/tickets/${ticketId}/merge`);
  }

  async moveTicketToSilo(ticketId: string, silo: string): Promise<void> {
    await this.http.put(`/v1/tickets/${ticketId}/silo`, { silo });
  }

  async sendRatingRequest(ticketId: string): Promise<void> {
    await this.http.post(`/v1/tickets/${ticketId}/rating`);
  }

  // ── Transactions (Messages) ──

  async createTransaction(): Promise<Transaction> {
    let response = await this.http.post('/v1/transactions');
    return response.data as Transaction;
  }

  async getTransaction(transactionId: string): Promise<Transaction> {
    let response = await this.http.get(`/v1/transactions/${transactionId}`);
    return response.data as Transaction;
  }

  async uploadTransactionAttachment(
    transactionId: string,
    file: { name: string; contentType: string; content: string }
  ): Promise<unknown> {
    let response = await this.http.post(`/v1/transactions/${transactionId}/attachments`, file);
    return response.data;
  }

  // ── Agents ──

  async listAgents(): Promise<Agent[]> {
    let response = await this.http.get('/v1/agents');
    let data = response.data;
    return Array.isArray(data) ? (data as Agent[]) : ((data as { data: Agent[] }).data ?? []);
  }

  async getAgent(agentId: string): Promise<Agent> {
    let response = await this.http.get(`/v1/agents/${agentId}`);
    return response.data as Agent;
  }

  async createAgent(input: CreateAgentInput): Promise<Agent> {
    let response = await this.http.post('/v1/agents', input);
    return response.data as Agent;
  }

  async updateAgent(agentId: string, input: Partial<CreateAgentInput>): Promise<Agent> {
    let response = await this.http.patch(`/v1/agents/${agentId}`, input);
    return response.data as Agent;
  }

  async deleteAgent(agentId: string): Promise<void> {
    await this.http.delete(`/v1/agents/${agentId}`);
  }

  // ── Teams ──

  async listTeams(): Promise<Team[]> {
    let response = await this.http.get('/v1/teams');
    let data = response.data;
    return Array.isArray(data) ? (data as Team[]) : ((data as { data: Team[] }).data ?? []);
  }

  async getTeam(teamId: string): Promise<Team> {
    let response = await this.http.get(`/v1/teams/${teamId}`);
    return response.data as Team;
  }

  async createTeam(input: CreateTeamInput): Promise<Team> {
    let response = await this.http.post('/v1/teams', input);
    return response.data as Team;
  }

  async updateTeam(teamId: string, input: Partial<CreateTeamInput>): Promise<Team> {
    let response = await this.http.patch(`/v1/teams/${teamId}`, input);
    return response.data as Team;
  }

  async deleteTeam(teamId: string): Promise<void> {
    await this.http.delete(`/v1/teams/${teamId}`);
  }

  // ── Tags ──

  async listTags(): Promise<Tag[]> {
    let response = await this.http.get('/v1/tags');
    let data = response.data;
    return Array.isArray(data) ? (data as Tag[]) : ((data as { data: Tag[] }).data ?? []);
  }

  async getTag(tagId: string): Promise<Tag> {
    let response = await this.http.get(`/v1/tags/${tagId}`);
    return response.data as Tag;
  }

  async createTag(input: { name: string; teamIDs?: string[] }): Promise<Tag> {
    let response = await this.http.post('/v1/tags', input);
    return response.data as Tag;
  }

  async updateTag(tagId: string, input: { name?: string; teamIDs?: string[] }): Promise<Tag> {
    let response = await this.http.patch(`/v1/tags/${tagId}`, input);
    return response.data as Tag;
  }

  async deleteTag(tagId: string): Promise<void> {
    await this.http.delete(`/v1/tags/${tagId}`);
  }

  // ── Custom Fields ──

  async listCustomFields(): Promise<CustomField[]> {
    let response = await this.http.get('/v1/custom-fields');
    let data = response.data;
    return Array.isArray(data)
      ? (data as CustomField[])
      : ((data as { data: CustomField[] }).data ?? []);
  }

  async getCustomField(fieldId: string): Promise<CustomField> {
    let response = await this.http.get(`/v1/custom-fields/${fieldId}`);
    return response.data as CustomField;
  }

  async createCustomField(input: {
    name: string;
    type: string;
    editPermission?: string;
    teamIDs?: string[];
    active?: boolean;
  }): Promise<CustomField> {
    let response = await this.http.post('/v1/custom-fields', input);
    return response.data as CustomField;
  }

  async updateCustomField(
    fieldId: string,
    input: { name?: string; editPermission?: string; teamIDs?: string[]; active?: boolean }
  ): Promise<CustomField> {
    let response = await this.http.patch(`/v1/custom-fields/${fieldId}`, input);
    return response.data as CustomField;
  }

  async deleteCustomField(fieldId: string): Promise<void> {
    await this.http.delete(`/v1/custom-fields/${fieldId}`);
  }

  // ── Canned Responses ──

  async listCannedResponses(): Promise<CannedResponse[]> {
    let response = await this.http.get('/v1/canned-responses');
    let data = response.data;
    return Array.isArray(data)
      ? (data as CannedResponse[])
      : ((data as { data: CannedResponse[] }).data ?? []);
  }

  async getCannedResponse(responseId: string): Promise<CannedResponse> {
    let response = await this.http.get(`/v1/canned-responses/${responseId}`);
    return response.data as CannedResponse;
  }

  async createCannedResponse(input: {
    name: string;
    content: string;
    shortcut?: string;
    teamIDs?: string[];
  }): Promise<CannedResponse> {
    let response = await this.http.post('/v1/canned-responses', input);
    return response.data as CannedResponse;
  }

  async updateCannedResponse(
    responseId: string,
    input: { name?: string; content?: string; shortcut?: string; teamIDs?: string[] }
  ): Promise<CannedResponse> {
    let response = await this.http.patch(`/v1/canned-responses/${responseId}`, input);
    return response.data as CannedResponse;
  }

  async deleteCannedResponse(responseId: string): Promise<void> {
    await this.http.delete(`/v1/canned-responses/${responseId}`);
  }

  // ── Rules ──

  async listRules(): Promise<Rule[]> {
    let response = await this.http.get('/v1/rules');
    let data = response.data;
    return Array.isArray(data) ? (data as Rule[]) : ((data as { data: Rule[] }).data ?? []);
  }

  async getRule(ruleId: string): Promise<Rule> {
    let response = await this.http.get(`/v1/rules/${ruleId}`);
    return response.data as Rule;
  }

  async createRule(input: {
    name: string;
    active?: boolean;
    triggers?: unknown[];
    actions?: unknown[];
    order?: number;
  }): Promise<Rule> {
    let response = await this.http.post('/v1/rules', input);
    return response.data as Rule;
  }

  async updateRule(
    ruleId: string,
    input: {
      name?: string;
      active?: boolean;
      triggers?: unknown[];
      actions?: unknown[];
      order?: number;
    }
  ): Promise<Rule> {
    let response = await this.http.patch(`/v1/rules/${ruleId}`, input);
    return response.data as Rule;
  }

  async deleteRule(ruleId: string): Promise<void> {
    await this.http.delete(`/v1/rules/${ruleId}`);
  }

  // ── Macros ──

  async listMacros(): Promise<Macro[]> {
    let response = await this.http.get('/v1/macros');
    let data = response.data;
    return Array.isArray(data) ? (data as Macro[]) : ((data as { data: Macro[] }).data ?? []);
  }

  async getMacro(macroId: string): Promise<Macro> {
    let response = await this.http.get(`/v1/macros/${macroId}`);
    return response.data as Macro;
  }

  async createMacro(input: {
    name: string;
    visibility?: string;
    actions?: unknown[];
  }): Promise<Macro> {
    let response = await this.http.post('/v1/macros', input);
    return response.data as Macro;
  }

  async updateMacro(
    macroId: string,
    input: { name?: string; visibility?: string; actions?: unknown[] }
  ): Promise<Macro> {
    let response = await this.http.patch(`/v1/macros/${macroId}`, input);
    return response.data as Macro;
  }

  async deleteMacro(macroId: string): Promise<void> {
    await this.http.delete(`/v1/macros/${macroId}`);
  }

  // ── Views ──

  async listViews(): Promise<View[]> {
    let response = await this.http.get('/v1/views');
    let data = response.data;
    return Array.isArray(data) ? (data as View[]) : ((data as { data: View[] }).data ?? []);
  }

  async getView(viewId: string): Promise<View> {
    let response = await this.http.get(`/v1/views/${viewId}`);
    return response.data as View;
  }

  async createView(input: {
    name: string;
    visibility?: string;
    filters?: unknown;
  }): Promise<View> {
    let response = await this.http.post('/v1/views', input);
    return response.data as View;
  }

  async updateView(
    viewId: string,
    input: { name?: string; visibility?: string; filters?: unknown }
  ): Promise<View> {
    let response = await this.http.patch(`/v1/views/${viewId}`, input);
    return response.data as View;
  }

  async deleteView(viewId: string): Promise<void> {
    await this.http.delete(`/v1/views/${viewId}`);
  }

  // ── Webhooks ──

  async listWebhooks(): Promise<Webhook[]> {
    let response = await this.http.get('/v1/webhooks');
    let data = response.data;
    return Array.isArray(data)
      ? (data as Webhook[])
      : ((data as { data: Webhook[] }).data ?? []);
  }

  async getWebhook(webhookId: string): Promise<Webhook> {
    let response = await this.http.get(`/v1/webhooks/${webhookId}`);
    return response.data as Webhook;
  }

  async createWebhook(input: CreateWebhookInput): Promise<Webhook> {
    let response = await this.http.post('/v1/webhooks', input);
    return response.data as Webhook;
  }

  async updateWebhook(
    webhookId: string,
    input: Partial<CreateWebhookInput>
  ): Promise<Webhook> {
    let response = await this.http.patch(`/v1/webhooks/${webhookId}`, input);
    return response.data as Webhook;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.http.delete(`/v1/webhooks/${webhookId}`);
  }

  // ── Audit Log ──

  async queryAuditLog(params: AuditLogParams = {}): Promise<PaginatedResponse<AuditLogEntry>> {
    let query: Record<string, string> = {};
    if (params.action) query.action = params.action;
    if (params.entityType) query.entityType = params.entityType;
    if (params.authorType) query.authorType = params.authorType;
    if (params.authorID) query.authorID = params.authorID;
    if (params.createdFrom) query.createdFrom = params.createdFrom;
    if (params.createdTo) query.createdTo = params.createdTo;
    if (params.limit) query.limit = String(params.limit);
    if (params.pageAfter) query.pageAfter = params.pageAfter;

    let response = await this.http.get('/v1/auditlog', { params: query });
    return response.data as PaginatedResponse<AuditLogEntry>;
  }

  // ── Reports ──

  async getReport(reportType: string, params: ReportParams): Promise<unknown> {
    let query: Record<string, string> = {
      from: params.from,
      to: params.to
    };
    if (params.agentIDs && params.agentIDs.length > 0)
      query.agentIDs = params.agentIDs.join(',');
    if (params.teamIDs && params.teamIDs.length > 0) query.teamIDs = params.teamIDs.join(',');
    if (params.tags && params.tags.length > 0) query.tags = params.tags.join(',');
    if (params.priority) query.priority = params.priority;
    if (params.includeSpam !== undefined) query.includeSpam = String(params.includeSpam);

    let response = await this.http.get(`/v1/reports/${reportType}`, { params: query });
    return response.data;
  }

  // ── Mailboxes ──

  async listMailboxes(): Promise<unknown[]> {
    let response = await this.http.get('/v1/mailboxes');
    let data = response.data;
    return Array.isArray(data) ? data : ((data as { data: unknown[] }).data ?? []);
  }

  // ── Email Domains ──

  async listEmailDomains(): Promise<unknown[]> {
    let response = await this.http.get('/v1/email-domains');
    let data = response.data;
    return Array.isArray(data) ? data : ((data as { data: unknown[] }).data ?? []);
  }

  // ── Spam Management ──

  async listTrustedEmails(): Promise<unknown[]> {
    let response = await this.http.get('/v1/trusted-emails');
    let data = response.data;
    return Array.isArray(data) ? data : ((data as { data: unknown[] }).data ?? []);
  }

  async addTrustedEmail(email: string): Promise<unknown> {
    let response = await this.http.post('/v1/trusted-emails', { email });
    return response.data;
  }

  async removeTrustedEmail(emailId: string): Promise<void> {
    await this.http.delete(`/v1/trusted-emails/${emailId}`);
  }

  async listBlockedEmails(): Promise<unknown[]> {
    let response = await this.http.get('/v1/blocked-emails');
    let data = response.data;
    return Array.isArray(data) ? data : ((data as { data: unknown[] }).data ?? []);
  }

  async addBlockedEmail(email: string): Promise<unknown> {
    let response = await this.http.post('/v1/blocked-emails', { email });
    return response.data;
  }

  async removeBlockedEmail(emailId: string): Promise<void> {
    await this.http.delete(`/v1/blocked-emails/${emailId}`);
  }
}
