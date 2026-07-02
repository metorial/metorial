import { createAxios } from 'slates';
import type { Comment, Email, Label, Reply, Snippet, Team, Ticket, User } from './types';

export class Client {
  private token: string;
  private baseUrl: string;
  private http;

  constructor(config: { token: string; companySubdomain: string }) {
    this.token = config.token;
    this.baseUrl = `https://${config.companySubdomain}.supportbee.com`;
    this.http = createAxios({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  private params(extra: Record<string, any> = {}): Record<string, any> {
    let result: Record<string, any> = { auth_token: this.token };
    for (let [key, value] of Object.entries(extra)) {
      if (value !== undefined && value !== null) {
        result[key] = value;
      }
    }
    return result;
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
      assignedUser?: string;
      assignedTeam?: string;
      starred?: boolean;
      label?: string;
      since?: string;
      until?: string;
      sortBy?: string;
    } = {}
  ): Promise<{ tickets: Ticket[]; total: number; totalPages: number; currentPage: number }> {
    let response = await this.http.get('/tickets', {
      params: this.params({
        per_page: options.perPage,
        page: options.page,
        archived: options.archived,
        spam: options.spam,
        trash: options.trash,
        replies: options.replies,
        assigned_user: options.assignedUser,
        assigned_team: options.assignedTeam,
        starred: options.starred,
        label: options.label,
        since: options.since,
        until: options.until,
        sort_by: options.sortBy
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
      params: this.params()
    });
    return mapTicket(response.data.ticket);
  }

  async searchTickets(
    query: string,
    options: {
      perPage?: number;
      page?: number;
    } = {}
  ): Promise<{ tickets: Ticket[]; total: number }> {
    let response = await this.http.get('/tickets/search', {
      params: this.params({
        query,
        per_page: options.perPage,
        page: options.page
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
    contentText?: string;
    contentHtml?: string;
    attachmentIds?: number[];
    cc?: string[];
    bcc?: string[];
    notify?: boolean;
  }): Promise<Ticket> {
    let body: any = {
      ticket: {
        subject: ticket.subject,
        requester_email: ticket.requesterEmail,
        content: {
          text: ticket.contentText,
          html: ticket.contentHtml,
          attachment_ids: ticket.attachmentIds
        }
      }
    };
    if (ticket.cc) body.ticket.cc = ticket.cc;
    if (ticket.bcc) body.ticket.bcc = ticket.bcc;
    if (ticket.notify !== undefined) body.ticket.notify = ticket.notify;

    let response = await this.http.post('/tickets', body, {
      params: this.params()
    });
    return mapTicket(response.data.ticket);
  }

  async archiveTicket(ticketId: number): Promise<void> {
    await this.http.post(
      `/tickets/${ticketId}/archive`,
      {},
      {
        params: this.params()
      }
    );
  }

  async unarchiveTicket(ticketId: number): Promise<void> {
    await this.http.delete(`/tickets/${ticketId}/archive`, {
      params: this.params()
    });
  }

  async trashTicket(ticketId: number): Promise<void> {
    await this.http.post(
      `/tickets/${ticketId}/trash`,
      {},
      {
        params: this.params()
      }
    );
  }

  async untrashTicket(ticketId: number): Promise<void> {
    await this.http.delete(`/tickets/${ticketId}/trash`, {
      params: this.params()
    });
  }

  async markSpam(ticketId: number): Promise<void> {
    await this.http.post(
      `/tickets/${ticketId}/spam`,
      {},
      {
        params: this.params()
      }
    );
  }

  async unmarkSpam(ticketId: number): Promise<void> {
    await this.http.delete(`/tickets/${ticketId}/spam`, {
      params: this.params()
    });
  }

  async markAnswered(ticketId: number): Promise<void> {
    await this.http.post(
      `/tickets/${ticketId}/answered`,
      {},
      {
        params: this.params()
      }
    );
  }

  async markUnanswered(ticketId: number): Promise<void> {
    await this.http.delete(`/tickets/${ticketId}/answered`, {
      params: this.params()
    });
  }

  async starTicket(ticketId: number): Promise<void> {
    await this.http.post(
      `/tickets/${ticketId}/star`,
      {},
      {
        params: this.params()
      }
    );
  }

  async unstarTicket(ticketId: number): Promise<void> {
    await this.http.delete(`/tickets/${ticketId}/star`, {
      params: this.params()
    });
  }

  async deleteTicket(ticketId: number): Promise<void> {
    await this.http.delete(`/tickets/${ticketId}`, {
      params: this.params()
    });
  }

  // ─── Replies ────────────────────────────────────────────

  async listReplies(ticketId: number): Promise<Reply[]> {
    let response = await this.http.get(`/tickets/${ticketId}/replies`, {
      params: this.params()
    });
    return (response.data.replies || []).map(mapReply);
  }

  async getReply(ticketId: number, replyId: number): Promise<Reply> {
    let response = await this.http.get(`/tickets/${ticketId}/replies/${replyId}`, {
      params: this.params()
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
      params: this.params()
    });
    return mapReply(response.data.reply);
  }

  // ─── Comments ───────────────────────────────────────────

  async listComments(ticketId: number): Promise<Comment[]> {
    let response = await this.http.get(`/tickets/${ticketId}/comments`, {
      params: this.params()
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
      params: this.params()
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
      { params: this.params() }
    );
  }

  async unassignUser(ticketId: number): Promise<void> {
    await this.http.delete(`/tickets/${ticketId}/user_assignment`, {
      params: this.params()
    });
  }

  async assignToTeam(ticketId: number, teamId: number): Promise<void> {
    await this.http.post(
      `/tickets/${ticketId}/team_assignment`,
      {
        team_assignment: { team_id: teamId }
      },
      { params: this.params() }
    );
  }

  async unassignTeam(ticketId: number): Promise<void> {
    await this.http.delete(`/tickets/${ticketId}/team_assignment`, {
      params: this.params()
    });
  }

  // ─── Labels ─────────────────────────────────────────────

  async listLabels(): Promise<Label[]> {
    let response = await this.http.get('/labels', {
      params: this.params()
    });
    return (response.data.labels || []).map(mapLabel);
  }

  async addLabel(ticketId: number, labelName: string): Promise<void> {
    await this.http.post(
      `/tickets/${ticketId}/labels/${encodeURIComponent(labelName)}`,
      {},
      {
        params: this.params()
      }
    );
  }

  async removeLabel(ticketId: number, labelName: string): Promise<void> {
    await this.http.delete(`/tickets/${ticketId}/labels/${encodeURIComponent(labelName)}`, {
      params: this.params()
    });
  }

  // ─── Users ──────────────────────────────────────────────

  async listUsers(
    options: { withInvited?: boolean; withRoles?: string; type?: string } = {}
  ): Promise<User[]> {
    let response = await this.http.get('/users', {
      params: this.params({
        with_invited: options.withInvited,
        with_roles: options.withRoles,
        type: options.type
      })
    });
    return (response.data.users || []).map(mapUser);
  }

  async getUser(userId: number, options: { maxTickets?: number } = {}): Promise<User> {
    let response = await this.http.get(`/users/${userId}`, {
      params: this.params({ max_tickets: options.maxTickets })
    });
    return mapUser(response.data.user);
  }

  // ─── Teams ──────────────────────────────────────────────

  async listTeams(options: { withUsers?: boolean } = {}): Promise<Team[]> {
    let response = await this.http.get('/teams', {
      params: this.params({
        with_users: options.withUsers
      })
    });
    return (response.data.teams || []).map(mapTeam);
  }

  // ─── Snippets ───────────────────────────────────────────

  async listSnippets(): Promise<Snippet[]> {
    let response = await this.http.get('/snippets', {
      params: this.params()
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
      params: this.params()
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
      params: this.params()
    });
    return mapSnippet(response.data.snippet);
  }

  async deleteSnippet(snippetId: number): Promise<void> {
    await this.http.delete(`/snippets/${snippetId}`, {
      params: this.params()
    });
  }

  // ─── Emails ─────────────────────────────────────────────

  async listEmails(): Promise<Email[]> {
    let response = await this.http.get('/emails', {
      params: this.params()
    });
    return (response.data.emails || []).map(mapEmail);
  }

  async createEmail(email: string, name?: string): Promise<Email> {
    let body: any = { email: { email } };
    if (name) body.email.name = name;
    let response = await this.http.post('/emails', body, {
      params: this.params()
    });
    return mapEmail(response.data.email);
  }

  // ─── Reports ────────────────────────────────────────────

  async getAvgFirstResponseTime(
    options: { user?: string; team?: string; label?: string; since?: string } = {}
  ): Promise<any> {
    let response = await this.http.get('/reports/avg_first_response_time', {
      params: this.params({
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
      params: this.params({
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
      params: this.params({
        user: options.user,
        team: options.team,
        label: options.label,
        since: options.since
      })
    });
    return response.data;
  }
}

// ─── Mappers ────────────────────────────────────────────

function mapTicket(raw: any): Ticket {
  return {
    ticketId: raw.id,
    subject: raw.subject || '',
    repliesCount: raw.replies_count,
    commentsCount: raw.comments_count,
    archived: raw.archived,
    spam: raw.spam,
    trash: raw.trash,
    starred: raw.starred,
    unanswered: raw.unanswered,
    createdAt: raw.created_at,
    lastActivityAt: raw.last_activity_at,
    requester: raw.requester
      ? {
          userId: raw.requester.id,
          email: raw.requester.email,
          name: raw.requester.name
        }
      : undefined,
    currentUserAssignee: raw.current_user_assignee
      ? mapUser(raw.current_user_assignee)
      : undefined,
    currentTeamAssignee: raw.current_team_assignee
      ? {
          teamId: raw.current_team_assignee.id || raw.current_team_assignee.team?.id,
          name: raw.current_team_assignee.name || raw.current_team_assignee.team?.name
        }
      : undefined,
    labels: raw.labels ? raw.labels.map(mapLabel) : undefined,
    content: raw.content
      ? {
          text: raw.content.text || raw.content.body,
          html: raw.content.html,
          attachments: raw.content.attachments
        }
      : undefined
  };
}

function mapReply(raw: any): Reply {
  return {
    replyId: raw.id,
    createdAt: raw.created_at,
    summary: raw.summary,
    cc: raw.cc,
    bcc: raw.bcc,
    replier: raw.replier ? mapUser(raw.replier) : undefined,
    content: raw.content
      ? {
          text: raw.content.text || raw.content.body,
          html: raw.content.html,
          attachments: raw.content.attachments
        }
      : undefined
  };
}

function mapComment(raw: any): Comment {
  return {
    commentId: raw.id,
    createdAt: raw.created_at,
    commenter: raw.commenter ? mapUser(raw.commenter) : undefined,
    content: raw.content
      ? {
          text: raw.content.text,
          html: raw.content.html,
          attachments: raw.content.attachments
        }
      : undefined
  };
}

function mapUser(raw: any): User {
  return {
    userId: raw.id,
    email: raw.email || '',
    firstName: raw.first_name,
    lastName: raw.last_name,
    name: raw.name,
    role: raw.role,
    agent: raw.agent,
    imageUrl: raw.picture?.thumb64 || raw.picture?.thumb128
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
    name: raw.name || raw.label || '',
    color: raw.color
  };
}

function mapSnippet(raw: any): Snippet {
  return {
    snippetId: raw.id,
    name: raw.name || '',
    tags: raw.tags,
    createdAt: raw.created_at,
    content: raw.content
      ? {
          text: raw.content.text,
          html: raw.content.html
        }
      : undefined
  };
}

function mapEmail(raw: any): Email {
  return {
    emailId: raw.id,
    email: raw.email || '',
    name: raw.name,
    isDefault: raw.is_default,
    createdAt: raw.created_at
  };
}
