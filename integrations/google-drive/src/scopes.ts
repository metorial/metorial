import { anyOf } from 'slates';

export let googleDriveScopes = {
  drive: 'https://www.googleapis.com/auth/drive',
  driveReadonly: 'https://www.googleapis.com/auth/drive.readonly',
  driveFile: 'https://www.googleapis.com/auth/drive.file',
  driveAppdata: 'https://www.googleapis.com/auth/drive.appdata',
  driveMetadata: 'https://www.googleapis.com/auth/drive.metadata',
  driveMetadataReadonly: 'https://www.googleapis.com/auth/drive.metadata.readonly',
  drivePhotosReadonly: 'https://www.googleapis.com/auth/drive.photos.readonly',
  driveAppsReadonly: 'https://www.googleapis.com/auth/drive.apps.readonly',
  driveLabels: 'https://www.googleapis.com/auth/drive.labels',
  driveLabelsReadonly: 'https://www.googleapis.com/auth/drive.labels.readonly',
  // Legacy Google Docs scope that apps.get still documents as accepted.
  docs: 'https://www.googleapis.com/auth/docs',
  userInfoProfile: 'https://www.googleapis.com/auth/userinfo.profile',
  userInfoEmail: 'https://www.googleapis.com/auth/userinfo.email'
} as const;

let driveContentRead = anyOf(
  googleDriveScopes.driveReadonly,
  googleDriveScopes.drive,
  googleDriveScopes.driveFile,
  googleDriveScopes.drivePhotosReadonly
);

let driveMetadataRead = anyOf(
  googleDriveScopes.driveMetadataReadonly,
  googleDriveScopes.driveMetadata,
  googleDriveScopes.driveReadonly,
  googleDriveScopes.drive,
  googleDriveScopes.driveFile
);

let driveContentWrite = anyOf(
  googleDriveScopes.drive,
  googleDriveScopes.driveFile,
  googleDriveScopes.driveAppdata
);

let driveMetadataWrite = anyOf(
  googleDriveScopes.driveMetadata,
  googleDriveScopes.drive,
  googleDriveScopes.driveFile,
  googleDriveScopes.driveAppdata
);

let driveSharingWrite = anyOf(googleDriveScopes.drive, googleDriveScopes.driveFile);

let driveCommentWrite = anyOf(googleDriveScopes.drive, googleDriveScopes.driveFile);

// Shared by about.get and changes.* reads: any Drive scope grants access.
let driveAnyScopeRead = anyOf(
  googleDriveScopes.drive,
  googleDriveScopes.driveAppdata,
  googleDriveScopes.driveFile,
  googleDriveScopes.driveMetadata,
  googleDriveScopes.driveMetadataReadonly,
  googleDriveScopes.drivePhotosReadonly,
  googleDriveScopes.driveReadonly
);

// apps.list documents drive.apps.readonly as its only accepted scope.
let driveAppsList = anyOf(googleDriveScopes.driveAppsReadonly);

// apps.get accepts drive.apps.readonly plus every file-level Drive scope.
let driveAppsGet = anyOf(
  googleDriveScopes.driveAppsReadonly,
  googleDriveScopes.drive,
  googleDriveScopes.driveReadonly,
  googleDriveScopes.driveFile,
  googleDriveScopes.driveAppdata,
  googleDriveScopes.driveMetadata,
  googleDriveScopes.driveMetadataReadonly,
  googleDriveScopes.docs
);

// Drive Labels API v2 labels.list / labels.get. Accept existing write grants for reads.
let driveLabelsRead = anyOf(
  googleDriveScopes.driveLabelsReadonly,
  googleDriveScopes.driveLabels
);

export let googleDriveActionScopes = {
  searchFiles: driveMetadataRead,
  getFile: driveContentRead,
  downloadFile: driveContentRead,
  exportFile: driveContentRead,
  listRevisions: driveContentRead,
  listComments: driveContentRead,
  listPermissions: driveMetadataRead,
  listSharedDrives: driveContentRead,
  createFile: driveContentWrite,
  uploadFile: driveContentWrite,
  updateFile: driveMetadataWrite,
  copyFile: driveContentWrite,
  deleteFile: driveContentWrite,
  createComment: driveCommentWrite,
  replyToComment: driveCommentWrite,
  updateComment: driveCommentWrite,
  deleteComment: driveCommentWrite,
  getAbout: driveAnyScopeRead,
  listChanges: driveAnyScopeRead,
  shareFile: driveSharingWrite,
  updatePermission: driveSharingWrite,
  removePermission: driveSharingWrite,
  createSharedDrive: driveContentWrite,
  updateSharedDrive: driveContentWrite,
  deleteSharedDrive: driveContentWrite,
  listDriveApps: driveAppsList,
  getDriveApp: driveAppsGet,
  listDriveLabels: driveLabelsRead,
  getDriveLabel: driveLabelsRead,
  recentFileActivity: driveAnyScopeRead
} as const;
