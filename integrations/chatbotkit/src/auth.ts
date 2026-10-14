import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Secret Key',
    key: 'api_secret_key',
    inputSchema: z.object({
      apiSecretKey: z.string().describe('ChatBotKit API secret key')
    }),
    getOutput: async ctx => ({ output: { token: ctx.input.apiSecretKey.trim() } }),
    getProfile: async (ctx: {
      output: { token: string };
      input: { apiSecretKey: string };
    }) => {
      let client = new Client({ token: ctx.output.token });
      await client.listBots({ take: 1 });
      return { profile: { name: 'ChatBotKit Account' } };
    }
  });
