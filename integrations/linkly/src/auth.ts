import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      workspaceId: z.number()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('API key from Linkly Settings → API Keys'),
      workspaceId: z
        .number()
        .describe('Workspace ID shown alongside the API key in Linkly settings')
    }),

    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError('Enter an API key from Linkly Settings → API Keys.');
      }
      if (!Number.isSafeInteger(ctx.input.workspaceId) || ctx.input.workspaceId <= 0) {
        throw createApiServiceError(
          'workspaceId must be a positive integer from Linkly settings.'
        );
      }
      return {
        output: {
          token: ctx.input.apiKey,
          workspaceId: ctx.input.workspaceId
        }
      };
    }
  });
