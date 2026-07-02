import { createAxios } from 'slates';
import type {
  InsertTaskParams,
  ListTasksParams,
  MoveTaskParams,
  Task,
  TaskList,
  TaskListsResponse,
  TasksResponse
} from './types';

export class GoogleTasksClient {
  private api;

  constructor(token: string) {
    this.api = createAxios({
      baseURL: 'https://tasks.googleapis.com/tasks/v1',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Task Lists ----

  async listTaskLists(params?: {
    maxResults?: number;
    pageToken?: string;
  }): Promise<TaskListsResponse> {
    let response = await this.api.get('/users/@me/lists', { params });
    return response.data;
  }

  async getAllTaskLists(): Promise<TaskList[]> {
    let allLists: TaskList[] = [];
    let pageToken: string | undefined;

    do {
      let response: TaskListsResponse = await this.listTaskLists({
        maxResults: 100,
        pageToken
      });
      if (response.items) {
        allLists.push(...response.items);
      }
      pageToken = response.nextPageToken ?? undefined;
    } while (pageToken);

    return allLists;
  }

  async getTaskList(taskListId: string): Promise<TaskList> {
    let response = await this.api.get(`/users/@me/lists/${taskListId}`);
    return response.data;
  }

  async createTaskList(title: string): Promise<TaskList> {
    let response = await this.api.post('/users/@me/lists', { title });
    return response.data;
  }

  async updateTaskList(taskListId: string, title: string): Promise<TaskList> {
    let response = await this.api.patch(`/users/@me/lists/${taskListId}`, { title });
    return response.data;
  }

  async deleteTaskList(taskListId: string): Promise<void> {
    await this.api.delete(`/users/@me/lists/${taskListId}`);
  }

  // ---- Tasks ----

  async listTasks(taskListId: string, params?: ListTasksParams): Promise<TasksResponse> {
    let response = await this.api.get(`/lists/${taskListId}/tasks`, { params });
    return response.data;
  }

  async getAllTasks(
    taskListId: string,
    params?: Omit<ListTasksParams, 'pageToken' | 'maxResults'>
  ): Promise<Task[]> {
    let allTasks: Task[] = [];
    let pageToken: string | undefined;

    do {
      let response: TasksResponse = await this.listTasks(taskListId, {
        ...params,
        maxResults: 100,
        pageToken
      });
      if (response.items) {
        allTasks.push(...response.items);
      }
      pageToken = response.nextPageToken ?? undefined;
    } while (pageToken);

    return allTasks;
  }

  async getTask(taskListId: string, taskId: string): Promise<Task> {
    let response = await this.api.get(`/lists/${taskListId}/tasks/${taskId}`);
    return response.data;
  }

  async createTask(
    taskListId: string,
    task: Pick<Task, 'title' | 'notes' | 'due' | 'status'>,
    positioning?: InsertTaskParams
  ): Promise<Task> {
    let response = await this.api.post(`/lists/${taskListId}/tasks`, task, {
      params: positioning
    });
    return response.data;
  }

  async updateTask(
    taskListId: string,
    taskId: string,
    task: Pick<Task, 'title' | 'notes' | 'due' | 'status'>
  ): Promise<Task> {
    let response = await this.api.patch(`/lists/${taskListId}/tasks/${taskId}`, task);
    return response.data;
  }

  async deleteTask(taskListId: string, taskId: string): Promise<void> {
    await this.api.delete(`/lists/${taskListId}/tasks/${taskId}`);
  }

  async moveTask(taskListId: string, taskId: string, params?: MoveTaskParams): Promise<Task> {
    let response = await this.api.post(
      `/lists/${taskListId}/tasks/${taskId}/move`,
      {},
      {
        params
      }
    );
    return response.data;
  }

  async clearCompletedTasks(taskListId: string): Promise<void> {
    await this.api.post(`/lists/${taskListId}/clear`, {});
  }
}
