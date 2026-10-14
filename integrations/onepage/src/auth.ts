import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      userId: z.string(),
      token: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      userId: z
        .string()
        .describe(
          'Your OnePageCRM user_id. Found at https://app.onepagecrm.com/app/api under the Configuration tab.'
        ),
      apiKey: z
        .string()
        .describe(
          'Your OnePageCRM api_key. Found at https://app.onepagecrm.com/app/api under the Configuration tab.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          userId: ctx.input.userId,
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: {
      output: { userId: string; token: string };
      input: { userId: string; apiKey: string };
    }) => {
      let user = await new Client(ctx.output).getCurrentUser();

      return {
        profile: {
          id: user.userId,
          email: user.email,
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined
        }
      };
    }
  });
