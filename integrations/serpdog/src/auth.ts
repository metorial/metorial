import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

let accountProfile = z.object({
  email: z.string(),
  user_name: z.string().nullish(),
  name: z.string().nullish(),
  plan: z.string().nullish(),
  plan_name: z.string().nullish()
});

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
      apiKey: z.string().describe('Your Serpdog API key')
    }),

    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError('Enter your Serpdog API key.');
      }
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let client = new Client({ token: ctx.output.token });
      let parsed = accountProfile.safeParse(await client.getAccountInfo());
      if (!parsed.success) {
        throw createApiServiceError(
          'Serpdog returned invalid account information. Reconnect with a valid API key.'
        );
      }
      let data = parsed.data;

      return {
        profile: {
          email: data.email,
          name: data.user_name || data.name || data.email,
          plan: data.plan || data.plan_name || undefined
        }
      };
    }
  });
