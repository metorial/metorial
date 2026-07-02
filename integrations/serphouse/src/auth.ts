import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let httpClient = createAxios({
  baseURL: 'https://api.serphouse.com'
});

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
        .describe('SERPHouse API key obtained from https://app.serphouse.com/register')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let response = await httpClient.get('/account/info', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let data = response.data;
      let results = data.results;

      return {
        profile: {
          name: results?.name,
          email: results?.email
        }
      };
    }
  });
