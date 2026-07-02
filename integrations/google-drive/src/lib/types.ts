export interface DriveFile {
  fileId: string;
  name: string;
  mimeType: string;
  description?: string;
  starred?: boolean;
  trashed?: boolean;
  parents?: string[];
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  sharedWithMeTime?: string;
  owners?: DriveUser[];
  lastModifyingUser?: DriveUser;
  shared?: boolean;
  capabilities?: Record<string, boolean>;
}

export interface DriveUser {
  displayName?: string;
  emailAddress?: string;
  photoLink?: string;
  permissionId?: string;
}

export interface DrivePermission {
  permissionId: string;
  role: string;
  type: string;
  emailAddress?: string;
  domain?: string;
  displayName?: string;
  expirationTime?: string;
  allowFileDiscovery?: boolean;
}

export interface DriveComment {
  commentId: string;
  content: string;
  createdTime: string;
  modifiedTime: string;
  author: DriveUser;
  resolved: boolean;
  replies?: DriveReply[];
  quotedFileContent?: {
    mimeType: string;
    value: string;
  };
  anchor?: string;
}

export interface DriveReply {
  replyId: string;
  content: string;
  createdTime: string;
  modifiedTime: string;
  author: DriveUser;
  action?: string;
}

export interface DriveRevision {
  revisionId: string;
  mimeType: string;
  modifiedTime: string;
  lastModifyingUser?: DriveUser;
  size?: string;
  keepForever?: boolean;
  publishAuto?: boolean;
  published?: boolean;
  originalFilename?: string;
}

export interface SharedDrive {
  driveId: string;
  name: string;
  createdTime?: string;
  hidden?: boolean;
  capabilities?: Record<string, boolean>;
  restrictions?: Record<string, boolean>;
}

export interface DriveChange {
  changeId: string;
  type: string;
  time: string;
  removed: boolean;
  fileId?: string;
  file?: DriveFile;
  driveId?: string;
  drive?: SharedDrive;
}

export interface FileListResponse {
  files: DriveFile[];
  nextPageToken?: string;
  incompleteSearch?: boolean;
}

export interface ChangeListResponse {
  changes: DriveChange[];
  nextPageToken?: string;
  newStartPageToken?: string;
}

export interface PermissionListResponse {
  permissions: DrivePermission[];
  nextPageToken?: string;
}

export interface CommentListResponse {
  comments: DriveComment[];
  nextPageToken?: string;
}

export interface RevisionListResponse {
  revisions: DriveRevision[];
  nextPageToken?: string;
}

export interface SharedDriveListResponse {
  drives: SharedDrive[];
  nextPageToken?: string;
}
