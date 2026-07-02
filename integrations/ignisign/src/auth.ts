import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Ignisign API secret key (Bearer token)')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiSecret: z
        .string()
        .describe('Your Ignisign App Secret from the API Keys section of the Ignisign Console')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiSecret
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiSecret: string } }) => {
      let client = createAxios({
        baseURL: 'https://api.ignisign.io',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      try {
        await client.get('/v4/healthcheck');
        return {
          profile: {
            name: 'Ignisign API User'
          }
        };
      } catch {
        return {
          profile: {
            name: 'Ignisign API User'
          }
        };
      }
    }
  });
