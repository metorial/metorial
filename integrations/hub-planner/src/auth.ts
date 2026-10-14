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
      apiKey: z
        .string()
        .describe(
          'Hub Planner API key generated from Settings > API. Use a read/write key for mutations.'
        )
    }),
    getOutput: async ctx => {
      let token = ctx.input.apiKey.trim();
      if (!token || /[\r\n]/.test(token)) {
        throw createApiServiceError(
          'Enter a valid Hub Planner API key generated in Settings > API.'
        );
      }
      return {
        output: {
          token
        }
      };
    }
  });
