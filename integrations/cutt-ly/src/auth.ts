import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Cutt.ly API key')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your Cutt.ly API key. Use an Edit Account key for the Regular API, or a Team edit page key for the Team API. Match the connection API type to the key.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError('Enter a Cutt.ly API key.');
      }
      return {
        output: {
          token: ctx.input.token.trim()
        }
      };
    }
  });
