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
      allowTenantInput: true
    })
  )
  .addOauth(
    createMicrosoftGraphOauth({
      name: 'Work Only',
      key: 'oauth_organizations',
      tenant: 'organizations',
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
      allowTenantInput: true
    })
  );
