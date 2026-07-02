import { createAxios } from 'slates';

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  requestId: string;
  data: T;
  paging?: { offset?: number };
}

export class ConnecteamClient {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { baseUrl: string; token: string }) {
    this.http = createAxios({
      baseURL: config.baseUrl,
      headers: {
        'X-API-KEY': config.token,
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  // ─── Account ───────────────────────────────────────────

  async getAccount(): Promise<{ companyName: string; companyId: string }> {
    let response = await this.http.get('/me');
    return response.data.data;
  }

  // ─── Users ─────────────────────────────────────────────

  async getUsers(
    params?: PaginationParams & {
      userIds?: number[];
      userStatus?: string;
      fullNames?: string[];
      phoneNumbers?: string[];
      emailAddresses?: string[];
      createdAt?: number;
      modifiedAt?: number;
      sort?: string;
      order?: string;
    }
  ): Promise<PaginatedResponse<{ users: any[] }>> {
    let response = await this.http.get('/users/v1/users', { params });
    return response.data;
  }

  async createUsers(users: any[], sendActivation?: boolean): Promise<any> {
    let response = await this.http.post('/users/v1/users', users, {
      params: sendActivation != null ? { sendActivation } : undefined
    });
    return response.data;
  }

  async updateUsers(users: any[], params?: { editUsersByPhone?: boolean }): Promise<any> {
    let response = await this.http.put('/users/v1/users', users, { params });
    return response.data;
  }

  async archiveUsers(userIds: number[]): Promise<any> {
    let response = await this.http.delete('/users/v1/users', { data: userIds });
    return response.data;
  }

  async deleteUser(userId: number, deletionType?: string): Promise<any> {
    let response = await this.http.delete(`/users/v1/users/${userId}`, {
      params: deletionType ? { deletionType } : undefined
    });
    return response.data;
  }

  async promoteToAdmin(body: { userId: number; email: string; title?: string }): Promise<any> {
    let response = await this.http.post('/users/v1/admins', body);
    return response.data;
  }

  // ─── Custom Fields ─────────────────────────────────────

  async getCustomFields(
    params?: PaginationParams & {
      customFieldIds?: number[];
      categoryIds?: number[];
      customFieldTypes?: string[];
      customFieldNames?: string[];
    }
  ): Promise<any> {
    let response = await this.http.get('/users/v1/custom-fields', { params });
    return response.data;
  }

  async getCustomFieldCategories(params?: PaginationParams): Promise<any> {
    let response = await this.http.get('/users/v1/custom-field-categories', { params });
    return response.data;
  }

  // ─── Smart Groups ─────────────────────────────────────

  async getSmartGroups(params?: { id?: number; name?: string }): Promise<any> {
    let response = await this.http.get('/users/v1/smart-groups', { params });
    return response.data;
  }

  // ─── Time Clock ────────────────────────────────────────

  async getTimeClocks(): Promise<any> {
    let response = await this.http.get('/time-clock/v1/time-clocks');
    return response.data;
  }

  async getTimeActivities(
    timeClockId: string,
    params?: PaginationParams & {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<any> {
    let response = await this.http.get(
      `/time-clock/v1/time-clocks/${timeClockId}/time-activities`,
      { params }
    );
    return response.data;
  }

  async createTimeActivities(timeClockId: string, body: any): Promise<any> {
    let response = await this.http.post(
      `/time-clock/v1/time-clocks/${timeClockId}/time-activities`,
      body
    );
    return response.data;
  }

  async updateTimeActivities(timeClockId: string, body: any): Promise<any> {
    let response = await this.http.put(
      `/time-clock/v1/time-clocks/${timeClockId}/time-activities`,
      body
    );
    return response.data;
  }

  async clockIn(timeClockId: string, body: any): Promise<any> {
    let response = await this.http.post(
      `/time-clock/v1/time-clocks/${timeClockId}/clock-in`,
      body
    );
    return response.data;
  }

  async clockOut(timeClockId: string, body: any): Promise<any> {
    let response = await this.http.post(
      `/time-clock/v1/time-clocks/${timeClockId}/clock-out`,
      body
    );
    return response.data;
  }

  async getTimesheetTotals(
    timeClockId: string,
    params?: PaginationParams & {
      startDate?: string;
      endDate?: string;
      userIds?: number[];
    }
  ): Promise<any> {
    let response = await this.http.get(`/time-clock/v1/time-clocks/${timeClockId}/timesheet`, {
      params
    });
    return response.data;
  }

  async getGeofences(timeClockId: string, params?: PaginationParams): Promise<any> {
    let response = await this.http.get(`/time-clock/v1/time-clocks/${timeClockId}/geofences`, {
      params
    });
    return response.data;
  }

  // ─── Time Off ──────────────────────────────────────────

  async getTimeOffPolicyTypes(): Promise<any> {
    let response = await this.http.get('/time-off/v1/policy-types');
    return response.data;
  }

  async getTimeOffBalances(policyTypeId: string, params?: PaginationParams): Promise<any> {
    let response = await this.http.get(`/time-off/v1/policy-types/${policyTypeId}/balances`, {
      params
    });
    return response.data;
  }

  async createTimeOffRequest(body: any): Promise<any> {
    let response = await this.http.post('/time-off/v1/requests', body);
    return response.data;
  }

  async updateTimeOffRequest(requestId: string, body: any): Promise<any> {
    let response = await this.http.put(`/time-off/v1/requests/${requestId}`, body);
    return response.data;
  }

  async updateTimeOffBalance(policyTypeId: string, userId: number, body: any): Promise<any> {
    let response = await this.http.put(
      `/time-off/v1/policy-types/${policyTypeId}/balances/${userId}`,
      body
    );
    return response.data;
  }

  async assignUserToTimeOffPolicy(timeOffPolicyId: string, body: any): Promise<any> {
    let response = await this.http.put(
      `/time-off/v1/time-off-policies/${timeOffPolicyId}/assignments`,
      body
    );
    return response.data;
  }

  // ─── Scheduler ─────────────────────────────────────────

  async getSchedulers(): Promise<any> {
    let response = await this.http.get('/scheduler/v1/schedulers');
    return response.data;
  }

  async getShifts(
    schedulerId: number,
    params: PaginationParams & {
      startTime: number;
      endTime: number;
      isOpenShift?: boolean;
      isPublished?: boolean;
      jobId?: string[];
      assignedUserIds?: number[];
      shiftId?: string[];
      title?: string;
      sort?: string;
      order?: string;
    }
  ): Promise<any> {
    let response = await this.http.get(`/scheduler/v1/schedulers/${schedulerId}/shifts`, {
      params
    });
    return response.data;
  }

  async getShift(schedulerId: number, shiftId: string): Promise<any> {
    let response = await this.http.get(
      `/scheduler/v1/schedulers/${schedulerId}/shifts/${shiftId}`
    );
    return response.data;
  }

  async createShifts(schedulerId: number, shifts: any[], notifyUsers?: boolean): Promise<any> {
    let response = await this.http.post(
      `/scheduler/v1/schedulers/${schedulerId}/shifts`,
      shifts,
      {
        params: notifyUsers != null ? { notifyUsers } : undefined
      }
    );
    return response.data;
  }

  async updateShifts(schedulerId: number, shifts: any[], notifyUsers?: boolean): Promise<any> {
    let response = await this.http.put(
      `/scheduler/v1/schedulers/${schedulerId}/shifts`,
      shifts,
      {
        params: notifyUsers != null ? { notifyUsers } : undefined
      }
    );
    return response.data;
  }

  async deleteShift(
    schedulerId: number,
    shiftId: string,
    notifyUsers?: boolean
  ): Promise<any> {
    let response = await this.http.delete(
      `/scheduler/v1/schedulers/${schedulerId}/shifts/${shiftId}`,
      {
        params: notifyUsers != null ? { notifyUsers } : undefined
      }
    );
    return response.data;
  }

  async deleteShiftsBulk(schedulerId: number, body: any, notifyUsers?: boolean): Promise<any> {
    let response = await this.http.delete(`/scheduler/v1/schedulers/${schedulerId}/shifts`, {
      data: body,
      params: notifyUsers != null ? { notifyUsers } : undefined
    });
    return response.data;
  }

  async getShiftCustomFields(schedulerId: number, params?: PaginationParams): Promise<any> {
    let response = await this.http.get(
      `/scheduler/v1/schedulers/${schedulerId}/custom-fields`,
      { params }
    );
    return response.data;
  }

  async getShiftLayers(schedulerId: number): Promise<any> {
    let response = await this.http.get(`/scheduler/v1/schedulers/${schedulerId}/shift-layers`);
    return response.data;
  }

  async getUserUnavailability(params: {
    userId: number;
    startTime: number;
    endTime: number;
  }): Promise<any> {
    let response = await this.http.get('/scheduler/v1/schedulers/user-unavailability', {
      params
    });
    return response.data;
  }

  async getScheduleUnavailabilities(
    schedulerId: number,
    params: PaginationParams & {
      startTime: number;
      endTime: number;
    }
  ): Promise<any> {
    let response = await this.http.get(
      `/scheduler/v1/schedulers/${schedulerId}/unavailabilities`,
      { params }
    );
    return response.data;
  }

  async createUnavailability(schedulerId: number, body: any): Promise<any> {
    let response = await this.http.post(
      `/scheduler/v1/schedulers/${schedulerId}/unavailability`,
      body
    );
    return response.data;
  }

  async deleteUnavailability(schedulerId: number, unavailabilityId: string): Promise<any> {
    let response = await this.http.delete(
      `/scheduler/v1/schedulers/${schedulerId}/unavailability/${unavailabilityId}`
    );
    return response.data;
  }

  // ─── Jobs ──────────────────────────────────────────────

  async getJobs(
    params?: PaginationParams & {
      instanceIds?: number[];
      jobIds?: string[];
      jobNames?: string[];
      jobCodes?: string[];
      includeDeleted?: boolean;
      sort?: string;
      order?: string;
    }
  ): Promise<any> {
    let response = await this.http.get('/jobs/v1/jobs', { params });
    return response.data;
  }

  async getJob(jobId: string): Promise<any> {
    let response = await this.http.get(`/jobs/v1/jobs/${jobId}`);
    return response.data;
  }

  async createJobs(jobs: any[]): Promise<any> {
    let response = await this.http.post('/jobs/v1/jobs', jobs);
    return response.data;
  }

  async updateJob(jobId: string, body: any): Promise<any> {
    let response = await this.http.put(`/jobs/v1/jobs/${jobId}`, body);
    return response.data;
  }

  async deleteJob(jobId: string): Promise<any> {
    let response = await this.http.delete(`/jobs/v1/jobs/${jobId}`);
    return response.data;
  }

  async getJobCustomFields(params?: PaginationParams): Promise<any> {
    let response = await this.http.get('/jobs/v1/custom-fields', { params });
    return response.data;
  }

  // ─── Forms ─────────────────────────────────────────────

  async getForms(params?: PaginationParams): Promise<any> {
    let response = await this.http.get('/forms/v1/forms', { params });
    return response.data;
  }

  async getForm(formId: number): Promise<any> {
    let response = await this.http.get(`/forms/v1/forms/${formId}`);
    return response.data;
  }

  async getFormSubmissions(
    formId: number,
    params?: PaginationParams & {
      userIds?: number[];
      submittingStartTimestamp?: number;
      submittingEndTime?: number;
    }
  ): Promise<any> {
    let response = await this.http.get(`/forms/v1/forms/${formId}/form-submissions`, {
      params
    });
    return response.data;
  }

  async getFormSubmission(formId: number, formSubmissionId: string): Promise<any> {
    let response = await this.http.get(
      `/forms/v1/forms/${formId}/form-submissions/${formSubmissionId}`
    );
    return response.data;
  }

  async updateFormSubmission(
    formId: number,
    formSubmissionId: string,
    body: any
  ): Promise<any> {
    let response = await this.http.put(
      `/forms/v1/forms/${formId}/form-submissions/${formSubmissionId}`,
      body
    );
    return response.data;
  }

  // ─── Tasks (Quick Tasks) ──────────────────────────────

  async getTaskBoards(): Promise<any> {
    let response = await this.http.get('/tasks/v1/taskboards');
    return response.data;
  }

  async getTasks(taskBoardId: number, params?: PaginationParams): Promise<any> {
    let response = await this.http.get(`/tasks/v1/taskboards/${taskBoardId}/tasks`, {
      params
    });
    return response.data;
  }

  async createTask(taskBoardId: number, body: any): Promise<any> {
    let response = await this.http.post(`/tasks/v1/taskboards/${taskBoardId}/tasks`, body);
    return response.data;
  }

  async updateTask(taskBoardId: number, taskId: string, body: any): Promise<any> {
    let response = await this.http.put(
      `/tasks/v1/taskboards/${taskBoardId}/tasks/${taskId}`,
      body
    );
    return response.data;
  }

  async deleteTask(taskBoardId: number, taskId: string): Promise<any> {
    let response = await this.http.delete(
      `/tasks/v1/taskboards/${taskBoardId}/tasks/${taskId}`
    );
    return response.data;
  }

  async getTaskLabels(taskBoardId: number): Promise<any> {
    let response = await this.http.get(`/tasks/v1/taskboards/${taskBoardId}/labels`);
    return response.data;
  }

  async getSubTasks(
    taskBoardId: number,
    taskId: string,
    params?: PaginationParams
  ): Promise<any> {
    let response = await this.http.get(
      `/tasks/v1/taskboards/${taskBoardId}/tasks/${taskId}/sub-tasks`,
      { params }
    );
    return response.data;
  }

  async createSubTask(taskBoardId: number, taskId: string, body: any): Promise<any> {
    let response = await this.http.post(
      `/tasks/v1/taskboards/${taskBoardId}/tasks/${taskId}/sub-tasks`,
      body
    );
    return response.data;
  }

  async updateSubTask(
    taskBoardId: number,
    taskId: string,
    subTaskId: string,
    body: any
  ): Promise<any> {
    let response = await this.http.put(
      `/tasks/v1/taskboards/${taskBoardId}/tasks/${taskId}/sub-tasks/${subTaskId}`,
      body
    );
    return response.data;
  }

  async deleteSubTask(taskBoardId: number, taskId: string, subTaskId: string): Promise<any> {
    let response = await this.http.delete(
      `/tasks/v1/taskboards/${taskBoardId}/tasks/${taskId}/sub-tasks/${subTaskId}`
    );
    return response.data;
  }

  // ─── Chat ──────────────────────────────────────────────

  async getConversations(params?: PaginationParams): Promise<any> {
    let response = await this.http.get('/chat/v1/conversations', { params });
    return response.data;
  }

  async sendMessageToConversation(
    conversationId: string,
    body: {
      message: string;
      senderId?: number;
      attachments?: { fileId: string }[];
    }
  ): Promise<any> {
    let response = await this.http.post(
      `/chat/v1/conversations/${conversationId}/message`,
      body
    );
    return response.data;
  }

  async sendPrivateMessage(
    userId: string,
    body: {
      message: string;
      senderId?: number;
      attachments?: { fileId: string }[];
    }
  ): Promise<any> {
    let response = await this.http.post(
      `/chat/v1/conversations/privateMessage/${userId}`,
      body
    );
    return response.data;
  }

  async getPublishers(): Promise<any> {
    let response = await this.http.get('/publishers/v1/publishers');
    return response.data;
  }

  // ─── Onboarding ────────────────────────────────────────

  async getOnboardingPacks(params?: PaginationParams): Promise<any> {
    let response = await this.http.get('/onboarding/v1/packs', { params });
    return response.data;
  }

  async getPackAssignments(packId: number, params?: PaginationParams): Promise<any> {
    let response = await this.http.get(`/onboarding/v1/packs/${packId}/assignments`, {
      params
    });
    return response.data;
  }

  async assignUsersToPack(packId: number, body: any): Promise<any> {
    let response = await this.http.post(`/onboarding/v1/packs/${packId}/assignments`, body);
    return response.data;
  }

  // ─── Attachments ───────────────────────────────────────

  async generateUploadUrl(featureType: string): Promise<any> {
    let response = await this.http.post('/attachments/v1/files/generate-upload-url', {
      featureType
    });
    return response.data;
  }

  async completeUpload(fileId: string): Promise<any> {
    let response = await this.http.put(`/attachments/v1/files/complete-upload/${fileId}`);
    return response.data;
  }

  async getFileMetadata(fileId: string): Promise<any> {
    let response = await this.http.get(`/attachments/v1/files/${fileId}`);
    return response.data;
  }

  // ─── Webhooks ──────────────────────────────────────────

  async getWebhooks(params?: PaginationParams & { featureType?: string }): Promise<any> {
    let response = await this.http.get('/settings/v1/webhooks', { params });
    return response.data;
  }

  async createWebhook(body: {
    name: string;
    url: string;
    featureType: string;
    eventTypes: string[];
    objectId?: number | null;
    secretKey?: string | null;
    isDisabled?: boolean;
  }): Promise<any> {
    let response = await this.http.post('/settings/v1/webhooks', body);
    return response.data;
  }

  async deleteWebhook(webhookId: number): Promise<any> {
    let response = await this.http.delete(`/settings/v1/webhooks/${webhookId}`);
    return response.data;
  }
}
