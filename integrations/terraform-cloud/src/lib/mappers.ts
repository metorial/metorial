import { createApiServiceError } from 'slates';
import {
  flag,
  number,
  parseResource,
  record,
  relationshipId,
  sensitivity,
  text
} from './contracts';

export const mapWorkspace = (value: unknown) => {
  const data = parseResource(value, 'workspaces');
  const a = data.attributes;
  if (!text(a.name))
    throw createApiServiceError('HCP Terraform returned a workspace without its name.');
  return {
    workspaceId: data.id,
    name: text(a.name),
    description: text(a.description),
    autoApply: flag(a['auto-apply']),
    executionMode: text(a['execution-mode'], 'remote'),
    agentPoolId: relationshipId(data, 'agent-pool') || undefined,
    terraformVersion: text(a['terraform-version']),
    workingDirectory: text(a['working-directory']),
    locked: flag(a.locked),
    createdAt: text(a['created-at']),
    updatedAt: text(a['updated-at']),
    resourceCount: number(a['resource-count']),
    vcsRepoIdentifier: text(record(a['vcs-repo']).identifier),
    projectId: relationshipId(data, 'project')
  };
};
export const mapRun = (value: unknown) => {
  const data = parseResource(value, 'runs');
  const a = data.attributes;
  const timestamps = record(a['status-timestamps']);
  if (!text(a.status))
    throw createApiServiceError('HCP Terraform returned a run without its status.');
  return {
    runId: data.id,
    status: text(a.status),
    message: text(a.message),
    source: text(a.source),
    isDestroy: flag(a['is-destroy']),
    createdAt: text(a['created-at']),
    hasChanges: flag(a['has-changes']),
    autoApply: flag(a['auto-apply']),
    planOnly: flag(a['plan-only']),
    statusTimestamps: {
      plannedAt: text(timestamps['planned-at']),
      appliedAt: text(timestamps['applied-at']),
      erroredAt: text(timestamps['errored-at'])
    },
    workspaceId: relationshipId(data, 'workspace'),
    planId: relationshipId(data, 'plan'),
    applyId: relationshipId(data, 'apply')
  };
};
export const mapVariable = (value: unknown) => {
  const data = parseResource(value, 'vars');
  const a = data.attributes;
  const sensitive = sensitivity(a.sensitive);
  if (!text(a.key))
    throw createApiServiceError('HCP Terraform returned a variable without its key.');
  return {
    variableId: data.id,
    key: text(a.key),
    value: sensitive ? '' : text(a.value),
    description: text(a.description),
    category: text(a.category),
    hcl: flag(a.hcl),
    sensitive
  };
};
export const mapProject = (value: unknown) => {
  const data = parseResource(value, 'projects');
  const a = data.attributes;
  if (!text(a.name))
    throw createApiServiceError('HCP Terraform returned a project without its name.');
  return {
    projectId: data.id,
    name: text(a.name),
    description: text(a.description),
    createdAt: text(a['created-at']),
    workspaceCount: number(a['workspace-count'])
  };
};
export const mapTeam = (value: unknown) => {
  const data = parseResource(value, 'teams');
  const a = data.attributes;
  const access = record(a['organization-access']);
  return {
    teamId: data.id,
    name: text(a.name),
    visibility: text(a.visibility),
    usersCount: number(a['users-count']),
    organizationAccess: {
      managePolicies: flag(access['manage-policies']),
      manageWorkspaces: flag(access['manage-workspaces']),
      manageVcsSettings: flag(access['manage-vcs-settings']),
      manageProviders: flag(access['manage-providers']),
      manageModules: flag(access['manage-modules']),
      manageRuns: false,
      manageProjects: flag(access['manage-projects']),
      readWorkspaces: flag(access['read-workspaces']),
      readProjects: flag(access['read-projects'])
    }
  };
};
export const mapStateVersion = (value: unknown) => {
  const data = parseResource(value, 'state-versions');
  const a = data.attributes;
  if (typeof a.serial !== 'number')
    throw createApiServiceError('HCP Terraform returned a state version without its serial.');
  return {
    stateVersionId: data.id,
    serial: number(a.serial),
    createdAt: text(a['created-at']),
    size: number(a.size),
    terraformVersion: text(a['terraform-version']),
    resourcesProcessed: flag(a['resources-processed'])
  };
};
export const mapPolicySet = (value: unknown) => {
  const data = parseResource(value, 'policy-sets');
  const a = data.attributes;
  return {
    policySetId: data.id,
    name: text(a.name),
    description: text(a.description),
    global: flag(a.global),
    kind: text(a.kind),
    policyCount: number(a['policy-count']),
    createdAt: text(a['created-at']),
    updatedAt: text(a['updated-at'])
  };
};
export const mapVariableSet = (value: unknown) => {
  const data = parseResource(value, 'varsets');
  const a = data.attributes;
  return {
    variableSetId: data.id,
    name: text(a.name),
    description: text(a.description),
    global: flag(a.global),
    createdAt: text(a['created-at']),
    updatedAt: text(a['updated-at'])
  };
};
export const mapNotificationConfiguration = (value: unknown) => {
  const data = parseResource(value, 'notification-configurations');
  const a = data.attributes;
  const triggers = a.triggers;
  if (!Array.isArray(triggers) || triggers.some(item => typeof item !== 'string'))
    throw createApiServiceError('HCP Terraform returned invalid notification triggers.');
  let url = '';
  const upstream = text(a.url);
  if (upstream) {
    try {
      url = `${new URL(upstream).origin}/[redacted]`;
    } catch {
      throw createApiServiceError('HCP Terraform returned an invalid notification URL.');
    }
  }
  return {
    notificationConfigurationId: data.id,
    name: text(a.name),
    destinationType: text(a['destination-type']),
    url,
    enabled: flag(a.enabled),
    triggers: triggers as string[],
    createdAt: text(a['created-at']),
    updatedAt: text(a['updated-at'])
  };
};
export const mapPagination = (value: unknown) => {
  const p = record(record(value).pagination);
  return {
    currentPage: number(p['current-page'], 1),
    totalPages: number(p['total-pages'], 1),
    totalCount: number(p['total-count']),
    pageSize: number(p['page-size'], 20)
  };
};
export const mapOrganization = (value: unknown) => {
  const data = parseResource(value, 'organizations');
  const a = data.attributes;
  const permissions = record(a.permissions);
  return {
    organizationId: data.id,
    name: text(a.name),
    email: text(a.email),
    collaboratorAuthPolicy: text(a['collaborator-auth-policy']),
    planExpired: flag(a['plan-expired']),
    planExpiresAt: text(a['plan-expires-at']),
    costEstimationEnabled: flag(a['cost-estimation-enabled']),
    createdAt: text(a['created-at']),
    trialing: flag(a['plan-is-trial']),
    permissions: {
      canCreateTeam: flag(permissions['can-create-team']),
      canCreateWorkspace: flag(permissions['can-create-workspace']),
      canManageUsers: flag(permissions['can-manage-users']),
      canUpdate: flag(permissions['can-update']),
      canDestroy: flag(permissions['can-destroy'])
    }
  };
};
export const mapRunTrigger = (value: unknown) => {
  const data = parseResource(value, 'run-triggers');
  const a = data.attributes;
  return {
    runTriggerId: data.id,
    sourceWorkspaceId: relationshipId(data, 'sourceable'),
    sourceWorkspaceName: text(a['sourceable-name']),
    createdAt: text(a['created-at'])
  };
};
export const mapUser = (value: unknown) => {
  const data = parseResource(value, 'users');
  const a = data.attributes;
  return {
    userId: data.id,
    username: text(a.username),
    email: text(a.email),
    avatarUrl: text(a['avatar-url']),
    isServiceAccount: flag(a['is-service-account']),
    authenticatedResourceId: relationshipId(data, 'authenticated-resource')
  };
};
export const mapTeamWorkspaceAccess = (value: unknown) => {
  const data = parseResource(value, 'team-workspaces');
  const a = data.attributes;
  return {
    teamWorkspaceAccessId: data.id,
    teamId: relationshipId(data, 'team'),
    workspaceId: relationshipId(data, 'workspace'),
    access: text(a.access),
    runs: text(a.runs),
    variables: text(a.variables),
    stateVersions: text(a['state-versions']),
    planOutputs: text(a['plan-outputs']),
    sentinelMocks: text(a['sentinel-mocks']),
    workspaceLocking: flag(a['workspace-locking']),
    runTasks: flag(a['run-tasks'])
  };
};
