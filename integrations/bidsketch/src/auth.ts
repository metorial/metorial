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
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe('Bidsketch API token. Found at Account Settings > API & Integration tab.')
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError('A Bidsketch API token is required.', {
          reason: 'missing_api_token'
        });
      }
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
