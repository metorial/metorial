import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      tokenType: z.enum(['bearer', 'basic'])
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Public',
        description: 'Full access to the Drip API on behalf of the authenticated user.',
        scope: 'public'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(' '));
      }

      return {
        url: `https://www.getdrip.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createAxios({ baseURL: 'https://www.getdrip.com' });

      let response = await axios.post('/oauth/token', null, {
        params: {
          response_type: 'token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          grant_type: 'authorization_code'
        }
      });

      return {
        output: {
          token: response.data.access_token,
          tokenType: 'bearer' as const
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; tokenType: string };
      input: Record<string, never>;
      scopes: string[];
    }) => {
      let axios = createAxios({
        baseURL: 'https://api.getdrip.com',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await axios.get('/v2/user');
      let user = response.data.users?.[0];

      return {
        profile: {
          id: user?.email,
          email: user?.email,
          name: user?.name
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      apiToken: z.string().describe('Your Drip API token. Found in User Settings > API Token.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiToken,
          tokenType: 'basic' as const
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; tokenType: string };
      input: { apiToken: string };
    }) => {
      let encoded = btoa(`${ctx.output.token}:`);
      let axios = createAxios({
        baseURL: 'https://api.getdrip.com',
        headers: {
          Authorization: `Basic ${encoded}`
        }
      });

      let response = await axios.get('/v2/user');
      let user = response.data.users?.[0];

      return {
        profile: {
          id: user?.email,
          email: user?.email,
          name: user?.name
        }
      };
    }
  });
