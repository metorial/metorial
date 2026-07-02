import { createAxios } from 'slates';

export class BugsnagClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.bugsnag.com',
      headers: {
        Authorization: `token ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Organizations ──────────────────────────────────────────

  async listOrganizations(): Promise<any[]> {
    let response = await this.axios.get('/user/organizations');
    return response.data;
  }

  async getOrganization(organizationId: string): Promise<any> {
    let response = await this.axios.get(`/organizations/${organizationId}`);
    return response.data;
  }

  // ─── Projects ───────────────────────────────────────────────

  async listProjects(
    organizationId: string,
    params?: { perPage?: number; offset?: string }
  ): Promise<any[]> {
    let response = await this.axios.get(`/organizations/${organizationId}/projects`, {
      params: {
        per_page: params?.perPage,
        offset: params?.offset
      }
    });
    return response.data;
  }

  async getProject(projectId: string): Promise<any> {
    let response = await this.axios.get(`/projects/${projectId}`);
    return response.data;
  }

  async createProject(
    organizationId: string,
    data: { name: string; type?: string }
  ): Promise<any> {
    let response = await this.axios.post(`/organizations/${organizationId}/projects`, data);
    return response.data;
  }

  async updateProject(projectId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/projects/${projectId}`, data);
    return response.data;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.axios.delete(`/projects/${projectId}`);
  }

  // ─── Errors ─────────────────────────────────────────────────

  async listErrors(
    projectId: string,
    params?: {
      perPage?: number;
      offset?: string;
      sort?: string;
      direction?: string;
      filters?: Record<string, any>;
    }
  ): Promise<any[]> {
    let queryParams: Record<string, any> = {
      per_page: params?.perPage,
      offset: params?.offset,
      sort: params?.sort,
      direction: params?.direction
    };

    if (params?.filters) {
      for (let [key, value] of Object.entries(params.filters)) {
        queryParams[`filters[${key}][]`] = value;
      }
    }

    let response = await this.axios.get(`/projects/${projectId}/errors`, {
      params: queryParams
    });
    return response.data;
  }

  async getError(projectId: string, errorId: string): Promise<any> {
    let response = await this.axios.get(`/projects/${projectId}/errors/${errorId}`);
    return response.data;
  }

  async updateError(
    projectId: string,
    errorId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.patch(`/projects/${projectId}/errors/${errorId}`, data);
    return response.data;
  }

  async deleteError(projectId: string, errorId: string): Promise<void> {
    await this.axios.delete(`/projects/${projectId}/errors/${errorId}`);
  }

  async bulkUpdateErrors(
    projectId: string,
    data: {
      operation: string;
      query?: Record<string, any>;
      errorIds?: string[];
    }
  ): Promise<any> {
    let response = await this.axios.patch(`/projects/${projectId}/errors`, data);
    return response.data;
  }

  // ─── Events ─────────────────────────────────────────────────

  async listEvents(
    projectId: string,
    params?: {
      perPage?: number;
      offset?: string;
      sort?: string;
      direction?: string;
      filters?: Record<string, any>;
    }
  ): Promise<any[]> {
    let queryParams: Record<string, any> = {
      per_page: params?.perPage,
      offset: params?.offset,
      sort: params?.sort,
      direction: params?.direction
    };

    if (params?.filters) {
      for (let [key, value] of Object.entries(params.filters)) {
        queryParams[`filters[${key}][]`] = value;
      }
    }

    let response = await this.axios.get(`/projects/${projectId}/events`, {
      params: queryParams
    });
    return response.data;
  }

  async listErrorEvents(
    projectId: string,
    errorId: string,
    params?: {
      perPage?: number;
      offset?: string;
    }
  ): Promise<any[]> {
    let response = await this.axios.get(`/projects/${projectId}/errors/${errorId}/events`, {
      params: {
        per_page: params?.perPage,
        offset: params?.offset
      }
    });
    return response.data;
  }

  async getEvent(projectId: string, eventId: string): Promise<any> {
    let response = await this.axios.get(`/projects/${projectId}/events/${eventId}`);
    return response.data;
  }

  async deleteEvent(projectId: string, eventId: string): Promise<void> {
    await this.axios.delete(`/projects/${projectId}/events/${eventId}`);
  }

  // ─── Trends ─────────────────────────────────────────────────

  async getProjectTrends(
    projectId: string,
    params?: {
      filters?: Record<string, any>;
      resolution?: string;
    }
  ): Promise<any[]> {
    let queryParams: Record<string, any> = {
      resolution: params?.resolution
    };

    if (params?.filters) {
      for (let [key, value] of Object.entries(params.filters)) {
        queryParams[`filters[${key}][]`] = value;
      }
    }

    let response = await this.axios.get(`/projects/${projectId}/trends`, {
      params: queryParams
    });
    return response.data;
  }

  async getErrorTrends(projectId: string, errorId: string): Promise<any[]> {
    let response = await this.axios.get(`/projects/${projectId}/errors/${errorId}/trends`);
    return response.data;
  }

  // ─── Pivots ─────────────────────────────────────────────────

  async listProjectPivots(
    projectId: string,
    params?: {
      filters?: Record<string, any>;
    }
  ): Promise<any[]> {
    let queryParams: Record<string, any> = {};

    if (params?.filters) {
      for (let [key, value] of Object.entries(params.filters)) {
        queryParams[`filters[${key}][]`] = value;
      }
    }

    let response = await this.axios.get(`/projects/${projectId}/pivots`, {
      params: queryParams
    });
    return response.data;
  }

  async getPivotValues(
    projectId: string,
    displayId: string,
    params?: {
      filters?: Record<string, any>;
    }
  ): Promise<any[]> {
    let queryParams: Record<string, any> = {};

    if (params?.filters) {
      for (let [key, value] of Object.entries(params.filters)) {
        queryParams[`filters[${key}][]`] = value;
      }
    }

    let response = await this.axios.get(`/projects/${projectId}/pivots/${displayId}`, {
      params: queryParams
    });
    return response.data;
  }

  // ─── Releases ───────────────────────────────────────────────

  async listReleases(
    projectId: string,
    params?: {
      perPage?: number;
      offset?: string;
      releaseStage?: string;
    }
  ): Promise<any[]> {
    let response = await this.axios.get(`/projects/${projectId}/releases`, {
      params: {
        per_page: params?.perPage,
        offset: params?.offset,
        release_stage: params?.releaseStage
      }
    });
    return response.data;
  }

  async getRelease(projectId: string, releaseId: string): Promise<any> {
    let response = await this.axios.get(`/projects/${projectId}/releases/${releaseId}`);
    return response.data;
  }

  async listReleaseGroups(projectId: string): Promise<any[]> {
    let response = await this.axios.get(`/projects/${projectId}/release_groups`);
    return response.data;
  }

  // ─── Stability ──────────────────────────────────────────────

  async getProjectStability(
    projectId: string,
    params?: {
      releaseStage?: string;
    }
  ): Promise<any> {
    let response = await this.axios.get(`/projects/${projectId}/stability_trend`, {
      params: {
        release_stage: params?.releaseStage
      }
    });
    return response.data;
  }

  // ─── Collaborators ─────────────────────────────────────────

  async listOrganizationCollaborators(
    organizationId: string,
    params?: {
      perPage?: number;
      offset?: string;
    }
  ): Promise<any[]> {
    let response = await this.axios.get(`/organizations/${organizationId}/collaborators`, {
      params: {
        per_page: params?.perPage,
        offset: params?.offset
      }
    });
    return response.data;
  }

  async inviteCollaborator(
    organizationId: string,
    data: {
      email: string;
      admin?: boolean;
      project_ids?: string[];
    }
  ): Promise<any> {
    let response = await this.axios.post(
      `/organizations/${organizationId}/collaborators`,
      data
    );
    return response.data;
  }

  async updateCollaborator(
    organizationId: string,
    userId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.patch(
      `/organizations/${organizationId}/collaborators/${userId}`,
      data
    );
    return response.data;
  }

  async removeCollaborator(organizationId: string, userId: string): Promise<void> {
    await this.axios.delete(`/organizations/${organizationId}/collaborators/${userId}`);
  }

  // ─── Comments ───────────────────────────────────────────────

  async listComments(projectId: string, errorId: string): Promise<any[]> {
    let response = await this.axios.get(`/projects/${projectId}/errors/${errorId}/comments`);
    return response.data;
  }

  async createComment(projectId: string, errorId: string, message: string): Promise<any> {
    let response = await this.axios.post(`/projects/${projectId}/errors/${errorId}/comments`, {
      message
    });
    return response.data;
  }

  async getComment(projectId: string, commentId: string): Promise<any> {
    let response = await this.axios.get(`/projects/${projectId}/comments/${commentId}`);
    return response.data;
  }

  async updateComment(commentId: string, message: string): Promise<any> {
    let response = await this.axios.patch(`/comments/${commentId}`, { message });
    return response.data;
  }

  async deleteComment(commentId: string): Promise<void> {
    await this.axios.delete(`/comments/${commentId}`);
  }

  // ─── Event Fields ──────────────────────────────────────────

  async listEventFields(projectId: string): Promise<any[]> {
    let response = await this.axios.get(`/projects/${projectId}/event_fields`);
    return response.data;
  }

  // ─── Saved Searches ────────────────────────────────────────

  async listSavedSearches(projectId: string): Promise<any[]> {
    let response = await this.axios.get(`/projects/${projectId}/saved_searches`);
    return response.data;
  }

  async createSavedSearch(
    projectId: string,
    data: {
      name: string;
      search_filters: Record<string, any>;
    }
  ): Promise<any> {
    let response = await this.axios.post(`/projects/${projectId}/saved_searches`, data);
    return response.data;
  }

  async getSavedSearch(searchId: string): Promise<any> {
    let response = await this.axios.get(`/saved_searches/${searchId}`);
    return response.data;
  }

  async updateSavedSearch(searchId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/saved_searches/${searchId}`, data);
    return response.data;
  }

  async deleteSavedSearch(searchId: string): Promise<void> {
    await this.axios.delete(`/saved_searches/${searchId}`);
  }

  // ─── Current User ──────────────────────────────────────────

  async getCurrentUser(): Promise<any> {
    let response = await this.axios.get('/user');
    return response.data;
  }

  // ─── Teams ─────────────────────────────────────────────────

  async listTeams(organizationId: string): Promise<any[]> {
    let response = await this.axios.get(`/organizations/${organizationId}/teams`);
    return response.data;
  }

  async createTeam(organizationId: string, data: { name: string }): Promise<any> {
    let response = await this.axios.post(`/organizations/${organizationId}/teams`, data);
    return response.data;
  }
}
