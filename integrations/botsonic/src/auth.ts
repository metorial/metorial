import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('API key or bot API token'),
      credentialType: z.enum(['account', 'bot']).optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Secret Key',
    key: 'api_secret_key',
    inputSchema: z.object({
      token: z
        .string()
        .min(1)
        .describe('Account-level API Secret Key from the API section in account settings')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          credentialType: 'account' as const
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Bot API Token',
    key: 'bot_api_token',
    inputSchema: z.object({
      token: z
        .string()
        .min(1)
        .describe(
          'Bot-specific API token from the bot Integration page > REST API. Supports responses, training data, FAQs, starter questions, and conversations.'
        )
    }),
    getOutput: async ctx => ({
      output: { token: ctx.input.token, credentialType: 'bot' as const }
    })
  });
