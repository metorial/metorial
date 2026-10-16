import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { normalizeEndpoint } from './lib/client';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string(), endpointUrl: z.string().optional() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('API key from your DataRobot user menu > API keys and tools.'),
      endpointUrl: z
        .string()
        .optional()
        .describe(
          'HTTPS DataRobot instance URL, such as https://app.datarobot.com. Omit to use the saved instance URL or the US instance.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim())
        throw createApiServiceError('Enter your DataRobot API key.');
      return {
        output: {
          token: ctx.input.apiKey,
          ...(ctx.input.endpointUrl !== undefined
            ? { endpointUrl: normalizeEndpoint(ctx.input.endpointUrl) }
            : {})
        }
      };
    }
  });
