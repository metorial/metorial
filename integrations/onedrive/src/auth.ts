import { createMicrosoftGraphOauth } from '@slates/oauth-microsoft';
import { SlateAuth } from 'slates';
import { z } from 'zod';

let scopes = [
  {
    title: 'Read Files',
    description: "Read the signed-in user's files",
    scope: 'Files.Read'
  },
  {
    title: 'Read All Files',
    description: 'Read all files the signed-in user can access',
    scope: 'Files.Read.All'
  },
  {
    title: 'Read/Write Files',
    description: "Read, create, update, and delete the signed-in user's files",
    scope: 'Files.ReadWrite'
  },
  {
    title: 'Read/Write All Files',
    description: 'Read, create, update, and delete all files the signed-in user can access',
    scope: 'Files.ReadWrite.All'
  },
  {
    title: 'App Folder',
    description: "Write files into the app's folder in OneDrive (personal accounts only)",
    scope: 'Files.ReadWrite.AppFolder'
  },
  {
    title: 'Read Sites',
    description: 'Read items in all site collections',
    scope: 'Sites.Read.All'
  },
  {
    title: 'Read/Write Sites',
    description: 'Read and write items in all site collections',
    scope: 'Sites.ReadWrite.All'
  },
  {
    title: 'Offline Access',
    description: 'Maintain access to data you have given it access to via a refresh token',
    scope: 'offline_access'
  },
  {
    title: 'User Profile',
    description: 'Sign in and read user profile',
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
      'No refresh token available. Re-authorize with the offline_access scope.'
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
