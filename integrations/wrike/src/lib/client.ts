import { createAxios } from 'slates';
import type {
  WrikeApproval,
  WrikeAttachment,
  WrikeComment,
  WrikeContact,
  WrikeCustomField,
  WrikeDependency,
  WrikeFolder,
  WrikeResponse,
  WrikeSpace,
  WrikeTask,
  WrikeTimelog,
  WrikeWebhook,
  WrikeWorkflow
} from './types';

export class WrikeClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; host: string }) {
    this.axios = createAxios({
      baseURL: `https://${config.host}/api/v4`,
      headers: {
        Authorization: `bearer ${config.token}`
      }
    });
  }

  // ============ Tasks ============

  async getTasks(params?: {
    folderId?: string;
    taskIds?: string[];
    title?: string;
    status?: string;
    importance?: string;
    updatedDate?: { start?: string; end?: string };
    createdDate?: { start?: string; end?: string };
    responsibles?: string[];
    fields?: string[];
    limit?: number;
    pageSize?: number;
    nextPageToken?: string;
    sortField?: string;
    sortOrder?: string;
    customStatuses?: string[];
  }): Promise<WrikeResponse<WrikeTask>> {
    let url = '/tasks';
    if (params?.folderId) {
      url = `/folders/${params.folderId}/tasks`;
    } else if (params?.taskIds && params.taskIds.length > 0) {
      url = `/tasks/${params.taskIds.join(',')}`;
    }

    let queryParams: Record<string, string> = {};

    if (params?.title) queryParams.title = params.title;
    if (params?.status) queryParams.status = params.status;
    if (params?.importance) queryParams.importance = params.importance;
    if (params?.fields) queryParams.fields = JSON.stringify(params.fields);
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.nextPageToken) queryParams.nextPageToken = params.nextPageToken;
    if (params?.sortField) queryParams.sortField = params.sortField;
    if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
    if (params?.responsibles) queryParams.responsibles = JSON.stringify(params.responsibles);
    if (params?.customStatuses)
      queryParams.customStatuses = JSON.stringify(params.customStatuses);
    if (params?.updatedDate) queryParams.updatedDate = JSON.stringify(params.updatedDate);
    if (params?.createdDate) queryParams.createdDate = JSON.stringify(params.createdDate);

    let response = await this.axios.get(url, { params: queryParams });
    return response.data;
  }

  async createTask(
    folderId: string,
    data: {
      title: string;
      description?: string;
      status?: string;
      importance?: string;
      dates?: {
        start?: string;
        due?: string;
        duration?: number;
        type?: string;
        workOnWeekends?: boolean;
      };
      responsibles?: string[];
      followers?: string[];
      follow?: boolean;
      priorityBefore?: string;
      priorityAfter?: string;
      superTasks?: string[];
      metadata?: Array<{ key: string; value: string }>;
      customFields?: Array<{ id: string; value: string }>;
      customStatus?: string;
    }
  ): Promise<WrikeTask> {
    let response = await this.axios.post(`/folders/${folderId}/tasks`, data);
    return response.data.data[0];
  }

  async updateTask(
    taskId: string,
    data: {
      title?: string;
      description?: string;
      status?: string;
      importance?: string;
      dates?: {
        start?: string;
        due?: string;
        duration?: number;
        type?: string;
        workOnWeekends?: boolean;
      };
      addResponsibles?: string[];
      removeResponsibles?: string[];
      addParents?: string[];
      removeParents?: string[];
      addFollowers?: string[];
      follow?: boolean;
      priorityBefore?: string;
      priorityAfter?: string;
      addSuperTasks?: string[];
      removeSuperTasks?: string[];
      metadata?: Array<{ key: string; value: string }>;
      customFields?: Array<{ id: string; value: string }>;
      customStatus?: string;
      restore?: boolean;
    }
  ): Promise<WrikeTask> {
    let response = await this.axios.put(`/tasks/${taskId}`, data);
    return response.data.data[0];
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.axios.delete(`/tasks/${taskId}`);
  }

  // ============ Folders & Projects ============

  async getFolders(params?: {
    folderId?: string;
    folderIds?: string[];
    fields?: string[];
    project?: boolean;
  }): Promise<WrikeResponse<WrikeFolder>> {
    let url = '/folders';
    if (params?.folderId) {
      url = `/folders/${params.folderId}/folders`;
    } else if (params?.folderIds && params.folderIds.length > 0) {
      url = `/folders/${params.folderIds.join(',')}`;
    }

    let queryParams: Record<string, string> = {};
    if (params?.fields) queryParams.fields = JSON.stringify(params.fields);
    if (params?.project !== undefined) queryParams.project = String(params.project);

    let response = await this.axios.get(url, { params: queryParams });
    return response.data;
  }

  async getFolderTree(params?: {
    folderId?: string;
    spaceId?: string;
  }): Promise<WrikeResponse<WrikeFolder>> {
    let url = '/folders';
    if (params?.folderId) {
      url = `/folders/${params.folderId}/folders`;
    } else if (params?.spaceId) {
      url = `/spaces/${params.spaceId}/folders`;
    }

    let response = await this.axios.get(url);
    return response.data;
  }

  async createFolder(
    parentFolderId: string,
    data: {
      title: string;
      description?: string;
      shareds?: string[];
      metadata?: Array<{ key: string; value: string }>;
      customFields?: Array<{ id: string; value: string }>;
      customColumns?: string[];
      project?: {
        ownerIds?: string[];
        status?: string;
        startDate?: string;
        endDate?: string;
      };
    }
  ): Promise<WrikeFolder> {
    let response = await this.axios.post(`/folders/${parentFolderId}/folders`, data);
    return response.data.data[0];
  }

  async updateFolder(
    folderId: string,
    data: {
      title?: string;
      description?: string;
      addParents?: string[];
      removeParents?: string[];
      addShareds?: string[];
      removeShareds?: string[];
      metadata?: Array<{ key: string; value: string }>;
      customFields?: Array<{ id: string; value: string }>;
      customColumns?: string[];
      restore?: boolean;
      project?: {
        ownerIds?: string[];
        status?: string;
        startDate?: string;
        endDate?: string;
      };
    }
  ): Promise<WrikeFolder> {
    let response = await this.axios.put(`/folders/${folderId}`, data);
    return response.data.data[0];
  }

  async deleteFolder(folderId: string): Promise<void> {
    await this.axios.delete(`/folders/${folderId}`);
  }

  // ============ Spaces ============

  async getSpaces(params?: { fields?: string[] }): Promise<WrikeResponse<WrikeSpace>> {
    let queryParams: Record<string, string> = {};
    if (params?.fields) queryParams.fields = JSON.stringify(params.fields);

    let response = await this.axios.get('/spaces', { params: queryParams });
    return response.data;
  }

  // ============ Comments ============

  async getComments(params?: {
    taskId?: string;
    folderId?: string;
    limit?: number;
    plainText?: boolean;
  }): Promise<WrikeResponse<WrikeComment>> {
    let url = '/comments';
    if (params?.taskId) {
      url = `/tasks/${params.taskId}/comments`;
    } else if (params?.folderId) {
      url = `/folders/${params.folderId}/comments`;
    }

    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.plainText) queryParams.plainText = String(params.plainText);

    let response = await this.axios.get(url, { params: queryParams });
    return response.data;
  }

  async createComment(params: {
    taskId?: string;
    folderId?: string;
    text: string;
    plainText?: boolean;
  }): Promise<WrikeComment> {
    let url: string;
    if (params.taskId) {
      url = `/tasks/${params.taskId}/comments`;
    } else if (params.folderId) {
      url = `/folders/${params.folderId}/comments`;
    } else {
      throw new Error('Either taskId or folderId must be provided');
    }

    let response = await this.axios.post(url, {
      text: params.text,
      plainText: params.plainText
    });
    return response.data.data[0];
  }

  async deleteComment(commentId: string): Promise<void> {
    await this.axios.delete(`/comments/${commentId}`);
  }

  // ============ Attachments ============

  async getAttachments(params?: {
    taskId?: string;
    folderId?: string;
  }): Promise<WrikeResponse<WrikeAttachment>> {
    let url = '/attachments';
    if (params?.taskId) {
      url = `/tasks/${params.taskId}/attachments`;
    } else if (params?.folderId) {
      url = `/folders/${params.folderId}/attachments`;
    }

    let response = await this.axios.get(url);
    return response.data;
  }

  async getAttachmentUrl(attachmentId: string): Promise<string> {
    let response = await this.axios.get(`/attachments/${attachmentId}/url`);
    return response.data.data[0]?.url;
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    await this.axios.delete(`/attachments/${attachmentId}`);
  }

  // ============ Time Tracking ============

  async getTimelogs(params?: {
    taskId?: string;
    contactId?: string;
    folderId?: string;
    createdDate?: { start?: string; end?: string };
    trackedDate?: { start?: string; end?: string };
    fields?: string[];
  }): Promise<WrikeResponse<WrikeTimelog>> {
    let url = '/timelogs';
    if (params?.taskId) {
      url = `/tasks/${params.taskId}/timelogs`;
    } else if (params?.contactId) {
      url = `/contacts/${params.contactId}/timelogs`;
    } else if (params?.folderId) {
      url = `/folders/${params.folderId}/timelogs`;
    }

    let queryParams: Record<string, string> = {};
    if (params?.createdDate) queryParams.createdDate = JSON.stringify(params.createdDate);
    if (params?.trackedDate) queryParams.trackedDate = JSON.stringify(params.trackedDate);
    if (params?.fields) queryParams.fields = JSON.stringify(params.fields);

    let response = await this.axios.get(url, { params: queryParams });
    return response.data;
  }

  async createTimelog(
    taskId: string,
    data: {
      hours: number;
      trackedDate: string;
      comment?: string;
      categoryId?: string;
    }
  ): Promise<WrikeTimelog> {
    let response = await this.axios.post(`/tasks/${taskId}/timelogs`, data);
    return response.data.data[0];
  }

  async updateTimelog(
    timelogId: string,
    data: {
      hours?: number;
      trackedDate?: string;
      comment?: string;
      categoryId?: string;
    }
  ): Promise<WrikeTimelog> {
    let response = await this.axios.put(`/timelogs/${timelogId}`, data);
    return response.data.data[0];
  }

  async deleteTimelog(timelogId: string): Promise<void> {
    await this.axios.delete(`/timelogs/${timelogId}`);
  }

  // ============ Contacts / Users ============

  async getContacts(params?: {
    contactIds?: string[];
    me?: boolean;
    fields?: string[];
  }): Promise<WrikeResponse<WrikeContact>> {
    let url = '/contacts';
    if (params?.contactIds && params.contactIds.length > 0) {
      url = `/contacts/${params.contactIds.join(',')}`;
    }

    let queryParams: Record<string, string> = {};
    if (params?.me) queryParams.me = 'true';
    if (params?.fields) queryParams.fields = JSON.stringify(params.fields);

    let response = await this.axios.get(url, { params: queryParams });
    return response.data;
  }

  // ============ Custom Fields ============

  async getCustomFields(params?: {
    customFieldIds?: string[];
  }): Promise<WrikeResponse<WrikeCustomField>> {
    let url = '/customfields';
    if (params?.customFieldIds && params.customFieldIds.length > 0) {
      url = `/customfields/${params.customFieldIds.join(',')}`;
    }

    let response = await this.axios.get(url);
    return response.data;
  }

  async createCustomField(data: {
    title: string;
    type: string;
    shareds?: string[];
    settings?: Record<string, unknown>;
    spaceId?: string;
  }): Promise<WrikeCustomField> {
    let response = await this.axios.post('/customfields', data);
    return response.data.data[0];
  }

  async updateCustomField(
    customFieldId: string,
    data: {
      title?: string;
      type?: string;
      shareds?: string[];
      settings?: Record<string, unknown>;
    }
  ): Promise<WrikeCustomField> {
    let response = await this.axios.put(`/customfields/${customFieldId}`, data);
    return response.data.data[0];
  }

  // ============ Workflows ============

  async getWorkflows(): Promise<WrikeResponse<WrikeWorkflow>> {
    let response = await this.axios.get('/workflows');
    return response.data;
  }

  async createWorkflow(data: { name: string }): Promise<WrikeWorkflow> {
    let response = await this.axios.post('/workflows', data);
    return response.data.data[0];
  }

  async updateWorkflow(
    workflowId: string,
    data: {
      name?: string;
      hidden?: boolean;
      customStatus?: {
        name: string;
        color: string;
        group: string;
        hidden?: boolean;
      };
    }
  ): Promise<WrikeWorkflow> {
    let response = await this.axios.put(`/workflows/${workflowId}`, data);
    return response.data.data[0];
  }

  // ============ Dependencies ============

  async getDependencies(params?: {
    taskId?: string;
    dependencyIds?: string[];
  }): Promise<WrikeResponse<WrikeDependency>> {
    let url = '/dependencies';
    if (params?.taskId) {
      url = `/tasks/${params.taskId}/dependencies`;
    } else if (params?.dependencyIds && params.dependencyIds.length > 0) {
      url = `/dependencies/${params.dependencyIds.join(',')}`;
    }

    let response = await this.axios.get(url);
    return response.data;
  }

  async createDependency(
    taskId: string,
    data: {
      predecessorId: string;
      relationType: string;
    }
  ): Promise<WrikeDependency> {
    let response = await this.axios.post(`/tasks/${taskId}/dependencies`, data);
    return response.data.data[0];
  }

  async deleteDependency(dependencyId: string): Promise<void> {
    await this.axios.delete(`/dependencies/${dependencyId}`);
  }

  // ============ Approvals ============

  async getApprovals(params?: {
    taskId?: string;
    folderId?: string;
  }): Promise<WrikeResponse<WrikeApproval>> {
    let url = '/approvals';
    if (params?.taskId) {
      url = `/tasks/${params.taskId}/approvals`;
    } else if (params?.folderId) {
      url = `/folders/${params.folderId}/approvals`;
    }

    let response = await this.axios.get(url);
    return response.data;
  }

  async createApproval(params: {
    taskId?: string;
    folderId?: string;
    description?: string;
    dueDate?: string;
    approvers?: string[];
  }): Promise<WrikeApproval> {
    let url: string;
    if (params.taskId) {
      url = `/tasks/${params.taskId}/approvals`;
    } else if (params.folderId) {
      url = `/folders/${params.folderId}/approvals`;
    } else {
      throw new Error('Either taskId or folderId must be provided');
    }

    let response = await this.axios.post(url, {
      description: params.description,
      dueDate: params.dueDate,
      approvers: params.approvers
    });
    return response.data.data[0];
  }

  // ============ Webhooks ============

  async getWebhooks(params?: {
    accountId?: string;
    webhookIds?: string[];
  }): Promise<WrikeResponse<WrikeWebhook>> {
    let url = '/webhooks';
    if (params?.webhookIds && params.webhookIds.length > 0) {
      url = `/webhooks/${params.webhookIds.join(',')}`;
    }

    let response = await this.axios.get(url);
    return response.data;
  }

  async createWebhook(data: {
    hookUrl: string;
    events?: string[];
    folderId?: string;
    spaceId?: string;
  }): Promise<WrikeWebhook> {
    let url = '/webhooks';
    if (data.folderId) {
      url = `/folders/${data.folderId}/webhooks`;
    } else if (data.spaceId) {
      url = `/spaces/${data.spaceId}/webhooks`;
    }

    let response = await this.axios.post(url, {
      hookUrl: data.hookUrl,
      events: data.events
    });
    return response.data.data[0];
  }

  async updateWebhook(
    webhookId: string,
    data: {
      status?: string;
      events?: string[];
    }
  ): Promise<WrikeWebhook> {
    let response = await this.axios.put(`/webhooks/${webhookId}`, data);
    return response.data.data[0];
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/webhooks/${webhookId}`);
  }

  // ============ Account ============

  async getAccount(params?: { fields?: string[] }): Promise<Record<string, unknown>> {
    let queryParams: Record<string, string> = {};
    if (params?.fields) queryParams.fields = JSON.stringify(params.fields);

    let response = await this.axios.get('/account', { params: queryParams });
    return response.data.data[0];
  }
}
