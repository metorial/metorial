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
    name: 'Aha! OAuth',
    key: 'oauth',

    scopes: [],

    inputSchema: z.object({
      subdomain: z
        .string()
        .optional()
        .describe(
          'Your Aha! account subdomain (e.g. "company" for company.aha.io). If not known, leave blank to use secure.aha.io.'
        )
    }),

    getAuthorizationUrl: async ctx => {
      let host = ctx.input.subdomain ? `${ctx.input.subdomain}.aha.io` : 'secure.aha.io';

      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state
      });

      return {
        url: `https://${host}/oauth/authorize?${params.toString()}`,
        input: ctx.input
      };
    },

    handleCallback: async ctx => {
      let host = ctx.input.subdomain ? `${ctx.input.subdomain}.aha.io` : 'secure.aha.io';

      let client = createAxios({
        baseURL: `https://${host}`
      });

      let response = await client.post('/oauth/token', {
        code: ctx.code,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: ctx.redirectUri
      });

      let data = response.data as {
        access_token?: string;
        token_type?: string;
        error?: string;
      };

      if (!data.access_token) {
        throw new Error(`Aha! OAuth error: ${data.error || 'No access token received'}`);
      }

      return {
        output: {
          token: data.access_token
        },
        input: ctx.input
      };
    },

    getProfile: async (ctx: {
      output: { token: string };
      input: { subdomain?: string };
      scopes: string[];
    }) => {
      let subdomain = ctx.input.subdomain;
      if (!subdomain) {
        return { profile: {} };
      }

      let client = createAxios({
        baseURL: `https://${subdomain}.aha.io/api/v1`,
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      });

      try {
        let response = await client.get('/me');
        let data = response.data as {
          user?: {
            id?: string;
            email?: string;
            name?: string;
            avatar_url?: string;
          };
        };

        return {
          profile: {
            id: data.user?.id,
            email: data.user?.email,
            name: data.user?.name,
            imageUrl: data.user?.avatar_url
          }
        };
      } catch {
        return { profile: {} };
      }
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Aha! API key (Settings → Personal → Developer → Generate API key)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (_ctx: { output: { token: string }; input: { token: string } }) => {
      return { profile: {} };
    }
  });
