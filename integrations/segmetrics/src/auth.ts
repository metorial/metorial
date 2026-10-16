import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      accountId: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .trim()
        .min(1)
        .describe('Your SegMetrics API key. Open the gear menu, then Account Settings.'),
      accountId: z
        .string()
        .trim()
        .min(1)
        .describe(
          'Account ID paired with this API key. Open the gear menu, then Account Settings.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          accountId: ctx.input.accountId
        }
      };
    }
  });
