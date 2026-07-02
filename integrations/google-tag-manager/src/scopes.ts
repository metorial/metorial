import { anyOf } from 'slates';

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

let gtmRead = anyOf(
  googleTagManagerScopes.readonly,
  googleTagManagerScopes.editContainers,
  googleTagManagerScopes.editContainerVersions,
  googleTagManagerScopes.manageAccounts,
  googleTagManagerScopes.publish,
  googleTagManagerScopes.deleteContainers,
  googleTagManagerScopes.manageUsers
);

let gtmWorkspaceEdit = anyOf(
  googleTagManagerScopes.editContainers,
  googleTagManagerScopes.manageAccounts
);

export let googleTagManagerActionScopes = {
  listAccounts: gtmRead,
  manageContainer: anyOf(
    googleTagManagerScopes.readonly,
    googleTagManagerScopes.editContainers,
    googleTagManagerScopes.deleteContainers,
    googleTagManagerScopes.manageAccounts
  ),
  manageWorkspace: gtmWorkspaceEdit,
  manageTag: gtmWorkspaceEdit,
  manageTrigger: gtmWorkspaceEdit,
  manageVariable: gtmWorkspaceEdit,
  manageFolder: gtmWorkspaceEdit,
  manageEnvironment: gtmWorkspaceEdit,
  manageVersion: anyOf(
    googleTagManagerScopes.readonly,
    googleTagManagerScopes.editContainerVersions,
    googleTagManagerScopes.publish
  ),
  manageUserPermission: anyOf(googleTagManagerScopes.manageUsers),
  workspaceChanged: gtmRead,
  versionPublished: gtmRead,
  inboundWebhook: gtmRead
} as const;
