import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('UniOne API key (user or project level)')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('UniOne API key obtained from account settings or project settings')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let client = new Client({ token: ctx.output.token });
      let data = await client.getSystemInfo();

      return {
        profile: {
          id: String(data.user_id ?? ''),
          email: data.email ?? '',
          name: data.email ?? ''
        }
      };
    }
  });
