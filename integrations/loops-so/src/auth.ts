import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

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
          'Your Loops API key. Generate one from Settings → API in your Loops dashboard.'
        )
    }),

    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim() || /[\r\n]/.test(ctx.input.apiKey)) {
        throw createApiServiceError('Provide a nonblank Loops API key without line breaks.');
      }
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let result = await new Client(ctx.output).verifyApiKey();

      return {
        profile: {
          name: result.teamName
        }
      };
    }
  });
