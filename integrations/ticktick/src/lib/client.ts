import { createAxios } from 'slates';

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

export interface TaskUpdateInput extends TaskInput {
  taskId: string;
  projectId: string;
}

export interface ChecklistItemInput {
  title: string;
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
  columns: Column[];
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

export interface UserProfile {
  id: string;
  name?: string;
  username?: string;
  email?: string;
}

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.ticktick.com/open/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Task Methods ----

  async getTask(projectId: string, taskId: string): Promise<Task> {
    let response = await this.axios.get(`/project/${projectId}/task/${taskId}`);
    return response.data;
  }

  async createTask(input: TaskInput): Promise<Task> {
    let response = await this.axios.post('/task', input);
    return response.data;
  }

  async updateTask(taskId: string, input: TaskUpdateInput): Promise<Task> {
    let body: Record<string, unknown> = {
      ...input,
      id: taskId
    };
    (body as any).taskId = undefined;
    let response = await this.axios.post(`/task/${taskId}`, body);
    return response.data;
  }

  async completeTask(projectId: string, taskId: string): Promise<void> {
    await this.axios.post(`/project/${projectId}/task/${taskId}/complete`);
  }

  async deleteTask(projectId: string, taskId: string): Promise<void> {
    await this.axios.delete(`/project/${projectId}/task/${taskId}`);
  }

  // ---- Project Methods ----

  async listProjects(): Promise<Project[]> {
    let response = await this.axios.get('/project');
    return response.data;
  }

  async getProject(projectId: string): Promise<Project> {
    let response = await this.axios.get(`/project/${projectId}`);
    return response.data;
  }

  async getProjectData(projectId: string): Promise<ProjectData> {
    let response = await this.axios.get(`/project/${projectId}/data`);
    return response.data;
  }

  async createProject(input: ProjectInput): Promise<Project> {
    let response = await this.axios.post('/project', input);
    return response.data;
  }

  async updateProject(projectId: string, input: Partial<ProjectInput>): Promise<Project> {
    let response = await this.axios.post(`/project/${projectId}`, input);
    return response.data;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.axios.delete(`/project/${projectId}`);
  }

  // ---- Batch Methods ----

  async batchTasks(input: BatchTaskInput): Promise<any> {
    let body: Record<string, unknown> = {};

    if (input.add && input.add.length > 0) {
      body.add = input.add;
    }

    if (input.update && input.update.length > 0) {
      body.update = input.update.map(task => {
        let { taskId, ...rest } = task;
        return { id: taskId, ...rest };
      });
    }

    if (input.delete && input.delete.length > 0) {
      body.delete = input.delete;
    }

    let response = await this.axios.post('/batch/task', body);
    return response.data;
  }

  // ---- User Methods ----

  async getUserProfile(): Promise<UserProfile> {
    let response = await this.axios.get('/user');
    return response.data;
  }
}
