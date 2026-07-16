import { createMicrosoftGraphOauth, mapAzureDevOpsScopes } from '@slates/oauth-microsoft';
import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let scopes = [
  { title: 'Profile', description: 'Read user profile', scope: 'vso.profile' },
  { title: 'Project Read', description: 'Read projects and teams', scope: 'vso.project' },
  {
    title: 'Work Items Write',
    description: 'Read, create, update, and delete work items, boards, and queries',
    scope: 'vso.work_write'
  },
  {
    title: 'Code Manage',
    description:
      'Read repositories and code, manage pull requests, and create repositories',
    scope: 'vso.code_manage'
  },
  {
    title: 'Build Execute',
    description: 'Read and execute build pipelines',
    scope: 'vso.build_execute'
  },
  {
    title: 'Wiki Write',
    description: 'Read, create, and update Azure DevOps wikis and pages',
    scope: 'vso.wiki_write'
  },
  {
    title: 'Service Hooks Write',
    description: 'Create and manage the service hook subscriptions that power triggers',
    scope: 'vso.hooks_write'
  }
];

let devOpsProfile = {
  baseURL: 'https://app.vssps.visualstudio.com',
  path: '/_apis/profile/profiles/me?api-version=7.1',
  mapProfile: (data: unknown) => {
    let profile = (data ?? {}) as {
      id?: string;
      displayName?: string;
      emailAddress?: string;
      coreAttributes?: { Avatar?: { value?: { value?: string } } };
    };

    return {
      id: profile.id,
      name: profile.displayName,
      email: profile.emailAddress,
      imageUrl: profile.coreAttributes?.Avatar?.value?.value
    };
  }
};

let createDevOpsOauth = (name: string, key: string, tenant: string) =>
  createMicrosoftGraphOauth({
    name,
    key,
    tenant,
    scopes,
    scopeMapper: mapAzureDevOpsScopes,
    extraScopes: ['offline_access'],
    onMissingRefreshToken: 'preserve',
    profile: devOpsProfile
  });

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Access token or PAT for Azure DevOps API'),
      refreshToken: z.string().optional().describe('OAuth refresh token'),
      expiresAt: z.string().optional().describe('Token expiration timestamp (ISO 8601)')
    })
  )
  .addOauth(createDevOpsOauth('Work & Personal', 'oauth_common', 'common'))
  .addOauth(createDevOpsOauth('Work Only', 'oauth_organizations', 'organizations'))
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'pat',

    inputSchema: z.object({
      personalAccessToken: z.string().describe('Azure DevOps Personal Access Token (PAT)')
    }),

    getOutput: async ctx => {
      let encoded = btoa(`:${ctx.input.personalAccessToken}`);
      return {
        output: {
          token: `Basic ${encoded}`
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string };
      input: { personalAccessToken: string };
    }) => {
      let axios = createAxios({
        baseURL: 'https://app.vssps.visualstudio.com'
      });

      let authHeader = ctx.output.token.startsWith('Basic ')
        ? ctx.output.token
        : `Bearer ${ctx.output.token}`;

      let response = await axios.get('/_apis/profile/profiles/me?api-version=7.1', {
        headers: { Authorization: authHeader }
      });

      let data = response.data as {
        id?: string;
        displayName?: string;
        emailAddress?: string;
      };

      return {
        profile: {
          id: data.id,
          name: data.displayName,
          email: data.emailAddress
        }
      };
    }
  });
