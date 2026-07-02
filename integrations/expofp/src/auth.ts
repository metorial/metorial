import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let http = createAxios({
  baseURL: 'https://app.expofp.com/api/v1'
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
      apiToken: z
        .string()
        .describe('API token from your ExpoFP account (Account → Profile → API Token)')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiToken: string } }) => {
      let events = await http.post('/list-events', {
        token: ctx.output.token
      });
      return {
        profile: {
          name: `ExpoFP Account (${events.data?.length ?? 0} events)`
        }
      };
    }
  });
