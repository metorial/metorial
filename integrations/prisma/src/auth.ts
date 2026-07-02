import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

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
      {
        title: 'Workspace Admin',
        description: 'Full access to manage workspaces, projects, and databases',
        scope: 'workspace:admin'
      },
      {
        title: 'Offline Access',
        description: 'Enables refresh tokens for long-lived sessions',
        scope: 'offline_access'
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
        url: `https://auth.prisma.io/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let http = createAxios();

      let response = await http.post(
        'https://auth.prisma.io/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;

      let expiresAt: string | undefined;
      if (data.expires_in) {
        expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      }

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

      let http = createAxios();

      let response = await http.post(
        'https://auth.prisma.io/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;

      let expiresAt: string | undefined;
      if (data.expires_in) {
        expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token ?? ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: {};
      scopes: string[];
    }) => {
      let http = createAxios({
        baseURL: 'https://api.prisma.io/v1',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await http.get('/workspaces');
      let workspaces = response.data ?? [];
      let firstWorkspace = workspaces[0];

      return {
        profile: {
          id: firstWorkspace?.id,
          name: firstWorkspace?.displayName ?? firstWorkspace?.name ?? 'Prisma User'
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Service Token',
    key: 'service_token',

    inputSchema: z.object({
      serviceToken: z
        .string()
        .describe('Prisma service token created in the Prisma Console under Integrations')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.serviceToken
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: { serviceToken: string };
    }) => {
      let http = createAxios({
        baseURL: 'https://api.prisma.io/v1',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await http.get('/workspaces');
      let workspaces = response.data ?? [];
      let firstWorkspace = workspaces[0];

      return {
        profile: {
          id: firstWorkspace?.id,
          name: firstWorkspace?.displayName ?? firstWorkspace?.name ?? 'Prisma Workspace'
        }
      };
    }
  });
