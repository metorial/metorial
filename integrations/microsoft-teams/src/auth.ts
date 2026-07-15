import { createMicrosoftGraphOauth } from '@slates/oauth-microsoft';
import { SlateAuth } from 'slates';
import { z } from 'zod';
import { microsoftTeamsScopes } from './scopes';

// Every scope declared on an auth method is requested in production, so
// scope tiers are separate auth methods:
// the standard methods request only scopes Microsoft lets regular users
// consent to, while "Work Only (Full Access)" adds the admin-consent-gated
// scopes and therefore shows "Need admin approval" until a Microsoft Entra
// admin grants tenant-wide consent.
let baseScopes = [
  {
    title: 'User Profile',
    description: 'Read signed-in user profile',
    scope: microsoftTeamsScopes.userRead
  },
  {
    title: 'Offline Access',
    description: 'Obtain refresh tokens for long-lived access',
    scope: microsoftTeamsScopes.offlineAccess
  },
  {
    title: 'Read Teams',
    description: 'Read basic team properties',
    scope: microsoftTeamsScopes.teamReadBasicAll
  },
  {
    title: 'Create Teams',
    description: 'Create new teams',
    scope: microsoftTeamsScopes.teamCreate
  },
  {
    title: 'Read Channels',
    description: 'Read basic channel properties',
    scope: microsoftTeamsScopes.channelReadBasicAll
  },
  {
    title: 'Read/Write Chats',
    description: 'Read, create, and send user chat messages',
    scope: microsoftTeamsScopes.chatReadWrite
  },
  {
    title: 'Send Channel Messages',
    description: 'Send messages in channels',
    scope: microsoftTeamsScopes.channelMessageSend
  },
  {
    title: 'Read/Write Online Meetings',
    description: 'Create and manage online meetings',
    scope: microsoftTeamsScopes.onlineMeetingsReadWrite
  },
  {
    title: 'Read Presence',
    description: 'Read user presence information',
    scope: microsoftTeamsScopes.presenceReadAll
  }
];

let adminConsentScopes = [
  {
    title: 'Read/Write Team Settings',
    description: 'Update, archive, and unarchive teams (requires Entra admin consent)',
    scope: microsoftTeamsScopes.teamSettingsReadWriteAll
  },
  {
    title: 'Create Channels',
    description: 'Create channels in teams (requires Entra admin consent)',
    scope: microsoftTeamsScopes.channelCreate
  },
  {
    title: 'Update Channels',
    description:
      'Update channel names, descriptions, and settings (requires Entra admin consent)',
    scope: microsoftTeamsScopes.channelSettingsReadWriteAll
  },
  {
    title: 'Delete Channels',
    description: 'Delete channels in teams (requires Entra admin consent)',
    scope: microsoftTeamsScopes.channelDeleteAll
  },
  {
    title: 'Read Channel Messages',
    description: 'Read messages in channels (requires Entra admin consent)',
    scope: microsoftTeamsScopes.channelMessageReadAll
  },
  {
    title: 'Read/Write Team Members',
    description: 'Read and manage team members (requires Entra admin consent)',
    scope: microsoftTeamsScopes.teamMemberReadWriteAll
  },
  {
    title: 'Read/Write Channel Members',
    description:
      'Read and manage members of private and shared channels (requires Entra admin consent)',
    scope: microsoftTeamsScopes.channelMemberReadWriteAll
  },
  {
    title: 'Read/Write Team Tags',
    description:
      'Create and manage team tags and tag membership (requires Entra admin consent)',
    scope: microsoftTeamsScopes.teamworkTagReadWrite
  },
  {
    title: 'Read/Write Groups',
    description:
      'Rename or delete the Microsoft 365 groups that back teams (requires Entra admin consent)',
    scope: microsoftTeamsScopes.groupReadWriteAll
  },
  {
    title: 'Read/Write Shifts',
    description: 'Read and write shift schedules (requires Entra admin consent)',
    scope: microsoftTeamsScopes.scheduleReadWriteAll
  }
];

let docs = [
  {
    type: 'docs.auth.oauth' as const,
    name: 'OAuth documentation',
    url: 'https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow'
  },
  {
    type: 'docs.auth.oauth_scopes' as const,
    name: 'OAuth scopes',
    url: 'https://learn.microsoft.com/en-us/graph/permissions-reference'
  }
];

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth(
    createMicrosoftGraphOauth({
      name: 'Work & Personal',
      key: 'oauth_common',
      tenant: 'common',
      scopes: baseScopes,
      docs,
      missingRefreshTokenMessage: 'No refresh token available'
    })
  )
  .addOauth(
    createMicrosoftGraphOauth({
      name: 'Work Only',
      key: 'oauth_organizations',
      tenant: 'organizations',
      scopes: baseScopes,
      docs,
      missingRefreshTokenMessage: 'No refresh token available'
    })
  )
  .addOauth(
    createMicrosoftGraphOauth({
      name: 'Work Only (Full Access)',
      key: 'oauth_organizations_full',
      tenant: 'organizations',
      scopes: [...baseScopes, ...adminConsentScopes],
      docs,
      missingRefreshTokenMessage: 'No refresh token available'
    })
  );
