import { anyOf, createApiServiceError } from 'slates';

export let googleTagManagerScopes = {
  readonly: 'https://www.googleapis.com/auth/tagmanager.readonly',
  editContainers: 'https://www.googleapis.com/auth/tagmanager.edit.containers',
  editContainerVersions: 'https://www.googleapis.com/auth/tagmanager.edit.containerversions',
  deleteContainers: 'https://www.googleapis.com/auth/tagmanager.delete.containers',
  manageAccounts: 'https://www.googleapis.com/auth/tagmanager.manage.accounts',
  manageUsers: 'https://www.googleapis.com/auth/tagmanager.manage.users',
  publish: 'https://www.googleapis.com/auth/tagmanager.publish',
  userInfoProfile: 'https://www.googleapis.com/auth/userinfo.profile',
  userInfoEmail: 'https://www.googleapis.com/auth/userinfo.email'
} as const;

export let gtmAccountReadScopes = [
  googleTagManagerScopes.readonly,
  googleTagManagerScopes.editContainers,
  googleTagManagerScopes.manageAccounts
];

export let gtmContainerReadScopes = [
  googleTagManagerScopes.readonly,
  googleTagManagerScopes.editContainers
];

export let gtmVersionReadScopes = [
  ...gtmContainerReadScopes,
  googleTagManagerScopes.editContainerVersions
];

// Older connections have no persisted grant list. Let Google decide in that case.
export let requireGtmScopes = (
  auth: { grantedScopes?: string[]; scopes?: string[] },
  action: string,
  allowedScopes: readonly string[]
) => {
  let grantedScopes = auth.grantedScopes ?? auth.scopes;
  if (!grantedScopes || allowedScopes.some(scope => grantedScopes.includes(scope))) {
    return;
  }

  throw createApiServiceError(
    `The ${action} action requires ${allowedScopes.join(' or ')}. Reconnect Google Tag Manager with the required scope.`,
    { reason: 'google_tag_manager_missing_scope' }
  );
};

export let requireGtmToolActionScope = (
  auth: { grantedScopes?: string[]; scopes?: string[] },
  tool: string,
  action: string
) => {
  if (tool === 'manage_container' && action === 'delete') {
    return requireGtmScopes(auth, `${tool} ${action}`, [
      googleTagManagerScopes.deleteContainers
    ]);
  }
  if (tool === 'manage_environment' && action === 'reauthorize') {
    return requireGtmScopes(auth, `${tool} ${action}`, [googleTagManagerScopes.publish]);
  }
  if (tool === 'manage_version') {
    if (action === 'publish') {
      return requireGtmScopes(auth, `${tool} ${action}`, [googleTagManagerScopes.publish]);
    }
    if (action === 'create' || action === 'delete') {
      return requireGtmScopes(auth, `${tool} ${action}`, [
        googleTagManagerScopes.editContainerVersions
      ]);
    }
    return requireGtmScopes(
      auth,
      `${tool} ${action}`,
      action === 'get' || action === 'list' ? gtmVersionReadScopes : gtmContainerReadScopes
    );
  }
  if (tool === 'manage_user_permission') {
    return requireGtmScopes(auth, `${tool} ${action}`, [googleTagManagerScopes.manageUsers]);
  }
  if (
    action === 'get' ||
    action === 'list' ||
    action === 'status' ||
    action === 'list_entities'
  ) {
    return requireGtmScopes(auth, `${tool} ${action}`, gtmContainerReadScopes);
  }
  return requireGtmScopes(auth, `${tool} ${action}`, [googleTagManagerScopes.editContainers]);
};

export let googleTagManagerActionScopes = {
  listAccounts: anyOf(...gtmAccountReadScopes),
  updateAccount: anyOf(googleTagManagerScopes.manageAccounts),
  manageContainer: anyOf(...gtmContainerReadScopes, googleTagManagerScopes.deleteContainers),
  manageWorkspace: anyOf(...gtmContainerReadScopes),
  manageTag: anyOf(...gtmContainerReadScopes),
  manageTrigger: anyOf(...gtmContainerReadScopes),
  manageVariable: anyOf(...gtmContainerReadScopes),
  manageFolder: anyOf(...gtmContainerReadScopes),
  manageEnvironment: anyOf(...gtmContainerReadScopes, googleTagManagerScopes.publish),
  manageVersion: anyOf(...gtmVersionReadScopes, googleTagManagerScopes.publish),
  manageUserPermission: anyOf(googleTagManagerScopes.manageUsers),
  workspaceChanged: anyOf(...gtmContainerReadScopes),
  versionPublished: anyOf(...gtmContainerReadScopes),
  inboundWebhook: anyOf(...gtmContainerReadScopes)
} as const;
