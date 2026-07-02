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
    name: 'Prerender Token',
    key: 'prerender_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your Prerender.io token, found under Security and Access > Prerender Token in your dashboard.'
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
