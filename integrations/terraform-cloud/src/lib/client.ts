import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private organizationName: string;

  constructor(config: { token: string; baseUrl: string; organizationName: string }) {
    this.organizationName = config.organizationName;
    this.axios = createAxios({
      baseURL: config.baseUrl,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/vnd.api+json'
      }
    });
  }

  // ── Workspaces ──

  async listWorkspaces(params?: {
    pageNumber?: number;
    pageSize?: number;
    search?: string;
    projectId?: string;
  }) {
    let query = new URLSearchParams();
    if (params?.pageNumber) query.set('page[number]', String(params.pageNumber));
    if (params?.pageSize) query.set('page[size]', String(params.pageSize));
    if (params?.search) query.set('search[name]', params.search);
    if (params?.projectId) query.set('filter[project][id]', params.projectId);

    let response = await this.axios.get(
      `/organizations/${this.organizationName}/workspaces?${query.toString()}`
    );
    return response.data;
  }

  async getWorkspace(workspaceId: string) {
    let response = await this.axios.get(`/workspaces/${workspaceId}`);
    return response.data;
  }

  async getWorkspaceByName(workspaceName: string) {
    let response = await this.axios.get(
      `/organizations/${this.organizationName}/workspaces/${workspaceName}`
    );
    return response.data;
  }

  async createWorkspace(payload: {
    name: string;
    description?: string;
    autoApply?: boolean;
    executionMode?: string;
    terraformVersion?: string;
    workingDirectory?: string;
    projectId?: string;
    vcsRepo?: {
      identifier: string;
      oauthTokenId: string;
      branch?: string;
    };
  }) {
    let attributes: Record<string, any> = {
      name: payload.name
    };
    if (payload.description !== undefined) attributes.description = payload.description;
    if (payload.autoApply !== undefined) attributes['auto-apply'] = payload.autoApply;
    if (payload.executionMode !== undefined)
      attributes['execution-mode'] = payload.executionMode;
    if (payload.terraformVersion !== undefined)
      attributes['terraform-version'] = payload.terraformVersion;
    if (payload.workingDirectory !== undefined)
      attributes['working-directory'] = payload.workingDirectory;
    if (payload.vcsRepo) {
      attributes['vcs-repo'] = {
        identifier: payload.vcsRepo.identifier,
        'oauth-token-id': payload.vcsRepo.oauthTokenId,
        ...(payload.vcsRepo.branch ? { branch: payload.vcsRepo.branch } : {})
      };
    }

    let relationships: Record<string, any> = {};
    if (payload.projectId) {
      relationships.project = {
        data: { id: payload.projectId, type: 'projects' }
      };
    }

    let response = await this.axios.post(
      `/organizations/${this.organizationName}/workspaces`,
      {
        data: {
          type: 'workspaces',
          attributes,
          ...(Object.keys(relationships).length > 0 ? { relationships } : {})
        }
      }
    );
    return response.data;
  }

  async updateWorkspace(
    workspaceId: string,
    payload: {
      name?: string;
      description?: string;
      autoApply?: boolean;
      executionMode?: string;
      terraformVersion?: string;
      workingDirectory?: string;
    }
  ) {
    let attributes: Record<string, any> = {};
    if (payload.name !== undefined) attributes.name = payload.name;
    if (payload.description !== undefined) attributes.description = payload.description;
    if (payload.autoApply !== undefined) attributes['auto-apply'] = payload.autoApply;
    if (payload.executionMode !== undefined)
      attributes['execution-mode'] = payload.executionMode;
    if (payload.terraformVersion !== undefined)
      attributes['terraform-version'] = payload.terraformVersion;
    if (payload.workingDirectory !== undefined)
      attributes['working-directory'] = payload.workingDirectory;

    let response = await this.axios.patch(`/workspaces/${workspaceId}`, {
      data: {
        type: 'workspaces',
        attributes
      }
    });
    return response.data;
  }

  async deleteWorkspace(workspaceId: string) {
    await this.axios.delete(`/workspaces/${workspaceId}`);
  }

  async lockWorkspace(workspaceId: string, reason?: string) {
    let response = await this.axios.post(`/workspaces/${workspaceId}/actions/lock`, {
      reason: reason || ''
    });
    return response.data;
  }

  async unlockWorkspace(workspaceId: string) {
    let response = await this.axios.post(`/workspaces/${workspaceId}/actions/unlock`);
    return response.data;
  }

  async forceUnlockWorkspace(workspaceId: string) {
    let response = await this.axios.post(`/workspaces/${workspaceId}/actions/force-unlock`);
    return response.data;
  }

  // ── Runs ──

  async listRuns(
    workspaceId: string,
    params?: {
      pageNumber?: number;
      pageSize?: number;
      status?: string;
    }
  ) {
    let query = new URLSearchParams();
    if (params?.pageNumber) query.set('page[number]', String(params.pageNumber));
    if (params?.pageSize) query.set('page[size]', String(params.pageSize));
    if (params?.status) query.set('filter[status]', params.status);

    let response = await this.axios.get(`/workspaces/${workspaceId}/runs?${query.toString()}`);
    return response.data;
  }

  async getRun(runId: string) {
    let response = await this.axios.get(`/runs/${runId}`);
    return response.data;
  }

  async createRun(payload: {
    workspaceId: string;
    message?: string;
    isDestroy?: boolean;
    autoApply?: boolean;
    planOnly?: boolean;
    refreshOnly?: boolean;
    configurationVersionId?: string;
    targetAddrs?: string[];
    replaceAddrs?: string[];
  }) {
    let attributes: Record<string, any> = {};
    if (payload.message !== undefined) attributes.message = payload.message;
    if (payload.isDestroy !== undefined) attributes['is-destroy'] = payload.isDestroy;
    if (payload.autoApply !== undefined) attributes['auto-apply'] = payload.autoApply;
    if (payload.planOnly !== undefined) attributes['plan-only'] = payload.planOnly;
    if (payload.refreshOnly !== undefined) attributes['refresh-only'] = payload.refreshOnly;
    if (payload.targetAddrs) attributes['target-addrs'] = payload.targetAddrs;
    if (payload.replaceAddrs) attributes['replace-addrs'] = payload.replaceAddrs;

    let relationships: Record<string, any> = {
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
    return response.data;
  }

  async applyRun(runId: string, comment?: string) {
    await this.axios.post(`/runs/${runId}/actions/apply`, {
      comment: comment || ''
    });
  }

  async discardRun(runId: string, comment?: string) {
    await this.axios.post(`/runs/${runId}/actions/discard`, {
      comment: comment || ''
    });
  }

  async cancelRun(runId: string, comment?: string) {
    await this.axios.post(`/runs/${runId}/actions/cancel`, {
      comment: comment || ''
    });
  }

  async forceExecuteRun(runId: string) {
    await this.axios.post(`/runs/${runId}/actions/force-execute`);
  }

  async forceCancelRun(runId: string, comment?: string) {
    await this.axios.post(`/runs/${runId}/actions/force-cancel`, {
      comment: comment || ''
    });
  }

  // ── Variables ──

  async listWorkspaceVariables(workspaceId: string) {
    let response = await this.axios.get(`/workspaces/${workspaceId}/vars`);
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
    let attributes: Record<string, any> = {
      key: payload.key,
      value: payload.value,
      category: payload.category
    };
    if (payload.description !== undefined) attributes.description = payload.description;
    if (payload.hcl !== undefined) attributes.hcl = payload.hcl;
    if (payload.sensitive !== undefined) attributes.sensitive = payload.sensitive;

    let response = await this.axios.post(`/workspaces/${workspaceId}/vars`, {
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
    let attributes: Record<string, any> = {};
    if (payload.key !== undefined) attributes.key = payload.key;
    if (payload.value !== undefined) attributes.value = payload.value;
    if (payload.description !== undefined) attributes.description = payload.description;
    if (payload.hcl !== undefined) attributes.hcl = payload.hcl;
    if (payload.sensitive !== undefined) attributes.sensitive = payload.sensitive;

    let response = await this.axios.patch(`/workspaces/${workspaceId}/vars/${variableId}`, {
      data: {
        type: 'vars',
        id: variableId,
        attributes
      }
    });
    return response.data;
  }

  async deleteVariable(workspaceId: string, variableId: string) {
    await this.axios.delete(`/workspaces/${workspaceId}/vars/${variableId}`);
  }

  // ── Variable Sets ──

  async listVariableSets(params?: { pageNumber?: number; pageSize?: number }) {
    let query = new URLSearchParams();
    if (params?.pageNumber) query.set('page[number]', String(params.pageNumber));
    if (params?.pageSize) query.set('page[size]', String(params.pageSize));

    let response = await this.axios.get(
      `/organizations/${this.organizationName}/varsets?${query.toString()}`
    );
    return response.data;
  }

  async getVariableSet(variableSetId: string) {
    let response = await this.axios.get(`/varsets/${variableSetId}`);
    return response.data;
  }

  async createVariableSet(payload: {
    name: string;
    description?: string;
    global?: boolean;
    workspaceIds?: string[];
    projectIds?: string[];
  }) {
    let attributes: Record<string, any> = {
      name: payload.name
    };
    if (payload.description !== undefined) attributes.description = payload.description;
    if (payload.global !== undefined) attributes.global = payload.global;

    let relationships: Record<string, any> = {};
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

    let response = await this.axios.post(`/organizations/${this.organizationName}/varsets`, {
      data: {
        type: 'varsets',
        attributes,
        ...(Object.keys(relationships).length > 0 ? { relationships } : {})
      }
    });
    return response.data;
  }

  async deleteVariableSet(variableSetId: string) {
    await this.axios.delete(`/varsets/${variableSetId}`);
  }

  // ── Projects ──

  async listProjects(params?: { pageNumber?: number; pageSize?: number; name?: string }) {
    let query = new URLSearchParams();
    if (params?.pageNumber) query.set('page[number]', String(params.pageNumber));
    if (params?.pageSize) query.set('page[size]', String(params.pageSize));
    if (params?.name) query.set('filter[names]', params.name);

    let response = await this.axios.get(
      `/organizations/${this.organizationName}/projects?${query.toString()}`
    );
    return response.data;
  }

  async getProject(projectId: string) {
    let response = await this.axios.get(`/projects/${projectId}`);
    return response.data;
  }

  async createProject(payload: { name: string; description?: string }) {
    let attributes: Record<string, any> = { name: payload.name };
    if (payload.description !== undefined) attributes.description = payload.description;

    let response = await this.axios.post(`/organizations/${this.organizationName}/projects`, {
      data: {
        type: 'projects',
        attributes
      }
    });
    return response.data;
  }

  async updateProject(projectId: string, payload: { name?: string; description?: string }) {
    let attributes: Record<string, any> = {};
    if (payload.name !== undefined) attributes.name = payload.name;
    if (payload.description !== undefined) attributes.description = payload.description;

    let response = await this.axios.patch(`/projects/${projectId}`, {
      data: {
        type: 'projects',
        attributes
      }
    });
    return response.data;
  }

  async deleteProject(projectId: string) {
    await this.axios.delete(`/projects/${projectId}`);
  }

  // ── Teams ──

  async listTeams(params?: { pageNumber?: number; pageSize?: number }) {
    let query = new URLSearchParams();
    if (params?.pageNumber) query.set('page[number]', String(params.pageNumber));
    if (params?.pageSize) query.set('page[size]', String(params.pageSize));

    let response = await this.axios.get(
      `/organizations/${this.organizationName}/teams?${query.toString()}`
    );
    return response.data;
  }

  async getTeam(teamId: string) {
    let response = await this.axios.get(`/teams/${teamId}`);
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
    let attributes: Record<string, any> = { name: payload.name };
    if (payload.visibility !== undefined) attributes.visibility = payload.visibility;
    if (payload.organizationAccess) {
      let orgAccess: Record<string, any> = {};
      let oa = payload.organizationAccess;
      if (oa.managePolicies !== undefined) orgAccess['manage-policies'] = oa.managePolicies;
      if (oa.manageWorkspaces !== undefined)
        orgAccess['manage-workspaces'] = oa.manageWorkspaces;
      if (oa.manageVcsSettings !== undefined)
        orgAccess['manage-vcs-settings'] = oa.manageVcsSettings;
      if (oa.manageProviders !== undefined) orgAccess['manage-providers'] = oa.manageProviders;
      if (oa.manageModules !== undefined) orgAccess['manage-modules'] = oa.manageModules;
      if (oa.manageRuns !== undefined) orgAccess['manage-runs'] = oa.manageRuns;
      if (oa.manageProjects !== undefined) orgAccess['manage-projects'] = oa.manageProjects;
      if (oa.readWorkspaces !== undefined) orgAccess['read-workspaces'] = oa.readWorkspaces;
      if (oa.readProjects !== undefined) orgAccess['read-projects'] = oa.readProjects;
      attributes['organization-access'] = orgAccess;
    }

    let response = await this.axios.post(`/organizations/${this.organizationName}/teams`, {
      data: {
        type: 'teams',
        attributes
      }
    });
    return response.data;
  }

  async deleteTeam(teamId: string) {
    await this.axios.delete(`/teams/${teamId}`);
  }

  // ── Team Membership ──

  async addTeamMembers(teamId: string, usernames: string[]) {
    await this.axios.post(`/teams/${teamId}/relationships/users`, {
      data: usernames.map(u => ({ type: 'users', attributes: { username: u } }))
    });
  }

  async removeTeamMember(teamId: string, usernames: string[]) {
    await this.axios.delete(`/teams/${teamId}/relationships/users`, {
      data: {
        data: usernames.map(u => ({ type: 'users', attributes: { username: u } }))
      }
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
    let attributes: Record<string, any> = { access: payload.access };
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
    let query = new URLSearchParams();
    if (params?.pageNumber) query.set('page[number]', String(params.pageNumber));
    if (params?.pageSize) query.set('page[size]', String(params.pageSize));

    let response = await this.axios.get(
      `/workspaces/${workspaceId}/state-versions?${query.toString()}`
    );
    return response.data;
  }

  async getCurrentStateVersion(workspaceId: string) {
    let response = await this.axios.get(`/workspaces/${workspaceId}/current-state-version`);
    return response.data;
  }

  async getStateVersion(stateVersionId: string) {
    let response = await this.axios.get(`/state-versions/${stateVersionId}`);
    return response.data;
  }

  async getStateVersionOutputs(stateVersionId: string) {
    let response = await this.axios.get(`/state-versions/${stateVersionId}/outputs`);
    return response.data;
  }

  // ── Policy Sets ──

  async listPolicySets(params?: { pageNumber?: number; pageSize?: number; search?: string }) {
    let query = new URLSearchParams();
    if (params?.pageNumber) query.set('page[number]', String(params.pageNumber));
    if (params?.pageSize) query.set('page[size]', String(params.pageSize));
    if (params?.search) query.set('search[name]', params.search);

    let response = await this.axios.get(
      `/organizations/${this.organizationName}/policy-sets?${query.toString()}`
    );
    return response.data;
  }

  async getPolicySet(policySetId: string) {
    let response = await this.axios.get(`/policy-sets/${policySetId}`);
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
    let attributes: Record<string, any> = { name: payload.name };
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

    let relationships: Record<string, any> = {};
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

    let response = await this.axios.post(
      `/organizations/${this.organizationName}/policy-sets`,
      {
        data: {
          type: 'policy-sets',
          attributes,
          ...(Object.keys(relationships).length > 0 ? { relationships } : {})
        }
      }
    );
    return response.data;
  }

  async deletePolicySet(policySetId: string) {
    await this.axios.delete(`/policy-sets/${policySetId}`);
  }

  // ── Notification Configurations ──

  async listNotificationConfigurations(workspaceId: string) {
    let response = await this.axios.get(
      `/workspaces/${workspaceId}/notification-configurations`
    );
    return response.data;
  }

  async getNotificationConfiguration(notificationConfigId: string) {
    let response = await this.axios.get(
      `/notification-configurations/${notificationConfigId}`
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
    let attributes: Record<string, any> = {
      name: payload.name,
      'destination-type': payload.destinationType,
      triggers: payload.triggers
    };
    if (payload.url !== undefined) attributes.url = payload.url;
    if (payload.token !== undefined) attributes.token = payload.token;
    if (payload.enabled !== undefined) attributes.enabled = payload.enabled;
    if (payload.emailAddresses) attributes['email-addresses'] = payload.emailAddresses;

    let relationships: Record<string, any> = {};
    if (payload.emailUserIds && payload.emailUserIds.length > 0) {
      relationships.users = {
        data: payload.emailUserIds.map(id => ({ id, type: 'users' }))
      };
    }

    let response = await this.axios.post(
      `/workspaces/${workspaceId}/notification-configurations`,
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
    let attributes: Record<string, any> = {};
    if (payload.name !== undefined) attributes.name = payload.name;
    if (payload.url !== undefined) attributes.url = payload.url;
    if (payload.token !== undefined) attributes.token = payload.token;
    if (payload.enabled !== undefined) attributes.enabled = payload.enabled;
    if (payload.triggers !== undefined) attributes.triggers = payload.triggers;

    let response = await this.axios.patch(
      `/notification-configurations/${notificationConfigId}`,
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
    await this.axios.delete(`/notification-configurations/${notificationConfigId}`);
  }

  async verifyNotificationConfiguration(notificationConfigId: string) {
    let response = await this.axios.post(
      `/notification-configurations/${notificationConfigId}/actions/verify`
    );
    return response.data;
  }

  // ── Run Tasks ──

  async listRunTasks(params?: { pageNumber?: number; pageSize?: number }) {
    let query = new URLSearchParams();
    if (params?.pageNumber) query.set('page[number]', String(params.pageNumber));
    if (params?.pageSize) query.set('page[size]', String(params.pageSize));

    let response = await this.axios.get(
      `/organizations/${this.organizationName}/tasks?${query.toString()}`
    );
    return response.data;
  }

  async createRunTask(payload: {
    name: string;
    url: string;
    hmacKey?: string;
    category?: string;
    enabled?: boolean;
    description?: string;
  }) {
    let attributes: Record<string, any> = {
      name: payload.name,
      url: payload.url,
      category: payload.category || 'task'
    };
    if (payload.hmacKey !== undefined) attributes['hmac-key'] = payload.hmacKey;
    if (payload.enabled !== undefined) attributes.enabled = payload.enabled;
    if (payload.description !== undefined) attributes.description = payload.description;

    let response = await this.axios.post(`/organizations/${this.organizationName}/tasks`, {
      data: {
        type: 'tasks',
        attributes
      }
    });
    return response.data;
  }

  async deleteRunTask(taskId: string) {
    await this.axios.delete(`/tasks/${taskId}`);
  }

  // ── Run Triggers ──

  async listRunTriggers(workspaceId: string) {
    let response = await this.axios.get(`/workspaces/${workspaceId}/run-triggers`);
    return response.data;
  }

  async createRunTrigger(workspaceId: string, sourceWorkspaceId: string) {
    let response = await this.axios.post(`/workspaces/${workspaceId}/run-triggers`, {
      data: {
        relationships: {
          sourceable: {
            data: { id: sourceWorkspaceId, type: 'workspaces' }
          }
        }
      }
    });
    return response.data;
  }

  async deleteRunTrigger(runTriggerId: string) {
    await this.axios.delete(`/run-triggers/${runTriggerId}`);
  }

  // ── Agent Pools ──

  async listAgentPools(params?: { pageNumber?: number; pageSize?: number }) {
    let query = new URLSearchParams();
    if (params?.pageNumber) query.set('page[number]', String(params.pageNumber));
    if (params?.pageSize) query.set('page[size]', String(params.pageSize));

    let response = await this.axios.get(
      `/organizations/${this.organizationName}/agent-pools?${query.toString()}`
    );
    return response.data;
  }

  // ── Organization ──

  async getOrganization() {
    let response = await this.axios.get(`/organizations/${this.organizationName}`);
    return response.data;
  }

  // ── Plan ──

  async getPlan(planId: string) {
    let response = await this.axios.get(`/plans/${planId}`);
    return response.data;
  }

  async getPlanJsonOutput(planId: string) {
    let response = await this.axios.get(`/plans/${planId}/json-output`);
    return response.data;
  }

  // ── Apply ──

  async getApply(applyId: string) {
    let response = await this.axios.get(`/applies/${applyId}`);
    return response.data;
  }

  // ── Registry Modules ──

  async listRegistryModules(params?: { pageNumber?: number; pageSize?: number }) {
    let query = new URLSearchParams();
    if (params?.pageNumber) query.set('page[number]', String(params.pageNumber));
    if (params?.pageSize) query.set('page[size]', String(params.pageSize));

    let response = await this.axios.get(
      `/organizations/${this.organizationName}/registry-modules?${query.toString()}`
    );
    return response.data;
  }

  async deleteRegistryModule(moduleName: string, providerName: string) {
    await this.axios.post(
      `/registry-modules/actions/delete/${this.organizationName}/${moduleName}/${providerName}`
    );
  }

  // ── OAuth Clients ──

  async listOAuthClients() {
    let response = await this.axios.get(
      `/organizations/${this.organizationName}/oauth-clients`
    );
    return response.data;
  }

  // ── Account Details ──

  async getAccountDetails() {
    let response = await this.axios.get('/account/details');
    return response.data;
  }
}
