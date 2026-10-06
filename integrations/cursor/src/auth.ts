import { SlateAuth } from 'slates';
import { z } from 'zod';
import { CurrentAgentsClient } from './lib/current-client';

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
      token: z
        .string()
        .min(1)
        .describe(
          'Cursor user, service-account, or team Admin API key from Dashboard → API Keys. Admin tools require Enterprise access and admin:* permissions.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let info = await new CurrentAgentsClient(ctx.output).getApiKeyInfo();
      return {
        profile: { email: info.userEmail, name: info.apiKeyName }
      };
    }
  });
