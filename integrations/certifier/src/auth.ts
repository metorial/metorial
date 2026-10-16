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
    name: 'Access Token',
    key: 'access_token',

    inputSchema: z.object({
      token: z.string().describe('Certifier access token from your dashboard')
    }),

    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError(
          'Enter a Certifier access token from the Certifier dashboard.'
        );
      }
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
