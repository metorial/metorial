import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client, optionalText, text } from './lib/client';

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
        .describe('Your Hunter.io API key. Obtain it from https://hunter.io/api-keys')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: text(ctx.input.apiKey, 'API key')
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      const account = await new Client({ token: ctx.output.token }).getAccountStats();
      const email = text(account.email, 'API-key owner email');

      return {
        profile: {
          id: email,
          email,
          name:
            `${optionalText(account.first_name) ?? ''} ${optionalText(account.last_name) ?? ''}`.trim() ||
            undefined
        }
      };
    }
  });
