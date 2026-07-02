import { createAxios } from 'slates';
import { asanaApiError } from './errors';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://app.asana.com/api/1.0',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });

    this.axios.interceptors.response.use(
      response => response,
      error => Promise.reject(asanaApiError(error))
    );
  }

  // ── Workspaces ──

  async listWorkspaces(params?: { limit?: number; offset?: string }) {
    let response = await this.axios.get('/workspaces', {
      params: { limit: params?.limit ?? 100, offset: params?.offset }
    });
    return response.data;
  }

  async getWorkspace(workspaceId: string) {
    let response = await this.axios.get(`/workspaces/${workspaceId}`);
    return response.data.data;
  }

  // ── Users ──

  async getMe() {
    let response = await this.axios.get('/users/me');
    return response.data.data;
  }

  async getUser(userId: string) {
    let response = await this.axios.get(`/users/${userId}`);
    return response.data.data;
  }

  async listUsersInWorkspace(
    workspaceId: string,
    params?: { limit?: number; offset?: string }
  ) {
    let response = await this.axios.get(`/workspaces/${workspaceId}/users`, {
      params: { limit: params?.limit ?? 100, offset: params?.offset }
    });
    return response.data;
  }

  // ── Projects ──

  async listProjects(
    workspaceId: string,
    params?: { limit?: number; offset?: string; archived?: boolean; team?: string }
  ) {
    let path = params?.team
      ? `/teams/${params.team}/projects`
      : `/workspaces/${workspaceId}/projects`;
    let response = await this.axios.get(path, {
      params: {
        limit: params?.limit ?? 100,
        offset: params?.offset,
        archived: params?.archived,
        opt_fields:
          'name,gid,archived,color,created_at,current_status,due_on,start_on,modified_at,owner,team,workspace,notes,public,default_view'
      }
    });
    return response.data;
  }

  async getProject(projectId: string) {
    let response = await this.axios.get(`/projects/${projectId}`, {
      params: {
        opt_fields:
          'name,gid,archived,color,created_at,current_status,due_on,start_on,modified_at,owner,team,workspace,notes,public,default_view,members,followers,custom_fields,custom_field_settings'
      }
    });
    return response.data.data;
  }

  async createProject(workspaceId: string, data: Record<string, any>) {
    let { team, ...projectData } = data;
    let path = team ? `/teams/${team}/projects` : `/workspaces/${workspaceId}/projects`;
    let response = await this.axios.post(path, { data: projectData });
    return response.data.data;
  }

  async updateProject(projectId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/projects/${projectId}`, { data });
    return response.data.data;
  }

  async deleteProject(projectId: string) {
    await this.axios.delete(`/projects/${projectId}`);
  }

  // ── Sections ──

  async listSections(projectId: string) {
    let response = await this.axios.get(`/projects/${projectId}/sections`, {
      params: { opt_fields: 'name,gid,created_at' }
    });
    return response.data;
  }

  async createSection(
    projectId: string,
    name: string,
    insertBefore?: string,
    insertAfter?: string
  ) {
    let data: Record<string, any> = { name };
    if (insertBefore) data.insert_before = insertBefore;
    if (insertAfter) data.insert_after = insertAfter;
    let response = await this.axios.post(`/projects/${projectId}/sections`, { data });
    return response.data.data;
  }

  async updateSection(sectionId: string, name: string) {
    let response = await this.axios.put(`/sections/${sectionId}`, { data: { name } });
    return response.data.data;
  }

  async deleteSection(sectionId: string) {
    await this.axios.delete(`/sections/${sectionId}`);
  }

  async addTaskToSection(
    sectionId: string,
    taskId: string,
    insertBefore?: string,
    insertAfter?: string
  ) {
    let data: Record<string, any> = { task: taskId };
    if (insertBefore) data.insert_before = insertBefore;
    if (insertAfter) data.insert_after = insertAfter;
    await this.axios.post(`/sections/${sectionId}/addTask`, { data });
  }

  // ── Tasks ──

  async listTasks(params: {
    project?: string;
    section?: string;
    assignee?: string;
    workspace?: string;
    limit?: number;
    offset?: string;
    completedSince?: string;
    modifiedSince?: string;
  }) {
    let queryParams: Record<string, any> = {
      limit: params.limit ?? 100,
      offset: params.offset,
      opt_fields:
        'name,gid,assignee,assignee.name,completed,completed_at,created_at,due_on,due_at,modified_at,notes,num_subtasks,parent,projects,tags,memberships.section.name,custom_fields'
    };

    if (params.project) queryParams.project = params.project;
    if (params.section) queryParams.section = params.section;
    if (params.assignee) {
      queryParams.assignee = params.assignee;
      if (params.workspace) queryParams.workspace = params.workspace;
    }
    if (params.completedSince) queryParams.completed_since = params.completedSince;
    if (params.modifiedSince) queryParams.modified_since = params.modifiedSince;

    let response = await this.axios.get('/tasks', { params: queryParams });
    return response.data;
  }

  async getTask(taskId: string) {
    let response = await this.axios.get(`/tasks/${taskId}`, {
      params: {
        opt_fields:
          'name,gid,assignee,assignee.name,assignee_status,completed,completed_at,created_at,due_on,due_at,modified_at,notes,html_notes,num_subtasks,parent,parent.name,projects,projects.name,tags,tags.name,followers,followers.name,memberships.section.name,memberships.project.name,custom_fields,dependencies,dependents,start_on,start_at,resource_subtype'
      }
    });
    return response.data.data;
  }

  async createTask(data: Record<string, any>) {
    let response = await this.axios.post('/tasks', { data });
    return response.data.data;
  }

  async updateTask(taskId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/tasks/${taskId}`, { data });
    return response.data.data;
  }

  async deleteTask(taskId: string) {
    await this.axios.delete(`/tasks/${taskId}`);
  }

  async addDependenciesToTask(taskId: string, dependencyIds: string[]) {
    await this.axios.post(`/tasks/${taskId}/addDependencies`, {
      data: { dependencies: dependencyIds }
    });
  }

  async addDependentsToTask(taskId: string, dependentIds: string[]) {
    await this.axios.post(`/tasks/${taskId}/addDependents`, {
      data: { dependents: dependentIds }
    });
  }

  async removeDependenciesFromTask(taskId: string, dependencyIds: string[]) {
    await this.axios.post(`/tasks/${taskId}/removeDependencies`, {
      data: { dependencies: dependencyIds }
    });
  }

  async removeDependentsFromTask(taskId: string, dependentIds: string[]) {
    await this.axios.post(`/tasks/${taskId}/removeDependents`, {
      data: { dependents: dependentIds }
    });
  }

  async addProjectToTask(
    taskId: string,
    projectId: string,
    sectionId?: string,
    insertBefore?: string,
    insertAfter?: string
  ) {
    let data: Record<string, any> = { project: projectId };
    if (sectionId) data.section = sectionId;
    if (insertBefore) data.insert_before = insertBefore;
    if (insertAfter) data.insert_after = insertAfter;
    await this.axios.post(`/tasks/${taskId}/addProject`, { data });
  }

  async removeProjectFromTask(taskId: string, projectId: string) {
    await this.axios.post(`/tasks/${taskId}/removeProject`, { data: { project: projectId } });
  }

  async addTagToTask(taskId: string, tagId: string) {
    await this.axios.post(`/tasks/${taskId}/addTag`, { data: { tag: tagId } });
  }

  async removeTagFromTask(taskId: string, tagId: string) {
    await this.axios.post(`/tasks/${taskId}/removeTag`, { data: { tag: tagId } });
  }

  async addFollowersToTask(taskId: string, followerIds: string[]) {
    await this.axios.post(`/tasks/${taskId}/addFollowers`, {
      data: { followers: followerIds }
    });
  }

  async removeFollowersFromTask(taskId: string, followerIds: string[]) {
    await this.axios.post(`/tasks/${taskId}/removeFollowers`, {
      data: { followers: followerIds }
    });
  }

  async setParentForTask(
    taskId: string,
    parentId: string | null,
    insertBefore?: string,
    insertAfter?: string
  ) {
    let data: Record<string, any> = { parent: parentId };
    if (insertBefore) data.insert_before = insertBefore;
    if (insertAfter) data.insert_after = insertAfter;
    await this.axios.post(`/tasks/${taskId}/setParent`, { data });
  }

  // ── Subtasks ──

  async listSubtasks(taskId: string, params?: { limit?: number; offset?: string }) {
    let response = await this.axios.get(`/tasks/${taskId}/subtasks`, {
      params: {
        limit: params?.limit ?? 100,
        offset: params?.offset,
        opt_fields:
          'name,gid,assignee,assignee.name,completed,completed_at,due_on,due_at,created_at,modified_at,notes,resource_subtype'
      }
    });
    return response.data;
  }

  async createSubtask(parentTaskId: string, data: Record<string, any>) {
    let response = await this.axios.post(`/tasks/${parentTaskId}/subtasks`, { data });
    return response.data.data;
  }

  // ── Stories ──

  async listStories(taskId: string, params?: { limit?: number; offset?: string }) {
    let response = await this.axios.get(`/tasks/${taskId}/stories`, {
      params: {
        limit: params?.limit ?? 100,
        offset: params?.offset,
        opt_fields:
          'gid,created_at,created_by,created_by.name,resource_subtype,text,html_text,type'
      }
    });
    return response.data;
  }

  async createStory(taskId: string, text: string, isPinned?: boolean) {
    let data: Record<string, any> = { text };
    if (isPinned !== undefined) data.is_pinned = isPinned;
    let response = await this.axios.post(`/tasks/${taskId}/stories`, { data });
    return response.data.data;
  }

  async updateStory(storyId: string, text: string, isPinned?: boolean) {
    let data: Record<string, any> = { text };
    if (isPinned !== undefined) data.is_pinned = isPinned;
    let response = await this.axios.put(`/stories/${storyId}`, { data });
    return response.data.data;
  }

  async deleteStory(storyId: string) {
    await this.axios.delete(`/stories/${storyId}`);
  }

  // ── Tags ──

  async listTags(workspaceId: string, params?: { limit?: number; offset?: string }) {
    let response = await this.axios.get('/tags', {
      params: {
        workspace: workspaceId,
        limit: params?.limit ?? 100,
        offset: params?.offset,
        opt_fields: 'name,gid,color,created_at'
      }
    });
    return response.data;
  }

  async createTag(workspaceId: string, name: string, color?: string) {
    let data: Record<string, any> = { name, workspace: workspaceId };
    if (color) data.color = color;
    let response = await this.axios.post('/tags', { data });
    return response.data.data;
  }

  async getTag(tagId: string) {
    let response = await this.axios.get(`/tags/${tagId}`);
    return response.data.data;
  }

  async updateTag(tagId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/tags/${tagId}`, { data });
    return response.data.data;
  }

  // ── Portfolios ──

  async listPortfolios(
    workspaceId: string,
    owner: string,
    params?: { limit?: number; offset?: string }
  ) {
    let response = await this.axios.get('/portfolios', {
      params: {
        workspace: workspaceId,
        owner,
        limit: params?.limit ?? 100,
        offset: params?.offset,
        opt_fields: 'name,gid,color,created_at,created_by,owner,members,due_on,start_on'
      }
    });
    return response.data;
  }

  async getPortfolio(portfolioId: string) {
    let response = await this.axios.get(`/portfolios/${portfolioId}`, {
      params: {
        opt_fields:
          'name,gid,color,created_at,created_by,owner,members,due_on,start_on,custom_field_settings,custom_fields'
      }
    });
    return response.data.data;
  }

  async createPortfolio(workspaceId: string, data: Record<string, any>) {
    let response = await this.axios.post('/portfolios', {
      data: { ...data, workspace: workspaceId }
    });
    return response.data.data;
  }

  async updatePortfolio(portfolioId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/portfolios/${portfolioId}`, { data });
    return response.data.data;
  }

  async deletePortfolio(portfolioId: string) {
    await this.axios.delete(`/portfolios/${portfolioId}`);
  }

  async listPortfolioItems(portfolioId: string, params?: { limit?: number; offset?: string }) {
    let response = await this.axios.get(`/portfolios/${portfolioId}/items`, {
      params: {
        limit: params?.limit ?? 100,
        offset: params?.offset,
        opt_fields: 'name,gid,resource_type'
      }
    });
    return response.data;
  }

  async addItemToPortfolio(portfolioId: string, itemId: string) {
    await this.axios.post(`/portfolios/${portfolioId}/addItem`, { data: { item: itemId } });
  }

  async removeItemFromPortfolio(portfolioId: string, itemId: string) {
    await this.axios.post(`/portfolios/${portfolioId}/removeItem`, { data: { item: itemId } });
  }

  // ── Goals ──

  async listGoals(params: {
    workspaceId?: string;
    portfolioId?: string;
    teamId?: string;
    isWorkspaceLevel?: boolean;
    limit?: number;
    offset?: string;
  }) {
    let queryParams: Record<string, any> = {
      limit: params.limit ?? 100,
      offset: params.offset,
      opt_fields:
        'name,gid,owner,due_on,start_on,status,html_notes,notes,current_status_update,workspace,team,followers,liked,likes'
    };
    if (params.workspaceId) queryParams.workspace = params.workspaceId;
    if (params.portfolioId) queryParams.portfolio = params.portfolioId;
    if (params.teamId) queryParams.team = params.teamId;
    if (params.isWorkspaceLevel !== undefined)
      queryParams.is_workspace_level = params.isWorkspaceLevel;

    let response = await this.axios.get('/goals', { params: queryParams });
    return response.data;
  }

  async getGoal(goalId: string) {
    let response = await this.axios.get(`/goals/${goalId}`, {
      params: {
        opt_fields:
          'name,gid,owner,due_on,start_on,status,html_notes,notes,current_status_update,workspace,team,followers,liked,likes,metric'
      }
    });
    return response.data.data;
  }

  // ── Custom Fields ──

  async listCustomFieldsInWorkspace(
    workspaceId: string,
    params?: { limit?: number; offset?: string }
  ) {
    let response = await this.axios.get(`/workspaces/${workspaceId}/custom_fields`, {
      params: {
        limit: params?.limit ?? 100,
        offset: params?.offset,
        opt_fields:
          'name,gid,type,resource_subtype,enum_options,description,precision,format,currency_code,has_notifications_enabled'
      }
    });
    return response.data;
  }

  async getCustomField(customFieldId: string) {
    let response = await this.axios.get(`/custom_fields/${customFieldId}`, {
      params: {
        opt_fields:
          'name,gid,type,resource_subtype,enum_options,description,precision,format,currency_code,has_notifications_enabled,enum_options.name,enum_options.color,enum_options.enabled'
      }
    });
    return response.data.data;
  }

  async createCustomField(workspaceId: string, data: Record<string, any>) {
    let response = await this.axios.post('/custom_fields', {
      data: { ...data, workspace: workspaceId }
    });
    return response.data.data;
  }

  async updateCustomField(customFieldId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/custom_fields/${customFieldId}`, { data });
    return response.data.data;
  }

  async createEnumOption(customFieldId: string, data: Record<string, any>) {
    let response = await this.axios.post(`/custom_fields/${customFieldId}/enum_options`, {
      data
    });
    return response.data.data;
  }

  async updateEnumOption(enumOptionId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/enum_options/${enumOptionId}`, { data });
    return response.data.data;
  }

  // ── Teams ──

  async listTeamsInWorkspace(
    workspaceId: string,
    params?: { limit?: number; offset?: string }
  ) {
    let response = await this.axios.get(`/organizations/${workspaceId}/teams`, {
      params: {
        limit: params?.limit ?? 100,
        offset: params?.offset,
        opt_fields: 'name,gid,description,html_description'
      }
    });
    return response.data;
  }

  async getTeam(teamId: string) {
    let response = await this.axios.get(`/teams/${teamId}`);
    return response.data.data;
  }

  // ── Search ──

  async searchTasks(workspaceId: string, params: Record<string, any>) {
    let queryParams: Record<string, any> = {
      ...params,
      opt_fields:
        'name,gid,assignee,assignee.name,completed,completed_at,due_on,due_at,created_at,modified_at,notes,projects,projects.name,tags,tags.name,custom_fields'
    };
    let response = await this.axios.get(`/workspaces/${workspaceId}/tasks/search`, {
      params: queryParams
    });
    return response.data;
  }

  // ── Typeahead ──

  async typeahead(workspaceId: string, resourceType: string, query: string, count?: number) {
    let response = await this.axios.get(`/workspaces/${workspaceId}/typeahead`, {
      params: { resource_type: resourceType, query, count: count ?? 20 }
    });
    return response.data;
  }

  // ── Attachments ──

  async listAttachments(parentId: string, params?: { limit?: number; offset?: string }) {
    let response = await this.axios.get('/attachments', {
      params: {
        parent: parentId,
        limit: params?.limit ?? 100,
        offset: params?.offset,
        opt_fields:
          'name,gid,resource_type,created_at,download_url,host,parent,view_url,resource_subtype,size'
      }
    });
    return response.data;
  }

  async getAttachment(attachmentId: string) {
    let response = await this.axios.get(`/attachments/${attachmentId}`, {
      params: {
        opt_fields:
          'name,gid,resource_type,created_at,download_url,host,parent,view_url,resource_subtype,size'
      }
    });
    return response.data.data;
  }

  async createExternalAttachment(params: {
    parentId: string;
    url: string;
    name: string;
    connectToApp?: boolean;
  }) {
    let form = new FormData();
    form.append('parent', params.parentId);
    form.append('resource_subtype', 'external');
    form.append('url', params.url);
    form.append('name', params.name);
    if (params.connectToApp !== undefined) {
      form.append('connect_to_app', String(params.connectToApp));
    }

    let response = await this.axios.post('/attachments', form);
    return response.data.data;
  }

  async uploadAttachment(params: {
    parentId: string;
    fileName: string;
    contentBase64: string;
    mimeType?: string;
  }) {
    let fileBytes = Buffer.from(params.contentBase64, 'base64');
    let form = new FormData();
    let blob = new Blob([fileBytes], {
      type: params.mimeType ?? 'application/octet-stream'
    });

    form.append('parent', params.parentId);
    form.append('file', blob, params.fileName);

    let response = await this.axios.post('/attachments', form);
    return response.data.data;
  }

  async deleteAttachment(attachmentId: string) {
    await this.axios.delete(`/attachments/${attachmentId}`);
  }

  // ── Webhooks ──

  async listWebhooks(workspaceId: string, params?: { limit?: number; offset?: string }) {
    let response = await this.axios.get('/webhooks', {
      params: { workspace: workspaceId, limit: params?.limit ?? 100, offset: params?.offset }
    });
    return response.data;
  }

  async createWebhook(resourceId: string, target: string, filters?: Record<string, any>[]) {
    let data: Record<string, any> = { resource: resourceId, target };
    if (filters) data.filters = filters;
    let response = await this.axios.post('/webhooks', { data });
    let payload: any = response.data;
    return {
      webhook: payload?.data,
      hookSecret:
        response.headers?.['x-hook-secret'] ??
        response.headers?.['X-Hook-Secret'] ??
        payload?.['X-Hook-Secret'] ??
        null
    };
  }

  async getWebhook(webhookId: string) {
    let response = await this.axios.get(`/webhooks/${webhookId}`);
    return response.data.data;
  }

  async deleteWebhook(webhookId: string) {
    await this.axios.delete(`/webhooks/${webhookId}`);
  }

  // ── Events (polling) ──

  async getEvents(resourceId: string, syncToken?: string) {
    let params: Record<string, any> = { resource: resourceId };
    if (syncToken) params.sync = syncToken;
    let response = await this.axios.get('/events', { params });
    return response.data;
  }

  // ── Project Templates ──

  async listProjectTemplates(params: {
    workspaceId?: string;
    teamId?: string;
    limit?: number;
    offset?: string;
  }) {
    let response = await this.axios.get('/project_templates', {
      params: {
        workspace: params.workspaceId,
        team: params.teamId,
        limit: params.limit ?? 100,
        offset: params.offset,
        opt_fields: 'name,gid,description,color,public,requested_dates,team,workspace'
      }
    });
    return response.data;
  }

  async getProjectTemplate(templateId: string) {
    let response = await this.axios.get(`/project_templates/${templateId}`, {
      params: {
        opt_fields: 'name,gid,description,color,public,requested_dates,team,workspace'
      }
    });
    return response.data.data;
  }

  async instantiateProjectTemplate(templateId: string, data: Record<string, any>) {
    let response = await this.axios.post(
      `/project_templates/${templateId}/instantiateProject`,
      { data }
    );
    return response.data.data;
  }

  // ── Time Tracking ──

  async listTimeTrackingEntries(taskId: string, params?: { limit?: number; offset?: string }) {
    let response = await this.axios.get(`/tasks/${taskId}/time_tracking_entries`, {
      params: {
        limit: params?.limit ?? 100,
        offset: params?.offset,
        opt_fields:
          'gid,created_by,created_by.name,duration_minutes,entered_on,created_at,task'
      }
    });
    return response.data;
  }

  async getTimeTrackingEntry(timeTrackingEntryId: string) {
    let response = await this.axios.get(`/time_tracking_entries/${timeTrackingEntryId}`, {
      params: {
        opt_fields:
          'gid,created_by,created_by.name,duration_minutes,entered_on,created_at,task'
      }
    });
    return response.data.data;
  }

  // ── User Task Lists ──

  async getUserTaskList(userId: string, workspaceId: string) {
    let response = await this.axios.get(`/users/${userId}/user_task_list`, {
      params: { workspace: workspaceId }
    });
    return response.data.data;
  }
}
