import { buildApiServiceError, createAuthenticatedAxios, isApiErrorRecord } from 'slates';

let BASE_URL = 'https://public-api.process.st/api/v1.1';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { name: 'X-API-KEY', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Process Street',
          reason: 'process_street_api_error',
          extractUpstreamCode: (_error, response) =>
            isApiErrorRecord(response?.data) && typeof response.data.errorCode === 'string'
              ? response.data.errorCode
              : undefined
        })
    });
  }

  async testAuth(): Promise<{ apiKeyLabel: string }> {
    let response = await this.axios.get('/testAuth');
    return response.data;
  }

  async listWorkflowRunsPage(params: {
    workflowId?: string;
    status?: string;
    cursor?: string;
  }) {
    let response = await this.axios.get('/workflow-runs/list', {
      params: { workflowId: params.workflowId, status: params.status, _: params.cursor }
    });
    return response.data;
  }

  // ---- Workflows ----

  async listWorkflows(params?: { name?: string; cursor?: string }) {
    let response = await this.axios.get('/workflows', {
      params: { name: params?.name, _: params?.cursor }
    });
    return response.data;
  }

  async listWorkflowTasks(workflowId: string, cursor?: string) {
    let response = await this.axios.get(`/workflows/${workflowId}/tasks`, {
      params: { _: cursor }
    });
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

  async listWorkflowRunAssignees(workflowRunId: string, cursor?: string) {
    let response = await this.axios.get(`/workflow-runs/${workflowRunId}/assignees`, {
      params: { _: cursor }
    });
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

  async listTasksByAssignee(assigneeEmail: string, workflowId?: string, cursor?: string) {
    let params: Record<string, string | undefined> = { assigneeEmail, _: cursor };
    if (workflowId) params.workflowId = workflowId;
    let response = await this.axios.get('/tasks', { params });
    return response.data;
  }

  async listWorkflowRunTasks(workflowRunId: string, cursor?: string) {
    let response = await this.axios.get(`/workflow-runs/${workflowRunId}/tasks`, {
      params: { _: cursor }
    });
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

  async listApprovals(workflowRunId: string, cursor?: string) {
    let response = await this.axios.get(`/workflow-runs/${workflowRunId}/approvals`, {
      params: { _: cursor }
    });
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

  async listWorkflowFormFields(workflowId: string, cursor?: string) {
    let response = await this.axios.get(`/workflows/${workflowId}/form-fields`, {
      params: { _: cursor }
    });
    return response.data;
  }

  async listFormFieldOptions(workflowId: string, formFieldId: string, cursor?: string) {
    let response = await this.axios.get(
      `/workflows/${workflowId}/form-fields/${formFieldId}/options`,
      { params: { _: cursor } }
    );
    return response.data;
  }

  async listFormFieldValues(workflowRunId: string, cursor?: string) {
    let response = await this.axios.get(`/workflow-runs/${workflowRunId}/form-fields`, {
      params: { _: cursor }
    });
    return response.data;
  }

  async listTaskFormFieldValues(workflowRunId: string, taskId: string, cursor?: string) {
    let response = await this.axios.get(
      `/workflow-runs/${workflowRunId}/tasks/${taskId}/form-fields`,
      { params: { _: cursor } }
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

  async listDataSets(cursor?: string) {
    let response = await this.axios.get('/data-sets', { params: { _: cursor } });
    return response.data;
  }

  async listDataSetRecords(
    dataSetId: string,
    params?: { columns?: Record<string, string>; cursor?: string }
  ) {
    let response = await this.axios.get(`/data-sets/${dataSetId}/records`, {
      params: {
        _: params?.cursor,
        ...Object.fromEntries(
          Object.entries(params?.columns ?? {}).map(([id, value]) => [`columns[${id}]`, value])
        )
      }
    });
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

  async listUsers(cursor?: string) {
    let response = await this.axios.get('/users', { params: { _: cursor } });
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
