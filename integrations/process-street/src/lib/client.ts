import { createAxios } from 'slates';

let BASE_URL = 'https://public-api.process.st/api/v1.1';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'X-API-KEY': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Workflows ----

  async listWorkflows(params?: { name?: string }) {
    let response = await this.axios.get('/workflows', { params });
    return response.data;
  }

  async listWorkflowTasks(workflowId: string) {
    let response = await this.axios.get(`/workflows/${workflowId}/tasks`);
    return response.data;
  }

  // ---- Workflow Runs ----

  async listWorkflowRuns(params?: {
    workflowId?: string;
    name?: string;
    status?: string;
    fields?: string;
  }) {
    let response = await this.axios.get('/workflow-runs', { params });
    return response.data;
  }

  async createWorkflowRun(data: {
    workflowId: string;
    name?: string;
    dueDate?: string;
    shared?: boolean;
  }) {
    let response = await this.axios.post('/workflow-runs', data);
    return response.data;
  }

  async getWorkflowRun(workflowRunId: string) {
    let response = await this.axios.get(`/workflow-runs/${workflowRunId}`);
    return response.data;
  }

  async updateWorkflowRun(
    workflowRunId: string,
    data: {
      name: string;
      status: string;
      shared: boolean;
      dueDate?: string | null;
    }
  ) {
    await this.axios.put(`/workflow-runs/${workflowRunId}`, data);
  }

  async deleteWorkflowRun(workflowRunId: string) {
    await this.axios.delete(`/workflow-runs/${workflowRunId}`);
  }

  async undeleteWorkflowRun(workflowRunId: string) {
    await this.axios.post(`/workflow-runs/${workflowRunId}/undelete`);
  }

  // ---- Workflow Run Assignees ----

  async listWorkflowRunAssignees(workflowRunId: string) {
    let response = await this.axios.get(`/workflow-runs/${workflowRunId}/assignees`);
    return response.data;
  }

  async assignUserToWorkflowRun(workflowRunId: string, email: string) {
    await this.axios.post(
      `/workflow-runs/${workflowRunId}/assignees/${encodeURIComponent(email)}`
    );
  }

  async unassignUserFromWorkflowRun(workflowRunId: string, email: string) {
    await this.axios.delete(
      `/workflow-runs/${workflowRunId}/assignees/${encodeURIComponent(email)}`
    );
  }

  // ---- Tasks ----

  async listTasksByAssignee(assigneeEmail: string, workflowId?: string) {
    let params: Record<string, string> = { assigneeEmail };
    if (workflowId) params.workflowId = workflowId;
    let response = await this.axios.get('/tasks', { params });
    return response.data;
  }

  async listWorkflowRunTasks(workflowRunId: string) {
    let response = await this.axios.get(`/workflow-runs/${workflowRunId}/tasks`);
    return response.data;
  }

  async getTask(workflowRunId: string, taskId: string) {
    let response = await this.axios.get(`/workflow-runs/${workflowRunId}/tasks/${taskId}`);
    return response.data;
  }

  async updateTask(
    workflowRunId: string,
    taskId: string,
    data: {
      status: string;
      dueDate?: string | null;
    }
  ) {
    await this.axios.put(`/workflow-runs/${workflowRunId}/tasks/${taskId}`, data);
  }

  // ---- Task Assignees ----

  async listTaskAssignees(workflowRunId: string, taskId: string) {
    let response = await this.axios.get(
      `/workflow-runs/${workflowRunId}/tasks/${taskId}/assignees`
    );
    return response.data;
  }

  async assignUserToTask(workflowRunId: string, taskId: string, email: string) {
    await this.axios.put(
      `/workflow-runs/${workflowRunId}/tasks/${taskId}/assignees/${encodeURIComponent(email)}`
    );
  }

  async unassignUserFromTask(workflowRunId: string, taskId: string, email: string) {
    await this.axios.delete(
      `/workflow-runs/${workflowRunId}/tasks/${taskId}/assignees/${encodeURIComponent(email)}`
    );
  }

  // ---- Approvals ----

  async listApprovals(workflowRunId: string) {
    let response = await this.axios.get(`/workflow-runs/${workflowRunId}/approvals`);
    return response.data;
  }

  async upsertApproval(
    workflowRunId: string,
    data: {
      approvalTaskId: string;
      status: string;
      subjectTaskId?: string;
      comment?: string;
    }
  ) {
    await this.axios.put(`/workflow-runs/${workflowRunId}/approvals`, data);
  }

  // ---- Form Fields ----

  async listWorkflowFormFields(workflowId: string) {
    let response = await this.axios.get(`/workflows/${workflowId}/form-fields`);
    return response.data;
  }

  async listFormFieldOptions(workflowId: string, formFieldId: string) {
    let response = await this.axios.get(
      `/workflows/${workflowId}/form-fields/${formFieldId}/options`
    );
    return response.data;
  }

  async listFormFieldValues(workflowRunId: string) {
    let response = await this.axios.get(`/workflow-runs/${workflowRunId}/form-fields`);
    return response.data;
  }

  async listTaskFormFieldValues(workflowRunId: string, taskId: string) {
    let response = await this.axios.get(
      `/workflow-runs/${workflowRunId}/tasks/${taskId}/form-fields`
    );
    return response.data;
  }

  async updateFormFieldValues(
    workflowRunId: string,
    fields: Array<{
      id: string;
      value?: string;
      values?: string[];
      timeHidden?: boolean;
      dataSetRowId?: string;
    }>
  ) {
    let response = await this.axios.post(`/workflow-runs/${workflowRunId}/form-fields`, {
      fields
    });
    return response.data;
  }

  // ---- Data Sets ----

  async listDataSets() {
    let response = await this.axios.get('/data-sets');
    return response.data;
  }

  async listDataSetRecords(dataSetId: string, params?: { columns?: string }) {
    let response = await this.axios.get(`/data-sets/${dataSetId}/records`, { params });
    return response.data;
  }

  async createDataSetRecord(
    dataSetId: string,
    cells: Array<{ fieldId: string; value: string | number | null }>
  ) {
    let response = await this.axios.post(`/data-sets/${dataSetId}/records`, { cells });
    return response.data;
  }

  async getDataSetRecord(dataSetId: string, recordId: string) {
    let response = await this.axios.get(`/data-sets/${dataSetId}/records/${recordId}`);
    return response.data;
  }

  async updateDataSetRecord(
    dataSetId: string,
    recordId: string,
    cells: Array<{ fieldId: string; value: string | number | null }>
  ) {
    let response = await this.axios.put(`/data-sets/${dataSetId}/records/${recordId}`, {
      cells
    });
    return response.data;
  }

  async deleteDataSetRecord(dataSetId: string, recordId: string) {
    let response = await this.axios.delete(`/data-sets/${dataSetId}/records/${recordId}`);
    return response.data;
  }

  // ---- Users ----

  async listUsers() {
    let response = await this.axios.get('/users');
    return response.data;
  }

  // ---- Webhooks ----

  async createWebhook(data: {
    url: string;
    triggers?: string[];
    workflowId?: string;
    taskId?: string;
  }) {
    let response = await this.axios.post('/webhooks', data);
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    await this.axios.delete(`/webhooks/${webhookId}`);
  }
}
