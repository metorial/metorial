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
      appId: z
        .string()
        .describe(
          'Your OpenGraph.io App ID (API key). Found in your OpenGraph.io account under API Keys.'
        )
    }),

    getOutput: async ctx => {
      if (!ctx.input.appId.trim()) {
        throw createApiServiceError(
          'Enter your OpenGraph.io App ID from the API keys dashboard.'
        );
      }
      return {
        output: {
          token: ctx.input.appId
        }
      };
    }
  });
