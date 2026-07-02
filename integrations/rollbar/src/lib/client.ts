import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.rollbar.com/api/1'
});

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return {
      'X-Rollbar-Access-Token': this.token,
      'Content-Type': 'application/json'
    };
  }

  // ---- Items ----

  async listItems(params?: {
    status?: string;
    level?: string;
    environment?: string;
    page?: number;
    ids?: string;
    query?: string;
  }) {
    let response = await http.get('/items', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getItem(itemId: number) {
    let response = await http.get(`/item/${itemId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async getItemByCounter(counter: number) {
    let response = await http.get(`/item_by_counter/${counter}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateItem(
    itemId: number,
    data: {
      status?: string;
      level?: string;
      title?: string;
      assignedUser?: string;
      environment?: string;
    }
  ) {
    let response = await http.patch(`/item/${itemId}`, data, {
      headers: this.headers()
    });
    return response.data;
  }

  // ---- Occurrences ----

  async listOccurrences(params?: { page?: number }) {
    let response = await http.get('/instances', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async listItemOccurrences(
    itemId: number,
    params?: {
      page?: number;
    }
  ) {
    let response = await http.get(`/item/${itemId}/instances`, {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getOccurrence(occurrenceId: string) {
    let response = await http.get(`/instance/${occurrenceId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteOccurrence(occurrenceId: string) {
    let response = await http.delete(`/instance/${occurrenceId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ---- Deploys ----

  async createDeploy(data: {
    environment: string;
    revision: string;
    rollbar_username?: string;
    local_username?: string;
    comment?: string;
    status?: string;
  }) {
    let response = await http.post('/deploy', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async listDeploys(params?: { page?: number; environment?: string }) {
    let response = await http.get('/deploys', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getDeploy(deployId: number) {
    let response = await http.get(`/deploy/${deployId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ---- Projects ----

  async listProjects() {
    let response = await http.get('/projects', {
      headers: this.headers()
    });
    return response.data;
  }

  async getProject(projectId: number) {
    let response = await http.get(`/project/${projectId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createProject(data: { name: string }) {
    let response = await http.post('/projects', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteProject(projectId: number) {
    let response = await http.delete(`/project/${projectId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ---- Project Access Tokens ----

  async listProjectAccessTokens(projectId: number) {
    let response = await http.get(`/project/${projectId}/access_tokens`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createProjectAccessToken(
    projectId: number,
    data: {
      name: string;
      scopes: string[];
      status?: string;
      rate_limit_window_size?: number;
      rate_limit_window_count?: number;
    }
  ) {
    let response = await http.post(`/project/${projectId}/access_tokens`, data, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateProjectAccessToken(
    projectId: number,
    tokenValue: string,
    data: {
      rate_limit_window_size?: number;
      rate_limit_window_count?: number;
    }
  ) {
    let response = await http.patch(`/project/${projectId}/access_token/${tokenValue}`, data, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteProjectAccessToken(projectId: number, tokenValue: string) {
    let response = await http.delete(`/project/${projectId}/access_token/${tokenValue}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ---- Teams ----

  async listTeams() {
    let response = await http.get('/teams', {
      headers: this.headers()
    });
    return response.data;
  }

  async getTeam(teamId: number) {
    let response = await http.get(`/team/${teamId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createTeam(data: { name: string; access_level?: string }) {
    let response = await http.post('/teams', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteTeam(teamId: number) {
    let response = await http.delete(`/team/${teamId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ---- Team Members ----

  async listTeamMembers(teamId: number) {
    let response = await http.get(`/team/${teamId}/users`, {
      headers: this.headers()
    });
    return response.data;
  }

  async addUserToTeam(teamId: number, userId: number) {
    let response = await http.put(
      `/team/${teamId}/user/${userId}`,
      {},
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async removeUserFromTeam(teamId: number, userId: number) {
    let response = await http.delete(`/team/${teamId}/user/${userId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async inviteUserToTeam(teamId: number, email: string) {
    let response = await http.post(
      `/team/${teamId}/invites`,
      { email },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  // ---- Team-Project Associations ----

  async listTeamProjects(teamId: number) {
    let response = await http.get(`/team/${teamId}/projects`, {
      headers: this.headers()
    });
    return response.data;
  }

  async addProjectToTeam(teamId: number, projectId: number) {
    let response = await http.put(
      `/team/${teamId}/project/${projectId}`,
      {},
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async removeProjectFromTeam(teamId: number, projectId: number) {
    let response = await http.delete(`/team/${teamId}/project/${projectId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ---- Users ----

  async listUsers() {
    let response = await http.get('/users', {
      headers: this.headers()
    });
    return response.data;
  }

  async getUser(userId: number) {
    let response = await http.get(`/user/${userId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ---- RQL ----

  async createRqlJob(
    queryString: string,
    params?: {
      force_refresh?: boolean;
    }
  ) {
    let response = await http.post(
      '/rql/jobs',
      {
        query_string: queryString,
        ...params
      },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async getRqlJob(jobId: number) {
    let response = await http.get(`/rql/job/${jobId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async getRqlJobResult(jobId: number) {
    let response = await http.get(`/rql/job/${jobId}/result`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ---- Reports/Metrics ----

  async getTopActiveItems(params?: { hours?: number; environment?: string }) {
    let response = await http.get('/reports/top_active_items', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getOccurrenceCounts(params?: {
    item_id?: number;
    environment?: string;
    bucket_size?: string;
  }) {
    let response = await http.get('/reports/occurrence_counts', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getActivatedCounts(params?: { environment?: string; bucket_size?: string }) {
    let response = await http.get('/reports/activated_counts', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  // ---- Environments ----

  async listEnvironments() {
    let response = await http.get('/environments', {
      headers: this.headers()
    });
    return response.data;
  }

  // ---- Notification Rules ----

  async listNotificationRules(channel: string) {
    let response = await http.get(`/notifications/${channel}/rules`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createNotificationRule(channel: string, data: Record<string, any>) {
    let response = await http.post(`/notifications/${channel}/rules`, data, {
      headers: this.headers()
    });
    return response.data;
  }

  async getNotificationRule(channel: string, ruleId: number) {
    let response = await http.get(`/notifications/${channel}/rules/${ruleId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateNotificationRule(channel: string, ruleId: number, data: Record<string, any>) {
    let response = await http.put(`/notifications/${channel}/rules/${ruleId}`, data, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteNotificationRule(channel: string, ruleId: number) {
    let response = await http.delete(`/notifications/${channel}/rules/${ruleId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ---- Versions ----

  async getVersion(version: string) {
    let response = await http.get(`/versions/${version}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async listVersionItems(
    version: string,
    params?: {
      environment?: string;
      page?: number;
    }
  ) {
    let response = await http.get(`/versions/${version}/items`, {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  // ---- Service Links ----

  async listServiceLinks() {
    let response = await http.get('/service_links', {
      headers: this.headers()
    });
    return response.data;
  }

  async createServiceLink(data: { name: string; template: string }) {
    let response = await http.post('/service_links', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateServiceLink(
    serviceLinkId: number,
    data: {
      name?: string;
      template?: string;
    }
  ) {
    let response = await http.patch(`/service_links/${serviceLinkId}`, data, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteServiceLink(serviceLinkId: number) {
    let response = await http.delete(`/service_links/${serviceLinkId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ---- People (PII) ----

  async requestPersonDeletion(personId: string) {
    let response = await http.delete(`/person/${personId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async getPersonDeletionStatus(personId: string) {
    let response = await http.get(`/person/${personId}/deletion`, {
      headers: this.headers()
    });
    return response.data;
  }
}
