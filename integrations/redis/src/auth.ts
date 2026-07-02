import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      accountKey: z.string(),
      userKey: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'API Keys',
    key: 'api_keys',

    inputSchema: z.object({
      accountKey: z
        .string()
        .describe('Account API key (x-api-key). Identifies your Redis Cloud account.'),
      userKey: z
        .string()
        .describe(
          'User API key (x-api-secret-key). Personal key for a user with Owner, Viewer, or Logs viewer role.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          accountKey: ctx.input.accountKey,
          userKey: ctx.input.userKey
        }
      };
    }
  });
