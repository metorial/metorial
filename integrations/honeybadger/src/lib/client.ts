import { createApiServiceError, createAuthenticatedAxios, isApiErrorRecord } from 'slates';
import type {
  Account,
  CheckIn,
  Comment,
  Deploy,
  Environment,
  Fault,
  HoneybadgerAuth,
  Insights,
  Invitation,
  Member,
  Notice,
  Outage,
  Page,
  Project,
  Site,
  Team
} from './types';
import { honeybadgerError, hosts, pageUrl, pathId, validateLimit } from './validation';

export class HoneybadgerClient {
  private http;
  readonly baseUrl: string;

  constructor(config: HoneybadgerAuth) {
    if (!config.token.trim())
      throw createApiServiceError('A personal authentication token is required.');
    this.baseUrl = hosts(config.region).data;
    this.http = createAuthenticatedAxios({
      baseURL: this.baseUrl,
      timeout: 30_000,
      errorAdapter: honeybadgerError,
      auth: {
        username: config.token.trim(),
        password: ''
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  // ==================== Projects ====================

  async listProjects(params?: { accountId?: string; nextUrl?: string }) {
    let response = await this.http.get<Page<Project>>(
      pageUrl(this.baseUrl, '/projects', params?.nextUrl) ?? '/projects',
      {
        params: params?.nextUrl ? undefined : { account_id: params?.accountId }
      }
    );
    return this.page(response.data, '/projects');
  }

  async getProject(projectId: string) {
    let response = await this.http.get<Project>(`/projects/${pathId(projectId)}`);
    return this.entity(response.data);
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
    let response = await this.http.post<Project>(
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
    return this.entity(response.data);
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
    await this.http.put(`/projects/${pathId(projectId)}`, {
      project: {
        name: project.name,
        language: project.language,
        resolve_errors_on_deploy: project.resolveErrorsOnDeploy,
        disable_public_links: project.disablePublicLinks
      }
    });
  }

  async deleteProject(projectId: string) {
    await this.http.delete(`/projects/${pathId(projectId)}`);
  }

  // ==================== Faults (Errors) ====================

  async listFaults(
    projectId: string,
    params?: {
      nextUrl?: string;
      q?: string;
      createdAfter?: number;
      occurredAfter?: number;
      occurredBefore?: number;
      limit?: number;
      order?: string;
    }
  ) {
    validateLimit(params?.limit);
    let response = await this.http.get<Page<Fault>>(
      pageUrl(this.baseUrl, `/projects/${pathId(projectId)}/faults`, params?.nextUrl) ??
        `/projects/${pathId(projectId)}/faults`,
      {
        params: params?.nextUrl
          ? undefined
          : {
              q: params?.q,
              created_after: params?.createdAfter,
              occurred_after: params?.occurredAfter,
              occurred_before: params?.occurredBefore,
              limit: params?.limit,
              order: params?.order
            }
      }
    );
    return this.page(response.data, `/projects/${pathId(projectId)}/faults`);
  }

  async getFault(projectId: string, faultId: string) {
    let response = await this.http.get<Fault>(
      `/projects/${pathId(projectId)}/faults/${pathId(faultId)}`
    );
    return this.entity(response.data);
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
    await this.http.put(`/projects/${pathId(projectId)}/faults/${pathId(faultId)}`, {
      fault: {
        resolved: fault.resolved,
        ignored: fault.ignored,
        assignee_id: fault.assigneeId
      }
    });
  }

  async deleteFault(projectId: string, faultId: string) {
    await this.http.delete(`/projects/${pathId(projectId)}/faults/${pathId(faultId)}`);
  }

  async bulkResolveFaults(projectId: string, query?: string) {
    let response = await this.http.post(
      `/projects/${pathId(projectId)}/faults/resolve`,
      null,
      {
        params: { q: query }
      }
    );
    return { queued: response.status === 202 };
  }

  async pauseFault(
    projectId: string,
    faultId: string,
    pause: { time?: string; count?: number }
  ) {
    await this.http.post(
      `/projects/${pathId(projectId)}/faults/${pathId(faultId)}/pause`,
      pause
    );
  }

  async unpauseFault(projectId: string, faultId: string) {
    await this.http.post(`/projects/${pathId(projectId)}/faults/${pathId(faultId)}/unpause`);
  }

  // ==================== Notices ====================

  async listNotices(
    projectId: string,
    faultId: string,
    params?: {
      nextUrl?: string;
      createdAfter?: number;
      createdBefore?: number;
      limit?: number;
    }
  ) {
    validateLimit(params?.limit);
    let response = await this.http.get<Page<Notice>>(
      pageUrl(
        this.baseUrl,
        `/projects/${pathId(projectId)}/faults/${pathId(faultId)}/notices`,
        params?.nextUrl
      ) ?? `/projects/${pathId(projectId)}/faults/${pathId(faultId)}/notices`,
      {
        params: params?.nextUrl
          ? undefined
          : {
              created_after: params?.createdAfter,
              created_before: params?.createdBefore,
              limit: params?.limit
            }
      }
    );
    return this.page(
      response.data,
      `/projects/${pathId(projectId)}/faults/${pathId(faultId)}/notices`
    );
  }

  // ==================== Comments ====================

  async listComments(projectId: string, faultId: string, nextUrl?: string) {
    let response = await this.http.get<Page<Comment>>(
      pageUrl(
        this.baseUrl,
        `/projects/${pathId(projectId)}/faults/${pathId(faultId)}/comments`,
        nextUrl
      ) ?? `/projects/${pathId(projectId)}/faults/${pathId(faultId)}/comments`
    );
    return this.page(
      response.data,
      `/projects/${pathId(projectId)}/faults/${pathId(faultId)}/comments`
    );
  }

  async createComment(projectId: string, faultId: string, body: string) {
    let response = await this.http.post<Comment>(
      `/projects/${pathId(projectId)}/faults/${pathId(faultId)}/comments`,
      {
        comment: { body }
      }
    );
    return this.entity(response.data);
  }

  async deleteComment(projectId: string, faultId: string, commentId: string) {
    await this.http.delete(
      `/projects/${pathId(projectId)}/faults/${pathId(faultId)}/comments/${pathId(commentId)}`
    );
  }

  // ==================== Sites (Uptime) ====================

  async listSites(projectId: string, nextUrl?: string) {
    let response = await this.http.get<Page<Site>>(
      pageUrl(this.baseUrl, `/projects/${pathId(projectId)}/sites`, nextUrl) ??
        `/projects/${pathId(projectId)}/sites`
    );
    return this.page(response.data, `/projects/${pathId(projectId)}/sites`);
  }

  async getSite(projectId: string, siteId: string) {
    let response = await this.http.get<Site>(
      `/projects/${pathId(projectId)}/sites/${pathId(siteId)}`
    );
    return this.entity(response.data);
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
    let response = await this.http.post<Site>(`/projects/${pathId(projectId)}/sites`, {
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
    return this.entity(response.data);
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
    await this.http.put(`/projects/${pathId(projectId)}/sites/${pathId(siteId)}`, {
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
    await this.http.delete(`/projects/${pathId(projectId)}/sites/${pathId(siteId)}`);
  }

  async listOutages(
    projectId: string,
    siteId: string,
    params?: {
      nextUrl?: string;
      createdAfter?: number;
      createdBefore?: number;
      limit?: number;
    }
  ) {
    validateLimit(params?.limit);
    let response = await this.http.get<Page<Outage>>(
      pageUrl(
        this.baseUrl,
        `/projects/${pathId(projectId)}/sites/${pathId(siteId)}/outages`,
        params?.nextUrl
      ) ?? `/projects/${pathId(projectId)}/sites/${pathId(siteId)}/outages`,
      {
        params: params?.nextUrl
          ? undefined
          : {
              created_after: params?.createdAfter,
              created_before: params?.createdBefore,
              limit: params?.limit
            }
      }
    );
    return this.page(
      response.data,
      `/projects/${pathId(projectId)}/sites/${pathId(siteId)}/outages`
    );
  }

  // ==================== Check-Ins ====================

  async listCheckIns(projectId: string, nextUrl?: string) {
    let response = await this.http.get<Page<CheckIn>>(
      pageUrl(this.baseUrl, `/projects/${pathId(projectId)}/check_ins`, nextUrl) ??
        `/projects/${pathId(projectId)}/check_ins`
    );
    return this.page(response.data, `/projects/${pathId(projectId)}/check_ins`);
  }

  async getCheckIn(projectId: string, checkInId: string) {
    let response = await this.http.get<CheckIn>(
      `/projects/${pathId(projectId)}/check_ins/${pathId(checkInId)}`
    );
    return this.entity(response.data);
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
    let response = await this.http.post<CheckIn>(`/projects/${pathId(projectId)}/check_ins`, {
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
    return this.entity(response.data);
  }

  async updateCheckIn(
    projectId: string,
    checkInId: string,
    checkIn: {
      name?: string;
      slug?: string;
      reportPeriod?: string;
      gracePeriod?: string;
      cronSchedule?: string;
      cronTimezone?: string;
    }
  ) {
    await this.http.put(`/projects/${pathId(projectId)}/check_ins/${pathId(checkInId)}`, {
      check_in: {
        name: checkIn.name,
        slug: checkIn.slug,
        report_period: checkIn.reportPeriod,
        grace_period: checkIn.gracePeriod,
        cron_schedule: checkIn.cronSchedule,
        cron_timezone: checkIn.cronTimezone
      }
    });
  }

  async deleteCheckIn(projectId: string, checkInId: string) {
    await this.http.delete(`/projects/${pathId(projectId)}/check_ins/${pathId(checkInId)}`);
  }

  // ==================== Deployments ====================

  async listDeploys(
    projectId: string,
    params?: {
      nextUrl?: string;
      environment?: string;
      localUsername?: string;
      createdAfter?: number;
      createdBefore?: number;
      limit?: number;
    }
  ) {
    validateLimit(params?.limit);
    let response = await this.http.get<Page<Deploy>>(
      pageUrl(this.baseUrl, `/projects/${pathId(projectId)}/deploys`, params?.nextUrl) ??
        `/projects/${pathId(projectId)}/deploys`,
      {
        params: params?.nextUrl
          ? undefined
          : {
              environment: params?.environment,
              local_username: params?.localUsername,
              created_after: params?.createdAfter,
              created_before: params?.createdBefore,
              limit: params?.limit
            }
      }
    );
    return this.page(response.data, `/projects/${pathId(projectId)}/deploys`);
  }

  async getDeploy(projectId: string, deployId: string) {
    let response = await this.http.get<Deploy>(
      `/projects/${pathId(projectId)}/deploys/${pathId(deployId)}`
    );
    return this.entity(response.data, true);
  }

  async deleteDeploy(projectId: string, deployId: string) {
    await this.http.delete(`/projects/${pathId(projectId)}/deploys/${pathId(deployId)}`);
  }

  // ==================== Teams ====================

  async listTeams(params?: { accountId?: string; nextUrl?: string }) {
    let response = await this.http.get<Page<Team>>(
      pageUrl(this.baseUrl, '/teams', params?.nextUrl) ?? '/teams',
      {
        params: params?.nextUrl ? undefined : { account_id: params?.accountId }
      }
    );
    return this.page(response.data, '/teams');
  }

  async getTeam(teamId: string) {
    let response = await this.http.get<Team>(`/teams/${pathId(teamId)}`);
    return this.entity(response.data);
  }

  async createTeam(accountId: string, name: string) {
    let response = await this.http.post<Team>(
      '/teams',
      {
        team: { name }
      },
      {
        params: { account_id: accountId }
      }
    );
    return this.entity(response.data);
  }

  async updateTeam(teamId: string, name: string) {
    await this.http.put(`/teams/${pathId(teamId)}`, {
      team: { name }
    });
  }

  async deleteTeam(teamId: string) {
    await this.http.delete(`/teams/${pathId(teamId)}`);
  }

  async listTeamMembers(teamId: string, nextUrl?: string) {
    let response = await this.http.get<Page<Member>>(
      pageUrl(this.baseUrl, `/teams/${pathId(teamId)}/team_members`, nextUrl) ??
        `/teams/${pathId(teamId)}/team_members`
    );
    return this.page(response.data, `/teams/${pathId(teamId)}/team_members`);
  }

  async removeTeamMember(teamId: string, memberId: string) {
    await this.http.delete(`/teams/${pathId(teamId)}/team_members/${pathId(memberId)}`);
  }

  async createTeamInvitation(
    teamId: string,
    invitation: {
      email: string;
      admin?: boolean;
      message?: string;
    }
  ) {
    let response = await this.http.post<Invitation>(
      `/teams/${pathId(teamId)}/team_invitations`,
      {
        team_invitation: {
          email: invitation.email,
          admin: invitation.admin,
          message: invitation.message
        }
      }
    );
    return this.entity(response.data);
  }

  async deleteTeamInvitation(teamId: string, invitationId: string) {
    await this.http.delete(
      `/teams/${pathId(teamId)}/team_invitations/${pathId(invitationId)}`
    );
  }

  // ==================== Environments ====================

  async listEnvironments(projectId: string, nextUrl?: string) {
    let response = await this.http.get<Page<Environment>>(
      pageUrl(this.baseUrl, `/projects/${pathId(projectId)}/environments`, nextUrl) ??
        `/projects/${pathId(projectId)}/environments`
    );
    return this.page(response.data, `/projects/${pathId(projectId)}/environments`);
  }

  async createEnvironment(
    projectId: string,
    environment: {
      name: string;
      notifications?: boolean;
    }
  ) {
    let response = await this.http.post<Environment>(
      `/projects/${pathId(projectId)}/environments`,
      {
        environment: {
          name: environment.name,
          notifications: environment.notifications
        }
      }
    );
    return this.entity(response.data);
  }

  async updateEnvironment(
    projectId: string,
    environmentId: string,
    environment: {
      name?: string;
      notifications?: boolean;
    }
  ) {
    await this.http.put(
      `/projects/${pathId(projectId)}/environments/${pathId(environmentId)}`,
      {
        environment: {
          name: environment.name,
          notifications: environment.notifications
        }
      }
    );
  }

  async deleteEnvironment(projectId: string, environmentId: string) {
    await this.http.delete(
      `/projects/${pathId(projectId)}/environments/${pathId(environmentId)}`
    );
  }

  // ==================== Insights ====================

  async queryInsights(
    projectId: string,
    query: string,
    params?: {
      ts?: string;
      timezone?: string;
      streamIds?: string[];
    }
  ) {
    let response = await this.http.post<Insights>(
      `/projects/${pathId(projectId)}/insights/queries`,
      {
        query,
        ts: params?.ts,
        timezone: params?.timezone,
        stream_ids: params?.streamIds
      }
    );
    if (
      !isApiErrorRecord(response.data) ||
      !Array.isArray(response.data.results) ||
      !response.data.results.every(isApiErrorRecord)
    )
      throw createApiServiceError(
        'Honeybadger returned an invalid Insights response. Retry the query; if it persists, check the provider service.'
      );
    return response.data;
  }

  private entity<T extends { id?: string | number }>(data: T, allowMissingId = false): T {
    if (
      !isApiErrorRecord(data) ||
      (!allowMissingId && data.id === undefined) ||
      (data.id !== undefined &&
        !(
          (typeof data.id === 'string' && data.id.trim()) ||
          (typeof data.id === 'number' && Number.isSafeInteger(data.id) && data.id > 0)
        ))
    )
      throw createApiServiceError(
        'Honeybadger returned an invalid resource response. Retry the request; if it persists, check the provider service.'
      );
    return data;
  }

  private page<T>(data: Page<T>, endpoint: string): Page<T> {
    if (
      !isApiErrorRecord(data) ||
      !Array.isArray(data.results) ||
      !data.results.every(isApiErrorRecord)
    )
      throw createApiServiceError('Honeybadger returned an invalid list response.');
    if (
      !endpoint.endsWith('/outages') &&
      !endpoint.endsWith('/deploys') &&
      data.results.some(
        row =>
          !isApiErrorRecord(row) ||
          !(
            (typeof row.id === 'string' && row.id.trim()) ||
            (typeof row.id === 'number' && Number.isSafeInteger(row.id) && row.id > 0)
          )
      )
    )
      throw createApiServiceError(
        'Honeybadger returned a list item without a valid resource ID.'
      );
    return {
      ...data,
      links: { ...data.links, next: pageUrl(this.baseUrl, endpoint, data.links?.next) }
    };
  }
  async verifyReportingProject(projectId: string, projectToken: string) {
    const project = await this.getProject(projectId);
    if (!project.token || project.token !== projectToken)
      throw createApiServiceError(
        'The configured reporting key does not match this project’s primary API key. Use a connection with that project’s primary key.'
      );
  }
  async listAccounts(nextUrl?: string) {
    const response = await this.http.get<Page<Account>>(
      pageUrl(this.baseUrl, '/accounts', nextUrl) ?? '/accounts'
    );
    return this.page(response.data, '/accounts');
  }
  async getEnvironment(projectId: string, environmentId: string) {
    const response = await this.http.get<Environment>(
      `/projects/${pathId(projectId)}/environments/${pathId(environmentId)}`
    );
    return this.entity(response.data);
  }
  async listTeamInvitations(teamId: string, nextUrl?: string) {
    const endpoint = `/teams/${pathId(teamId)}/team_invitations`;
    const response = await this.http.get<Page<Invitation>>(
      pageUrl(this.baseUrl, endpoint, nextUrl) ?? endpoint
    );
    return this.page(response.data, endpoint);
  }
}
