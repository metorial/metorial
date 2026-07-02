import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let apiAxios = createAxios({
  baseURL: 'https://api.followupboss.com/v1'
});

let oauthAxios = createAxios({
  baseURL: 'https://app.followupboss.com'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      authMethod: z
        .enum(['oauth', 'api_key'])
        .describe('Which authentication method is being used')
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Full Access',
        description: 'Full access to Follow Up Boss on behalf of the user',
        scope: 'full_access'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'auth_code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        prompt: 'login'
      });

      return {
        url: `https://app.followupboss.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let credentials = Buffer.from(`${ctx.clientId}:${ctx.clientSecret}`).toString('base64');

      let response = await oauthAxios.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          authMethod: 'oauth' as const
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let credentials = Buffer.from(`${ctx.clientId}:${ctx.clientSecret}`).toString('base64');

      let response = await oauthAxios.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken || ''
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt,
          authMethod: 'oauth' as const
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await apiAxios.get('/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data;

      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z.string().describe('Your Follow Up Boss API Key (found in Admin -> API)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          authMethod: 'api_key' as const
        }
      };
    },

    getProfile: async (ctx: any) => {
      let basicAuth = Buffer.from(`${ctx.output.token}:`).toString('base64');

      let response = await apiAxios.get('/me', {
        headers: {
          Authorization: `Basic ${basicAuth}`
        }
      });

      let user = response.data;

      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined
        }
      };
    }
  });
