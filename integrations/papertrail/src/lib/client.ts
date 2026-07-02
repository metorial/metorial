import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://papertrailapp.com/api/v1',
      headers: {
        'X-Papertrail-Token': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Events / Search ──────────────────────────────────────────────

  async searchEvents(params: {
    query?: string;
    systemId?: number;
    groupId?: number;
    minTime?: number;
    maxTime?: number;
    minId?: string;
    maxId?: string;
    limit?: number;
    tail?: boolean;
  }) {
    let queryParams: Record<string, string> = {};
    if (params.query) queryParams.q = params.query;
    if (params.systemId) queryParams.system_id = String(params.systemId);
    if (params.groupId) queryParams.group_id = String(params.groupId);
    if (params.minTime) queryParams.min_time = String(params.minTime);
    if (params.maxTime) queryParams.max_time = String(params.maxTime);
    if (params.minId) queryParams.min_id = params.minId;
    if (params.maxId) queryParams.max_id = params.maxId;
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.tail !== undefined) queryParams.tail = String(params.tail);

    let response = await this.axios.get('/events/search.json', { params: queryParams });
    return response.data;
  }

  // ─── Systems ──────────────────────────────────────────────────────

  async listSystems() {
    let response = await this.axios.get('/systems.json');
    return response.data;
  }

  async getSystem(systemId: number) {
    let response = await this.axios.get(`/systems/${systemId}.json`);
    return response.data;
  }

  async createSystem(params: {
    name: string;
    hostname?: string;
    ipAddress?: string;
    destinationId?: number;
    destinationPort?: number;
  }) {
    let payload: Record<string, any> = {
      system: {
        name: params.name
      }
    };

    if (params.hostname) payload.system.hostname = params.hostname;
    if (params.ipAddress) payload.system.ip_address = params.ipAddress;
    if (params.destinationId) payload.destination_id = params.destinationId;
    if (params.destinationPort) payload.destination_port = params.destinationPort;

    let response = await this.axios.post('/systems.json', payload);
    return response.data;
  }

  async updateSystem(
    systemId: number,
    params: {
      name?: string;
      hostname?: string;
      ipAddress?: string;
    }
  ) {
    let payload: Record<string, any> = { system: {} };

    if (params.name) payload.system.name = params.name;
    if (params.hostname) payload.system.hostname = params.hostname;
    if (params.ipAddress) payload.system.ip_address = params.ipAddress;

    let response = await this.axios.put(`/systems/${systemId}.json`, payload);
    return response.data;
  }

  async deleteSystem(systemId: number) {
    await this.axios.delete(`/systems/${systemId}.json`);
  }

  async joinGroup(systemId: number, groupId: number) {
    let response = await this.axios.post(`/systems/${systemId}/join.json`, {
      group_id: groupId
    });
    return response.data;
  }

  async leaveGroup(systemId: number, groupId: number) {
    let response = await this.axios.post(`/systems/${systemId}/leave.json`, {
      group_id: groupId
    });
    return response.data;
  }

  // ─── Groups ───────────────────────────────────────────────────────

  async listGroups() {
    let response = await this.axios.get('/groups.json');
    return response.data;
  }

  async getGroup(groupId: number) {
    let response = await this.axios.get(`/groups/${groupId}.json`);
    return response.data;
  }

  async createGroup(params: { name: string; systemWildcard?: string; systemIds?: number[] }) {
    let payload: Record<string, any> = {
      group: {
        name: params.name
      }
    };

    if (params.systemWildcard) payload.group.system_wildcard = params.systemWildcard;
    if (params.systemIds && params.systemIds.length > 0) {
      payload.group.system_ids = params.systemIds;
    }

    let response = await this.axios.post('/groups.json', payload);
    return response.data;
  }

  async updateGroup(
    groupId: number,
    params: {
      name?: string;
      systemWildcard?: string;
    }
  ) {
    let payload: Record<string, any> = { group: {} };

    if (params.name) payload.group.name = params.name;
    if (params.systemWildcard !== undefined)
      payload.group.system_wildcard = params.systemWildcard;

    let response = await this.axios.put(`/groups/${groupId}.json`, payload);
    return response.data;
  }

  async deleteGroup(groupId: number) {
    await this.axios.delete(`/groups/${groupId}.json`);
  }

  // ─── Saved Searches ───────────────────────────────────────────────

  async listSavedSearches() {
    let response = await this.axios.get('/searches.json');
    return response.data;
  }

  async getSavedSearch(searchId: number) {
    let response = await this.axios.get(`/searches/${searchId}.json`);
    return response.data;
  }

  async createSavedSearch(params: { name: string; query: string; groupId?: number }) {
    let payload: Record<string, any> = {
      search: {
        name: params.name,
        query: params.query
      }
    };

    if (params.groupId) payload.search.group_id = params.groupId;

    let response = await this.axios.post('/searches.json', payload);
    return response.data;
  }

  async updateSavedSearch(
    searchId: number,
    params: {
      name?: string;
      query?: string;
      groupId?: number;
    }
  ) {
    let payload: Record<string, any> = { search: {} };

    if (params.name) payload.search.name = params.name;
    if (params.query) payload.search.query = params.query;
    if (params.groupId) payload.search.group_id = params.groupId;

    let response = await this.axios.put(`/searches/${searchId}.json`, payload);
    return response.data;
  }

  async deleteSavedSearch(searchId: number) {
    await this.axios.delete(`/searches/${searchId}.json`);
  }

  // ─── Users ────────────────────────────────────────────────────────

  async listUsers() {
    let response = await this.axios.get('/users.json');
    return response.data;
  }

  async inviteUser(params: {
    email: string;
    readOnly?: boolean;
    manageMembers?: boolean;
    manageBilling?: boolean;
    purgeLogs?: boolean;
    canAccessAllGroups?: boolean;
    groupIds?: number[];
  }) {
    let payload: Record<string, any> = {
      user: {
        email: params.email
      }
    };

    if (params.readOnly !== undefined) payload.user.read_only = params.readOnly;
    if (params.manageMembers !== undefined) payload.user.manage_members = params.manageMembers;
    if (params.manageBilling !== undefined) payload.user.manage_billing = params.manageBilling;
    if (params.purgeLogs !== undefined) payload.user.purge_logs = params.purgeLogs;
    if (params.canAccessAllGroups !== undefined)
      payload.user.can_access_all_groups = params.canAccessAllGroups;
    if (params.groupIds && params.groupIds.length > 0) {
      payload.user.group_ids = params.groupIds;
    }

    let response = await this.axios.post('/users/invite.json', payload);
    return response.data;
  }

  async deleteUser(userId: number) {
    await this.axios.delete(`/users/${userId}.json`);
  }

  // ─── Archives ─────────────────────────────────────────────────────

  async listArchives() {
    let response = await this.axios.get('/archives.json');
    return response.data;
  }

  // ─── Account / Usage ──────────────────────────────────────────────

  async getAccountUsage() {
    let response = await this.axios.get('/accounts.json');
    return response.data;
  }

  // ─── Log Destinations ─────────────────────────────────────────────

  async listDestinations() {
    let response = await this.axios.get('/destinations.json');
    return response.data;
  }
}
