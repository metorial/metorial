import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Full Access',
        description: 'Full access to the ToneDen API for the authorized artist profile',
        scope: 'full'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      return {
        url: `https://www.toneden.io/auth/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createAxios();

      let response = await axios.post('https://www.toneden.io/auth/oauth2/token', {
        grant_type: 'authorization_code',
        code: ctx.code,
        redirect_uri: ctx.redirectUri,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      });

      return {
        output: {
          token: response.data.access_token
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string };
      input: Record<string, never>;
      scopes: string[];
    }) => {
      let axios = createAxios({
        baseURL: 'https://www.toneden.io/api/v1',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await axios.get('/users/me');
      let user = response.data.user;

      return {
        profile: {
          id: String(user.id),
          name: user.display_name || user.username,
          email: user.email,
          imageUrl: user.avatar_url
        }
      };
    }
  });
