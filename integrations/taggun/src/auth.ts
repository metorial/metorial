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
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Your Taggun API key. Sign up at taggun.io/sign-up, and the key will be sent to your registered email.'
        )
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.apiKey
      }
    })
  });
