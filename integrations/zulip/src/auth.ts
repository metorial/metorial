import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client, normalizeServerUrl } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      serverUrl: z.string(),
      email: z.string(),
      token: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      serverUrl: z
        .string()
        .describe(
          'The base URL of your Zulip server (e.g., https://your-org.zulipchat.com for Zulip Cloud, or your self-hosted domain)'
        ),
      email: z.string().describe('Your Zulip email address'),
      apiKey: z
        .string()
        .describe(
          'Your Zulip API key (found in Personal settings > Account & privacy > API Key)'
        )
    }),

    getOutput: async ctx => {
      let serverUrl = normalizeServerUrl(ctx.input.serverUrl);
      return {
        output: {
          serverUrl,
          email: ctx.input.email,
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: {
      output: { serverUrl: string; email: string; token: string };
      input: { serverUrl: string; email: string; apiKey: string };
    }) => {
      let client = new Client(ctx.output);
      let user = await client.getOwnUser();
      return {
        profile: {
          id: String(user.user_id),
          email: user.email,
          name: user.full_name,
          imageUrl: user.avatar_url
        }
      };
    }
  });
