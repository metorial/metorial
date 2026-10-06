import { SlateAuth } from 'slates';
import { z } from 'zod';
import { SerpApiClient } from './lib/client';
import { apiKey } from './lib/contracts';

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
        .describe('Your SerpApi API key, found at https://serpapi.com/manage-api-key')
    }),

    getOutput: async ctx => {
      const token = apiKey(ctx.input.apiKey);
      const account = await new SerpApiClient({ apiKey: token }).getAccount();
      return {
        output: {
          token,
          accountId: account.account_id
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; accountId?: string };
      input: { apiKey: string };
    }) => {
      const account = await new SerpApiClient({
        apiKey: ctx.output.token,
        accountId: ctx.output.accountId
      }).getAccount();

      return {
        profile: {
          id: account.account_id,
          email: account.account_email,
          name: account.account_email,
          plan: account.plan_name
        }
      };
    }
  });
