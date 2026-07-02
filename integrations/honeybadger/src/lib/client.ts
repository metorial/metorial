import { createAxios } from 'slates';

export class HoneybadgerClient {
  private http;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://app.honeybadger.io/v2',
      auth: {
        username: config.token,
        password: ''
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  // ==================== Projects ====================

  async listProjects(params?: { accountId?: string }) {
    let response = await this.http.get('/projects', {
      params: { account_id: params?.accountId }
    });
    return response.data;
  }

  async getProject(projectId: string) {
    let response = await this.http.get(`/projects/${projectId}`);
    return response.data;
  }

  async createProject(
    accountId: string,
    project: {
      name: string;
      language?: string;
      resolveErrorsOnDeploy?: boolean;
      disablePublicLinks?: boolean;
    }
  ) {
    let response = await this.http.post(
      `/projects`,
      {
        project: {
          name: project.name,
          language: project.language,
          resolve_errors_on_deploy: project.resolveErrorsOnDeploy,
          disable_public_links: project.disablePublicLinks
        }
      },
      {
        params: { account_id: accountId }
      }
    );
    return response.data;
  }

  async updateProject(
    projectId: string,
    project: {
      name?: string;
      language?: string;
      resolveErrorsOnDeploy?: boolean;
      disablePublicLinks?: boolean;
    }
  ) {
    await this.http.put(`/projects/${projectId}`, {
      project: {
        name: project.name,
        language: project.language,
        resolve_errors_on_deploy: project.resolveErrorsOnDeploy,
        disable_public_links: project.disablePublicLinks
      }
    });
  }

  async deleteProject(projectId: string) {
    await this.http.delete(`/projects/${projectId}`);
  }

  // ==================== Faults (Errors) ====================

  async listFaults(
    projectId: string,
    params?: {
      q?: string;
      createdAfter?: number;
      occurredAfter?: number;
      occurredBefore?: number;
      limit?: number;
      order?: string;
    }
  ) {
    let response = await this.http.get(`/projects/${projectId}/faults`, {
      params: {
        q: params?.q,
        created_after: params?.createdAfter,
        occurred_after: params?.occurredAfter,
        occurred_before: params?.occurredBefore,
        limit: params?.limit,
        order: params?.order
      }
    });
    return response.data;
  }

  async getFault(projectId: string, faultId: string) {
    let response = await this.http.get(`/projects/${projectId}/faults/${faultId}`);
    return response.data;
  }

  async updateFault(
    projectId: string,
    faultId: string,
    fault: {
      resolved?: boolean;
      ignored?: boolean;
      assigneeId?: number;
    }
  ) {
    await this.http.put(`/projects/${projectId}/faults/${faultId}`, {
      fault: {
        resolved: fault.resolved,
        ignored: fault.ignored,
        assignee_id: fault.assigneeId
      }
    });
  }

  async deleteFault(projectId: string, faultId: string) {
    await this.http.delete(`/projects/${projectId}/faults/${faultId}`);
  }

  async bulkResolveFaults(projectId: string, query?: string) {
    let response = await this.http.post(`/projects/${projectId}/faults/resolve`, null, {
      params: { q: query }
    });
    return response.data;
  }

  async pauseFault(
    projectId: string,
    faultId: string,
    pause: { time?: string; count?: number }
  ) {
    await this.http.post(`/projects/${projectId}/faults/${faultId}/pause`, pause);
  }

  async unpauseFault(projectId: string, faultId: string) {
    await this.http.post(`/projects/${projectId}/faults/${faultId}/unpause`);
  }

  // ==================== Notices ====================

  async listNotices(
    projectId: string,
    faultId: string,
    params?: {
      createdAfter?: number;
      createdBefore?: number;
      limit?: number;
    }
  ) {
    let response = await this.http.get(`/projects/${projectId}/faults/${faultId}/notices`, {
      params: {
        created_after: params?.createdAfter,
        created_before: params?.createdBefore,
        limit: params?.limit
      }
    });
    return response.data;
  }

  // ==================== Comments ====================

  async listComments(projectId: string, faultId: string) {
    let response = await this.http.get(`/projects/${projectId}/faults/${faultId}/comments`);
    return response.data;
  }

  async createComment(projectId: string, faultId: string, body: string) {
    let response = await this.http.post(`/projects/${projectId}/faults/${faultId}/comments`, {
      comment: { body }
    });
    return response.data;
  }

  async deleteComment(projectId: string, faultId: string, commentId: string) {
    await this.http.delete(`/projects/${projectId}/faults/${faultId}/comments/${commentId}`);
  }

  // ==================== Sites (Uptime) ====================

  async listSites(projectId: string) {
    let response = await this.http.get(`/projects/${projectId}/sites`);
    return response.data;
  }

  async getSite(projectId: string, siteId: string) {
    let response = await this.http.get(`/projects/${projectId}/sites/${siteId}`);
    return response.data;
  }

  async createSite(
    projectId: string,
    site: {
      name: string;
      url: string;
      frequency?: number;
      matchType?: string;
      match?: string;
      requestMethod?: string;
      validateSsl?: boolean;
      active?: boolean;
    }
  ) {
    let response = await this.http.post(`/projects/${projectId}/sites`, {
      site: {
        name: site.name,
        url: site.url,
        frequency: site.frequency,
        match_type: site.matchType,
        match: site.match,
        request_method: site.requestMethod,
        validate_ssl: site.validateSsl,
        active: site.active
      }
    });
    return response.data;
  }

  async updateSite(
    projectId: string,
    siteId: string,
    site: {
      name?: string;
      url?: string;
      frequency?: number;
      matchType?: string;
      match?: string;
      requestMethod?: string;
      validateSsl?: boolean;
      active?: boolean;
    }
  ) {
    await this.http.put(`/projects/${projectId}/sites/${siteId}`, {
      site: {
        name: site.name,
        url: site.url,
        frequency: site.frequency,
        match_type: site.matchType,
        match: site.match,
        request_method: site.requestMethod,
        validate_ssl: site.validateSsl,
        active: site.active
      }
    });
  }

  async deleteSite(projectId: string, siteId: string) {
    await this.http.delete(`/projects/${projectId}/sites/${siteId}`);
  }

  async listOutages(
    projectId: string,
    siteId: string,
    params?: {
      createdAfter?: number;
      createdBefore?: number;
      limit?: number;
    }
  ) {
    let response = await this.http.get(`/projects/${projectId}/sites/${siteId}/outages`, {
      params: {
        created_after: params?.createdAfter,
        created_before: params?.createdBefore,
        limit: params?.limit
      }
    });
    return response.data;
  }

  // ==================== Check-Ins ====================

  async listCheckIns(projectId: string) {
    let response = await this.http.get(`/projects/${projectId}/check_ins`);
    return response.data;
  }

  async getCheckIn(projectId: string, checkInId: string) {
    let response = await this.http.get(`/projects/${projectId}/check_ins/${checkInId}`);
    return response.data;
  }

  async createCheckIn(
    projectId: string,
    checkIn: {
      name: string;
      slug?: string;
      scheduleType: string;
      reportPeriod?: string;
      gracePeriod?: string;
      cronSchedule?: string;
      cronTimezone?: string;
    }
  ) {
    let response = await this.http.post(`/projects/${projectId}/check_ins`, {
      check_in: {
        name: checkIn.name,
        slug: checkIn.slug,
        schedule_type: checkIn.scheduleType,
        report_period: checkIn.reportPeriod,
        grace_period: checkIn.gracePeriod,
        cron_schedule: checkIn.cronSchedule,
        cron_timezone: checkIn.cronTimezone
      }
    });
    return response.data;
  }

  async updateCheckIn(
    projectId: string,
    checkInId: string,
    checkIn: {
      name?: string;
      reportPeriod?: string;
      gracePeriod?: string;
      cronSchedule?: string;
      cronTimezone?: string;
    }
  ) {
    await this.http.put(`/projects/${projectId}/check_ins/${checkInId}`, {
      check_in: {
        name: checkIn.name,
        report_period: checkIn.reportPeriod,
        grace_period: checkIn.gracePeriod,
        cron_schedule: checkIn.cronSchedule,
        cron_timezone: checkIn.cronTimezone
      }
    });
  }

  async deleteCheckIn(projectId: string, checkInId: string) {
    await this.http.delete(`/projects/${projectId}/check_ins/${checkInId}`);
  }

  // ==================== Deployments ====================

  async listDeploys(
    projectId: string,
    params?: {
      environment?: string;
      localUsername?: string;
      createdAfter?: number;
      createdBefore?: number;
      limit?: number;
    }
  ) {
    let response = await this.http.get(`/projects/${projectId}/deploys`, {
      params: {
        environment: params?.environment,
        local_username: params?.localUsername,
        created_after: params?.createdAfter,
        created_before: params?.createdBefore,
        limit: params?.limit
      }
    });
    return response.data;
  }

  async getDeploy(projectId: string, deployId: string) {
    let response = await this.http.get(`/projects/${projectId}/deploys/${deployId}`);
    return response.data;
  }

  async deleteDeploy(projectId: string, deployId: string) {
    await this.http.delete(`/projects/${projectId}/deploys/${deployId}`);
  }

  // ==================== Teams ====================

  async listTeams(params?: { accountId?: string }) {
    let response = await this.http.get('/teams', {
      params: { account_id: params?.accountId }
    });
    return response.data;
  }

  async getTeam(teamId: string) {
    let response = await this.http.get(`/teams/${teamId}`);
    return response.data;
  }

  async createTeam(accountId: string, name: string) {
    let response = await this.http.post(
      '/teams',
      {
        team: { name }
      },
      {
        params: { account_id: accountId }
      }
    );
    return response.data;
  }

  async updateTeam(teamId: string, name: string) {
    await this.http.put(`/teams/${teamId}`, {
      team: { name }
    });
  }

  async deleteTeam(teamId: string) {
    await this.http.delete(`/teams/${teamId}`);
  }

  async listTeamMembers(teamId: string) {
    let response = await this.http.get(`/teams/${teamId}/team_members`);
    return response.data;
  }

  async removeTeamMember(teamId: string, memberId: string) {
    await this.http.delete(`/teams/${teamId}/team_members/${memberId}`);
  }

  async createTeamInvitation(
    teamId: string,
    invitation: {
      email: string;
      admin?: boolean;
      message?: string;
    }
  ) {
    let response = await this.http.post(`/teams/${teamId}/team_invitations`, {
      team_invitation: {
        email: invitation.email,
        admin: invitation.admin,
        message: invitation.message
      }
    });
    return response.data;
  }

  async deleteTeamInvitation(teamId: string, invitationId: string) {
    await this.http.delete(`/teams/${teamId}/team_invitations/${invitationId}`);
  }

  // ==================== Environments ====================

  async listEnvironments(projectId: string) {
    let response = await this.http.get(`/projects/${projectId}/environments`);
    return response.data;
  }

  async createEnvironment(
    projectId: string,
    environment: {
      name: string;
      notifications?: boolean;
    }
  ) {
    let response = await this.http.post(`/projects/${projectId}/environments`, {
      environment: {
        name: environment.name,
        notifications: environment.notifications
      }
    });
    return response.data;
  }

  async updateEnvironment(
    projectId: string,
    environmentId: string,
    environment: {
      name?: string;
      notifications?: boolean;
    }
  ) {
    await this.http.put(`/projects/${projectId}/environments/${environmentId}`, {
      environment: {
        name: environment.name,
        notifications: environment.notifications
      }
    });
  }

  async deleteEnvironment(projectId: string, environmentId: string) {
    await this.http.delete(`/projects/${projectId}/environments/${environmentId}`);
  }

  // ==================== Insights ====================

  async queryInsights(
    projectId: string,
    query: string,
    params?: {
      ts?: string;
      timezone?: string;
    }
  ) {
    let response = await this.http.post(`/projects/${projectId}/insights/queries`, {
      query,
      ts: params?.ts,
      timezone: params?.timezone
    });
    return response.data;
  }

  // ==================== Status Pages ====================

  async listStatusPages(accountId: string) {
    let response = await this.http.get(`/accounts/${accountId}/status_pages`);
    return response.data;
  }

  async getStatusPage(accountId: string, statusPageId: string) {
    let response = await this.http.get(`/accounts/${accountId}/status_pages/${statusPageId}`);
    return response.data;
  }

  async createStatusPage(
    accountId: string,
    statusPage: {
      name: string;
      domain?: string;
    }
  ) {
    let response = await this.http.post(`/accounts/${accountId}/status_pages`, {
      status_page: {
        name: statusPage.name,
        domain: statusPage.domain
      }
    });
    return response.data;
  }

  async updateStatusPage(
    accountId: string,
    statusPageId: string,
    statusPage: {
      name?: string;
      domain?: string;
    }
  ) {
    await this.http.put(`/accounts/${accountId}/status_pages/${statusPageId}`, {
      status_page: {
        name: statusPage.name,
        domain: statusPage.domain
      }
    });
  }

  async deleteStatusPage(accountId: string, statusPageId: string) {
    await this.http.delete(`/accounts/${accountId}/status_pages/${statusPageId}`);
  }
}
