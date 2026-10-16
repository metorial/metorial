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
      token: z.string().describe('InfluxDB Cloud API token')
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim() || /[\r\n]/.test(ctx.input.token)) {
        throw createApiServiceError('Provide a nonempty InfluxDB API token.', {
          reason: 'invalid_token'
        });
      }
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
