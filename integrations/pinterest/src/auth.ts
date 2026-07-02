import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { pinterestApiError, pinterestServiceError } from './lib/errors';

let httpClient = createAxios({
  baseURL: 'https://api.pinterest.com/v5'
});

httpClient.interceptors.response.use(
  response => response,
  error => Promise.reject(pinterestApiError(error, 'OAuth request'))
);

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
        title: 'Read Ads',
        description: 'Read access to advertising data',
        scope: 'ads:read'
      },
      {
        title: 'Write Ads',
        description: 'Write access to advertising data',
        scope: 'ads:write'
      },
      {
        title: 'Read Boards',
        description: 'Read access to boards',
        scope: 'boards:read'
      },
      {
        title: 'Read Secret Boards',
        description: 'Read access to secret boards',
        scope: 'boards:read_secret'
      },
      {
        title: 'Write Boards',
        description: 'Write access to create, update, or delete boards',
        scope: 'boards:write'
      },
      {
        title: 'Write Secret Boards',
        description: 'Write access to create, update, or delete secret boards',
        scope: 'boards:write_secret'
      },
      {
        title: 'Read Catalogs',
        description: 'Read access to catalog information',
        scope: 'catalogs:read'
      },
      {
        title: 'Write Catalogs',
        description: 'Create or update catalog contents',
        scope: 'catalogs:write'
      },
      {
        title: 'Read Pins',
        description: 'Read access to Pins',
        scope: 'pins:read'
      },
      {
        title: 'Read Secret Pins',
        description: 'Read access to secret Pins',
        scope: 'pins:read_secret'
      },
      {
        title: 'Write Pins',
        description: 'Write access to create, update, or delete Pins',
        scope: 'pins:write'
      },
      {
        title: 'Write Secret Pins',
        description: 'Write access to create, update, or delete secret Pins',
        scope: 'pins:write_secret'
      },
      {
        title: 'Read User Accounts',
        description: 'Read access to user accounts',
        scope: 'user_accounts:read'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(','),
        state: ctx.state
      });

      return {
        url: `https://www.pinterest.com/oauth/?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response = await httpClient.post(
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
      if (!data.access_token) {
        throw pinterestServiceError(
          'Pinterest OAuth response did not include an access token.'
        );
      }

      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

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

      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response = await httpClient.post(
        '/oauth/token',
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
      if (!data.access_token) {
        throw pinterestServiceError(
          'Pinterest OAuth refresh response did not include an access token.'
        );
      }

      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token ?? ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await httpClient.get('/user_account', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data;
      if (!user.username) {
        throw pinterestServiceError('Pinterest profile response did not include a username.');
      }

      return {
        profile: {
          id: user.username,
          name: user.username,
          imageUrl: user.profile_image
        }
      };
    }
  });
