import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client, requiredNumber, requiredString } from './lib/client';

export let auth = SlateAuth.create()
  .output(z.object({ webApiKey: z.string(), appKey: z.string() }))
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Keys',
    key: 'api_keys',
    inputSchema: z.object({
      webApiKey: z
        .string()
        .describe('Your FinerWorks web API key from your FinerWorks account API settings'),
      appKey: z
        .string()
        .describe(
          'Your FinerWorks application key. Its test or live mode is controlled in your account settings.'
        )
    }),
    getOutput: async ctx => ({
      output: { webApiKey: ctx.input.webApiKey, appKey: ctx.input.appKey }
    }),
    getProfile: async (ctx: { output: { webApiKey: string; appKey: string } }) => {
      let data = await new Client(ctx.output).testCredentials();
      let account = data.user_account;
      return {
        profile: {
          id: String(requiredNumber(account?.account_id, 'user_account.account_id')),
          email: requiredString(account?.account_email, 'user_account.account_email'),
          name: requiredString(account?.account_username, 'user_account.account_username')
        }
      };
    }
  });
