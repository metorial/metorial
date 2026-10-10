import { type Author, ChatErrors, type Workspace } from '@slates/adapter-chat';

export interface GoogleChatAppAuth {
  token?: string;
  clientEmail?: string;
  clientId?: string;
  projectId?: string;
  projectNumber?: string;
}

// Chat has no app-readable workspace, so the app is one synthetic workspace keyed by project ID.
export let getGoogleChatAppIdentity = (auth: GoogleChatAppAuth, action?: string) => {
  let projectId =
    auth.projectId?.trim() ||
    /@([a-z0-9-]+)\.iam\.gserviceaccount\.com$/i.exec(auth.clientEmail ?? '')?.[1];
  if (!projectId) {
    throw ChatErrors.authInvalid({
      action,
      message:
        'This connection does not include the Chat app service account identity. Reconnect Google Chat with the Chat app service account key.'
    });
  }

  return {
    projectId,
    projectNumber: auth.projectNumber?.trim() || undefined,
    clientEmail: auth.clientEmail,
    workspaceId: `projects/${projectId}`,
    appName: `Google Chat app (${projectId})`
  };
};

export type GoogleChatAppIdentity = ReturnType<typeof getGoogleChatAppIdentity>;

export let mapGoogleChatWorkspace = (identity: GoogleChatAppIdentity): Workspace => ({
  id: identity.workspaceId,
  name: identity.appName,
  raw: {
    projectId: identity.projectId,
    projectNumber: identity.projectNumber,
    serviceAccount: identity.clientEmail
  }
});

// `users/app` is the API alias for the calling app; its numeric id is not readable.
export let GOOGLE_CHAT_APP_USER_ID = 'users/app';

export let mapGoogleChatAppAuthor = (identity: GoogleChatAppIdentity): Author => ({
  userId: GOOGLE_CHAT_APP_USER_ID,
  userName: identity.projectId,
  fullName: identity.appName,
  type: 'app',
  providerType: 'BOT',
  isMe: true,
  raw: { projectId: identity.projectId, serviceAccount: identity.clientEmail }
});
