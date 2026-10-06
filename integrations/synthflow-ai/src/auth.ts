import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      baseUrl: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .min(1)
        .describe(
          'Your Synthflow API key. Found under Admin → Workspace Settings → API Keys.'
        ),
      region: z
        .enum(['global', 'us', 'eu'])
        .optional()
        .describe('API region for your workspace. Defaults to global.')
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim())
        throw createApiServiceError('Enter a non-empty Synthflow API key.');
      return {
        output: {
          token: ctx.input.apiKey.trim(),
          baseUrl:
            ctx.input.region === 'us'
              ? 'https://api.us.synthflow.ai/v2'
              : ctx.input.region === 'eu'
                ? 'https://api.eu.synthflow.ai/v2'
                : 'https://api.synthflow.ai/v2'
        }
      };
    }
  });
