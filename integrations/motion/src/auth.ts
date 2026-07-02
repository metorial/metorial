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
        .describe('Motion API key. Create one in Motion Settings under the API tab.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let axios = createAxios({
        baseURL: 'https://api.usemotion.com/v1'
      });

      let response = await axios.get('/users/me', {
        headers: {
          'X-API-Key': ctx.output.token
        }
      });

      return {
        profile: {
          id: response.data.id,
          email: response.data.email,
          name: response.data.name
        }
      };
    }
  });
