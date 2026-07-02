import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let aircallApi = createAxios({
  baseURL: 'https://api.aircall.io/v1'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      authType: z.enum(['bearer', 'basic'])
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developer.aircall.io/tutorials/how-aircall-oauth-flow-works/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developer.aircall.io/tutorials/how-aircall-oauth-flow-works/'
      }
    ],

    scopes: [
      {
        title: 'Public API',
        description: 'Full access to the Aircall Public API',
        scope: 'public_api'
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
        url: `https://dashboard.aircall.io/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await aircallApi.post('/oauth/token', {
        code: ctx.code,
        redirect_uri: ctx.redirectUri,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        grant_type: 'authorization_code'
      });

      return {
        output: {
          token: response.data.access_token,
          authType: 'bearer' as const
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; authType: 'bearer' | 'basic' };
      input: {};
      scopes: string[];
    }) => {
      let response = await aircallApi.get('/company', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let company = response.data.company;

      return {
        profile: {
          id: String(company.id),
          name: company.name
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Basic Auth (API Key)',
    key: 'basic_auth',

    inputSchema: z.object({
      apiId: z.string().describe('Your Aircall API ID from the Company Settings page'),
      apiToken: z.string().describe('Your Aircall API Token (shown only on creation)')
    }),

    getOutput: async ctx => {
      let encoded = btoa(`${ctx.input.apiId}:${ctx.input.apiToken}`);
      return {
        output: {
          token: encoded,
          authType: 'basic' as const
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; authType: 'bearer' | 'basic' };
      input: { apiId: string; apiToken: string };
    }) => {
      let response = await aircallApi.get('/company', {
        headers: {
          Authorization: `Basic ${ctx.output.token}`
        }
      });

      let company = response.data.company;

      return {
        profile: {
          id: String(company.id),
          name: company.name
        }
      };
    }
  });
