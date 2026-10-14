import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      projectId: z.string(),
      region: z.enum(['eu', 'us']).optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe('API key from Gleap dashboard (Project > Settings > Security)'),
      projectId: z
        .string()
        .describe('Project ID from Gleap dashboard (Project > Settings > Security)'),
      region: z.enum(['eu', 'us']).optional().describe('Project data region; defaults to eu')
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim() || !ctx.input.projectId.trim()) {
        throw createApiServiceError('Provide a non-empty Gleap API key and project ID.');
      }
      return {
        output: {
          token: ctx.input.token,
          projectId: ctx.input.projectId,
          region: ctx.input.region ?? 'eu'
        }
      };
    }
  });
