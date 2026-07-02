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
        .describe('Apify API token from the Integrations page in the Apify Console')
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
        baseURL: 'https://api.apify.com/v2',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await axios.get('/users/me');
      let user = response.data?.data;

      return {
        profile: {
          id: user?.id,
          email: user?.email,
          name: user?.username,
          imageUrl: user?.profile?.pictureUrl
        }
      };
    }
  });
