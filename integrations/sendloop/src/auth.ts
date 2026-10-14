import { SlateAuth } from 'slates';
import { z } from 'zod';
import { SendloopClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Sendloop API key'),
      subdomain: z.string().optional().describe('Account subdomain resolved from Sendloop')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z.string().describe('Your Sendloop API key from Settings > API Settings')
    }),
    getOutput: async ctx => {
      let result = await new SendloopClient({ token: ctx.input.apiKey }).getAccountInfo();
      return {
        output: {
          token: ctx.input.apiKey,
          subdomain: result.AccountInfo?.Subdomain || undefined
        }
      };
    },
    getProfile: async (ctx: { output: { token: string; subdomain?: string } }) => {
      let result = await new SendloopClient({
        token: ctx.output.token,
        subdomain: ctx.output.subdomain
      }).getAccountInfo();
      let account = result.AccountInfo || result;
      return {
        profile: {
          name:
            account.CompanyName ||
            [account.FirstName, account.LastName].filter(Boolean).join(' ') ||
            account.Username ||
            undefined,
          email: account.Email || account.EmailAddress || undefined
        }
      };
    }
  });
