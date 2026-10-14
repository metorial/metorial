import { createApiServiceError, SlateAuth } from 'slates';
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
      let token = ctx.input.token.trim();
      if (!token) {
        throw createApiServiceError('Provide a non-empty Prerender token.');
      }
      return {
        output: {
          token
        }
      };
    }
  });
