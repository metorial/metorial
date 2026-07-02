import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let axios = createAxios({
  baseURL: 'https://api.replicate.com/v1'
});

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
      token: z.string().describe('Replicate API token (starts with r8_)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let response = await axios.get('/account', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      return {
        profile: {
          id: response.data.username,
          name: response.data.name,
          imageUrl: response.data.avatar_url
        }
      };
    }
  });
