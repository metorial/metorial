import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string(), accountEmail: z.string().optional() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Pingdom API token generated in My Pingdom → Integrations → The Pingdom API. Read/Write access is required for mutations.'
        ),
      accountEmail: z
        .string()
        .optional()
        .describe('Optional account owner email for legacy delegated enterprise accounts.')
    }),
    getOutput: async ctx => {
      new Client(ctx.input);
      return { output: { token: ctx.input.token, accountEmail: ctx.input.accountEmail } };
    },
    getProfile: async (ctx: {
      output: { token: string; accountEmail?: string };
      input: { token: string; accountEmail?: string };
    }) => {
      const result = await new Client(ctx.output).getCredits();
      return {
        profile: {
          name: ctx.output.accountEmail ?? 'Pingdom Account',
          availableChecks: result.credits.availablechecks
        }
      };
    }
  });
