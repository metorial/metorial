import { anyOf } from 'slates';

export let googleDriveScopes = {
  drive: 'https://www.googleapis.com/auth/drive',
  driveReadonly: 'https://www.googleapis.com/auth/drive.readonly',
  driveFile: 'https://www.googleapis.com/auth/drive.file',
  driveAppdata: 'https://www.googleapis.com/auth/drive.appdata',
  driveMetadata: 'https://www.googleapis.com/auth/drive.metadata',
  driveMetadataReadonly: 'https://www.googleapis.com/auth/drive.metadata.readonly',
  drivePhotosReadonly: 'https://www.googleapis.com/auth/drive.photos.readonly',
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

let driveMetadataWrite = anyOf(googleDriveScopes.driveMetadata, googleDriveScopes.drive);

let driveSharingWrite = anyOf(googleDriveScopes.drive, googleDriveScopes.driveFile);

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
  createComment: driveContentWrite,
  replyToComment: driveContentWrite,
  deleteComment: driveContentWrite,
  shareFile: driveSharingWrite,
  updatePermission: driveSharingWrite,
  removePermission: driveSharingWrite,
  createSharedDrive: driveContentWrite,
  updateSharedDrive: driveContentWrite,
  deleteSharedDrive: driveContentWrite,
  fileChanges: driveContentRead,
  inboundWebhook: driveContentRead
} as const;
