import type { GoogleOAuthScopeDescriptor } from '@slates/oauth-google';
import {
  type SuperGoogle2BVerificationScope,
  superGoogle2BVerificationScopeList
} from './scope-envelope';

// Identity scopes used by the connection profile lookup (Google userinfo endpoint).
export let superGoogle2BProfileScopes = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
] as const;

export let superGoogle2BActionSpecificToolScopes = [
  {
    toolKey: 'query_analytics',
    operation: 'monetary metrics',
    scope: 'https://www.googleapis.com/auth/yt-analytics-monetary.readonly'
  }
] as const;

// Declared and requested for planned tools or as narrower alternatives; referenced by no
// retained tool clause today. Kept explicit so the contract test can account for every
// requested scope.
export let superGoogle2BFutureToolScopes = [
  'https://www.googleapis.com/auth/youtube.channel-memberships.creator',
  'https://www.googleapis.com/auth/apps.groups.settings'
] as const;

let describe = (title: string, description: string) => ({ title, description });

// Typed against the envelope so a missing or extra entry fails compilation.
let superGoogle2BScopeCopy: Record<
  SuperGoogle2BVerificationScope,
  { title: string; description: string }
> = {
  'https://www.googleapis.com/auth/photoslibrary.appendonly': describe(
    'Google Photos append',
    'Create albums and upload media to Google Photos.'
  ),
  'https://www.googleapis.com/auth/photoslibrary.edit.appcreateddata': describe(
    'Google Photos app data',
    'Edit albums and media created by this application.'
  ),
  'https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata': describe(
    'Google Photos app data read',
    'Read albums and media created by this application.'
  ),
  'https://www.googleapis.com/auth/photospicker.mediaitems.readonly': describe(
    'Google Photos picker',
    'Use picker sessions to read user-selected media.'
  ),
  'https://www.googleapis.com/auth/youtube': describe(
    'YouTube',
    'Read and manage YouTube channels and content.'
  ),
  'https://www.googleapis.com/auth/youtube.readonly': describe(
    'YouTube read',
    'View the YouTube account and its content.'
  ),
  'https://www.googleapis.com/auth/youtube.upload': describe(
    'YouTube upload',
    'Upload and manage YouTube videos.'
  ),
  'https://www.googleapis.com/auth/youtube.force-ssl': describe(
    'YouTube force SSL',
    'Manage YouTube data that requires secure authorized access, including comments and captions.'
  ),
  'https://www.googleapis.com/auth/youtube.channel-memberships.creator': describe(
    'YouTube channel memberships',
    'List the members of the connected YouTube channel.'
  ),
  'https://www.googleapis.com/auth/youtubepartner': describe(
    'YouTube partner',
    'View and manage YouTube content and rights-management assets.'
  ),
  'https://www.googleapis.com/auth/youtubepartner-channel-audit': describe(
    'YouTube partner channel audit',
    'View private information of the YouTube channel relevant during a partner audit.'
  ),
  'https://www.googleapis.com/auth/yt-analytics.readonly': describe(
    'YouTube Analytics',
    'Read YouTube Analytics data and reporting resources.'
  ),
  'https://www.googleapis.com/auth/yt-analytics-monetary.readonly': describe(
    'YouTube Analytics monetary data',
    'Read YouTube Analytics monetary metrics when requested by analytics queries.'
  ),
  'https://www.googleapis.com/auth/admin.directory.user': describe(
    'Admin users',
    'Read and manage Workspace users.'
  ),
  'https://www.googleapis.com/auth/admin.directory.user.readonly': describe(
    'Admin users read',
    'View Workspace users.'
  ),
  'https://www.googleapis.com/auth/admin.directory.user.alias': describe(
    'Admin user aliases',
    'Read and manage Workspace user aliases.'
  ),
  'https://www.googleapis.com/auth/admin.directory.user.alias.readonly': describe(
    'Admin user aliases read',
    'View Workspace user aliases.'
  ),
  'https://www.googleapis.com/auth/admin.directory.group': describe(
    'Admin groups',
    'Read and manage Workspace groups.'
  ),
  'https://www.googleapis.com/auth/admin.directory.group.readonly': describe(
    'Admin groups read',
    'View Workspace groups.'
  ),
  'https://www.googleapis.com/auth/admin.directory.group.member': describe(
    'Admin group members',
    'Read and manage Workspace group membership.'
  ),
  'https://www.googleapis.com/auth/admin.directory.group.member.readonly': describe(
    'Admin group members read',
    'View Workspace group membership.'
  ),
  'https://www.googleapis.com/auth/admin.directory.orgunit': describe(
    'Admin organizational units',
    'Read and manage Workspace organizational units.'
  ),
  'https://www.googleapis.com/auth/admin.directory.orgunit.readonly': describe(
    'Admin organizational units read',
    'View Workspace organizational units.'
  ),
  'https://www.googleapis.com/auth/admin.directory.rolemanagement': describe(
    'Admin roles',
    'Read and manage Workspace administrator roles.'
  ),
  'https://www.googleapis.com/auth/admin.directory.rolemanagement.readonly': describe(
    'Admin roles read',
    'View Workspace administrator roles.'
  ),
  'https://www.googleapis.com/auth/admin.directory.device.chromeos': describe(
    'Admin ChromeOS devices',
    'Read and manage ChromeOS devices.'
  ),
  'https://www.googleapis.com/auth/admin.directory.device.chromeos.readonly': describe(
    'Admin ChromeOS devices read',
    'View ChromeOS devices.'
  ),
  'https://www.googleapis.com/auth/admin.directory.device.mobile': describe(
    'Admin mobile devices',
    'Read and manage mobile devices.'
  ),
  'https://www.googleapis.com/auth/admin.directory.device.mobile.readonly': describe(
    'Admin mobile devices read',
    'View mobile devices.'
  ),
  'https://www.googleapis.com/auth/admin.directory.domain': describe(
    'Admin domains',
    'Read and manage Workspace domains.'
  ),
  'https://www.googleapis.com/auth/admin.directory.domain.readonly': describe(
    'Admin domains read',
    'View Workspace domains.'
  ),
  'https://www.googleapis.com/auth/admin.directory.customer': describe(
    'Admin customer',
    'Read and manage Workspace customer information.'
  ),
  'https://www.googleapis.com/auth/admin.directory.customer.readonly': describe(
    'Admin customer read',
    'Read Workspace customer information.'
  ),
  'https://www.googleapis.com/auth/admin.directory.resource.calendar': describe(
    'Admin calendar resources',
    'Read and manage Workspace calendar resources.'
  ),
  'https://www.googleapis.com/auth/admin.directory.resource.calendar.readonly': describe(
    'Admin calendar resources read',
    'View Workspace buildings, rooms, and other calendar resources.'
  ),
  'https://www.googleapis.com/auth/admin.reports.audit.readonly': describe(
    'Admin audit reports',
    'Read Workspace audit reports.'
  ),
  'https://www.googleapis.com/auth/admin.reports.usage.readonly': describe(
    'Admin usage reports',
    'Read Workspace usage reports.'
  ),
  'https://www.googleapis.com/auth/admin.datatransfer': describe(
    'Admin data transfer',
    'Transfer Workspace user data.'
  ),
  'https://www.googleapis.com/auth/apps.groups.settings': describe(
    'Admin group settings',
    'View and manage the settings of Workspace groups.'
  ),
  'https://www.googleapis.com/auth/apps.licensing': describe(
    'Admin licensing',
    'Read and manage Workspace license assignments.'
  ),
  'https://www.googleapis.com/auth/userinfo.email': describe(
    'Google account email',
    'Read the connected Google account email address.'
  ),
  'https://www.googleapis.com/auth/userinfo.profile': describe(
    'Google account profile',
    'Read the connected Google account name and profile image.'
  )
};

// The consent screen requests the complete P2B project declaration in Console order, future-tool
// scopes included, so the consent screen matches the verified declaration exactly.
export let superGoogle2BScopes = superGoogle2BVerificationScopeList.map(scope => ({
  ...superGoogle2BScopeCopy[scope],
  scope
})) satisfies GoogleOAuthScopeDescriptor[];

export let superGoogle2BScopeValues: string[] = superGoogle2BScopes.map(
  descriptor => descriptor.scope
);
