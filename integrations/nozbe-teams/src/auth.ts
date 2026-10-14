import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your Nozbe API token. Generate one at Settings → API tokens. Space tokens access one space; global tokens access all authorized spaces.'
        )
    }),
    getOutput: async ctx => {
      let client = new Client({ token: ctx.input.token });
      await client.listTeams({ limit: 1 });
      return { output: { token: ctx.input.token } };
    }
  });
