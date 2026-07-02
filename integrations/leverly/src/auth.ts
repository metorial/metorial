import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      username: z.string(),
      token: z.string(),
      accountId: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'Username & API Key',
    key: 'username_api_key',

    inputSchema: z.object({
      username: z
        .string()
        .describe(
          'Your Leverly account username (found in your Leverly dashboard under Integrations)'
        ),
      apiKey: z
        .string()
        .describe('Your Leverly API key (found in your Leverly dashboard under Integrations)'),
      accountId: z
        .string()
        .describe('Your Leverly Account ID (used to authenticate lead submissions)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          username: ctx.input.username,
          token: ctx.input.apiKey,
          accountId: ctx.input.accountId
        }
      };
    }
  });
