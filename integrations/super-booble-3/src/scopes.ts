import type { GoogleOAuthScopeDescriptor } from '@slates/oauth-google';

export let superGoogle3Scopes = {
  cloudPlatform: 'https://www.googleapis.com/auth/cloud-platform',
  firebaseDatabase: 'https://www.googleapis.com/auth/firebase.database',
  userinfoEmail: 'https://www.googleapis.com/auth/userinfo.email',
  userinfoProfile: 'https://www.googleapis.com/auth/userinfo.profile'
} as const;

// The aggregate needs Cloud access and identity. Keep the documented dedicated
// Realtime Database grant until the alternative is verified for user OAuth REST.
// Standalone integrations request their own narrower product permissions.
export let superGoogle3ScopeEnvelope = Object.values(superGoogle3Scopes);

export let superGoogle3OAuthScopes = [
  {
    scope: superGoogle3Scopes.cloudPlatform,
    title: 'Google Cloud Platform',
    description:
      'View and manage the Google Cloud and Firebase resources exposed by this integration.'
  },
  {
    scope: superGoogle3Scopes.firebaseDatabase,
    title: 'Firebase Realtime Database',
    description: 'View and manage Firebase Realtime Database data.'
  },
  {
    scope: superGoogle3Scopes.userinfoEmail,
    title: 'Google Account Email',
    description: 'View the connected Google Account email.'
  },
  {
    scope: superGoogle3Scopes.userinfoProfile,
    title: 'Google Account Profile',
    description: 'View the connected Google Account profile.'
  }
] satisfies GoogleOAuthScopeDescriptor[];

// Google-restricted scopes declared in the P1 project (scopes_projects_google.md §4, plus
// drive.meet.readonly, which Google also classifies as restricted). None may appear in P3.
export let restrictedP1Scopes = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.insert',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/gmail.settings.sharing',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/chat.messages',
  'https://www.googleapis.com/auth/chat.messages.readonly',
  'https://www.googleapis.com/auth/chat.delete',
  'https://www.googleapis.com/auth/drive.meet.readonly'
] as const;
