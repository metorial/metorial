import { createAxios } from 'slates';

export class ClickUpClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.clickup.com/api/v2',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Workspaces (Teams) ──

  async getWorkspaces() {
    let response = await this.axios.get('/team');
    return response.data.teams as any[];
  }

  // ── Spaces ──

  async getSpaces(teamId: string, archived?: boolean) {
    let response = await this.axios.get(`/team/${teamId}/space`, {
      params: { archived: archived ?? false }
    });
    return response.data.spaces as any[];
  }

  async getSpace(spaceId: string) {
    let response = await this.axios.get(`/space/${spaceId}`);
    return response.data as any;
  }

  async createSpace(
    teamId: string,
    data: { name: string; multipleAssignees?: boolean; features?: Record<string, any> }
  ) {
    let response = await this.axios.post(`/team/${teamId}/space`, data);
    return response.data as any;
  }

  async updateSpace(
    spaceId: string,
    data: {
      name?: string;
      color?: string;
      private?: boolean;
      adminCanManage?: boolean;
      multipleAssignees?: boolean;
      features?: Record<string, any>;
    }
  ) {
    let response = await this.axios.put(`/space/${spaceId}`, data);
    return response.data as any;
  }

  async deleteSpace(spaceId: string) {
    await this.axios.delete(`/space/${spaceId}`);
  }

  // ── Folders ──

  async getFolders(spaceId: string, archived?: boolean) {
    let response = await this.axios.get(`/space/${spaceId}/folder`, {
      params: { archived: archived ?? false }
    });
    return response.data.folders as any[];
  }

  async getFolder(folderId: string) {
    let response = await this.axios.get(`/folder/${folderId}`);
    return response.data as any;
  }

  async createFolder(spaceId: string, data: { name: string }) {
    let response = await this.axios.post(`/space/${spaceId}/folder`, data);
    return response.data as any;
  }

  async updateFolder(folderId: string, data: { name?: string }) {
    let response = await this.axios.put(`/folder/${folderId}`, data);
    return response.data as any;
  }

  async deleteFolder(folderId: string) {
    await this.axios.delete(`/folder/${folderId}`);
  }

  // ── Lists ──

  async getLists(folderId: string, archived?: boolean) {
    let response = await this.axios.get(`/folder/${folderId}/list`, {
      params: { archived: archived ?? false }
    });
    return response.data.lists as any[];
  }

  async getFolderlessLists(spaceId: string, archived?: boolean) {
    let response = await this.axios.get(`/space/${spaceId}/list`, {
      params: { archived: archived ?? false }
    });
    return response.data.lists as any[];
  }

  async getList(listId: string) {
    let response = await this.axios.get(`/list/${listId}`);
    return response.data as any;
  }

  async createList(
    folderId: string,
    data: {
      name: string;
      content?: string;
      dueDate?: number;
      priority?: number;
      assignee?: number;
      status?: string;
    }
  ) {
    let response = await this.axios.post(`/folder/${folderId}/list`, data);
    return response.data as any;
  }

  async createFolderlessList(
    spaceId: string,
    data: {
      name: string;
      content?: string;
      dueDate?: number;
      priority?: number;
      assignee?: number;
      status?: string;
    }
  ) {
    let response = await this.axios.post(`/space/${spaceId}/list`, data);
    return response.data as any;
  }

  async updateList(
    listId: string,
    data: {
      name?: string;
      content?: string;
      dueDate?: number;
      dueDateTime?: boolean;
      priority?: number;
      assignee?: string;
      unsetStatus?: boolean;
    }
  ) {
    let response = await this.axios.put(`/list/${listId}`, data);
    return response.data as any;
  }

  async deleteList(listId: string) {
    await this.axios.delete(`/list/${listId}`);
  }

  // ── Tasks ──

  async getTasks(
    listId: string,
    params?: {
      archived?: boolean;
      page?: number;
      orderBy?: string;
      reverse?: boolean;
      subtasks?: boolean;
      statuses?: string[];
      includeClosed?: boolean;
      assignees?: string[];
      tags?: string[];
      dueDateGt?: number;
      dueDateLt?: number;
      dateCreatedGt?: number;
      dateCreatedLt?: number;
      dateUpdatedGt?: number;
      dateUpdatedLt?: number;
    }
  ) {
    let response = await this.axios.get(`/list/${listId}/task`, {
      params: {
        archived: params?.archived,
        page: params?.page,
        order_by: params?.orderBy,
        reverse: params?.reverse,
        subtasks: params?.subtasks,
        statuses: params?.statuses,
        include_closed: params?.includeClosed,
        assignees: params?.assignees,
        tags: params?.tags,
        due_date_gt: params?.dueDateGt,
        due_date_lt: params?.dueDateLt,
        date_created_gt: params?.dateCreatedGt,
        date_created_lt: params?.dateCreatedLt,
        date_updated_gt: params?.dateUpdatedGt,
        date_updated_lt: params?.dateUpdatedLt
      }
    });
    return response.data as { tasks: any[] };
  }

  async getTask(taskId: string, params?: { includeSubtasks?: boolean }) {
    let response = await this.axios.get(`/task/${taskId}`, {
      params: { include_subtasks: params?.includeSubtasks }
    });
    return response.data as any;
  }

  async createTask(
    listId: string,
    data: {
      name: string;
      description?: string;
      assignees?: number[];
      tags?: string[];
      status?: string;
      priority?: number | null;
      dueDate?: number;
      dueDateTime?: boolean;
      timeEstimate?: number;
      startDate?: number;
      startDatetime?: boolean;
      notifyAll?: boolean;
      parent?: string | null;
      linksTo?: string | null;
      checkRequiredCustomFields?: boolean;
      customFields?: { id: string; value: any }[];
    }
  ) {
    let response = await this.axios.post(`/list/${listId}/task`, {
      name: data.name,
      description: data.description,
      assignees: data.assignees,
      tags: data.tags,
      status: data.status,
      priority: data.priority,
      due_date: data.dueDate,
      due_date_time: data.dueDateTime,
      time_estimate: data.timeEstimate,
      start_date: data.startDate,
      start_date_time: data.startDatetime,
      notify_all: data.notifyAll,
      parent: data.parent,
      links_to: data.linksTo,
      check_required_custom_fields: data.checkRequiredCustomFields,
      custom_fields: data.customFields
    });
    return response.data as any;
  }

  async updateTask(
    taskId: string,
    data: {
      name?: string;
      description?: string;
      assignees?: { add?: number[]; rem?: number[] };
      status?: string;
      priority?: number | null;
      dueDate?: number;
      dueDateTime?: boolean;
      timeEstimate?: number;
      startDate?: number;
      startDatetime?: boolean;
      parent?: string | null;
      archived?: boolean;
    }
  ) {
    let response = await this.axios.put(`/task/${taskId}`, {
      name: data.name,
      description: data.description,
      assignees: data.assignees,
      status: data.status,
      priority: data.priority,
      due_date: data.dueDate,
      due_date_time: data.dueDateTime,
      time_estimate: data.timeEstimate,
      start_date: data.startDate,
      start_date_time: data.startDatetime,
      parent: data.parent,
      archived: data.archived
    });
    return response.data as any;
  }

  async deleteTask(taskId: string) {
    await this.axios.delete(`/task/${taskId}`);
  }

  // ── Task Search ──

  async searchTasks(
    teamId: string,
    params?: {
      page?: number;
      orderBy?: string;
      reverse?: boolean;
      subtasks?: boolean;
      spaces?: string[];
      projectIds?: string[];
      listIds?: string[];
      statuses?: string[];
      includeClosed?: boolean;
      assignees?: string[];
      tags?: string[];
      dueDateGt?: number;
      dueDateLt?: number;
      dateCreatedGt?: number;
      dateCreatedLt?: number;
      dateUpdatedGt?: number;
      dateUpdatedLt?: number;
      includeMarkdownDescription?: boolean;
    }
  ) {
    let response = await this.axios.get(`/team/${teamId}/task`, {
      params: {
        page: params?.page,
        order_by: params?.orderBy,
        reverse: params?.reverse,
        subtasks: params?.subtasks,
        space_ids: params?.spaces,
        project_ids: params?.projectIds,
        list_ids: params?.listIds,
        statuses: params?.statuses,
        include_closed: params?.includeClosed,
        assignees: params?.assignees,
        tags: params?.tags,
        due_date_gt: params?.dueDateGt,
        due_date_lt: params?.dueDateLt,
        date_created_gt: params?.dateCreatedGt,
        date_created_lt: params?.dateCreatedLt,
        date_updated_gt: params?.dateUpdatedGt,
        date_updated_lt: params?.dateUpdatedLt,
        include_markdown_description: params?.includeMarkdownDescription
      }
    });
    return response.data as { tasks: any[] };
  }

  // ── Comments ──

  async getTaskComments(taskId: string, params?: { start?: number; startId?: string }) {
    let response = await this.axios.get(`/task/${taskId}/comment`, {
      params: { start: params?.start, start_id: params?.startId }
    });
    return response.data.comments as any[];
  }

  async createTaskComment(
    taskId: string,
    data: { commentText: string; assignee?: number; notifyAll?: boolean }
  ) {
    let response = await this.axios.post(`/task/${taskId}/comment`, {
      comment_text: data.commentText,
      assignee: data.assignee,
      notify_all: data.notifyAll ?? true
    });
    return response.data as any;
  }

  async updateComment(
    commentId: string,
    data: { commentText: string; assignee?: number; resolved?: boolean }
  ) {
    let response = await this.axios.put(`/comment/${commentId}`, {
      comment_text: data.commentText,
      assignee: data.assignee,
      resolved: data.resolved
    });
    return response.data as any;
  }

  async deleteComment(commentId: string) {
    await this.axios.delete(`/comment/${commentId}`);
  }

  // ── Custom Fields ──

  async getAccessibleCustomFields(listId: string) {
    let response = await this.axios.get(`/list/${listId}/field`);
    return response.data.fields as any[];
  }

  async setCustomFieldValue(taskId: string, fieldId: string, value: any) {
    let response = await this.axios.post(`/task/${taskId}/field/${fieldId}`, { value });
    return response.data as any;
  }

  async removeCustomFieldValue(taskId: string, fieldId: string) {
    await this.axios.delete(`/task/${taskId}/field/${fieldId}`);
  }

  // ── Tags ──

  async getSpaceTags(spaceId: string) {
    let response = await this.axios.get(`/space/${spaceId}/tag`);
    return response.data.tags as any[];
  }

  async createSpaceTag(
    spaceId: string,
    tag: { name: string; tagFg?: string; tagBg?: string }
  ) {
    let response = await this.axios.post(`/space/${spaceId}/tag`, { tag });
    return response.data as any;
  }

  async addTagToTask(taskId: string, tagName: string) {
    let response = await this.axios.post(`/task/${taskId}/tag/${tagName}`);
    return response.data as any;
  }

  async removeTagFromTask(taskId: string, tagName: string) {
    await this.axios.delete(`/task/${taskId}/tag/${tagName}`);
  }

  // ── Time Tracking ──

  async getTimeEntries(
    teamId: string,
    params?: {
      startDate?: number;
      endDate?: number;
      assignee?: string;
      spaceId?: string;
      folderId?: string;
      listId?: string;
      taskId?: string;
    }
  ) {
    let response = await this.axios.get(`/team/${teamId}/time_entries`, {
      params: {
        start_date: params?.startDate,
        end_date: params?.endDate,
        assignee: params?.assignee,
        include_location_names: true,
        space_id: params?.spaceId,
        folder_id: params?.folderId,
        list_id: params?.listId,
        task_id: params?.taskId
      }
    });
    return response.data.data as any[];
  }

  async createTimeEntry(
    teamId: string,
    data: {
      taskId?: string;
      description?: string;
      start: number;
      duration: number;
      assignee?: number;
      tags?: { name: string }[];
      billable?: boolean;
    }
  ) {
    let response = await this.axios.post(`/team/${teamId}/time_entries`, {
      tid: data.taskId,
      description: data.description,
      start: data.start,
      duration: data.duration,
      assignee: data.assignee,
      tags: data.tags,
      billable: data.billable
    });
    return response.data.data as any;
  }

  async deleteTimeEntry(teamId: string, timerId: string) {
    let response = await this.axios.delete(`/team/${teamId}/time_entries/${timerId}`);
    return response.data as any;
  }

  async startTimer(
    teamId: string,
    data: { taskId?: string; description?: string; billable?: boolean }
  ) {
    let response = await this.axios.post(`/team/${teamId}/time_entries/start`, {
      tid: data.taskId,
      description: data.description,
      billable: data.billable
    });
    return response.data.data as any;
  }

  async stopTimer(teamId: string) {
    let response = await this.axios.post(`/team/${teamId}/time_entries/stop`);
    return response.data.data as any;
  }

  async getRunningTimer(teamId: string, assignee?: string) {
    let response = await this.axios.get(`/team/${teamId}/time_entries/current`, {
      params: { assignee }
    });
    return response.data.data as any;
  }

  // ── Goals ──

  async getGoals(teamId: string, includeCompleted?: boolean) {
    let response = await this.axios.get(`/team/${teamId}/goal`, {
      params: { include_completed: includeCompleted }
    });
    return response.data.goals as any[];
  }

  async getGoal(goalId: string) {
    let response = await this.axios.get(`/goal/${goalId}`);
    return response.data.goal as any;
  }

  async createGoal(
    teamId: string,
    data: {
      name: string;
      dueDate?: number;
      description?: string;
      multipleOwners?: boolean;
      owners?: number[];
      color?: string;
    }
  ) {
    let response = await this.axios.post(`/team/${teamId}/goal`, data);
    return response.data.goal as any;
  }

  async updateGoal(
    goalId: string,
    data: {
      name?: string;
      dueDate?: number;
      description?: string;
      color?: string;
      addOwners?: number[];
      remOwners?: number[];
    }
  ) {
    let response = await this.axios.put(`/goal/${goalId}`, data);
    return response.data.goal as any;
  }

  async deleteGoal(goalId: string) {
    await this.axios.delete(`/goal/${goalId}`);
  }

  async createKeyResult(
    goalId: string,
    data: {
      name: string;
      owners?: number[];
      type: 'number' | 'currency' | 'boolean' | 'percentage' | 'automatic';
      stepsStart?: number;
      stepsEnd?: number;
      unit?: string;
      taskIds?: string[];
      listIds?: string[];
    }
  ) {
    let response = await this.axios.post(`/goal/${goalId}/key_result`, {
      name: data.name,
      owners: data.owners,
      type: data.type,
      steps_start: data.stepsStart,
      steps_end: data.stepsEnd,
      unit: data.unit,
      task_ids: data.taskIds,
      list_ids: data.listIds
    });
    return response.data as any;
  }

  async updateKeyResult(
    keyResultId: string,
    data: {
      stepsCurrent?: number;
      note?: string;
    }
  ) {
    let response = await this.axios.put(`/key_result/${keyResultId}`, {
      steps_current: data.stepsCurrent,
      note: data.note
    });
    return response.data as any;
  }

  async deleteKeyResult(keyResultId: string) {
    await this.axios.delete(`/key_result/${keyResultId}`);
  }

  // ── Views ──

  async getSpaceViews(spaceId: string) {
    let response = await this.axios.get(`/space/${spaceId}/view`);
    return response.data.views as any[];
  }

  async getFolderViews(folderId: string) {
    let response = await this.axios.get(`/folder/${folderId}/view`);
    return response.data.views as any[];
  }

  async getListViews(listId: string) {
    let response = await this.axios.get(`/list/${listId}/view`);
    return response.data.views as any[];
  }

  async getView(viewId: string) {
    let response = await this.axios.get(`/view/${viewId}`);
    return response.data.view as any;
  }

  async getViewTasks(viewId: string, page?: number) {
    let response = await this.axios.get(`/view/${viewId}/task`, {
      params: { page: page ?? 0 }
    });
    return response.data as { tasks: any[]; last_page: boolean };
  }

  // ── Members ──

  async getWorkspaceMembers(teamId: string) {
    let response = await this.axios.get(`/team/${teamId}`);
    return (response.data.team?.members as any[]) ?? [];
  }

  async getListMembers(listId: string) {
    let response = await this.axios.get(`/list/${listId}/member`);
    return response.data.members as any[];
  }

  async getTaskMembers(taskId: string) {
    let response = await this.axios.get(`/task/${taskId}/member`);
    return response.data.members as any[];
  }

  // ── Webhooks ──

  async getWebhooks(teamId: string) {
    let response = await this.axios.get(`/team/${teamId}/webhook`);
    return response.data.webhooks as any[];
  }

  async createWebhook(
    teamId: string,
    data: {
      endpoint: string;
      events: string[];
      spaceId?: string;
      folderId?: string;
      listId?: string;
      taskId?: string;
    }
  ) {
    let body: Record<string, any> = {
      endpoint: data.endpoint,
      events: data.events
    };
    if (data.spaceId) body.space_id = data.spaceId;
    if (data.folderId) body.folder_id = data.folderId;
    if (data.listId) body.list_id = data.listId;
    if (data.taskId) body.task_id = data.taskId;

    let response = await this.axios.post(`/team/${teamId}/webhook`, body);
    return response.data as any;
  }

  async updateWebhook(
    webhookId: string,
    data: {
      endpoint?: string;
      events?: string[];
      status?: 'active' | 'inactive';
    }
  ) {
    let response = await this.axios.put(`/webhook/${webhookId}`, data);
    return response.data as any;
  }

  async deleteWebhook(webhookId: string) {
    await this.axios.delete(`/webhook/${webhookId}`);
  }

  // ── User ──

  async getAuthorizedUser() {
    let response = await this.axios.get('/user');
    return response.data.user as any;
  }

  // ── Task Checklists ──

  async createChecklist(taskId: string, name: string) {
    let response = await this.axios.post(`/task/${taskId}/checklist`, { name });
    return response.data.checklist as any;
  }

  async createChecklistItem(checklistId: string, name: string, assignee?: number) {
    let response = await this.axios.post(`/checklist/${checklistId}/checklist_item`, {
      name,
      assignee
    });
    return response.data.checklist as any;
  }

  async updateChecklistItem(
    checklistId: string,
    checklistItemId: string,
    data: { name?: string; resolved?: boolean; assignee?: number | null }
  ) {
    let response = await this.axios.put(
      `/checklist/${checklistId}/checklist_item/${checklistItemId}`,
      data
    );
    return response.data.checklist as any;
  }

  async deleteChecklist(checklistId: string) {
    await this.axios.delete(`/checklist/${checklistId}`);
  }
}
