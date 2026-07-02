import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let launchpadAxios = createAxios({
  baseURL: 'https://launchpad.37signals.com'
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
    name: 'OAuth',
    key: 'oauth',

    scopes: [],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        type: 'web_server',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      return {
        url: `https://launchpad.37signals.com/authorization/new?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await launchpadAxios.post('/authorization/token', {
        type: 'web_server',
        grant_type: 'authorization_code',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri,
        code: ctx.code
      });

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_at
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let response = await launchpadAxios.post('/authorization/token', {
        type: 'refresh',
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      });

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token ?? ctx.output.refreshToken,
          expiresAt: data.expires_at
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await launchpadAxios.get('/authorization.json', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let data = response.data;
      let identity = data.identity;

      return {
        profile: {
          id: String(identity.id),
          email: identity.email_address,
          name: `${identity.first_name} ${identity.last_name}`
        }
      };
    }
  });
