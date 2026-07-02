import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Client Credentials',
    key: 'client_credentials',

    inputSchema: z.object({
      clientId: z.string().describe('OneLogin API Client ID'),
      clientSecret: z.string().describe('OneLogin API Client Secret'),
      subdomain: z.string().describe('Your OneLogin subdomain (e.g., "mycompany")')
    }),

    getOutput: async ctx => {
      let axios = createAxios({
        baseURL: `https://${ctx.input.subdomain}.onelogin.com`
      });

      let response = await axios.post(
        '/auth/oauth2/v2/token',
        {
          grant_type: 'client_credentials'
        },
        {
          headers: {
            Authorization: `client_id:${ctx.input.clientId}, client_secret:${ctx.input.clientSecret}`,
            'Content-Type': 'application/json'
          }
        }
      );

      let data = response.data;
      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    }
  });
