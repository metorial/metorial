import { SlateAuth } from 'slates';
import { z } from 'zod';
import { TwoChatClient } from './lib/client';

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
        .describe(
          'Your 2Chat API key. Generate one at https://app.2chat.io/developers?tab=api-access'
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
      let data = await new TwoChatClient({ token: ctx.output.token }).getAccountInfo();

      return {
        profile: {
          id:
            data.id !== undefined && data.id !== null
              ? String(data.id)
              : (data.uuid ?? undefined),
          email: data.email ?? undefined,
          name: data.name ?? data.account_name ?? undefined
        }
      };
    }
  });
