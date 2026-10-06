import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { invalid, nonempty } from './lib/helpers';

export let auth = SlateAuth.create()
  .output(z.object({ username: z.string(), token: z.string() }))
  .addCustomAuth({
    type: 'auth.custom',
    name: 'DPD API Basic Auth',
    key: 'basic_auth',
    inputSchema: z.object({
      username: z.string().describe('Digital Product Delivery account username.'),
      apiPassword: z
        .string()
        .describe(
          'API password from Profile > DPD API Credentials; not the account sign-in password.'
        )
    }),
    getOutput: async ctx => {
      const username = nonempty(ctx.input.username, 'DPD username');
      if (username.includes(':'))
        throw invalid('DPD Basic Auth usernames cannot contain a colon.');
      return {
        output: { username, token: nonempty(ctx.input.apiPassword, 'DPD API password') }
      };
    },
    getProfile: async (ctx: {
      output: { username: string; token: string };
      input: { username: string; apiPassword: string };
    }) => {
      await new Client(ctx.output).ping();
      return { profile: { name: ctx.output.username } };
    }
  });
