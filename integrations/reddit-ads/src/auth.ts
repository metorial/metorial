import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      pixelId: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth',

    scopes: [
      {
        title: 'Ads Read',
        description: 'Read access to ad accounts, campaigns, ad groups, ads, and reporting',
        scope: 'adsread'
      },
      {
        title: 'Ads Edit',
        description:
          'Write access to create and manage campaigns, ad groups, ads, and audiences',
        scope: 'adsedit'
      },
      {
        title: 'History',
        description: 'Access to account history',
        scope: 'history'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let scopeString = ctx.scopes.join(',');
      let url = `https://www.reddit.com/api/v1/authorize?client_id=${encodeURIComponent(ctx.clientId)}&response_type=code&state=${encodeURIComponent(ctx.state)}&redirect_uri=${encodeURIComponent(ctx.redirectUri)}&duration=permanent&scope=${encodeURIComponent(scopeString)}`;
      return { url };
    },

    handleCallback: async ctx => {
      let ax = createAxios();

      let credentials = Buffer.from(`${ctx.clientId}:${ctx.clientSecret}`).toString('base64');

      let response = await ax.post(
        'https://www.reddit.com/api/v1/access_token',
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
        throw new Error('No refresh token available');
      }

      let ax = createAxios();

      let credentials = Buffer.from(`${ctx.clientId}:${ctx.clientSecret}`).toString('base64');

      let response = await ax.post(
        'https://www.reddit.com/api/v1/access_token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

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

    getProfile: async (ctx: any) => {
      let ax = createAxios({
        baseURL: 'https://ads-api.reddit.com/api/v3',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await ax.get('/me');
      let user = response.data;

      return {
        profile: {
          id: user.id,
          name: user.name
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Conversion Access Token',
    key: 'conversion_token',

    inputSchema: z.object({
      conversionToken: z
        .string()
        .describe('Conversion access token generated from Reddit Ads Events Manager'),
      pixelId: z.string().describe('Reddit Pixel ID associated with your account')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.conversionToken,
          pixelId: ctx.input.pixelId
        }
      };
    }
  });
