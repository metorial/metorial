import { SlateAuth } from 'slates';
import { z } from 'zod';
import { MailsoftlyClient } from './lib/client';

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
        .describe('Your Mailsoftly API key. Found in your Mailsoftly account settings.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let client = new MailsoftlyClient({ token: ctx.output.token });
      let account = await client.authenticate();

      return {
        profile: {
          id: String(account.firmId),
          name: account.firmName ?? '',
          adminName: account.adminName ?? ''
        }
      };
    }
  });
