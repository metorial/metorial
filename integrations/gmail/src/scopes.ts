import { anyOf } from 'slates';

export let gmailScopes = {
  gmailReadonly: 'https://www.googleapis.com/auth/gmail.readonly',
  gmailSend: 'https://www.googleapis.com/auth/gmail.send',
  gmailCompose: 'https://www.googleapis.com/auth/gmail.compose',
  gmailModify: 'https://www.googleapis.com/auth/gmail.modify',
  gmailLabels: 'https://www.googleapis.com/auth/gmail.labels',
  gmailInsert: 'https://www.googleapis.com/auth/gmail.insert',
  gmailMetadata: 'https://www.googleapis.com/auth/gmail.metadata',
  gmailSettingsBasic: 'https://www.googleapis.com/auth/gmail.settings.basic',
  gmailSettingsSharing: 'https://www.googleapis.com/auth/gmail.settings.sharing',
  contactsReadonly: 'https://www.googleapis.com/auth/contacts.readonly',
  contactsOtherReadonly: 'https://www.googleapis.com/auth/contacts.other.readonly',
  fullMail: 'https://mail.google.com/',
  userInfoEmail: 'https://www.googleapis.com/auth/userinfo.email',
  userInfoProfile: 'https://www.googleapis.com/auth/userinfo.profile'
} as const;

let gmailReadBody = anyOf(
  gmailScopes.gmailReadonly,
  gmailScopes.gmailModify,
  gmailScopes.gmailCompose,
  gmailScopes.gmailInsert,
  gmailScopes.fullMail
);

let gmailHistoryOrWebhook = anyOf(
  gmailScopes.gmailReadonly,
  gmailScopes.gmailMetadata,
  gmailScopes.gmailModify,
  gmailScopes.fullMail
);

export let gmailActionScopes = {
  sendEmail: anyOf(
    gmailScopes.gmailSend,
    gmailScopes.gmailCompose,
    gmailScopes.gmailModify,
    gmailScopes.fullMail
  ),
  searchMessages: gmailReadBody,
  getMessage: gmailReadBody,
  getAttachment: gmailReadBody,
  modifyMessage: anyOf(gmailScopes.gmailModify, gmailScopes.fullMail),
  manageDraft: anyOf(
    gmailScopes.gmailCompose,
    gmailScopes.gmailModify,
    gmailScopes.gmailInsert,
    gmailScopes.fullMail
  ),
  manageLabels: anyOf(gmailScopes.gmailLabels, gmailScopes.gmailModify, gmailScopes.fullMail),
  manageThread: anyOf(gmailScopes.gmailModify, gmailScopes.fullMail),
  manageSettings: anyOf(
    gmailScopes.gmailSettingsBasic,
    gmailScopes.gmailSettingsSharing,
    gmailScopes.fullMail
  ),
  listGoogleContacts: anyOf(gmailScopes.contactsReadonly),
  searchGoogleContacts: anyOf(gmailScopes.contactsReadonly),
  getGoogleContact: anyOf(gmailScopes.contactsReadonly),
  mailboxChanges: gmailHistoryOrWebhook,
  inboundWebhook: gmailHistoryOrWebhook
} as const;
