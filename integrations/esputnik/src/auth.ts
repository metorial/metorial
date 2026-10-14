import { SlateAuth } from 'slates';
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
        .describe('Your eSputnik/Yespo API key. Generate one in your account Settings → API.')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let account = await new Client(ctx.output).getAccountInfo();
      return {
        profile: {
          name: account.organisationName || account.name || account.userEmail,
          id: (account.orgId ?? account.id ?? account.userEmail)?.toString()
        }
      };
    }
  });
