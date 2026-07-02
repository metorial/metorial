import { createAxios } from 'slates';
import { encodeFormBody } from './client';

export class TaskRouterClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string, _accountSid: string) {
    this.axios = createAxios({
      baseURL: `https://taskrouter.twilio.com/v1/Workspaces`,
      headers: {
        Authorization: `Basic ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  }

  // Workspaces
  async listWorkspaces(pageSize?: number): Promise<any> {
    let response = await this.axios.get('', {
      params: { PageSize: pageSize || 50 }
    });
    return response.data;
  }

  async getWorkspace(workspaceSid: string): Promise<any> {
    let response = await this.axios.get(`/${workspaceSid}`);
    return response.data;
  }

  async updateWorkspace(
    workspaceSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(`/${workspaceSid}`, encodeFormBody(params));
    return response.data;
  }

  // Workers
  async listWorkers(
    workspaceSid: string,
    params?: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.get(`/${workspaceSid}/Workers`, { params });
    return response.data;
  }

  async getWorker(workspaceSid: string, workerSid: string): Promise<any> {
    let response = await this.axios.get(`/${workspaceSid}/Workers/${workerSid}`);
    return response.data;
  }

  async createWorker(
    workspaceSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(`/${workspaceSid}/Workers`, encodeFormBody(params));
    return response.data;
  }

  async updateWorker(
    workspaceSid: string,
    workerSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/${workspaceSid}/Workers/${workerSid}`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async deleteWorker(workspaceSid: string, workerSid: string): Promise<void> {
    await this.axios.delete(`/${workspaceSid}/Workers/${workerSid}`);
  }

  // Activities
  async listActivities(workspaceSid: string, pageSize?: number): Promise<any> {
    let response = await this.axios.get(`/${workspaceSid}/Activities`, {
      params: { PageSize: pageSize || 50 }
    });
    return response.data;
  }

  async getActivity(workspaceSid: string, activitySid: string): Promise<any> {
    let response = await this.axios.get(`/${workspaceSid}/Activities/${activitySid}`);
    return response.data;
  }

  async createActivity(
    workspaceSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/${workspaceSid}/Activities`,
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
      `/${workspaceSid}/Activities/${activitySid}`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async deleteActivity(workspaceSid: string, activitySid: string): Promise<void> {
    await this.axios.delete(`/${workspaceSid}/Activities/${activitySid}`);
  }

  // Task Queues
  async listTaskQueues(workspaceSid: string, pageSize?: number): Promise<any> {
    let response = await this.axios.get(`/${workspaceSid}/TaskQueues`, {
      params: { PageSize: pageSize || 50 }
    });
    return response.data;
  }

  async getTaskQueue(workspaceSid: string, taskQueueSid: string): Promise<any> {
    let response = await this.axios.get(`/${workspaceSid}/TaskQueues/${taskQueueSid}`);
    return response.data;
  }

  async createTaskQueue(
    workspaceSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/${workspaceSid}/TaskQueues`,
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
      `/${workspaceSid}/TaskQueues/${taskQueueSid}`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async deleteTaskQueue(workspaceSid: string, taskQueueSid: string): Promise<void> {
    await this.axios.delete(`/${workspaceSid}/TaskQueues/${taskQueueSid}`);
  }

  // Workflows
  async listWorkflows(workspaceSid: string, pageSize?: number): Promise<any> {
    let response = await this.axios.get(`/${workspaceSid}/Workflows`, {
      params: { PageSize: pageSize || 50 }
    });
    return response.data;
  }

  async getWorkflow(workspaceSid: string, workflowSid: string): Promise<any> {
    let response = await this.axios.get(`/${workspaceSid}/Workflows/${workflowSid}`);
    return response.data;
  }

  async createWorkflow(
    workspaceSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(`/${workspaceSid}/Workflows`, encodeFormBody(params));
    return response.data;
  }

  async updateWorkflow(
    workspaceSid: string,
    workflowSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/${workspaceSid}/Workflows/${workflowSid}`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async deleteWorkflow(workspaceSid: string, workflowSid: string): Promise<void> {
    await this.axios.delete(`/${workspaceSid}/Workflows/${workflowSid}`);
  }

  // Tasks
  async listTasks(
    workspaceSid: string,
    params?: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.get(`/${workspaceSid}/Tasks`, { params });
    return response.data;
  }

  async getTask(workspaceSid: string, taskSid: string): Promise<any> {
    let response = await this.axios.get(`/${workspaceSid}/Tasks/${taskSid}`);
    return response.data;
  }

  async createTask(
    workspaceSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(`/${workspaceSid}/Tasks`, encodeFormBody(params));
    return response.data;
  }

  async updateTask(
    workspaceSid: string,
    taskSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/${workspaceSid}/Tasks/${taskSid}`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async deleteTask(workspaceSid: string, taskSid: string): Promise<void> {
    await this.axios.delete(`/${workspaceSid}/Tasks/${taskSid}`);
  }

  // Reservations
  async listReservations(workspaceSid: string, taskSid: string): Promise<any> {
    let response = await this.axios.get(`/${workspaceSid}/Tasks/${taskSid}/Reservations`);
    return response.data;
  }

  async getReservation(
    workspaceSid: string,
    taskSid: string,
    reservationSid: string
  ): Promise<any> {
    let response = await this.axios.get(
      `/${workspaceSid}/Tasks/${taskSid}/Reservations/${reservationSid}`
    );
    return response.data;
  }

  async updateReservation(
    workspaceSid: string,
    taskSid: string,
    reservationSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/${workspaceSid}/Tasks/${taskSid}/Reservations/${reservationSid}`,
      encodeFormBody(params)
    );
    return response.data;
  }

  // Worker Channels
  async listWorkerChannels(workspaceSid: string, workerSid: string): Promise<any> {
    let response = await this.axios.get(`/${workspaceSid}/Workers/${workerSid}/Channels`);
    return response.data;
  }

  // Statistics
  async getWorkspaceStatistics(
    workspaceSid: string,
    params?: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.get(`/${workspaceSid}/Statistics`, { params });
    return response.data;
  }

  async getTaskQueueStatistics(
    workspaceSid: string,
    taskQueueSid: string,
    params?: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.get(
      `/${workspaceSid}/TaskQueues/${taskQueueSid}/Statistics`,
      { params }
    );
    return response.data;
  }

  async getWorkerStatistics(
    workspaceSid: string,
    workerSid: string,
    params?: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.get(`/${workspaceSid}/Workers/${workerSid}/Statistics`, {
      params
    });
    return response.data;
  }
}
