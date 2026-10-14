import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      signalToken: z.string().optional()
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
          'Your Autobound Content API key. Generate one at https://app2.autobound.ai/settings/api-keys. Existing Signal API-only connections may continue using their key here.'
        ),
      signalApiKey: z
        .string()
        .optional()
        .describe(
          'Separate Signal API key from https://signalapi.autobound.ai. Provide this when using signal tools alongside content tools.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          signalToken: ctx.input.signalApiKey
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Signal API Key',
    key: 'signal_api_key',
    inputSchema: z.object({
      signalApiKey: z
        .string()
        .describe('Your Signal API key from https://signalapi.autobound.ai')
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.signalApiKey,
        signalToken: ctx.input.signalApiKey
      }
    })
  });
