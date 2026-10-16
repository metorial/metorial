import { SlateAuth } from 'slates';
import { z } from 'zod';
import { FaradayClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Faraday API key from the Settings page in your Faraday dashboard')
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.apiKey
      }
    }),
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let client = new FaradayClient({ token: ctx.output.token });
      let account = await client.getCurrentAccount();

      return {
        profile: {
          id: account.id,
          name: account.name
        }
      };
    }
  });
