import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      accountName: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      accountName: z.string().describe('Your SuperSaaS account name (not your email address)'),
      apiKey: z
        .string()
        .describe('API key generated from the Account Info page in your SuperSaaS dashboard')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          accountName: ctx.input.accountName
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; accountName: string };
      input: { accountName: string; apiKey: string };
    }) => {
      await new Client(ctx.output).listSchedules();

      return {
        profile: {
          name: ctx.output.accountName
        }
      };
    }
  });
