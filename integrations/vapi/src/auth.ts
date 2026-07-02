import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let httpClient = createAxios({
  baseURL: 'https://api.vapi.ai'
});

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
      token: z.string().describe('Your Vapi API key from the dashboard')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let _response = await httpClient.get('/call', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        },
        params: {
          limit: 1
        }
      });

      return {
        profile: {
          name: 'Vapi Account'
        }
      };
    }
  });
