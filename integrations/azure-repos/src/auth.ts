import { createMicrosoftGraphOauth, mapAzureDevOpsScopes } from '@slates/oauth-microsoft';
import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { toAzureDevOpsAuthHeader } from './lib/auth';

let scopes = [
  {
    title: 'Code Manage',
    description:
      'Read and write source code, manage pull requests, and create or delete repositories.',
    scope: 'vso.code_manage'
  },
  {
    title: 'Profile',
    description: 'Read user profile information.',
    scope: 'vso.profile'
  }
];

let reposProfile = {
  baseURL: 'https://app.vssps.visualstudio.com/_apis',
  path: '/profile/profiles/me?api-version=7.1',
  mapProfile: (data: unknown) => {
    let profile = (data ?? {}) as {
      id?: string;
      displayName?: string;
      emailAddress?: string;
    };

    return {
      id: profile.id,
      name: profile.displayName,
      email: profile.emailAddress
    };
  }
};

let createReposOauth = (name: string, key: string, tenant: string) =>
  createMicrosoftGraphOauth({
    name,
    key,
    tenant,
    scopes,
    scopeMapper: mapAzureDevOpsScopes,
    extraScopes: ['offline_access'],
    onMissingRefreshToken: 'preserve',
    profile: reposProfile
  });

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth(createReposOauth('Work & Personal', 'oauth_common', 'common'))
  .addOauth(createReposOauth('Work Only', 'oauth_organizations', 'organizations'))
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'pat',

    inputSchema: z.object({
      token: z.string().describe('Azure DevOps Personal Access Token (PAT)')
    }),

    getOutput: async ctx => {
      let token = ctx.input.token.trim();
      return {
        output: {
          token: `Basic ${btoa(`:${token}`)}`
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let http = createAxios({
        baseURL: 'https://app.vssps.visualstudio.com/_apis',
        headers: {
          Authorization: toAzureDevOpsAuthHeader(ctx.output.token)
        }
      });

      let response = await http.get('/profile/profiles/me?api-version=7.1');
      let profile = response.data as {
        id?: string;
        displayName?: string;
        emailAddress?: string;
      };

      return {
        profile: {
          id: profile.id,
          name: profile.displayName,
          email: profile.emailAddress
        }
      };
    }
  });
