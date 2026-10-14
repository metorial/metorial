import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';
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
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string; host: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: `https://${config.host}/api/v4`,
      authHeader: { value: `bearer ${config.token}` },
      contentType: false,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Wrike',
          reason: 'wrike_api_error',
          detailKeys: ['errorDescription', 'error', 'message', 'error_description']
        })
    });
  }

  private async write<T>(method: 'post' | 'put', url: string, data: Record<string, unknown>) {
    let params: Record<string, string> = {};
    for (let [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        params[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
    }
    let response = await this.axios.request<WrikeResponse<T>>({ method, url, params });
    let entity = response.data.data[0];
    if (!entity) {
      throw createApiServiceError('Wrike returned no resource for the requested operation.', {
        reason: 'empty_api_response'
      });
    }
    return entity;
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
    if (params?.folderId && params.taskIds?.length) {
      throw createApiServiceError('Use folderId or taskIds, not both.', {
        reason: 'invalid_resource_scope'
      });
    }
    let url = '/tasks';
    if (params?.folderId) {
      url = `/folders/${params.folderId}/tasks`;
    } else if (params?.taskIds && params.taskIds.length > 0) {
      url = `/tasks/${params.taskIds.join(',')}`;
    }

    let queryParams: Record<string, string> = {};

    if (params?.title) queryParams.title = params.title;
    if (params?.status) queryParams.status = JSON.stringify([params.status]);
    if (params?.importance) queryParams.importance = params.importance;
    if (params?.taskIds?.length) {
      if (params.fields) queryParams.fields = JSON.stringify(params.fields);
    } else {
      queryParams.fields = JSON.stringify([
        ...new Set(['parentIds', ...(params?.fields ?? [])])
      ]);
    }
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
    let response = await this.write<WrikeTask>('post', `/folders/${folderId}/tasks`, data);
    return response;
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
    let response = await this.write<WrikeTask>('put', `/tasks/${taskId}`, data);
    return response;
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.axios.delete(`/tasks/${taskId}`);
  }

  // ============ Folders & Projects ============

  async getFolders(params?: {
    folderId?: string;
    folderIds?: string[];
    spaceId?: string;
    fields?: string[];
    project?: boolean;
  }): Promise<WrikeResponse<WrikeFolder>> {
    if (
      [params?.folderId, params?.spaceId, params?.folderIds?.length].filter(Boolean).length > 1
    ) {
      throw createApiServiceError('Use only one of parentFolderId, spaceId, or folderIds.', {
        reason: 'invalid_resource_scope'
      });
    }
    let url = '/folders';
    if (params?.folderId) {
      url = `/folders/${params.folderId}/folders`;
    } else if (params?.spaceId) {
      url = `/spaces/${params.spaceId}/folders`;
    } else if (params?.folderIds && params.folderIds.length > 0) {
      url = `/folders/${params.folderIds.join(',')}`;
    }

    let queryParams: Record<string, string> = {};
    if (params?.fields) queryParams.fields = JSON.stringify(params.fields);
    if (params?.project === true) queryParams.project = 'true';

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
    let response = await this.write<WrikeFolder>(
      'post',
      `/folders/${parentFolderId}/folders`,
      data
    );
    return response;
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
    let response = await this.write<WrikeFolder>('put', `/folders/${folderId}`, data);
    return response;
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
    if (params?.taskId && params?.folderId) {
      throw createApiServiceError('Use taskId or folderId, not both.', {
        reason: 'invalid_resource_scope'
      });
    }
    let url = '/comments';
    if (params?.taskId) {
      url = `/tasks/${params.taskId}/comments`;
    } else if (params?.folderId) {
      url = `/folders/${params.folderId}/comments`;
    }

    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.plainText !== undefined) queryParams.plainText = String(params.plainText);

    let response = await this.axios.get(url, { params: queryParams });
    return response.data;
  }

  async createComment(params: {
    taskId?: string;
    folderId?: string;
    text: string;
    plainText?: boolean;
  }): Promise<WrikeComment> {
    if (params.taskId && params.folderId) {
      throw createApiServiceError('Use taskId or folderId, not both.', {
        reason: 'invalid_resource_scope'
      });
    }
    let url: string;
    if (params.taskId) {
      url = `/tasks/${params.taskId}/comments`;
    } else if (params.folderId) {
      url = `/folders/${params.folderId}/comments`;
    } else {
      throw createApiServiceError('Provide either taskId or folderId.', {
        reason: 'invalid_resource_scope'
      });
    }

    let response = await this.write<WrikeComment>('post', url, {
      text: params.text,
      plainText: params.plainText
    });
    return response;
  }

  async updateComment(
    commentId: string,
    data: { text: string; plainText?: boolean }
  ): Promise<WrikeComment> {
    let response = await this.write<WrikeComment>('put', `/comments/${commentId}`, data);
    return response;
  }

  async deleteComment(commentId: string): Promise<void> {
    await this.axios.delete(`/comments/${commentId}`);
  }

  // ============ Attachments ============

  async getAttachments(params?: {
    taskId?: string;
    folderId?: string;
  }): Promise<WrikeResponse<WrikeAttachment>> {
    if (params?.taskId && params?.folderId) {
      throw createApiServiceError('Use taskId or folderId, not both.', {
        reason: 'invalid_resource_scope'
      });
    }
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
    if ([params?.taskId, params?.contactId, params?.folderId].filter(Boolean).length > 1) {
      throw createApiServiceError('Use only one of taskId, contactId, or folderId.', {
        reason: 'invalid_resource_scope'
      });
    }
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
    let response = await this.write<WrikeTimelog>('post', `/tasks/${taskId}/timelogs`, {
      ...data,
      comment: data.comment ?? ''
    });
    return response;
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
    let response = await this.write<WrikeTimelog>('put', `/timelogs/${timelogId}`, data);
    return response;
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
    if (params?.me && params.contactIds?.length) {
      throw createApiServiceError('Use currentUserOnly or contactIds, not both.', {
        reason: 'invalid_resource_scope'
      });
    }
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
    let response = await this.write<WrikeCustomField>('post', '/customfields', {
      ...data,
      type: data.type === 'MultiSelect' ? 'Multiple' : data.type
    });
    return response;
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
    let response = await this.write<WrikeCustomField>(
      'put',
      `/customfields/${customFieldId}`,
      data
    );
    return response;
  }

  // ============ Workflows ============

  async getWorkflows(): Promise<WrikeResponse<WrikeWorkflow>> {
    let response = await this.axios.get('/workflows');
    return response.data;
  }

  async createWorkflow(data: { name: string }): Promise<WrikeWorkflow> {
    let response = await this.write<WrikeWorkflow>('post', '/workflows', data);
    return response;
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
    let response = await this.write<WrikeWorkflow>('put', `/workflows/${workflowId}`, data);
    return response;
  }

  // ============ Dependencies ============

  async getDependencies(params?: {
    taskId?: string;
    dependencyIds?: string[];
  }): Promise<WrikeResponse<WrikeDependency>> {
    if (params?.taskId && params.dependencyIds?.length) {
      throw createApiServiceError('Use taskId or dependencyIds, not both.', {
        reason: 'invalid_resource_scope'
      });
    }
    if (!params?.taskId && !params?.dependencyIds?.length) {
      throw createApiServiceError(
        'Provide taskId or dependencyIds. Call list_tasks to discover task IDs.',
        { reason: 'invalid_resource_scope' }
      );
    }
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
    let response = await this.write<WrikeDependency>(
      'post',
      `/tasks/${taskId}/dependencies`,
      data
    );
    return response;
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
    if (params.taskId && params.folderId) {
      throw createApiServiceError('Use taskId or folderId, not both.', {
        reason: 'invalid_resource_scope'
      });
    }
    let url: string;
    if (params.taskId) {
      url = `/tasks/${params.taskId}/approvals`;
    } else if (params.folderId) {
      url = `/folders/${params.folderId}/approvals`;
    } else {
      throw createApiServiceError('Provide either taskId or folderId.', {
        reason: 'invalid_resource_scope'
      });
    }

    let response = await this.write<WrikeApproval>('post', url, {
      description: params.description,
      dueDate: params.dueDate,
      approvers: params.approvers
    });
    return response;
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
