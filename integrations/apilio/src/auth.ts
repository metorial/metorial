import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Authentication Key',
    key: 'api_token',
    inputSchema: z.object({
      apiToken: z
        .string()
        .describe(
          'Your preformatted Basic authentication key from your Apilio profile at https://apilio.herokuapp.com/user. Paste the encoded key with or without the Basic prefix; do not use your web login password.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    }
  });
