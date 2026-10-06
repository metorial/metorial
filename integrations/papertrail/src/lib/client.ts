import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';
import {
  archiveResponse,
  destinationResponse,
  groupResponse,
  legacyAccountResponse,
  parseResponse,
  savedSearchResponse,
  searchResponse,
  systemResponse,
  usageResponse,
  userResponse
} from './schemas';
import { requireId, requireName, requireToken, requireUpdate } from './validation';

type SystemParams = {
  name?: string;
  hostname?: string;
  ipAddress?: string;
  description?: string;
  autoDelete?: boolean;
};
type SearchParams = { name?: string; query?: string; groupId?: number };
type UserParams = {
  email: string;
  readOnly?: boolean;
  manageMembers?: boolean;
  manageBilling?: boolean;
  purgeLogs?: boolean;
  canAccessAllGroups?: boolean;
  groupIds?: number[];
};
export class Client {
  private axios;
  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://papertrailapp.com/api/v1',
      timeout: 30_000,
      authHeader: { name: 'X-Papertrail-Token', value: requireToken(config.token) },
      errorAdapter: error =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Papertrail',
          reason: 'papertrail_api_error'
        })
    });
  }
  private async get<T>(path: string, schema: z.ZodType<T>, params?: Record<string, unknown>) {
    return parseResponse(schema, (await this.axios.get<unknown>(path, { params })).data);
  }
  async searchEvents(p: {
    query?: string;
    systemId?: number;
    systemName?: string;
    groupId?: number;
    minTime?: number;
    maxTime?: number;
    minId?: string;
    maxId?: string;
    limit?: number;
    tail?: boolean;
  }) {
    if (p.systemId !== undefined) requireId(p.systemId, 'systemId');
    if (p.groupId !== undefined) requireId(p.groupId, 'groupId');
    if (p.systemName !== undefined && !/^[a-zA-Z0-9_]+$/.test(p.systemName))
      throw createApiServiceError(
        'systemName must be a unique sender name containing only letters, numbers, and underscores.'
      );
    if (p.systemId !== undefined && p.systemName !== undefined)
      throw createApiServiceError('Use systemId or systemName, not both.');
    for (const [label, value] of [
      ['minTime', p.minTime],
      ['maxTime', p.maxTime]
    ] as const)
      if (value !== undefined && (!Number.isSafeInteger(value) || value < 0))
        throw createApiServiceError(`${label} must be nonnegative Unix seconds.`);
    for (const [label, value] of [
      ['minId', p.minId],
      ['maxId', p.maxId]
    ] as const)
      if (value !== undefined && !/^\d+$/.test(value))
        throw createApiServiceError(
          `${label} must be a decimal event ID string from a previous response.`
        );
    if (
      (p.minId !== undefined && p.minTime !== undefined) ||
      (p.maxId !== undefined && p.maxTime !== undefined)
    )
      throw createApiServiceError(
        'Use an event ID or timestamp for each search boundary, not both.'
      );
    if (p.minTime !== undefined && p.maxTime !== undefined && p.minTime > p.maxTime)
      throw createApiServiceError('minTime must be at or before maxTime.');
    if (p.minId !== undefined && p.maxId !== undefined && BigInt(p.minId) > BigInt(p.maxId))
      throw createApiServiceError('minId must be at or before maxId.');
    if (
      p.limit !== undefined &&
      (!Number.isSafeInteger(p.limit) || p.limit < 1 || p.limit > 10_000)
    )
      throw createApiServiceError('limit must be a whole number between 1 and 10000.');
    return this.get(
      '/events/search.json',
      searchResponse,
      pickDefined({
        q: p.query,
        system_id: p.systemId ?? p.systemName,
        group_id: p.groupId,
        min_time: p.minTime,
        max_time: p.maxTime,
        min_id: p.minId,
        max_id: p.maxId,
        limit: p.limit,
        tail: p.tail
      })
    );
  }
  listSystems() {
    return this.get('/systems.json', z.array(systemResponse));
  }
  getSystem(id: number) {
    requireId(id, 'systemId');
    return this.get(`/systems/${id}.json`, systemResponse);
  }
  async createSystem(
    p: SystemParams & { name: string; destinationId?: number; destinationPort?: number }
  ) {
    requireName(p.name, 'system name');
    if (p.destinationId !== undefined) requireId(p.destinationId, 'destinationId');
    if (
      p.destinationPort !== undefined &&
      (!Number.isInteger(p.destinationPort) ||
        p.destinationPort < 1 ||
        p.destinationPort > 65535)
    )
      throw createApiServiceError('destinationPort must be between 1 and 65535.');
    if (p.destinationId !== undefined && p.destinationPort !== undefined)
      throw createApiServiceError('Specify destinationId or destinationPort, not both.');
    if (
      p.destinationId === undefined &&
      p.destinationPort === undefined &&
      !p.ipAddress?.trim()
    )
      throw createApiServiceError(
        'Provide a log destination ID/port, or a static public IP for standard syslog.'
      );
    return parseResponse(
      systemResponse,
      (
        await this.axios.post('/systems.json', {
          system: this.systemPayload(p),
          ...pickDefined({
            destination_id: p.destinationId,
            destination_port: p.destinationPort
          })
        })
      ).data
    );
  }
  private systemPayload(p: SystemParams) {
    if (p.name !== undefined) requireName(p.name, 'system name');
    return pickDefined({
      name: p.name,
      hostname: p.hostname,
      ip_address: p.ipAddress,
      description: p.description,
      auto_delete: p.autoDelete
    });
  }
  async updateSystem(id: number, p: SystemParams) {
    requireId(id, 'systemId');
    requireUpdate(p);
    return parseResponse(
      systemResponse,
      (await this.axios.put(`/systems/${id}.json`, { system: this.systemPayload(p) })).data
    );
  }
  async deleteSystem(id: number) {
    requireId(id, 'systemId');
    await this.axios.delete(`/systems/${id}.json`);
  }
  async joinGroup(systemId: number, groupId: number) {
    requireId(systemId, 'systemId');
    requireId(groupId, 'groupId');
    await this.axios.post(`/systems/${systemId}/join.json`, { group_id: groupId });
  }
  async leaveGroup(systemId: number, groupId: number) {
    requireId(systemId, 'systemId');
    requireId(groupId, 'groupId');
    await this.axios.post(`/systems/${systemId}/leave.json`, { group_id: groupId });
  }
  listGroups() {
    return this.get('/groups.json', z.array(groupResponse));
  }
  getGroup(id: number) {
    requireId(id, 'groupId');
    return this.get(`/groups/${id}.json`, groupResponse);
  }
  async createGroup(p: { name: string; systemWildcard?: string; systemIds?: number[] }) {
    requireName(p.name, 'group name');
    p.systemIds?.forEach(id => requireId(id, 'systemIds'));
    return parseResponse(
      groupResponse,
      (
        await this.axios.post('/groups.json', {
          group: pickDefined({
            name: p.name,
            system_wildcard: p.systemWildcard,
            system_ids: p.systemIds
          })
        })
      ).data
    );
  }
  async updateGroup(id: number, p: { name?: string; systemWildcard?: string }) {
    requireId(id, 'groupId');
    requireUpdate(p);
    if (p.name !== undefined) requireName(p.name, 'group name');
    return parseResponse(
      groupResponse,
      (
        await this.axios.put(`/groups/${id}.json`, {
          group: pickDefined({ name: p.name, system_wildcard: p.systemWildcard })
        })
      ).data
    );
  }
  async deleteGroup(id: number) {
    requireId(id, 'groupId');
    await this.axios.delete(`/groups/${id}.json`);
  }
  listSavedSearches() {
    return this.get('/searches.json', z.array(savedSearchResponse));
  }
  getSavedSearch(id: number) {
    requireId(id, 'searchId');
    return this.get(`/searches/${id}.json`, savedSearchResponse);
  }
  private searchPayload(p: SearchParams) {
    if (p.name !== undefined) requireName(p.name, 'saved search name');
    if (p.query !== undefined) requireName(p.query, 'search query');
    if (p.groupId !== undefined) requireId(p.groupId, 'groupId');
    return pickDefined({ name: p.name, query: p.query, group_id: p.groupId });
  }
  async createSavedSearch(p: SearchParams & { name: string; query: string }) {
    return parseResponse(
      savedSearchResponse,
      (await this.axios.post('/searches.json', { search: this.searchPayload(p) })).data
    );
  }
  async updateSavedSearch(id: number, p: SearchParams) {
    requireId(id, 'searchId');
    requireUpdate(p);
    // The settings reference requires name/query for updates. Read existing values for compatible partial updates.
    const current = await this.getSavedSearch(id);
    return parseResponse(
      savedSearchResponse,
      (
        await this.axios.put(`/searches/${id}.json`, {
          search: this.searchPayload({
            name: current.name,
            query: current.query,
            groupId: current.group?.id,
            ...pickDefined(p)
          })
        })
      ).data
    );
  }
  async deleteSavedSearch(id: number) {
    requireId(id, 'searchId');
    await this.axios.delete(`/searches/${id}.json`);
  }
  listUsers() {
    return this.get('/users.json', z.array(userResponse));
  }
  async inviteUser(p: UserParams) {
    if (!z.email().safeParse(p.email).success)
      throw createApiServiceError('Provide a valid email address to invite.');
    p.groupIds?.forEach(id => requireId(id, 'groupIds'));
    if (p.canAccessAllGroups === false && !p.groupIds?.length)
      throw createApiServiceError(
        'Provide at least one group ID when restricting group access.'
      );
    await this.axios.post('/users/invite.json', {
      user: pickDefined({
        email: p.email,
        read_only: p.readOnly ?? false,
        manage_members: p.manageMembers,
        manage_billing: p.manageBilling,
        purge_logs: p.purgeLogs,
        can_access_all_groups: p.canAccessAllGroups,
        group_ids: p.groupIds
      })
    });
  }
  async deleteUser(id: number) {
    requireId(id, 'userId');
    await this.axios.delete(`/users/${id}.json`);
  }
  listArchives() {
    return this.get('/archives.json', z.array(archiveResponse));
  }
  getUsage() {
    return this.get('/accounts.json', usageResponse);
  }
  async getAccountUsage() {
    const result = legacyAccountResponse.safeParse(
      (await this.axios.get<unknown>('/accounts.json')).data
    );
    if (!result.success)
      throw createApiServiceError(
        'Papertrail does not expose the account identity required by this legacy tool. Use get_usage for log transfer usage; view account identity and plan details in Papertrail account settings.',
        { reason: 'papertrail_legacy_account_unsupported' }
      );
    return result.data;
  }
  listDestinations() {
    return this.get('/destinations.json', z.array(destinationResponse));
  }
  getDestination(id: number) {
    requireId(id, 'destinationId');
    return this.get(`/destinations/${id}.json`, destinationResponse);
  }
}
