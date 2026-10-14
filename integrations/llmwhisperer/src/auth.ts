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
          'Your LLMWhisperer API key. Obtain it by signing up at the Unstract platform.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError('Enter a valid LLMWhisperer API key.');
      }
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
