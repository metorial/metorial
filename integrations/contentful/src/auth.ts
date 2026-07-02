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
    name: 'OAuth 2.0',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://www.contentful.com/developers/docs/extensibility/oauth/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://www.contentful.com/developers/docs/extensibility/oauth/'
      }
    ],

    scopes: [
      {
        title: 'Content Management (Read)',
        description: 'Read-only access to content management',
        scope: 'content_management_read'
      },
      {
        title: 'Content Management (Manage)',
        description: 'Full read and write access to content management',
        scope: 'content_management_manage'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `https://be.contentful.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let http = createAxios();

      let response = await http.post('https://be.contentful.com/oauth/token', {
        grant_type: 'authorization_code',
        code: ctx.code,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri
      });

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : undefined
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        return { output: ctx.output };
      }

      let http = createAxios();

      let response = await http.post('https://be.contentful.com/oauth/token', {
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      });

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : undefined
        }
      };
    },

    getProfile: async (ctx: any) => {
      let http = createAxios({
        baseURL: 'https://api.contentful.com',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await http.get('/users/me');
      let user = response.data;

      return {
        profile: {
          id: user.sys?.id,
          name: [user.firstName, user.lastName].filter(Boolean).join(' '),
          email: user.email,
          imageUrl: user.avatarUrl
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'A Content Management API Personal Access Token (PAT). Create one in Contentful under Settings > CMA tokens.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let http = createAxios({
        baseURL: 'https://api.contentful.com',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await http.get('/users/me');
      let user = response.data;

      return {
        profile: {
          id: user.sys?.id,
          name: [user.firstName, user.lastName].filter(Boolean).join(' '),
          email: user.email,
          imageUrl: user.avatarUrl
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Content Delivery API Key',
    key: 'delivery_api_key',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'A Content Delivery API access token. Create one in Contentful under Settings > API keys.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
