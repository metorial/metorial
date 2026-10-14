import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

export interface TaskInput {
  title: string;
  content?: string;
  desc?: string;
  isAllDay?: boolean;
  startDate?: string;
  dueDate?: string;
  timeZone?: string;
  reminders?: string[];
  repeatFlag?: string;
  priority?: number;
  sortOrder?: number;
  projectId?: string;
  items?: ChecklistItemInput[];
  tags?: string[];
}

export interface TaskUpdateInput extends Partial<TaskInput> {
  taskId: string;
  projectId: string;
}

export interface ChecklistItemInput {
  id?: string;
  title: string;
  completedTime?: string;
  status?: number;
  isAllDay?: boolean;
  startDate?: string;
  timeZone?: string;
  sortOrder?: number;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  content?: string;
  desc?: string;
  isAllDay?: boolean;
  startDate?: string;
  dueDate?: string;
  timeZone?: string;
  isFloating?: boolean;
  reminders?: string[];
  repeatFlag?: string;
  priority: number;
  status: number;
  completedTime?: string;
  sortOrder?: number;
  items?: ChecklistItem[];
  modifiedTime?: string;
  createdTime?: string;
  etag?: string;
  deleted?: number;
  creator?: string;
  tags?: string[];
  kind?: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  status: number;
  completedTime?: string;
  isAllDay?: boolean;
  sortOrder?: number;
  startDate?: string;
  timeZone?: string;
}

export interface Project {
  id: string;
  name: string;
  color?: string;
  sortOrder?: number;
  closed?: boolean;
  groupId?: string;
  viewMode?: string;
  permission?: string;
  kind?: string;
}

export interface ProjectData {
  project: Project;
  tasks: Task[];
  columns?: Column[];
}

export interface Column {
  id: string;
  projectId: string;
  name: string;
  sortOrder: number;
}

export interface ProjectInput {
  name: string;
  color?: string;
  sortOrder?: number;
  viewMode?: string;
  kind?: string;
}

export interface BatchTaskInput {
  add?: TaskInput[];
  update?: TaskUpdateInput[];
  delete?: { taskId: string; projectId: string }[];
}

export interface BatchTaskResult {
  id2etag: Record<string, string>;
  id2error: Record<string, string>;
}

export interface SearchTaskInput {
  keywords?: string;
  projectIds?: string[];
  tags?: string[];
  status?: number[];
  dueFrom?: string;
  dueTo?: string;
}

export interface CompletedTaskInput {
  projectIds?: string[];
  startDate?: string;
  endDate?: string;
}

export interface TaskMoveInput {
  fromProjectId: string;
  toProjectId: string;
  taskId: string;
}

export interface TaskMoveResult {
  id: string;
  etag?: string;
}

export interface UserProfile {
  id: string;
  name?: string;
  username?: string;
  email?: string;
}

export class Client {
  private axios;

  constructor(config: { token: string }) {
    if (!config.token) {
      throw createApiServiceError('Connect your TickTick account before using this tool.', {
        reason: 'missing_access_token'
      });
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.ticktick.com/open/v1',
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'TickTick',
          reason: 'ticktick_api_error'
        })
    });
  }

  async getTask(projectId: string, taskId: string): Promise<Task> {
    let response = await this.axios.get<Task>(
      `/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(taskId)}`
    );
    return response.data;
  }

  async createTask(input: TaskInput): Promise<Task> {
    let response = await this.axios.post<Task>('/task', pickDefined(input));
    if (!response.data?.id) {
      throw createApiServiceError(
        'TickTick accepted the create-task request but did not return a task ID. Check the project before retrying.',
        { reason: 'missing_task_response' }
      );
    }
    return response.data;
  }

  async updateTask(taskId: string, input: TaskUpdateInput): Promise<Task> {
    let { taskId: _taskId, ...fields } = input;
    let response = await this.axios.post<Task>(
      `/task/${encodeURIComponent(taskId)}`,
      pickDefined({ ...fields, id: taskId })
    );
    return response.data?.id ? response.data : this.getTask(input.projectId, taskId);
  }

  async completeTask(projectId: string, taskId: string): Promise<void> {
    await this.axios.post(
      `/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(taskId)}/complete`
    );
  }

  async deleteTask(projectId: string, taskId: string): Promise<void> {
    await this.axios.delete(
      `/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(taskId)}`
    );
  }

  async listProjects(): Promise<Project[]> {
    let response = await this.axios.get<Project[]>('/project');
    return response.data;
  }

  async getProject(projectId: string): Promise<Project> {
    let response = await this.axios.get<Project>(`/project/${encodeURIComponent(projectId)}`);
    return response.data;
  }

  async getProjectData(projectId: string): Promise<ProjectData> {
    let response = await this.axios.get<ProjectData>(
      `/project/${encodeURIComponent(projectId)}/data`
    );
    return response.data;
  }

  async createProject(input: ProjectInput): Promise<Project> {
    let response = await this.axios.post<Project>('/project', pickDefined(input));
    if (!response.data?.id) {
      throw createApiServiceError(
        'TickTick accepted the create-project request but did not return a project ID. Call list_projects before retrying.',
        { reason: 'missing_project_response' }
      );
    }
    return response.data;
  }

  async updateProject(projectId: string, input: Partial<ProjectInput>): Promise<Project> {
    let response = await this.axios.post<Project>(
      `/project/${encodeURIComponent(projectId)}`,
      pickDefined(input)
    );
    return response.data?.id ? response.data : this.getProject(projectId);
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.axios.delete(`/project/${encodeURIComponent(projectId)}`);
  }

  async batchTasks(input: BatchTaskInput): Promise<BatchTaskResult> {
    let body = pickDefined({
      add: input.add?.length ? input.add.map(task => pickDefined(task)) : undefined,
      update: input.update?.length
        ? input.update.map(({ taskId, ...fields }) => pickDefined({ ...fields, id: taskId }))
        : undefined
    });
    let result: BatchTaskResult = { id2etag: {}, id2error: {} };
    if (input.add?.length || input.update?.length) {
      let response = await this.axios.post<BatchTaskResult>('/task/batch', body);
      if (!response.data?.id2etag || !response.data.id2error) {
        throw createApiServiceError(
          'TickTick did not return batch task results. Check the project before retrying.',
          { reason: 'missing_batch_result' }
        );
      }
      result = response.data;
    }
    return result;
  }

  async searchTasks(input: SearchTaskInput): Promise<Task[]> {
    let response = await this.axios.post<Task[]>('/task/search', pickDefined(input));
    if (!Array.isArray(response.data)) {
      throw createApiServiceError('TickTick did not return task search results.', {
        reason: 'missing_task_results'
      });
    }
    return response.data;
  }

  async listCompletedTasks(input: CompletedTaskInput): Promise<Task[]> {
    let response = await this.axios.post<Task[]>('/task/completed', pickDefined(input));
    if (!Array.isArray(response.data)) {
      throw createApiServiceError('TickTick did not return completed-task results.', {
        reason: 'missing_task_results'
      });
    }
    return response.data;
  }

  async moveTasks(input: TaskMoveInput[]): Promise<TaskMoveResult[]> {
    let response = await this.axios.post<TaskMoveResult[]>('/task/move', input);
    if (!Array.isArray(response.data)) {
      throw createApiServiceError(
        'TickTick accepted the move request but did not return move results. Check the destination project before retrying.',
        { reason: 'missing_move_result' }
      );
    }
    return response.data;
  }

  async getUserProfile(): Promise<UserProfile> {
    let response = await this.axios.get<UserProfile>('/user');
    return response.data;
  }
}
