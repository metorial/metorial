import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let authAxios = createAxios({
  baseURL: 'https://accounts.crowdin.com'
});

let apiAxios = createAxios({
  baseURL: 'https://api.crowdin.com/api/v2'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      { title: 'All Scopes', description: 'Full access to all resources', scope: '*' },
      { title: 'Projects', description: 'Manage accessible projects', scope: 'project' },
      {
        title: 'Project Settings',
        description: 'View and manage project settings',
        scope: 'project.settings'
      },
      {
        title: 'Source Files',
        description: 'Manage source files and strings',
        scope: 'project.source'
      },
      {
        title: 'Translations',
        description: 'Manage translations',
        scope: 'project.translation'
      },
      { title: 'Tasks', description: 'Manage project tasks', scope: 'project.task' },
      {
        title: 'Status',
        description: 'Access translation progress (read-only)',
        scope: 'project.status'
      },
      {
        title: 'Webhooks (Project)',
        description: 'Manage project webhook configurations',
        scope: 'project.webhook'
      },
      {
        title: 'Screenshots',
        description: 'Manage screenshots and tags',
        scope: 'project.screenshot'
      },
      {
        title: 'Reports',
        description: 'Generate and export project reports',
        scope: 'project.report'
      },
      {
        title: 'Members',
        description: 'Manage project members and permissions',
        scope: 'project.member'
      },
      {
        title: 'Translation Memory',
        description: 'Manage Translation Memory files',
        scope: 'tm'
      },
      {
        title: 'Glossary',
        description: 'Manage project terminology files',
        scope: 'glossary'
      },
      {
        title: 'Machine Translation',
        description: 'Manage Machine Translation engines and settings',
        scope: 'mt'
      },
      {
        title: 'AI',
        description: 'Manage AI providers, prompts, and fine-tuning',
        scope: 'ai'
      },
      {
        title: 'Notifications',
        description: 'Manage notifications and channel subscriptions',
        scope: 'notification'
      },
      {
        title: 'Webhooks (Org)',
        description: 'Manage organization webhooks',
        scope: 'webhook'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state
      });

      return {
        url: `https://accounts.crowdin.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await authAxios.post('/oauth/token', {
        grant_type: 'authorization_code',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri,
        code: ctx.code
      });

      let data = response.data;
      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        return { output: ctx.output };
      }

      let response = await authAxios.post('/oauth/token', {
        grant_type: 'refresh_token',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        refresh_token: ctx.output.refreshToken
      });

      let data = response.data;
      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: {};
      scopes: string[];
    }) => {
      let response = await apiAxios.get('/user', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data.data;

      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: user.fullName || user.username,
          imageUrl: user.avatarUrl,
          username: user.username
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_token',

    inputSchema: z.object({
      token: z.string().describe('Crowdin personal access token from Account Settings > API')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: { token: string };
    }) => {
      let response = await apiAxios.get('/user', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data.data;

      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: user.fullName || user.username,
          imageUrl: user.avatarUrl,
          username: user.username
        }
      };
    }
  });
