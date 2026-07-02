import { createMicrosoftGraphOauth } from '@slates/oauth-microsoft';
import { SlateAuth } from 'slates';
import { z } from 'zod';

let scopes = [
  {
    title: 'Read Notes',
    description: 'Read-only access to all OneNote notebooks owned by or shared with you.',
    scope: 'Notes.Read'
  },
  {
    title: 'Read & Write Notes',
    description: 'Read and modify OneNote content.',
    scope: 'Notes.ReadWrite'
  },
  {
    title: 'Create Notes',
    description: 'Create new OneNote notebooks, sections, and pages.',
    scope: 'Notes.Create'
  },
  {
    title: 'Read All Notes',
    description: 'Read all OneNote notebooks you have access to in the organization.',
    scope: 'Notes.Read.All'
  },
  {
    title: 'Read & Write All Notes',
    description:
      'Read, share, and modify all OneNote notebooks you have access to in the organization.',
    scope: 'Notes.ReadWrite.All'
  },
  {
    title: 'Offline Access',
    description: 'Obtain a refresh token for persistent access.',
    scope: 'offline_access'
  },
  {
    title: 'User Profile',
    description: 'Read your basic profile information.',
    scope: 'User.Read'
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
    missingRefreshTokenMessage:
      'No refresh token available. Re-authenticate with the offline_access scope.'
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
