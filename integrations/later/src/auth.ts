import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let http = createAxios({
  baseURL: 'https://api.mavrck.co'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Client Credentials',
    key: 'client_credentials',

    inputSchema: z.object({
      clientId: z.string().describe('Client ID provided by your Later Account Manager'),
      clientSecret: z.string().describe('Client Secret provided by your Later Account Manager')
    }),

    getOutput: async ctx => {
      let response = await http.post('/oauth/token', {
        clientId: ctx.input.clientId,
        clientSecret: ctx.input.clientSecret
      });

      let token = response.data.token || response.data.access_token || response.data.jwt;

      return {
        output: {
          token
        }
      };
    }
  });
