import { SlateAuth } from 'slates';
import { z } from 'zod';
import { NutshellClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string(), username: z.string() }))
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      username: z
        .string()
        .describe(
          'Your Nutshell user email address or company domain; user impersonation depends on the API key settings'
        ),
      token: z
        .string()
        .describe(
          'API key from Setup > API Keys. Use a key permitted for API access and the intended user permissions.'
        )
    }),
    getOutput: async ctx => {
      new NutshellClient(ctx.input);
      return { output: { token: ctx.input.token, username: ctx.input.username } };
    },
    getProfile: async (ctx: { output: { username: string; token: string } }) => {
      let client = new NutshellClient(ctx.output);
      let user = await client.getUser();
      let email = user.email?.find(value => typeof value === 'string');
      return {
        profile: {
          id: String(user.id),
          name: user.name,
          email: typeof email === 'string' ? email : undefined
        }
      };
    }
  });
