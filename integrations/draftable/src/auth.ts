import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      accountId: z.string(),
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      accountId: z
        .string()
        .describe(
          'Your Draftable Account ID, available at https://api.draftable.com/account/credentials'
        ),
      token: z
        .string()
        .describe(
          'Your Draftable Auth Token, available at https://api.draftable.com/account/credentials'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          accountId: ctx.input.accountId,
          token: ctx.input.token
        }
      };
    }
  });
