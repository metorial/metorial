import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z.string().describe('Connecteam API key. Found in Settings > API Keys.')
    }),
    getOutput: async (ctx: { input: { apiKey: string } }) => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let http = createAxios({
        baseURL: 'https://api.connecteam.com',
        headers: {
          'X-API-KEY': ctx.output.token
        }
      });
      let response = await http.get('/me');
      let data = response.data?.data;
      return {
        profile: {
          id: data?.companyId,
          name: data?.companyName
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'OAuth 2.0 Client Credentials',
    key: 'oauth_client_credentials',
    inputSchema: z.object({
      clientId: z.string().describe('OAuth 2.0 Client ID'),
      clientSecret: z.string().describe('OAuth 2.0 Client Secret'),
      scopes: z
        .string()
        .optional()
        .describe(
          'Space-separated list of scopes (e.g. "users.read users.write time_clock.read")'
        )
    }),
    getOutput: async (ctx: {
      input: { clientId: string; clientSecret: string; scopes?: string };
    }) => {
      let http = createAxios({
        baseURL: 'https://api.connecteam.com'
      });
      let credentials = Buffer.from(
        `${ctx.input.clientId}:${ctx.input.clientSecret}`
      ).toString('base64');
      let response = await http.post('/oauth/v1/token', 'grant_type=client_credentials', {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      return {
        output: {
          token: response.data.access_token as string
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string };
      input: { clientId: string; clientSecret: string; scopes?: string };
    }) => {
      let http = createAxios({
        baseURL: 'https://api.connecteam.com',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });
      let response = await http.get('/me');
      let data = response.data?.data;
      return {
        profile: {
          id: data?.companyId,
          name: data?.companyName
        }
      };
    }
  });
