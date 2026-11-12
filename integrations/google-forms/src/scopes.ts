import { allOf, anyOf } from 'slates';

export let googleFormsScopes = {
  formsBody: 'https://www.googleapis.com/auth/forms.body',
  formsBodyReadonly: 'https://www.googleapis.com/auth/forms.body.readonly',
  formsResponsesReadonly: 'https://www.googleapis.com/auth/forms.responses.readonly',
  drive: 'https://www.googleapis.com/auth/drive',
  driveFile: 'https://www.googleapis.com/auth/drive.file',
  driveReadonly: 'https://www.googleapis.com/auth/drive.readonly',
  userInfoProfile: 'https://www.googleapis.com/auth/userinfo.profile',
  userInfoEmail: 'https://www.googleapis.com/auth/userinfo.email'
} as const;

let formStructureRead = anyOf(
  googleFormsScopes.formsBody,
  googleFormsScopes.formsBodyReadonly,
  googleFormsScopes.driveReadonly,
  googleFormsScopes.drive
);

let formStructureWrite = anyOf(
  googleFormsScopes.formsBody,
  googleFormsScopes.drive,
  googleFormsScopes.driveFile
);

let formResponsesRead = anyOf(
  googleFormsScopes.formsResponsesReadonly,
  googleFormsScopes.formsBody,
  googleFormsScopes.driveReadonly,
  googleFormsScopes.drive
);

export let googleFormsActionScopes = {
  getForm: formStructureRead,
  listResponses: formResponsesRead,
  getResponse: formResponsesRead,
  createForm: formStructureWrite,
  updateForm: formStructureWrite,
  setPublishSettings: formStructureWrite,
  manageWatches: formStructureWrite,
  // One clause per call: identity, reading a selected form, reading responses. Every scope in
  // the last two also manages watches.
  newResponse: allOf(
    anyOf(googleFormsScopes.userInfoProfile, googleFormsScopes.userInfoEmail),
    anyOf(
      googleFormsScopes.formsBody,
      googleFormsScopes.formsBodyReadonly,
      googleFormsScopes.driveFile,
      googleFormsScopes.drive,
      googleFormsScopes.driveReadonly
    ),
    anyOf(
      googleFormsScopes.formsResponsesReadonly,
      googleFormsScopes.driveFile,
      googleFormsScopes.drive
    )
  ),
  formUpdated: formStructureRead,
  inboundWebhook: formStructureRead
} as const;
