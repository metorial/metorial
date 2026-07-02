import { anyOf } from 'slates';

export let googleDocsScopes = {
  documents: 'https://www.googleapis.com/auth/documents',
  documentsReadonly: 'https://www.googleapis.com/auth/documents.readonly',
  driveFile: 'https://www.googleapis.com/auth/drive.file',
  drive: 'https://www.googleapis.com/auth/drive',
  driveReadonly: 'https://www.googleapis.com/auth/drive.readonly',
  userInfoProfile: 'https://www.googleapis.com/auth/userinfo.profile',
  userInfoEmail: 'https://www.googleapis.com/auth/userinfo.email'
} as const;

let docsRead = anyOf(
  googleDocsScopes.documents,
  googleDocsScopes.documentsReadonly,
  googleDocsScopes.drive,
  googleDocsScopes.driveReadonly,
  googleDocsScopes.driveFile
);

let docsWrite = anyOf(
  googleDocsScopes.documents,
  googleDocsScopes.drive,
  googleDocsScopes.driveFile
);

export let googleDocsActionScopes = {
  createDocument: docsWrite,
  getDocument: docsRead,
  editDocument: docsWrite,
  mergeTemplate: docsWrite,
  listDocuments: docsRead,
  manageNamedRanges: docsWrite,
  documentChanged: docsRead,
  inboundWebhook: docsRead
} as const;
