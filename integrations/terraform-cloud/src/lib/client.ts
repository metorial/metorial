import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus
} from 'slates';
import {
  normalizeBaseUrl,
  paginationQuery,
  parseResource,
  pathSegment,
  type Resource,
  record,
  relationshipId,
  requireName,
  requireUpdate,
  text,
  validateDocument
} from './contracts';

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private organizationName: string | undefined;

  constructor(config: { token: string; baseUrl?: string; organizationName?: string }) {
    if (!config.token.trim() || /[\r\n]/.test(config.token))
      throw createApiServiceError('Provide a valid HCP Terraform API token.');
    this.organizationName = config.organizationName;
    this.axios = createAuthenticatedAxios({
      baseURL: normalizeBaseUrl(config.baseUrl),
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'HCP Terraform',
          reason: 'terraform_cloud_api_error',
          formatMessage: ({ status }) =>
            `HCP Terraform request failed${status ? ` (HTTP ${status})` : ''}. Check the API region, token type/permissions and resource state. HTTP 404 can also mean insufficient access.`,
          parent: createApiServiceError('Terraform upstream request failed.', {
            upstreamStatus: getApiErrorStatus(error)
          })
        }),
      headers: {
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json'
      }
    });
    this.axios.interceptors.response.use(response => {
      const path = (response.config.url ?? '').split('?')[0] ?? '';
      const method = response.config.method?.toUpperCase();
      if (
        (response.status === 204 && method === 'DELETE') ||
        (response.status === 202 &&
          method === 'POST' &&
          /^\/runs\/[^/]+\/actions\/(apply|discard|cancel|force-cancel|force-execute)$/.test(
            path
          )) ||
        /\/relationships\/(users|organization-memberships)$/.test(path)
      ) {
        if (response.data && record(response.data).errors !== undefined)
          throw createApiServiceError(
            'HCP Terraform returned an error in an action response.'
          );
        return response;
      }
      let type = path.split('/').filter(Boolean)[0] ?? '';
      if (type === 'organizations' && path !== '/organizations')
        type = path.split('/')[3] ?? 'organizations';
      if (path === '/account/details') type = 'users';
      if (path.startsWith('/workspaces/')) {
        const collection = path.split('/')[3];
        type = collection && collection !== 'actions' ? collection : 'workspaces';
        if (type === 'current-state-version') type = 'state-versions';
      }
      if (/^\/state-versions\/[^/]+\/outputs$/.test(path)) type = 'state-version-outputs';
      const many =
        method === 'GET' &&
        (path === '/organizations' ||
          /^\/organizations\/[^/]+\/[^/]+$/.test(path) ||
          /^\/workspaces\/[^/]+\/(runs|vars|notification-configurations|run-triggers)$/.test(
            path
          ) ||
          path === '/state-versions' ||
          path.endsWith('/outputs') ||
          path === '/team-workspaces');
      const expectedId =
        !many &&
        /^\/(organizations|workspaces|runs|projects|teams|vars|varsets|policy-sets|notification-configurations|run-triggers|state-versions|team-workspaces)\/[^/]+$/.test(
          path
        )
          ? decodeURIComponent(path.split('/')[2] ?? '')
          : !many && /^\/workspaces\/[^/]+\/actions\/(lock|unlock|force-unlock)$/.test(path)
            ? decodeURIComponent(path.split('/')[2] ?? '')
            : !many && /^\/workspaces\/[^/]+\/vars\/[^/]+$/.test(path)
              ? decodeURIComponent(path.split('/')[4] ?? '')
              : undefined;
      response.data = validateDocument(response.data, type, many, expectedId);
      const query = new URLSearchParams((response.config.url ?? '').split('?')[1]);
      if (many && query.has('page[number]')) {
        const body = record(response.data);
        const meta = record(body.meta);
        const pagination = record(meta.pagination);
        for (const key of ['current-page', 'total-pages', 'total-count'])
          if (
            typeof pagination[key] !== 'number' ||
            !Number.isSafeInteger(pagination[key]) ||
            Number(pagination[key]) < (key === 'current-page' ? 1 : 0)
          )
            throw createApiServiceError('HCP Terraform returned invalid pagination metadata.');
        if (pagination['current-page'] !== Number(query.get('page[number]')))
          throw createApiServiceError(
            'HCP Terraform returned a different page. Retry the requested page before continuing.'
          );
        pagination['page-size'] ??= Number(query.get('page[size]') ?? 20);
        response.data = { ...body, meta: { ...meta, pagination } };
      }
      return response;
    });
  }
  private organization() {
    if (!this.organizationName)
      throw createApiServiceError(
        'Provide organizationName or configure a default organization. Call list_organizations to discover accessible names.'
      );
    return pathSegment(this.organizationName);
  }

  // ── Workspaces ──

  async listWorkspaces(params?: {
    pageNumber?: number;
    pageSize?: number;
    search?: string;
    projectId?: string;
  }) {
    let query = paginationQuery(params);
    if (params?.search) query.set('search[name]', params.search);
    if (params?.projectId) query.set('filter[project][id]', params.projectId);

    let response = await this.axios.get(
      `/organizations/${this.organization()}/workspaces?${query.toString()}`
    );
    return response.data;
  }

  async getWorkspace(workspaceId: string) {
    let response = await this.axios.get(`/workspaces/${pathSegment(workspaceId)}`);
    return response.data;
  }

  async getWorkspaceByName(workspaceName: string) {
    let response = await this.axios.get(
      `/organizations/${this.organization()}/workspaces/${pathSegment(workspaceName)}`
    );
    if (text((response.data.data as Resource).attributes.name) !== workspaceName)
      throw createApiServiceError('HCP Terraform returned a different workspace name.');
    return response.data;
  }

  async createWorkspace(payload: {
    name: string;
    description?: string;
    autoApply?: boolean;
    executionMode?: string;
    agentPoolId?: string;
    terraformVersion?: string;
    workingDirectory?: string;
    projectId?: string;
    vcsRepo?: {
      identifier: string;
      oauthTokenId: string;
      branch?: string;
    };
  }) {
    requireName(payload.name);
    let attributes: Record<string, unknown> = {
      name: payload.name
    };
    if (payload.description !== undefined) attributes.description = payload.description;
    if (payload.autoApply !== undefined) attributes['auto-apply'] = payload.autoApply;
    if (payload.executionMode !== undefined)
      attributes['execution-mode'] = payload.executionMode;
    if (payload.agentPoolId && payload.executionMode && payload.executionMode !== 'agent')
      throw createApiServiceError('agentPoolId requires agent execution mode.');
    if (payload.agentPoolId !== undefined) attributes['agent-pool-id'] = payload.agentPoolId;
    if (payload.terraformVersion !== undefined)
      attributes['terraform-version'] = payload.terraformVersion;
    if (payload.workingDirectory !== undefined)
      attributes['working-directory'] = payload.workingDirectory;
    if (payload.executionMode === 'agent' && !payload.agentPoolId)
      throw createApiServiceError(
        'Provide agentPoolId when creating an agent-mode workspace.'
      );
    if (payload.vcsRepo) {
      attributes['vcs-repo'] = {
        identifier: payload.vcsRepo.identifier,
        'oauth-token-id': payload.vcsRepo.oauthTokenId,
        ...(payload.vcsRepo.branch ? { branch: payload.vcsRepo.branch } : {})
      };
    }

    let relationships: Record<string, unknown> = {};
    if (payload.projectId) {
      relationships.project = {
        data: { id: payload.projectId, type: 'projects' }
      };
    }

    let response = await this.axios.post(`/organizations/${this.organization()}/workspaces`, {
      data: {
        type: 'workspaces',
        attributes,
        ...(Object.keys(relationships).length > 0 ? { relationships } : {})
      }
    });
    return response.data;
  }

  async updateWorkspace(
    workspaceId: string,
    payload: {
      name?: string;
      description?: string;
      autoApply?: boolean;
      executionMode?: string;
      agentPoolId?: string;
      terraformVersion?: string;
      workingDirectory?: string;
    }
  ) {
    requireUpdate(payload);
    let attributes: Record<string, unknown> = {};
    if (payload.name !== undefined) attributes.name = payload.name;
    if (payload.description !== undefined) attributes.description = payload.description;
    if (payload.autoApply !== undefined) attributes['auto-apply'] = payload.autoApply;
    if (payload.executionMode !== undefined)
      attributes['execution-mode'] = payload.executionMode;
    if (payload.agentPoolId && payload.executionMode && payload.executionMode !== 'agent')
      throw createApiServiceError('agentPoolId requires agent execution mode.');
    if (payload.agentPoolId !== undefined) attributes['agent-pool-id'] = payload.agentPoolId;
    if (payload.terraformVersion !== undefined)
      attributes['terraform-version'] = payload.terraformVersion;
    if (payload.workingDirectory !== undefined)
      attributes['working-directory'] = payload.workingDirectory;

    let response = await this.axios.patch(`/workspaces/${pathSegment(workspaceId)}`, {
      data: {
        type: 'workspaces',
        attributes
      }
    });
    return response.data;
  }

  async deleteWorkspace(workspaceId: string) {
    await this.axios.delete(`/workspaces/${pathSegment(workspaceId)}`);
  }

  async lockWorkspace(workspaceId: string, reason?: string) {
    let response = await this.axios.post(
      `/workspaces/${pathSegment(workspaceId)}/actions/lock`,
      {
        reason: reason || ''
      }
    );
    return response.data;
  }

  async unlockWorkspace(workspaceId: string) {
    let response = await this.axios.post(
      `/workspaces/${pathSegment(workspaceId)}/actions/unlock`
    );
    return response.data;
  }

  async forceUnlockWorkspace(workspaceId: string) {
    let response = await this.axios.post(
      `/workspaces/${pathSegment(workspaceId)}/actions/force-unlock`
    );
    return response.data;
  }

  // ── Runs ──

  async listRuns(
    workspaceId: string,
    params?: {
      pageNumber?: number;
      pageSize?: number;
      status?: string;
      operation?: string;
    }
  ) {
    let query = paginationQuery(params);
    if (params?.status) query.set('filter[status]', params.status);
    if (params?.operation) query.set('filter[operation]', params.operation);

    let response = await this.axios.get(
      `/workspaces/${pathSegment(workspaceId)}/runs?${query.toString()}`
    );
    return response.data;
  }

  async getRun(runId: string) {
    let response = await this.axios.get(`/runs/${pathSegment(runId)}`);
    return response.data;
  }

  async createRun(payload: {
    workspaceId: string;
    message?: string;
    isDestroy?: boolean;
    autoApply?: boolean;
    planOnly?: boolean;
    allowEmptyApply?: boolean;
    refreshOnly?: boolean;
    configurationVersionId?: string;
    targetAddrs?: string[];
    replaceAddrs?: string[];
  }) {
    if (payload.planOnly && payload.autoApply)
      throw createApiServiceError('A plan-only run cannot auto-apply.');
    if (
      payload.refreshOnly &&
      (payload.isDestroy || payload.targetAddrs?.length || payload.replaceAddrs?.length)
    )
      throw createApiServiceError(
        'Refresh-only runs cannot destroy, target or replace resources.'
      );
    let attributes: Record<string, unknown> = {};
    if (payload.message !== undefined) attributes.message = payload.message;
    if (payload.isDestroy !== undefined) attributes['is-destroy'] = payload.isDestroy;
    if (payload.autoApply !== undefined) attributes['auto-apply'] = payload.autoApply;
    if (payload.planOnly !== undefined) attributes['plan-only'] = payload.planOnly;
    if (payload.allowEmptyApply !== undefined)
      attributes['allow-empty-apply'] = payload.allowEmptyApply;
    if (payload.refreshOnly !== undefined) attributes['refresh-only'] = payload.refreshOnly;
    if (payload.targetAddrs) attributes['target-addrs'] = payload.targetAddrs;
    if (payload.replaceAddrs) attributes['replace-addrs'] = payload.replaceAddrs;

    let relationships: Record<string, unknown> = {
      workspace: {
        data: { id: payload.workspaceId, type: 'workspaces' }
      }
    };

    if (payload.configurationVersionId) {
      relationships['configuration-version'] = {
        data: { id: payload.configurationVersionId, type: 'configuration-versions' }
      };
    }

    let response = await this.axios.post('/runs', {
      data: {
        type: 'runs',
        attributes,
        relationships
      }
    });
    const run = parseResource(response.data.data, 'runs');
    if (
      relationshipId(run, 'workspace') !== payload.workspaceId ||
      (payload.configurationVersionId &&
        relationshipId(run, 'configuration-version') !== payload.configurationVersionId)
    )
      throw createApiServiceError(
        'HCP Terraform returned a run with different workspace/configuration relationships. Inspect the requested workspace before retrying.'
      );
    return response.data;
  }

  async applyRun(runId: string, comment?: string) {
    await this.axios.post(`/runs/${pathSegment(runId)}/actions/apply`, {
      comment: comment || ''
    });
  }

  async discardRun(runId: string, comment?: string) {
    await this.axios.post(`/runs/${pathSegment(runId)}/actions/discard`, {
      comment: comment || ''
    });
  }

  async cancelRun(runId: string, comment?: string) {
    await this.axios.post(`/runs/${pathSegment(runId)}/actions/cancel`, {
      comment: comment || ''
    });
  }

  async forceExecuteRun(runId: string) {
    await this.axios.post(`/runs/${pathSegment(runId)}/actions/force-execute`);
  }

  async forceCancelRun(runId: string, comment?: string) {
    await this.axios.post(`/runs/${pathSegment(runId)}/actions/force-cancel`, {
      comment: comment || ''
    });
  }

  // ── Variables ──

  async listWorkspaceVariables(workspaceId: string) {
    let response = await this.axios.get(`/workspaces/${pathSegment(workspaceId)}/vars`);
    return response.data;
  }

  async createVariable(
    workspaceId: string,
    payload: {
      key: string;
      value: string;
      description?: string;
      category: 'terraform' | 'env';
      hcl?: boolean;
      sensitive?: boolean;
    }
  ) {
    requireName(payload.key);
    let attributes: Record<string, unknown> = {
      key: payload.key,
      value: payload.value,
      description: payload.description ?? '',
      category: payload.category
    };
    if (payload.description !== undefined) attributes.description = payload.description;
    if (payload.hcl !== undefined) attributes.hcl = payload.hcl;
    if (payload.sensitive !== undefined) attributes.sensitive = payload.sensitive;

    let response = await this.axios.post(`/workspaces/${pathSegment(workspaceId)}/vars`, {
      data: {
        type: 'vars',
        attributes
      }
    });
    return response.data;
  }

  async updateVariable(
    workspaceId: string,
    variableId: string,
    payload: {
      key?: string;
      value?: string;
      description?: string;
      hcl?: boolean;
      sensitive?: boolean;
    }
  ) {
    requireUpdate(payload);
    let attributes: Record<string, unknown> = {};
    if (payload.key !== undefined) attributes.key = payload.key;
    if (payload.value !== undefined) attributes.value = payload.value;
    if (payload.description !== undefined) attributes.description = payload.description;
    if (payload.hcl !== undefined) attributes.hcl = payload.hcl;
    if (payload.sensitive !== undefined) attributes.sensitive = payload.sensitive;

    let response = await this.axios.patch(
      `/workspaces/${pathSegment(workspaceId)}/vars/${pathSegment(variableId)}`,
      {
        data: {
          type: 'vars',
          id: variableId,
          attributes
        }
      }
    );
    return response.data;
  }

  async deleteVariable(workspaceId: string, variableId: string) {
    await this.axios.delete(
      `/workspaces/${pathSegment(workspaceId)}/vars/${pathSegment(variableId)}`
    );
  }

  // ── Variable Sets ──

  async listVariableSets(params?: { pageNumber?: number; pageSize?: number }) {
    let query = paginationQuery(params);

    let response = await this.axios.get(
      `/organizations/${this.organization()}/varsets?${query.toString()}`
    );
    return response.data;
  }

  async getVariableSet(variableSetId: string) {
    let response = await this.axios.get(`/varsets/${pathSegment(variableSetId)}`);
    return response.data;
  }

  async createVariableSet(payload: {
    name: string;
    description?: string;
    global?: boolean;
    workspaceIds?: string[];
    projectIds?: string[];
  }) {
    requireName(payload.name);
    let attributes: Record<string, unknown> = {
      name: payload.name
    };
    if (payload.description !== undefined) attributes.description = payload.description;
    if (payload.global !== undefined) attributes.global = payload.global;

    let relationships: Record<string, unknown> = {};
    if (payload.workspaceIds && payload.workspaceIds.length > 0) {
      relationships.workspaces = {
        data: payload.workspaceIds.map(id => ({ id, type: 'workspaces' }))
      };
    }
    if (payload.projectIds && payload.projectIds.length > 0) {
      relationships.projects = {
        data: payload.projectIds.map(id => ({ id, type: 'projects' }))
      };
    }

    let response = await this.axios.post(`/organizations/${this.organization()}/varsets`, {
      data: {
        type: 'varsets',
        attributes,
        ...(Object.keys(relationships).length > 0 ? { relationships } : {})
      }
    });
    return response.data;
  }

  async deleteVariableSet(variableSetId: string) {
    await this.axios.delete(`/varsets/${pathSegment(variableSetId)}`);
  }

  // ── Projects ──

  async listProjects(params?: { pageNumber?: number; pageSize?: number; name?: string }) {
    let query = paginationQuery(params);
    if (params?.name) query.set('filter[names]', params.name);

    let response = await this.axios.get(
      `/organizations/${this.organization()}/projects?${query.toString()}`
    );
    return response.data;
  }

  async getProject(projectId: string) {
    let response = await this.axios.get(`/projects/${pathSegment(projectId)}`);
    return response.data;
  }

  async createProject(payload: { name: string; description?: string }) {
    requireName(payload.name);
    let attributes: Record<string, unknown> = { name: payload.name };
    if (payload.description !== undefined) attributes.description = payload.description;

    let response = await this.axios.post(`/organizations/${this.organization()}/projects`, {
      data: {
        type: 'projects',
        attributes
      }
    });
    return response.data;
  }

  async updateProject(projectId: string, payload: { name?: string; description?: string }) {
    requireUpdate(payload);
    let attributes: Record<string, unknown> = {};
    if (payload.name !== undefined) attributes.name = payload.name;
    if (payload.description !== undefined) attributes.description = payload.description;

    let response = await this.axios.patch(`/projects/${pathSegment(projectId)}`, {
      data: {
        type: 'projects',
        attributes
      }
    });
    return response.data;
  }

  async deleteProject(projectId: string) {
    await this.axios.delete(`/projects/${pathSegment(projectId)}`);
  }

  // ── Teams ──

  async listTeams(params?: { pageNumber?: number; pageSize?: number }) {
    let query = paginationQuery(params);

    let response = await this.axios.get(
      `/organizations/${this.organization()}/teams?${query.toString()}`
    );
    return response.data;
  }

  async getTeam(teamId: string) {
    let response = await this.axios.get(`/teams/${pathSegment(teamId)}`);
    return response.data;
  }

  async createTeam(payload: {
    name: string;
    organizationAccess?: {
      managePolicies?: boolean;
      manageWorkspaces?: boolean;
      manageVcsSettings?: boolean;
      manageProviders?: boolean;
      manageModules?: boolean;
      manageRuns?: boolean;
      manageProjects?: boolean;
      readWorkspaces?: boolean;
      readProjects?: boolean;
    };
    visibility?: 'secret' | 'organization';
  }) {
    requireName(payload.name);
    let attributes: Record<string, unknown> = { name: payload.name };
    if (payload.visibility !== undefined) attributes.visibility = payload.visibility;
    if (payload.organizationAccess) {
      let orgAccess: Record<string, unknown> = {};
      let oa = payload.organizationAccess;
      if (oa.managePolicies !== undefined) orgAccess['manage-policies'] = oa.managePolicies;
      if (oa.manageWorkspaces !== undefined)
        orgAccess['manage-workspaces'] = oa.manageWorkspaces;
      if (oa.manageVcsSettings !== undefined)
        orgAccess['manage-vcs-settings'] = oa.manageVcsSettings;
      if (oa.manageProviders !== undefined) orgAccess['manage-providers'] = oa.manageProviders;
      if (oa.manageModules !== undefined) orgAccess['manage-modules'] = oa.manageModules;
      if (oa.manageRuns)
        throw createApiServiceError(
          'The current API has no organization-level manageRuns permission. Grant run access on a specific workspace instead.'
        );
      if (oa.manageProjects !== undefined) orgAccess['manage-projects'] = oa.manageProjects;
      if (oa.readWorkspaces !== undefined) orgAccess['read-workspaces'] = oa.readWorkspaces;
      if (oa.readProjects !== undefined) orgAccess['read-projects'] = oa.readProjects;
      attributes['organization-access'] = orgAccess;
    }

    let response = await this.axios.post(`/organizations/${this.organization()}/teams`, {
      data: {
        type: 'teams',
        attributes
      }
    });
    return response.data;
  }

  async deleteTeam(teamId: string) {
    await this.axios.delete(`/teams/${pathSegment(teamId)}`);
  }

  // ── Team Membership ──

  async addTeamMembers(teamId: string, usernames: string[]) {
    this.requireTeamRegion();
    let found = false;
    for (let page = 1; page <= 100; page++) {
      const body = await this.listTeams({ pageNumber: page, pageSize: 100 });
      if ((body.data as Resource[]).some(team => team.id === teamId)) {
        found = true;
        break;
      }
      if (Number(record(record(body.meta).pagination)['total-pages']) <= page) break;
    }
    if (!found)
      throw createApiServiceError(
        'The team was not found in the selected organization. Select its owning organization before adding members.'
      );
    await this.axios.post(`/teams/${pathSegment(teamId)}/relationships/users`, {
      data: (await this.resolveUsers(usernames, 'username')).map(id => ({ type: 'users', id }))
    });
  }

  async removeTeamMember(teamId: string, usernames: string[]) {
    this.requireTeamRegion();
    if (!usernames.length || usernames.some(value => !value.trim()))
      throw createApiServiceError('Provide at least one non-empty username.');
    await this.axios.delete(`/teams/${pathSegment(teamId)}/relationships/users`, {
      data: { data: usernames.map(id => ({ type: 'users', id })) }
    });
  }

  // ── Team Workspace Access ──

  async addTeamWorkspaceAccess(payload: {
    teamId: string;
    workspaceId: string;
    access: 'read' | 'plan' | 'write' | 'admin' | 'custom';
    runsPermission?: string;
    variablesPermission?: string;
    stateVersionsPermission?: string;
    planOutputsPermission?: string;
    sentinelMocksPermission?: string;
    workspaceLockingPermission?: boolean;
    runTasksPermission?: boolean;
  }) {
    const custom = [
      payload.runsPermission,
      payload.variablesPermission,
      payload.stateVersionsPermission,
      payload.planOutputsPermission,
      payload.sentinelMocksPermission,
      payload.workspaceLockingPermission,
      payload.runTasksPermission
    ];
    if (payload.access !== 'custom' && custom.some(value => value !== undefined))
      throw createApiServiceError('Granular permission fields require custom access.');
    let attributes: Record<string, unknown> = { access: payload.access };
    if (payload.access === 'custom') {
      if (payload.runsPermission !== undefined) attributes.runs = payload.runsPermission;
      if (payload.variablesPermission !== undefined)
        attributes.variables = payload.variablesPermission;
      if (payload.stateVersionsPermission !== undefined)
        attributes['state-versions'] = payload.stateVersionsPermission;
      if (payload.planOutputsPermission !== undefined)
        attributes['plan-outputs'] = payload.planOutputsPermission;
      if (payload.sentinelMocksPermission !== undefined)
        attributes['sentinel-mocks'] = payload.sentinelMocksPermission;
      if (payload.workspaceLockingPermission !== undefined)
        attributes['workspace-locking'] = payload.workspaceLockingPermission;
      if (payload.runTasksPermission !== undefined)
        attributes['run-tasks'] = payload.runTasksPermission;
    }

    let response = await this.axios.post('/team-workspaces', {
      data: {
        type: 'team-workspaces',
        attributes,
        relationships: {
          workspace: { data: { id: payload.workspaceId, type: 'workspaces' } },
          team: { data: { id: payload.teamId, type: 'teams' } }
        }
      }
    });
    const grant = parseResource(response.data.data, 'team-workspaces');
    if (
      relationshipId(grant, 'workspace') !== payload.workspaceId ||
      relationshipId(grant, 'team') !== payload.teamId ||
      grant.attributes.access !== payload.access
    )
      throw createApiServiceError(
        'HCP Terraform returned a different workspace access grant. Inspect the requested team and workspace before retrying.'
      );
    return response.data;
  }

  // ── State Versions ──

  async listStateVersions(
    workspaceId: string,
    params?: {
      pageNumber?: number;
      pageSize?: number;
    }
  ) {
    let query = paginationQuery(params);

    const workspace = (await this.getWorkspace(workspaceId)).data as Resource;
    const organization = relationshipId(workspace, 'organization');
    if (!organization)
      throw createApiServiceError('The workspace response lacks its owning organization.');
    query.set('filter[organization][name]', organization);
    query.set('filter[workspace][name]', text(workspace.attributes.name));
    let response = await this.axios.get(`/state-versions?${query.toString()}`);
    return response.data;
  }

  async getCurrentStateVersion(workspaceId: string) {
    let response = await this.axios.get(
      `/workspaces/${pathSegment(workspaceId)}/current-state-version`
    );
    return response.data;
  }

  async getStateVersion(stateVersionId: string) {
    let response = await this.axios.get(`/state-versions/${pathSegment(stateVersionId)}`);
    return response.data;
  }

  async getStateVersionOutputs(stateVersionId: string) {
    const data: Resource[] = [];
    const ids = new Set<string>();
    for (let page = 1; page <= 100; page++) {
      const query = paginationQuery({ pageNumber: page, pageSize: 100 });
      const body = (
        await this.axios.get(
          `/state-versions/${pathSegment(stateVersionId)}/outputs?${query.toString()}`
        )
      ).data;
      for (const value of body.data as Resource[]) {
        if (ids.has(value.id))
          throw createApiServiceError(
            'State-output pagination returned repeated IDs. Retry the read.'
          );
        ids.add(value.id);
        data.push(value);
      }
      if (Number(record(record(body.meta).pagination)['total-pages']) <= page) return { data };
    }
    throw createApiServiceError('State outputs exceeded the bounded pagination window.');
  }

  // ── Policy Sets ──

  async listPolicySets(params?: { pageNumber?: number; pageSize?: number; search?: string }) {
    let query = paginationQuery(params);
    if (params?.search) query.set('search[name]', params.search);

    let response = await this.axios.get(
      `/organizations/${this.organization()}/policy-sets?${query.toString()}`
    );
    return response.data;
  }

  async getPolicySet(policySetId: string) {
    let response = await this.axios.get(`/policy-sets/${pathSegment(policySetId)}`);
    return response.data;
  }

  async createPolicySet(payload: {
    name: string;
    description?: string;
    global?: boolean;
    kind?: 'sentinel' | 'opa';
    overridable?: boolean;
    workspaceIds?: string[];
    projectIds?: string[];
    vcsRepo?: {
      identifier: string;
      oauthTokenId: string;
      branch?: string;
      ingressSubmodules?: boolean;
    };
  }) {
    requireName(payload.name);
    let attributes: Record<string, unknown> = { name: payload.name };
    if (payload.description !== undefined) attributes.description = payload.description;
    if (payload.global !== undefined) attributes.global = payload.global;
    if (payload.kind !== undefined) attributes.kind = payload.kind;
    if (payload.overridable !== undefined) attributes.overridable = payload.overridable;
    if (payload.vcsRepo) {
      attributes['vcs-repo'] = {
        identifier: payload.vcsRepo.identifier,
        'oauth-token-id': payload.vcsRepo.oauthTokenId,
        ...(payload.vcsRepo.branch ? { branch: payload.vcsRepo.branch } : {}),
        ...(payload.vcsRepo.ingressSubmodules !== undefined
          ? { 'ingress-submodules': payload.vcsRepo.ingressSubmodules }
          : {})
      };
    }

    let relationships: Record<string, unknown> = {};
    if (payload.workspaceIds && payload.workspaceIds.length > 0) {
      relationships.workspaces = {
        data: payload.workspaceIds.map(id => ({ id, type: 'workspaces' }))
      };
    }
    if (payload.projectIds && payload.projectIds.length > 0) {
      relationships.projects = {
        data: payload.projectIds.map(id => ({ id, type: 'projects' }))
      };
    }

    let response = await this.axios.post(`/organizations/${this.organization()}/policy-sets`, {
      data: {
        type: 'policy-sets',
        attributes,
        ...(Object.keys(relationships).length > 0 ? { relationships } : {})
      }
    });
    return response.data;
  }

  async deletePolicySet(policySetId: string) {
    await this.axios.delete(`/policy-sets/${pathSegment(policySetId)}`);
  }

  // ── Notification Configurations ──

  async listNotificationConfigurations(workspaceId: string) {
    let response = await this.axios.get(
      `/workspaces/${pathSegment(workspaceId)}/notification-configurations`
    );
    return response.data;
  }

  async getNotificationConfiguration(notificationConfigId: string) {
    let response = await this.axios.get(
      `/notification-configurations/${pathSegment(notificationConfigId)}`
    );
    return response.data;
  }

  async createNotificationConfiguration(
    workspaceId: string,
    payload: {
      name: string;
      destinationType: 'generic' | 'slack' | 'microsoft-teams' | 'email';
      url?: string;
      token?: string;
      enabled?: boolean;
      triggers: string[];
      emailAddresses?: string[];
      emailUserIds?: string[];
    }
  ) {
    requireName(payload.name);
    let attributes: Record<string, unknown> = {
      name: payload.name,
      'destination-type': payload.destinationType,
      triggers: payload.triggers
    };
    if (payload.url !== undefined) attributes.url = payload.url;
    if (payload.token !== undefined) attributes.token = payload.token;
    if (payload.enabled !== undefined) attributes.enabled = payload.enabled;
    if (
      payload.destinationType !== 'email' &&
      (payload.emailAddresses?.length || payload.emailUserIds?.length)
    )
      throw createApiServiceError('Email recipients require email destinationType.');
    if (payload.destinationType === 'email' && payload.url !== undefined)
      throw createApiServiceError(
        'Email notifications use organization users, not a webhook URL.'
      );
    if (payload.destinationType !== 'email' && !payload.url)
      throw createApiServiceError('Provide a URL for this notification destination.');
    if (payload.token !== undefined && payload.destinationType !== 'generic')
      throw createApiServiceError('A webhook secret requires generic destinationType.');
    if (payload.url) {
      let url: URL;
      try {
        url = new URL(payload.url);
      } catch {
        throw createApiServiceError('Provide a valid HTTP or HTTPS destination URL.');
      }
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
        throw createApiServiceError(
          'Use an HTTP or HTTPS notification URL without embedded credentials.'
        );
    }
    let resolvedEmails: string[] = [];
    const isHcp = ['app.terraform.io', 'app.eu.terraform.io'].includes(
      new URL(this.axios.defaults.baseURL ?? '').hostname
    );
    if (payload.emailAddresses?.length && !isHcp)
      attributes['email-addresses'] = payload.emailAddresses;
    if (payload.emailAddresses?.length && isHcp) {
      const workspace = (await this.getWorkspace(workspaceId)).data as Resource;
      const organization = relationshipId(workspace, 'organization');
      if (!organization)
        throw createApiServiceError(
          'The workspace response lacks its owning organization. No email notification was created.'
        );
      resolvedEmails = await this.resolveUsers(payload.emailAddresses, 'email', organization);
    }
    const recipientIds = [...new Set([...(payload.emailUserIds ?? []), ...resolvedEmails])];
    if (
      payload.destinationType === 'email' &&
      !recipientIds.length &&
      !(payload.emailAddresses?.length && !isHcp)
    )
      throw createApiServiceError(
        'Provide emailUserIds or accepted organization-member emailAddresses for HCP Terraform; Terraform Enterprise also supports direct emailAddresses.'
      );

    let relationships: Record<string, unknown> = {};
    if (recipientIds.length > 0) {
      relationships.users = {
        data: recipientIds.map(id => ({ id, type: 'users' }))
      };
    }

    let response = await this.axios.post(
      `/workspaces/${pathSegment(workspaceId)}/notification-configurations`,
      {
        data: {
          type: 'notification-configurations',
          attributes,
          ...(Object.keys(relationships).length > 0 ? { relationships } : {})
        }
      }
    );
    return response.data;
  }

  async updateNotificationConfiguration(
    notificationConfigId: string,
    payload: {
      name?: string;
      url?: string;
      token?: string;
      enabled?: boolean;
      triggers?: string[];
    }
  ) {
    requireUpdate(payload);
    let attributes: Record<string, unknown> = {};
    if (payload.name !== undefined) attributes.name = payload.name;
    if (payload.url !== undefined) attributes.url = payload.url;
    if (payload.token !== undefined) attributes.token = payload.token;
    if (payload.enabled !== undefined) attributes.enabled = payload.enabled;
    if (payload.triggers !== undefined) attributes.triggers = payload.triggers;

    let response = await this.axios.patch(
      `/notification-configurations/${pathSegment(notificationConfigId)}`,
      {
        data: {
          type: 'notification-configurations',
          id: notificationConfigId,
          attributes
        }
      }
    );
    return response.data;
  }

  async deleteNotificationConfiguration(notificationConfigId: string) {
    await this.axios.delete(
      `/notification-configurations/${pathSegment(notificationConfigId)}`
    );
  }

  async verifyNotificationConfiguration(notificationConfigId: string) {
    let response = await this.axios.post(
      `/notification-configurations/${pathSegment(notificationConfigId)}/actions/verify`
    );
    return response.data;
  }

  // ── Run Triggers ──

  async listRunTriggers(
    workspaceId: string,
    params?: { type?: 'inbound' | 'outbound'; pageNumber?: number; pageSize?: number }
  ) {
    const query = paginationQuery(params);
    query.set('filter[run-trigger][type]', params?.type ?? 'inbound');
    let response = await this.axios.get(
      `/workspaces/${pathSegment(workspaceId)}/run-triggers?${query.toString()}`
    );
    return response.data;
  }

  async createRunTrigger(workspaceId: string, sourceWorkspaceId: string) {
    let response = await this.axios.post(
      `/workspaces/${pathSegment(workspaceId)}/run-triggers`,
      {
        data: {
          relationships: {
            sourceable: {
              data: { id: sourceWorkspaceId, type: 'workspaces' }
            }
          }
        }
      }
    );
    return response.data;
  }

  async deleteRunTrigger(runTriggerId: string) {
    await this.axios.delete(`/run-triggers/${pathSegment(runTriggerId)}`);
  }

  // ── Organization ──

  async getOrganization() {
    let response = await this.axios.get(`/organizations/${this.organization()}`);
    return response.data;
  }

  private requireTeamRegion() {
    if (this.axios.defaults.baseURL?.startsWith('https://app.eu.terraform.io/'))
      throw createApiServiceError(
        'HCP Europe uses HCP groups; manage group membership in the HCP portal. Team membership operations are unavailable there.'
      );
  }
  private async resolveUsers(
    values: string[],
    field: 'username' | 'email',
    organizationName?: string
  ) {
    if (!values.length || values.some(value => !value.trim()))
      throw createApiServiceError('Provide at least one non-empty username or email.');
    const resolved: string[] = [];
    for (const value of values) {
      let match: string | undefined;
      for (let page = 1; page <= 100; page++) {
        const query = paginationQuery({ pageNumber: page, pageSize: 100 });
        query.set('include', 'user');
        query.set('filter[status]', 'active');
        if (field === 'email') query.set('filter[email]', value);
        else query.set('q', value);
        const response = await this.axios.get(
          `/organizations/${organizationName ? pathSegment(organizationName) : this.organization()}/organization-memberships?${query.toString()}`
        );
        const body = record(response.data);
        const included = (body.included ?? []) as Resource[];
        const activeIds = new Set(
          (body.data as Resource[])
            .filter(item => item.attributes.status === 'active')
            .map(item => relationshipId(item, 'user'))
        );
        const matches = included.filter(
          item =>
            item.type === 'users' &&
            activeIds.has(item.id) &&
            text(item.attributes[field]).toLowerCase() === value.toLowerCase()
        );
        if (matches.length > 1 || (match && matches.some(item => item.id !== match)))
          throw createApiServiceError(
            'Member lookup was ambiguous. Use exact current member identities.'
          );
        if (matches[0]) match = matches[0].id;
        if (Number(record(record(body.meta).pagination)['total-pages']) <= page) break;
        if (page === 100)
          throw createApiServiceError(
            'Member lookup exceeded its bounded pagination window. Narrow the requested identities.'
          );
      }
      if (!match)
        throw createApiServiceError(
          'A supplied username/email does not identify an accepted member of the selected organization. Accept the organization invitation first; no invitations are sent by this operation.'
        );
      resolved.push(match);
    }
    return [...new Set(resolved)];
  }
  async listOrganizations(params?: {
    pageNumber?: number;
    pageSize?: number;
    search?: string;
  }) {
    const query = paginationQuery(params);
    if (params?.search) query.set('q', params.search);
    return (await this.axios.get(`/organizations?${query.toString()}`)).data;
  }
  async listTeamWorkspaceAccess(
    workspaceId: string,
    params?: { pageNumber?: number; pageSize?: number }
  ) {
    const query = paginationQuery(params);
    query.set('filter[workspace][id]', workspaceId);
    return (await this.axios.get(`/team-workspaces?${query.toString()}`)).data;
  }
  async deleteTeamWorkspaceAccess(id: string) {
    await this.axios.delete(`/team-workspaces/${pathSegment(id)}`);
  }
  async getTeamWorkspaceAccess(id: string) {
    return (await this.axios.get(`/team-workspaces/${pathSegment(id)}`)).data;
  }

  // ── Account Details ──

  async getAccountDetails() {
    let response = await this.axios.get('/account/details');
    return response.data;
  }
}
