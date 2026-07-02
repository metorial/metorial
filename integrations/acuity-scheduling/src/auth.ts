import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      userId: z.string().optional(),
      authMethod: z.enum(['oauth', 'basic'])
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth2',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developers.acuityscheduling.com/docs/oauth2'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.acuityscheduling.com/docs/oauth2'
      }
    ],

    scopes: [
      {
        title: 'API Access',
        description: 'Full access to the Acuity Scheduling API',
        scope: 'api-v1'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      return {
        url: `https://acuityscheduling.com/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createAxios();

      let response = await axios.post('https://acuityscheduling.com/oauth2/token', {
        grant_type: 'authorization_code',
        code: ctx.code,
        redirect_uri: ctx.redirectUri,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      });

      return {
        output: {
          token: response.data.access_token,
          authMethod: 'oauth' as const
        }
      };
    },

    getProfile: async (ctx: any) => {
      let axios = createAxios({
        baseURL: 'https://acuityscheduling.com/api/v1',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await axios.get('/me');

      return {
        profile: {
          id: String(response.data.id),
          name: response.data.name,
          email: response.data.email
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      userId: z.string().describe('Your numeric Acuity User ID'),
      token: z.string().describe('Your Acuity API Key')
    }),

    getOutput: async ctx => {
      let basicToken = btoa(`${ctx.input.userId}:${ctx.input.token}`);

      return {
        output: {
          token: basicToken,
          userId: ctx.input.userId,
          authMethod: 'basic' as const
        }
      };
    },

    getProfile: async (ctx: any) => {
      let axios = createAxios({
        baseURL: 'https://acuityscheduling.com/api/v1',
        headers: {
          Authorization: `Basic ${ctx.output.token}`
        }
      });

      let response = await axios.get('/me');

      return {
        profile: {
          id: String(response.data.id),
          name: response.data.name,
          email: response.data.email
        }
      };
    }
  });
