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
    name: 'Push API Key',
    key: 'push_api_key',
    inputSchema: z.object({
      pushKey: z
        .string()
        .describe(
          'Your Userlist Push API Key. Found in Push API settings in your Userlist account.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.pushKey
        }
      };
    }
  });
