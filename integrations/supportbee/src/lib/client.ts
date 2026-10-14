import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import type {
  AuditEntry,
  Comment,
  Email,
  Label,
  Reply,
  Snippet,
  Team,
  Ticket,
  User
} from './types';

export class Client {
  private http;

  constructor(config: { token: string; companySubdomain: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('A SupportBee API token is required.');
    }
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(config.companySubdomain)) {
      throw createApiServiceError(
        'Enter only your SupportBee company subdomain, such as "example" from example.supportbee.com.'
      );
    }
    this.http = createAuthenticatedAxios({
      baseURL: `https://${config.companySubdomain}.supportbee.com`,
      authHeader: { value: `Bearer ${config.token}` },
      headers: {
        Accept: 'application/json'
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'SupportBee',
          reason: 'supportbee_api_error'
        })
    });
  }

  // ─── Tickets ────────────────────────────────────────────

  async listTickets(
    options: {
      perPage?: number;
      page?: number;
      archived?: boolean | 'any';
      spam?: boolean;
      trash?: boolean;
      replies?: boolean;
      maxReplies?: number;
      assignedUser?: string;
      assignedTeam?: string;
      starred?: boolean;
      label?: string;
      since?: string;
      until?: string;
      sortBy?: string;
      requesterEmails?: string[];
    } = {}
  ): Promise<{ tickets: Ticket[]; total: number; totalPages: number; currentPage: number }> {
    this.validatePagination(options);
    if (
      options.maxReplies !== undefined &&
      (!Number.isInteger(options.maxReplies) ||
        options.maxReplies < 0 ||
        options.replies === false)
    ) {
      throw createApiServiceError(
        'maxReplies must be a non-negative whole number and cannot be used with replies set to false.'
      );
    }
    let response = await this.http.get('/tickets', {
      params: pickDefined({
        per_page: options.perPage,
        page: options.page,
        archived: options.archived,
        spam: options.spam,
        trash: options.trash,
        replies: options.replies,
        max_replies: options.maxReplies,
        assigned_user: options.assignedUser,
        assigned_team: options.assignedTeam,
        starred: options.starred,
        label: options.label,
        since: options.since,
        until: options.until,
        sort_by: options.sortBy,
        requester_emails: options.requesterEmails?.join(',')
      })
    });
    let data = response.data;
    return {
      tickets: (data.tickets || []).map(mapTicket),
      total: data.total || 0,
      totalPages: data.total_pages || 0,
      currentPage: data.current_page || 1
    };
  }

  async getTicket(ticketId: number): Promise<Ticket> {
    let response = await this.http.get(`/tickets/${ticketId}`, {
      params: {}
    });
    return mapTicket(response.data.ticket);
  }

  async searchTickets(
    query: string,
    options: {
      perPage?: number;
      page?: number;
      spam?: boolean;
      trash?: boolean;
    } = {}
  ): Promise<{ tickets: Ticket[]; total: number }> {
    this.validatePagination(options);
    if (!query.trim()) throw createApiServiceError('Provide a non-empty ticket search query.');
    let response = await this.http.get('/tickets/search', {
      params: pickDefined({
        query,
        per_page: options.perPage,
        page: options.page,
        spam: options.spam,
        trash: options.trash
      })
    });
    let data = response.data;
    return {
      tickets: (data.tickets || []).map(mapTicket),
      total: data.total || 0
    };
  }

  async createTicket(ticket: {
    subject: string;
    requesterEmail: string;
    requesterName?: string;
    contentText?: string;
    contentHtml?: string;
    attachmentIds?: number[];
    cc?: string[];
    bcc?: string[];
    notify?: boolean;
    forwardingAddressId?: number;
  }): Promise<Ticket> {
    if (!ticket.subject.trim() || !ticket.requesterEmail.trim()) {
      throw createApiServiceError('Provide a ticket subject and requester email.');
    }
    if (
      !ticket.contentText?.trim() &&
      !ticket.contentHtml?.trim() &&
      !ticket.attachmentIds?.length
    ) {
      throw createApiServiceError(
        'Provide ticket content or at least one uploaded attachment ID.'
      );
    }
    if (
      ticket.forwardingAddressId !== undefined &&
      (!Number.isInteger(ticket.forwardingAddressId) || ticket.forwardingAddressId < 1)
    ) {
      throw createApiServiceError(
        'forwardingAddressId must be a positive whole number from list_emails.'
      );
    }
    let body: any = {
      ticket: {
        subject: ticket.subject,
        requester_email: ticket.requesterEmail,
        requester_name: ticket.requesterName,
        forwarding_address_id: ticket.forwardingAddressId,
        content: {
          text: ticket.contentText,
          html: ticket.contentHtml,
          attachment_ids: ticket.attachmentIds
        }
      }
    };
    if (ticket.cc) body.ticket.cc = ticket.cc;
    if (ticket.bcc) body.ticket.bcc = ticket.bcc;
    if (ticket.notify !== undefined) body.ticket.notify_requester = ticket.notify;

    let response = await this.http.post('/tickets', body, {
      params: {}
    });
    return mapTicket(response.data.ticket ?? response.data);
  }

  async archiveTicket(ticketId: number): Promise<void> {
    await this.http.post(
      `/tickets/${ticketId}/archive`,
      {},
      {
        params: {}
      }
    );
  }

  async unarchiveTicket(ticketId: number): Promise<void> {
    await this.http.delete(`/tickets/${ticketId}/archive`, {
      params: {}
    });
  }

  async trashTicket(ticketId: number): Promise<void> {
    await this.http.post(
      `/tickets/${ticketId}/trash`,
      {},
      {
        params: {}
      }
    );
  }

  async untrashTicket(ticketId: number): Promise<void> {
    await this.http.delete(`/tickets/${ticketId}/trash`, {
      params: {}
    });
  }

  async markSpam(ticketId: number): Promise<void> {
    await this.http.post(
      `/tickets/${ticketId}/spam`,
      {},
      {
        params: {}
      }
    );
  }

  async unmarkSpam(ticketId: number): Promise<void> {
    await this.http.delete(`/tickets/${ticketId}/spam`, {
      params: {}
    });
  }

  async markAnswered(ticketId: number): Promise<void> {
    await this.http.post(
      `/tickets/${ticketId}/answered`,
      {},
      {
        params: {}
      }
    );
  }

  async markUnanswered(ticketId: number): Promise<void> {
    await this.http.delete(`/tickets/${ticketId}/answered`, {
      params: {}
    });
  }

  async starTicket(ticketId: number): Promise<void> {
    await this.http.post(
      `/tickets/${ticketId}/star`,
      {},
      {
        params: {}
      }
    );
  }

  async unstarTicket(ticketId: number): Promise<void> {
    await this.http.delete(`/tickets/${ticketId}/star`, {
      params: {}
    });
  }

  async deleteTicket(ticketId: number): Promise<void> {
    await this.http.delete(`/tickets/${ticketId}`, {
      params: {}
    });
  }

  // ─── Replies ────────────────────────────────────────────

  async listReplies(ticketId: number): Promise<Reply[]> {
    let response = await this.http.get(`/tickets/${ticketId}/replies`, {
      params: {}
    });
    return (response.data.replies || []).map(mapReply);
  }

  async getReply(ticketId: number, replyId: number): Promise<Reply> {
    let response = await this.http.get(`/tickets/${ticketId}/replies/${replyId}`, {
      params: {}
    });
    return mapReply(response.data.reply);
  }

  async createReply(
    ticketId: number,
    reply: {
      contentHtml?: string;
      contentText?: string;
      attachmentIds?: number[];
      cc?: string[];
      bcc?: string[];
      onBehalfOfId?: number;
      onBehalfOfEmail?: string;
    }
  ): Promise<Reply> {
    if (
      !reply.contentText?.trim() &&
      !reply.contentHtml?.trim() &&
      !reply.attachmentIds?.length
    ) {
      throw createApiServiceError(
        'Provide reply content or at least one uploaded attachment ID.'
      );
    }
    let body: any = {
      reply: {
        content: {
          html: reply.contentHtml,
          text: reply.contentText,
          attachment_ids: reply.attachmentIds
        }
      }
    };
    if (reply.cc) body.reply.cc = reply.cc;
    if (reply.bcc) body.reply.bcc = reply.bcc;
    if (reply.onBehalfOfId || reply.onBehalfOfEmail) {
      body.reply.on_behalf_of = {};
      if (reply.onBehalfOfId) body.reply.on_behalf_of.id = reply.onBehalfOfId;
      if (reply.onBehalfOfEmail) body.reply.on_behalf_of.email = reply.onBehalfOfEmail;
    }

    let response = await this.http.post(`/tickets/${ticketId}/replies`, body, {
      params: {}
    });
    return mapReply(response.data.reply);
  }

  // ─── Comments ───────────────────────────────────────────

  async listComments(ticketId: number): Promise<Comment[]> {
    let response = await this.http.get(`/tickets/${ticketId}/comments`, {
      params: {}
    });
    return (response.data.comments || []).map(mapComment);
  }

  async createComment(
    ticketId: number,
    comment: {
      contentText?: string;
      contentHtml?: string;
      attachmentIds?: number[];
    }
  ): Promise<Comment> {
    if (
      !comment.contentText?.trim() &&
      !comment.contentHtml?.trim() &&
      !comment.attachmentIds?.length
    ) {
      throw createApiServiceError(
        'Provide comment content or at least one uploaded attachment ID.'
      );
    }
    let body = {
      comment: {
        content: {
          text: comment.contentText,
          html: comment.contentHtml,
          attachment_ids: comment.attachmentIds
        }
      }
    };
    let response = await this.http.post(`/tickets/${ticketId}/comments`, body, {
      params: {}
    });
    return mapComment(response.data.comment);
  }

  // ─── Assignments ────────────────────────────────────────

  async assignToUser(ticketId: number, userId: number): Promise<void> {
    await this.http.post(
      `/tickets/${ticketId}/user_assignment`,
      {
        user_assignment: { user_id: userId }
      },
      { params: {} }
    );
  }

  async unassignUser(ticketId: number): Promise<void> {
    await this.http.delete(`/tickets/${ticketId}/user_assignment`, {
      params: {}
    });
  }

  async assignToTeam(ticketId: number, teamId: number): Promise<void> {
    await this.http.post(
      `/tickets/${ticketId}/team_assignment`,
      {
        team_assignment: { team_id: teamId }
      },
      { params: {} }
    );
  }

  async unassignTeam(ticketId: number): Promise<void> {
    await this.http.delete(`/tickets/${ticketId}/team_assignment`, {
      params: {}
    });
  }

  // ─── Labels ─────────────────────────────────────────────

  async listLabels(): Promise<Label[]> {
    let response = await this.http.get('/labels', {
      params: {}
    });
    return (response.data.labels || []).map(mapLabel);
  }

  async addLabel(ticketId: number, labelName: string): Promise<void> {
    await this.http.post(
      `/tickets/${ticketId}/labels/${encodeURIComponent(labelName)}`,
      {},
      {
        params: {}
      }
    );
  }

  async removeLabel(ticketId: number, labelName: string): Promise<void> {
    await this.http.delete(`/tickets/${ticketId}/labels/${encodeURIComponent(labelName)}`, {
      params: {}
    });
  }

  // ─── Users ──────────────────────────────────────────────

  async listUsers(
    options: { withInvited?: boolean; withRoles?: string; type?: string } = {}
  ): Promise<User[]> {
    let response = await this.http.get('/users', {
      params: pickDefined({
        with_invited: options.withInvited,
        with_roles: options.withRoles,
        type: options.type
      })
    });
    return (response.data.users || []).map(mapUser);
  }

  async getUser(userId: number, options: { maxTickets?: number } = {}): Promise<User> {
    let response = await this.http.get(`/users/${userId}`, {
      params: pickDefined({ max_tickets: options.maxTickets })
    });
    return mapUser(response.data.user);
  }

  async getTicketAudit(ticketId: number): Promise<AuditEntry[]> {
    let response = await this.http.get(`/tickets/${ticketId}/audit`);
    if (!Array.isArray(response.data?.audit)) {
      throw createApiServiceError('SupportBee returned an unexpected ticket audit response.');
    }
    return response.data.audit.map((entry: any) => {
      if (!entry || typeof entry.action !== 'string') {
        throw createApiServiceError(
          'SupportBee returned a ticket audit entry without an action.'
        );
      }
      return {
        action: entry.action,
        actor: entry.actor
          ? {
              name: entry.actor.name ?? undefined,
              imageUrl: entry.actor.profile_picture_url ?? undefined
            }
          : undefined,
        url: entry.url ?? undefined,
        severity: entry.severity ?? undefined,
        happenedAt: entry.happened_at ?? undefined
      };
    });
  }

  // ─── Teams ──────────────────────────────────────────────

  async listTeams(options: { withUsers?: boolean } = {}): Promise<Team[]> {
    let response = await this.http.get('/teams', {
      params: pickDefined({
        with_users: options.withUsers
      })
    });
    return (response.data.teams || []).map(mapTeam);
  }

  // ─── Snippets ───────────────────────────────────────────

  async listSnippets(): Promise<Snippet[]> {
    let response = await this.http.get('/snippets', {
      params: {}
    });
    return (response.data.snippets || []).map(mapSnippet);
  }

  async createSnippet(snippet: {
    name: string;
    tags?: string;
    contentText?: string;
    contentHtml?: string;
  }): Promise<Snippet> {
    let body = {
      snippet: {
        name: snippet.name,
        tags: snippet.tags,
        content: {
          text: snippet.contentText,
          html: snippet.contentHtml
        }
      }
    };
    let response = await this.http.post('/snippets', body, {
      params: {}
    });
    return mapSnippet(response.data.snippet);
  }

  async updateSnippet(
    snippetId: number,
    snippet: {
      name?: string;
      tags?: string;
      contentText?: string;
      contentHtml?: string;
    }
  ): Promise<Snippet> {
    let body: any = { snippet: {} };
    if (snippet.name !== undefined) body.snippet.name = snippet.name;
    if (snippet.tags !== undefined) body.snippet.tags = snippet.tags;
    if (snippet.contentText !== undefined || snippet.contentHtml !== undefined) {
      body.snippet.content = {};
      if (snippet.contentText !== undefined) body.snippet.content.text = snippet.contentText;
      if (snippet.contentHtml !== undefined) body.snippet.content.html = snippet.contentHtml;
    }
    let response = await this.http.put(`/snippets/${snippetId}`, body, {
      params: {}
    });
    return mapSnippet(response.data.snippet);
  }

  async deleteSnippet(snippetId: number): Promise<void> {
    await this.http.delete(`/snippets/${snippetId}`, {
      params: {}
    });
  }

  // ─── Emails ─────────────────────────────────────────────

  async listEmails(): Promise<Email[]> {
    let response = await this.http.get('/emails', {
      params: {}
    });
    let emails = response.data?.forwarding_addresses ?? response.data?.emails;
    if (!Array.isArray(emails)) {
      throw createApiServiceError(
        'SupportBee returned an unexpected forwarding address response.'
      );
    }
    return emails.map(mapEmail);
  }

  async createEmail(email: string, name?: string): Promise<Email> {
    let body = { forwarding_address: pickDefined({ email, name }) };
    let response = await this.http.post('/emails', body, {
      params: {}
    });
    return mapEmail(response.data.forwarding_address ?? response.data.email);
  }

  // ─── Reports ────────────────────────────────────────────

  async getAvgFirstResponseTime(
    options: { user?: string; team?: string; label?: string; since?: string } = {}
  ): Promise<any> {
    let response = await this.http.get('/reports/avg_first_response_time', {
      params: pickDefined({
        user: options.user,
        team: options.team,
        label: options.label,
        since: options.since
      })
    });
    return response.data;
  }

  async getTicketsCount(
    options: { user?: string; team?: string; label?: string; since?: string } = {}
  ): Promise<any> {
    let response = await this.http.get('/reports/tickets_count', {
      params: pickDefined({
        user: options.user,
        team: options.team,
        label: options.label,
        since: options.since
      })
    });
    return response.data;
  }

  async getRepliesCount(
    options: { user?: string; team?: string; label?: string; since?: string } = {}
  ): Promise<any> {
    let response = await this.http.get('/reports/replies_count', {
      params: pickDefined({
        user: options.user,
        team: options.team,
        label: options.label,
        since: options.since
      })
    });
    return response.data;
  }

  private validatePagination(options: { perPage?: number; page?: number }) {
    if (
      options.perPage !== undefined &&
      (!Number.isInteger(options.perPage) || options.perPage < 1 || options.perPage >= 100)
    ) {
      throw createApiServiceError('perPage must be a whole number between 1 and 99.');
    }
    if (options.page !== undefined && (!Number.isInteger(options.page) || options.page < 1)) {
      throw createApiServiceError('page must be a positive whole number.');
    }
  }
}

// ─── Mappers ────────────────────────────────────────────

function mapTicket(raw: any): Ticket {
  if (!raw || typeof raw.id !== 'number') {
    throw createApiServiceError('SupportBee returned a ticket without a numeric ID.');
  }
  let userAssignee = raw.current_user_assignee ?? raw.current_user_asignee;
  let teamAssignee = raw.current_team_assignee ?? raw.current_team_asignee;
  return {
    ticketId: raw.id,
    subject: raw.subject || '',
    repliesCount: raw.replies_count ?? undefined,
    commentsCount: raw.comments_count ?? undefined,
    archived: raw.archived ?? undefined,
    spam: raw.spam ?? undefined,
    trash: raw.trash ?? undefined,
    starred: raw.starred ?? undefined,
    unanswered: raw.unanswered ?? undefined,
    createdAt: raw.created_at ?? undefined,
    lastActivityAt: raw.last_activity_at ?? undefined,
    requester: raw.requester
      ? {
          userId: raw.requester.id ?? undefined,
          email: raw.requester.email ?? undefined,
          name: raw.requester.name ?? undefined
        }
      : undefined,
    currentUserAssignee: userAssignee ? mapUser(userAssignee) : undefined,
    currentTeamAssignee: teamAssignee
      ? {
          teamId: teamAssignee.id ?? teamAssignee.team?.id,
          name: teamAssignee.name ?? teamAssignee.team?.name ?? undefined
        }
      : undefined,
    labels: raw.labels ? raw.labels.map(mapLabel) : undefined,
    content: mapContent(raw.content)
  };
}

function mapReply(raw: any): Reply {
  if (!raw || typeof raw.id !== 'number') {
    throw createApiServiceError('SupportBee returned a reply without a numeric ID.');
  }
  return {
    replyId: raw.id,
    createdAt: raw.created_at ?? undefined,
    summary: raw.summary ?? undefined,
    cc: raw.cc ?? undefined,
    bcc: raw.bcc ?? undefined,
    replier: raw.replier ? mapUser(raw.replier) : undefined,
    content: mapContent(raw.content)
  };
}

function mapComment(raw: any): Comment {
  if (!raw || typeof raw.id !== 'number') {
    throw createApiServiceError('SupportBee returned a comment without a numeric ID.');
  }
  return {
    commentId: raw.id,
    createdAt: raw.created_at ?? undefined,
    commenter: raw.commenter ? mapUser(raw.commenter) : undefined,
    content: mapContent(raw.content)
  };
}

function mapUser(raw: any): User {
  if (!raw || typeof raw.id !== 'number') {
    throw createApiServiceError('SupportBee returned a user without a numeric ID.');
  }
  let picture = Array.isArray(raw.picture) ? raw.picture[0] : raw.picture;
  return {
    userId: raw.id,
    email: raw.email || '',
    firstName: raw.first_name ?? undefined,
    lastName: raw.last_name ?? undefined,
    name: raw.name ?? undefined,
    role: raw.role ?? undefined,
    agent: raw.agent ?? undefined,
    imageUrl: picture?.thumb64 ?? picture?.thumb128 ?? picture?.thum128 ?? undefined
  };
}

function mapTeam(raw: any): Team {
  return {
    teamId: raw.id,
    name: raw.name || ''
  };
}

function mapLabel(raw: any): Label {
  return {
    name: typeof raw === 'string' ? raw : raw.name || raw.label || '',
    color: raw.color ?? undefined
  };
}

function mapSnippet(raw: any): Snippet {
  return {
    snippetId: raw.id,
    name: raw.name || '',
    tags: raw.tags ?? undefined,
    createdAt: raw.created_at ?? undefined,
    content: raw.content
      ? {
          text: raw.content.text ?? undefined,
          html: raw.content.html ?? undefined
        }
      : undefined
  };
}

function mapEmail(raw: any): Email {
  if (!raw || typeof raw.id !== 'number') {
    throw createApiServiceError(
      'SupportBee returned a forwarding address without a numeric ID.'
    );
  }
  return {
    emailId: raw.id,
    email: raw.from ?? raw.email ?? '',
    name: raw.name ?? undefined,
    forwardingTo: raw.forward_to ?? undefined,
    isDefault: raw.is_default ?? undefined,
    createdAt: raw.created_at ?? undefined
  };
}

function mapContent(raw: any) {
  return raw
    ? {
        text: raw.text ?? raw.body ?? undefined,
        html: raw.html ?? undefined,
        attachments: raw.attachments ?? undefined
      }
    : undefined;
}
