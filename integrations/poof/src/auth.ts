import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      username: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z.string().describe('Poof API key from your developer dashboard'),
      username: z
        .string()
        .optional()
        .describe(
          'Poof username for reference; checkout requests require an explicit username'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError('Provide a Poof API key.');
      }
      return {
        output: {
          token: ctx.input.token,
          username: ctx.input.username
        }
      };
    }
  });
