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
          'Your TextIt API token. Found at the top right of the API documentation page (https://textit.com/api/v2/).'
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
        baseURL: 'https://textit.com/api/v2',
        headers: {
          Authorization: `Token ${ctx.output.token}`
        }
      });

      let response = await client.get('/workspace.json');
      let workspace = response.data;

      return {
        profile: {
          id: workspace.uuid,
          name: workspace.name
        }
      };
    }
  });
