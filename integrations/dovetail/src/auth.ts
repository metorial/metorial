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
    name: 'Personal API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Dovetail personal API token (starts with "api."). Generate one at Settings → Account → Personal API keys.'
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
      let axios = createAxios({
        baseURL: 'https://dovetail.com/api/v1',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      });

      let response = await axios.get('/token/info');
      let data = response.data?.data;

      return {
        profile: {
          id: data?.id,
          subdomain: data?.subdomain
        }
      };
    }
  });
