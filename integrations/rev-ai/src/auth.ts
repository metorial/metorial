import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().min(1)
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Access Token',
    key: 'access_token',

    inputSchema: z.object({
      token: z
        .string()
        .trim()
        .min(1)
        .describe(
          'Rev AI access token. Generate one from the Rev AI dashboard under Access Token page.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
