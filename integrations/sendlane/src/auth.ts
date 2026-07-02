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
          'Sendlane API v2 Bearer token. Found under Account → API in the Sendlane dashboard.'
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
        baseURL: 'https://api.sendlane.com/v2',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      });

      try {
        let response = await axios.get('/senders');
        let data = response.data as {
          data?: Array<{ id: number; name: string; email: string }>;
        };
        let sender = data.data?.[0];
        return {
          profile: {
            name: sender?.name,
            email: sender?.email
          }
        };
      } catch {
        return {
          profile: {}
        };
      }
    }
  });
