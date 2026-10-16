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
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z.string().describe('Your IP2Location.io API key')
    }),
    getOutput: async ctx => {
      let token = ctx.input.token.trim();
      if (!token) {
        throw createApiServiceError('Enter a nonempty IP2Location.io API key.', {
          reason: 'invalid_api_key'
        });
      }
      return {
        output: {
          token
        }
      };
    }
  })
  .addNone();
