import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      domain: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Client Credentials',
    key: 'client_credentials',

    inputSchema: z.object({
      domain: z.string().describe('Your Auth0 tenant domain (e.g., your-tenant.auth0.com)'),
      clientId: z.string().describe('Client ID of the Machine-to-Machine Application'),
      clientSecret: z.string().describe('Client Secret of the Machine-to-Machine Application')
    }),

    getOutput: async ctx => {
      let domain = ctx.input.domain;

      let http = createAxios({
        baseURL: `https://${domain}`
      });

      let response = await http.post('/oauth/token', {
        grant_type: 'client_credentials',
        client_id: ctx.input.clientId,
        client_secret: ctx.input.clientSecret,
        audience: `https://${domain}/api/v2/`
      });

      return {
        output: {
          token: response.data.access_token,
          domain: domain
        }
      };
    }
  });
