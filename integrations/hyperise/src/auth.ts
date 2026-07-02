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
      apiToken: z
        .string()
        .describe('Your Hyperise API token. Generate it from your Hyperise account Settings.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiToken: string } }) => {
      let axios = createAxios({
        baseURL: 'https://app.hyperise.io/api/v1/regular'
      });

      let response = await axios.get('/users/current', {
        params: {
          api_token: ctx.output.token
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.id?.toString(),
          email: user.email,
          name:
            user.name || user.first_name
              ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
              : undefined
        }
      };
    }
  });
