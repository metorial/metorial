import { createMicrosoftGraphOauth } from '@slates/oauth-microsoft';
import { SlateAuth } from 'slates';
import { z } from 'zod';

let scopes = [
  {
    title: 'Read Mail',
    description: 'Read email messages in user mailboxes',
    scope: 'Mail.Read'
  },
  {
    title: 'Read/Write Mail',
    description: 'Read and write email messages in user mailboxes',
    scope: 'Mail.ReadWrite'
  },
  {
    title: 'Send Mail',
    description: 'Send email messages on behalf of the user',
    scope: 'Mail.Send'
  },
  {
    title: 'Read Basic Mail',
    description: 'Read basic email properties (sender, subject, date)',
    scope: 'Mail.ReadBasic'
  },
  {
    title: 'Read Shared Mail',
    description: 'Read email in shared mailboxes',
    scope: 'Mail.Read.Shared'
  },
  {
    title: 'Send Shared Mail',
    description: 'Send email from shared mailboxes',
    scope: 'Mail.Send.Shared'
  },
  { title: 'Read Calendars', description: 'Read calendar events', scope: 'Calendars.Read' },
  {
    title: 'Read/Write Calendars',
    description: 'Read and write calendar events',
    scope: 'Calendars.ReadWrite'
  },
  {
    title: 'Read Shared Calendars',
    description: 'Read shared calendar events',
    scope: 'Calendars.Read.Shared'
  },
  {
    title: 'Read/Write Shared Calendars',
    description: 'Read and write shared calendar events',
    scope: 'Calendars.ReadWrite.Shared'
  },
  { title: 'Read Contacts', description: 'Read user contacts', scope: 'Contacts.Read' },
  {
    title: 'Read/Write Contacts',
    description: 'Read and write user contacts',
    scope: 'Contacts.ReadWrite'
  },
  {
    title: 'Read Tasks',
    description: 'Read user tasks in Microsoft To Do',
    scope: 'Tasks.Read'
  },
  {
    title: 'Read/Write Tasks',
    description: 'Read and write user tasks in Microsoft To Do',
    scope: 'Tasks.ReadWrite'
  },
  {
    title: 'Read User Profile',
    description: 'Read basic user profile information',
    scope: 'User.Read'
  },
  {
    title: 'Offline Access',
    description: 'Maintain access with a refresh token',
    scope: 'offline_access'
  },
  { title: 'OpenID', description: 'Sign in and read user profile', scope: 'openid' },
  { title: 'Profile', description: 'Read user basic profile', scope: 'profile' },
  { title: 'Email', description: 'Read user email address', scope: 'email' }
];

let createMicrosoftOauth = (name: string, key: string, tenant: string) =>
  createMicrosoftGraphOauth({
    name,
    key,
    tenant,
    scopes,
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://learn.microsoft.com/en-us/graph/permissions-reference'
      }
    ],
    normalizeRedirectUri: true
  });

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth(createMicrosoftOauth('Work & Personal', 'oauth_common', 'common'))
  .addOauth(createMicrosoftOauth('Work Only', 'oauth_organizations', 'organizations'));
