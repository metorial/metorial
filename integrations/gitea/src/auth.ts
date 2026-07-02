import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      baseUrl: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth2',
    key: 'oauth2',

    scopes: [
      {
        title: 'Read Repository',
        description: 'Read repository data including files, branches, tags, and commits',
        scope: 'read:repository'
      },
      {
        title: 'Write Repository',
        description: 'Create, update, and delete repositories and their contents',
        scope: 'write:repository'
      },
      {
        title: 'Read Issue',
        description: 'Read issues, labels, and milestones',
        scope: 'read:issue'
      },
      {
        title: 'Write Issue',
        description: 'Create and manage issues, labels, and milestones',
        scope: 'write:issue'
      },
      {
        title: 'Read Organization',
        description: 'Read organization and team information',
        scope: 'read:organization'
      },
      {
        title: 'Write Organization',
        description: 'Manage organizations and teams',
        scope: 'write:organization'
      },
      { title: 'Read User', description: 'Read user profile information', scope: 'read:user' },
      {
        title: 'Write User',
        description: 'Manage user settings and keys',
        scope: 'write:user'
      },
      {
        title: 'Read Notification',
        description: 'Read user notifications',
        scope: 'read:notification'
      },
      {
        title: 'Write Notification',
        description: 'Manage user notifications',
        scope: 'write:notification'
      },
      {
        title: 'Read Package',
        description: 'Read package information',
        scope: 'read:package'
      },
      {
        title: 'Write Package',
        description: 'Publish and manage packages',
        scope: 'write:package'
      },
      {
        title: 'Read Admin',
        description: 'Read site-wide admin information',
        scope: 'read:admin'
      },
      {
        title: 'Write Admin',
        description: 'Perform site-wide admin operations',
        scope: 'write:admin'
      },
      {
        title: 'Read ActivityPub',
        description: 'Read ActivityPub data',
        scope: 'read:activitypub'
      },
      {
        title: 'Write ActivityPub',
        description: 'Manage ActivityPub operations',
        scope: 'write:activitypub'
      },
      { title: 'Read Misc', description: 'Read miscellaneous data', scope: 'read:misc' },
      {
        title: 'Write Misc',
        description: 'Manage miscellaneous operations',
        scope: 'write:misc'
      }
    ],

    inputSchema: z.object({
      baseUrl: z
        .string()
        .describe('Base URL of the Gitea instance, e.g. https://gitea.example.com')
    }),

    getAuthorizationUrl: async ctx => {
      let baseUrl = ctx.input.baseUrl.replace(/\/+$/, '');
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state
      });

      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(' '));
      }

      return {
        url: `${baseUrl}/login/oauth/authorize?${params.toString()}`,
        input: { baseUrl }
      };
    },

    handleCallback: async ctx => {
      let baseUrl = ctx.input.baseUrl.replace(/\/+$/, '');
      let axios = createAxios({ baseURL: baseUrl });

      let response = await axios.post('/login/oauth/access_token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        grant_type: 'authorization_code',
        redirect_uri: ctx.redirectUri
      });

      let data = response.data as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type: string;
      };

      let expiresAt: string | undefined;
      if (data.expires_in) {
        expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      }

      return {
        output: {
          token: data.access_token,
          baseUrl,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw new Error('No refresh token available');
      }

      let baseUrl = ctx.output.baseUrl.replace(/\/+$/, '');
      let axios = createAxios({ baseURL: baseUrl });

      let response = await axios.post('/login/oauth/access_token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken
      });

      let data = response.data as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type: string;
      };

      let expiresAt: string | undefined;
      if (data.expires_in) {
        expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      }

      return {
        output: {
          token: data.access_token,
          baseUrl,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: any) => {
      let baseUrl = (ctx.output.baseUrl as string).replace(/\/+$/, '');
      let axios = createAxios({
        baseURL: `${baseUrl}/api/v1`,
        headers: { Authorization: `token ${ctx.output.token}` }
      });

      let response = await axios.get('/user');
      let user = response.data as {
        id: number;
        login: string;
        full_name?: string;
        email?: string;
        avatar_url?: string;
      };

      return {
        profile: {
          id: String(user.id),
          name: user.full_name || user.login,
          email: user.email,
          imageUrl: user.avatar_url
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'pat',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Gitea personal access token (generated from Settings → Applications)'),
      baseUrl: z
        .string()
        .describe('Base URL of the Gitea instance, e.g. https://gitea.example.com')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          baseUrl: ctx.input.baseUrl.replace(/\/+$/, '')
        }
      };
    },

    getProfile: async (ctx: any) => {
      let baseUrl = (ctx.output.baseUrl as string).replace(/\/+$/, '');
      let axios = createAxios({
        baseURL: `${baseUrl}/api/v1`,
        headers: { Authorization: `token ${ctx.output.token}` }
      });

      let response = await axios.get('/user');
      let user = response.data as {
        id: number;
        login: string;
        full_name?: string;
        email?: string;
        avatar_url?: string;
      };

      return {
        profile: {
          id: String(user.id),
          name: user.full_name || user.login,
          email: user.email,
          imageUrl: user.avatar_url
        }
      };
    }
  });
