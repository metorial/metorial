import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let api = createAxios({
  baseURL: 'https://platform.hootsuite.com'
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
    name: 'OAuth 2.0',
    key: 'oauth2',

    scopes: [
      {
        title: 'Offline Access',
        description: 'Enables refresh tokens for long-lived access',
        scope: 'offline'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        scope: ctx.scopes.join(' '),
        state: ctx.state
      });

      return {
        url: `https://platform.hootsuite.com/oauth2/auth?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response = await api.post(
        '/oauth2/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          scope: ctx.scopes.join(' ')
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let expiresAt = new Date(
        Date.now() + (response.data.expires_in || 3600) * 1000
      ).toISOString();

      return {
        output: {
          token: response.data.access_token,
          refreshToken: response.data.refresh_token,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw new Error('No refresh token available');
      }

      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response = await api.post(
        '/oauth2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          scope: ctx.scopes.join(' ')
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let expiresAt = new Date(
        Date.now() + (response.data.expires_in || 3600) * 1000
      ).toISOString();

      return {
        output: {
          token: response.data.access_token,
          refreshToken: response.data.refresh_token || ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await api.get('/v1/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let me = response.data.data;

      return {
        profile: {
          id: String(me.id),
          name: me.fullName,
          email: me.email
        }
      };
    }
  });
