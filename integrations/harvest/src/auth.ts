import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let harvestIdApi = createAxios({
  baseURL: 'https://id.getharvest.com/api/v2'
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
    name: 'OAuth2',
    key: 'oauth2',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://help.getharvest.com/api-v2/authentication-api/authentication/authentication/'
      }
    ],

    scopes: [
      {
        title: 'All Harvest Accounts',
        description: 'Access to all Harvest accounts',
        scope: 'harvest:all'
      },
      {
        title: 'All Forecast Accounts',
        description: 'Access to all Forecast accounts',
        scope: 'forecast:all'
      },
      {
        title: 'All Accounts',
        description: 'Access to all Harvest and Forecast accounts',
        scope: 'all'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        state: ctx.state,
        redirect_uri: ctx.redirectUri
      });

      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(' '));
      }

      return {
        url: `https://id.getharvest.com/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await harvestIdApi.post('/oauth2/token', {
        code: ctx.code,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: ctx.redirectUri
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
      let response = await harvestIdApi.post('/oauth2/token', {
        refresh_token: ctx.output.refreshToken,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        grant_type: 'refresh_token'
      });

      let data = response.data;
      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

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
      let response = await harvestIdApi.get('/accounts', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let accounts = response.data;
      let user = accounts.user;

      return {
        profile: {
          id: String(user?.id ?? ''),
          name: `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim(),
          email: user?.email ?? ''
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
        .describe('Personal Access Token from https://id.getharvest.com/developers')
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
      let response = await harvestIdApi.get('/accounts', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let accounts = response.data;
      let user = accounts.user;

      return {
        profile: {
          id: String(user?.id ?? ''),
          name: `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim(),
          email: user?.email ?? ''
        }
      };
    }
  });
