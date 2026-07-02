import { createAxios } from 'slates';
import type {
  BugherdAttachment,
  BugherdColumn,
  BugherdComment,
  BugherdMeta,
  BugherdOrganization,
  BugherdProject,
  BugherdTask,
  BugherdUser,
  BugherdWebhook,
  CreateCommentParams,
  CreateProjectParams,
  CreateTaskParams,
  TaskFilters,
  UpdateProjectParams,
  UpdateTaskParams
} from './types';

export class BugherdClient {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://www.bugherd.com/api_v2',
      auth: {
        username: token,
        password: 'x'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Organization ----

  async getOrganization(): Promise<BugherdOrganization> {
    let response = await this.axios.get('/organization.json');
    return response.data.organization;
  }

  // ---- Users ----

  async listUsers(): Promise<BugherdUser[]> {
    let response = await this.axios.get('/users.json');
    return response.data.users ?? [];
  }

  async listMembers(): Promise<BugherdUser[]> {
    let response = await this.axios.get('/users/members.json');
    return response.data.users ?? [];
  }

  async listGuests(): Promise<BugherdUser[]> {
    let response = await this.axios.get('/users/guests.json');
    return response.data.users ?? [];
  }

  async getUserTasks(
    userId: number,
    filters?: TaskFilters
  ): Promise<{ tasks: BugherdTask[]; meta: BugherdMeta }> {
    let params: Record<string, string | number> = {};
    if (filters?.updatedSince) params.updated_since = filters.updatedSince;
    if (filters?.createdSince) params.created_since = filters.createdSince;
    if (filters?.priority) params.priority = filters.priority;
    if (filters?.tag) params.tag = filters.tag;
    if (filters?.assignedToId) params.assigned_to_id = filters.assignedToId;
    if (filters?.page) params.page = filters.page;

    let response = await this.axios.get(`/users/${userId}/tasks.json`, { params });
    return { tasks: response.data.tasks ?? [], meta: response.data.meta };
  }

  async getUserProjects(
    userId: number,
    filters?: { createdSince?: string; isActive?: boolean }
  ): Promise<BugherdProject[]> {
    let params: Record<string, string | boolean> = {};
    if (filters?.createdSince) params.created_since = filters.createdSince;
    if (filters?.isActive !== undefined) params.is_active = filters.isActive;

    let response = await this.axios.get(`/users/${userId}/projects.json`, { params });
    return response.data.projects ?? [];
  }

  // ---- Projects ----

  async listProjects(): Promise<BugherdProject[]> {
    let response = await this.axios.get('/projects.json');
    return response.data.projects ?? [];
  }

  async listActiveProjects(): Promise<BugherdProject[]> {
    let response = await this.axios.get('/projects/active.json');
    return response.data.projects ?? [];
  }

  async getProject(projectId: number): Promise<BugherdProject> {
    let response = await this.axios.get(`/projects/${projectId}.json`);
    return response.data.project;
  }

  async createProject(params: CreateProjectParams): Promise<BugherdProject> {
    let body = {
      project: {
        name: params.name,
        devurl: params.devurl,
        ...(params.isActive !== undefined && { is_active: params.isActive }),
        ...(params.isPublic !== undefined && { is_public: params.isPublic }),
        ...(params.guestsSeeGuests !== undefined && {
          guests_see_guests: params.guestsSeeGuests
        })
      }
    };
    let response = await this.axios.post('/projects.json', body);
    return response.data.project;
  }

  async updateProject(
    projectId: number,
    params: UpdateProjectParams
  ): Promise<BugherdProject> {
    let body: Record<string, any> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.devurl !== undefined) body.devurl = params.devurl;
    if (params.isActive !== undefined) body.is_active = params.isActive;
    if (params.isPublic !== undefined) body.is_public = params.isPublic;
    if (params.permission !== undefined) body.permission = params.permission;

    let response = await this.axios.put(`/projects/${projectId}.json`, { project: body });
    return response.data.project;
  }

  async deleteProject(projectId: number): Promise<void> {
    await this.axios.delete(`/projects/${projectId}.json`);
  }

  async addMemberToProject(projectId: number, userId: number | number[]): Promise<void> {
    await this.axios.post(`/projects/${projectId}/add_member.json`, { user_id: userId });
  }

  async addGuestToProject(
    projectId: number,
    params: { userId?: number; email?: string }
  ): Promise<void> {
    let body: Record<string, any> = {};
    if (params.userId) body.user_id = params.userId;
    if (params.email) body.email = params.email;
    await this.axios.post(`/projects/${projectId}/add_guest.json`, body);
  }

  // ---- Tasks ----

  async listTasks(
    projectId: number,
    filters?: TaskFilters
  ): Promise<{ tasks: BugherdTask[]; meta: BugherdMeta }> {
    let params = this.buildTaskFilterParams(filters);
    let response = await this.axios.get(`/projects/${projectId}/tasks.json`, { params });
    return { tasks: response.data.tasks ?? [], meta: response.data.meta };
  }

  async listFeedbackTasks(
    projectId: number,
    filters?: TaskFilters
  ): Promise<{ tasks: BugherdTask[]; meta: BugherdMeta }> {
    let params = this.buildTaskFilterParams(filters);
    let response = await this.axios.get(`/projects/${projectId}/tasks/feedback.json`, {
      params
    });
    return { tasks: response.data.tasks ?? [], meta: response.data.meta };
  }

  async listArchivedTasks(
    projectId: number,
    filters?: TaskFilters
  ): Promise<{ tasks: BugherdTask[]; meta: BugherdMeta }> {
    let params = this.buildTaskFilterParams(filters);
    let response = await this.axios.get(`/projects/${projectId}/tasks/archive.json`, {
      params
    });
    return { tasks: response.data.tasks ?? [], meta: response.data.meta };
  }

  async listTaskboardTasks(
    projectId: number,
    filters?: TaskFilters
  ): Promise<{ tasks: BugherdTask[]; meta: BugherdMeta }> {
    let params = this.buildTaskFilterParams(filters);
    let response = await this.axios.get(`/projects/${projectId}/tasks/taskboard.json`, {
      params
    });
    return { tasks: response.data.tasks ?? [], meta: response.data.meta };
  }

  async getTask(projectId: number, taskId: number): Promise<BugherdTask> {
    let response = await this.axios.get(`/projects/${projectId}/tasks/${taskId}.json`);
    return response.data.task;
  }

  async getTaskGlobal(taskId: number): Promise<BugherdTask> {
    let response = await this.axios.get(`/tasks/${taskId}.json`);
    return response.data.task;
  }

  async createTask(projectId: number, params: CreateTaskParams): Promise<BugherdTask> {
    let body: Record<string, any> = {
      description: params.description
    };
    if (params.priority) body.priority = params.priority;
    if (params.status) body.status = params.status;
    if (params.requesterId) body.requester_id = params.requesterId;
    if (params.requesterEmail) body.requester_email = params.requesterEmail;
    if (params.assignedToId) body.assigned_to_id = params.assignedToId;
    if (params.assignedToEmail) body.assigned_to_email = params.assignedToEmail;
    if (params.tagNames) body.tag_names = params.tagNames;
    if (params.externalId) body.external_id = params.externalId;

    let response = await this.axios.post(`/projects/${projectId}/tasks.json`, { task: body });
    return response.data.task;
  }

  async updateTask(
    projectId: number,
    taskId: number,
    params: UpdateTaskParams
  ): Promise<BugherdTask> {
    let body: Record<string, any> = {};
    if (params.description !== undefined) body.description = params.description;
    if (params.priority !== undefined) body.priority = params.priority;
    if (params.status !== undefined) body.status = params.status;
    if (params.assignedToId !== undefined) body.assigned_to_id = params.assignedToId;
    if (params.assignedToEmail !== undefined) body.assigned_to_email = params.assignedToEmail;
    if (params.unassignUser !== undefined) body.unassign_user = params.unassignUser;
    if (params.tagNames !== undefined) body.tag_names = params.tagNames;
    if (params.externalId !== undefined) body.external_id = params.externalId;
    if (params.updaterEmail !== undefined) body.updater_email = params.updaterEmail;

    let response = await this.axios.put(`/projects/${projectId}/tasks/${taskId}.json`, {
      task: body
    });
    return response.data.task;
  }

  async moveTasks(
    projectId: number,
    taskIds: number[],
    targetProjectId: number
  ): Promise<void> {
    await this.axios.post(`/projects/${projectId}/tasks/move_tasks.json`, {
      task_ids: taskIds,
      target_project_id: targetProjectId
    });
  }

  // ---- Comments ----

  async listComments(projectId: number, taskId: number): Promise<BugherdComment[]> {
    let response = await this.axios.get(
      `/projects/${projectId}/tasks/${taskId}/comments.json`
    );
    return response.data.comments ?? [];
  }

  async createComment(
    projectId: number,
    taskId: number,
    params: CreateCommentParams
  ): Promise<BugherdComment> {
    let body: Record<string, any> = {
      text: params.text
    };
    if (params.userId) body.user_id = params.userId;
    if (params.email) body.email = params.email;
    if (params.isPrivate !== undefined) body.is_private = params.isPrivate;

    let response = await this.axios.post(
      `/projects/${projectId}/tasks/${taskId}/comments.json`,
      { comment: body }
    );
    return response.data.comment;
  }

  // ---- Attachments ----

  async listAttachments(projectId: number, taskId: number): Promise<BugherdAttachment[]> {
    let response = await this.axios.get(
      `/projects/${projectId}/tasks/${taskId}/attachments.json`
    );
    return response.data.attachments ?? [];
  }

  async getAttachment(
    projectId: number,
    taskId: number,
    attachmentId: number
  ): Promise<BugherdAttachment> {
    let response = await this.axios.get(
      `/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}.json`
    );
    return response.data.attachment;
  }

  async createAttachmentFromUrl(
    projectId: number,
    taskId: number,
    fileName: string,
    url: string
  ): Promise<BugherdAttachment> {
    let response = await this.axios.post(
      `/projects/${projectId}/tasks/${taskId}/attachments.json`,
      {
        attachment: {
          file_name: fileName,
          url: url
        }
      }
    );
    return response.data.attachment;
  }

  async deleteAttachment(
    projectId: number,
    taskId: number,
    attachmentId: number
  ): Promise<void> {
    await this.axios.delete(
      `/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}.json`
    );
  }

  // ---- Custom Columns ----

  async listColumns(projectId: number): Promise<BugherdColumn[]> {
    let response = await this.axios.get(`/projects/${projectId}/columns.json`);
    return response.data.columns ?? [];
  }

  async getColumn(projectId: number, columnId: number): Promise<BugherdColumn> {
    let response = await this.axios.get(`/projects/${projectId}/columns/${columnId}.json`);
    return response.data.column;
  }

  async createColumn(projectId: number, name: string): Promise<BugherdColumn> {
    let response = await this.axios.post(`/projects/${projectId}/columns.json`, {
      column: { name }
    });
    return response.data.column;
  }

  async updateColumn(
    projectId: number,
    columnId: number,
    name: string
  ): Promise<BugherdColumn> {
    let response = await this.axios.put(`/projects/${projectId}/columns/${columnId}.json`, {
      column: { name }
    });
    return response.data.column;
  }

  // ---- Webhooks ----

  async listWebhooks(): Promise<BugherdWebhook[]> {
    let response = await this.axios.get('/webhooks.json');
    return response.data.webhooks ?? [];
  }

  async createWebhook(
    targetUrl: string,
    event: string,
    projectId?: number
  ): Promise<BugherdWebhook> {
    let body: Record<string, any> = {
      target_url: targetUrl,
      event: event
    };
    if (projectId !== undefined) body.project_id = projectId;

    let response = await this.axios.post('/webhooks.json', body);
    return response.data.webhook;
  }

  async deleteWebhook(webhookId: number): Promise<void> {
    await this.axios.delete(`/webhooks/${webhookId}.json`);
  }

  // ---- Helpers ----

  private buildTaskFilterParams(filters?: TaskFilters): Record<string, string | number> {
    let params: Record<string, string | number> = {};
    if (!filters) return params;
    if (filters.updatedSince) params.updated_since = filters.updatedSince;
    if (filters.createdSince) params.created_since = filters.createdSince;
    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;
    if (filters.tag) params.tag = filters.tag;
    if (filters.assignedToId) params.assigned_to_id = filters.assignedToId;
    if (filters.externalId) params.external_id = filters.externalId;
    if (filters.page) params.page = filters.page;
    return params;
  }
}
