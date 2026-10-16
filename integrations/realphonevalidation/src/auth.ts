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
      token: z.string().describe('RealPhoneValidation API token (UUID format)')
    }),

    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError('Enter your RealPhoneValidation API token.', {
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
