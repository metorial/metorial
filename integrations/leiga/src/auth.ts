import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let api = createAxios({
  baseURL: 'https://app.leiga.com/openapi/api'
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
      clientId: z.string().describe('Client ID from Leiga API settings'),
      secretKey: z.string().describe('Secret Key from Leiga API settings')
    }),

    getOutput: async ctx => {
      let response = await api.post('/authorize/access-permanent-token', {
        clientId: ctx.input.clientId,
        secretKey: ctx.input.secretKey
      });

      let data = response.data;

      if (data.code !== '0' || !data.data?.accessToken) {
        throw new Error(data.msg || 'Failed to obtain access token');
      }

      return {
        output: {
          token: data.data.accessToken
        }
      };
    }
  });
