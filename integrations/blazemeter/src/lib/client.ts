import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export class BlazeMeterClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(params: {
    token: string;
    apiKeyId?: string;
    apiKeySecret?: string;
    runscopeToken?: string;
  }) {
    if (params.runscopeToken || !params.token) {
      throw createApiServiceError(
        'A BlazeMeter API key connection is required for this operation.'
      );
    }
    let authHeader =
      params.apiKeyId && params.apiKeySecret
        ? `Basic ${Buffer.from(`${params.apiKeyId}:${params.apiKeySecret}`).toString('base64')}`
        : `Basic ${params.token}`;

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://a.blazemeter.com/api/v4',
      authHeader: { value: authHeader },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'BlazeMeter',
          reason: 'blazemeter_api_error'
        })
    });
  }

  // ─── User / Account ──────────────────────────────────────────

  async getCurrentUser(): Promise<any> {
    let response = await this.axios.get('/user');
    return response.data?.result;
  }

  async listAccounts(): Promise<any[]> {
    let response = await this.axios.get('/accounts');
    return response.data?.result || [];
  }

  async listWorkspaces(accountId: number): Promise<any[]> {
    let response = await this.axios.get(`/accounts/${accountId}/workspaces`);
    return response.data?.result || [];
  }

  async getWorkspace(workspaceId: number): Promise<any> {
    let response = await this.axios.get(`/workspaces/${workspaceId}`);
    return response.data?.result;
  }

  // ─── Projects ────────────────────────────────────────────────

  async listProjects(workspaceId: number): Promise<any[]> {
    let response = await this.axios.get(`/workspaces/${workspaceId}/projects`);
    return response.data?.result || [];
  }

  async getProject(projectId: number): Promise<any> {
    let response = await this.axios.get(`/projects/${projectId}`);
    return response.data?.result;
  }

  async createProject(workspaceId: number, name: string): Promise<any> {
    let response = await this.axios.post('/projects', {
      name,
      workspaceId
    });
    return response.data?.result;
  }

  async updateProject(projectId: number, name: string): Promise<any> {
    let response = await this.axios.patch(`/projects/${projectId}`, { name });
    return response.data?.result;
  }

  async deleteProject(projectId: number): Promise<void> {
    await this.axios.delete(`/projects/${projectId}`);
  }

  // ─── Tests (Performance) ─────────────────────────────────────

  async listTests(
    projectId?: number,
    workspaceId?: number,
    limit?: number,
    skip?: number
  ): Promise<any[]> {
    let params: Record<string, any> = {};
    if (projectId) params.projectId = projectId;
    if (workspaceId) params.workspaceId = workspaceId;
    if (limit) params.limit = limit;
    if (skip) params.skip = skip;
    let response = await this.axios.get('/tests', { params });
    return response.data?.result || [];
  }

  async getTest(testId: number): Promise<any> {
    let response = await this.axios.get(`/tests/${testId}`);
    return response.data?.result;
  }

  async createTest(params: {
    name: string;
    projectId: number;
    configuration?: Record<string, any>;
  }): Promise<any> {
    let body: Record<string, any> = {
      name: params.name,
      projectId: params.projectId
    };
    if (params.configuration) {
      body.configuration = params.configuration;
    }
    let response = await this.axios.post('/tests', body);
    return response.data?.result;
  }

  async updateTest(
    testId: number,
    params: {
      name?: string;
      configuration?: Record<string, any>;
    }
  ): Promise<any> {
    let response = await this.axios.patch(`/tests/${testId}`, params);
    return response.data?.result;
  }

  async deleteTest(testId: number): Promise<void> {
    await this.axios.delete(`/tests/${testId}`);
  }

  async startTest(testId: number): Promise<any> {
    let response = await this.axios.post(`/tests/${testId}/start`);
    return response.data?.result;
  }

  async stopTest(testId: number, sessionId?: string): Promise<any> {
    let url = sessionId ? `/sessions/${sessionId}/stop` : `/tests/${testId}/stop`;
    let response = await this.axios.post(url);
    return response.data?.result;
  }

  // ─── Masters (Test Runs) ─────────────────────────────────────

  async listMasters(testId?: number, projectId?: number, limit?: number): Promise<any[]> {
    let params: Record<string, any> = {};
    if (testId) params.testId = testId;
    if (projectId) params.projectId = projectId;
    if (limit) params.limit = limit;
    let response = await this.axios.get('/masters', { params });
    return response.data?.result || [];
  }

  async getMaster(masterId: number): Promise<any> {
    let response = await this.axios.get(`/masters/${masterId}`);
    return response.data?.result;
  }

  async getMasterStatus(masterId: number): Promise<any> {
    let response = await this.axios.get(`/masters/${masterId}/status`);
    return response.data?.result;
  }

  async getMasterSummary(masterId: number): Promise<any> {
    let response = await this.axios.get(`/masters/${masterId}/reports/main/summary`);
    return response.data?.result;
  }

  async stopMaster(masterId: number): Promise<any> {
    let response = await this.axios.post(`/masters/${masterId}/stop`);
    return response.data?.result;
  }

  async terminateMaster(masterId: number): Promise<any> {
    let response = await this.axios.post(`/masters/${masterId}/terminate`);
    return response.data?.result;
  }

  // ─── Sessions ────────────────────────────────────────────────

  async getSession(sessionId: string): Promise<any> {
    let response = await this.axios.get(`/sessions/${sessionId}`);
    return response.data?.result;
  }

  // ─── Multi-Tests ─────────────────────────────────────────────

  async listMultiTests(projectId?: number): Promise<any[]> {
    let params: Record<string, any> = {};
    if (projectId) params.projectId = projectId;
    let response = await this.axios.get('/multi-tests', { params });
    return response.data?.result || [];
  }

  async getMultiTest(multiTestId: number): Promise<any> {
    let response = await this.axios.get(`/multi-tests/${multiTestId}`);
    return response.data?.result;
  }

  async startMultiTest(multiTestId: number): Promise<any> {
    let response = await this.axios.post(`/multi-tests/${multiTestId}/start`);
    return response.data?.result;
  }

  // ─── Shared Folders ──────────────────────────────────────────

  async listSharedFolders(workspaceId: number): Promise<any[]> {
    let response = await this.axios.get(`/workspaces/${workspaceId}/shared-folders`);
    return response.data?.result || [];
  }

  async uploadToSharedFolder(
    sharedFolderId: number,
    fileName: string,
    fileContent: string
  ): Promise<any> {
    let response = await this.axios.post(`/shared-folders/${sharedFolderId}/files`, {
      fileName,
      content: fileContent
    });
    return response.data?.result;
  }

  // ─── Schedules ───────────────────────────────────────────────

  async listSchedules(testId: number): Promise<any[]> {
    let response = await this.axios.get('/schedules', { params: { testId } });
    return response.data?.result || [];
  }

  async createSchedule(
    testId: number,
    params: {
      cronExpression?: string;
      nextRun?: string;
      enabled?: boolean;
    }
  ): Promise<any> {
    if (!params.cronExpression?.trim()) {
      throw createApiServiceError(
        'cronExpression is required to create a performance test schedule.'
      );
    }
    if (params.nextRun !== undefined) {
      throw createApiServiceError(
        'nextRun is calculated by BlazeMeter. Use cronExpression to select the run times.'
      );
    }
    let response = await this.axios.post('/schedules', {
      testId,
      cron: params.cronExpression
    });
    let schedule = response.data?.result;
    if (!schedule?.id) {
      throw createApiServiceError('BlazeMeter did not return the created schedule ID.');
    }
    if (params.enabled !== undefined && params.enabled !== schedule.enabled) {
      let scheduleKey = String(schedule.id);
      try {
        let updated = await this.axios.patch(`/schedules/${encodeURIComponent(scheduleKey)}`, {
          enabled: params.enabled
        });
        let result = updated.data?.result;
        if (String(result?.id) !== scheduleKey || result?.enabled !== params.enabled) {
          throw createApiServiceError(
            `BlazeMeter did not confirm the requested enabled state for schedule ${scheduleKey}.`
          );
        }
        return result;
      } catch (updateError) {
        let cleanupConfirmed = false;
        try {
          await this.deleteSchedule(scheduleKey);
          cleanupConfirmed = true;
        } catch {
          // A failed or unconfirmed deletion leaves a resource requiring explicit recovery.
        }
        let error = createApiServiceError(
          cleanupConfirmed
            ? `Could not set the requested enabled state for schedule ${scheduleKey}. The newly created schedule was deleted; creation can be retried.`
            : `Created schedule ${scheduleKey} for test ${testId}, but its requested enabled state and deletion could not be confirmed. It may still be active. Use manage_schedule with action "list" and testId ${testId}, then delete scheduleKey "${scheduleKey}" before retrying creation.`,
          {
            reason: cleanupConfirmed
              ? 'blazemeter_schedule_creation_rolled_back'
              : 'blazemeter_schedule_creation_partial',
            parent: updateError
          }
        );
        error.data.scheduleKey = scheduleKey;
        error.data.testId = testId;
        error.data.requestedEnabled = params.enabled;
        error.data.cleanupConfirmed = cleanupConfirmed;
        throw error;
      }
    }
    return schedule;
  }

  async deleteSchedule(scheduleId: string | number): Promise<void> {
    let response = await this.axios.delete(
      `/schedules/${encodeURIComponent(String(scheduleId))}`
    );
    if (response.status !== 204) {
      throw createApiServiceError(
        `BlazeMeter did not confirm deletion of schedule ${scheduleId}. List schedules before retrying.`,
        { reason: 'blazemeter_schedule_deletion_unconfirmed', upstreamStatus: response.status }
      );
    }
  }

  // ─── Private Locations ───────────────────────────────────────

  async listPrivateLocations(workspaceId: number): Promise<any[]> {
    let response = await this.axios.get(`/workspaces/${workspaceId}/private-locations`);
    return response.data?.result || [];
  }

  async createPrivateLocation(
    workspaceId: number,
    params: {
      name: string;
      ships?: any[];
    }
  ): Promise<any> {
    let response = await this.axios.post(
      `/workspaces/${workspaceId}/private-locations`,
      params
    );
    return response.data?.result;
  }

  // ─── Workspace Users ─────────────────────────────────────────

  async listWorkspaceUsers(workspaceId: number): Promise<any[]> {
    let response = await this.axios.get(`/workspaces/${workspaceId}/users`);
    return response.data?.result || [];
  }

  async inviteUser(workspaceId: number, email: string, role?: string): Promise<any> {
    let body: Record<string, any> = { email };
    if (role) body.role = role;
    let response = await this.axios.post(`/workspaces/${workspaceId}/invitations`, body);
    return response.data?.result;
  }
}
