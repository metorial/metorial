import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      authType: z.enum(['basic', 'bearer']),
      tokenId: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Token (Basic Auth)',
    key: 'api_token',

    inputSchema: z.object({
      tokenId: z.string().describe('Token ID from Matterport Developer Tools'),
      tokenSecret: z.string().describe('Token Secret from Matterport Developer Tools')
    }),

    getOutput: async ctx => {
      let basicToken = Buffer.from(`${ctx.input.tokenId}:${ctx.input.tokenSecret}`).toString(
        'base64'
      );
      return {
        output: {
          token: basicToken,
          authType: 'basic' as const,
          tokenId: ctx.input.tokenId
        }
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth',

    scopes: [
      {
        title: 'View Details',
        description: 'Search for models and view public/private details',
        scope: 'ViewDetails'
      },
      {
        title: 'Edit Details',
        description: 'Edit basic details of a model',
        scope: 'EditDetails'
      },
      {
        title: 'Download Assets',
        description: 'Download purchased add-ons and colormap imagery',
        scope: 'DownloadAssets'
      },
      {
        title: 'Purchase Assets',
        description: "Purchase assets for a model on the user's behalf",
        scope: 'PurchaseAssets'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      return {
        url: `https://authn.matterport.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createAxios();

      let response = await axios.post('https://api.matterport.com/api/oauth/token', {
        grant_type: 'authorization_code',
        code: ctx.code,
        scope: ctx.scopes.join(' '),
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri
      });

      let expiresAt = new Date(Date.now() + response.data.expires_in * 1000).toISOString();

      return {
        output: {
          token: response.data.access_token,
          refreshToken: response.data.refresh_token,
          expiresAt,
          authType: 'bearer' as const
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let axios = createAxios();

      let response = await axios.post('https://api.matterport.com/api/oauth/token', {
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        scope: ctx.scopes.join(' ')
      });

      let expiresAt = new Date(Date.now() + response.data.expires_in * 1000).toISOString();

      return {
        output: {
          token: response.data.access_token,
          refreshToken: response.data.refresh_token || ctx.output.refreshToken,
          expiresAt,
          authType: 'bearer' as const
        }
      };
    }
  });
