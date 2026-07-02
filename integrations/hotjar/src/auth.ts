import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      clientId: z.string(),
      clientSecret: z.string(),
      expiresAt: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Credentials',
    key: 'api_credentials',

    inputSchema: z.object({
      clientId: z.string().describe('Client ID from Hotjar API credentials (Settings > API)'),
      clientSecret: z
        .string()
        .describe('Client Secret from Hotjar API credentials (Settings > API)')
    }),

    getOutput: async ctx => {
      let http = createAxios({
        baseURL: 'https://api.hotjar.io'
      });

      let params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', ctx.input.clientId);
      params.append('client_secret', ctx.input.clientSecret);

      let response = await http.post('/v1/oauth/token', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      let expiresAt = new Date(Date.now() + response.data.expires_in * 1000).toISOString();

      return {
        output: {
          token: response.data.access_token,
          clientId: ctx.input.clientId,
          clientSecret: ctx.input.clientSecret,
          expiresAt
        }
      };
    }
  });
