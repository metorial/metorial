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
        .describe(
          'BigMailer API key from the API key management page in the BigMailer console'
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
      let http = createAxios({ baseURL: 'https://api.bigmailer.io/v1' });
      let response = await http.get('/me', {
        headers: { 'X-API-Key': ctx.output.token }
      });
      return {
        profile: response.data
      };
    }
  });
