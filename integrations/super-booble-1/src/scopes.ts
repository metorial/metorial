import type { GoogleOAuthScopeDescriptor } from '@slates/oauth-google';

// P1 restricted-scope declaration (Google Auth Platform > Data Access), mirrored from
// scopes_projects_google.md §4. Google Meet's former drive.readonly / drive.meet.readonly
// grants are intentionally absent: Meet moved to the P2 project on 2026-09-03.
// chat.import is not accepted by the Console as a user OAuth scope (import-mode only) and
// is therefore not declared or requested.
export let superGoogle1RestrictedScopes = [
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
  'https://www.googleapis.com/auth/chat.delete'
] as const;

// P1 sensitive / non-sensitive declaration, mirrored from scopes_projects_google.md §4.
export let superGoogle1SensitiveScopes = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/contacts.other.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.labels',
  'https://www.googleapis.com/auth/drive.labels.readonly',
  'https://www.googleapis.com/auth/chat.messages.create',
  'https://www.googleapis.com/auth/chat.messages.reactions',
  'https://www.googleapis.com/auth/chat.spaces',
  'https://www.googleapis.com/auth/chat.spaces.readonly',
  'https://www.googleapis.com/auth/chat.memberships',
  'https://www.googleapis.com/auth/chat.memberships.readonly',
  'https://www.googleapis.com/auth/chat.memberships.app',
  'https://www.googleapis.com/auth/chat.customemojis',
  'https://www.googleapis.com/auth/chat.customemojis.readonly',
  'https://www.googleapis.com/auth/chat.users.sections',
  'https://www.googleapis.com/auth/chat.users.sections.readonly',
  'https://www.googleapis.com/auth/chat.users.readstate',
  'https://www.googleapis.com/auth/chat.users.readstate.readonly',
  'https://www.googleapis.com/auth/chat.users.spacesettings',
  'https://www.googleapis.com/auth/chat.admin.spaces.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
] as const;

export let superGoogle1ScopeEnvelope = new Set<string>([
  ...superGoogle1RestrictedScopes,
  ...superGoogle1SensitiveScopes
]);

type SuperGoogle1Scope =
  | (typeof superGoogle1RestrictedScopes)[number]
  | (typeof superGoogle1SensitiveScopes)[number];

let describe = (title: string, description: string) => ({ title, description });

let superGoogle1ScopeCopy: Record<SuperGoogle1Scope, { title: string; description: string }> =
  {
    'https://mail.google.com/': describe(
      'Gmail full access',
      'Read, send, organize, and permanently delete Gmail messages, threads, drafts, and labels.'
    ),
    'https://www.googleapis.com/auth/gmail.readonly': describe(
      'Gmail read',
      'Read Gmail messages, threads, labels, and settings.'
    ),
    'https://www.googleapis.com/auth/gmail.compose': describe(
      'Gmail compose',
      'Create, read, update, and delete drafts and send messages.'
    ),
    'https://www.googleapis.com/auth/gmail.insert': describe(
      'Gmail insert',
      'Insert and import messages into the mailbox without sending them.'
    ),
    'https://www.googleapis.com/auth/gmail.modify': describe(
      'Gmail modify',
      'Read, compose, send, and label messages without permanent deletion.'
    ),
    'https://www.googleapis.com/auth/gmail.settings.basic': describe(
      'Gmail basic settings',
      'View and manage basic Gmail settings, filters, and vacation responses.'
    ),
    'https://www.googleapis.com/auth/gmail.settings.sharing': describe(
      'Gmail sharing settings',
      'Manage sensitive Gmail settings such as forwarding addresses, send-as aliases, and delegates.'
    ),
    'https://www.googleapis.com/auth/drive': describe(
      'Google Drive',
      'View and manage files, folders, permissions, comments, and shared drives.'
    ),
    'https://www.googleapis.com/auth/drive.readonly': describe(
      'Google Drive read',
      'View and download all Drive files.'
    ),
    'https://www.googleapis.com/auth/drive.metadata': describe(
      'Google Drive metadata',
      'View and manage metadata of Drive files.'
    ),
    'https://www.googleapis.com/auth/drive.metadata.readonly': describe(
      'Google Drive metadata read',
      'View metadata of Drive files.'
    ),
    'https://www.googleapis.com/auth/chat.messages': describe(
      'Google Chat messages',
      'Read, create, update, and manage Google Chat messages and uploads.'
    ),
    'https://www.googleapis.com/auth/chat.messages.readonly': describe(
      'Google Chat messages read',
      'View Google Chat messages and their attachments and reactions.'
    ),
    'https://www.googleapis.com/auth/chat.delete': describe(
      'Google Chat space deletion',
      'Delete Google Chat spaces when explicitly requested.'
    ),
    'https://www.googleapis.com/auth/gmail.send': describe(
      'Gmail send',
      'Send email on behalf of the connected account.'
    ),
    'https://www.googleapis.com/auth/gmail.labels': describe(
      'Gmail labels',
      'Create, read, update, and delete Gmail labels.'
    ),
    'https://www.googleapis.com/auth/contacts.readonly': describe(
      'Google Contacts',
      'Read Google Contacts for recipient discovery and lookup.'
    ),
    'https://www.googleapis.com/auth/contacts.other.readonly': describe(
      'Other contacts',
      'Read the people the account has interacted with but not saved as contacts.'
    ),
    'https://www.googleapis.com/auth/drive.file': describe(
      'Drive files created or opened with this connection',
      'View and manage Drive files created or opened through this connection.'
    ),
    'https://www.googleapis.com/auth/drive.appdata': describe(
      'Drive application data',
      'View and manage the hidden application data folder in Drive.'
    ),
    'https://www.googleapis.com/auth/drive.photos.readonly': describe(
      'Drive photos read',
      'View the photos, videos, and albums stored in Drive.'
    ),
    'https://www.googleapis.com/auth/drive.apps.readonly': describe(
      'Drive apps read',
      'View the Drive apps installed for the connected account.'
    ),
    'https://www.googleapis.com/auth/drive.labels': describe(
      'Drive labels',
      'View and manage Drive label taxonomies.'
    ),
    'https://www.googleapis.com/auth/drive.labels.readonly': describe(
      'Drive labels read',
      'View Drive label taxonomies.'
    ),
    'https://www.googleapis.com/auth/chat.messages.create': describe(
      'Google Chat message creation',
      'Create messages in Google Chat spaces.'
    ),
    'https://www.googleapis.com/auth/chat.messages.reactions': describe(
      'Google Chat reactions',
      'View, add, and delete reactions on Google Chat messages.'
    ),
    'https://www.googleapis.com/auth/chat.spaces': describe(
      'Google Chat spaces',
      'View and manage Google Chat spaces and direct conversations.'
    ),
    'https://www.googleapis.com/auth/chat.spaces.readonly': describe(
      'Google Chat spaces read',
      'View Google Chat spaces and direct conversations.'
    ),
    'https://www.googleapis.com/auth/chat.memberships': describe(
      'Google Chat memberships',
      'View and manage membership in Google Chat spaces.'
    ),
    'https://www.googleapis.com/auth/chat.memberships.readonly': describe(
      'Google Chat memberships read',
      'View membership in Google Chat spaces.'
    ),
    'https://www.googleapis.com/auth/chat.memberships.app': describe(
      'Google Chat app membership',
      'Add and remove this connection as a member of Google Chat spaces.'
    ),
    'https://www.googleapis.com/auth/chat.customemojis': describe(
      'Google Chat custom emoji',
      'View, create, and delete custom emoji in Google Chat.'
    ),
    'https://www.googleapis.com/auth/chat.customemojis.readonly': describe(
      'Google Chat custom emoji read',
      'View custom emoji in Google Chat.'
    ),
    'https://www.googleapis.com/auth/chat.users.sections': describe(
      'Google Chat sidebar sections',
      'View and manage the custom sections in the Google Chat sidebar.'
    ),
    'https://www.googleapis.com/auth/chat.users.sections.readonly': describe(
      'Google Chat sidebar sections read',
      'View the custom sections in the Google Chat sidebar.'
    ),
    'https://www.googleapis.com/auth/chat.users.readstate': describe(
      'Google Chat read state',
      'View and update the last read time of Google Chat conversations.'
    ),
    'https://www.googleapis.com/auth/chat.users.readstate.readonly': describe(
      'Google Chat read state read',
      'View the last read time of Google Chat conversations.'
    ),
    'https://www.googleapis.com/auth/chat.users.spacesettings': describe(
      'Google Chat notification settings',
      'View and update notification settings for Google Chat spaces.'
    ),
    'https://www.googleapis.com/auth/chat.admin.spaces.readonly': describe(
      'Google Chat admin space search',
      'Search and view Google Chat spaces across the organization as an administrator.'
    ),
    'https://www.googleapis.com/auth/userinfo.email': describe(
      'Google profile email',
      'Read the connected Google account email address.'
    ),
    'https://www.googleapis.com/auth/userinfo.profile': describe(
      'Google profile',
      'Read the connected Google account name and profile image.'
    )
  };

// The consent screen requests the complete P1 project declaration, including scopes that
// back planned tools, so the verified consent matches the Console declaration exactly.
export let superGoogle1OAuthScopes = [
  ...superGoogle1RestrictedScopes,
  ...superGoogle1SensitiveScopes
].map(scope => ({
  ...superGoogle1ScopeCopy[scope],
  scope
})) satisfies GoogleOAuthScopeDescriptor[];

export let superGoogle1ProfileScopes = new Set([
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
]);

export let superGoogle1SupplementalToolScopes = new Map([
  ['manage_space', 'https://www.googleapis.com/auth/chat.delete']
]);

// Requested and declared for planned tools; referenced by no retained tool clause today.
export let superGoogle1FutureToolScopes = [
  'https://www.googleapis.com/auth/gmail.insert',
  'https://www.googleapis.com/auth/gmail.settings.sharing',
  'https://www.googleapis.com/auth/contacts.other.readonly',
  'https://www.googleapis.com/auth/chat.admin.spaces.readonly',
  'https://www.googleapis.com/auth/chat.customemojis',
  'https://www.googleapis.com/auth/chat.customemojis.readonly',
  'https://www.googleapis.com/auth/chat.users.sections',
  'https://www.googleapis.com/auth/chat.users.sections.readonly',
  'https://www.googleapis.com/auth/chat.users.readstate',
  'https://www.googleapis.com/auth/chat.users.readstate.readonly',
  'https://www.googleapis.com/auth/chat.users.spacesettings',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.labels',
  'https://www.googleapis.com/auth/drive.labels.readonly'
] as const;
