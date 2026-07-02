import { createMicrosoftGraphOauth, mapAzureDevOpsScopes } from '@slates/oauth-microsoft';
import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let scopes = [
  { title: 'Profile', description: 'Read user profile', scope: 'vso.profile' },
  {
    title: 'Identity',
    description: 'Read identities and groups',
    scope: 'vso.identity',
    defaultChecked: false
  },
  { title: 'Project Read', description: 'Read projects and teams', scope: 'vso.project' },
  {
    title: 'Project Manage',
    description: 'Create and manage projects',
    scope: 'vso.project_manage',
    defaultChecked: false
  },
  {
    title: 'Work Items Read',
    description: 'Read work items, boards, and queries',
    scope: 'vso.work',
    defaultChecked: false
  },
  {
    title: 'Work Items Write',
    description: 'Create and update work items',
    scope: 'vso.work_write',
    defaultChecked: false
  },
  {
    title: 'Work Items Full',
    description: 'Full access to work items including delete',
    scope: 'vso.work_full'
  },
  {
    title: 'Code Read',
    description: 'Read repositories and code',
    scope: 'vso.code',
    defaultChecked: false
  },
  {
    title: 'Code Write',
    description: 'Read and write repositories',
    scope: 'vso.code_write',
    defaultChecked: false
  },
  {
    title: 'Code Manage',
    description: 'Full access to code repositories',
    scope: 'vso.code_manage'
  },
  {
    title: 'Build Read',
    description: 'Read build pipelines and results',
    scope: 'vso.build',
    defaultChecked: false
  },
  {
    title: 'Build Execute',
    description: 'Read and execute build pipelines',
    scope: 'vso.build_execute'
  },
  {
    title: 'Wiki Read',
    description: 'Read Azure DevOps wikis and pages',
    scope: 'vso.wiki',
    defaultChecked: false
  },
  {
    title: 'Wiki Write',
    description: 'Create and update Azure DevOps wikis and pages',
    scope: 'vso.wiki_write'
  },
  {
    title: 'Release Manage',
    description: 'Manage release pipelines',
    scope: 'vso.release_manage',
    defaultChecked: false
  },
  {
    title: 'Service Hooks Write',
    description: 'Create and manage service hook subscriptions',
    scope: 'vso.hooks_write',
    defaultChecked: false
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
