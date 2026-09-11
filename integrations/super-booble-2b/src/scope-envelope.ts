// P2B (sensitive project, super-booble-2b) Console declaration, mirrored from scopes_projects_google.md §4.
// One Google Cloud project per super app: this list is both the project's declared scope set and
// the exact OAuth consent request (scopes.ts derives the consent list from it). Docs, Sheets, Slides,
// Forms, Calendar, Meet, Contacts, Tasks, and the marketing families live in the separate P2A
// project (super-booble-2a). Google Classroom was removed from this super app on 2026-09-03:
// its consent page hangs for Workspace tenants with Classroom off; use the standalone integration.
// apps.alerts is absent: the Alert Center API is service-account-only and the Console rejects
// the scope as invalid for a user OAuth client.
export let superGoogle2BVerificationScopeList = [
  'https://www.googleapis.com/auth/photoslibrary.appendonly',
  'https://www.googleapis.com/auth/photoslibrary.edit.appcreateddata',
  'https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata',
  'https://www.googleapis.com/auth/photospicker.mediaitems.readonly',
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'https://www.googleapis.com/auth/youtube.channel-memberships.creator',
  'https://www.googleapis.com/auth/youtubepartner',
  'https://www.googleapis.com/auth/youtubepartner-channel-audit',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
  'https://www.googleapis.com/auth/yt-analytics-monetary.readonly',
  'https://www.googleapis.com/auth/admin.directory.user',
  'https://www.googleapis.com/auth/admin.directory.user.readonly',
  'https://www.googleapis.com/auth/admin.directory.user.alias',
  'https://www.googleapis.com/auth/admin.directory.user.alias.readonly',
  'https://www.googleapis.com/auth/admin.directory.group',
  'https://www.googleapis.com/auth/admin.directory.group.readonly',
  'https://www.googleapis.com/auth/admin.directory.group.member',
  'https://www.googleapis.com/auth/admin.directory.group.member.readonly',
  'https://www.googleapis.com/auth/admin.directory.orgunit',
  'https://www.googleapis.com/auth/admin.directory.orgunit.readonly',
  'https://www.googleapis.com/auth/admin.directory.rolemanagement',
  'https://www.googleapis.com/auth/admin.directory.rolemanagement.readonly',
  'https://www.googleapis.com/auth/admin.directory.device.chromeos',
  'https://www.googleapis.com/auth/admin.directory.device.chromeos.readonly',
  'https://www.googleapis.com/auth/admin.directory.device.mobile',
  'https://www.googleapis.com/auth/admin.directory.device.mobile.readonly',
  'https://www.googleapis.com/auth/admin.directory.domain',
  'https://www.googleapis.com/auth/admin.directory.domain.readonly',
  'https://www.googleapis.com/auth/admin.directory.customer',
  'https://www.googleapis.com/auth/admin.directory.customer.readonly',
  'https://www.googleapis.com/auth/admin.directory.resource.calendar',
  'https://www.googleapis.com/auth/admin.directory.resource.calendar.readonly',
  'https://www.googleapis.com/auth/admin.reports.audit.readonly',
  'https://www.googleapis.com/auth/admin.reports.usage.readonly',
  'https://www.googleapis.com/auth/admin.datatransfer',
  'https://www.googleapis.com/auth/apps.groups.settings',
  'https://www.googleapis.com/auth/apps.licensing',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
] as const;

export type SuperGoogle2BVerificationScope =
  (typeof superGoogle2BVerificationScopeList)[number];

export let superGoogle2BVerificationScopeEnvelope = new Set<string>(
  superGoogle2BVerificationScopeList
);

// Google-restricted scopes declared in the P1 project (scopes_projects_google.md §4, plus
// drive.meet.readonly, which Google also classifies as restricted). None may appear in P2B.
export let restrictedP1Scopes = new Set([
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
]);
