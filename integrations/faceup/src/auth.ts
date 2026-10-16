import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      region: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z.string().describe('API key from FaceUp admin: Integrations > API Keys'),
      region: z
        .string()
        .describe(
          'Data hosting region from FaceUp admin: Settings > Organization settings (e.g., "eu-west-1", "us-east-1"). Copy the exact region value.'
        )
    }),

    getOutput: async ctx => {
      if (!ctx.input.token.trim() || !ctx.input.region.trim()) {
        throw createApiServiceError('Enter a FaceUp API key and data hosting region.');
      }
      return {
        output: {
          token: ctx.input.token.trim(),
          region: ctx.input.region.trim()
        }
      };
    }
  });
