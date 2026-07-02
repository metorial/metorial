import { createAxios } from 'slates';

export class TeamworkClient {
  private axios;

  constructor(config: {
    token: string;
    siteName: string;
    region: string;
    apiEndpoint?: string;
  }) {
    let baseURL: string;
    if (config.apiEndpoint) {
      baseURL = config.apiEndpoint;
    } else {
      let domain = config.region === 'eu' ? 'eu.teamwork.com' : 'teamwork.com';
      baseURL = `https://${config.siteName}.${domain}`;
    }

    let isApiKey = !config.apiEndpoint;
    let authHeader = isApiKey
      ? `Basic ${btoa(`${config.token}:x`)}`
      : `Bearer ${config.token}`;

    this.axios = createAxios({
      baseURL,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Projects ──────────────────────────────────────────────

  async listProjects(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
    searchTerm?: string;
    orderBy?: string;
    companyId?: string;
    categoryId?: string;
    includeCounts?: boolean;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.status) queryParams.status = params.status;
    if (params?.page) queryParams.page = String(params.page);
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.searchTerm) queryParams.searchTerm = params.searchTerm;
    if (params?.orderBy) queryParams.orderBy = params.orderBy;
    if (params?.companyId) queryParams.companyId = params.companyId;
    if (params?.categoryId) queryParams.categoryId = params.categoryId;
    if (params?.includeCounts) queryParams.includeCounts = 'true';

    let response = await this.axios.get('/projects.json', { params: queryParams });
    return response.data;
  }

  async getProject(projectId: string) {
    let response = await this.axios.get(`/projects/${projectId}.json`);
    return response.data;
  }

  async createProject(data: {
    name: string;
    description?: string;
    companyId?: string;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    tags?: string;
  }) {
    let response = await this.axios.post('/projects.json', {
      project: {
        name: data.name,
        description: data.description,
        companyId: data.companyId,
        categoryId: data.categoryId,
        'start-date': data.startDate,
        'end-date': data.endDate,
        status: data.status,
        tags: data.tags
      }
    });
    return response.data;
  }

  async updateProject(
    projectId: string,
    data: {
      name?: string;
      description?: string;
      companyId?: string;
      categoryId?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
      tags?: string;
    }
  ) {
    let response = await this.axios.put(`/projects/${projectId}.json`, {
      project: {
        name: data.name,
        description: data.description,
        companyId: data.companyId,
        categoryId: data.categoryId,
        'start-date': data.startDate,
        'end-date': data.endDate,
        status: data.status,
        tags: data.tags
      }
    });
    return response.data;
  }

  async deleteProject(projectId: string) {
    let response = await this.axios.delete(`/projects/${projectId}.json`);
    return response.data;
  }

  // ── Task Lists ────────────────────────────────────────────

  async getTaskLists(projectId: string, params?: { page?: number; pageSize?: number }) {
    let queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = String(params.page);
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);

    let response = await this.axios.get(`/projects/${projectId}/tasklists.json`, {
      params: queryParams
    });
    return response.data;
  }

  async createTaskList(projectId: string, data: { name: string; description?: string }) {
    let response = await this.axios.post(`/projects/${projectId}/tasklists.json`, {
      'todo-list': {
        name: data.name,
        description: data.description
      }
    });
    return response.data;
  }

  // ── Tasks ─────────────────────────────────────────────────

  async listTasks(params?: {
    projectId?: string;
    taskListId?: string;
    page?: number;
    pageSize?: number;
    filter?: string;
    responsiblePartyIds?: string;
    startDate?: string;
    endDate?: string;
    includeCompleted?: boolean;
    tagIds?: string;
    searchTerm?: string;
    sort?: string;
    orderMode?: string;
    priority?: string;
    updatedAfterDate?: string;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = String(params.page);
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.filter) queryParams.filter = params.filter;
    if (params?.responsiblePartyIds)
      queryParams['responsible-party-ids'] = params.responsiblePartyIds;
    if (params?.startDate) queryParams.startDate = params.startDate;
    if (params?.endDate) queryParams.endDate = params.endDate;
    if (params?.includeCompleted) queryParams.includeCompletedTasks = 'true';
    if (params?.tagIds) queryParams.tagIds = params.tagIds;
    if (params?.searchTerm) queryParams.searchTerm = params.searchTerm;
    if (params?.sort) queryParams.sort = params.sort;
    if (params?.orderMode) queryParams.orderMode = params.orderMode;
    if (params?.priority) queryParams.priority = params.priority;
    if (params?.updatedAfterDate) queryParams.updatedAfterDate = params.updatedAfterDate;

    let path: string;
    if (params?.taskListId) {
      path = `/tasklists/${params.taskListId}/tasks.json`;
    } else if (params?.projectId) {
      path = `/projects/${params.projectId}/tasks.json`;
    } else {
      path = '/tasks.json';
    }

    let response = await this.axios.get(path, { params: queryParams });
    return response.data;
  }

  async getTask(taskId: string) {
    let response = await this.axios.get(`/tasks/${taskId}.json`);
    return response.data;
  }

  async createTask(
    taskListId: string,
    data: {
      content: string;
      description?: string;
      'responsible-party-id'?: string;
      'start-date'?: string;
      'due-date'?: string;
      priority?: string;
      'estimated-minutes'?: number;
      tags?: string;
      parentTaskId?: string;
    }
  ) {
    let response = await this.axios.post(`/tasklists/${taskListId}/tasks.json`, {
      'todo-item': data
    });
    return response.data;
  }

  async updateTask(
    taskId: string,
    data: {
      content?: string;
      description?: string;
      'responsible-party-id'?: string;
      'start-date'?: string;
      'due-date'?: string;
      priority?: string;
      'estimated-minutes'?: number;
      tags?: string;
      parentTaskId?: string;
    }
  ) {
    let response = await this.axios.put(`/tasks/${taskId}.json`, {
      'todo-item': data
    });
    return response.data;
  }

  async deleteTask(taskId: string) {
    let response = await this.axios.delete(`/tasks/${taskId}.json`);
    return response.data;
  }

  async completeTask(taskId: string) {
    let response = await this.axios.put(`/tasks/${taskId}/complete.json`);
    return response.data;
  }

  async reopenTask(taskId: string) {
    let response = await this.axios.put(`/tasks/${taskId}/uncomplete.json`);
    return response.data;
  }

  // ── Time Tracking ─────────────────────────────────────────

  async listTimeEntries(params?: {
    projectId?: string;
    taskId?: string;
    page?: number;
    pageSize?: number;
    fromDate?: string;
    toDate?: string;
    userId?: string;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = String(params.page);
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.fromDate) queryParams.fromdate = params.fromDate;
    if (params?.toDate) queryParams.todate = params.toDate;
    if (params?.userId) queryParams.userId = params.userId;

    let path: string;
    if (params?.taskId) {
      path = `/tasks/${params.taskId}/time_entries.json`;
    } else if (params?.projectId) {
      path = `/projects/${params.projectId}/time_entries.json`;
    } else {
      path = '/time_entries.json';
    }

    let response = await this.axios.get(path, { params: queryParams });
    return response.data;
  }

  async createTimeEntry(params: {
    projectId?: string;
    taskId?: string;
    description?: string;
    personId: string;
    date: string;
    hours: number;
    minutes: number;
    isBillable?: boolean;
    tags?: string;
  }) {
    let path: string;
    if (params.taskId) {
      path = `/tasks/${params.taskId}/time_entries.json`;
    } else if (params.projectId) {
      path = `/projects/${params.projectId}/time_entries.json`;
    } else {
      throw new Error('Either projectId or taskId is required to create a time entry');
    }

    let response = await this.axios.post(path, {
      'time-entry': {
        description: params.description,
        'person-id': params.personId,
        date: params.date,
        hours: String(params.hours),
        minutes: String(params.minutes),
        isbillable: params.isBillable ? '1' : '0',
        tags: params.tags
      }
    });
    return response.data;
  }

  async updateTimeEntry(
    timeEntryId: string,
    data: {
      description?: string;
      date?: string;
      hours?: number;
      minutes?: number;
      isBillable?: boolean;
      tags?: string;
    }
  ) {
    let entry: Record<string, any> = {};
    if (data.description !== undefined) entry.description = data.description;
    if (data.date !== undefined) entry.date = data.date;
    if (data.hours !== undefined) entry.hours = String(data.hours);
    if (data.minutes !== undefined) entry.minutes = String(data.minutes);
    if (data.isBillable !== undefined) entry.isbillable = data.isBillable ? '1' : '0';
    if (data.tags !== undefined) entry.tags = data.tags;

    let response = await this.axios.put(`/time_entries/${timeEntryId}.json`, {
      'time-entry': entry
    });
    return response.data;
  }

  async deleteTimeEntry(timeEntryId: string) {
    let response = await this.axios.delete(`/time_entries/${timeEntryId}.json`);
    return response.data;
  }

  // ── Timers ────────────────────────────────────────────────

  async listTimers(params?: { projectId?: string; runningOnly?: boolean }) {
    let queryParams: Record<string, string> = {};
    if (params?.projectId) queryParams.projectId = params.projectId;
    if (params?.runningOnly) queryParams.runningTimersOnly = 'true';

    let response = await this.axios.get('/me/timers.json', { params: queryParams });
    return response.data;
  }

  // ── Milestones ────────────────────────────────────────────

  async listMilestones(params?: {
    projectId?: string;
    find?: string;
    page?: number;
    pageSize?: number;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.find) queryParams.find = params.find;
    if (params?.page) queryParams.page = String(params.page);
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);

    let path = params?.projectId
      ? `/projects/${params.projectId}/milestones.json`
      : '/milestones.json';

    let response = await this.axios.get(path, { params: queryParams });
    return response.data;
  }

  async getMilestone(milestoneId: string) {
    let response = await this.axios.get(`/milestones/${milestoneId}.json`);
    return response.data;
  }

  async createMilestone(
    projectId: string,
    data: {
      title: string;
      description?: string;
      deadline?: string;
      responsiblePartyIds?: string;
      tags?: string;
      notify?: boolean;
    }
  ) {
    let response = await this.axios.post(`/projects/${projectId}/milestones.json`, {
      milestone: {
        title: data.title,
        description: data.description,
        deadline: data.deadline,
        'responsible-party-ids': data.responsiblePartyIds,
        tags: data.tags,
        notify: data.notify
      }
    });
    return response.data;
  }

  async updateMilestone(
    milestoneId: string,
    data: {
      title?: string;
      description?: string;
      deadline?: string;
      responsiblePartyIds?: string;
      tags?: string;
    }
  ) {
    let response = await this.axios.put(`/milestones/${milestoneId}.json`, {
      milestone: {
        title: data.title,
        description: data.description,
        deadline: data.deadline,
        'responsible-party-ids': data.responsiblePartyIds,
        tags: data.tags
      }
    });
    return response.data;
  }

  async completeMilestone(milestoneId: string) {
    let response = await this.axios.put(`/milestones/${milestoneId}/complete.json`);
    return response.data;
  }

  async reopenMilestone(milestoneId: string) {
    let response = await this.axios.put(`/milestones/${milestoneId}/uncomplete.json`);
    return response.data;
  }

  async deleteMilestone(milestoneId: string) {
    let response = await this.axios.delete(`/milestones/${milestoneId}.json`);
    return response.data;
  }

  // ── People ────────────────────────────────────────────────

  async listPeople(params?: {
    page?: number;
    pageSize?: number;
    searchTerm?: string;
    projectId?: string;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = String(params.page);
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.searchTerm) queryParams.searchTerm = params.searchTerm;

    let path = params?.projectId
      ? `/projects/${params.projectId}/people.json`
      : '/people.json';

    let response = await this.axios.get(path, { params: queryParams });
    return response.data;
  }

  async getPerson(personId: string) {
    let response = await this.axios.get(`/people/${personId}.json`);
    return response.data;
  }

  async getCurrentUser() {
    let response = await this.axios.get('/me.json');
    return response.data;
  }

  // ── Companies ─────────────────────────────────────────────

  async listCompanies(params?: { page?: number; pageSize?: number }) {
    let queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = String(params.page);
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);

    let response = await this.axios.get('/companies.json', { params: queryParams });
    return response.data;
  }

  async getCompany(companyId: string) {
    let response = await this.axios.get(`/companies/${companyId}.json`);
    return response.data;
  }

  // ── Messages ──────────────────────────────────────────────

  async listMessages(projectId: string, params?: { page?: number; pageSize?: number }) {
    let queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = String(params.page);
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);

    let response = await this.axios.get(`/projects/${projectId}/posts.json`, {
      params: queryParams
    });
    return response.data;
  }

  async getMessage(messageId: string) {
    let response = await this.axios.get(`/posts/${messageId}.json`);
    return response.data;
  }

  async createMessage(
    projectId: string,
    data: {
      title: string;
      body: string;
      categoryId?: string;
      tags?: string;
      notify?: string[];
    }
  ) {
    let response = await this.axios.post(`/projects/${projectId}/posts.json`, {
      post: {
        title: data.title,
        body: data.body,
        'category-id': data.categoryId,
        tags: data.tags,
        notify: data.notify
      }
    });
    return response.data;
  }

  async updateMessage(
    messageId: string,
    data: {
      title?: string;
      body?: string;
      categoryId?: string;
      tags?: string;
    }
  ) {
    let response = await this.axios.put(`/posts/${messageId}.json`, {
      post: {
        title: data.title,
        body: data.body,
        'category-id': data.categoryId,
        tags: data.tags
      }
    });
    return response.data;
  }

  async deleteMessage(messageId: string) {
    let response = await this.axios.delete(`/posts/${messageId}.json`);
    return response.data;
  }

  // ── Comments ──────────────────────────────────────────────

  async getComments(
    resourceType: string,
    resourceId: string,
    params?: { page?: number; pageSize?: number }
  ) {
    let queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = String(params.page);
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);

    let response = await this.axios.get(`/${resourceType}/${resourceId}/comments.json`, {
      params: queryParams
    });
    return response.data;
  }

  async createComment(
    resourceType: string,
    resourceId: string,
    data: {
      body: string;
      notify?: string[];
      contentType?: string;
    }
  ) {
    let response = await this.axios.post(`/${resourceType}/${resourceId}/comments.json`, {
      comment: {
        body: data.body,
        notify: data.notify,
        'content-type': data.contentType
      }
    });
    return response.data;
  }

  async updateComment(commentId: string, data: { body: string }) {
    let response = await this.axios.put(`/comments/${commentId}.json`, {
      comment: { body: data.body }
    });
    return response.data;
  }

  async deleteComment(commentId: string) {
    let response = await this.axios.delete(`/comments/${commentId}.json`);
    return response.data;
  }

  // ── Tags ──────────────────────────────────────────────────

  async listTags(params?: { page?: number; pageSize?: number }) {
    let queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = String(params.page);
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);

    let response = await this.axios.get('/tags.json', { params: queryParams });
    return response.data;
  }

  // ── Webhooks ──────────────────────────────────────────────

  async listWebhooks() {
    let response = await this.axios.get('/webhooks.json');
    return response.data;
  }

  async createWebhook(data: {
    url: string;
    events: string[];
    contentType?: string;
    version?: number;
    secret?: string;
  }) {
    let response = await this.axios.post('/webhooks.json', {
      webhook: {
        url: data.url,
        events: data.events,
        contentType: data.contentType || 'json',
        version: data.version || 2,
        secret: data.secret
      }
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.axios.delete(`/webhooks/${webhookId}.json`);
    return response.data;
  }

  // ── Activity / Latest Activity ────────────────────────────

  async getLatestActivity(params?: {
    page?: number;
    pageSize?: number;
    maxId?: string;
    sinceId?: string;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = String(params.page);
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.maxId) queryParams.maxId = params.maxId;
    if (params?.sinceId) queryParams.sinceId = params.sinceId;

    let response = await this.axios.get('/latestActivity.json', { params: queryParams });
    return response.data;
  }

  async getProjectActivity(
    projectId: string,
    params?: {
      page?: number;
      pageSize?: number;
      maxId?: string;
      sinceId?: string;
    }
  ) {
    let queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = String(params.page);
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.maxId) queryParams.maxId = params.maxId;
    if (params?.sinceId) queryParams.sinceId = params.sinceId;

    let response = await this.axios.get(`/projects/${projectId}/latestActivity.json`, {
      params: queryParams
    });
    return response.data;
  }

  // ── Notebooks ─────────────────────────────────────────────

  async listNotebooks(projectId: string, params?: { page?: number; pageSize?: number }) {
    let queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = String(params.page);
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);

    let response = await this.axios.get(`/projects/${projectId}/notebooks.json`, {
      params: queryParams
    });
    return response.data;
  }

  async getNotebook(notebookId: string) {
    let response = await this.axios.get(`/notebooks/${notebookId}.json`);
    return response.data;
  }

  async createNotebook(
    projectId: string,
    data: {
      name: string;
      content: string;
      categoryId?: string;
      tags?: string;
      notify?: boolean;
    }
  ) {
    let response = await this.axios.post(`/projects/${projectId}/notebooks.json`, {
      notebook: {
        name: data.name,
        content: data.content,
        categoryId: data.categoryId,
        tags: data.tags,
        notify: data.notify
      }
    });
    return response.data;
  }

  async updateNotebook(
    notebookId: string,
    data: {
      name?: string;
      content?: string;
      categoryId?: string;
      tags?: string;
    }
  ) {
    let response = await this.axios.put(`/notebooks/${notebookId}.json`, {
      notebook: {
        name: data.name,
        content: data.content,
        categoryId: data.categoryId,
        tags: data.tags
      }
    });
    return response.data;
  }

  async deleteNotebook(notebookId: string) {
    let response = await this.axios.delete(`/notebooks/${notebookId}.json`);
    return response.data;
  }

  // ── Project People ────────────────────────────────────────

  async addPeopleToProject(projectId: string, personIds: string[]) {
    let response = await this.axios.post(`/projects/${projectId}/people.json`, {
      add: {
        userIdList: personIds.join(',')
      }
    });
    return response.data;
  }

  async removePeopleFromProject(projectId: string, personIds: string[]) {
    let response = await this.axios.put(`/projects/${projectId}/people.json`, {
      remove: {
        userIdList: personIds.join(',')
      }
    });
    return response.data;
  }
}
