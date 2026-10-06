import { encodeFormBody } from './client';
import { createTwilioAxios } from './http';
import { pathId } from './validation';

export class TaskRouterClient {
  private axios: ReturnType<typeof createTwilioAxios>;

  constructor(token: string, accountSid: string, pageToken?: string) {
    this.axios = createTwilioAxios('taskrouter', token, accountSid, pageToken);
  }

  // Workspaces
  async listWorkspaces(pageSize?: number): Promise<any> {
    let response = await this.axios.get('', {
      params: { PageSize: pageSize ?? 50 }
    });
    return response.data;
  }

  async getWorkspace(workspaceSid: string): Promise<any> {
    let response = await this.axios.get(`/${pathId(workspaceSid)}`);
    return response.data;
  }

  async updateWorkspace(
    workspaceSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(`/${pathId(workspaceSid)}`, encodeFormBody(params));
    return response.data;
  }

  // Workers
  async listWorkers(
    workspaceSid: string,
    params?: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.get(`/${pathId(workspaceSid)}/Workers`, { params });
    return response.data;
  }

  async getWorker(workspaceSid: string, workerSid: string): Promise<any> {
    let response = await this.axios.get(
      `/${pathId(workspaceSid)}/Workers/${pathId(workerSid)}`
    );
    return response.data;
  }

  async createWorker(
    workspaceSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/${pathId(workspaceSid)}/Workers`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async updateWorker(
    workspaceSid: string,
    workerSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/${pathId(workspaceSid)}/Workers/${pathId(workerSid)}`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async deleteWorker(workspaceSid: string, workerSid: string): Promise<void> {
    await this.axios.delete(`/${pathId(workspaceSid)}/Workers/${pathId(workerSid)}`);
  }

  // Activities
  async listActivities(workspaceSid: string, pageSize?: number): Promise<any> {
    let response = await this.axios.get(`/${pathId(workspaceSid)}/Activities`, {
      params: { PageSize: pageSize ?? 50 }
    });
    return response.data;
  }

  async getActivity(workspaceSid: string, activitySid: string): Promise<any> {
    let response = await this.axios.get(
      `/${pathId(workspaceSid)}/Activities/${pathId(activitySid)}`
    );
    return response.data;
  }

  async createActivity(
    workspaceSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/${pathId(workspaceSid)}/Activities`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async updateActivity(
    workspaceSid: string,
    activitySid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/${pathId(workspaceSid)}/Activities/${pathId(activitySid)}`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async deleteActivity(workspaceSid: string, activitySid: string): Promise<void> {
    await this.axios.delete(`/${pathId(workspaceSid)}/Activities/${pathId(activitySid)}`);
  }

  // Task Queues
  async listTaskQueues(workspaceSid: string, pageSize?: number): Promise<any> {
    let response = await this.axios.get(`/${pathId(workspaceSid)}/TaskQueues`, {
      params: { PageSize: pageSize ?? 50 }
    });
    return response.data;
  }

  async getTaskQueue(workspaceSid: string, taskQueueSid: string): Promise<any> {
    let response = await this.axios.get(
      `/${pathId(workspaceSid)}/TaskQueues/${pathId(taskQueueSid)}`
    );
    return response.data;
  }

  async createTaskQueue(
    workspaceSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/${pathId(workspaceSid)}/TaskQueues`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async updateTaskQueue(
    workspaceSid: string,
    taskQueueSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/${pathId(workspaceSid)}/TaskQueues/${pathId(taskQueueSid)}`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async deleteTaskQueue(workspaceSid: string, taskQueueSid: string): Promise<void> {
    await this.axios.delete(`/${pathId(workspaceSid)}/TaskQueues/${pathId(taskQueueSid)}`);
  }

  // Workflows
  async listWorkflows(workspaceSid: string, pageSize?: number): Promise<any> {
    let response = await this.axios.get(`/${pathId(workspaceSid)}/Workflows`, {
      params: { PageSize: pageSize ?? 50 }
    });
    return response.data;
  }

  async getWorkflow(workspaceSid: string, workflowSid: string): Promise<any> {
    let response = await this.axios.get(
      `/${pathId(workspaceSid)}/Workflows/${pathId(workflowSid)}`
    );
    return response.data;
  }

  async createWorkflow(
    workspaceSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/${pathId(workspaceSid)}/Workflows`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async updateWorkflow(
    workspaceSid: string,
    workflowSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/${pathId(workspaceSid)}/Workflows/${pathId(workflowSid)}`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async deleteWorkflow(workspaceSid: string, workflowSid: string): Promise<void> {
    await this.axios.delete(`/${pathId(workspaceSid)}/Workflows/${pathId(workflowSid)}`);
  }

  // Tasks
  async listTasks(
    workspaceSid: string,
    params?: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.get(`/${pathId(workspaceSid)}/Tasks`, { params });
    return response.data;
  }

  async getTask(workspaceSid: string, taskSid: string): Promise<any> {
    let response = await this.axios.get(`/${pathId(workspaceSid)}/Tasks/${pathId(taskSid)}`);
    return response.data;
  }

  async createTask(
    workspaceSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/${pathId(workspaceSid)}/Tasks`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async updateTask(
    workspaceSid: string,
    taskSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/${pathId(workspaceSid)}/Tasks/${pathId(taskSid)}`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async deleteTask(workspaceSid: string, taskSid: string): Promise<void> {
    await this.axios.delete(`/${pathId(workspaceSid)}/Tasks/${pathId(taskSid)}`);
  }

  // Statistics
  async getWorkspaceStatistics(
    workspaceSid: string,
    params?: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.get(`/${pathId(workspaceSid)}/Statistics`, { params });
    return response.data;
  }

  async getTaskQueueStatistics(
    workspaceSid: string,
    taskQueueSid: string,
    params?: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.get(
      `/${pathId(workspaceSid)}/TaskQueues/${pathId(taskQueueSid)}/Statistics`,
      { params }
    );
    return response.data;
  }

  async getWorkerStatistics(
    workspaceSid: string,
    workerSid: string,
    params?: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.get(
      `/${pathId(workspaceSid)}/Workers/${pathId(workerSid)}/Statistics`,
      {
        params
      }
    );
    return response.data;
  }
}
