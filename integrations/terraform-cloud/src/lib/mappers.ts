export let mapWorkspace = (data: any) => ({
  workspaceId: data.id,
  name: data.attributes?.name,
  description: data.attributes?.description || '',
  autoApply: data.attributes?.['auto-apply'] ?? false,
  executionMode: data.attributes?.['execution-mode'] || 'remote',
  terraformVersion: data.attributes?.['terraform-version'] || '',
  workingDirectory: data.attributes?.['working-directory'] || '',
  locked: data.attributes?.locked ?? false,
  createdAt: data.attributes?.['created-at'] || '',
  updatedAt: data.attributes?.['updated-at'] || '',
  resourceCount: data.attributes?.['resource-count'] ?? 0,
  vcsRepoIdentifier: data.attributes?.['vcs-repo']?.identifier || '',
  projectId: data.relationships?.project?.data?.id || ''
});

export let mapRun = (data: any) => ({
  runId: data.id,
  status: data.attributes?.status || '',
  message: data.attributes?.message || '',
  source: data.attributes?.source || '',
  isDestroy: data.attributes?.['is-destroy'] ?? false,
  createdAt: data.attributes?.['created-at'] || '',
  hasChanges: data.attributes?.['has-changes'] ?? false,
  autoApply: data.attributes?.['auto-apply'] ?? false,
  planOnly: data.attributes?.['plan-only'] ?? false,
  statusTimestamps: {
    plannedAt: data.attributes?.['status-timestamps']?.['planned-at'] || '',
    appliedAt: data.attributes?.['status-timestamps']?.['applied-at'] || '',
    erroredAt: data.attributes?.['status-timestamps']?.['errored-at'] || ''
  },
  workspaceId: data.relationships?.workspace?.data?.id || '',
  planId: data.relationships?.plan?.data?.id || '',
  applyId: data.relationships?.apply?.data?.id || ''
});

export let mapVariable = (data: any) => ({
  variableId: data.id,
  key: data.attributes?.key || '',
  value: data.attributes?.value || '',
  description: data.attributes?.description || '',
  category: data.attributes?.category || '',
  hcl: data.attributes?.hcl ?? false,
  sensitive: data.attributes?.sensitive ?? false
});

export let mapProject = (data: any) => ({
  projectId: data.id,
  name: data.attributes?.name || '',
  description: data.attributes?.description || '',
  createdAt: data.attributes?.['created-at'] || '',
  workspaceCount: data.attributes?.['workspace-count'] ?? 0
});

export let mapTeam = (data: any) => ({
  teamId: data.id,
  name: data.attributes?.name || '',
  visibility: data.attributes?.visibility || '',
  usersCount: data.attributes?.['users-count'] ?? 0,
  organizationAccess: {
    managePolicies: data.attributes?.['organization-access']?.['manage-policies'] ?? false,
    manageWorkspaces: data.attributes?.['organization-access']?.['manage-workspaces'] ?? false,
    manageVcsSettings:
      data.attributes?.['organization-access']?.['manage-vcs-settings'] ?? false,
    manageProviders: data.attributes?.['organization-access']?.['manage-providers'] ?? false,
    manageModules: data.attributes?.['organization-access']?.['manage-modules'] ?? false,
    manageRuns: data.attributes?.['organization-access']?.['manage-runs'] ?? false,
    manageProjects: data.attributes?.['organization-access']?.['manage-projects'] ?? false,
    readWorkspaces: data.attributes?.['organization-access']?.['read-workspaces'] ?? false,
    readProjects: data.attributes?.['organization-access']?.['read-projects'] ?? false
  }
});

export let mapStateVersion = (data: any) => ({
  stateVersionId: data.id,
  serial: data.attributes?.serial ?? 0,
  createdAt: data.attributes?.['created-at'] || '',
  size: data.attributes?.size ?? 0,
  terraformVersion: data.attributes?.['terraform-version'] || '',
  resourcesProcessed: data.attributes?.['resources-processed'] ?? false
});

export let mapPolicySet = (data: any) => ({
  policySetId: data.id,
  name: data.attributes?.name || '',
  description: data.attributes?.description || '',
  global: data.attributes?.global ?? false,
  kind: data.attributes?.kind || '',
  policyCount: data.attributes?.['policy-count'] ?? 0,
  createdAt: data.attributes?.['created-at'] || '',
  updatedAt: data.attributes?.['updated-at'] || ''
});

export let mapNotificationConfiguration = (data: any) => ({
  notificationConfigurationId: data.id,
  name: data.attributes?.name || '',
  destinationType: data.attributes?.['destination-type'] || '',
  url: data.attributes?.url || '',
  enabled: data.attributes?.enabled ?? false,
  triggers: data.attributes?.triggers || [],
  createdAt: data.attributes?.['created-at'] || '',
  updatedAt: data.attributes?.['updated-at'] || ''
});

export let mapPagination = (meta: any) => ({
  currentPage: meta?.pagination?.['current-page'] ?? 1,
  totalPages: meta?.pagination?.['total-pages'] ?? 1,
  totalCount: meta?.pagination?.['total-count'] ?? 0,
  pageSize: meta?.pagination?.['page-size'] ?? 20
});
