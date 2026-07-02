import { anyOf } from 'slates';

export let googleSlidesScopes = {
  presentations: 'https://www.googleapis.com/auth/presentations',
  presentationsReadonly: 'https://www.googleapis.com/auth/presentations.readonly',
  driveFile: 'https://www.googleapis.com/auth/drive.file',
  drive: 'https://www.googleapis.com/auth/drive',
  driveReadonly: 'https://www.googleapis.com/auth/drive.readonly',
  spreadsheets: 'https://www.googleapis.com/auth/spreadsheets',
  spreadsheetsReadonly: 'https://www.googleapis.com/auth/spreadsheets.readonly',
  userInfoProfile: 'https://www.googleapis.com/auth/userinfo.profile',
  userInfoEmail: 'https://www.googleapis.com/auth/userinfo.email'
} as const;

let slidesRead = anyOf(
  googleSlidesScopes.presentations,
  googleSlidesScopes.presentationsReadonly,
  googleSlidesScopes.drive,
  googleSlidesScopes.driveReadonly,
  googleSlidesScopes.driveFile
);

let slidesWrite = anyOf(
  googleSlidesScopes.presentations,
  googleSlidesScopes.drive,
  googleSlidesScopes.driveFile
);

export let googleSlidesActionScopes = {
  createPresentation: slidesWrite,
  getPresentation: slidesRead,
  batchUpdate: slidesWrite,
  addImage: slidesWrite,
  addShape: slidesWrite,
  deleteElement: slidesWrite,
  editText: slidesWrite,
  embedSheetsChart: anyOf(
    googleSlidesScopes.presentations,
    googleSlidesScopes.drive,
    googleSlidesScopes.driveFile,
    googleSlidesScopes.spreadsheets,
    googleSlidesScopes.spreadsheetsReadonly,
    googleSlidesScopes.driveReadonly
  ),
  manageSlides: slidesWrite,
  manageSpeakerNotes: slidesWrite,
  replaceText: slidesWrite,
  presentationChanged: slidesRead,
  inboundWebhook: slidesRead
} as const;
