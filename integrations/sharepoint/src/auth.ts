import { createMicrosoftGraphOauth } from '@slates/oauth-microsoft';
import { SlateAuth } from 'slates';
import { z } from 'zod';

let scopes = [
  {
    title: 'Sites Read',
    description: 'Read items in all site collections',
    scope: 'Sites.Read.All'
  },
  {
    title: 'Sites Read Write',
    description: 'Read and write items in all site collections',
    scope: 'Sites.ReadWrite.All'
  },
  {
    title: 'Sites Manage',
    description: 'Create, edit, and delete items and lists in all site collections',
    scope: 'Sites.Manage.All'
  },
  {
    title: 'Sites Full Control',
    description: 'Full control of all site collections',
    scope: 'Sites.FullControl.All'
  },
  {
    title: 'Files Read',
    description: 'Read all files that user can access',
    scope: 'Files.Read.All'
  },
  {
    title: 'Files Read Write',
    description: 'Read and write all files that user can access',
    scope: 'Files.ReadWrite.All'
  },
  {
    title: 'User Read',
    description: 'Read user profile',
    scope: 'User.Read'
  },
  {
    title: 'Offline Access',
    description:
      'Maintain access to data you have given it access to (enables refresh tokens)',
    scope: 'offline_access'
  }
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
    normalizeRedirectUri: true,
    missingRefreshTokenMessage:
      'No refresh token available. Ensure "offline_access" scope is included.'
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
