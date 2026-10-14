import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      appKey: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key & App Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('Your legacy Pipeline CRM API Key from Admin > API Keys.'),
      appKey: z
        .string()
        .describe(
          'Your Pipeline CRM App Key (application-level). Found in Settings > API > API Integrations.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          appKey: ctx.input.appKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string; appKey?: string } }) => {
      let profile = await new Client(ctx.output).getProfile();

      return {
        profile: {
          id: String(profile.id ?? ''),
          email: profile.email ?? '',
          name:
            [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
            profile.email ||
            ''
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'API token created from your Pipeline CRM profile > API tokens. Use a read-write token to create, update, or delete records.'
        )
    }),
    getOutput: async ctx => ({ output: { token: ctx.input.token } }),
    getProfile: async (ctx: { output: { token: string; appKey?: string } }) => {
      let profile = await new Client(ctx.output).getProfile();
      return {
        profile: {
          id: String(profile.id),
          name: [profile.first_name, profile.last_name].filter(Boolean).join(' ')
        }
      };
    }
  });
