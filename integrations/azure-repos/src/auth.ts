import { createMicrosoftGraphOauth, mapAzureDevOpsScopes } from '@slates/oauth-microsoft';
import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { toAzureDevOpsAuthHeader } from './lib/auth';

let scopes = [
  {
    title: 'Code Read',
    description:
      'Read source code, metadata about commits, branches, and other version control artifacts.',
    scope: 'vso.code',
    defaultChecked: false
  },
  {
    title: 'Code Read & Write',
    description: 'Read, update, and delete source code; create and manage pull requests.',
    scope: 'vso.code_write',
    defaultChecked: false
  },
  {
    title: 'Code Manage',
    description: 'Full repository management including creating/deleting repositories.',
    scope: 'vso.code_manage'
  },
  {
    title: 'Code Full',
    description: 'Full access to all source code operations.',
    scope: 'vso.code_full'
  },
  {
    title: 'Code Status',
    description: 'Read and write commit and pull request status.',
    scope: 'vso.code_status',
    defaultChecked: false
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
