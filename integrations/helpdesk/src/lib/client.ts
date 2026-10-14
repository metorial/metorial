import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
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

const ticketPriorities = { low: -10, medium: 0, high: 10, urgent: 20 } as const;
type ApiTicketEvent = Omit<
  NonNullable<Ticket['events']>[number],
  'id' | 'createdAt' | 'author' | 'message' | 'attachments'
> & {
  ID: string;
  date: string;
  author?: { ID?: string; type?: string; name?: string; email?: string };
  message?: { text?: string; richTextHtml?: string | null; isPrivate?: boolean };
  attachments?: {
    isPrivate?: boolean;
    files?: Array<{
      token: string;
      cid?: string;
      name: string;
      type: string;
      size: number;
      url?: string;
    }>;
  };
};
type ApiTicket = Omit<
  Ticket,
  | 'id'
  | 'status'
  | 'priority'
  | 'teamID'
  | 'assigneeID'
  | 'tags'
  | 'ccRecipients'
  | 'parentTicketID'
  | 'childTicketIDs'
  | 'rating'
  | 'language'
  | 'spam'
  | 'events'
> & {
  ID: string;
  status: Exclude<Ticket['status'], 'on hold'> | 'onhold';
  priority: -10 | 0 | 10 | 20;
  assignment: { team: { ID: string }; agent?: { ID: string } | null };
  tagIDs?: string[];
  cc?: Array<{ email: string; name?: string }>;
  parentTicket?: { ID: string } | null;
  childTickets?: Array<{ ID: string }>;
  rating?: { rate: NonNullable<Ticket['rating']>['score']; comment?: string } | null;
  detectedLanguage?: string;
  spam?: { status?: boolean };
  events?: ApiTicketEvent[];
};

let normalizeTicket = (ticket: ApiTicket): Ticket => {
  let priority = (Object.keys(ticketPriorities) as Ticket['priority'][]).find(
    key => ticketPriorities[key] === ticket.priority
  );
  if (!priority || !ticket.ID || !ticket.assignment?.team?.ID) {
    throw createApiServiceError(
      'HelpDesk returned a ticket without a valid ID, priority, or assigned team.'
    );
  }
  return {
    ...ticket,
    id: ticket.ID,
    status: ticket.status === 'onhold' ? 'on hold' : ticket.status,
    priority,
    teamID: ticket.assignment.team.ID,
    assigneeID: ticket.assignment.agent?.ID,
    tags: ticket.tagIDs ?? [],
    followers: ticket.followers ?? [],
    ccRecipients: ticket.cc?.map(person => person.email),
    parentTicketID: ticket.parentTicket?.ID,
    childTicketIDs: ticket.childTickets?.map(child => child.ID),
    rating: ticket.rating
      ? { score: ticket.rating.rate, comment: ticket.rating.comment }
      : undefined,
    language: ticket.detectedLanguage,
    spam: ticket.spam?.status,
    events: ticket.events?.map(event => ({
      ...event,
      id: event.ID,
      createdAt: event.date,
      author: event.author ? { ...event.author, id: event.author.ID } : undefined,
      message: event.message
        ? { text: event.message.text, html: event.message.richTextHtml ?? undefined }
        : undefined,
      visibility: event.message
        ? event.message.isPrivate
          ? ('private' as const)
          : ('public' as const)
        : event.attachments
          ? event.attachments.isPrivate
            ? ('private' as const)
            : ('public' as const)
          : undefined,
      attachments: event.attachments?.files?.map(file => ({
        id: file.token,
        name: file.name,
        contentType: file.type,
        size: file.size,
        url: file.url
      }))
    }))
  };
};

let ticketPayload = (input: CreateTicketInput | UpdateTicketInput) =>
  pickDefined({
    subject: input.subject,
    requester: 'requester' in input ? input.requester : undefined,
    status: input.status === 'on hold' ? 'onhold' : input.status,
    priority: input.priority !== undefined ? ticketPriorities[input.priority] : undefined,
    assignment:
      input.teamID !== undefined || input.assigneeID !== undefined
        ? pickDefined({
            team: input.teamID !== undefined ? { ID: input.teamID } : undefined,
            agent: input.assigneeID !== undefined ? { ID: input.assigneeID } : undefined
          })
        : undefined,
    tagIDs: 'tags' in input ? input.tags : undefined,
    followers: 'followers' in input ? input.followers : undefined,
    cc: input.ccRecipients?.map(email => ({ email })),
    customFields: input.customFields,
    message: input.message,
    isPrivate: input.isPrivate,
    transactionID: input.transactionID
  });

let parseCursor = (value: string): { ID: string; value: string } => {
  try {
    let cursor: unknown = JSON.parse(atob(value));
    if (
      typeof cursor === 'object' &&
      cursor !== null &&
      'ID' in cursor &&
      'value' in cursor &&
      typeof cursor.ID === 'string' &&
      typeof cursor.value === 'string'
    ) {
      return { ID: cursor.ID, value: cursor.value };
    }
  } catch {
    // Invalid input is reported using the provider error contract below.
  }
  throw createApiServiceError('Use the pagination cursor returned by list_tickets.');
};

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    let isBasicAuth = config.token.startsWith('Basic ');
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.helpdesk.com',
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'HelpDesk',
          reason: 'helpdesk_api_error'
        }),
      headers: {
        Authorization: isBasicAuth ? config.token : `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'HelpDesk-Integration/1.0'
      }
    });
  }

  // ── Tickets ──

  async listTickets(params: ListTicketsParams = {}): Promise<PaginatedResponse<Ticket>> {
    if (params.limit !== undefined && !Number.isInteger(params.limit)) {
      throw createApiServiceError('limit must be a whole number between 1 and 100.');
    }
    let sortBy = params.sortBy ?? 'createdAt';
    if (!['createdAt', 'updatedAt', 'lastMessageAt'].includes(sortBy)) {
      throw createApiServiceError('sortBy must be createdAt, updatedAt, or lastMessageAt.');
    }
    let query = pickDefined({
      status: params.status === 'on hold' ? 'onhold' : params.status,
      'assignment.team.ID': params.teamID,
      'assignment.agent.ID': params.assigneeID,
      'tagIDs[]': params.tags?.join(','),
      'requester.email': params.requesterEmail,
      createdDateFrom: params.createdFrom,
      createdDateTo: params.createdTo,
      updatedDateFrom: params.updatedFrom,
      updatedDateTo: params.updatedTo,
      query: params.search,
      sortBy,
      order: params.sortOrder,
      pageSize: params.limit,
      silo: params.silo
    });
    let cursorQuery: Record<string, string> = {};
    if (params.pageAfter && params.pageBefore) {
      throw createApiServiceError('Provide either a next or previous ticket cursor.');
    }
    if (params.pageAfter || params.pageBefore) {
      let cursor = parseCursor(params.pageAfter ?? params.pageBefore ?? '');
      let direction = params.pageAfter ? 'next' : 'prev';
      cursorQuery[`${direction}.ID`] = cursor.ID;
      cursorQuery[`${direction}.value`] = cursor.value;
    }
    let response = await this.http.get<ApiTicket[]>('/v1/tickets', {
      params: { ...query, ...cursorQuery }
    });
    let data = response.data.map(normalizeTicket);
    let makeCursor = (ticket: Ticket | undefined) => {
      if (!ticket) return undefined;
      let value = ticket[sortBy as 'createdAt' | 'updatedAt' | 'lastMessageAt'];
      return value ? btoa(JSON.stringify({ ID: ticket.id, value })) : undefined;
    };
    return {
      data,
      pagination: {
        after: makeCursor(data.at(-1)),
        before: makeCursor(data[0]),
        hasMore: data.length === (params.limit ?? 20)
      }
    };
  }

  async getTicket(ticketId: string): Promise<Ticket> {
    let response = await this.http.get<ApiTicket>(
      `/v1/tickets/${encodeURIComponent(ticketId)}`
    );
    return normalizeTicket(response.data);
  }

  async createTicket(input: CreateTicketInput): Promise<Ticket> {
    if (!input.message?.text.trim()) {
      throw createApiServiceError(
        'Provide message with the first plain-text message to create a ticket.'
      );
    }
    let response = await this.http.post<ApiTicket>('/v1/tickets', ticketPayload(input));
    return normalizeTicket(response.data);
  }

  async updateTicket(ticketId: string, input: UpdateTicketInput): Promise<Ticket> {
    let response = await this.http.patch<ApiTicket>(
      `/v1/tickets/${encodeURIComponent(ticketId)}`,
      ticketPayload(input)
    );
    return normalizeTicket(response.data);
  }

  async deleteTicket(ticketId: string): Promise<void> {
    await this.http.delete(`/v1/tickets/${ticketId}`);
  }

  async addTicketTags(ticketId: string, tags: string[]): Promise<void> {
    await this.http.post(`/v1/tickets/${encodeURIComponent(ticketId)}/tags`, { tagIDs: tags });
  }

  async removeTicketTags(ticketId: string, tags: string[]): Promise<void> {
    for (let tagId of tags) {
      await this.http.delete(
        `/v1/tickets/${encodeURIComponent(ticketId)}/tags/${encodeURIComponent(tagId)}`
      );
    }
  }

  async addTicketFollowers(ticketId: string, agentIds: string[]): Promise<void> {
    await this.http.post(`/v1/tickets/${ticketId}/followers`, { followers: agentIds });
  }

  async removeTicketFollowers(ticketId: string, agentIds: string[]): Promise<void> {
    for (let agentId of agentIds) {
      await this.http.delete(
        `/v1/tickets/${encodeURIComponent(ticketId)}/followers/${encodeURIComponent(agentId)}`
      );
    }
  }

  async mergeTickets(parentTicketId: string, childTicketIds: string[]): Promise<void> {
    for (let childTicketID of childTicketIds) {
      await this.http.post(`/v1/tickets/${encodeURIComponent(parentTicketId)}/childTickets`, {
        childTicketID
      });
    }
  }

  async unmergeTicket(ticketId: string): Promise<void> {
    let ticket = await this.getTicket(ticketId);
    if (!ticket.parentTicketID) {
      throw createApiServiceError('The ticket has no parent ticket to unmerge from.');
    }
    await this.http.delete(
      `/v1/tickets/${encodeURIComponent(ticket.parentTicketID)}/childTickets/${encodeURIComponent(ticketId)}`
    );
  }

  async moveTicketToSilo(ticketId: string, silo: string): Promise<void> {
    await this.http.put(`/v1/tickets/${ticketId}/silo`, { silo });
  }

  async sendRatingRequest(ticketId: string): Promise<void> {
    await this.http.post(`/v1/tickets/${ticketId}/ratingRequests`);
  }

  async listLicenses(): Promise<
    Array<{
      ID: number;
      defaultTeamID?: string;
      settings?: { companyName?: string };
      createdAt?: string;
      updatedAt?: string;
    }>
  > {
    let response = await this.http.get('/v1/licenses');
    return response.data;
  }

  async listSavedViews(): Promise<
    Array<{
      ID: string;
      name: string;
      agentID?: string;
      filters?: Record<string, unknown>;
      createdAt?: string;
      updatedAt?: string;
    }>
  > {
    let response = await this.http.get('/v1/views');
    return response.data;
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
    let response = await this.http.get('/v1/customFields');
    let data = response.data;
    return Array.isArray(data)
      ? (data as CustomField[])
      : ((data as { data: CustomField[] }).data ?? []);
  }

  async getCustomField(fieldId: string): Promise<CustomField> {
    let response = await this.http.get(`/v1/customFields/${fieldId}`);
    return response.data as CustomField;
  }

  async createCustomField(input: {
    name: string;
    type: string;
    editPermission?: string;
    teamIDs?: string[];
    active?: boolean;
  }): Promise<CustomField> {
    let response = await this.http.post('/v1/customFields', input);
    return response.data as CustomField;
  }

  async updateCustomField(
    fieldId: string,
    input: { name?: string; editPermission?: string; teamIDs?: string[]; active?: boolean }
  ): Promise<CustomField> {
    let response = await this.http.patch(`/v1/customFields/${fieldId}`, input);
    return response.data as CustomField;
  }

  async deleteCustomField(fieldId: string): Promise<void> {
    await this.http.delete(`/v1/customFields/${fieldId}`);
  }

  // ── Canned Responses ──

  async listCannedResponses(): Promise<CannedResponse[]> {
    let response = await this.http.get('/v1/cannedResponses');
    let data = response.data;
    return Array.isArray(data)
      ? (data as CannedResponse[])
      : ((data as { data: CannedResponse[] }).data ?? []);
  }

  async getCannedResponse(responseId: string): Promise<CannedResponse> {
    let response = await this.http.get(`/v1/cannedResponses/${responseId}`);
    return response.data as CannedResponse;
  }

  async createCannedResponse(input: {
    name: string;
    content: string;
    shortcut?: string;
    teamIDs?: string[];
  }): Promise<CannedResponse> {
    let response = await this.http.post('/v1/cannedResponses', input);
    return response.data as CannedResponse;
  }

  async updateCannedResponse(
    responseId: string,
    input: { name?: string; content?: string; shortcut?: string; teamIDs?: string[] }
  ): Promise<CannedResponse> {
    let response = await this.http.patch(`/v1/cannedResponses/${responseId}`, input);
    return response.data as CannedResponse;
  }

  async deleteCannedResponse(responseId: string): Promise<void> {
    await this.http.delete(`/v1/cannedResponses/${responseId}`);
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

    let response = await this.http.get('/v1/auditLog', { params: query });
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
