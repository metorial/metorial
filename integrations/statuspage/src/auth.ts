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
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your Statuspage API key. Found under Avatar → API info in the Statuspage management interface.'
        )
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
        baseURL: 'https://api.statuspage.io/v1',
        headers: {
          Authorization: `OAuth ${ctx.output.token}`
        }
      });

      let response = await client.get('/pages');
      let pages = response.data as Array<{ id: string; name: string }>;
      let firstPage = pages[0];

      return {
        profile: {
          id: firstPage?.id,
          name: firstPage?.name
        }
      };
    }
  });
