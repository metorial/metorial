import { createAxios } from 'slates';

export class FivetranClient {
  private http;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://api.fivetran.com/v1',
      headers: {
        Authorization: `Basic ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Pagination Helper ────────────────────────────────────────────

  async paginate<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T[]> {
    let items: T[] = [];
    let cursor: string | undefined;

    do {
      let response = await this.http.get(path, {
        params: { ...params, cursor, limit: 100 }
      });
      let data = response.data?.data;
      if (data?.items) {
        items.push(...data.items);
      }
      cursor = data?.next_cursor ?? undefined;
    } while (cursor);

    return items;
  }

  // ─── Groups ───────────────────────────────────────────────────────

  async listGroups() {
    return this.paginate<any>('/groups');
  }

  async getGroup(groupId: string) {
    let response = await this.http.get(`/groups/${groupId}`);
    return response.data?.data;
  }

  async createGroup(name: string) {
    let response = await this.http.post('/groups', { name });
    return response.data?.data;
  }

  async updateGroup(groupId: string, name: string) {
    let response = await this.http.patch(`/groups/${groupId}`, { name });
    return response.data?.data;
  }

  async deleteGroup(groupId: string) {
    await this.http.delete(`/groups/${groupId}`);
  }

  async listGroupConnections(groupId: string) {
    return this.paginate<any>(`/groups/${groupId}/connections`);
  }

  async listGroupUsers(groupId: string) {
    return this.paginate<any>(`/groups/${groupId}/users`);
  }

  async addUserToGroup(groupId: string, email: string, role: string) {
    let response = await this.http.post(`/groups/${groupId}/users`, { email, role });
    return response.data?.data;
  }

  async removeUserFromGroup(groupId: string, userId: string) {
    await this.http.delete(`/groups/${groupId}/users/${userId}`);
  }

  // ─── Connections (Connectors) ─────────────────────────────────────

  async listConnections() {
    return this.paginate<any>('/connections');
  }

  async getConnection(connectionId: string) {
    let response = await this.http.get(`/connections/${connectionId}`);
    return response.data?.data;
  }

  async createConnection(body: Record<string, any>) {
    let response = await this.http.post('/connections', body);
    return response.data?.data;
  }

  async updateConnection(connectionId: string, body: Record<string, any>) {
    let response = await this.http.patch(`/connections/${connectionId}`, body);
    return response.data?.data;
  }

  async deleteConnection(connectionId: string) {
    await this.http.delete(`/connections/${connectionId}`);
  }

  async triggerSync(connectionId: string, force?: boolean) {
    let response = await this.http.post(`/connections/${connectionId}/sync`, { force });
    return response.data;
  }

  async triggerResync(connectionId: string, scope?: Record<string, any>) {
    let body = scope ? { scope } : {};
    let response = await this.http.post(`/connections/${connectionId}/resync`, body);
    return response.data;
  }

  async runSetupTests(connectionId: string) {
    let response = await this.http.post(`/connections/${connectionId}/setup-tests`);
    return response.data?.data;
  }

  // ─── Connection Schema ────────────────────────────────────────────

  async getConnectionSchema(connectionId: string) {
    let response = await this.http.get(`/connections/${connectionId}/schemas`);
    return response.data?.data;
  }

  async updateConnectionSchema(connectionId: string, body: Record<string, any>) {
    let response = await this.http.patch(`/connections/${connectionId}/schemas`, body);
    return response.data?.data;
  }

  async reloadConnectionSchema(connectionId: string, excludeMode?: string) {
    let body = excludeMode ? { exclude_mode: excludeMode } : {};
    let response = await this.http.post(`/connections/${connectionId}/schemas/reload`, body);
    return response.data?.data;
  }

  // ─── Destinations ─────────────────────────────────────────────────

  async listDestinations() {
    return this.paginate<any>('/destinations');
  }

  async getDestination(destinationId: string) {
    let response = await this.http.get(`/destinations/${destinationId}`);
    return response.data?.data;
  }

  async createDestination(body: Record<string, any>) {
    let response = await this.http.post('/destinations', body);
    return response.data?.data;
  }

  async updateDestination(destinationId: string, body: Record<string, any>) {
    let response = await this.http.patch(`/destinations/${destinationId}`, body);
    return response.data?.data;
  }

  async deleteDestination(destinationId: string) {
    await this.http.delete(`/destinations/${destinationId}`);
  }

  async runDestinationSetupTests(destinationId: string) {
    let response = await this.http.post(`/destinations/${destinationId}/setup-tests`);
    return response.data?.data;
  }

  // ─── Users ────────────────────────────────────────────────────────

  async listUsers() {
    return this.paginate<any>('/users');
  }

  async getUser(userId: string) {
    let response = await this.http.get(`/users/${userId}`);
    return response.data?.data;
  }

  async getCurrentUser() {
    let response = await this.http.get('/users/me');
    return response.data?.data;
  }

  async inviteUser(body: Record<string, any>) {
    let response = await this.http.post('/users', body);
    return response.data?.data;
  }

  async updateUser(userId: string, body: Record<string, any>) {
    let response = await this.http.patch(`/users/${userId}`, body);
    return response.data?.data;
  }

  async deleteUser(userId: string) {
    await this.http.delete(`/users/${userId}`);
  }

  // ─── Teams ────────────────────────────────────────────────────────

  async listTeams() {
    return this.paginate<any>('/teams');
  }

  async getTeam(teamId: string) {
    let response = await this.http.get(`/teams/${teamId}`);
    return response.data?.data;
  }

  async createTeam(body: Record<string, any>) {
    let response = await this.http.post('/teams', body);
    return response.data?.data;
  }

  async updateTeam(teamId: string, body: Record<string, any>) {
    let response = await this.http.patch(`/teams/${teamId}`, body);
    return response.data?.data;
  }

  async deleteTeam(teamId: string) {
    await this.http.delete(`/teams/${teamId}`);
  }

  async listTeamUsers(teamId: string) {
    return this.paginate<any>(`/teams/${teamId}/users`);
  }

  async addUserToTeam(teamId: string, userId: string) {
    let response = await this.http.post(`/teams/${teamId}/users`, { user_id: userId });
    return response.data?.data;
  }

  async removeUserFromTeam(teamId: string, userId: string) {
    await this.http.delete(`/teams/${teamId}/users/${userId}`);
  }

  // ─── Transformations ──────────────────────────────────────────────

  async listTransformations() {
    return this.paginate<any>('/transformations');
  }

  async getTransformation(transformationId: string) {
    let response = await this.http.get(`/transformations/${transformationId}`);
    return response.data?.data;
  }

  async createTransformation(body: Record<string, any>) {
    let response = await this.http.post('/transformations', body);
    return response.data?.data;
  }

  async updateTransformation(transformationId: string, body: Record<string, any>) {
    let response = await this.http.patch(`/transformations/${transformationId}`, body);
    return response.data?.data;
  }

  async deleteTransformation(transformationId: string) {
    await this.http.delete(`/transformations/${transformationId}`);
  }

  async runTransformation(transformationId: string) {
    let response = await this.http.post(`/transformations/${transformationId}/run`);
    return response.data;
  }

  // ─── Connector Metadata ───────────────────────────────────────────

  async listConnectorTypes() {
    return this.paginate<any>('/metadata/connector-types');
  }

  async getConnectorType(serviceId: string) {
    let response = await this.http.get(`/metadata/connector-types/${serviceId}`);
    return response.data?.data;
  }

  // ─── Webhooks ─────────────────────────────────────────────────────

  async listWebhooks() {
    return this.paginate<any>('/webhooks');
  }

  async createAccountWebhook(body: Record<string, any>) {
    let response = await this.http.post('/webhooks/account', body);
    return response.data?.data;
  }

  async createGroupWebhook(groupId: string, body: Record<string, any>) {
    let response = await this.http.post(`/webhooks/group/${groupId}`, body);
    return response.data?.data;
  }

  async getWebhook(webhookId: string) {
    let response = await this.http.get(`/webhooks/${webhookId}`);
    return response.data?.data;
  }

  async updateWebhook(webhookId: string, body: Record<string, any>) {
    let response = await this.http.patch(`/webhooks/${webhookId}`, body);
    return response.data?.data;
  }

  async deleteWebhook(webhookId: string) {
    await this.http.delete(`/webhooks/${webhookId}`);
  }

  async testWebhook(webhookId: string, event: string) {
    let response = await this.http.post(`/webhooks/${webhookId}/test`, { event });
    return response.data?.data;
  }

  // ─── Roles ────────────────────────────────────────────────────────

  async listRoles() {
    return this.paginate<any>('/roles');
  }
}
