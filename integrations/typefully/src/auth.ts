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
      apiKey: z.string().describe('Typefully API key (create one in Settings → API)')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let http = createAxios({
        baseURL: 'https://api.typefully.com/v2',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await http.get('/me');
      let user = response.data;

      return {
        profile: {
          id: user.id,
          name: user.name || user.username,
          email: user.email,
          imageUrl: user.profile_image_url
        }
      };
    }
  });
