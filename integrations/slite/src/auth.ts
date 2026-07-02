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
      token: z
        .string()
        .describe('Slite personal API key generated from Settings > API in the Slite app')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let client = createAxios({
        baseURL: 'https://api.slite.com/v1',
        headers: {
          'x-slite-api-key': ctx.output.token,
          Accept: 'application/json'
        }
      });

      let response = await client.get('/me');
      let data = response.data;

      return {
        profile: {
          email: data.email,
          name: data.displayName,
          organizationName: data.organizationName,
          organizationDomain: data.organizationDomain
        }
      };
    }
  });
