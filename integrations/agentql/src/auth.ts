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
        .describe('Your AgentQL API key from the Dev Portal (https://dev.agentql.com)')
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError(
          'Provide a non-empty AgentQL API key from the Dev Portal.'
        );
      }
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
