import { createAxios } from 'slates';

export interface PaginatedResponse<T> {
  page: number;
  limit: number;
  hasMore: boolean;
  totalNumberOfPages?: number;
  items: T[];
}

export interface TallyForm {
  id: string;
  name: string;
  workspaceId: string | null;
  status: string;
  numberOfSubmissions: number;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TallyFormDetail extends TallyForm {
  blocks: TallyBlock[];
  settings: Record<string, any>;
  payments: any[];
}

export interface TallyBlock {
  uuid: string;
  type: string;
  groupUuid: string;
  groupType: string;
  payload: Record<string, any>;
}

export interface TallySubmission {
  submissionId: string;
  respondentId: string;
  formId: string;
  formName: string;
  createdAt: string;
  fields: TallyField[];
}

export interface TallyField {
  key: string;
  label: string;
  type: string;
  value: any;
}

export interface TallyQuestion {
  key: string;
  label: string;
  type: string;
}

export interface TallyWorkspace {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface TallyWebhook {
  id: string;
  url: string;
  eventTypes: string[];
  isEnabled: boolean;
  createdAt: string;
}

export interface TallyUser {
  id: string;
  email: string;
  name?: string;
  username?: string;
}

export interface ListFormsParams {
  page?: number;
  limit?: number;
  workspaceId?: string;
}

export interface ListSubmissionsParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  afterId?: string;
}

export interface CreateFormParams {
  status?: string;
  workspaceId?: string;
  blocks?: TallyBlock[];
  settings?: Record<string, any>;
}

export interface UpdateFormParams {
  name?: string;
  status?: string;
  blocks?: TallyBlock[];
  settings?: Record<string, any>;
}

export interface CreateWebhookParams {
  formId: string;
  url: string;
  eventTypes: string[];
  signingSecret?: string;
  httpHeaders?: Array<{ name: string; value: string }>;
  externalSubscriber?: string;
}

export interface UpdateWebhookParams {
  formId?: string;
  url?: string;
  eventTypes?: string[];
  isEnabled?: boolean;
  signingSecret?: string;
  httpHeaders?: Array<{ name: string; value: string }>;
}

export interface CreateWorkspaceParams {
  name: string;
}

export interface UpdateWorkspaceParams {
  name?: string;
}

export interface CreateInviteParams {
  email: string;
  workspaceIds?: string[];
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.tally.so',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Forms

  async listForms(params?: ListFormsParams): Promise<PaginatedResponse<TallyForm>> {
    let response = await this.axios.get('/forms', { params });
    return response.data;
  }

  async getForm(formId: string): Promise<TallyFormDetail> {
    let response = await this.axios.get(`/forms/${formId}`);
    return response.data;
  }

  async createForm(params: CreateFormParams): Promise<TallyFormDetail> {
    let response = await this.axios.post('/forms', params);
    return response.data;
  }

  async updateForm(formId: string, params: UpdateFormParams): Promise<void> {
    await this.axios.patch(`/forms/${formId}`, params);
  }

  async deleteForm(formId: string): Promise<void> {
    await this.axios.delete(`/forms/${formId}`);
  }

  // Submissions

  async listSubmissions(
    formId: string,
    params?: ListSubmissionsParams
  ): Promise<
    PaginatedResponse<TallySubmission> & {
      questions: TallyQuestion[];
      totalNumberOfSubmissionsPerFilter: number;
    }
  > {
    let response = await this.axios.get(`/forms/${formId}/submissions`, { params });
    return response.data;
  }

  async getSubmission(
    formId: string,
    submissionId: string
  ): Promise<TallySubmission & { questions: TallyQuestion[] }> {
    let response = await this.axios.get(`/forms/${formId}/submissions/${submissionId}`);
    return response.data;
  }

  async deleteSubmission(formId: string, submissionId: string): Promise<void> {
    await this.axios.delete(`/forms/${formId}/submissions/${submissionId}`);
  }

  // Questions

  async listQuestions(formId: string): Promise<TallyQuestion[]> {
    let response = await this.axios.get(`/forms/${formId}/questions`);
    return response.data;
  }

  // Workspaces

  async listWorkspaces(): Promise<PaginatedResponse<TallyWorkspace>> {
    let response = await this.axios.get('/workspaces');
    return response.data;
  }

  async getWorkspace(workspaceId: string): Promise<TallyWorkspace> {
    let response = await this.axios.get(`/workspaces/${workspaceId}`);
    return response.data;
  }

  async createWorkspace(params: CreateWorkspaceParams): Promise<TallyWorkspace> {
    let response = await this.axios.post('/workspaces', params);
    return response.data;
  }

  async updateWorkspace(workspaceId: string, params: UpdateWorkspaceParams): Promise<void> {
    await this.axios.patch(`/workspaces/${workspaceId}`, params);
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.axios.delete(`/workspaces/${workspaceId}`);
  }

  // Webhooks

  async listWebhooks(): Promise<PaginatedResponse<TallyWebhook>> {
    let response = await this.axios.get('/webhooks');
    return response.data;
  }

  async createWebhook(params: CreateWebhookParams): Promise<TallyWebhook> {
    let response = await this.axios.post('/webhooks', params);
    return response.data;
  }

  async updateWebhook(webhookId: string, params: UpdateWebhookParams): Promise<void> {
    await this.axios.patch(`/webhooks/${webhookId}`, params);
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/webhooks/${webhookId}`);
  }

  async listWebhookEvents(webhookId: string): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get(`/webhooks/${webhookId}/events`);
    return response.data;
  }

  async retryWebhookEvent(webhookId: string, eventId: string): Promise<void> {
    await this.axios.post(`/webhooks/${webhookId}/events/${eventId}`);
  }

  // Organizations

  async listOrganizationUsers(organizationId: string): Promise<any[]> {
    let response = await this.axios.get(`/organizations/${organizationId}/users`);
    return response.data;
  }

  async removeOrganizationUser(organizationId: string, userId: string): Promise<void> {
    await this.axios.delete(`/organizations/${organizationId}/users/${userId}`);
  }

  async listOrganizationInvites(organizationId: string): Promise<any[]> {
    let response = await this.axios.get(`/organizations/${organizationId}/invites`);
    return response.data;
  }

  async createOrganizationInvite(
    organizationId: string,
    params: CreateInviteParams
  ): Promise<any> {
    let response = await this.axios.post(`/organizations/${organizationId}/invites`, params);
    return response.data;
  }

  async cancelOrganizationInvite(organizationId: string, inviteId: string): Promise<void> {
    await this.axios.delete(`/organizations/${organizationId}/invites/${inviteId}`);
  }

  // User

  async getCurrentUser(): Promise<TallyUser> {
    let response = await this.axios.get('/users/me');
    return response.data;
  }
}
