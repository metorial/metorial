import { createAxios } from 'slates';

export interface ClientConfig {
  subdomain: string;
  token: string;
}

export class Client {
  private ax: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    this.ax = createAxios({
      baseURL: `https://${config.subdomain}.nocrm.io/api/v2`,
      headers: {
        'X-API-KEY': config.token
      }
    });
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
        tags: params?.tags,
        starred: params?.starred,
        field_key: params?.fieldKey,
        field_value: params?.fieldValue,
        updated_after: params?.updatedAfter,
        start_date: params?.startDate,
        end_date: params?.endDate,
        date_range_type: params?.dateRangeType,
        limit: params?.limit,
        offset: params?.offset,
        order: params?.order,
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
      description: data.description,
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
      clientFolderId?: number;
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
      client_folder_id: data.clientFolderId
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

  async listUnassignedLeads() {
    let response = await this.ax.get('/leads/unassigned');
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
        start_date: params?.startDate,
        end_date: params?.endDate,
        action_type: params?.actionType,
        user_id: params?.userId
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
      comment: data.comment,
      activity_id: data.activityId
    });
    return response.data;
  }

  async updateLeadComment(leadId: number, commentId: number, comment: string) {
    let response = await this.ax.put(`/leads/${leadId}/comments/${commentId}`, {
      comment
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
      userId?: number;
    }
  ) {
    let response = await this.ax.post(`/leads/${leadId}/send_email`, {
      template_id: data.templateId,
      user_id: data.userId
    });
    return response.data;
  }

  async sendLeadCustomEmail(
    leadId: number,
    data: {
      subject: string;
      body: string;
      userId?: number;
    }
  ) {
    let response = await this.ax.post(`/leads/${leadId}/send_custom_email`, {
      subject: data.subject,
      body: data.body,
      user_id: data.userId
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
    let response = await this.ax.get(`/users/${userIdOrEmail}`);
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
    let response = await this.ax.get('/prospecting_lists');
    return response.data as any[];
  }

  async getProspectingList(listId: number) {
    let response = await this.ax.get(`/prospecting_lists/${listId}`);
    return response.data;
  }

  async createProspectingList(data: { name: string; description?: string }) {
    let response = await this.ax.post('/prospecting_lists', {
      name: data.name,
      description: data.description
    });
    return response.data;
  }

  async assignProspectingList(listId: number, userId: number) {
    let response = await this.ax.post(`/prospecting_lists/${listId}/assign`, {
      user_id: userId
    });
    return response.data;
  }

  async addProspects(listId: number, prospects: Record<string, any>[]) {
    let response = await this.ax.post(`/prospecting_lists/${listId}/prospects`, {
      prospects
    });
    return response.data;
  }

  async updateProspect(listId: number, prospectId: number, fields: Record<string, any>) {
    let response = await this.ax.put(`/prospecting_lists/${listId}/prospects/${prospectId}`, {
      fields
    });
    return response.data;
  }

  async deleteProspect(listId: number, prospectId: number) {
    let response = await this.ax.delete(
      `/prospecting_lists/${listId}/prospects/${prospectId}`
    );
    return response.data;
  }

  async convertProspectToLead(listId: number, prospectId: number, userId?: number) {
    let response = await this.ax.post(
      `/prospecting_lists/${listId}/prospects/${prospectId}/create_lead`,
      {
        user_id: userId
      }
    );
    return response.data;
  }

  async findProspects(params: { email?: string; fieldName?: string; fieldValue?: string }) {
    let response = await this.ax.get('/prospecting_lists/find_prospects', {
      params: {
        email: params.email,
        field_name: params.fieldName,
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
