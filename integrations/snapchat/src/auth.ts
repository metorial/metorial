import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { snapchatApiError, snapchatServiceError } from './lib/errors';

let authAxios = createAxios({
  baseURL: 'https://accounts.snapchat.com/login/oauth2'
});

let adsAxios = createAxios({
  baseURL: 'https://adsapi.snapchat.com/v1'
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
    name: 'Snapchat OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Marketing API',
        description: 'Access to the Snapchat Ads API for campaign management',
        scope: 'snapchat-marketing-api'
      },
      {
        title: 'Offline Conversions',
        description: 'Send offline conversion events to Snapchat',
        scope: 'snapchat-offline-conversions-api'
      },
      {
        title: 'Profile API',
        description: 'Access to the Snapchat Public Profile API',
        scope: 'snapchat-profile-api'
      },
      {
        title: 'Display Name',
        description: "Access the user's display name",
        scope: 'https://auth.snapchat.com/oauth2/api/user.display_name'
      },
      {
        title: 'Bitmoji Avatar',
        description: "Access the user's Bitmoji avatar",
        scope: 'https://auth.snapchat.com/oauth2/api/user.bitmoji.avatar'
      },
      {
        title: 'External ID',
        description: 'Stable user ID for your app',
        scope: 'https://auth.snapchat.com/oauth2/api/user.external_id'
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
        url: `https://accounts.snapchat.com/login/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      try {
        let response = await authAxios.post(
          '/access_token',
          new URLSearchParams({
            grant_type: 'authorization_code',
            code: ctx.code,
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            redirect_uri: ctx.redirectUri
          }).toString(),
          {
            headers: {
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
      } catch (error) {
        throw snapchatApiError(error, 'OAuth callback');
      }
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw snapchatServiceError(
          'No Snapchat refresh token is available. Reconnect the account.'
        );
      }

      try {
        let response = await authAxios.post(
          '/access_token',
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
        let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

        return {
          output: {
            token: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt
          }
        };
      } catch (error) {
        throw snapchatApiError(error, 'OAuth token refresh');
      }
    },

    getProfile: async (ctx: any) => {
      try {
        let response = await adsAxios.get('/me', {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          }
        });

        let me = response.data.me;

        return {
          profile: {
            id: me.id,
            email: me.email,
            name: me.display_name,
            organizationId: me.organization_id
          }
        };
      } catch (error) {
        throw snapchatApiError(error, 'get profile');
      }
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Conversions API Token',
    key: 'conversions_token',

    inputSchema: z.object({
      token: z.string().describe('Long-lived Conversions API token from Ads Manager')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
