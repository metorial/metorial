import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your direct API-Sports API key from the dashboard; RapidAPI keys use a different service'
        )
    }),
    getOutput: async ctx => {
      const token = ctx.input.token.trim();
      if (!token) throw createApiServiceError('Enter a non-empty API-Sports API key.');
      return { output: { token } };
    },
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      const data = await new Client({
        token: ctx.output.token,
        sport: 'football'
      }).getStatus();
      const account = data.response?.account;
      const subscription = data.response?.subscription;
      return {
        profile: {
          name:
            [account?.firstname, account?.lastname].filter(Boolean).join(' ') ||
            account?.email,
          email: account?.email,
          plan: subscription?.plan
        }
      };
    }
  });
