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
      apiKey: z
        .string()
        .describe('Your ShortPixel API Key (20 characters, letters and numbers)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let axios = createAxios({
        baseURL: 'https://api.shortpixel.com'
      });

      let response = await axios.get('/v2/api-status.php', {
        params: {
          key: ctx.output.token
        }
      });

      let data = response.data;

      return {
        profile: {
          id: ctx.output.token,
          name: `ShortPixel (${data.APICallsMade ?? 0} calls made)`
        }
      };
    }
  });
