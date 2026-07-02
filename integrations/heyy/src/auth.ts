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
        .describe('Heyy API key. Found in Heyy Hub under Settings > Developers > API Keys.')
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
        baseURL: 'https://api.hey-y.io/api/v2.0'
      });

      let response = await axios.get('/business', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let business = response.data?.data;

      return {
        profile: {
          id: business?.id,
          name: business?.name,
          email: business?.email
        }
      };
    }
  });
