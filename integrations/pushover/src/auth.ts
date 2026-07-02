import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      userKey: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Token & User Key',
    key: 'api_token_user_key',
    inputSchema: z.object({
      appToken: z
        .string()
        .describe(
          'Application API token (30-character alphanumeric string from https://pushover.net/apps/build)'
        ),
      userKey: z
        .string()
        .describe(
          'User key or group key (30-character alphanumeric string from https://pushover.net/dashboard)'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.appToken,
          userKey: ctx.input.userKey
        }
      };
    }
  });
