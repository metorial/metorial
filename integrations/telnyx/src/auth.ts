import { SlateAuth } from 'slates';
import { z } from 'zod';
import { TelnyxClient } from './lib/client';
import { required } from './lib/native';

export const auth = SlateAuth.create()
  .output(z.object({ token: z.string().min(1) }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .min(1)
        .describe(
          'Telnyx v2 API key from Mission Control Portal, Account Settings > API Keys. v1 API tokens are incompatible.'
        )
    }),
    getOutput: async ctx => ({ output: { token: required(ctx.input.token, 'API key') } }),
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      const balance = await new TelnyxClient(ctx.output).getBalance();
      return {
        profile: {
          name: 'Telnyx API key',
          balance: balance.balance,
          currency: balance.currency
        }
      };
    }
  });
