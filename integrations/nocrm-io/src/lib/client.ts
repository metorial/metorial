import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface ClientConfig {
  subdomain: string;
  token: string;
  tokenType?: 'api_key' | 'user_token';
}

export class Client {
  private ax: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: ClientConfig) {
    this.ax = createAuthenticatedAxios({
      baseURL: `https://${config.subdomain}.nocrm.io/api/v2`,
      authHeader: {
        name: config.tokenType === 'user_token' ? 'X-USER-TOKEN' : 'X-API-KEY',
        value: config.token
      },
      errorAdapter: error =>
        buildApiServiceError(error, { providerLabel: 'noCRM.io', reason: 'nocrm_api_error' })
    });
  }

  static fromContext(ctx: {
    auth: { token: string; subdomain?: string; tokenType?: 'api_key' | 'user_token' };
    config: unknown;
  }) {
    let legacySubdomain =
      ctx.config && typeof ctx.config === 'object' && 'subdomain' in ctx.config
        ? ctx.config.subdomain
        : undefined;
    let subdomain = ctx.auth.subdomain ?? legacySubdomain;
    if (typeof subdomain !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(subdomain)) {
      throw createApiServiceError('Reconnect with your noCRM.io account subdomain.');
    }
    return new Client({ subdomain, token: ctx.auth.token, tokenType: ctx.auth.tokenType });
  }

  // ── Leads ──

  async listLeads(params?: {
    status?: string;
    step?: string;
    userId?: number;
    email?: string;
    tags?: string;
    starred?: boolean;
    fieldKey?: string;
    fieldValue?: string;
    updatedAfter?: string;
    startDate?: string;
    endDate?: string;
    dateRangeType?: string;
    limit?: number;
    offset?: number;
    order?: string;
    direction?: string;
    includeUnassigned?: boolean;
  }) {
    let response = await this.ax.get('/leads', {
      params: {
        status: params?.status,
        step: params?.step,
        user_id: params?.userId,
        email: params?.email,
        tags: params?.tags === undefined ? undefined : [params.tags],
        starred: params?.starred,
        field_key: params?.fieldKey,
        field_value: params?.fieldValue,
        updated_after: params?.updatedAfter,
        start_date: params?.startDate,
        end_date: params?.endDate,
        date_range_type:
          params?.dateRangeType === 'created'
            ? 'creation'
            : params?.dateRangeType === 'updated'
              ? 'update'
              : params?.dateRangeType === 'remind'
                ? 'next_action'
                : params?.dateRangeType,
        limit: params?.limit,
        offset: params?.offset,
        order:
          params?.order === 'created_at'
            ? 'creation_date'
            : params?.order === 'updated_at'
              ? 'last_update'
              : params?.order,
        direction: params?.direction,
        include_unassigned: params?.includeUnassigned
      }
    });
    return {
      leads: response.data as any[],
      totalCount: response.headers['x-total-count']
        ? Number.parseInt(response.headers['x-total-count'], 10)
        : undefined
    };
  }

  async getLead(leadId: number) {
    let response = await this.ax.get(`/leads/${leadId}`);
    return response.data;
  }

  async createLead(data: {
    title: string;
    description?: string;
    userId?: number;
    tags?: string[];
    step?: string;
    createdAt?: string;
  }) {
    let response = await this.ax.post('/leads', {
      title: data.title,
      description: data.description ?? '',
      user_id: data.userId,
      tags: data.tags,
      step: data.step,
      created_at: data.createdAt
    });
    return response.data;
  }

  async updateLead(
    leadId: number,
    data: {
      title?: string;
      description?: string;
      status?: string;
      remindDate?: string;
      remindTime?: string;
      amount?: number;
      probability?: number;
      step?: string;
      estimatedClosingDate?: string;
      tags?: string[];
      userId?: number;
    }
  ) {
    let response = await this.ax.put(`/leads/${leadId}`, {
      title: data.title,
      description: data.description,
      status: data.status,
      remind_date: data.remindDate,
      remind_time: data.remindTime,
      amount: data.amount,
      probability: data.probability,
      step: data.step,
      estimated_closing_date: data.estimatedClosingDate,
      tags: data.tags,
      user_id: data.userId
    });
    return response.data;
  }

  async deleteLead(leadId: number) {
    let response = await this.ax.delete(`/leads/${leadId}`);
    return response.data;
  }

  async duplicateLead(leadId: number, step?: string) {
    let response = await this.ax.post(`/leads/${leadId}/duplicate_lead`, {
      step
    });
    return response.data;
  }

  async assignLead(leadId: number, userId: number) {
    let response = await this.ax.post(`/leads/${leadId}/assign`, {
      user_id: userId
    });
    return response.data;
  }

  async addLeadToClient(leadId: number, clientId: number) {
    let response = await this.ax.post(`/leads/${leadId}/add_to_client`, {
      client_id: clientId
    });
    return response.data;
  }

  async listUnassignedLeads(limit?: number) {
    let response = await this.ax.get('/leads/unassigned', { params: { limit } });
    return response.data as any[];
  }

  async getLeadDuplicates(leadId: number) {
    let response = await this.ax.get(`/leads/${leadId}/duplicates`);
    return response.data as any[];
  }

  async getLeadActionHistory(
    leadId: number,
    params?: {
      startDate?: string;
      endDate?: string;
      actionType?: string;
      userId?: number;
    }
  ) {
    let response = await this.ax.get(`/leads/${leadId}/action_histories`, {
      params: {
        from: params?.startDate,
        to: params?.endDate,
        action_type: params?.actionType,
        user_ids: params?.userId
      }
    });
    return response.data as any[];
  }

  // ── Lead Comments ──

  async listLeadComments(leadId: number) {
    let response = await this.ax.get(`/leads/${leadId}/comments`);
    return response.data as any[];
  }

  async createLeadComment(
    leadId: number,
    data: {
      comment: string;
      activityId?: number;
    }
  ) {
    let response = await this.ax.post(`/leads/${leadId}/comments`, {
      content: data.comment,
      activity_id: data.activityId
    });
    return response.data;
  }

  async updateLeadComment(leadId: number, commentId: number, comment: string) {
    let response = await this.ax.put(`/leads/${leadId}/comments/${commentId}`, {
      content: comment
    });
    return response.data;
  }

  async deleteLeadComment(leadId: number, commentId: number) {
    let response = await this.ax.delete(`/leads/${leadId}/comments/${commentId}`);
    return response.data;
  }

  // ── Lead Attachments ──

  async listLeadAttachments(leadId: number) {
    let response = await this.ax.get(`/leads/${leadId}/attachments`);
    return response.data as any[];
  }

  // ── Lead Emails ──

  async sendLeadEmail(
    leadId: number,
    data: {
      templateId: number;
      userId: number;
    }
  ) {
    let response = await this.ax.post(`/leads/${leadId}/emails/send_email_from_template`, {
      email_template_id: data.templateId,
      from_user_id: data.userId
    });
    return response.data;
  }

  async sendLeadCustomEmail(
    leadId: number,
    data: {
      subject: string;
      body: string;
      userId: number;
    }
  ) {
    let response = await this.ax.get(`../simple/leads/${leadId}/send_email`, {
      params: { subject: data.subject, content: data.body, from_user_id: data.userId }
    });
    return response.data;
  }

  // ── Pipelines & Steps ──

  async listPipelines() {
    let response = await this.ax.get('/pipelines');
    return response.data as any[];
  }

  async listSteps(direction?: string) {
    let response = await this.ax.get('/steps', {
      params: { direction }
    });
    return response.data as any[];
  }

  async getStep(stepIdOrName: string | number) {
    let response = await this.ax.get(`/steps/${stepIdOrName}`);
    return response.data;
  }

  // ── Client Folders ──

  async listClientFolders(params?: { direction?: string; order?: string }) {
    let response = await this.ax.get('/clients', {
      params
    });
    return response.data as any[];
  }

  async getClientFolder(clientId: number) {
    let response = await this.ax.get(`/clients/${clientId}`);
    return response.data;
  }

  async createClientFolder(data: { name: string; description?: string; userId?: number }) {
    let response = await this.ax.post('/clients', {
      name: data.name,
      description: data.description,
      user_id: data.userId
    });
    return response.data;
  }

  async updateClientFolder(
    clientId: number,
    data: {
      name?: string;
      description?: string;
      isActive?: boolean;
    }
  ) {
    let response = await this.ax.put(`/clients/${clientId}`, {
      name: data.name,
      description: data.description,
      is_active: data.isActive
    });
    return response.data;
  }

  async deleteClientFolder(clientId: number) {
    let response = await this.ax.delete(`/clients/${clientId}`);
    return response.data;
  }

  // ── Users ──

  async listUsers() {
    let response = await this.ax.get('/users');
    return response.data as any[];
  }

  async getUser(userIdOrEmail: string | number) {
    let response = await this.ax.get(`/users/${encodeURIComponent(String(userIdOrEmail))}`);
    return response.data;
  }

  async createUser(data: {
    email: string;
    firstname: string;
    lastname: string;
    locale?: string;
    timeZone?: string;
    isAdmin?: boolean;
  }) {
    let response = await this.ax.post('/users', {
      email: data.email,
      firstname: data.firstname,
      lastname: data.lastname,
      locale: data.locale,
      time_zone: data.timeZone,
      is_admin: data.isAdmin
    });
    return response.data;
  }

  async disableUser(userId: number) {
    let response = await this.ax.post(`/users/${userId}/disable`);
    return response.data;
  }

  // ── Teams ──

  async listTeams() {
    let response = await this.ax.get('/teams');
    return response.data as any[];
  }

  async getTeam(teamId: number) {
    let response = await this.ax.get(`/teams/${teamId}`);
    return response.data;
  }

  async createTeam(name: string) {
    let response = await this.ax.post('/teams', { name });
    return response.data;
  }

  async updateTeam(teamId: number, name: string) {
    let response = await this.ax.put(`/teams/${teamId}`, { name });
    return response.data;
  }

  async deleteTeam(teamId: number) {
    let response = await this.ax.delete(`/teams/${teamId}`);
    return response.data;
  }

  async addTeamMember(teamId: number, userId: number) {
    let response = await this.ax.post(`/teams/${teamId}/add_member`, {
      user_id: userId
    });
    return response.data;
  }

  async removeTeamMember(teamId: number, userId: number) {
    let response = await this.ax.delete(`/teams/${teamId}/remove_member`, {
      data: { user_id: userId }
    });
    return response.data;
  }

  // ── Activities ──

  async listActivities() {
    let response = await this.ax.get('/activities');
    return response.data as any[];
  }

  // ── Categories & Tags ──

  async listCategories(includeTags?: boolean) {
    let response = await this.ax.get('/categories', {
      params: { include_tags: includeTags }
    });
    return response.data as any[];
  }

  async createCategory(name: string) {
    let response = await this.ax.post('/category', { name });
    return response.data;
  }

  async listPredefinedTags() {
    let response = await this.ax.get('/predefined_tags');
    return response.data as any[];
  }

  async createPredefinedTag(name: string, categoryId: number) {
    let response = await this.ax.post('/predefined_tags', {
      name,
      category_id: categoryId
    });
    return response.data;
  }

  // ── Fields ──

  async listFields(type?: string) {
    let response = await this.ax.get('/fields', {
      params: { type }
    });
    return response.data as any[];
  }

  async createField(data: {
    name: string;
    parentType: string;
    type?: string;
    isKey?: boolean;
  }) {
    let response = await this.ax.post('/fields', {
      name: data.name,
      parent_type: data.parentType,
      type: data.type,
      is_key: data.isKey
    });
    return response.data;
  }

  // ── Prospecting Lists ──

  async listProspectingLists() {
    let response = await this.ax.get('/spreadsheets');
    return response.data as any[];
  }

  async getProspectingList(listId: number) {
    let response = await this.ax.get(`/spreadsheets/${listId}`);
    return response.data;
  }

  async createProspectingList(data: {
    name: string;
    description?: string;
    columns: string[];
  }) {
    let response = await this.ax.post('/spreadsheets', {
      title: data.name,
      content: JSON.stringify([data.columns]),
      description: data.description
    });
    return response.data;
  }

  async assignProspectingList(listId: number, userId: number) {
    let response = await this.ax.post(`/spreadsheets/${listId}/assign`, {
      user_id: userId
    });
    return response.data;
  }

  async addProspects(listId: number, prospects: Record<string, any>[]) {
    let list = await this.getProspectingList(listId);
    let columns: string[] = list.column_names;
    if (!Array.isArray(columns) || columns.length === 0) {
      throw createApiServiceError('The prospecting list has no column headers.');
    }
    for (let prospect of prospects) {
      if (Object.keys(prospect).some(key => !columns.includes(key))) {
        throw createApiServiceError(
          'Prospect field names must match the prospecting list column headers.'
        );
      }
    }
    let rows = prospects.map(prospect => columns.map(column => prospect[column] ?? ''));
    let response = await this.ax.post(`/spreadsheets/${listId}/rows`, {
      content: JSON.stringify(rows)
    });
    return response.data;
  }

  async updateProspect(listId: number, prospectId: number, fields: Record<string, any>) {
    let response = await this.ax.put(
      `/spreadsheets/${listId}/rows/${prospectId}/update_fields`,
      {
        fields: JSON.stringify(fields)
      }
    );
    return response.data;
  }

  async deleteProspect(listId: number, prospectId: number) {
    let response = await this.ax.delete(`/spreadsheets/${listId}/rows/${prospectId}`);
    return response.data;
  }

  async convertProspectToLead(listId: number, prospectId: number, userId?: number) {
    let response = await this.ax.post(
      `/spreadsheets/${listId}/rows/${prospectId}/create_lead`
    );
    return userId === undefined ? response.data : this.assignLead(response.data.id, userId);
  }

  async findProspects(params: { email?: string; fieldName?: string; fieldValue?: string }) {
    let response = await this.ax.get('/rows', {
      params: {
        email: params.email,
        field_key: params.fieldName,
        field_value: params.fieldValue
      }
    });
    return response.data as any[];
  }

  // ── Webhooks ──

  async listWebhooks() {
    let response = await this.ax.get('/webhooks');
    return response.data as any[];
  }

  async createWebhook(event: string, url: string) {
    let response = await this.ax.post('/webhooks', { event, url });
    return response.data;
  }

  async activateWebhook(webhookId: number) {
    let response = await this.ax.post(`/webhooks/${webhookId}/activate`);
    return response.data;
  }

  async disableWebhook(webhookId: number) {
    let response = await this.ax.post(`/webhooks/${webhookId}/disable`);
    return response.data;
  }

  async listWebhookEventTypes() {
    let response = await this.ax.get('/webhooks/events');
    return response.data as any[];
  }

  async deleteWebhook(webhookId: number) {
    let response = await this.ax.delete(`/webhooks/${webhookId}`);
    return response.data;
  }
}
